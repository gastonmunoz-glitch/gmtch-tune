const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FileService = sequelize.define('FileService', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nombreArchivo: DataTypes.STRING,
  tipoServicio: DataTypes.STRING, // Stage 1, DPF Off, EGR Off, etc.
  estado: {
    type: DataTypes.ENUM('PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'RECHAZADO'),
    defaultValue: 'PENDIENTE'
  },
  urlOriginal: DataTypes.STRING, // Link del archivo subido por el cliente
  urlModificado: DataTypes.STRING, // Link del archivo trabajado por ti
  comentarios: DataTypes.TEXT,
  prioridad: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

module.exports = FileService;
