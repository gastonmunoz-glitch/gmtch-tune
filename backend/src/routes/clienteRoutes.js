const express = require('express');
const router = express.Router();
const { 
  crearCliente, 
  obtenerClientes, 
  actualizarCliente, 
  eliminarCliente 
} = require('../controllers/clienteController');

router.get('/', obtenerClientes);
router.post('/', crearCliente);
router.put('/:id', actualizarCliente);
router.delete('/:id', eliminarCliente);

module.exports = router;
