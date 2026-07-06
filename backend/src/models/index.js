const Cliente = require("./Cliente");
const Vehiculo = require("./Vehiculo");
const OrdenTrabajo = require("./OrdenTrabajo");
const OrdenServicioItem = require("./OrdenServicioItem");
const OrdenEventoOperativo = require("./OrdenEventoOperativo");
const Diagnostico = require("./Diagnostico");
const ArchivoECU = require("./ArchivoECU");
const FotoVehiculo = require("./FotoVehiculo");
const Usuario = require("./Usuario");
const Notificacion = require("./Notificacion");
const PushSubscription = require("./PushSubscription");
const BitacoraOperativa = require("./BitacoraOperativa");
const AutomatizacionReporte = require("./AutomatizacionReporte");
const MaterialRecuperado = require("./MaterialRecuperado");
const MovimientoFinanciero = require("./MovimientoFinanciero");
const FondoReservaMovimiento = require("./FondoReservaMovimiento");
const CierreSemanal = require("./CierreSemanal");
const ComprobantePago = require("./ComprobantePago");
const LeadComercial = require("./LeadComercial");
const LeadInteraccion = require("./LeadInteraccion");
const TarifaServicio = require("./TarifaServicio");
const CampaniaComercial = require("./CampaniaComercial");
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

OrdenTrabajo.hasMany(OrdenServicioItem, {
  foreignKey: "ordenId",
  constraints: false,
});

OrdenServicioItem.belongsTo(OrdenTrabajo, {
  foreignKey: "ordenId",
  constraints: false,
});

OrdenTrabajo.hasMany(OrdenEventoOperativo, {
  foreignKey: "ordenId",
  constraints: false,
});

OrdenEventoOperativo.belongsTo(OrdenTrabajo, {
  foreignKey: "ordenId",
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

OrdenServicioItem.hasMany(MaterialRecuperado, {
  foreignKey: "itemId",
  constraints: false,
});

MaterialRecuperado.belongsTo(OrdenServicioItem, {
  foreignKey: "itemId",
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

OrdenTrabajo.belongsTo(Usuario, {
  as: "RecepcionadoPorUsuario",
  foreignKey: "recepcionado_por_id",
  constraints: false,
});

OrdenTrabajo.belongsTo(Usuario, {
  as: "DiagnosticoAsignadoUsuario",
  foreignKey: "diagnostico_asignado_a_id",
  constraints: false,
});

OrdenTrabajo.belongsTo(Usuario, {
  as: "OperadorEcuAsignadoUsuario",
  foreignKey: "operador_ecu_asignado_a_id",
  constraints: false,
});

OrdenTrabajo.belongsTo(Usuario, {
  as: "MecanicoAsignadoUsuario",
  foreignKey: "mecanico_asignado_a_id",
  constraints: false,
});

OrdenTrabajo.belongsTo(Usuario, {
  as: "SupervisorAsignadoUsuario",
  foreignKey: "supervisor_asignado_a_id",
  constraints: false,
});

OrdenTrabajo.belongsTo(Usuario, {
  as: "FeedbackPorUsuario",
  foreignKey: "feedback_por_id",
  constraints: false,
});

OrdenTrabajo.belongsTo(Usuario, {
  as: "CobradoPorUsuario",
  foreignKey: "cobrado_por_id",
  constraints: false,
});

OrdenTrabajo.belongsTo(Usuario, {
  as: "EntregadoPorUsuario",
  foreignKey: "entregado_por_id",
  constraints: false,
});

OrdenTrabajo.belongsTo(Usuario, {
  as: "AjustadoPorUsuario",
  foreignKey: "ajustado_por_id",
  constraints: false,
});

OrdenServicioItem.belongsTo(Usuario, {
  as: "ResponsableUsuario",
  foreignKey: "responsable_id",
  constraints: false,
});

MaterialRecuperado.belongsTo(Usuario, {
  as: "ResponsableMaterialUsuario",
  foreignKey: "responsable_id",
  constraints: false,
});

MaterialRecuperado.belongsTo(Usuario, {
  as: "RegistradoPorUsuario",
  foreignKey: "registrado_por_id",
  constraints: false,
});

OrdenTrabajo.hasMany(MovimientoFinanciero, {
  foreignKey: "ordenId",
  constraints: false,
});

MovimientoFinanciero.belongsTo(OrdenTrabajo, {
  foreignKey: "ordenId",
  constraints: false,
});

Cliente.hasMany(MovimientoFinanciero, {
  foreignKey: "clienteId",
  constraints: false,
});

MovimientoFinanciero.belongsTo(Cliente, {
  foreignKey: "clienteId",
  constraints: false,
});

OrdenTrabajo.hasMany(ComprobantePago, {
  foreignKey: "ordenId",
  constraints: false,
});

ComprobantePago.belongsTo(OrdenTrabajo, {
  foreignKey: "ordenId",
  constraints: false,
});

Cliente.hasMany(ComprobantePago, {
  foreignKey: "clienteId",
  constraints: false,
});

ComprobantePago.belongsTo(Cliente, {
  foreignKey: "clienteId",
  constraints: false,
});

MovimientoFinanciero.hasMany(ComprobantePago, {
  foreignKey: "movimientoFinancieroId",
  constraints: false,
});

ComprobantePago.belongsTo(MovimientoFinanciero, {
  foreignKey: "movimientoFinancieroId",
  constraints: false,
});

// CRM comercial / leads
Usuario.hasMany(PushSubscription, {
  foreignKey: "usuarioId",
  constraints: false,
});

PushSubscription.belongsTo(Usuario, {
  foreignKey: "usuarioId",
  constraints: false,
});

// CRM comercial / leads
LeadComercial.hasMany(LeadInteraccion, {
  foreignKey: "leadId",
  constraints: false,
});

LeadInteraccion.belongsTo(LeadComercial, {
  foreignKey: "leadId",
  constraints: false,
});

Cliente.hasMany(LeadComercial, {
  foreignKey: "convertido_cliente_id",
  constraints: false,
});

LeadComercial.belongsTo(Cliente, {
  foreignKey: "convertido_cliente_id",
  constraints: false,
});

OrdenTrabajo.hasMany(LeadComercial, {
  foreignKey: "convertido_orden_id",
  constraints: false,
});

LeadComercial.belongsTo(OrdenTrabajo, {
  foreignKey: "convertido_orden_id",
  constraints: false,
});

CampaniaComercial.hasMany(LeadComercial, {
  foreignKey: "campaniaId",
  constraints: false,
});

LeadComercial.belongsTo(CampaniaComercial, {
  foreignKey: "campaniaId",
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
  OrdenServicioItem,
  OrdenEventoOperativo,
  Diagnostico,
  ArchivoECU,
  FotoVehiculo,
  Usuario,
  Notificacion,
  PushSubscription,
  BitacoraOperativa,
  AutomatizacionReporte,
  MaterialRecuperado,
  MovimientoFinanciero,
  FondoReservaMovimiento,
  CierreSemanal,
  ComprobantePago,
  LeadComercial,
  LeadInteraccion,
  TarifaServicio,
  CampaniaComercial,
  PortalCuenta,
  PortalUsuario,
  PortalFileService,
  PortalCreditoMovimiento,
  PortalAuditoriaEvento,
  FileService,
  Operador,
};
