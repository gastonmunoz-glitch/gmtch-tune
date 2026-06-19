const express = require('express');
const router = express.Router();
const { Usuario } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// RUTA PARA CREAR USUARIOS (REGISTER)
router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, role, plan } = req.body;
    
    // Verificamos si ya existe
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) return res.status(400).json({ ok: false, message: 'El correo ya está registrado' });

    const usuario = await Usuario.create({ 
      nombre, 
      email, 
      password, // El modelo Usuario.js lo encriptará automáticamente
      role: role || 'CLIENTE_FILE_SERVICE',
      plan: plan || 'FREE'
    });

    res.json({ ok: true, message: 'Usuario creado con éxito' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// RUTA PARA LOGUEARSE (LOGIN)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await Usuario.findOne({ where: { email } });
    
    if (!usuario) {
      return res.status(401).json({ ok: false, message: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(password, usuario.password);
    if (!isMatch) {
      return res.status(401).json({ ok: false, message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { id: usuario.id, role: usuario.role },
      process.env.JWT_SECRET || 'secret_key_gmtch',
      { expiresIn: '30d' }
    );

    res.json({ 
      ok: true, 
      token, 
      user: { nombre: usuario.nombre, role: usuario.role, plan: usuario.plan } 
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
