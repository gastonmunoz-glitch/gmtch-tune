const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const bcrypt = require("bcryptjs");

const Usuario = sequelize.define("Usuario", {
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true, // Temporal para que Railway pueda agregar la columna sin romper tablas antiguas
  },

  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  rol: {
    type: DataTypes.ENUM("ADMIN", "TALLER"),
    defaultValue: "TALLER",
  },
});

// Encriptar clave antes de crear usuario
Usuario.beforeCreate(async (user) => {
  if (user.password && !user.password.startsWith("$2a$") && !user.password.startsWith("$2b$")) {
    user.password = await bcrypt.hash(user.password, 10);
  }
});

// Encriptar clave si se actualiza
Usuario.beforeUpdate(async (user) => {
  if (user.changed("password")) {
    if (user.password && !user.password.startsWith("$2a$") && !user.password.startsWith("$2b$")) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  }
});

module.exports = Usuario;