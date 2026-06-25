const jwt = require("jsonwebtoken");
const { PortalUsuario, PortalCuenta } = require("../models");

const PORTAL_JWT_SECRET =
  process.env.PORTAL_JWT_SECRET || process.env.JWT_SECRET || "gmtch_secret_2026";

const autenticarPortal = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        error: "Token portal no enviado",
      });
    }

    const decoded = jwt.verify(token, PORTAL_JWT_SECRET);

    if (decoded.scope !== "portal") {
      return res.status(403).json({
        error: "Token no autorizado para portal externo",
      });
    }

    const usuario = await PortalUsuario.findByPk(decoded.portalUsuarioId, {
      attributes: [
        "id",
        "cuentaId",
        "nombre",
        "email",
        "activo",
        "aprobado",
        "last_login_at",
        "last_seen_at",
      ],
    });

    if (!usuario) {
      return res.status(401).json({
        error: "Usuario portal no encontrado",
      });
    }

    if (!usuario.activo || !usuario.aprobado) {
      return res.status(403).json({
        error: "Usuario portal sin acceso activo",
      });
    }

    const cuenta = await PortalCuenta.findByPk(usuario.cuentaId);

    if (!cuenta) {
      return res.status(401).json({
        error: "Cuenta portal no encontrada",
      });
    }

    if (!cuenta.activo || !cuenta.aprobado) {
      return res.status(403).json({
        error: "Cuenta portal sin acceso activo",
      });
    }

    req.portal = {
      usuario,
      cuenta,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Token portal invalido o expirado",
    });
  }
};

module.exports = {
  PORTAL_JWT_SECRET,
  autenticarPortal,
};
