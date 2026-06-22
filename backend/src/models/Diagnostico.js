const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Diagnostico = sequelize.define(
  "Diagnostico",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    ordenId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "ordenes_trabajo",
        key: "id",
      },
    },

    fase: {
      type: DataTypes.STRING(40),
      allowNull: true,
      defaultValue: "PRE_FILE_SERVICE",
    },

    fallas_detectadas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    codigos_dtc: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    sin_dtc: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },

    informe_scanner: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    foto_scanner: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "diagnosticos",
    timestamps: true,
  }
);

module.exports = Diagnostico;