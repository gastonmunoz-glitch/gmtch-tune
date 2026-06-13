const express = require('express');
const router = express.Router();
const { crearDiagnostico, obtenerDiagnosticos, obtenerDiagnosticoPorId, actualizarDiagnostico } = require('../controllers/diagnosticoController');

router.post('/', crearDiagnostico);
router.get('/', obtenerDiagnosticos);
router.get('/:id', obtenerDiagnosticoPorId);
router.put('/:id', actualizarDiagnostico);

module.exports = router;
