const express = require("express");

const {
  obtenerLeads,
  crearLead,
  obtenerLeadPorId,
  actualizarLead,
  agregarInteraccion,
  calificarLead,
  convertirCliente,
  convertirOrden,
  obtenerResumenLeads,
} = require("../controllers/leadController");

const router = express.Router();

router.get("/resumen", obtenerResumenLeads);
router.get("/", obtenerLeads);
router.post("/", crearLead);
router.get("/:id", obtenerLeadPorId);
router.patch("/:id", actualizarLead);
router.post("/:id/interacciones", agregarInteraccion);
router.post("/:id/calificar", calificarLead);
router.post("/:id/convertir-cliente", convertirCliente);
router.post("/:id/convertir-orden", convertirOrden);

module.exports = router;
