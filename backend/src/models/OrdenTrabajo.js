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

    empresaId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "empresa_cuentas",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
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

    creado_en_modo_urgente: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    motivo_urgencia: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    requiere_regularizacion: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    regularizacion_pendientes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },

    regularizar_antes_de_entrega: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    urgente_creado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    urgente_creado_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    regularizado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    regularizado_at: {
      type: DataTypes.DATE,
      allowNull: true,
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

    recepcionado_por_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    recepcionado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    origen_recepcion: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    diagnostico_asignado_a_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    diagnostico_asignado_a: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    operador_ecu_asignado_a_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    operador_ecu_asignado_a: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    mecanico_asignado_a_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    mecanico_asignado_a: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    supervisor_asignado_a_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    supervisor_asignado_a: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    tecnico_finalizado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    tecnico_finalizado_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    cobrado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    cobrado_por_id: {
      type: DataTypes.UUID,
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

    monto_original: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    monto_final: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    motivo_ajuste: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    ajustado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    ajustado_por_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    ajustado_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    historial_ajustes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
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

    feedback_por_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    feedback_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    entregado_por_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    entregado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    entregado_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    observacion_cierre: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    archivada: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    archivada_motivo: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    archivada_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    archivada_at: {
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

    intervencion_fisica_tipo: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: "SIN_INTERVENCION",
    },

    intervencion_fisica_descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    intervencion_desmontaje_requerido: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    intervencion_vaciado_revision_realizada: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    intervencion_montaje_realizado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    intervencion_inspeccion_visual: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    intervencion_listo_programacion: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    intervencion_fisica_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    intervencion_fisica_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "ordenes_trabajo",
    timestamps: true,
  }
);

module.exports = OrdenTrabajo;
