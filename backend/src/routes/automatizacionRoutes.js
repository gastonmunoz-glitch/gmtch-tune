const express = require("express");
const { permitirRoles } = require("../middleware/authMiddleware");

const {
  revisionOperativa,
  reporteApertura,
  reporteCierre,
  revisionFileService,
  revisionProcessGuard,
  revisarProcessGuard,
  cumplimientoOperativo,
  misPendientes,
  tiemposOperativos,
  guardiaOperativa,
  revisionFinanzas,
  revisionMaterialRecuperado,
  obtenerUltimoReporte,
  schedulerStatus,
  schedulerRunOnce,
} = require("../controllers/automatizacionController");

const router = express.Router();

const rolesOperativos = [
  "OWNER",
  "ADMIN",
  "SUPERVISOR",
  "RECEPCION",
  "OPERADOR_ECU",
  "MECANICO",
  "TUNER",
  "OPERADOR_SCANNER",
];

router.get("/revision-operativa", permitirRoles(...rolesOperativos), revisionOperativa);
router.get("/mis-pendientes", permitirRoles(...rolesOperativos), misPendientes);
router.get(
  "/guardia-operativa/:usuarioId",
  permitirRoles(...rolesOperativos),
  guardiaOperativa
);
router.get(
  "/tiempos-operativos",
  permitirRoles("OWNER", "ADMIN", "SUPERVISOR"),
  tiemposOperativos
);
router.get(
  "/cumplimiento-operativo",
  permitirRoles("OWNER", "ADMIN", "SUPERVISOR"),
  cumplimientoOperativo
);
router.post("/reporte-apertura", permitirRoles("OWNER", "ADMIN"), reporteApertura);
router.post("/reporte-cierre", permitirRoles("OWNER", "ADMIN"), reporteCierre);
router.get(
  "/file-service",
  permitirRoles("OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_ECU", "TUNER"),
  revisionFileService
);
router.get(
  "/process-guard",
  permitirRoles("OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_ECU", "TUNER", "RECEPCION"),
  revisionProcessGuard
);
router.post(
  "/process-guard/revisar",
  permitirRoles("OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_ECU", "TUNER"),
  revisarProcessGuard
);
router.get("/finanzas", permitirRoles("OWNER", "ADMIN"), revisionFinanzas);
router.get(
  "/scheduler/status",
  permitirRoles("OWNER", "ADMIN"),
  schedulerStatus
);
router.post(
  "/scheduler/run-once",
  permitirRoles("OWNER", "ADMIN"),
  schedulerRunOnce
);
router.get(
  "/material-recuperado",
  permitirRoles("OWNER", "ADMIN", "SUPERVISOR"),
  revisionMaterialRecuperado
);
router.get(
  "/reportes/ultimo",
  permitirRoles("OWNER", "ADMIN", "SUPERVISOR"),
  obtenerUltimoReporte
);

module.exports = router;
