const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrdenTrabajo = sequelize.define('OrdenTrabajo', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },

  vehiculoId: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },

  prioridad: { 
    type: DataTypes.ENUM('BAJA', 'MEDIA', 'ALTA', 'URGENTE'), 
    defaultValue: 'MEDIA' 
  },

  estado: { 
    type: DataTypes.ENUM(
      'RECEPCIONADO',      // Solo fotos y datos iniciales
      'PARA_DIAGNOSTICO',  // Esperando al Programador
      'EN_PROGRAMACION',   // Programador trabajando Scanner/Lectura
      'PARA_MECANICA',     // Esperando al Mecánico
      'EN_MECANICA',       // Mecánico trabajando
      'LISTO_PARA_ENTREGA' // Trabajo listo para entregar
    ),
    defaultValue: 'RECEPCIONADO'
  },

  estado_pago: { 
    type: DataTypes.ENUM('PENDIENTE', 'PAGADO'), 
    defaultValue: 'PENDIENTE' 
  },

  kilometraje: { 
    type: DataTypes.INTEGER 
  },

  motivo_ingreso: { 
    type: DataTypes.TEXT 
  },

  monto_total: { 
    type: DataTypes.DECIMAL(10, 2), 
    defaultValue: 0 
  }

}, { 
  tableName: 'ordenes_trabajo', 
  timestamps: true 
});

module.exports = OrdenTrabajo;