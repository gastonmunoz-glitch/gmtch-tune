const express = require("express");
const router = express.Router();

const uploadArchivo = require("../middleware/uploadArchivoMiddleware");

const {
  crearArchivoECU,
  obtenerArchivosECU,
  obtenerArchivoECUPorId,
  actualizarArchivoECU,
  subirArchivoModificado,
} = require("../controllers/archivoECUController");

router.post("/", uploadArchivo.single("archivo"), crearArchivoECU);
router.get("/", obtenerArchivosECU);
router.get("/:id", obtenerArchivoECUPorId);
router.put("/:id", actualizarArchivoECU);
router.post("/:id/modificado", uploadArchivo.single("archivo"), subirArchivoModificado);

module.exports = router;