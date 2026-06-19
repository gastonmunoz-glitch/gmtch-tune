const express = require("express");
const router = express.Router();

const { login } = require("../controllers/authController");

// Ruta de prueba para verificar que authRoutes está cargando
router.get("/test", (req, res) => {
  res.json({
    ok: true,
    message: "Ruta auth funcionando correctamente",
  });
});

// Login
router.post("/login", login);

module.exports = router;