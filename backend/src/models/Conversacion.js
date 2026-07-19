const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Conversacion = sequelize.define(
  "Conversacion",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
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

    canal: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "PORTAL",
    },

    proveedor: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    external_conversation_id: {
      type: DataTypes.STRING(220),
      allowNull: true,
    },

    external_user_id: {
      type: DataTypes.STRING(220),
      allowNull: true,
    },

    page_id: {
      type: DataTypes.STRING(220),
      allowNull: true,
    },

    instagram_account_id: {
      type: DataTypes.STRING(220),
      allowNull: true,
    },

    post_id: {
      type: DataTypes.STRING(220),
      allowNull: true,
    },

    comment_id: {
      type: DataTypes.STRING(220),
      allowNull: true,
    },

    ad_id: {
      type: DataTypes.STRING(220),
      allowNull: true,
    },

    portalCuentaId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    portalUsuarioId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    clienteId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    telefono: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    wa_id: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    username_externo: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    nombre_contacto: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    asunto: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    estado: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "NUEVA",
    },

    prioridad: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "MEDIA",
    },

    asignado_a_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    ultimo_mensaje_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    last_inbound_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    service_window_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    requiere_template: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: "conversaciones",
    timestamps: true,
  }
);

module.exports = Conversacion;
