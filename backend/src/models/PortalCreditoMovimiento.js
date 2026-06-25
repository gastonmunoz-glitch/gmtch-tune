const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PortalCreditoMovimiento = sequelize.define(
  "PortalCreditoMovimiento",
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

    tipo: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },

    monto: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    saldo_anterior: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },

    saldo_nuevo: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },

    referencia: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    creado_por: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    observacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "portal_credito_movimientos",
    timestamps: true,
  }
);

module.exports = PortalCreditoMovimiento;
