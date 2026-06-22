const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const {
  crearDiagnostico,
  obtenerDiagnosticos,
  obtenerDiagnosticoPorId,
  obtenerDiagnosticosPorOrden,
  actualizarDiagnostico,
} = require("../controllers/diagnosticoController");

const scannerPath = path.join(__dirname, "..", "uploads", "scanner");

if (!fs.existsSync(scannerPath)) {
  fs.mkdirSync(scannerPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, scannerPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path
      .basename(file.originalname || "scanner", ext)
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_\-]/g, "");

    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const uploadScanner = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

const manejarScanner = (req, res, next) => {
  const subir = uploadScanner.single("scanner");

  subir(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      console.error("ERROR MULTER SCANNER:", error);

      return res.status(400).json({
        error: "Error al subir foto/captura scanner",
        detalle: error.message,
        codigo: error.code,
      });
    }

    if (error) {
      console.error("ERROR GENERAL SCANNER:", error);

      return res.status(400).json({
        error: "Error al procesar foto/captura scanner",
        detalle: error.message,
      });
    }

    next();
  });
};

router.post("/", manejarScanner, crearDiagnostico);
router.get("/", obtenerDiagnosticos);
router.get("/orden/:ordenId", obtenerDiagnosticosPorOrden);
router.get("/:id", obtenerDiagnosticoPorId);
router.put("/:id", manejarScanner, actualizarDiagnostico);
router.patch("/:id", manejarScanner, actualizarDiagnostico);

module.exports = router;