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

    feedback_operario: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    detalle_pendiente: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    recomendacion_futura: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    requiere_seguimiento: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    feedback_por: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    feedback_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    correccion_estado: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },

    correccion_prioridad: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    correccion_motivo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    correccion_descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    correccion_dtc: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    correccion_sintoma_cliente: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    correccion_archivo_ecu_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    correccion_responsable_sugerido: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    correccion_comentario_tecnico: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    correccion_cliente_volvio: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    correccion_creada_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    correccion_creada_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    correccion_actualizada_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    correccion_actualizada_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    correccion_historial: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },

    bitacora_operativa: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    tableName: "ordenes_trabajo",
    timestamps: true,
  }
);

module.exports = OrdenTrabajo;
