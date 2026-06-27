const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const FondoReservaMovimiento = sequelize.define(
  "FondoReservaMovimiento",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    tipo: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "APORTE",
    },

    monto: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    motivo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    creado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "fondo_reserva_movimientos",
    timestamps: true,
  }
);

module.exports = FondoReservaMovimiento;
