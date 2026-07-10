const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MensajeConversacion = sequelize.define(
  "MensajeConversacion",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    conversacionId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    direccion: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },

    canal: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "PORTAL",
    },

    proveedor: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    tipo_mensaje: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    texto: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    enviado_por_tipo: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: "SISTEMA",
    },

    enviado_por_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    enviado_por_nombre: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    leido: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    leido_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    externo_message_id: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    external_parent_id: {
      type: DataTypes.STRING(220),
      allowNull: true,
    },

    enviado_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    estado_envio: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    error_envio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    payload_hash: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: "mensajes_conversacion",
    timestamps: true,
  }
);

module.exports = MensajeConversacion;
