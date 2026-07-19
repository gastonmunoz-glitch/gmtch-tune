const jwt = require("jsonwebtoken");
const { Usuario, EmpresaCuenta } = require("../models");
const {
  asegurarEmpresaPrincipalGmtch,
} = require("../services/empresaCuentaService");

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV !== "production" ? "gmtch_dev_jwt_secret_local" : "");

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET es obligatorio en produccion.");
}

const ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  SUPERVISOR: "SUPERVISOR",
  RECEPCION: "RECEPCION",
  OPERADOR_SCANNER: "OPERADOR_SCANNER",
  OPERADOR_ECU: "OPERADOR_ECU",
  MECANICO: "MECANICO",
  TUNER: "TUNER",
};

const EMPRESA_ATTRIBUTES = ["id", "nombre", "slug", "plan", "estado"];

const autenticar = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        error: "Token no enviado",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const usuarioId = decoded.usuarioId || decoded.id;

    const usuario = await Usuario.findByPk(usuarioId, {
      attributes: [
        "id",
        "nombre",
        "username",
        "rol",
        "activo",
        "empresaId",
      ],
      include: [
        {
          model: EmpresaCuenta,
          as: "Empresa",
          attributes: EMPRESA_ATTRIBUTES,
          required: false,
        },
      ],
    });

    if (!usuario) {
      return res.status(401).json({
        error: "Usuario no encontrado",
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        error: "Usuario desactivado",
      });
    }

    let empresa = usuario.Empresa || null;

    if (!usuario.empresaId) {
      empresa = await asegurarEmpresaPrincipalGmtch();
      usuario.empresaId = empresa.id;
      await usuario.save({ fields: ["empresaId"] });
      usuario.setDataValue("Empresa", empresa);
      usuario.Empresa = empresa;
    }

    if (!empresa) {
      return res.status(503).json({
        error: "EMPRESA_NO_DISPONIBLE",
        message: "La empresa asociada al usuario no está disponible.",
      });
    }

    req.auth = {
      usuarioId: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      empresaId: usuario.empresaId,
      empresaSlug: empresa?.slug || null,
      empresaNombre: empresa?.nombre || null,
      esSuperadmin: false,
    };

    req.usuario = usuario;
    req.user = usuario;

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Token inválido o expirado",
    });
  }
};

const permitirRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    const rol = req.usuario?.rol;

    if (!rol) {
      return res.status(401).json({
        error: "Usuario no autenticado",
      });
    }

    if (rol === ROLES.OWNER) {
      return next();
    }

    if (!rolesPermitidos.includes(rol)) {
      return res.status(403).json({
        error: "No tienes permiso para esta acción",
        rol,
      });
    }

    next();
  };
};

const permitirPorMetodo = (reglas) => {
  return (req, res, next) => {
    const metodo = req.method.toUpperCase();
    const rol = req.usuario?.rol;

    if (!rol) {
      return res.status(401).json({
        error: "Usuario no autenticado",
      });
    }

    if (rol === ROLES.OWNER) {
      return next();
    }

    const rolesPermitidos = reglas[metodo] || reglas.DEFAULT || [];

    if (!rolesPermitidos.includes(rol)) {
      return res.status(403).json({
        error: "No tienes permiso para esta acción",
        metodo,
        rol,
      });
    }

    next();
  };
};

module.exports = {
  ROLES,
  autenticar,
  permitirRoles,
  permitirPorMetodo,
};
