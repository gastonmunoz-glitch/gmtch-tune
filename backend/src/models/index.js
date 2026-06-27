const Cliente = require("./Cliente");
const Vehiculo = require("./Vehiculo");
const OrdenTrabajo = require("./OrdenTrabajo");
const Diagnostico = require("./Diagnostico");
const ArchivoECU = require("./ArchivoECU");
const FotoVehiculo = require("./FotoVehiculo");
const Usuario = require("./Usuario");
const Notificacion = require("./Notificacion");
const BitacoraOperativa = require("./BitacoraOperativa");
const MaterialRecuperado = require("./MaterialRecuperado");
const PortalCuenta = require("./PortalCuenta");
const PortalUsuario = require("./PortalUsuario");
const PortalFileService = require("./PortalFileService");
const PortalCreditoMovimiento = require("./PortalCreditoMovimiento");
const PortalAuditoriaEvento = require("./PortalAuditoriaEvento");

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

// Material recuperado / control financiero operativo
OrdenTrabajo.hasMany(MaterialRecuperado, {
  foreignKey: "ordenId",
  constraints: false,
});

MaterialRecuperado.belongsTo(OrdenTrabajo, {
  foreignKey: "ordenId",
  constraints: false,
});

Vehiculo.hasMany(MaterialRecuperado, {
  foreignKey: "vehiculoId",
  constraints: false,
});

MaterialRecuperado.belongsTo(Vehiculo, {
  foreignKey: "vehiculoId",
  constraints: false,
});

Cliente.hasMany(MaterialRecuperado, {
  foreignKey: "clienteId",
  constraints: false,
});

MaterialRecuperado.belongsTo(Cliente, {
  foreignKey: "clienteId",
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

// Portal externo / cuentas
PortalCuenta.hasMany(PortalUsuario, {
  foreignKey: "cuentaId",
  constraints: false,
});

PortalUsuario.belongsTo(PortalCuenta, {
  foreignKey: "cuentaId",
  constraints: false,
});

PortalCuenta.hasMany(PortalFileService, {
  foreignKey: "cuentaId",
  constraints: false,
});

PortalFileService.belongsTo(PortalCuenta, {
  foreignKey: "cuentaId",
  constraints: false,
});

PortalUsuario.hasMany(PortalFileService, {
  foreignKey: "usuarioId",
  constraints: false,
});

PortalFileService.belongsTo(PortalUsuario, {
  foreignKey: "usuarioId",
  constraints: false,
});

PortalCuenta.hasMany(PortalCreditoMovimiento, {
  foreignKey: "cuentaId",
  constraints: false,
});

PortalCreditoMovimiento.belongsTo(PortalCuenta, {
  foreignKey: "cuentaId",
  constraints: false,
});

PortalCuenta.hasMany(PortalAuditoriaEvento, {
  foreignKey: "cuentaId",
  constraints: false,
});

PortalAuditoriaEvento.belongsTo(PortalCuenta, {
  foreignKey: "cuentaId",
  constraints: false,
});

PortalUsuario.hasMany(PortalAuditoriaEvento, {
  foreignKey: "usuarioId",
  constraints: false,
});

PortalAuditoriaEvento.belongsTo(PortalUsuario, {
  foreignKey: "usuarioId",
  constraints: false,
});

module.exports = {
  Cliente,
  Vehiculo,
  OrdenTrabajo,
  Diagnostico,
  ArchivoECU,
  FotoVehiculo,
  Usuario,
  Notificacion,
  BitacoraOperativa,
  MaterialRecuperado,
  PortalCuenta,
  PortalUsuario,
  PortalFileService,
  PortalCreditoMovimiento,
  PortalAuditoriaEvento,
  FileService,
  Operador,
};
