const fs = require("fs");
const path = require("path");
const sequelize = require("../config/database");
const {
  PortalCuenta,
  PortalFileService,
  PortalCreditoMovimiento,
} = require("../models");
const { registrarEventoPortal } = require("./portalAuthController");
const { crearNotificacionesInternas } = require("./notificacionController");
const { notificarN8nPortal } = require("../services/portalNotificacionService");

const ESTADOS_DESCARGABLES = ["MOD_LISTO", "CORREGIDO", "ENTREGADO"];
const ROLES_NOTIFICACION_PORTAL = ["OWNER", "ADMIN", "OPERADOR_ECU", "TUNER"];
const PORTAL_UPLOADS_DIR = path.resolve(__dirname, "..", "portal_uploads");
const FRONTEND_URL = String(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
let columnasNuevaLecturaPreparadas = false;

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const normalizarMonto = (valor, defecto = 0) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return defecto;
  return Math.max(0, Number(numero.toFixed(2)));
};

const crearError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const mensajeErrorServidor = (error, fallback = "Error interno del servidor") =>
  process.env.NODE_ENV === "production"
    ? fallback
    : error.message || fallback;

const responderError = (res, error, fallback) => {
  const status = error.status || error.statusCode || 500;
  return res.status(status).json({
    error: status >= 500 ? mensajeErrorServidor(error, fallback) : error.message,
  });
};

const crearNotificacionPortalInterna = async ({
  tipo,
  titulo,
  mensaje,
  archivo,
}) => {
  try {
    const portalFileId = archivo?.id || null;
    const accionUrl = portalFileId
      ? tipo === "PORTAL_FILE_NUEVA_LECTURA"
        ? `/portal-admin?fileId=${portalFileId}#nueva-lectura`
        : tipo === "PORTAL_FILE_CORRECCION"
          ? `/portal-admin?fileId=${portalFileId}#correccion`
          : `/portal-admin?fileId=${portalFileId}`
      : null;

    await crearNotificacionesInternas({
      rolesDestino: ROLES_NOTIFICACION_PORTAL,
      tipo,
      titulo,
      mensaje,
      archivoECUId: null,
      ordenId: null,
      accion_url: accionUrl,
      accion_tipo: "ABRIR_PORTAL_ADMIN_FILE",
      entidad_tipo: "PORTAL_FILE",
      entidad_id: portalFileId ? String(portalFileId) : null,
      metadata: {
        portalFileId,
        cuentaId: archivo?.cuentaId || null,
        usuarioId: archivo?.usuarioId || null,
      },
    });
  } catch (error) {
    console.warn(
      "No se pudo crear notificacion interna portal:",
      error.message
    );
  }
};

const payloadN8nArchivoPortal = ({ evento, archivo, cuenta, usuario }) => ({
  evento,
  cuenta: cuenta
    ? {
        id: cuenta.id,
        nombre_taller: cuenta.nombre_taller,
        email: cuenta.email,
        telefono: cuenta.telefono,
      }
    : null,
  usuario: usuario
    ? {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
      }
    : null,
  email: usuario?.email || cuenta?.email || null,
  whatsapp: cuenta?.telefono || null,
  creditos: archivo?.creditos_requeridos || null,
  monto: null,
  archivoId: archivo?.id || null,
  servicios: archivo?.tipo_servicio || null,
  fecha: new Date().toISOString(),
  link_admin: archivo?.id
    ? `${FRONTEND_URL}/portal-admin?fileId=${archivo.id}`
    : `${FRONTEND_URL}/portal-admin`,
});

const prepararColumnasNuevaLectura = async () => {
  if (columnasNuevaLecturaPreparadas) return;

  await sequelize.query(`
    ALTER TABLE portal_file_services
      ADD COLUMN IF NOT EXISTS requiere_nueva_lectura BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS nueva_lectura_motivo TEXT,
      ADD COLUMN IF NOT EXISTS nueva_lectura_instrucciones TEXT,
      ADD COLUMN IF NOT EXISTS nueva_lectura_solicitada_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS nueva_lectura_solicitada_por VARCHAR(160),
      ADD COLUMN IF NOT EXISTS archivo_nueva_lectura VARCHAR(500),
      ADD COLUMN IF NOT EXISTS nombre_nueva_lectura VARCHAR(255),
      ADD COLUMN IF NOT EXISTS nueva_lectura_subida_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS nueva_lectura_subida_por VARCHAR(160),
      ADD COLUMN IF NOT EXISTS nueva_lectura_historial JSONB DEFAULT '[]'::jsonb
  `);

  columnasNuevaLecturaPreparadas = true;
};

