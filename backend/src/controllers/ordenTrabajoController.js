const {
  OrdenTrabajo,
  Vehiculo,
  Cliente,
  Diagnostico,
  ArchivoECU,
  FotoVehiculo,
} = require("../models");

const ESTADOS_VALIDOS = [
  "RECEPCION",
  "EN TRABAJO",
  "ESPERANDO MAPA",
  "LISTO / CARGAR",
  "ENTREGADO",
];

const normalizarEstado = (estado) => {
  if (!estado) return "RECEPCION";

  const valor = String(estado).trim().toUpperCase();

  const mapa = {
    RECEPCION: "RECEPCION",
    "RECEPCIÓN": "RECEPCION",
    RECEPCIONADO: "RECEPCION",
    RECIBIDO: "RECEPCION",
    "EN TRABAJO": "EN TRABAJO",
    TRABAJANDO: "EN TRABAJO",
    "ESPERANDO MAPA": "ESPERANDO MAPA",
    LISTO: "LISTO / CARGAR",
    "LISTO / CARGAR": "LISTO / CARGAR",
    ENTREGADO: "ENTREGADO",
  };

  return mapa[valor] || "RECEPCION";
};

const crearOrden = async (req, res) => {
  try {
    const {
      vehiculoId,
      vehiculo_id,
      kilometraje,
      motivo_ingreso,
      monto_total,
      estado,
    } = req.body;

    const idVehiculo = vehiculoId || vehiculo_id;

    if (!idVehiculo) {
      return res.status(400).json({
        error: "Falta vehiculoId",
      });
    }

    const vehiculo = await Vehiculo.findByPk(idVehiculo);

    if (!vehiculo) {
      return res.status(404).json({
        error: "Vehículo no encontrado",
      });
    }

    const estadoFinal = normalizarEstado(estado);

    const nuevaOrden = await OrdenTrabajo.create({
      vehiculoId: idVehiculo,
      kilometraje: kilometraje ? Number(kilometraje) : null,
      motivo_ingreso: motivo_ingreso || "",
      monto_total: monto_total ? Number(monto_total) : 0,
      estado: estadoFinal,
    });

    res.status(201).json({
      mensaje: "Orden creada",
      orden: nuevaOrden,
      id: nuevaOrden.id,
      ordenId: nuevaOrden.id,
    });
  } catch (error) {
    console.error("ERROR AL CREAR ORDEN:", error);

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const obtenerOrdenes = async (req, res) => {
  try {
    const ordenes = await OrdenTrabajo.findAll({
      include: [
        { model: Vehiculo, include: Cliente },
        Diagnostico,
        ArchivoECU,
        FotoVehiculo,
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(ordenes);
  } catch (error) {
    console.error("ERROR AL OBTENER ÓRDENES:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const obtenerOrdenPorId = async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findByPk(req.params.id, {
      include: [
        { model: Vehiculo, include: Cliente },
        Diagnostico,
        ArchivoECU,
        FotoVehiculo,
      ],
    });

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    res.json(orden);
  } catch (error) {
    console.error("ERROR AL OBTENER ORDEN:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const actualizarOrden = async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const datosActualizados = { ...req.body };

    if (datosActualizados.estado) {
      datosActualizados.estado = normalizarEstado(datosActualizados.estado);
    }

    await orden.update(datosActualizados);

    res.json({
      mensaje: "Orden actualizada",
      orden,
    });
  } catch (error) {
    console.error("ERROR AL ACTUALIZAR ORDEN:", error);

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const actualizarEstado = async (req, res) => {
  try {
    const { estado } = req.body;
    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const estadoFinal = normalizarEstado(estado);

    if (!ESTADOS_VALIDOS.includes(estadoFinal)) {
      return res.status(400).json({
        error: "Estado no válido",
      });
    }

    await orden.update({
      estado: estadoFinal,
    });

    res.json({
      mensaje: "Estado actualizado",
      orden,
    });
  } catch (error) {
    console.error("ERROR AL ACTUALIZAR ESTADO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  crearOrden,
  obtenerOrdenes,
  obtenerOrdenPorId,
  actualizarOrden,
  actualizarEstado,
};