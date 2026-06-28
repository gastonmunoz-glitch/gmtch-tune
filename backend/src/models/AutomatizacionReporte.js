const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AutomatizacionReporte = sequelize.define(
  "AutomatizacionReporte",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    tipo: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },

    titulo: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },

    resumen: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    prioridad: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "MEDIA",
    },

    alertas: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },

    sugerencias: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },

    metricas: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },

    accion_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    generado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    origen: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: "AUTOMATIZACION",
    },
  },
  {
    tableName: "automatizacion_reportes",
    timestamps: true,
  }
);

module.exports = AutomatizacionReporte;
