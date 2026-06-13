const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vehiculo = sequelize.define('Vehiculo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
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
}, {
  tableName: 'vehiculos',
  timestamps: true,
});

module.exports = Vehiculo;
