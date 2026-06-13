const { OrdenTrabajo, Vehiculo, Cliente, Diagnostico, ArchivoECU, FotoVehiculo } = require('../models');

const crearOrden = async (req, res) => {
  try {
    const { vehiculoId, kilometraje, nivel_combustible, motivo_ingreso, tecnico_asignado, monto_total } = req.body;
    const nuevaOrden = await OrdenTrabajo.create({
      vehiculoId,
      kilometraje,
      nivel_combustible,
      motivo_ingreso,
      tecnico_asignado,
      monto_total,
      estado: 'Recibido'
    });
    res.status(201).json({ mensaje: 'Orden creada', orden: nuevaOrden });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const obtenerOrdenes = async (req, res) => {
  try {
    const ordenes = await OrdenTrabajo.findAll({
      include: [
        { model: Vehiculo, include: Cliente },
        Diagnostico,
        ArchivoECU,
        FotoVehiculo
      ]
    });
    res.json(ordenes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const obtenerOrdenPorId = async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findByPk(req.params.id, {
      include: [
        { model: Vehiculo, include: Cliente },
        Diagnostico,
        ArchivoECU,
        FotoVehiculo
      ]
    });
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(orden);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const actualizarOrden = async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findByPk(req.params.id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
    await orden.update(req.body);
    res.json({ mensaje: 'Orden actualizada', orden });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const actualizarEstado = async (req, res) => {
  try {
    const { estado } = req.body;
    const orden = await OrdenTrabajo.findByPk(req.params.id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
    await orden.update({ estado });
    res.json({ mensaje: 'Estado actualizado', orden });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { crearOrden, obtenerOrdenes, obtenerOrdenPorId, actualizarOrden, actualizarEstado };
