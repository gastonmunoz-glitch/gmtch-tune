const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Vehiculo = sequelize.define(
  "Vehiculo",
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

    clienteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    patente: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },

    marca: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    modelo: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    anio: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    vin: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    tipo_unidad: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "AUTO",
    },

    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "vehiculos",
    timestamps: true,
  }
);

module.exports = Vehiculo;
