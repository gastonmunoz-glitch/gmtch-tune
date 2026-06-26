const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  crearCuenta,
  listarCuentas,
  editarCuenta,
  crearUsuarioCuenta,
  editarUsuarioPortal,
  resetPasswordUsuario,
  actualizarEstadoCuenta,
  actualizarEstadoUsuario,
  eliminarCuentaPrueba,
  listarFilesAdmin,
  obtenerFileAdmin,
  descargarOriginalAdmin,
  descargarNuevaLecturaAdmin,
  actualizarFileAdmin,
  solicitarNuevaLecturaAdmin,
  subirModAdmin,
  cargarCreditos,
  listarMovimientosCuenta,
  listarAuditoria,
  listarAuditoriaUsuario,
  listarAuditoriaCuenta,
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

router.get("/auditoria", listarAuditoria);

router.post("/cuentas", crearCuenta);
router.get("/cuentas", listarCuentas);
router.get("/cuentas/:id/auditoria", listarAuditoriaCuenta);
router.patch("/cuentas/:id", editarCuenta);
router.patch("/cuentas/:id/estado", actualizarEstadoCuenta);
router.post("/cuentas/:id/usuarios", crearUsuarioCuenta);
router.post("/cuentas/:id/creditos", cargarCreditos);
router.get("/cuentas/:id/movimientos", listarMovimientosCuenta);
router.delete("/cuentas/:id", eliminarCuentaPrueba);

router.get("/usuarios/:id/auditoria", listarAuditoriaUsuario);
router.patch("/usuarios/:id", editarUsuarioPortal);
router.patch("/usuarios/:id/estado", actualizarEstadoUsuario);
router.post("/usuarios/:id/reset-password", resetPasswordUsuario);

router.get("/files", listarFilesAdmin);
router.get("/files/:id/download-original", descargarOriginalAdmin);
router.get("/files/:id/download-nueva-lectura", descargarNuevaLecturaAdmin);
router.get("/files/:id", obtenerFileAdmin);
router.patch("/files/:id", actualizarFileAdmin);
router.post("/files/:id/solicitar-nueva-lectura", solicitarNuevaLecturaAdmin);
router.post("/files/:id/mod", upload.single("archivo"), subirModAdmin);

module.exports = router;
