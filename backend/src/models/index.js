const Cliente = require('./Cliente');
const Vehiculo = require('./Vehiculo');
const OrdenTrabajo = require('./OrdenTrabajo');
const Diagnostico = require('./Diagnostico');
const ArchivoECU = require('./ArchivoECU');
const FotoVehiculo = require('./FotoVehiculo');

// ====================== RELACIONES ======================

// Cliente - Vehiculo
Cliente.hasMany(Vehiculo, { foreignKey: 'clienteId' });
Vehiculo.belongsTo(Cliente, { foreignKey: 'clienteId' });

// Vehiculo - OrdenTrabajo
Vehiculo.hasMany(OrdenTrabajo, { foreignKey: 'vehiculoId' });
OrdenTrabajo.belongsTo(Vehiculo, { foreignKey: 'vehiculoId' });

// OrdenTrabajo - Diagnostico
OrdenTrabajo.hasOne(Diagnostico, { foreignKey: 'ordenId' });
Diagnostico.belongsTo(OrdenTrabajo, { foreignKey: 'ordenId' });

// OrdenTrabajo - ArchivoECU
OrdenTrabajo.hasMany(ArchivoECU, { foreignKey: 'ordenId' });
ArchivoECU.belongsTo(OrdenTrabajo, { foreignKey: 'ordenId' });

// OrdenTrabajo - FotoVehiculo
OrdenTrabajo.hasMany(FotoVehiculo, { foreignKey: 'ordenId' });
FotoVehiculo.belongsTo(OrdenTrabajo, { foreignKey: 'ordenId' });

module.exports = {
  Cliente,
  Vehiculo,
  OrdenTrabajo,
  Diagnostico,
  ArchivoECU,
  FotoVehiculo
};
