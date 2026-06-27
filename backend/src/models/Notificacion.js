const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Notificacion = sequelize.define(
  "Notificacion",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    usuarioDestino: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    rolDestino: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    tipo: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },

    titulo: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },

    mensaje: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    ordenId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    archivoECUId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    accion_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    accion_tipo: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    entidad_tipo: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    entidad_id: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },

    recordatorio_de_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    recordatorio_nivel: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    leida: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    leida_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "notificaciones",
    timestamps: true,
  }
);

module.exports = Notificacion;