const normalizarHistorialNuevaLectura = (valor) => {
  if (Array.isArray(valor)) return valor;

  if (typeof valor === "string" && valor.trim()) {
    try {
      const parsed = JSON.parse(valor);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const resolverRutaPortalSegura = (ruta) => {
  if (!ruta) return null;
  const rutaAbsoluta = path.resolve(ruta);
  const relativa = path.relative(PORTAL_UPLOADS_DIR, rutaAbsoluta);

  if (relativa.startsWith("..") || path.isAbsolute(relativa)) {
    return null;
  }

  return rutaAbsoluta;
};

const archivoPortalExiste = (ruta) => {
  const rutaSegura = resolverRutaPortalSegura(ruta);
  return Boolean(rutaSegura && fs.existsSync(rutaSegura));
};

const calcularPuedeDescargar = (archivo, cuenta) => {
  const estado = String(archivo.estado || "").toUpperCase();
  const saldo = normalizarMonto(cuenta?.saldo_creditos, 0);
  const creditosRequeridos = normalizarMonto(archivo.creditos_requeridos, 1);

  if (!archivo.archivo_modificado) return false;
  if (!ESTADOS_DESCARGABLES.includes(estado)) return false;
  if (archivo.creditos_consumidos) return true;
  return saldo >= creditosRequeridos;
};

const mapearArchivoPortal = (archivo, cuenta) => ({
  id: archivo.id,
  estado: archivo.estado,
  tipo_servicio: archivo.tipo_servicio,
  marca_vehiculo: archivo.marca_vehiculo,
  modelo_vehiculo: archivo.modelo_vehiculo,
  anio_vehiculo: archivo.anio_vehiculo,
  ecu_info: archivo.ecu_info,
  observaciones_cliente: archivo.observaciones_cliente,
  nombre_original: archivo.nombre_original,
  nombre_modificado: archivo.nombre_modificado,
  creditos_requeridos: archivo.creditos_requeridos,
  creditos_consumidos: archivo.creditos_consumidos,
  mod_listo: Boolean(archivo.archivo_modificado),
  puede_descargar: calcularPuedeDescargar(archivo, cuenta),
  fecha_subida: archivo.fecha_subida,
  fecha_mod_listo: archivo.fecha_mod_listo,
  fecha_descarga: archivo.fecha_descarga,
  descargas_count: archivo.descargas_count,
  correccion_solicitada: archivo.correccion_solicitada,
  observacion_correccion: archivo.observacion_correccion,
  requiere_nueva_lectura: Boolean(archivo.requiere_nueva_lectura),
  nueva_lectura_motivo: archivo.nueva_lectura_motivo,
  nueva_lectura_instrucciones: archivo.nueva_lectura_instrucciones,
  nueva_lectura_solicitada_at: archivo.nueva_lectura_solicitada_at,
  nueva_lectura_solicitada_por: archivo.nueva_lectura_solicitada_por,
  nombre_nueva_lectura: archivo.nombre_nueva_lectura,
  nueva_lectura_subida_at: archivo.nueva_lectura_subida_at,
  nueva_lectura_subida_por: archivo.nueva_lectura_subida_por,
  nueva_lectura_historial: normalizarHistorialNuevaLectura(
    archivo.nueva_lectura_historial
  ),
  createdAt: archivo.createdAt,
  updatedAt: archivo.updatedAt,
});

const obtenerCreditos = async (req, res) => {
  try {
    const movimientos = await PortalCreditoMovimiento.findAll({
      where: {
        cuentaId: req.portal.cuenta.id,
      },
      order: [["createdAt", "DESC"]],
      limit: 20,
    });

    res.json({
      cuentaId: req.portal.cuenta.id,
      saldo_creditos: req.portal.cuenta.saldo_creditos,
      movimientos: movimientos.map((movimiento) => ({
        id: movimiento.id,
        tipo: movimiento.tipo,
        monto: movimiento.monto,
        saldo_anterior: movimiento.saldo_anterior,
        saldo_nuevo: movimiento.saldo_nuevo,
        referencia: movimiento.referencia,
        observacion: movimiento.observacion,
        createdAt: movimiento.createdAt,
      })),
    });
  } catch (error) {
    console.error("ERROR PORTAL CREDITOS:", error);
    responderError(res, error);
  }
};

const obtenerPortalFiles = async (req, res) => {
  try {
    await prepararColumnasNuevaLectura();

    const archivos = await PortalFileService.findAll({
      where: {
        cuentaId: req.portal.cuenta.id,
      },
      order: [["createdAt", "DESC"]],
    });

    res.json(archivos.map((archivo) => mapearArchivoPortal(archivo, req.portal.cuenta)));
  } catch (error) {
    console.error("ERROR LISTANDO PORTAL FILES:", error);
    responderError(res, error);
  }
};

const crearPortalFile = async (req, res) => {
  try {
    await prepararColumnasNuevaLectura();

    if (!req.file) {
      return res.status(400).json({
        error: "Debes adjuntar el archivo original",
      });
    }

    const tipoServicio = limpiarTexto(req.body.tipo_servicio);

    if (!tipoServicio) {
      return res.status(400).json({
        error: "El tipo de servicio es obligatorio",
      });
    }

    const archivo = await PortalFileService.create({
      cuentaId: req.portal.cuenta.id,
      usuarioId: req.portal.usuario.id,
      estado: "RECIBIDO",
      tipo_servicio: tipoServicio,
      marca_vehiculo: limpiarTexto(req.body.marca_vehiculo),
      modelo_vehiculo: limpiarTexto(req.body.modelo_vehiculo),
      anio_vehiculo: limpiarTexto(req.body.anio_vehiculo),
      ecu_info: limpiarTexto(req.body.ecu_info),
      observaciones_cliente: limpiarTexto(req.body.observaciones_cliente),
      archivo_original: req.file.path,
      nombre_original: req.file.originalname || req.file.filename,
      creditos_requeridos: normalizarMonto(req.body.creditos_requeridos, 1),
      fecha_subida: new Date(),
    });

    res.status(201).json({
      mensaje: "Archivo recibido correctamente",
      archivo: mapearArchivoPortal(archivo, req.portal.cuenta),
    });

    await registrarEventoPortal({
      req,
      cuentaId: req.portal.cuenta.id,
      usuarioId: req.portal.usuario.id,
      tipo: "FILE_SUBIDO",
      resultado: "OK",
      descripcion: "Archivo original subido desde portal externo",
      metadata: {
        fileId: archivo.id,
        tipo_servicio: archivo.tipo_servicio,
        nombre_original: archivo.nombre_original,
      },
      creado_por: req.portal.usuario.email,
    });

    await crearNotificacionPortalInterna({
      tipo: "PORTAL_FILE_NUEVO",
      titulo: "Nuevo archivo Portal File Service",
      mensaje: `Nuevo archivo subido por ${req.portal.usuario.email} para ${archivo.tipo_servicio}.`,
      archivo,
    });

    await notificarN8nPortal(
      "PORTAL_ARCHIVO_NUEVO",
      payloadN8nArchivoPortal({
        evento: "PORTAL_ARCHIVO_NUEVO",
        archivo,
        cuenta: req.portal.cuenta,
        usuario: req.portal.usuario,
      })
    );
  } catch (error) {
    console.error("ERROR CREANDO PORTAL FILE:", error);
    responderError(res, error);
  }
};

const obtenerPortalFilePorId = async (req, res) => {
  try {
    await prepararColumnasNuevaLectura();

    const archivo = await PortalFileService.findOne({
      where: {
        id: req.params.id,
        cuentaId: req.portal.cuenta.id,
      },
    });

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo no encontrado",
      });
    }

    res.json(mapearArchivoPortal(archivo, req.portal.cuenta));
  } catch (error) {
    console.error("ERROR DETALLE PORTAL FILE:", error);
    responderError(res, error);
  }
};

