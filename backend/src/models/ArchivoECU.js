const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ArchivoECU = sequelize.define(
  "ArchivoECU",
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

    ordenId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    estado: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: "ORIGINAL_CARGADO",
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

    tipo_servicio: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    diagnosticoId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    dtc_snapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },

    dtc_resumen: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    dtc_importado_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    dtc_importado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    servicios_solicitados: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },

    servicios_preset: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    servicio_principal: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    observacion_servicios: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    metodo_lectura: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    herramienta_lectura: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    archivo_original: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    archivo_original_subido_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    archivo_original_subido_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    archivo_modificado: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    versiones_modificadas: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },

    ultima_version_modificada: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    marca_ecu: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    modelo_ecu: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    hw: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    sw: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    version_software: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    notas_operador: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    instrucciones_tuner: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    procesamiento_externo_estado: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },

    procesamiento_externo_herramienta: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    procesamiento_externo_responsable: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    procesamiento_externo_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    procesamiento_externo_observacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    procesamiento_externo_archivo_resultado: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    procesamiento_externo_archivos: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },

    tuner_asignado_a: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    tuner_asignado_a_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    operador_ecu_asignado_a: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    operador_ecu_asignado_a_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    slave_asignado_a: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    slave_asignado_a_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    notificado_master_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    notificado_master_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    notificado_slave_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    notificado_slave_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    correccion_pendiente: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    dtc_post_escritura: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    observacion_correccion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    post_escritura_estado: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },

    post_escritura_dtc: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    post_escritura_sin_dtc: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    post_escritura_scanner: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    post_escritura_observacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    post_escritura_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    post_escritura_por_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    post_escritura_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    mod_descargado_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    proceso_guard_estado: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: "SIN_RIESGO",
    },

    proceso_guard_started_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    proceso_guard_last_alert_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    proceso_guard_escalado_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    proceso_guard_responsable_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    cierre_tecnico_obligatorio: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    cierre_tecnico_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    cierre_tecnico_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    cierre_tecnico_por_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    resultado_tecnico: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: "PENDIENTE",
    },

    observacion_cierre_tecnico: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    archivado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    archivado_motivo: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    archivado_comentario: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    archivado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    archivado_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "archivos_ecu",
    timestamps: true,
  }
);

module.exports = ArchivoECU;
