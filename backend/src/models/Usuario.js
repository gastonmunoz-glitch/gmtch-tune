const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const bcrypt = require("bcryptjs");

const Usuario = sequelize.define(
  "Usuario",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    nombre: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    username: {
      type: DataTypes.STRING(80),
      unique: true,
      allowNull: false,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    rol: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "RECEPCION",
    },

    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "Usuarios",
  }
);

Usuario.beforeCreate(async (user) => {
  if (
    user.password &&
    !user.password.startsWith("$2a$") &&
    !user.password.startsWith("$2b$")
  ) {
    user.password = await bcrypt.hash(user.password, 10);
  }
});

Usuario.beforeUpdate(async (user) => {
  if (user.changed("password")) {
    if (
      user.password &&
      !user.password.startsWith("$2a$") &&
      !user.password.startsWith("$2b$")
    ) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  }
});

module.exports = Usuario;