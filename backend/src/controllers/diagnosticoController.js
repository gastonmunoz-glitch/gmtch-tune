const { Diagnostico, OrdenTrabajo } = require('../models');

const crearDiagnostico = async (req, res) => {
  try {
    const { ordenId, fallas_detectadas, codigos_dtc, informe_scanner, observaciones } = req.body;
    const nuevoDiagnostico = await Diagnostico.create({
      ordenId,
      fallas_detectadas,
      codigos_dtc,
      informe_scanner,
      observaciones
    });
    res.status(201).json({ mensaje: 'Diagnóstico creado', diagnostico: nuevoDiagnostico });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const obtenerDiagnosticos = async (req, res) => {
  try {
    const diagnosticos = await Diagnostico.findAll({ include: OrdenTrabajo });
    res.json(diagnosticos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const obtenerDiagnosticoPorId = async (req, res) => {
  try {
    const diagnostico = await Diagnostico.findByPk(req.params.id, { include: OrdenTrabajo });
    if (!diagnostico) return res.status(404).json({ error: 'Diagnóstico no encontrado' });
    res.json(diagnostico);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const actualizarDiagnostico = async (req, res) => {
  try {
    const diagnostico = await Diagnostico.findByPk(req.params.id);
    if (!diagnostico) return res.status(404).json({ error: 'Diagnóstico no encontrado' });
    await diagnostico.update(req.body);
    res.json({ mensaje: 'Diagnóstico actualizado', diagnostico });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { crearDiagnostico, obtenerDiagnosticos, obtenerDiagnosticoPorId, actualizarDiagnostico };