const solicitarCorreccionPortal = async (req, res) => {
  try {
    await prepararColumnasNuevaLectura();

    const archivo = await PortalFileService.findOne({
      where: {
        id: req.params.id,
        cuentaId: req.portal.cuenta.id,
      },
    });

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo no encontrado",
      });
    }

    await archivo.update({
      estado: "CORRECCION_SOLICITADA",
      correccion_solicitada: true,
      observacion_correccion: limpiarTexto(req.body.observacion_correccion),
    });

    await registrarEventoPortal({
      req,
      cuentaId: req.portal.cuenta.id,
      usuarioId: req.portal.usuario.id,
      tipo: "FILE_CORRECCION_SOLICITADA",
      resultado: "OK",
      descripcion: "Correccion solicitada desde portal externo",
      metadata: {
        fileId: archivo.id,
      },
      creado_por: req.portal.usuario.email,
    });

    await crearNotificacionPortalInterna({
      tipo: "PORTAL_FILE_CORRECCION",
      titulo: "Correccion enviada en Portal File Service",
      mensaje: `El usuario ${req.portal.usuario.email} solicito correccion en File #${archivo.id}.`,
      archivo,
    });

    await notificarN8nPortal(
      "PORTAL_CORRECCION_SOLICITADA",
      payloadN8nArchivoPortal({
        evento: "PORTAL_CORRECCION_SOLICITADA",
        archivo,
        cuenta: req.portal.cuenta,
        usuario: req.portal.usuario,
      })
    );

    res.json({
      mensaje: "Correccion solicitada correctamente",
      archivo: mapearArchivoPortal(archivo, req.portal.cuenta),
    });
  } catch (error) {
    console.error("ERROR SOLICITANDO CORRECCION PORTAL:", error);
    responderError(res, error);
  }
};

