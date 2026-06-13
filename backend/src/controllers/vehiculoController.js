const { Vehiculo, Cliente, OrdenTrabajo, ArchivoECU, FotoVehiculo, Diagnostico } = require('../models');

const crearVehiculo = async (req, res) => {
  try {
    const nuevo = await Vehiculo.create(req.body);
    res.status(201).json(nuevo);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const obtenerVehiculos = async (req, res) => {
  try {
    const vehiculos = await Vehiculo.findAll({ include: [Cliente] });
    res.json(vehiculos);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const obtenerVehiculoPorId = async (req, res) => {
  try {
    const vehiculo = await Vehiculo.findByPk(req.params.id, {
      include: [
        { model: Cliente },
        { model: OrdenTrabajo, include: [ArchivoECU, FotoVehiculo, Diagnostico] }
      ]
    });
    if (!vehiculo) return res.status(404).json({ error: 'No encontrado' });
    res.json(vehiculo);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const obtenerVehiculoPorPatente = async (req, res) => {
  try {
    const vehiculo = await Vehiculo.findOne({
      where: { patente: req.params.patente.toUpperCase() },
      include: [
        { model: Cliente },
        { model: OrdenTrabajo, include: [ArchivoECU, FotoVehiculo, Diagnostico] }
      ]
    });
    if (!vehiculo) return res.status(404).json({ error: 'No encontrado' });
    res.json(vehiculo);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const actualizarVehiculo = async (req, res) => {
  try {
    const vehiculo = await Vehiculo.findByPk(req.params.id);
    if (!vehiculo) return res.status(404).json({ error: 'No encontrado' });
    await vehiculo.update(req.body);
    res.json(vehiculo);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

module.exports = { crearVehiculo, obtenerVehiculos, obtenerVehiculoPorId, obtenerVehiculoPorPatente, actualizarVehiculo };
