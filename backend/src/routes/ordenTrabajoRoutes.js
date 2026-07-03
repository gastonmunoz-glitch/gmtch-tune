const express = require("express");

const {
  crearOrden,
  obtenerOrdenes,
  obtenerOrdenPorId,
  obtenerEventosOrden,
  actualizarOrden,
  registrarAjusteComercial,
  obtenerItemsOrden,
  crearItemOrden,
  actualizarItemOrden,
  eliminarItemOrden,
  obtenerMaterialOrden,
  registrarMaterialOrden,
  registrarCorreccionTecnica,
  actualizarCorreccionTecnica,
  agregarBitacoraOrden,
  actualizarEstado,
  registrarPago,
  cobrarYEntregar,
} = require("../controllers/ordenTrabajoController");

const router = express.Router();

router.post("/", crearOrden);

router.get("/", obtenerOrdenes);
router.get("/:id/eventos", obtenerEventosOrden);
router.get("/:id", obtenerOrdenPorId);

// Orden Comercial V2 / items de servicio / material recuperado
router.post("/:id/ajuste-comercial", registrarAjusteComercial);
router.get("/:id/items", obtenerItemsOrden);
router.post("/:id/items", crearItemOrden);
router.patch("/:id/items/:itemId", actualizarItemOrden);
router.delete("/:id/items/:itemId", eliminarItemOrden);
router.get("/:id/material-recuperado", obtenerMaterialOrden);
router.post("/:id/material-recuperado", registrarMaterialOrden);

// Correccion tecnica / postventa interna
router.post("/:id/correccion-tecnica", registrarCorreccionTecnica);
router.patch("/:id/correccion-tecnica", actualizarCorreccionTecnica);
router.post("/:id/bitacora", agregarBitacoraOrden);

// Ruta que tu frontend actual está usando
router.patch("/:id", actualizarOrden);

// Ruta antigua que ya existía
router.patch("/:id/estado", actualizarEstado);

// Cierre comercial
router.post("/:id/registrar-pago", registrarPago);
router.post("/:id/cobrar-entregar", cobrarYEntregar);

module.exports = router;
