const Usuario = require('../models/Usuario');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await Usuario.findOne({ where: { username } });
    
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user.id, rol: user.rol }, process.env.JWT_SECRET || 'gmtch_secret_2026');

    res.json({ token, rol: user.rol, username: user.username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { login }; // <-- DEBE DECIR ESTO
