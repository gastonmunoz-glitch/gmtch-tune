const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const sequelize = require("../config/database");

const PortalUsuario = sequelize.define(
  "PortalUsuario",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    cuentaId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    nombre: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING(160),
      allowNull: false,
      unique: true,
    },

    username: {
      type: DataTypes.STRING(120),
      allowNull: true,
      unique: true,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    aprobado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    last_seen_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "portal_usuarios",
    timestamps: true,
  }
);

const pareceHashBcrypt = (valor) =>
  typeof valor === "string" && /^\$2[aby]\$\d{2}\$/.test(valor);

const normalizarEmail = (usuario) => {
  if (usuario.email) {
    usuario.email = String(usuario.email).trim().toLowerCase();
  }

  if (usuario.username) {
    usuario.username = String(usuario.username).trim().toLowerCase();
  } else if (usuario.username === "") {
    usuario.username = null;
  }
};

const hashPassword = async (usuario) => {
  if (usuario.password && !pareceHashBcrypt(usuario.password)) {
    usuario.password = await bcrypt.hash(usuario.password, 10);
  }
};

PortalUsuario.beforeValidate(normalizarEmail);
PortalUsuario.beforeCreate(hashPassword);
PortalUsuario.beforeUpdate(async (usuario) => {
  if (usuario.changed("email")) {
    normalizarEmail(usuario);
  }

  if (usuario.changed("username")) {
    normalizarEmail(usuario);
  }

  if (usuario.changed("password")) {
    await hashPassword(usuario);
  }
});

PortalUsuario.pareceHashBcrypt = pareceHashBcrypt;

module.exports = PortalUsuario;
