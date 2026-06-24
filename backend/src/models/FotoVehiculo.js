const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FotoVehiculo = sequelize.define('FotoVehiculo', {
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
  url_foto: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  tipo_foto: {
    type: DataTypes.STRING(60),
    allowNull: false,
    defaultValue: 'OTRO',
  },
  nombre_archivo: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  subido_por: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  descripcion: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
}, {
  tableName: 'fotos_vehiculo',
  timestamps: true,
});

module.exports = FotoVehiculo;
