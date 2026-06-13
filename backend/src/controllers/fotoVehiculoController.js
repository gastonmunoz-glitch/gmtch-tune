const { FotoVehiculo, OrdenTrabajo } = require('../models');

const crearFotoVehiculo = async (req, res) => {
  try {
    const { ordenId, descripcion } = req.body;
    const nuevaFoto = await FotoVehiculo.create({
      ordenId,
      url_foto: req.file ? req.file.path : null,
      descripcion
    });
    res.status(201).json({ mensaje: 'Foto subida', foto: nuevaFoto });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const obtenerFotosVehiculo = async (req, res) => {
  try {
    const fotos = await FotoVehiculo.findAll({ include: OrdenTrabajo });
    res.json(fotos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const obtenerFotosPorOrden = async (req, res) => {
  try {
    const fotos = await FotoVehiculo.findAll({ where: { ordenId: req.params.ordenId } });
    res.json(fotos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const eliminarFotoVehiculo = async (req, res) => {
  try {
    const foto = await FotoVehiculo.findByPk(req.params.id);
    if (!foto) return res.status(404).json({ error: 'Foto no encontrada' });
    await foto.destroy();
    res.json({ mensaje: 'Foto eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { crearFotoVehiculo, obtenerFotosVehiculo, obtenerFotosPorOrden, eliminarFotoVehiculo };
