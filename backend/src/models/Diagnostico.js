const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Diagnostico = sequelize.define('Diagnostico', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  ordenId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'ordenes_trabajo',
      key: 'id'
    }
  },
  fallas_detectadas: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  codigos_dtc: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  informe_scanner: {
    type: DataTypes.STRING(255), // URL del archivo del scanner
    allowNull: true,
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'diagnosticos',
  timestamps: true,
});

module.exports = Diagnostico;
