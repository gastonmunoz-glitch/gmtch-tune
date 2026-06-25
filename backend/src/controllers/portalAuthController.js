const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PortalUsuario, PortalCuenta } = require("../models");
const { PORTAL_JWT_SECRET } = require("../middleware/portalAuthMiddleware");

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
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
      return res.status(401).json({
        error: "Credenciales portal invalidas",
      });
    }

    if (!usuario.activo || !usuario.aprobado) {
      return res.status(403).json({
        error: "Usuario portal sin acceso activo",
      });
    }

    const cuenta = await PortalCuenta.findByPk(usuario.cuentaId);

    if (!cuenta || !cuenta.activo || !cuenta.aprobado) {
      return res.status(403).json({
        error: "Cuenta portal sin acceso activo",
      });
    }

    const isMatch = await bcrypt.compare(password, usuario.password);

    if (!isMatch) {
      return res.status(401).json({
        error: "Credenciales portal invalidas",
      });
    }

    const ahora = new Date();

    await usuario.update({
      last_login_at: ahora,
      last_seen_at: ahora,
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
};
