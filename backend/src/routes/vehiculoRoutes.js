const express = require('express');
const router = express.Router();
const { 
  crearVehiculo, 
  obtenerVehiculos, 
  obtenerVehiculoPorId, 
  obtenerVehiculoPorPatente,
  actualizarVehiculo 
} = require('../controllers/vehiculoController');

router.post('/', crearVehiculo);
router.get('/', obtenerVehiculos);
router.get('/:id', obtenerVehiculoPorId);
router.get('/patente/:patente', obtenerVehiculoPorPatente);
router.put('/:id', actualizarVehiculo);

module.exports = router;
