const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const LeadComercial = sequelize.define(
  "LeadComercial",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    nombre: {
      type: DataTypes.STRING(140),
      allowNull: false,
    },

    telefono: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(140),
      allowNull: true,
    },

    canal: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "OTRO",
    },

    campaniaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    origen_detalle: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    utm_source: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    utm_campaign: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    utm_content: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    estado: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "NUEVO",
    },

    prioridad: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "MEDIA",
    },

    vehiculo_marca: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    vehiculo_modelo: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    vehiculo_anio: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    vehiculo_motor: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    patente: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    servicio_interes: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: "OTRO",
    },

    presupuesto_estimado: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    presupuesto_bajo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    datos_minimos_completos: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    tarifa_servicio_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    precio_desde_sugerido: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    precio_referencia_sugerido: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    mensaje_inicial: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    resumen_ai: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    score_interes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    motivo_score: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    proxima_accion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    proximo_contacto_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    primer_contacto_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    ultimo_contacto_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    respondido_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    tiempo_respuesta_minutos: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    es_lead_caliente: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    requiere_contacto_humano: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    asignado_a: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    convertido_cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    convertido_orden_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    perdido_motivo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "leads_comerciales",
    timestamps: true,
  }
);

module.exports = LeadComercial;
