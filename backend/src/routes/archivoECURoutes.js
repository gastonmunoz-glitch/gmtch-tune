const express = require("express");
const multer = require("multer");
const router = express.Router();

const uploadArchivo = require("../middleware/uploadArchivoMiddleware");

const {
  crearArchivoECU,
  obtenerArchivosECU,
  obtenerArchivoECUPorId,
  actualizarArchivoECU,
  subirArchivoModificado,
  notificarMaster,
  notificarSlave,
  solicitarCorreccion,
  eliminarArchivoECU,
} = require("../controllers/archivoECUController");

const manejarSubidaArchivo = (req, res, next) => {
  const subir = uploadArchivo.single("archivo");

  subir(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      console.error("ERROR MULTER ECU:", error);

      return res.status(400).json({
        error: "Error al subir archivo ECU",
        detalle: error.message,
        codigo: error.code,
      });
    }

    if (error) {
      console.error("ERROR GENERAL SUBIDA ECU:", error);

      return res.status(400).json({
        error: "Error al procesar archivo ECU",
        detalle: error.message,
      });
    }

    next();
  });
};

router.post("/", manejarSubidaArchivo, crearArchivoECU);
router.get("/", obtenerArchivosECU);
router.get("/:id", obtenerArchivoECUPorId);
router.put("/:id", actualizarArchivoECU);
router.patch("/:id", actualizarArchivoECU);

router.post("/:id/modificado", manejarSubidaArchivo, subirArchivoModificado);
router.post("/:id/notificar-master", notificarMaster);
router.post("/:id/notificar-slave", notificarSlave);
router.post("/:id/solicitar-correccion", solicitarCorreccion);

router.delete("/:id", eliminarArchivoECU);

module.exports = router;