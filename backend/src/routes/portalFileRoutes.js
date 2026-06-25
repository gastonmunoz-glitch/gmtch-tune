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

if (!fs.existsSync(portalUploadsDir)) {
  fs.mkdirSync(portalUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, portalUploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || "");
    const base = path
      .basename(file.originalname || "archivo", ext)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 50);

    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 80 * 1024 * 1024,
  },
});

router.get("/", obtenerPortalFiles);
router.post("/", upload.single("archivo"), crearPortalFile);
router.get("/:id/descargar-mod", descargarModPortal);
router.post("/:id/correccion", solicitarCorreccionPortal);
router.post("/:id/nueva-lectura", upload.single("archivo"), subirNuevaLecturaPortal);
router.get("/:id", obtenerPortalFilePorId);

creditosRouter.get("/", obtenerCreditos);

module.exports = router;
module.exports.creditosRouter = creditosRouter;
