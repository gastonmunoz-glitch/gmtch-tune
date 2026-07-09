const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PortalCreditoCompra = sequelize.define(
  "PortalCreditoCompra",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    cuentaId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    paquete_id: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },

    creditos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    monto_clp: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    estado: {
      type: DataTypes.ENUM("PENDIENTE", "PAGADA", "FALLIDA", "ANULADA", "EXPIRADA"),
      allowNull: false,
      defaultValue: "PENDIENTE",
    },

    flow_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    flow_commerce_order: {
      type: DataTypes.STRING(160),
      allowNull: true,
      unique: true,
    },

    flow_status: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    flow_payload: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    pagada_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    fallida_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    movimientoId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: "portal_credito_compras",
    timestamps: true,
  }
);

module.exports = PortalCreditoCompra;
