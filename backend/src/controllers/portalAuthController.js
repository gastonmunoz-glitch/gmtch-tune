const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { PortalUsuario, PortalCuenta, PortalAuditoriaEvento } = require("../models");
const { PORTAL_JWT_SECRET } = require("../middleware/portalAuthMiddleware");

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

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

const contarFallosRecientes = async (email) => {
  if (!email) return 0;

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
          email,
        },
      },
    });
  } catch (error) {
    console.warn("NO SE PUDO CONTAR LOGIN_FALLIDO:", error.message);
    return 0;
  }
};

const registrarLoginFallido = async (req, causa, email, usuario = null, cuenta = null) => {
  console.warn("LOGIN PORTAL FALLIDO:", {
    causa,
    email,
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
    metadata: { email, causa },
  });

  const fallos = await contarFallosRecientes(email);

  if (fallos >= 5) {
    await registrarEventoPortal({
      req,
      cuentaId: cuenta?.id || usuario?.cuentaId || null,
      usuarioId: usuario?.id || null,
      tipo: "INTENTO_SOSPECHOSO",
      resultado: "ALERTA",
      descripcion: "Multiples intentos fallidos de login portal",
      metadata: { email, fallos_15_min: fallos },
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
  activo: usuario.activo,
  aprobado: usuario.aprobado,
  last_login_at: usuario.last_login_at,
  last_seen_at: usuario.last_seen_at,
});

const loginPortal = async (req, res) => {
  try {
    const email = limpiarTexto(req.body.email).toLowerCase();
    const password = limpiarTexto(req.body.password);

    if (!email || !password) {
      return res.status(400).json({
        error: "Email y password son obligatorios",
      });
    }

    const usuario = await PortalUsuario.findOne({
      where: { email },
    });

    if (!usuario) {
      await registrarLoginFallido(req, "email_no_existe", email);
      return res.status(401).json({
        error: "Credenciales portal invalidas",
      });
    }

    if (!usuario.activo || !usuario.aprobado) {
      await registrarLoginFallido(req, "usuario_inactivo_o_no_aprobado", email, usuario);
      return res.status(403).json({
        error: "Acceso portal no autorizado",
      });
    }

    const cuenta = await PortalCuenta.findByPk(usuario.cuentaId);

    if (!cuenta || !cuenta.activo || !cuenta.aprobado) {
      await registrarLoginFallido(req, "cuenta_inactiva_o_no_aprobada", email, usuario, cuenta);
      return res.status(403).json({
        error: "Acceso portal no autorizado",
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
      await registrarLoginFallido(req, "password_invalida", email, usuario, cuenta);
      return res.status(401).json({
        error: "Credenciales portal invalidas",
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
      metadata: { email: usuario.email },
      creado_por: usuario.email,
    });

    const portalToken = jwt.sign(
      {
        scope: "portal",
        portalUsuarioId: usuario.id,
        cuentaId: cuenta.id,
        email: usuario.email,
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
      error: error.message,
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
      error: error.message,
    });
  }
};

module.exports = {
  loginPortal,
  mePortal,
  registrarEventoPortal,
};
