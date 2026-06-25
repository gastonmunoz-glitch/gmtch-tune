const Usuario = require("../models/Usuario");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prepararColumnasPresencia } = require("./usuarioController");

const JWT_SECRET = process.env.JWT_SECRET || "gmtch_secret_2026";

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await Usuario.findOne({
      where: { username },
      attributes: ["id", "nombre", "username", "password", "rol", "activo"],
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
    });
  } catch (error) {
    console.error("ERROR LOGIN:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const me = async (req, res) => {
  try {
    res.json({
      id: req.usuario.id,
      nombre: req.usuario.nombre,
      username: req.usuario.username,
      rol: req.usuario.rol,
      activo: req.usuario.activo,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  login,
  me,
};
