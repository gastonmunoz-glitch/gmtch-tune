const express = require("express");

const {
  obtenerTarifas,
  crearTarifa,
  actualizarTarifa,
  obtenerTarifaPorServicio,
} = require("../controllers/tarifaController");

const router = express.Router();

router.get("/", obtenerTarifas);
router.post("/", crearTarifa);
router.get("/servicio/:servicio", obtenerTarifaPorServicio);
router.patch("/:id", actualizarTarifa);

module.exports = router;
