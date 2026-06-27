const express = require("express");

const {
  listarMaterialRecuperado,
  crearMaterialRecuperado,
  actualizarMaterialRecuperado,
  marcarMaterialVendido,
  obtenerEstadisticasModelo,
  obtenerLoteMensual,
  cerrarLoteMensual,
  listarOrdenesParaMaterial,
} = require("../controllers/finanzasController");

const router = express.Router();

router.get("/material-recuperado/ordenes", listarOrdenesParaMaterial);
router.get("/material-recuperado/estadisticas-modelo", obtenerEstadisticasModelo);
router.get("/material-recuperado/lotes/:loteMes", obtenerLoteMensual);
router.patch("/material-recuperado/lotes/:loteMes/cerrar", cerrarLoteMensual);
router.get("/material-recuperado", listarMaterialRecuperado);
router.post("/material-recuperado", crearMaterialRecuperado);
router.patch("/material-recuperado/:id/vender", marcarMaterialVendido);
router.patch("/material-recuperado/:id", actualizarMaterialRecuperado);

module.exports = router;
