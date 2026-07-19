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

const TAMANO_MAXIMO = 80 * 1024 * 1024;
const crearUpload = () =>
  multer({
    storage,
    limits: {
      fileSize: TAMANO_MAXIMO,
    },
  });

const manejarMulter = (middleware, descripcion) => (req, res, next) => {
  middleware(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "ARCHIVO_DEMASIADO_GRANDE",
        message: `${descripcion} supera el maximo permitido de 80 MB.`,
      });
    }

    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        error: "ARCHIVO_INVALIDO",
        codigo: error.code,
        message: `No se pudo procesar ${descripcion}.`,
      });
    }

    return res.status(400).json({
      error: "ARCHIVO_INVALIDO",
      message: error.message || `No se pudo procesar ${descripcion}.`,
    });
  });
};

const uploadArchivoECU = crearUpload();
// La UI existente usa este flujo tanto para binarios ECU como para evidencia
// (imagenes/PDF). Se conserva la compatibilidad y el limite comun de 80 MB.
const uploadScanner = crearUpload();

const manejarSubidaArchivo = manejarMulter(
  uploadArchivoECU.single("archivo"),
  "el archivo ECU"
);
const manejarPostEscritura = manejarMulter(
  uploadScanner.single("scanner_post_escritura"),
  "la evidencia de scanner post escritura"
);
const manejarProcesamientoExterno = manejarMulter(
  uploadArchivoECU.single("archivo_resultado"),
  "el archivo de resultado externo"
);

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
