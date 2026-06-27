const { BitacoraOperativa } = require("../models");
const { crearNotificacionesInternas } = require("./notificacionController");

let tablaPreparada = false;

const TIPOS_VALIDOS = [
  "MEJORA",
  "ERROR_PROCESO",
  "CLIENTE_VOLVIO",
  "RECORDATORIO",
  "OPERACION",
  "OTRO",
];

const PRIORIDADES_VALIDAS = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

const ROLES_RESOLVER = ["OWNER", "ADMIN", "SUPERVISOR"];

const prepararTablaBitacora = async () => {
  if (tablaPreparada) return;

  await BitacoraOperativa.sync();
  tablaPreparada = true;
};

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const normalizarTipo = (tipo) => {
  const valor = limpiarTexto(tipo).toUpperCase();
  return TIPOS_VALIDOS.includes(valor) ? valor : "OPERACION";
};

const normalizarPrioridad = (prioridad) => {
  const valor = limpiarTexto(prioridad).toUpperCase();
  return PRIORIDADES_VALIDAS.includes(valor) ? valor : "MEDIA";
};

const normalizarEnteroOpcional = (valor) => {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
};

const normalizarBoolean = (valor) => {
  if (valor === true || valor === false) return valor;
  if (valor === 1 || valor === "1") return true;
  if (valor === 0 || valor === "0") return false;

  const texto = limpiarTexto(valor).toLowerCase();
  return ["true", "si", "sí", "yes", "on"].includes(texto);
};

const usuarioActual = (req) =>
  req.usuario?.username ||
  req.user?.username ||
  req.usuario?.nombre ||
  req.user?.nombre ||
  "sistema";

const puedeResolver = (req) => ROLES_RESOLVER.includes(req.usuario?.rol);

const listarBitacoraOperativa = async (req, res) => {
  try {
    await prepararTablaBitacora();

    const where = {};

    if (String(req.query.resuelto || "").toLowerCase() === "false") {
      where.resuelto = false;
    }

    if (String(req.query.resuelto || "").toLowerCase() === "true") {
      where.resuelto = true;
    }

    const limit = Math.min(Number(req.query.limit || 80), 200);

    const items = await BitacoraOperativa.findAll({
      where,
      order: [
        ["resuelto", "ASC"],
        ["createdAt", "DESC"],
      ],
      limit,
    });

    res.json({
      items,
      puedeResolver: puedeResolver(req),
    });
  } catch (error) {
    console.error("ERROR LISTANDO BITACORA OPERATIVA:", error);
    res.status(500).json({
      error: "No se pudo listar la bitacora operativa",
    });
  }
};

const crearBitacoraOperativa = async (req, res) => {
  try {
    await prepararTablaBitacora();

    const titulo = limpiarTexto(req.body.titulo);
    const descripcion = limpiarTexto(req.body.descripcion);
    const tipo = normalizarTipo(req.body.tipo);
    const prioridad = normalizarPrioridad(req.body.prioridad);

    if (!titulo) {
      return res.status(400).json({
        error: "Debes ingresar un titulo para la observacion.",
      });
    }

    const item = await BitacoraOperativa.create({
      tipo,
      prioridad,
      titulo,
      descripcion,
      modulo_relacionado: limpiarTexto(req.body.modulo_relacionado) || null,
      ordenId: normalizarEnteroOpcional(req.body.ordenId),
      vehiculoId: normalizarEnteroOpcional(req.body.vehiculoId),
      archivoEcuId: normalizarEnteroOpcional(req.body.archivoEcuId),
      creado_por: usuarioActual(req),
      resuelto: false,
    });

    if (["ALTA", "URGENTE"].includes(prioridad)) {
      try {
        await crearNotificacionesInternas({
          rolesDestino: ["OWNER", "ADMIN", "SUPERVISOR"],
          tipo: "BITACORA_OPERATIVA_PRIORITARIA",
          titulo: "Bitacora operativa prioritaria",
          mensaje: `${prioridad}: ${titulo}`,
          ordenId: item.ordenId,
          archivoECUId: item.archivoEcuId,
        });
      } catch (error) {
        console.warn("No se pudo notificar bitacora prioritaria:", error.message);
      }
    }

    res.status(201).json({
      mensaje: "Observacion operativa registrada",
      item,
    });
  } catch (error) {
    console.error("ERROR CREANDO BITACORA OPERATIVA:", error);
    res.status(500).json({
      error: "No se pudo crear la observacion operativa",
    });
  }
};

const actualizarBitacoraOperativa = async (req, res) => {
  try {
    await prepararTablaBitacora();

    const item = await BitacoraOperativa.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({
        error: "Observacion operativa no encontrada",
      });
    }

    const payload = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "tipo")) {
      payload.tipo = normalizarTipo(req.body.tipo);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "prioridad")) {
      payload.prioridad = normalizarPrioridad(req.body.prioridad);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "titulo")) {
      const titulo = limpiarTexto(req.body.titulo);
      if (!titulo) {
        return res.status(400).json({
          error: "El titulo no puede quedar vacio.",
        });
      }
      payload.titulo = titulo;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "descripcion")) {
      payload.descripcion = limpiarTexto(req.body.descripcion);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "modulo_relacionado")) {
      payload.modulo_relacionado = limpiarTexto(req.body.modulo_relacionado) || null;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "ordenId")) {
      payload.ordenId = normalizarEnteroOpcional(req.body.ordenId);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "vehiculoId")) {
      payload.vehiculoId = normalizarEnteroOpcional(req.body.vehiculoId);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "archivoEcuId")) {
      payload.archivoEcuId = normalizarEnteroOpcional(req.body.archivoEcuId);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "resuelto") && puedeResolver(req)) {
      payload.resuelto = normalizarBoolean(req.body.resuelto);
      payload.resuelto_por = payload.resuelto ? usuarioActual(req) : null;
      payload.resuelto_at = payload.resuelto ? new Date() : null;
    }

    await item.update(payload);

    res.json({
      mensaje: "Observacion operativa actualizada",
      item,
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO BITACORA OPERATIVA:", error);
    res.status(500).json({
      error: "No se pudo actualizar la observacion operativa",
    });
  }
};

const resolverBitacoraOperativa = async (req, res) => {
  try {
    await prepararTablaBitacora();

    if (!puedeResolver(req)) {
      return res.status(403).json({
        error: "No tienes permiso para resolver observaciones operativas",
      });
    }

    const item = await BitacoraOperativa.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({
        error: "Observacion operativa no encontrada",
      });
    }

    await item.update({
      resuelto: true,
      resuelto_por: usuarioActual(req),
      resuelto_at: new Date(),
    });

    res.json({
      mensaje: "Observacion operativa resuelta",
      item,
    });
  } catch (error) {
    console.error("ERROR RESOLVIENDO BITACORA OPERATIVA:", error);
    res.status(500).json({
      error: "No se pudo resolver la observacion operativa",
    });
  }
};

module.exports = {
  listarBitacoraOperativa,
  crearBitacoraOperativa,
  actualizarBitacoraOperativa,
  resolverBitacoraOperativa,
};
