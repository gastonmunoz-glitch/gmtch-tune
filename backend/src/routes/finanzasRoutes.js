const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  obtenerResumenFinanzas,
  listarMovimientos,
  crearMovimiento,
  actualizarMovimiento,
  listarComprobantes,
  crearComprobante,
  actualizarComprobante,
  validarComprobante,
  rechazarComprobante,
  descargarComprobante,
  listarFondoReserva,
  crearMovimientoFondo,
  previsualizarCierreSemanal,
  listarCierresSemanales,
  crearCierreSemanal,
  registrarIngresoVentaMaterial,
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

const comprobantesDir = path.join(__dirname, "..", "uploads", "comprobantes");

if (!fs.existsSync(comprobantesDir)) {
  fs.mkdirSync(comprobantesDir, { recursive: true });
}

const limpiarNombreArchivo = (nombre) =>
  String(nombre || "comprobante")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 90);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, comprobantesDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "comprobante", extension);
    cb(null, `${Date.now()}-${limpiarNombreArchivo(base)}${extension}`);
  },
});

const uploadComprobante = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

router.get("/resumen", obtenerResumenFinanzas);

router.get("/movimientos", listarMovimientos);
router.post("/movimientos", crearMovimiento);
router.patch("/movimientos/:id", actualizarMovimiento);

router.get("/comprobantes", listarComprobantes);
router.post("/comprobantes", uploadComprobante.single("comprobante"), crearComprobante);
router.patch("/comprobantes/:id", actualizarComprobante);
router.patch("/comprobantes/:id/validar", validarComprobante);
router.patch("/comprobantes/:id/rechazar", rechazarComprobante);
router.get("/comprobantes/:id/descargar", descargarComprobante);

router.get("/fondo-reserva", listarFondoReserva);
router.post("/fondo-reserva", crearMovimientoFondo);

router.get("/cierres-semanales", listarCierresSemanales);
router.get("/cierres-semanales/previsualizar", previsualizarCierreSemanal);
router.post("/cierres-semanales", crearCierreSemanal);

router.get("/material-recuperado/ordenes", listarOrdenesParaMaterial);
router.get("/material-recuperado/estadisticas-modelo", obtenerEstadisticasModelo);
router.get("/material-recuperado/lotes/:loteMes", obtenerLoteMensual);
router.patch("/material-recuperado/lotes/:loteMes/cerrar", cerrarLoteMensual);
router.get("/material-recuperado", listarMaterialRecuperado);
router.post("/material-recuperado", crearMaterialRecuperado);
router.patch("/material-recuperado/:id/vender", marcarMaterialVendido);
router.post("/material-recuperado/:id/registrar-ingreso", registrarIngresoVentaMaterial);
router.patch("/material-recuperado/:id", actualizarMaterialRecuperado);

module.exports = router;
