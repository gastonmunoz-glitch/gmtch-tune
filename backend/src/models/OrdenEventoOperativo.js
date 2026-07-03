const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const OrdenEventoOperativo = sequelize.define(
  "OrdenEventoOperativo",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    ordenId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    tipo_evento: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    categoria: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    titulo: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    estado_anterior: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    estado_nuevo: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    usuario: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    usuario_rol: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    origen: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: "orden_eventos_operativos",
    timestamps: true,
  }
);

module.exports = OrdenEventoOperativo;
