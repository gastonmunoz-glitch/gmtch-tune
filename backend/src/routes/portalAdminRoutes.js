const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  crearCuenta,
  listarCuentas,
  listarFilesAdmin,
  obtenerFileAdmin,
  actualizarFileAdmin,
  subirModAdmin,
  cargarCreditos,
  listarMovimientosCuenta,
} = require("../controllers/portalAdminController");

const router = express.Router();

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

router.post("/cuentas", crearCuenta);
router.get("/cuentas", listarCuentas);
router.post("/cuentas/:id/creditos", cargarCreditos);
router.get("/cuentas/:id/movimientos", listarMovimientosCuenta);

router.get("/files", listarFilesAdmin);
router.get("/files/:id", obtenerFileAdmin);
router.patch("/files/:id", actualizarFileAdmin);
router.post("/files/:id/mod", upload.single("archivo"), subirModAdmin);

module.exports = router;
