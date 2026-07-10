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

    canal: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "PORTAL",
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
