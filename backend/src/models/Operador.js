// backend/src/models/Operador.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Operador = sequelize.define('Operador', {
  nombre: DataTypes.STRING,
  especialidad: {
    type: DataTypes.ENUM('RECEPCION', 'PROGRAMADOR', 'MECANICO'),
    allowNull: false
  },
  estaDisponible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  tareasActivas: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

module.exports = Operador;
