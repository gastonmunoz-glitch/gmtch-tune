const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const EmpresaCuenta = sequelize.define(
  "EmpresaCuenta",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    razon_social: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    rut: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "ACTIVA",
      validate: {
        isIn: [["TRIAL", "ACTIVA", "SUSPENDIDA", "CANCELADA"]],
      },
    },

    plan: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "INTERNO",
      validate: {
        isIn: [["INTERNO", "STARTER", "PRO", "MASTER", "ENTERPRISE"]],
      },
    },

    timezone: {
      type: DataTypes.STRING,
      defaultValue: "America/Santiago",
    },

    moneda: {
      type: DataTypes.STRING,
      defaultValue: "CLP",
    },

    idioma: {
      type: DataTypes.STRING,
      defaultValue: "es",
    },

    branding: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },

    settings: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },

    storage_prefix: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "empresa_cuentas",
    timestamps: true,
  }
);

module.exports = EmpresaCuenta;
