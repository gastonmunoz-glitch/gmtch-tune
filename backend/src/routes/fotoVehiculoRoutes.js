const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { crearFotoVehiculo, obtenerFotosVehiculo, obtenerFotosPorOrden, eliminarFotoVehiculo } = require('../controllers/fotoVehiculoController');

router.post('/', upload.single('foto'), crearFotoVehiculo);
router.get('/', obtenerFotosVehiculo);
router.get('/orden/:ordenId', obtenerFotosPorOrden);
router.delete('/:id', eliminarFotoVehiculo);

module.exports = router;

