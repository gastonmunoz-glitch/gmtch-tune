const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { 
  crearArchivoECU, 
  obtenerArchivosECU, 
  obtenerArchivoECUPorId, 
  actualizarArchivoECU, 
  subirArchivoModificado 
} = require('../controllers/archivoECUController');

router.post('/', upload.single('archivo'), crearArchivoECU);
router.get('/', obtenerArchivosECU);
router.get('/:id', obtenerArchivoECUPorId);
router.put('/:id', actualizarArchivoECU);
router.post('/:id/modificado', upload.single('archivo'), subirArchivoModificado);

module.exports = router;
