const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const OrdenTrabajo = sequelize.define(
  "OrdenTrabajo",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    vehiculoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    prioridad: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "MEDIA",
    },

    estado: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "RECEPCIONADO",
    },

    estado_pago: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "PENDIENTE",
    },

    medio_pago: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "PENDIENTE",
    },

    monto_pagado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },

    fecha_pago: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    cobrado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    observacion_pago: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    kilometraje: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    motivo_ingreso: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    monto_total: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    excluir_estadisticas: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "ordenes_trabajo",
    timestamps: true,
  }
);

module.exports = OrdenTrabajo;
