const express = require('express');
const router = express.Router();
const { crearOrden, obtenerOrdenes, obtenerOrdenPorId, actualizarOrden, actualizarEstado } = require('../controllers/ordenTrabajoController');

router.post('/', crearOrden);
router.get('/', obtenerOrdenes);
router.get('/:id', obtenerOrdenPorId);
router.put('/:id', actualizarOrden);
router.patch('/:id/estado', actualizarEstado);

module.exports = router;
