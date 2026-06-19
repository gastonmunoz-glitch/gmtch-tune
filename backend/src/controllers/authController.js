const Usuario = require('../models/Usuario');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await Usuario.findOne({ where: { username } });
    if (!user) return res.status(404).json({ error: 'Usuario no existe' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Clave incorrecta' });

    const token = jwt.sign({ id: user.id, rol: user.rol }, process.env.JWT_SECRET);
    res.json({ token, rol: user.rol, username: user.username });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

module.exports = { login };
