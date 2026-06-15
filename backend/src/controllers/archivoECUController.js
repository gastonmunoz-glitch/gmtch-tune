const { ArchivoECU, OrdenTrabajo } = require("../models");

const obtenerOrdenId = (body) => {
  return body.ordenId || body.orden_id || body.ordenTrabajoId || body.orden_trabajo_id;
};

const obtenerRutaPublicaArchivo = (file) => {
  if (!file) return null;

  if (file.filename) {
    return `/uploads/ecu/${file.filename}`;
  }

  return file.path || null;
};

const obtenerArchivosECU = async (req, res) => {
  try {
    const archivos = await ArchivoECU.findAll({
      order: [["id", "DESC"]],
    });

    res.json(archivos);
  } catch (error) {
    console.error("ERROR AL OBTENER ARCHIVOS ECU:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const crearArchivoECU = async (req, res) => {
  try {
    console.log("BODY ECU:", req.body);
    console.log("FILE ECU:", req.file);

    if (!req.file) {
      return res.status(400).json({
        error: "No se recibió archivo original",
      });
    }

    const ordenId = Number(obtenerOrdenId(req.body));

    if (!ordenId || Number.isNaN(ordenId)) {
      return res.status(400).json({
        error: "Falta ordenId válido",
      });
    }

    const orden = await OrdenTrabajo.findByPk(ordenId);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const nuevoArchivo = await ArchivoECU.create({
      ordenId,
      marca_ecu: req.body.marca_ecu || "",
      modelo_ecu: req.body.modelo_ecu || "",
      version_software: req.body.version_software || "",
      observaciones: req.body.observaciones || "",
      archivo_original: obtenerRutaPublicaArchivo(req.file),
      archivo_modificado: null,
    });

    res.status(201).json({
      mensaje: "Archivo ECU guardado correctamente",
      archivo: nuevoArchivo,
      id: nuevoArchivo.id,
      archivoECUId: nuevoArchivo.id,
    });
  } catch (error) {
    console.error("ERROR AL CREAR ARCHIVO ECU:", error);

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const subirArchivoModificado = async (req, res) => {
  try {
    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Registro de ECU no encontrado",
      });
    }

    const actualizaciones = {};

    if (req.file) {
      actualizaciones.archivo_modificado = obtenerRutaPublicaArchivo(req.file);
    }

    if (req.body.observaciones) {
      actualizaciones.observaciones = req.body.observaciones;
    }

    if (!req.file && !req.body.observaciones) {
      return res.status(400).json({
        error: "No se recibió archivo ni observaciones para actualizar",
      });
    }

    await archivo.update(actualizaciones);

    res.json({
      mensaje: "Expediente técnico actualizado",
      archivo,
    });
  } catch (error) {
    console.error("ERROR AL SUBIR ARCHIVO MODIFICADO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const obtenerArchivoECUPorId = async (req, res) => {
  try {
    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "No encontrado",
      });
    }

    res.json(archivo);
  } catch (error) {
    console.error("ERROR AL OBTENER ARCHIVO ECU:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const actualizarArchivoECU = async (req, res) => {
  try {
    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "No encontrado",
      });
    }

    await archivo.update(req.body);

    res.json({
      mensaje: "Archivo ECU actualizado",
      archivo,
    });
  } catch (error) {
    console.error("ERROR AL ACTUALIZAR ARCHIVO ECU:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  crearArchivoECU,
  obtenerArchivosECU,
  obtenerArchivoECUPorId,
  actualizarArchivoECU,
  subirArchivoModificado,
};