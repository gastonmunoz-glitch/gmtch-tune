const express = require("express");

const {
  resumenOperativo,
  auditoriaDia,
  fileServiceAlertas,
  finanzasResumen,
  gerenteDiario,
} = require("../controllers/aiAgentController");

const router = express.Router();

router.get("/resumen-operativo", resumenOperativo);
router.get("/auditoria-dia", auditoriaDia);
router.get("/file-service-alertas", fileServiceAlertas);
router.get("/finanzas-resumen", finanzasResumen);
router.get("/gerente-diario", gerenteDiario);

module.exports = router;
