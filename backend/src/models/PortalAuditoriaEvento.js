const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PortalAuditoriaEvento = sequelize.define(
  "PortalAuditoriaEvento",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    cuentaId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    usuarioId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    tipo: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },

    resultado: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "INFO",
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    ip: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    creado_por: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
  },
  {
    tableName: "portal_auditoria_eventos",
    timestamps: true,
  }
);

module.exports = PortalAuditoriaEvento;