const subirNuevaLecturaPortal = async (req, res) => {
  try {
    await prepararColumnasNuevaLectura();

    if (!req.file) {
      return res.status(400).json({
        error: "Debes adjuntar el archivo de nueva lectura",
      });
    }

    const archivo = await PortalFileService.findOne({
      where: {
        id: req.params.id,
        cuentaId: req.portal.cuenta.id,
      },
    });

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo no encontrado",
      });
    }

    if (String(archivo.estado || "").toUpperCase() !== "REQUIERE_NUEVA_LECTURA") {
      return res.status(400).json({
        error: "Esta solicitud no tiene una nueva lectura pendiente",
      });
    }

    const ahora = new Date();
    const historial = normalizarHistorialNuevaLectura(
      archivo.nueva_lectura_historial
    );
    const evento = {
      tipo: "NUEVA_LECTURA_SUBIDA",
      archivo_anterior: archivo.archivo_original || null,
      nombre_anterior: archivo.nombre_original || null,
      archivo: req.file.path,
      nombre: req.file.originalname || req.file.filename,
      usuario: req.portal.usuario.email,
      fecha: ahora.toISOString(),
      motivo: archivo.nueva_lectura_motivo || "",
      instrucciones: archivo.nueva_lectura_instrucciones || "",
    };

    await archivo.update({
      estado: "EN_REVISION",
      requiere_nueva_lectura: false,
      archivo_nueva_lectura: req.file.path,
      nombre_nueva_lectura: req.file.originalname || req.file.filename,
      nueva_lectura_subida_at: ahora,
      nueva_lectura_subida_por: req.portal.usuario.email,
      nueva_lectura_historial: [evento, ...historial],
      archivo_original: req.file.path,
      nombre_original: req.file.originalname || req.file.filename,
      archivo_modificado: null,
      nombre_modificado: null,
      fecha_mod_listo: null,
      correccion_solicitada: false,
    });

    await registrarEventoPortal({
      req,
      cuentaId: req.portal.cuenta.id,
      usuarioId: req.portal.usuario.id,
      tipo: "FILE_NUEVA_LECTURA_SUBIDA",
      resultado: "OK",
      descripcion: "Usuario externo subio nueva lectura solicitada por GMTCH",
      metadata: {
        fileId: archivo.id,
        nombre_nueva_lectura: archivo.nombre_nueva_lectura,
      },
      creado_por: req.portal.usuario.email,
    });

    await crearNotificacionPortalInterna({
      tipo: "PORTAL_FILE_NUEVA_LECTURA",
      titulo: "Nueva lectura subida por master/slave",
      mensaje: `El usuario ${req.portal.usuario.email} subio una nueva lectura para File #${archivo.id}.`,
      archivo,
    });

    res.json({
      mensaje: "Nueva lectura recibida correctamente. GMTCH la revisara antes de continuar.",
      archivo: mapearArchivoPortal(archivo, req.portal.cuenta),
    });
  } catch (error) {
    console.error("ERROR SUBIENDO NUEVA LECTURA PORTAL:", error);
    responderError(res, error);
  }
};

