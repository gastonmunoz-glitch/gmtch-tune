const { Cliente } = require('../models');

// OBTENER TODOS LOS CLIENTES
const obtenerClientes = async (req, res) => {
  try {
    const clientes = await Cliente.findAll({ order: [['id', 'ASC']] });
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CREAR NUEVO CLIENTE
const crearCliente = async (req, res) => {
  try {
    const nuevoCliente = await Cliente.create(req.body);
    res.status(201).json(nuevoCliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ACTUALIZAR CLIENTE
const actualizarCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'No encontrado' });
    await cliente.update(req.body);
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ELIMINAR CLIENTE
const eliminarCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'No encontrado' });
    await cliente.destroy();
    res.json({ mensaje: 'Eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { obtenerClientes, crearCliente, actualizarCliente, eliminarCliente };
