const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  crearArchivoECU,
  obtenerArchivosECU,
  obtenerContextoSolicitud,
  obtenerArchivoECUPorId,
  actualizarArchivoECU,
  subirArchivoModificado,
  registrarProcesamientoExterno,
  notificarMaster,
  notificarSlave,
  solicitarCorreccion,
  registrarPostEscritura,
  marcarModDescargado,
  registrarCierreTecnico,
  archivarArchivoECU,
  eliminarArchivoECU,
} = require("../controllers/archivoECUController");

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "uploads", "ecu");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "");
    const base = path
      .basename(file.originalname || "archivo", ext)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 40);

    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 80 * 1024 * 1024,
  },
});

const manejarSubidaArchivo = upload.single("archivo");
const manejarPostEscritura = upload.single("scanner_post_escritura");
const manejarProcesamientoExterno = upload.single("archivo_resultado");

router.post("/", manejarSubidaArchivo, crearArchivoECU);

router.get("/", obtenerArchivosECU);
router.get("/contexto-solicitud/:ordenId", obtenerContextoSolicitud);
router.get("/:id", obtenerArchivoECUPorId);

router.put("/:id", actualizarArchivoECU);
router.patch("/:id", actualizarArchivoECU);

router.post("/:id/modificado", manejarSubidaArchivo, subirArchivoModificado);

router.post(
  "/:id/procesamiento-externo",
  manejarProcesamientoExterno,
  registrarProcesamientoExterno
);

router.post("/:id/notificar-master", notificarMaster);
router.post("/:id/notificar-slave", notificarSlave);

router.post("/:id/solicitar-correccion", solicitarCorreccion);

router.post("/:id/mod-descargado", marcarModDescargado);

router.post("/:id/post-escritura", manejarPostEscritura, registrarPostEscritura);

router.post("/:id/cierre-tecnico", registrarCierreTecnico);

router.post("/:id/archivar", archivarArchivoECU);

// Se mantiene por compatibilidad, pero en frontend lo vamos a reemplazar por archivar.
router.delete("/:id", eliminarArchivoECU);

module.exports = router;
