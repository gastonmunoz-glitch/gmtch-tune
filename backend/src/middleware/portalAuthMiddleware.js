const jwt = require("jsonwebtoken");
const { PortalUsuario, PortalCuenta, PortalAuditoriaEvento } = require("../models");

const PORTAL_JWT_SECRET =
  process.env.PORTAL_JWT_SECRET || process.env.JWT_SECRET || "gmtch_secret_2026";

const registrarAccesoDenegado = async (req, descripcion, metadata = {}) => {
  try {
    await PortalAuditoriaEvento.create({
      tipo: "ACCESO_DENEGADO",
      resultado: "ERROR",
      descripcion,
      metadata,
      ip: req?.ip || req?.headers?.["x-forwarded-for"] || null,
      user_agent: req?.headers?.["user-agent"] || null,
    });
  } catch (error) {
    console.warn("AUDITORIA ACCESO DENEGADO NO REGISTRADA:", error.message);
  }
};

const autenticarPortal = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      await registrarAccesoDenegado(req, "Token portal no enviado");
      return res.status(401).json({
        error: "Token portal no enviado",
      });
    }

    const decoded = jwt.verify(token, PORTAL_JWT_SECRET);

    if (decoded.scope !== "portal") {
      await registrarAccesoDenegado(req, "Token sin scope portal", {
        scope: decoded.scope || null,
      });
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
      await registrarAccesoDenegado(req, "Usuario portal no encontrado", {
        portalUsuarioId: decoded.portalUsuarioId,
      });
      return res.status(401).json({
        error: "Usuario portal no encontrado",
      });
    }

    if (!usuario.activo || !usuario.aprobado) {
      await registrarAccesoDenegado(req, "Usuario portal sin acceso activo", {
        usuarioId: usuario.id,
        cuentaId: usuario.cuentaId,
      });
      return res.status(403).json({
        error: "Usuario portal sin acceso activo",
      });
    }

    const cuenta = await PortalCuenta.findByPk(usuario.cuentaId);

    if (!cuenta) {
      await registrarAccesoDenegado(req, "Cuenta portal no encontrada", {
        usuarioId: usuario.id,
        cuentaId: usuario.cuentaId,
      });
      return res.status(401).json({
        error: "Cuenta portal no encontrada",
      });
    }

    if (!cuenta.activo || !cuenta.aprobado) {
      await registrarAccesoDenegado(req, "Cuenta portal sin acceso activo", {
        usuarioId: usuario.id,
        cuentaId: cuenta.id,
      });
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
    await registrarAccesoDenegado(req, "Token portal invalido o expirado");
    return res.status(401).json({
      error: "Token portal invalido o expirado",
    });
  }
};

module.exports = {
  PORTAL_JWT_SECRET,
  autenticarPortal,
};
