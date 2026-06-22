const {
  OrdenTrabajo,
  Vehiculo,
  Cliente,
  Diagnostico,
  ArchivoECU,
  FotoVehiculo,
} = require("../models");

const PRIORIDAD_PESO = {
  URGENTE: 1,
  ALTA: 2,
  MEDIA: 3,
  BAJA: 4,
};

const ESTADOS_VALIDOS = [
  "RECEPCIONADO",
  "PARA_DIAGNOSTICO",
  "EN_PROGRAMACION",
  "PARA_MECANICA",
  "EN_MECANICA",
  "LISTO_PARA_ENTREGA",
  "ENTREGADO",
];

const normalizarPrioridad = (prioridad) => {
  const valor = String(prioridad || "MEDIA").trim().toUpperCase();
  return PRIORIDAD_PESO[valor] ? valor : "MEDIA";
};

const normalizarEstado = (estado) => {
  if (!estado) return "RECEPCIONADO";

  const valor = String(estado).trim().toUpperCase();

  const mapa = {
    RECEPCION: "RECEPCIONADO",
    "RECEPCIÓN": "RECEPCIONADO",
    RECEPCIONADO: "RECEPCIONADO",
    RECIBIDO: "RECEPCIONADO",

    PARA_DIAGNOSTICO: "PARA_DIAGNOSTICO",
    "PARA DIAGNOSTICO": "PARA_DIAGNOSTICO",
    "PARA DIAGNÓSTICO": "PARA_DIAGNOSTICO",

    "EN TRABAJO": "EN_PROGRAMACION",
    TRABAJANDO: "EN_PROGRAMACION",
    ESPERANDO_MAPA: "EN_PROGRAMACION",
    "ESPERANDO MAPA": "EN_PROGRAMACION",
    EN_PROGRAMACION: "EN_PROGRAMACION",
    "EN PROGRAMACION": "EN_PROGRAMACION",
    "EN PROGRAMACIÓN": "EN_PROGRAMACION",

    PARA_MECANICA: "PARA_MECANICA",
    "PARA MECANICA": "PARA_MECANICA",
    "PARA MECÁNICA": "PARA_MECANICA",

    EN_MECANICA: "EN_MECANICA",
    "EN MECANICA": "EN_MECANICA",
    "EN MECÁNICA": "EN_MECANICA",

    LISTO: "LISTO_PARA_ENTREGA",
    "LISTO / CARGAR": "LISTO_PARA_ENTREGA",
    LISTO_PARA_ENTREGA: "LISTO_PARA_ENTREGA",
    "LISTO PARA ENTREGA": "LISTO_PARA_ENTREGA",

    ENTREGADO: "ENTREGADO",
  };

  return mapa[valor] || "RECEPCIONADO";
};

const puedeCobrar = (req) => {
  const rol = req.usuario?.rol;
  const username = String(req.usuario?.username || "").toLowerCase();

  return rol === "OWNER" || rol === "ADMIN" || username === "camila" || username === "gaston";
};

const ordenarFilaTrabajo = (a, b) => {
  const pa = PRIORIDAD_PESO[a.prioridad] || 99;
  const pb = PRIORIDAD_PESO[b.prioridad] || 99;

  if (pa !== pb) return pa - pb;

  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
};

const crearOrden = async (req, res) => {
  try {
    const {
      vehiculoId,
      vehiculo_id,
      kilometraje,
      motivo_ingreso,
      monto_total,
      prioridad,
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

    const nuevaOrden = await OrdenTrabajo.create({
      vehiculoId: idVehiculo,
      kilometraje: kilometraje ? Number(kilometraje) : null,
      motivo_ingreso: motivo_ingreso || "",
      monto_total: monto_total ? Number(monto_total) : 0,
      prioridad: normalizarPrioridad(prioridad),
      estado: normalizarEstado(estado),
      estado_pago: "PENDIENTE",
      medio_pago: "PENDIENTE",
      monto_pagado: 0,
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
        { model: Vehiculo, include: [Cliente] },
        Diagnostico,
        ArchivoECU,
        FotoVehiculo,
      ],
    });

    const data = ordenes.map((orden) => orden.toJSON()).sort(ordenarFilaTrabajo);

    res.json(data);
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
        { model: Vehiculo, include: [Cliente] },
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

    if (datosActualizados.prioridad) {
      datosActualizados.prioridad = normalizarPrioridad(datosActualizados.prioridad);
    }

    const camposPago = [
      "estado_pago",
      "medio_pago",
      "monto_pagado",
      "fecha_pago",
      "cobrado_por",
      "observacion_pago",
    ];

    const tocaPago = camposPago.some((campo) =>
      Object.prototype.hasOwnProperty.call(datosActualizados, campo)
    );

    const intentaEntregar = datosActualizados.estado === "ENTREGADO";

    if ((tocaPago || intentaEntregar) && !puedeCobrar(req)) {
      return res.status(403).json({
        error: "Solo Gastón o Camila pueden cerrar cobros o entregar la orden",
      });
    }

    if (tocaPago) {
      datosActualizados.cobrado_por =
        req.usuario?.nombre || req.usuario?.username || datosActualizados.cobrado_por || "Sistema";

      if (datosActualizados.estado_pago === "PAGADO" && !datosActualizados.fecha_pago) {
        datosActualizados.fecha_pago = new Date();
      }
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

    if (estadoFinal === "ENTREGADO" && !puedeCobrar(req)) {
      return res.status(403).json({
        error: "Solo Gastón o Camila pueden entregar la orden",
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