const sequelize = require("../config/database");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const {
  PortalCuenta,
  PortalUsuario,
  PortalFileService,
  PortalCreditoMovimiento,
  PortalAuditoriaEvento,
} = require("../models");
const { registrarEventoPortal } = require("./portalAuthController");

const ESTADOS_VALIDOS = [
  "RECIBIDO",
  "EN_REVISION",
  "EN_PROCESO",
  "MOD_LISTO",
  "CORRECCION_SOLICITADA",
  "REQUIERE_NUEVA_LECTURA",
  "CORREGIDO",
  "ENTREGADO",
  "RECHAZADO",
];
const PORTAL_UPLOADS_DIR = path.resolve(__dirname, "..", "portal_uploads");
let columnasNuevaLecturaPreparadas = false;

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const normalizarUsername = (valor) => {
  const texto = limpiarTexto(valor).toLowerCase();
  return texto || null;
};

let columnasPortalUsuarioPreparadas = false;

const prepararColumnasPortalUsuario = async () => {
  if (columnasPortalUsuarioPreparadas) return;

  await sequelize.query(`
    ALTER TABLE portal_usuarios
    ADD COLUMN IF NOT EXISTS username VARCHAR(120);
  `);

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS portal_usuarios_username_lower_unique
    ON portal_usuarios (LOWER(username))
    WHERE username IS NOT NULL AND username <> '';
  `);

  columnasPortalUsuarioPreparadas = true;
};

const validarUsernameUnico = async (username, usuarioIdExcluir = null) => {
  const normalizado = normalizarUsername(username);
  if (!normalizado) return null;

  const where = { username: normalizado };

  if (usuarioIdExcluir) {
    where.id = { [Op.ne]: usuarioIdExcluir };
  }

  const existente = await PortalUsuario.findOne({ where });

  if (existente) {
    const error = new Error("Ya existe un usuario portal con ese usuario de acceso");
    error.status = 409;
    throw error;
  }

  return normalizado;
};

const normalizarMonto = (valor, defecto = 0) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return defecto;
  return Math.max(0, Number(numero.toFixed(2)));
};

const archivoExiste = (ruta) => {
  if (!ruta) return false;
  try {
    return fs.existsSync(path.resolve(ruta));
  } catch {
    return false;
  }
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

const resolverRutaPortalSegura = (ruta) => {
  if (!ruta) return null;
  const rutaAbsoluta = path.resolve(ruta);
  const relativa = path.relative(PORTAL_UPLOADS_DIR, rutaAbsoluta);

  if (relativa.startsWith("..") || path.isAbsolute(relativa)) {
    return null;
  }

  return rutaAbsoluta;
};

const descargarArchivoSeguro = async (req, res, ruta, nombre, audit = {}) => {
  const rutaAbsoluta = resolverRutaPortalSegura(ruta);

  if (!rutaAbsoluta) {
    await registrarEventoPortal({
      req,
      cuentaId: audit.cuentaId || null,
      usuarioId: audit.usuarioId || null,
      tipo: "INTENTO_SOSPECHOSO",
      resultado: "ERROR",
      descripcion: "Intento de descarga fuera de carpeta permitida",
      metadata: {
        fileId: audit.fileId || null,
      },
      creado_por: usuarioInternoActual(req),
    });

    return res.status(403).json({
      error: "Descarga no autorizada",
    });
  }

  const nombreDescarga = nombre || path.basename(rutaAbsoluta);

  res.setHeader("Content-Type", "application/octet-stream");
  return res.download(rutaAbsoluta, nombreDescarga, (error) => {
    if (error && !res.headersSent) {
      res.status(500).json({
        error: "No se pudo descargar el archivo",
      });
    }
  });
};

const normalizarBoolean = (valor, defecto) => {
  if (valor === undefined || valor === null) return defecto;
  if (typeof valor === "boolean") return valor;

  const texto = String(valor).trim().toLowerCase();

  if (["true", "1", "si", "sí", "yes"].includes(texto)) return true;
  if (["false", "0", "no"].includes(texto)) return false;

  return defecto;
};

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

const usuarioInternoActual = (req) => {
  return (
    req.usuario?.username ||
    req.user?.username ||
    req.usuario?.nombre ||
    req.user?.nombre ||
    "sistema"
  );
};

const mapearCuentaAdmin = (cuenta) => ({
  id: cuenta.id,
  nombre_taller: cuenta.nombre_taller,
  contacto: cuenta.contacto,
  email: cuenta.email,
  telefono: cuenta.telefono,
  pais: cuenta.pais,
  ciudad: cuenta.ciudad,
  activo: cuenta.activo,
  aprobado: cuenta.aprobado,
  saldo_creditos: cuenta.saldo_creditos,
  observaciones: cuenta.observaciones,
  createdAt: cuenta.createdAt,
  updatedAt: cuenta.updatedAt,
});

const mapearUsuarioAdmin = (usuario) => {
  if (!usuario) return null;

  return {
    id: usuario.id,
    cuentaId: usuario.cuentaId,
    nombre: usuario.nombre,
    email: usuario.email,
    username: usuario.username || null,
    activo: usuario.activo,
    aprobado: usuario.aprobado,
    last_login_at: usuario.last_login_at,
    last_seen_at: usuario.last_seen_at,
    createdAt: usuario.createdAt,
    updatedAt: usuario.updatedAt,
  };
};

const mapearEventoAuditoria = (evento) => ({
  id: evento.id,
  cuentaId: evento.cuentaId,
  usuarioId: evento.usuarioId,
  tipo: evento.tipo,
  resultado: evento.resultado,
  descripcion: evento.descripcion,
  metadata: evento.metadata || null,
  ip: evento.ip,
  user_agent: evento.user_agent,
  creado_por: evento.creado_por,
  createdAt: evento.createdAt,
});

const buscarEventosAuditoria = async (filtros = {}) => {
  const where = {};
  const limit = Math.min(Math.max(Number(filtros.limit) || 80, 1), 200);

  if (filtros.cuentaId) where.cuentaId = filtros.cuentaId;
  if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
  if (filtros.tipo) where.tipo = limpiarTexto(filtros.tipo).toUpperCase();

  return PortalAuditoriaEvento.findAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
  });
};

const mapearFileAdmin = (archivo) => {
  const json = typeof archivo.toJSON === "function" ? archivo.toJSON() : archivo;

  return {
    id: json.id,
    cuentaId: json.cuentaId,
    usuarioId: json.usuarioId,
    estado: json.estado,
    tipo_servicio: json.tipo_servicio,
    marca_vehiculo: json.marca_vehiculo,
    modelo_vehiculo: json.modelo_vehiculo,
    anio_vehiculo: json.anio_vehiculo,
    ecu_info: json.ecu_info,
    observaciones_cliente: json.observaciones_cliente,
    observaciones_internas: json.observaciones_internas,
    nombre_original: json.nombre_original,
    nombre_modificado: json.nombre_modificado,
    archivo_original_disponible: Boolean(json.archivo_original),
    archivo_modificado_disponible: Boolean(json.archivo_modificado),
    creditos_requeridos: json.creditos_requeridos,
    creditos_consumidos: json.creditos_consumidos,
    fecha_subida: json.fecha_subida,
    fecha_mod_listo: json.fecha_mod_listo,
    fecha_descarga: json.fecha_descarga,
    descargas_count: json.descargas_count,
    correccion_solicitada: json.correccion_solicitada,
    observacion_correccion: json.observacion_correccion,
    requiere_nueva_lectura: Boolean(json.requiere_nueva_lectura),
    nueva_lectura_motivo: json.nueva_lectura_motivo,
    nueva_lectura_instrucciones: json.nueva_lectura_instrucciones,
    nueva_lectura_solicitada_at: json.nueva_lectura_solicitada_at,
    nueva_lectura_solicitada_por: json.nueva_lectura_solicitada_por,
    nombre_nueva_lectura: json.nombre_nueva_lectura,
    nueva_lectura_subida_at: json.nueva_lectura_subida_at,
    nueva_lectura_subida_por: json.nueva_lectura_subida_por,
    nueva_lectura_historial: normalizarHistorialNuevaLectura(
      json.nueva_lectura_historial
    ),
    Cuenta: json.PortalCuenta ? mapearCuentaAdmin(json.PortalCuenta) : null,
    Usuario: json.PortalUsuario ? mapearUsuarioAdmin(json.PortalUsuario) : null,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };
};

const crearCuenta = async (req, res) => {
  try {
    await prepararColumnasPortalUsuario();

    const nombreTaller = limpiarTexto(req.body.nombre_taller);

    if (!nombreTaller) {
      return res.status(400).json({
        error: "El nombre del taller es obligatorio",
      });
    }

    const usuarioEmail = limpiarTexto(
      req.body.usuario_email || req.body.email_usuario
    ).toLowerCase();
    const usuarioPassword = limpiarTexto(
      req.body.usuario_password || req.body.password
    );
    const usuarioNombre = limpiarTexto(
      req.body.usuario_nombre || req.body.nombre_usuario
    );
    const username = await validarUsernameUnico(
      req.body.usuario_username || req.body.username
    );

    if (!usuarioEmail || !usuarioPassword || !usuarioNombre) {
      return res.status(400).json({
        error:
          "Para crear cuenta portal debes enviar usuario_nombre, usuario_email y usuario_password. El username es opcional.",
      });
    }

    const usuarioExistente = await PortalUsuario.findOne({
      where: { email: usuarioEmail },
    });

    if (usuarioExistente) {
      return res.status(409).json({
        error: "Ya existe un usuario portal con ese email de acceso",
      });
    }

    const resultado = await sequelize.transaction(async (transaction) => {
      const usuarioPasswordHash = await bcrypt.hash(usuarioPassword, 10);

      const cuenta = await PortalCuenta.create(
        {
          nombre_taller: nombreTaller,
          contacto: limpiarTexto(req.body.contacto),
          email: limpiarTexto(req.body.email).toLowerCase(),
          telefono: limpiarTexto(req.body.telefono),
          pais: limpiarTexto(req.body.pais),
          ciudad: limpiarTexto(req.body.ciudad),
          activo:
            Object.prototype.hasOwnProperty.call(req.body, "activo")
              ? Boolean(req.body.activo)
              : true,
          aprobado:
            Object.prototype.hasOwnProperty.call(req.body, "aprobado")
              ? Boolean(req.body.aprobado)
              : true,
          saldo_creditos: normalizarMonto(req.body.saldo_creditos, 0),
          observaciones: limpiarTexto(req.body.observaciones),
        },
        { transaction }
      );

      let usuario = null;

      usuario = await PortalUsuario.create(
        {
          cuentaId: cuenta.id,
          nombre: usuarioNombre,
          email: usuarioEmail,
          username,
          password: usuarioPasswordHash,
          activo: true,
          aprobado: true,
        },
        { transaction }
      );

      return { cuenta, usuario };
    });

    res.status(201).json({
      mensaje: "Cuenta portal creada correctamente",
      cuenta: mapearCuentaAdmin(resultado.cuenta),
      usuario: mapearUsuarioAdmin(resultado.usuario),
    });

    await registrarEventoPortal({
      req,
      cuentaId: resultado.cuenta.id,
      usuarioId: resultado.usuario.id,
      tipo: "USUARIO_PORTAL_CREADO",
      resultado: "OK",
      descripcion: "Cuenta portal y primer usuario creados",
      metadata: {
        cuenta_email: resultado.cuenta.email,
        usuario_email: resultado.usuario.email,
        username: resultado.usuario.username || null,
      },
      creado_por: usuarioInternoActual(req),
    });
  } catch (error) {
    console.error("ERROR CREANDO CUENTA PORTAL:", error);
    responderError(res, error);
  }
};

const listarCuentas = async (req, res) => {
  try {
    await prepararColumnasPortalUsuario();

    const cuentas = await PortalCuenta.findAll({
      include: [
        {
          model: PortalUsuario,
          required: false,
          attributes: [
            "id",
            "cuentaId",
            "nombre",
            "email",
            "username",
            "activo",
            "aprobado",
            "last_login_at",
            "last_seen_at",
            "createdAt",
            "updatedAt",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const cuentasMapeadas = await Promise.all(
      cuentas.map(async (cuenta) => {
        const json = cuenta.toJSON();
        const totalArchivos = await PortalFileService.count({
          where: { cuentaId: json.id },
        });
        const totalMovimientos = await PortalCreditoMovimiento.count({
          where: { cuentaId: json.id },
        });

        return {
          ...mapearCuentaAdmin(json),
          Usuarios: (json.PortalUsuarios || []).map(mapearUsuarioAdmin),
          total_archivos: totalArchivos,
          total_movimientos: totalMovimientos,
          puede_eliminar_prueba: totalArchivos === 0 && totalMovimientos === 0,
        };
      })
    );

    res.json(cuentasMapeadas);
  } catch (error) {
    console.error("ERROR LISTANDO CUENTAS PORTAL:", error);
    responderError(res, error);
  }
};

const editarCuenta = async (req, res) => {
  try {
    const cuenta = await PortalCuenta.findByPk(req.params.id);

    if (!cuenta) {
      return res.status(404).json({
        error: "Cuenta portal no encontrada",
      });
    }

    const payload = {};
    const camposTexto = [
      "nombre_taller",
      "contacto",
      "email",
      "telefono",
      "pais",
      "ciudad",
      "observaciones",
    ];

    camposTexto.forEach((campo) => {
      if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
        payload[campo] =
          campo === "email"
            ? limpiarTexto(req.body[campo]).toLowerCase()
            : limpiarTexto(req.body[campo]);
      }
    });

    if (!payload.nombre_taller && Object.prototype.hasOwnProperty.call(payload, "nombre_taller")) {
      return res.status(400).json({
        error: "El nombre del taller es obligatorio",
      });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "activo")) {
      payload.activo = normalizarBoolean(req.body.activo, cuenta.activo);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "aprobado")) {
      payload.aprobado = normalizarBoolean(req.body.aprobado, cuenta.aprobado);
    }

    await cuenta.update(payload);

    await registrarEventoPortal({
      req,
      cuentaId: cuenta.id,
      tipo: "CUENTA_PORTAL_EDITADA",
      resultado: "OK",
      descripcion: "Cuenta portal editada por admin",
      metadata: { campos: Object.keys(payload), email: cuenta.email },
      creado_por: usuarioInternoActual(req),
    });

    res.json({
      mensaje: "Cuenta portal actualizada",
      cuenta: mapearCuentaAdmin(cuenta),
    });
  } catch (error) {
    console.error("ERROR EDITANDO CUENTA PORTAL:", error);
    responderError(res, error);
  }
};

const crearUsuarioCuenta = async (req, res) => {
  try {
    await prepararColumnasPortalUsuario();

    const cuenta = await PortalCuenta.findByPk(req.params.id);

    if (!cuenta) {
      return res.status(404).json({
        error: "Cuenta portal no encontrada",
      });
    }

    const nombre = limpiarTexto(req.body.nombre || req.body.usuario_nombre);
    const email = limpiarTexto(req.body.email || req.body.usuario_email).toLowerCase();
    const password = limpiarTexto(req.body.password || req.body.usuario_password);
    const username = await validarUsernameUnico(req.body.username || req.body.usuario_username);

    if (!nombre || !email || !password) {
      return res.status(400).json({
        error: "Nombre, email y password son obligatorios para crear usuario portal",
      });
    }

    const existente = await PortalUsuario.findOne({
      where: { email },
    });

    if (existente) {
      return res.status(409).json({
        error: "Ya existe un usuario portal con ese email de acceso",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const usuario = await PortalUsuario.create({
      cuentaId: cuenta.id,
      nombre,
      email,
      username,
      password: passwordHash,
      activo: true,
      aprobado: true,
    });

    res.status(201).json({
      mensaje: "Usuario portal creado correctamente",
      usuario: mapearUsuarioAdmin(usuario),
    });

    await registrarEventoPortal({
      req,
      cuentaId: cuenta.id,
      usuarioId: usuario.id,
      tipo: "USUARIO_PORTAL_CREADO",
      resultado: "OK",
      descripcion: "Usuario portal creado en cuenta existente",
      metadata: { email: usuario.email, username: usuario.username || null },
      creado_por: usuarioInternoActual(req),
    });
  } catch (error) {
    console.error("ERROR CREANDO USUARIO PORTAL:", error);
    responderError(res, error);
  }
};

const editarUsuarioPortal = async (req, res) => {
  try {
    await prepararColumnasPortalUsuario();

    const usuario = await PortalUsuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({
        error: "Usuario portal no encontrado",
      });
    }

    const payload = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "nombre")) {
      const nombre = limpiarTexto(req.body.nombre);
      if (!nombre) {
        return res.status(400).json({ error: "Nombre de usuario obligatorio" });
      }
      payload.nombre = nombre;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "email")) {
      const email = limpiarTexto(req.body.email).toLowerCase();
      if (!email) {
        return res.status(400).json({ error: "Email de acceso obligatorio" });
      }

      const existente = await PortalUsuario.findOne({
        where: {
          email,
          id: {
            [Op.ne]: usuario.id,
          },
        },
      });

      if (existente) {
        return res.status(409).json({
          error: "Ya existe otro usuario portal con ese email",
        });
      }

      payload.email = email;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "username")) {
      payload.username = await validarUsernameUnico(req.body.username, usuario.id);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "activo")) {
      payload.activo = normalizarBoolean(req.body.activo, usuario.activo);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "aprobado")) {
      payload.aprobado = normalizarBoolean(req.body.aprobado, usuario.aprobado);
    }

    await usuario.update(payload);

    await registrarEventoPortal({
      req,
      cuentaId: usuario.cuentaId,
      usuarioId: usuario.id,
      tipo: "USUARIO_PORTAL_EDITADO",
      resultado: "OK",
      descripcion: "Usuario portal editado por admin",
      metadata: {
        campos: Object.keys(payload),
        email: usuario.email,
        username: usuario.username || null,
      },
      creado_por: usuarioInternoActual(req),
    });

    res.json({
      mensaje: "Usuario portal actualizado",
      usuario: mapearUsuarioAdmin(usuario),
    });
  } catch (error) {
    console.error("ERROR EDITANDO USUARIO PORTAL:", error);
    responderError(res, error);
  }
};

const resetPasswordUsuario = async (req, res) => {
  try {
    const usuario = await PortalUsuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({
        error: "Usuario portal no encontrado",
      });
    }

    const password = limpiarTexto(req.body.password);

    if (!password) {
      return res.status(400).json({
        error: "La nueva clave es obligatoria",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await usuario.update({ password: passwordHash });

    await registrarEventoPortal({
      req,
      cuentaId: usuario.cuentaId,
      usuarioId: usuario.id,
      tipo: "PASSWORD_RESET_ADMIN",
      resultado: "OK",
      descripcion: "Clave de usuario portal reseteada por admin",
      metadata: { email: usuario.email },
      creado_por: usuarioInternoActual(req),
    });

    res.json({
      mensaje: `Clave actualizada para ${usuario.email}`,
      usuario: mapearUsuarioAdmin(usuario),
    });
  } catch (error) {
    console.error("ERROR RESET PASSWORD PORTAL:", error);
    responderError(res, error);
  }
};

const actualizarEstadoCuenta = async (req, res) => {
  try {
    const cuenta = await PortalCuenta.findByPk(req.params.id);

    if (!cuenta) {
      return res.status(404).json({
        error: "Cuenta portal no encontrada",
      });
    }

    const payload = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "activo")) {
      payload.activo = normalizarBoolean(req.body.activo, cuenta.activo);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "aprobado")) {
      payload.aprobado = normalizarBoolean(req.body.aprobado, cuenta.aprobado);
    }

    await cuenta.update(payload);

    await registrarEventoPortal({
      req,
      cuentaId: cuenta.id,
      tipo:
        payload.activo === false || payload.aprobado === false
          ? "CUENTA_PORTAL_DESACTIVADA"
          : "CUENTA_PORTAL_EDITADA",
      resultado: "OK",
      descripcion: "Estado de cuenta portal actualizado",
      metadata: {
        activo: cuenta.activo,
        aprobado: cuenta.aprobado,
      },
      creado_por: usuarioInternoActual(req),
    });

    res.json({
      mensaje: "Estado de cuenta portal actualizado",
      cuenta: mapearCuentaAdmin(cuenta),
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO ESTADO CUENTA PORTAL:", error);
    responderError(res, error);
  }
};

const actualizarEstadoUsuario = async (req, res) => {
  try {
    const usuario = await PortalUsuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({
        error: "Usuario portal no encontrado",
      });
    }

    const payload = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "activo")) {
      payload.activo = normalizarBoolean(req.body.activo, usuario.activo);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "aprobado")) {
      payload.aprobado = normalizarBoolean(req.body.aprobado, usuario.aprobado);
    }

    await usuario.update(payload);

    await registrarEventoPortal({
      req,
      cuentaId: usuario.cuentaId,
      usuarioId: usuario.id,
      tipo: "USUARIO_PORTAL_EDITADO",
      resultado: "OK",
      descripcion: "Estado de usuario portal actualizado",
      metadata: {
        activo: usuario.activo,
        aprobado: usuario.aprobado,
        email: usuario.email,
      },
      creado_por: usuarioInternoActual(req),
    });

    res.json({
      mensaje: "Estado de usuario portal actualizado",
      usuario: mapearUsuarioAdmin(usuario),
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO ESTADO USUARIO PORTAL:", error);
    responderError(res, error);
  }
};

const eliminarCuentaPrueba = async (req, res) => {
  try {
    const cuenta = await PortalCuenta.findByPk(req.params.id);

    if (!cuenta) {
      return res.status(404).json({
        error: "Cuenta portal no encontrada",
      });
    }

    const totalArchivos = await PortalFileService.count({
      where: { cuentaId: cuenta.id },
    });
    const totalMovimientos = await PortalCreditoMovimiento.count({
      where: { cuentaId: cuenta.id },
    });

    if (totalArchivos > 0 || totalMovimientos > 0) {
      return res.status(400).json({
        error: "La cuenta tiene historial. Se recomienda desactivar.",
      });
    }

    await sequelize.transaction(async (transaction) => {
      await PortalUsuario.destroy({
        where: { cuentaId: cuenta.id },
        transaction,
      });
      await cuenta.destroy({ transaction });
    });

    await registrarEventoPortal({
      req,
      cuentaId: cuenta.id,
      tipo: "CUENTA_PORTAL_EDITADA",
      resultado: "OK",
      descripcion: "Cuenta de prueba eliminada sin historial",
      metadata: { nombre_taller: cuenta.nombre_taller, email: cuenta.email },
      creado_por: usuarioInternoActual(req),
    });

    res.json({
      mensaje: "Cuenta de prueba eliminada correctamente",
    });
  } catch (error) {
    console.error("ERROR ELIMINANDO CUENTA PORTAL:", error);
    responderError(res, error);
  }
};

const listarFilesAdmin = async (req, res) => {
  try {
    await prepararColumnasNuevaLectura();

    const archivos = await PortalFileService.findAll({
      include: [
        { model: PortalCuenta, required: false },
        {
          model: PortalUsuario,
          required: false,
          attributes: [
            "id",
            "cuentaId",
            "nombre",
            "email",
            "username",
            "activo",
            "aprobado",
            "last_login_at",
            "last_seen_at",
            "createdAt",
            "updatedAt",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(archivos.map(mapearFileAdmin));
  } catch (error) {
    console.error("ERROR LISTANDO FILES PORTAL ADMIN:", error);
    responderError(res, error);
  }
};

const obtenerFileAdmin = async (req, res) => {
  try {
    await prepararColumnasNuevaLectura();

    const archivo = await PortalFileService.findByPk(req.params.id, {
      include: [
        { model: PortalCuenta, required: false },
        {
          model: PortalUsuario,
          required: false,
          attributes: [
            "id",
            "cuentaId",
            "nombre",
            "email",
            "username",
            "activo",
            "aprobado",
            "last_login_at",
            "last_seen_at",
            "createdAt",
            "updatedAt",
          ],
        },
      ],
    });

    if (!archivo) {
      return res.status(404).json({
        error: "Solicitud portal no encontrada",
      });
    }

    res.json(mapearFileAdmin(archivo));
  } catch (error) {
    console.error("ERROR DETALLE FILE PORTAL ADMIN:", error);
    responderError(res, error);
  }
};

const descargarOriginalAdmin = async (req, res) => {
  try {
    await prepararColumnasNuevaLectura();

    const archivo = await PortalFileService.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Solicitud portal no encontrada",
      });
    }

    if (!archivo.archivo_original || !archivoExiste(archivo.archivo_original)) {
      return res.status(404).json({
        error: "Archivo no encontrado en almacenamiento",
      });
    }

    await registrarEventoPortal({
      req,
      cuentaId: archivo.cuentaId,
      usuarioId: archivo.usuarioId,
      tipo: "FILE_ORIGINAL_DESCARGADO_ADMIN",
      resultado: "OK",
      descripcion: "Admin descargo archivo original desde portal admin",
      metadata: {
        fileId: archivo.id,
        nombre_original: archivo.nombre_original,
      },
      creado_por: usuarioInternoActual(req),
    });

    return descargarArchivoSeguro(
      req,
      res,
      archivo.archivo_original,
      archivo.nombre_original,
      {
        cuentaId: archivo.cuentaId,
        usuarioId: archivo.usuarioId,
        fileId: archivo.id,
      }
    );
  } catch (error) {
    console.error("ERROR DESCARGANDO ORIGINAL PORTAL ADMIN:", error);
    return responderError(res, error, "No se pudo descargar el archivo");
  }
};

const descargarNuevaLecturaAdmin = async (req, res) => {
  try {
    await prepararColumnasNuevaLectura();

    const archivo = await PortalFileService.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Solicitud portal no encontrada",
      });
    }

    if (
      !archivo.archivo_nueva_lectura ||
      !archivoExiste(archivo.archivo_nueva_lectura)
    ) {
      return res.status(404).json({
        error: "Archivo no encontrado en almacenamiento",
      });
    }

    await registrarEventoPortal({
      req,
      cuentaId: archivo.cuentaId,
      usuarioId: archivo.usuarioId,
      tipo: "FILE_NUEVA_LECTURA_DESCARGADA_ADMIN",
      resultado: "OK",
      descripcion: "Admin descargo nueva lectura desde portal admin",
      metadata: {
        fileId: archivo.id,
        nombre_nueva_lectura: archivo.nombre_nueva_lectura,
      },
      creado_por: usuarioInternoActual(req),
    });

    return descargarArchivoSeguro(
      req,
      res,
      archivo.archivo_nueva_lectura,
      archivo.nombre_nueva_lectura,
      {
        cuentaId: archivo.cuentaId,
        usuarioId: archivo.usuarioId,
        fileId: archivo.id,
      }
    );
  } catch (error) {
    console.error("ERROR DESCARGANDO NUEVA LECTURA PORTAL ADMIN:", error);
    return responderError(res, error, "No se pudo descargar el archivo");
  }
};

const actualizarFileAdmin = async (req, res) => {
  try {
    await prepararColumnasNuevaLectura();

    const archivo = await PortalFileService.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Solicitud portal no encontrada",
      });
    }

    const payload = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "estado")) {
      const estado = limpiarTexto(req.body.estado).toUpperCase();

      if (!ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({
          error: "Estado portal no valido",
        });
      }

      if (["MOD_LISTO", "CORREGIDO", "ENTREGADO"].includes(estado) && !archivo.archivo_modificado) {
        return res.status(400).json({
          error: "Debes subir un MOD antes de marcar este estado",
        });
      }

      payload.estado = estado;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "observaciones_internas")) {
      payload.observaciones_internas = limpiarTexto(req.body.observaciones_internas);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "creditos_requeridos")) {
      payload.creditos_requeridos = normalizarMonto(req.body.creditos_requeridos, 1);
    }

    await archivo.update(payload);

    res.json({
      mensaje: "Solicitud portal actualizada",
      archivo: mapearFileAdmin(archivo),
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO FILE PORTAL ADMIN:", error);
    responderError(res, error);
  }
};

const solicitarNuevaLecturaAdmin = async (req, res) => {
  try {
    await prepararColumnasNuevaLectura();

    const archivo = await PortalFileService.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Solicitud portal no encontrada",
      });
    }

    const motivo = limpiarTexto(req.body.motivo_tecnico || req.body.motivo);
    const instrucciones = limpiarTexto(
      req.body.instrucciones_nueva_lectura || req.body.instrucciones
    );

    if (!motivo || !instrucciones) {
      return res.status(400).json({
        error: "Motivo tecnico e instrucciones de nueva lectura son obligatorios",
      });
    }

    const ahora = new Date();
    const solicitadoPor = usuarioInternoActual(req);
    const historial = normalizarHistorialNuevaLectura(
      archivo.nueva_lectura_historial
    );
    const evento = {
      tipo: "NUEVA_LECTURA_SOLICITADA",
      motivo,
      instrucciones,
      solicitado_por: solicitadoPor,
      fecha: ahora.toISOString(),
      archivo_original_actual: archivo.archivo_original || null,
      nombre_original_actual: archivo.nombre_original || null,
    };

    await archivo.update({
      estado: "REQUIERE_NUEVA_LECTURA",
      requiere_nueva_lectura: true,
      nueva_lectura_motivo: motivo,
      nueva_lectura_instrucciones: instrucciones,
      nueva_lectura_solicitada_at: ahora,
      nueva_lectura_solicitada_por: solicitadoPor,
      nueva_lectura_historial: [evento, ...historial],
    });

    await registrarEventoPortal({
      req,
      cuentaId: archivo.cuentaId,
      usuarioId: archivo.usuarioId,
      tipo: "FILE_NUEVA_LECTURA_SOLICITADA",
      resultado: "OK",
      descripcion: "GMTCH solicito nueva lectura desde portal admin",
      metadata: {
        fileId: archivo.id,
        motivo,
        instrucciones,
      },
      creado_por: solicitadoPor,
    });

    res.json({
      mensaje: "Requerimiento enviado al portal del master/slave.",
      archivo: mapearFileAdmin(archivo),
    });
  } catch (error) {
    console.error("ERROR SOLICITANDO NUEVA LECTURA PORTAL ADMIN:", error);
    responderError(res, error);
  }
};

const subirModAdmin = async (req, res) => {
  try {
    await prepararColumnasNuevaLectura();

    if (!req.file) {
      return res.status(400).json({
        error: "Debes adjuntar el MOD",
      });
    }

    const archivo = await PortalFileService.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Solicitud portal no encontrada",
      });
    }

    await archivo.update({
      archivo_modificado: req.file.path,
      nombre_modificado: req.file.originalname || req.file.filename,
      estado: "MOD_LISTO",
      fecha_mod_listo: new Date(),
      correccion_solicitada: false,
    });

    await registrarEventoPortal({
      req,
      cuentaId: archivo.cuentaId,
      usuarioId: archivo.usuarioId,
      tipo: "FILE_MOD_SUBIDO_ADMIN",
      resultado: "OK",
      descripcion: "MOD subido por admin portal",
      metadata: {
        fileId: archivo.id,
        nombre_modificado: archivo.nombre_modificado,
      },
      creado_por: usuarioInternoActual(req),
    });

    res.json({
      mensaje: "MOD cargado correctamente",
      archivo: mapearFileAdmin(archivo),
    });
  } catch (error) {
    console.error("ERROR SUBIENDO MOD PORTAL ADMIN:", error);
    responderError(res, error);
  }
};

const cargarCreditos = async (req, res) => {
  try {
    const monto = normalizarMonto(req.body.monto, 0);

    if (monto <= 0) {
      return res.status(400).json({
        error: "El monto de creditos debe ser mayor a 0",
      });
    }

    const resultado = await sequelize.transaction(async (transaction) => {
      const cuenta = await PortalCuenta.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!cuenta) {
        throw Object.assign(new Error("Cuenta portal no encontrada"), {
          status: 404,
        });
      }

      const saldoAnterior = normalizarMonto(cuenta.saldo_creditos, 0);
      const saldoNuevo = normalizarMonto(saldoAnterior + monto, 0);

      await cuenta.update(
        {
          saldo_creditos: saldoNuevo,
        },
        { transaction }
      );

      const movimiento = await PortalCreditoMovimiento.create(
        {
          cuentaId: cuenta.id,
          tipo: "CARGA_MANUAL",
          monto,
          saldo_anterior: saldoAnterior,
          saldo_nuevo: saldoNuevo,
          referencia: limpiarTexto(req.body.referencia),
          creado_por: usuarioInternoActual(req),
          observacion: limpiarTexto(req.body.observacion),
        },
        { transaction }
      );

      return { cuenta, movimiento };
    });

    res.json({
      mensaje: "Creditos cargados correctamente",
      cuenta: mapearCuentaAdmin(resultado.cuenta),
      movimiento: resultado.movimiento,
    });

    await registrarEventoPortal({
      req,
      cuentaId: resultado.cuenta.id,
      tipo: "CREDITOS_CARGADOS",
      resultado: "OK",
      descripcion: "Creditos cargados manualmente por admin",
      metadata: {
        monto,
        saldo_nuevo: resultado.cuenta.saldo_creditos,
        referencia: limpiarTexto(req.body.referencia),
      },
      creado_por: usuarioInternoActual(req),
    });
  } catch (error) {
    console.error("ERROR CARGANDO CREDITOS PORTAL:", error);
    responderError(res, error);
  }
};

const listarMovimientosCuenta = async (req, res) => {
  try {
    const cuenta = await PortalCuenta.findByPk(req.params.id);

    if (!cuenta) {
      return res.status(404).json({
        error: "Cuenta portal no encontrada",
      });
    }

    const movimientos = await PortalCreditoMovimiento.findAll({
      where: {
        cuentaId: cuenta.id,
      },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      cuenta: mapearCuentaAdmin(cuenta),
      movimientos,
    });
  } catch (error) {
    console.error("ERROR LISTANDO MOVIMIENTOS PORTAL:", error);
    responderError(res, error);
  }
};

const listarAuditoria = async (req, res) => {
  try {
    const eventos = await buscarEventosAuditoria({
      cuentaId: req.query.cuentaId,
      usuarioId: req.query.usuarioId,
      tipo: req.query.tipo,
      limit: req.query.limit,
    });

    res.json(eventos.map(mapearEventoAuditoria));
  } catch (error) {
    console.error("ERROR LISTANDO AUDITORIA PORTAL:", error);
    responderError(res, error);
  }
};

const listarAuditoriaUsuario = async (req, res) => {
  try {
    const usuario = await PortalUsuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({ error: "Usuario portal no encontrado" });
    }

    const eventos = await buscarEventosAuditoria({
      usuarioId: usuario.id,
      limit: req.query.limit,
    });

    res.json(eventos.map(mapearEventoAuditoria));
  } catch (error) {
    console.error("ERROR AUDITORIA USUARIO PORTAL:", error);
    responderError(res, error);
  }
};

const listarAuditoriaCuenta = async (req, res) => {
  try {
    const cuenta = await PortalCuenta.findByPk(req.params.id);

    if (!cuenta) {
      return res.status(404).json({ error: "Cuenta portal no encontrada" });
    }

    const eventos = await buscarEventosAuditoria({
      cuentaId: cuenta.id,
      limit: req.query.limit,
    });

    res.json(eventos.map(mapearEventoAuditoria));
  } catch (error) {
    console.error("ERROR AUDITORIA CUENTA PORTAL:", error);
    responderError(res, error);
  }
};

module.exports = {
  crearCuenta,
  listarCuentas,
  editarCuenta,
  crearUsuarioCuenta,
  editarUsuarioPortal,
  resetPasswordUsuario,
  actualizarEstadoCuenta,
  actualizarEstadoUsuario,
  eliminarCuentaPrueba,
  listarFilesAdmin,
  obtenerFileAdmin,
  descargarOriginalAdmin,
  descargarNuevaLecturaAdmin,
  actualizarFileAdmin,
  solicitarNuevaLecturaAdmin,
  subirModAdmin,
  cargarCreditos,
  listarMovimientosCuenta,
  listarAuditoria,
  listarAuditoriaUsuario,
  listarAuditoriaCuenta,
};
