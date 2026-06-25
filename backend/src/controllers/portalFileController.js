const fs = require("fs");
const path = require("path");
const sequelize = require("../config/database");
const {
  PortalCuenta,
  PortalFileService,
  PortalCreditoMovimiento,
} = require("../models");

const ESTADOS_DESCARGABLES = ["MOD_LISTO", "CORREGIDO", "ENTREGADO"];

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

const archivoExiste = (ruta) => {
  if (!ruta) return false;
  try {
    return fs.existsSync(path.resolve(ruta));
  } catch {
    return false;
  }
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
    res.status(500).json({ error: error.message });
  }
};

const obtenerPortalFiles = async (req, res) => {
  try {
    const archivos = await PortalFileService.findAll({
      where: {
        cuentaId: req.portal.cuenta.id,
      },
      order: [["createdAt", "DESC"]],
    });

    res.json(archivos.map((archivo) => mapearArchivoPortal(archivo, req.portal.cuenta)));
  } catch (error) {
    console.error("ERROR LISTANDO PORTAL FILES:", error);
    res.status(500).json({ error: error.message });
  }
};

const crearPortalFile = async (req, res) => {
  try {
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
  } catch (error) {
    console.error("ERROR CREANDO PORTAL FILE:", error);
    res.status(500).json({ error: error.message });
  }
};

const obtenerPortalFilePorId = async (req, res) => {
  try {
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
    res.status(500).json({ error: error.message });
  }
};

const solicitarCorreccionPortal = async (req, res) => {
  try {
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

    res.json({
      mensaje: "Correccion solicitada correctamente",
      archivo: mapearArchivoPortal(archivo, req.portal.cuenta),
    });
  } catch (error) {
    console.error("ERROR SOLICITANDO CORRECCION PORTAL:", error);
    res.status(500).json({ error: error.message });
  }
};

const descargarModPortal = async (req, res) => {
  try {
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

    if (!archivo.archivo_modificado || !archivoExiste(archivo.archivo_modificado)) {
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

    const ruta = path.resolve(archivo.archivo_modificado);
    const nombre = archivo.nombre_modificado || path.basename(ruta);

    return res.download(ruta, nombre, (error) => {
      if (error && !res.headersSent) {
        res.status(500).json({
          error: "No se pudo descargar el MOD",
        });
      }
    });
  } catch (error) {
    console.error("ERROR DESCARGANDO MOD PORTAL:", error);
    res.status(error.status || 500).json({
      error: error.message,
    });
  }
};

module.exports = {
  obtenerCreditos,
  obtenerPortalFiles,
  crearPortalFile,
  obtenerPortalFilePorId,
  solicitarCorreccionPortal,
  descargarModPortal,
  mapearArchivoPortal,
};
