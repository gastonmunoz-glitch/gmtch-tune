const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const TarifaServicio = sequelize.define(
  "TarifaServicio",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    servicio: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    categoria: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "OTRO",
    },
    precio_desde: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    precio_minimo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    precio_referencia: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    moneda: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "CLP",
    },
    requiere_evaluacion: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    requiere_diagnostico: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notas_internas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "tarifas_servicios",
    timestamps: true,
  }
);

module.exports = TarifaServicio;
