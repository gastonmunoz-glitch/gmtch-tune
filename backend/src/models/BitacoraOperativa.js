const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const BitacoraOperativa = sequelize.define(
  "BitacoraOperativa",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    tipo: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "OPERACION",
    },

    prioridad: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "MEDIA",
    },

    titulo: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    modulo_relacionado: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    ordenId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    vehiculoId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    archivoEcuId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    creado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    resuelto: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    resuelto_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    resuelto_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "bitacora_operativa",
    timestamps: true,
  }
);

module.exports = BitacoraOperativa;
