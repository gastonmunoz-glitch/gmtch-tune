const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ArchivoECU = sequelize.define('ArchivoECU', {
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
  archivo_original: {
    type: DataTypes.STRING(255), // URL del archivo original
    allowNull: true,
  },
  archivo_modificado: {
    type: DataTypes.STRING(255), // URL del archivo modificado
    allowNull: true,
  },
  marca_ecu: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  modelo_ecu: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  version_software: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'archivos_ecu',
  timestamps: true,
});

module.exports = ArchivoECU;
