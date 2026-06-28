const express = require("express");
const { permitirRoles } = require("../middleware/authMiddleware");

const {
  revisionOperativa,
  reporteApertura,
  reporteCierre,
  revisionFileService,
  revisionFinanzas,
  revisionMaterialRecuperado,
  obtenerUltimoReporte,
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
];

router.get("/revision-operativa", permitirRoles(...rolesOperativos), revisionOperativa);
router.post("/reporte-apertura", permitirRoles("OWNER", "ADMIN"), reporteApertura);
router.post("/reporte-cierre", permitirRoles("OWNER", "ADMIN"), reporteCierre);
router.get(
  "/file-service",
  permitirRoles("OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_ECU", "TUNER"),
  revisionFileService
);
router.get("/finanzas", permitirRoles("OWNER", "ADMIN"), revisionFinanzas);
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