const descargarModPortal = async (req, res) => {
  try {
    await prepararColumnasNuevaLectura();

    const archivo = await PortalFileService.findOne({
      where: {
        id: req.params.id,
        cuentaId: req.portal.cuenta.id,
      },
    });

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo no encontrado",
      });
    }

    const estado = String(archivo.estado || "").toUpperCase();

    const rutaSegura = resolverRutaPortalSegura(archivo.archivo_modificado);

    if (!rutaSegura) {
      await registrarEventoPortal({
        req,
        cuentaId: req.portal.cuenta.id,
        usuarioId: req.portal.usuario.id,
        tipo: "INTENTO_SOSPECHOSO",
        resultado: "ERROR",
        descripcion: "Ruta de descarga MOD fuera de carpeta permitida",
        metadata: {
          fileId: archivo.id,
        },
        creado_por: req.portal.usuario.email,
      });

      return res.status(403).json({
        error: "Descarga no autorizada",
      });
    }

    if (!archivo.archivo_modificado || !archivoPortalExiste(archivo.archivo_modificado)) {
      return res.status(404).json({
        error: "MOD no disponible",
      });
    }

    if (!ESTADOS_DESCARGABLES.includes(estado)) {
      return res.status(400).json({
        error: "El MOD aun no esta disponible para descarga",
      });
    }

    if (!archivo.creditos_consumidos) {
      await sequelize.transaction(async (transaction) => {
        const cuenta = await PortalCuenta.findByPk(req.portal.cuenta.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        const archivoBloqueado = await PortalFileService.findOne({
          where: {
            id: archivo.id,
            cuentaId: req.portal.cuenta.id,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!cuenta || !archivoBloqueado) {
          throw crearError(404, "Registro portal no encontrado");
        }

        if (!archivoBloqueado.creditos_consumidos) {
          const saldoAnterior = normalizarMonto(cuenta.saldo_creditos, 0);
          const creditosRequeridos = normalizarMonto(
            archivoBloqueado.creditos_requeridos,
            1
          );

          if (saldoAnterior < creditosRequeridos) {
            await registrarEventoPortal({
              req,
              cuentaId: req.portal.cuenta.id,
              usuarioId: req.portal.usuario.id,
              tipo: "DESCARGA_BLOQUEADA_SIN_CREDITOS",
              resultado: "ERROR",
              descripcion: "Descarga bloqueada por saldo insuficiente",
              metadata: {
                fileId: archivoBloqueado.id,
                saldo: saldoAnterior,
                requeridos: creditosRequeridos,
              },
              creado_por: req.portal.usuario.email,
            });
            throw crearError(402, "Saldo de creditos insuficiente");
          }

          const saldoNuevo = normalizarMonto(saldoAnterior - creditosRequeridos, 0);

          await cuenta.update(
            {
              saldo_creditos: saldoNuevo,
            },
            { transaction }
          );

          await PortalCreditoMovimiento.create(
            {
              cuentaId: cuenta.id,
              tipo: "CONSUMO_FILE",
              monto: creditosRequeridos,
              saldo_anterior: saldoAnterior,
              saldo_nuevo: saldoNuevo,
              referencia: `PortalFileService:${archivoBloqueado.id}`,
              creado_por: req.portal.usuario.email,
              observacion: "Consumo por descarga de MOD",
            },
            { transaction }
          );

          await registrarEventoPortal({
            req,
            cuentaId: cuenta.id,
            usuarioId: req.portal.usuario.id,
            tipo: "CREDITOS_CONSUMIDOS",
            resultado: "OK",
            descripcion: "Creditos consumidos por descarga MOD",
            metadata: {
              fileId: archivoBloqueado.id,
              monto: creditosRequeridos,
              saldo_anterior: saldoAnterior,
              saldo_nuevo: saldoNuevo,
            },
            creado_por: req.portal.usuario.email,
          });

          await archivoBloqueado.update(
            {
              creditos_consumidos: true,
              fecha_descarga: new Date(),
              descargas_count: Number(archivoBloqueado.descargas_count || 0) + 1,
              estado: "ENTREGADO",
            },
            { transaction }
          );
        }
      });
    } else {
      await archivo.update({
        fecha_descarga: new Date(),
        descargas_count: Number(archivo.descargas_count || 0) + 1,
      });
    }

    await registrarEventoPortal({
      req,
      cuentaId: req.portal.cuenta.id,
      usuarioId: req.portal.usuario.id,
      tipo: "FILE_MOD_DESCARGADO",
      resultado: "OK",
      descripcion: "MOD descargado desde portal externo",
      metadata: {
        fileId: archivo.id,
        nombre_modificado: archivo.nombre_modificado,
      },
      creado_por: req.portal.usuario.email,
    });

    const nombre = archivo.nombre_modificado || path.basename(rutaSegura);

    return res.download(rutaSegura, nombre, (error) => {
      if (error && !res.headersSent) {
        res.status(500).json({
          error: "No se pudo descargar el MOD",
        });
      }
    });
  } catch (error) {
    console.error("ERROR DESCARGANDO MOD PORTAL:", error);
    responderError(res, error, "No se pudo descargar el MOD");
  }
};

module.exports = {
  obtenerCreditos,
  obtenerPortalFiles,
  crearPortalFile,
  obtenerPortalFilePorId,
  solicitarCorreccionPortal,
  subirNuevaLecturaPortal,
  descargarModPortal,
  mapearArchivoPortal,
};
