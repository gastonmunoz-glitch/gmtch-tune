const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  obtenerCreditos,
  obtenerPortalFiles,
  crearPortalFile,
  obtenerPortalFilePorId,
  solicitarCorreccionPortal,
  subirNuevaLecturaPortal,
  descargarModPortal,
} = require("../controllers/portalFileController");

const router = express.Router();
const creditosRouter = express.Router();

const portalUploadsDir = path.join(__dirname, "..", "portal_uploads");
const PORTAL_UPLOAD_MAX_MB = Number(process.env.PORTAL_UPLOAD_MAX_MB || 50);
const PORTAL_UPLOAD_MAX_BYTES =
  (Number.isFinite(PORTAL_UPLOAD_MAX_MB) && PORTAL_UPLOAD_MAX_MB > 0
    ? PORTAL_UPLOAD_MAX_MB
    : 50) *
  1024 *
  1024;
const EXTENSIONES_ECU_PERMITIDAS = new Set([
  ".bin",
  ".ori",
  ".mod",
  ".hex",
  ".frf",
  ".sgo",
  ".zip",
  ".rar",
  ".7z",
]);

if (!fs.existsSync(portalUploadsDir)) {
  fs.mkdirSync(portalUploadsDir, { recursive: true });
}

const nombreSeguro = (nombre) => path.basename(String(nombre || "archivo"));

const validarArchivoECU = (req, file, cb) => {
  const original = nombreSeguro(file.originalname);
  const ext = path.extname(original).toLowerCase();

  if (!EXTENSIONES_ECU_PERMITIDAS.has(ext)) {
    return cb(new Error("Tipo de archivo no permitido para File Service"));
  }

  return cb(null, true);
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, portalUploadsDir);
  },
  filename: function (req, file, cb) {
    const original = nombreSeguro(file.originalname);
    const ext = path.extname(original || "");
    const base = path
      .basename(original || "archivo", ext)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 50);

    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: PORTAL_UPLOAD_MAX_BYTES,
  },
  fileFilter: validarArchivoECU,
});

const manejarUploadPortal = (campo) => (req, res, next) => {
  upload.single(campo)(req, res, (error) => {
    if (!error) return next();

    const mensaje =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? `El archivo supera el limite de ${PORTAL_UPLOAD_MAX_MB || 50}MB`
        : "Archivo no permitido para File Service";

    return res.status(400).json({ error: mensaje });
  });
};

router.get("/", obtenerPortalFiles);
router.post("/", manejarUploadPortal("archivo"), crearPortalFile);
router.get("/:id/descargar-mod", descargarModPortal);
router.post("/:id/correccion", solicitarCorreccionPortal);
router.post("/:id/nueva-lectura", manejarUploadPortal("archivo"), subirNuevaLecturaPortal);
router.get("/:id", obtenerPortalFilePorId);

creditosRouter.get("/", obtenerCreditos);

module.exports = router;
module.exports.creditosRouter = creditosRouter;
