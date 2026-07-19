const { Usuario, EmpresaCuenta } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prepararColumnasPresencia } = require("./usuarioController");
const {
  asegurarEmpresaPrincipalGmtch,
} = require("../services/empresaCuentaService");

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV !== "production" ? "gmtch_dev_jwt_secret_local" : "");

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET es obligatorio en produccion.");
}

const mensajeErrorServidor = (error) =>
  process.env.NODE_ENV === "production"
    ? "Error interno del servidor"
    : error.message || "Error interno del servidor";

const EMPRESA_ATTRIBUTES = ["id", "nombre", "slug", "plan", "estado"];

const crearErrorEmpresaNoDisponible = () => {
  const error = new Error("La empresa asociada al usuario no está disponible.");
  error.code = "EMPRESA_NO_DISPONIBLE";
  return error;
};

const asociarEmpresaCargada = (usuario, empresa) => {
  if (!usuario || !empresa) return;

  usuario.setDataValue("Empresa", empresa);
  usuario.Empresa = empresa;
};

const resolverEmpresaUsuario = async (usuario) => {
  let empresa = usuario.Empresa || usuario.get?.("Empresa") || null;

  if (!usuario.empresaId) {
    empresa = await asegurarEmpresaPrincipalGmtch();
    usuario.empresaId = empresa.id;
    await usuario.save({ fields: ["empresaId"] });
    asociarEmpresaCargada(usuario, empresa);
  } else if (!empresa) {
    empresa = await EmpresaCuenta.findByPk(usuario.empresaId, {
      attributes: EMPRESA_ATTRIBUTES,
    });

    asociarEmpresaCargada(usuario, empresa);
  }

  if (!empresa) {
    throw crearErrorEmpresaNoDisponible();
  }

  return empresa;
};

const serializarEmpresa = (empresa) => {
  if (!empresa) return null;

  return {
    id: empresa.id,
    nombre: empresa.nombre,
    slug: empresa.slug,
    plan: empresa.plan,
    estado: empresa.estado,
  };
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await Usuario.findOne({
      where: { username },
      attributes: [
        "id",
        "nombre",
        "username",
        "password",
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

    if (!user) {
      return res.status(401).json({
        error: "Credenciales inválidas",
      });
    }

    if (!user.activo) {
      return res.status(403).json({
        error: "Usuario desactivado",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        error: "Credenciales inválidas",
      });
    }

    const empresa = await resolverEmpresaUsuario(user);

    try {
      const ahora = new Date();

      await prepararColumnasPresencia();
      await Usuario.update(
        {
          last_login_at: ahora,
          last_seen_at: ahora,
          login_count: Usuario.sequelize.literal('COALESCE("login_count", 0) + 1'),
        },
        {
          where: {
            id: user.id,
          },
        }
      );
    } catch (presenciaError) {
      console.warn(
        "WARN PRESENCIA LOGIN:",
        presenciaError.message || presenciaError
      );
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        rol: user.rol,
        empresaId: user.empresaId,
        empresaSlug: empresa?.slug || null,
        empresaNombre: empresa?.nombre || null,
      },
      JWT_SECRET,
      {
        expiresIn: "12h",
      }
    );

    res.json({
      token,
      id: user.id,
      nombre: user.nombre,
      username: user.username,
      rol: user.rol,
      activo: user.activo,
      empresa: serializarEmpresa(empresa),
    });
  } catch (error) {
    console.error("ERROR LOGIN:", error);

    if (error.code === "EMPRESA_NO_DISPONIBLE") {
      return res.status(503).json({
        error: error.code,
        message: error.message,
      });
    }

    res.status(500).json({ error: mensajeErrorServidor(error) });
  }
};

const me = async (req, res) => {
  try {
    const empresa = await resolverEmpresaUsuario(req.usuario);

    res.json({
      id: req.usuario.id,
      nombre: req.usuario.nombre,
      username: req.usuario.username,
      rol: req.usuario.rol,
      activo: req.usuario.activo,
      empresa: serializarEmpresa(empresa),
    });
  } catch (error) {
    if (error.code === "EMPRESA_NO_DISPONIBLE") {
      return res.status(503).json({
        error: error.code,
        message: error.message,
      });
    }

    res.status(500).json({ error: mensajeErrorServidor(error) });
  }
};

module.exports = {
  login,
  me,
};
