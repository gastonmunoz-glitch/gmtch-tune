const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MovimientoFinanciero = sequelize.define(
  "MovimientoFinanciero",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    tipo: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },

    categoria: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },

    monto: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    metodo_pago: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "TRANSFERENCIA",
    },

    ordenId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    clienteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    trabajador_nombre: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    proveedor: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    periodo: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    estado: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "REGISTRADO",
    },

    comprobanteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    creado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "movimientos_financieros",
    timestamps: true,
  }
);

module.exports = MovimientoFinanciero;
