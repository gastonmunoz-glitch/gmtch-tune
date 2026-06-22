const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const bcrypt = require("bcryptjs");

const Usuario = sequelize.define(
  "Usuario",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },

    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    rol: {
      type: DataTypes.ENUM("ADMIN", "TALLER"),
      defaultValue: "TALLER",
    },
  },
  {
    tableName: "Usuarios",
  }
);

// Encriptar clave antes de crear usuario
Usuario.beforeCreate(async (user) => {
  if (
    user.password &&
    !user.password.startsWith("$2a$") &&
    !user.password.startsWith("$2b$")
  ) {
    user.password = await bcrypt.hash(user.password, 10);
  }
});

// Encriptar clave si se actualiza
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