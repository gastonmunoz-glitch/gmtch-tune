const Cliente = require("./Cliente");
const Vehiculo = require("./Vehiculo");
const OrdenTrabajo = require("./OrdenTrabajo");
const Diagnostico = require("./Diagnostico");
const ArchivoECU = require("./ArchivoECU");
const FotoVehiculo = require("./FotoVehiculo");
const Usuario = require("./Usuario");

let FileService = null;
let Operador = null;

try {
  FileService = require("./FileService");
} catch (error) {
  console.warn("⚠️ Modelo FileService no cargado:", error.message);
}

try {
  Operador = require("./Operador");
} catch (error) {
  console.warn("⚠️ Modelo Operador no cargado:", error.message);
}

// Cliente / Vehículo
Cliente.hasMany(Vehiculo, {
  foreignKey: "clienteId",
  constraints: false,
});

Vehiculo.belongsTo(Cliente, {
  foreignKey: "clienteId",
  constraints: false,
});

// Vehículo / Orden
Vehiculo.hasMany(OrdenTrabajo, {
  foreignKey: "vehiculoId",
  constraints: false,
});

OrdenTrabajo.belongsTo(Vehiculo, {
  foreignKey: "vehiculoId",
  constraints: false,
});

// Orden / Diagnóstico
OrdenTrabajo.hasMany(Diagnostico, {
  foreignKey: "ordenTrabajoId",
  constraints: false,
});

Diagnostico.belongsTo(OrdenTrabajo, {
  foreignKey: "ordenTrabajoId",
  constraints: false,
});

// Orden / Archivo ECU
OrdenTrabajo.hasMany(ArchivoECU, {
  foreignKey: "ordenTrabajoId",
  constraints: false,
});

ArchivoECU.belongsTo(OrdenTrabajo, {
  foreignKey: "ordenTrabajoId",
  constraints: false,
});

// Orden / Fotos
OrdenTrabajo.hasMany(FotoVehiculo, {
  foreignKey: "ordenTrabajoId",
  constraints: false,
});

FotoVehiculo.belongsTo(OrdenTrabajo, {
  foreignKey: "ordenTrabajoId",
  constraints: false,
});

// FileService opcional
if (FileService) {
  OrdenTrabajo.hasMany(FileService, {
    foreignKey: "ordenTrabajoId",
    constraints: false,
  });

  FileService.belongsTo(OrdenTrabajo, {
    foreignKey: "ordenTrabajoId",
    constraints: false,
  });
}

module.exports = {
  Cliente,
  Vehiculo,
  OrdenTrabajo,
  Diagnostico,
  ArchivoECU,
  FotoVehiculo,
  Usuario,
  FileService,
  Operador,
};