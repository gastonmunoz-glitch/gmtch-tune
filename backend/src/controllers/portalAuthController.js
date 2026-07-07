const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { PortalUsuario, PortalCuenta, PortalAuditoriaEvento } = require("../models");
const { PORTAL_JWT_SECRET } = require("../middleware/portalAuthMiddleware");

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

let columnasPortalUsuarioPreparadas = false;

const prepararColumnasPortalUsuario = async () => {
  if (columnasPortalUsuarioPreparadas) return;

  await PortalUsuario.sequelize.query(`
    ALTER TABLE portal_usuarios
    ADD COLUMN IF NOT EXISTS username VARCHAR(120);
  `);

  await PortalUsuario.sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS portal_usuarios_username_lower_unique
    ON portal_usuarios (LOWER(username))
    WHERE username IS NOT NULL AND username <> '';
  `);

  columnasPortalUsuarioPreparadas = true;
};

const mensajeErrorServidor = (error) =>
  process.env.NODE_ENV === "production"
    ? "Error interno del servidor"
    : error.message || "Error interno del servidor";

const sanitizarMetadata = (metadata = {}) => {
  const copia = { ...metadata };
  delete copia.password;
  delete copia.token;
  delete copia.portalToken;
  delete copia.authorization;
  return copia;
};

const registrarEventoPortal = async ({
  req,
  cuentaId = null,
  usuarioId = null,
  tipo,
  resultado = "INFO",
  descripcion = "",
  metadata = null,
  creado_por = null,
}) => {
  try {
    await PortalAuditoriaEvento.create({
      cuentaId,
      usuarioId,
      tipo,
      resultado,
      descripcion,
      metadata: metadata ? sanitizarMetadata(metadata) : null,
      ip: req?.ip || req?.headers?.["x-forwarded-for"] || null,
      user_agent: req?.headers?.["user-agent"] || null,
      creado_por,
    });
  } catch (error) {
    console.warn("AUDITORIA PORTAL NO REGISTRADA:", error.message);
  }
};

const tipoIdentificador = (identificador) =>
  String(identificador || "").includes("@") ? "email" : "username";

const logDebugLoginPortal = ({ identificador, usuario = null, cuenta = null, causa }) => {
  console.warn("PORTAL_LOGIN_DEBUG", {
    identificador_tipo: tipoIdentificador(identificador),
    usuario_encontrado: Boolean(usuario),
    cuenta_encontrada: Boolean(cuenta),
    usuario_activo: usuario ? Boolean(usuario.activo && usuario.aprobado) : null,
    cuenta_activa: cuenta ? Boolean(cuenta.activo && cuenta.aprobado) : null,
    causa,
  });
};

const contarFallosRecientes = async (identificador) => {
  if (!identificador) return 0;

  try {
    const desde = new Date(Date.now() - 15 * 60 * 1000);
    return await PortalAuditoriaEvento.count({
      where: {
        tipo: "LOGIN_FALLIDO",
        resultado: "ERROR",
        createdAt: {
          [Op.gte]: desde,
        },
        metadata: {
          [Op.contains]: {
            email: identificador,
          },
        },
      },
    });
  } catch (error) {
    console.warn("NO SE PUDO CONTAR LOGIN_FALLIDO:", error.message);
    return 0;
  }
};

const registrarLoginFallido = async (req, causa, identificador, usuario = null, cuenta = null) => {
  console.warn("LOGIN PORTAL FALLIDO:", {
    causa,
    identificador_tipo: tipoIdentificador(identificador),
    usuarioId: usuario?.id || null,
    cuentaId: cuenta?.id || usuario?.cuentaId || null,
  });

  await registrarEventoPortal({
    req,
    cuentaId: cuenta?.id || usuario?.cuentaId || null,
    usuarioId: usuario?.id || null,
    tipo: "LOGIN_FALLIDO",
    resultado: "ERROR",
    descripcion: causa,
    metadata: {
      email: identificador,
      identificador,
      identificador_tipo: tipoIdentificador(identificador),
      causa,
    },
  });

  const fallos = await contarFallosRecientes(identificador);

  if (fallos >= 5) {
    await registrarEventoPortal({
      req,
      cuentaId: cuenta?.id || usuario?.cuentaId || null,
      usuarioId: usuario?.id || null,
      tipo: "INTENTO_SOSPECHOSO",
      resultado: "ALERTA",
      descripcion: "Multiples intentos fallidos de login portal",
      metadata: {
        email: identificador,
        identificador,
        identificador_tipo: tipoIdentificador(identificador),
        fallos_15_min: fallos,
      },
    });
  }
};

const mapearCuenta = (cuenta) => ({
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
});

const mapearUsuario = (usuario) => ({
  id: usuario.id,
  cuentaId: usuario.cuentaId,
  nombre: usuario.nombre,
  email: usuario.email,
  username: usuario.username || null,
  activo: usuario.activo,
  aprobado: usuario.aprobado,
  last_login_at: usuario.last_login_at,
  last_seen_at: usuario.last_seen_at,
});

const loginPortal = async (req, res) => {
  try {
    await prepararColumnasPortalUsuario();

    const identificador = limpiarTexto(
      req.body.identificador || req.body.email
    ).toLowerCase();
    const password = limpiarTexto(req.body.password);

    if (!identificador || !password) {
      return res.status(400).json({
        error: "Email o usuario y password son obligatorios",
      });
    }

    const usuario = await PortalUsuario.findOne({
      where: {
        [Op.or]: [{ email: identificador }, { username: identificador }],
      },
    });

    if (!usuario) {
      logDebugLoginPortal({
        identificador,
        causa: "usuario_no_existe",
      });
      await registrarLoginFallido(req, "usuario_no_existe", identificador);
      return res.status(401).json({
        error: "Credenciales inválidas",
      });
    }

    if (!usuario.activo || !usuario.aprobado) {
      logDebugLoginPortal({
        identificador,
        usuario,
        causa: "usuario_inactivo",
      });
      await registrarLoginFallido(
        req,
        "usuario_inactivo",
        identificador,
        usuario
      );
      return res.status(403).json({
        error: "El usuario está inactivo",
      });
    }

    const cuenta = await PortalCuenta.findByPk(usuario.cuentaId);

    if (!cuenta || !cuenta.activo || !cuenta.aprobado) {
      logDebugLoginPortal({
        identificador,
        usuario,
        cuenta,
        causa: "cuenta_inactiva",
      });
      await registrarLoginFallido(
        req,
        "cuenta_inactiva",
        identificador,
        usuario,
        cuenta
      );
      return res.status(403).json({
        error: "La cuenta Master está inactiva",
      });
    }

    let isMatch = await bcrypt.compare(password, usuario.password);

    if (!isMatch && !PortalUsuario.pareceHashBcrypt(usuario.password)) {
      isMatch = password === usuario.password;

      if (isMatch) {
        console.warn("LOGIN PORTAL MIGRO PASSWORD PLANO A HASH:", {
          usuarioId: usuario.id,
          cuentaId: cuenta.id,
          email: usuario.email,
        });
        const passwordHash = await bcrypt.hash(password, 10);
        await usuario.update({ password: passwordHash });
      }
    }

    if (!isMatch) {
      logDebugLoginPortal({
        identificador,
        usuario,
        cuenta,
        causa: "password_invalida",
      });
      await registrarLoginFallido(req, "password_invalida", identificador, usuario, cuenta);
      return res.status(401).json({
        error: "Credenciales inválidas",
      });
    }

    const ahora = new Date();

    await usuario.update({
      last_login_at: ahora,
      last_seen_at: ahora,
    });

    await registrarEventoPortal({
      req,
      cuentaId: cuenta.id,
      usuarioId: usuario.id,
      tipo: "LOGIN_OK",
      resultado: "OK",
      descripcion: "Login portal correcto",
      metadata: { email: usuario.email, username: usuario.username || null },
      creado_por: usuario.email,
    });

    const portalToken = jwt.sign(
      {
        scope: "portal",
        portalUsuarioId: usuario.id,
        cuentaId: cuenta.id,
        email: usuario.email,
        username: usuario.username || null,
      },
      PORTAL_JWT_SECRET,
      {
        expiresIn: "12h",
      }
    );

    res.json({
      portalToken,
      usuario: mapearUsuario(usuario),
      cuenta: mapearCuenta(cuenta),
    });
  } catch (error) {
    console.error("ERROR LOGIN PORTAL:", error);

    res.status(500).json({
      error: mensajeErrorServidor(error),
    });
  }
};

const mePortal = async (req, res) => {
  try {
    await req.portal.usuario.update({
      last_seen_at: new Date(),
    });

    await registrarEventoPortal({
      req,
      cuentaId: req.portal.cuenta.id,
      usuarioId: req.portal.usuario.id,
      tipo: "PRESENCIA",
      resultado: "OK",
      descripcion: "Actividad portal externa",
      creado_por: req.portal.usuario.email,
    });

    res.json({
      usuario: mapearUsuario(req.portal.usuario),
      cuenta: mapearCuenta(req.portal.cuenta),
    });
  } catch (error) {
    res.status(500).json({
      error: mensajeErrorServidor(error),
    });
  }
};

module.exports = {
  loginPortal,
  mePortal,
  registrarEventoPortal,
};
