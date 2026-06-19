const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

// Definición de la ruta de acceso
// Esta ruta se convierte en: https://tu-servidor.com/api/auth/login
router.post('/login', login);

module.exports = router;
