const express = require("express");

const {
  obtenerCampanias,
  crearCampania,
  actualizarCampania,
  obtenerResumenCampania,
} = require("../controllers/campaniaController");

const router = express.Router();

router.get("/", obtenerCampanias);
router.post("/", crearCampania);
router.get("/:id/resumen", obtenerResumenCampania);
router.patch("/:id", actualizarCampania);

module.exports = router;
