const { ArchivoECU, OrdenTrabajo, Vehiculo, Cliente } = require("../models");

const obtenerOrdenId = (body) => {
  return body.ordenId || body.orden_id || body.ordenTrabajoId || body.orden_trabajo_id;
};

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const obtenerRutaPublicaArchivo = (file) => {
  if (!file) return null;

  if (file.path && /^https?:\/\//i.test(file.path)) {
    return file.path;
  }

  if (file.filename) {
    return `/uploads/ecu/${file.filename}`;
  }

  return file.path || null;
};

const obtenerArchivosECU = async (req, res) => {
  try {
    const archivos = await ArchivoECU.findAll({
      include: [
        {
          model: OrdenTrabajo,
          include: [
            {
              model: Vehiculo,
              include: [Cliente],
            },
          ],
        },
      ],
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

      estado: limpiarTexto(req.body.estado) || "PENDIENTE_TUNER",
      prioridad: limpiarTexto(req.body.prioridad) || "MEDIA",
      tipo_servicio: limpiarTexto(req.body.tipo_servicio),

      metodo_lectura: limpiarTexto(req.body.metodo_lectura),
      herramienta_lectura: limpiarTexto(req.body.herramienta_lectura),

      marca_ecu: limpiarTexto(req.body.marca_ecu),
      modelo_ecu: limpiarTexto(req.body.modelo_ecu),
      hw: limpiarTexto(req.body.hw),
      sw: limpiarTexto(req.body.sw),
      version_software: limpiarTexto(req.body.version_software),

      notas_operador: limpiarTexto(req.body.notas_operador),
      instrucciones_tuner: limpiarTexto(req.body.instrucciones_tuner),
      observaciones: limpiarTexto(req.body.observaciones),

      archivo_original: obtenerRutaPublicaArchivo(req.file),
      archivo_modificado: null,
    });

    try {
      await orden.update({
        estado: "EN_PROGRAMACION",
      });
    } catch (estadoError) {
      console.warn(
        "No se pudo actualizar estado de orden al crear File Service:",
        estadoError.message
      );
    }

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
    const { id } = req.params;

    const archivo = await ArchivoECU.findByPk(id);

    if (!archivo) {
      return res.status(404).json({
        error: "Registro no encontrado",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "No se cargó el archivo modificado",
      });
    }

    const instruccionesTuner =
      limpiarTexto(req.body.instrucciones_tuner) ||
      limpiarTexto(req.body.instrucciones) ||
      "";

    const observaciones =
      limpiarTexto(req.body.observaciones) ||
      instruccionesTuner ||
      archivo.observaciones ||
      "";

    await archivo.update({
      archivo_modificado: obtenerRutaPublicaArchivo(req.file),
      instrucciones_tuner: instruccionesTuner || archivo.instrucciones_tuner,
      observaciones,
      estado: limpiarTexto(req.body.estado) || "MODIFICADO_LISTO",
    });

    res.json({
      mensaje: "Software modificado cargado con éxito",
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
    const archivo = await ArchivoECU.findByPk(req.params.id, {
      include: [
        {
          model: OrdenTrabajo,
          include: [
            {
              model: Vehiculo,
              include: [Cliente],
            },
          ],
        },
      ],
    });

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

    const payload = {};

    const camposPermitidos = [
      "estado",
      "prioridad",
      "tipo_servicio",
      "metodo_lectura",
      "herramienta_lectura",
      "marca_ecu",
      "modelo_ecu",
      "hw",
      "sw",
      "version_software",
      "notas_operador",
      "instrucciones_tuner",
      "observaciones",
    ];

    camposPermitidos.forEach((campo) => {
      if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
        payload[campo] = limpiarTexto(req.body[campo]);
      }
    });

    await archivo.update(payload);

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

const eliminarArchivoECU = async (req, res) => {
  try {
    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo ECU no encontrado",
      });
    }

    await archivo.destroy();

    res.json({
      mensaje: "Archivo ECU eliminado correctamente",
      id: req.params.id,
    });
  } catch (error) {
    console.error("ERROR AL ELIMINAR ARCHIVO ECU:", error);

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
  eliminarArchivoECU,
};