const express = require("express");

const {
  crearOrden,
  obtenerOrdenes,
  obtenerOrdenPorId,
  actualizarOrden,
  actualizarEstado,
  registrarPago,
  cobrarYEntregar,
} = require("../controllers/ordenTrabajoController");

const router = express.Router();

router.post("/", crearOrden);

router.get("/", obtenerOrdenes);
router.get("/:id", obtenerOrdenPorId);

// Ruta que tu frontend actual está usando
router.patch("/:id", actualizarOrden);

// Ruta antigua que ya existía
router.patch("/:id/estado", actualizarEstado);

// Cierre comercial
router.post("/:id/registrar-pago", registrarPago);
router.post("/:id/cobrar-entregar", cobrarYEntregar);

module.exports = router;