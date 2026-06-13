const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cliente = sequelize.define('Cliente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  direccion: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
}, {
  tableName: 'clientes',
  timestamps: true,
});
const Vehiculo = require('./Vehiculo');

Cliente.hasMany(Vehiculo, { foreignKey: 'clienteId' });
Vehiculo.belongsTo(Cliente, { foreignKey: 'clienteId' });

module.exports = Cliente;
