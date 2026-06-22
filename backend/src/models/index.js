const Cliente = require("./Cliente");
const Vehiculo = require("./Vehiculo");
const OrdenTrabajo = require("./OrdenTrabajo");
const Diagnostico = require("./Diagnostico");
const ArchivoECU = require("./ArchivoECU");
const FotoVehiculo = require("./FotoVehiculo");
const Usuario = require("./Usuario");

// Modelos opcionales
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

// ======================
// RELACIONES CLIENTE / VEHÍCULO
// ======================

Cliente.hasMany(Vehiculo, {
  foreignKey: "clienteId",
});

Vehiculo.belongsTo(Cliente, {
  foreignKey: "clienteId",
});

// ======================
// RELACIONES VEHÍCULO / ÓRDENES
// ======================

Vehiculo.hasMany(OrdenTrabajo, {
  foreignKey: "vehiculoId",
});

OrdenTrabajo.belongsTo(Vehiculo, {
  foreignKey: "vehiculoId",
});

// ======================
// RELACIONES ORDEN / DIAGNÓSTICO
// ======================

OrdenTrabajo.hasMany(Diagnostico, {
  foreignKey: "ordenTrabajoId",
  constraints: false,
});

Diagnostico.belongsTo(OrdenTrabajo, {
  foreignKey: "ordenTrabajoId",
  constraints: false,
});

// ======================
// RELACIONES ORDEN / ARCHIVOS ECU
// ======================

OrdenTrabajo.hasMany(ArchivoECU, {
  foreignKey: "ordenTrabajoId",
  constraints: false,
});

ArchivoECU.belongsTo(OrdenTrabajo, {
  foreignKey: "ordenTrabajoId",
  constraints: false,
});

// ======================
// RELACIONES ORDEN / FOTOS
// ======================

OrdenTrabajo.hasMany(FotoVehiculo, {
  foreignKey: "ordenTrabajoId",
  constraints: false,
});

FotoVehiculo.belongsTo(OrdenTrabajo, {
  foreignKey: "ordenTrabajoId",
  constraints: false,
});

// ======================
// RELACIONES OPCIONALES FILE SERVICE
// ======================

if (FileService) {
  Usuario.hasMany(FileService, {
    foreignKey: "usuarioId",
    constraints: false,
  });

  FileService.belongsTo(Usuario, {
    foreignKey: "usuarioId",
    constraints: false,
  });

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