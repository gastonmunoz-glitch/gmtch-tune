const { ArchivoECU } = require('../models');

// OBTENER TODOS LOS ARCHIVOS
const obtenerArchivosECU = async (req, res) => {
  try {
    const archivos = await ArchivoECU.findAll({ order: [['id', 'DESC']] });
    res.json(archivos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CREAR ARCHIVO (SUBIDA DEL ORIGINAL POR EL COLABORADOR)
const crearArchivoECU = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo original' });

    const nuevoArchivo = await ArchivoECU.create({
      ordenId: parseInt(req.body.ordenId),
      marca_ecu: req.body.marca_ecu,
      modelo_ecu: req.body.modelo_ecu,
      version_software: req.body.version_software,
      observaciones: req.body.observaciones || '', // Notas iniciales del taller
      archivo_original: req.file.path, 
      archivo_modificado: null
    });

    res.status(201).json({ mensaje: 'Archivo ECU inyectado al sistema', archivo: nuevoArchivo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// SUBIR ARCHIVO MODIFICADO (FUNCIÓN EXCLUSIVA MÁSTER GASTON + NOTAS TÉCNICAS)
const subirArchivoModificado = async (req, res) => {
  try {
    const archivo = await ArchivoECU.findByPk(req.params.id);
    if (!archivo) return res.status(404).json({ error: 'Registro de ECU no encontrado' });

    // Preparamos los datos para actualizar
    const actualizaciones = {};
    
    // Si Gaston sube un archivo nuevo
    if (req.file) {
      actualizaciones.archivo_modificado = req.file.path;
    }
    
    // Si Gaston escribe instrucciones en el recuadro de notas
    if (req.body.observaciones) {
      actualizaciones.observaciones = req.body.observaciones;
    }

    await archivo.update(actualizaciones);
    
    res.json({ mensaje: 'Expediente técnico actualizado por el Máster', archivo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// OBTENER ARCHIVO ESPECÍFICO
const obtenerArchivoECUPorId = async (req, res) => {
  try {
    const archivo = await ArchivoECU.findByPk(req.params.id);
    if (!archivo) return res.status(404).json({ error: 'No encontrado' });
    res.json(archivo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ACTUALIZAR REGISTRO GENERAL
const actualizarArchivoECU = async (req, res) => {
  try {
    const archivo = await ArchivoECU.findByPk(req.params.id);
    if (!archivo) return res.status(404).json({ error: 'No encontrado' });
    await archivo.update(req.body);
    res.json(archivo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { 
  crearArchivoECU, 
  obtenerArchivosECU, 
  obtenerArchivoECUPorId, 
  actualizarArchivoECU, 
  subirArchivoModificado 
};
