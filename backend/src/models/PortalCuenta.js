const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PortalCuenta = sequelize.define(
  "PortalCuenta",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    nombre_taller: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },

    contacto: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    telefono: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },

    pais: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    ciudad: {
      type: DataTypes.STRING(100),
      allowNull: true,
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

    saldo_creditos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "portal_cuentas",
    timestamps: true,
  }
);

module.exports = PortalCuenta;
