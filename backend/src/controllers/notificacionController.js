const { Op } = require("sequelize");
const sequelize = require("../config/database");
const { Notificacion } = require("../models");

let tablaPreparada = false;

const prepararTablaNotificaciones = async () => {
  if (tablaPreparada) return;

  await Notificacion.sync();
  await sequelize.query(`
    ALTER TABLE notificaciones
      ADD COLUMN IF NOT EXISTS accion_url TEXT,
      ADD COLUMN IF NOT EXISTS accion_tipo VARCHAR(80),
      ADD COLUMN IF NOT EXISTS entidad_tipo VARCHAR(80),
      ADD COLUMN IF NOT EXISTS entidad_id VARCHAR(80),
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS recordatorio_de_id INTEGER,
      ADD COLUMN IF NOT EXISTS recordatorio_nivel VARCHAR(30)
  `);
  await sequelize.query(`
    UPDATE notificaciones
    SET metadata = '{}'::jsonb
    WHERE metadata IS NULL
  `);
  tablaPreparada = true;
};

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const normalizarMetadata = (valor) => {
  if (!valor) return {};
  if (typeof valor === "object" && !Array.isArray(valor)) return valor;

  if (typeof valor === "string" && valor.trim()) {
    try {
      const parsed = JSON.parse(valor);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }

  return {};
};

const accionPortalPorTipo = (tipo, portalFileId) => {
  if (!portalFileId) return null;

  if (tipo === "PORTAL_FILE_NUEVA_LECTURA") {
    return `/portal-admin?fileId=${portalFileId}#nueva-lectura`;
  }

  if (tipo === "PORTAL_FILE_CORRECCION") {
    return `/portal-admin?fileId=${portalFileId}#correccion`;
  }

  return `/portal-admin?fileId=${portalFileId}`;
};

const inferirAccionNotificacion = ({
  tipo,
  ordenId,
  archivoECUId,
  accion_url,
  accion_tipo,
  entidad_tipo,
  entidad_id,
  metadata,
}) => {
  const tipoSeguro = limpiarTexto(tipo).toUpperCase();
  const metadataSegura = normalizarMetadata(metadata);
  const portalFileId =
    metadataSegura.portalFileId ||
    metadataSegura.fileId ||
    (limpiarTexto(entidad_tipo).toUpperCase() === "PORTAL_FILE"
      ? entidad_id
      : null);

  let url = limpiarTexto(accion_url) || null;
  let accionTipoFinal = limpiarTexto(accion_tipo) || null;
  let entidadTipoFinal = limpiarTexto(entidad_tipo) || null;
  let entidadIdFinal = limpiarTexto(entidad_id) || null;

  if (!url && tipoSeguro.startsWith("PORTAL_FILE_")) {
    url = accionPortalPorTipo(tipoSeguro, portalFileId);
    accionTipoFinal = accionTipoFinal || "ABRIR_PORTAL_ADMIN_FILE";
    entidadTipoFinal = entidadTipoFinal || "PORTAL_FILE";
    entidadIdFinal = entidadIdFinal || (portalFileId ? String(portalFileId) : null);
  }

  if (!url && tipoSeguro === "CORRECCION_TECNICA_SOLICITADA" && ordenId) {
    url = `/ordenes?ordenId=${ordenId}#postventa`;
    accionTipoFinal = accionTipoFinal || "ABRIR_POSTVENTA_TECNICA";
    entidadTipoFinal = entidadTipoFinal || "ORDEN_TRABAJO";
    entidadIdFinal = entidadIdFinal || String(ordenId);
  }

  if (!url && tipoSeguro === "BITACORA_OPERATIVA_PRIORITARIA") {
    url = "/#bitacora";
    accionTipoFinal = accionTipoFinal || "ABRIR_BITACORA";
    entidadTipoFinal = entidadTipoFinal || "BITACORA_OPERATIVA";
    entidadIdFinal =
      entidadIdFinal || (metadataSegura.bitacoraId ? String(metadataSegura.bitacoraId) : null);
  }

  if (!url && tipoSeguro.startsWith("ORDEN_ASIGNADA_") && ordenId) {
    url = `/ordenes?ordenId=${ordenId}`;
    accionTipoFinal = accionTipoFinal || "ABRIR_ORDEN";
    entidadTipoFinal = entidadTipoFinal || "ORDEN_TRABAJO";
    entidadIdFinal = entidadIdFinal || String(ordenId);
  }

  if (!url && tipoSeguro === "ORDEN_LISTA_ENTREGA" && ordenId) {
    url = `/ordenes?ordenId=${ordenId}#entrega`;
    accionTipoFinal = accionTipoFinal || "ABRIR_ENTREGA";
    entidadTipoFinal = entidadTipoFinal || "ORDEN_TRABAJO";
    entidadIdFinal = entidadIdFinal || String(ordenId);
  }

  if (!url && archivoECUId) {
    const hash =
      tipoSeguro === "POST_ESCRITURA_PENDIENTE" ? "#post-escritura" : "";
    url = `/archivos-ecu?archivoId=${archivoECUId}${hash}`;
    accionTipoFinal = accionTipoFinal || "ABRIR_ARCHIVO_ECU";
    entidadTipoFinal = entidadTipoFinal || "ARCHIVO_ECU";
    entidadIdFinal = entidadIdFinal || String(archivoECUId);
  }

  if (!url && ordenId) {
    url = `/ordenes?ordenId=${ordenId}`;
    accionTipoFinal = accionTipoFinal || "ABRIR_ORDEN";
    entidadTipoFinal = entidadTipoFinal || "ORDEN_TRABAJO";
    entidadIdFinal = entidadIdFinal || String(ordenId);
  }

  return {
    accion_url: url,
    accion_tipo: accionTipoFinal,
    entidad_tipo: entidadTipoFinal,
    entidad_id: entidadIdFinal,
    metadata: metadataSegura,
  };
};

const datosUsuarioActual = (req) => {
  const usuario = req.usuario || req.user || {};

  return {
    username: usuario.username || usuario.nombre || null,
    rol: usuario.rol || null,
  };
};

const whereVisiblesParaUsuario = (req) => {
  const { username, rol } = datosUsuarioActual(req);

  if (rol === "OWNER") {
    return {};
  }

  return {
    [Op.or]: [
      username ? { usuarioDestino: username } : null,
      rol ? { rolDestino: rol } : null,
    ].filter(Boolean),
  };
};

const TIPOS_INSISTENTES = [
  "POST_ESCRITURA_PENDIENTE",
  "PORTAL_FILE_NUEVO",
  "PORTAL_FILE_NUEVA_LECTURA",
  "PORTAL_FILE_CORRECCION",
  "CORRECCION_TECNICA_SOLICITADA",
  "BITACORA_OPERATIVA_PRIORITARIA",
  "ORDEN_LISTA_ENTREGA",
  "FILE_REQUIERE_CORRECCION",
  "FILE_MOD_LISTO",
  "ORDEN_ASIGNADA_ECU",
  "FILE_TUNER_ASIGNADO",
  "FILE_OPERADOR_ECU_ASIGNADO",
  "FILE_SLAVE_ASIGNADO",
];

const esTipoInsistente = (tipo) => {
  const normalizado = limpiarTexto(tipo).toUpperCase();
  return TIPOS_INSISTENTES.some((item) => normalizado.includes(item));
};

const esPrioridadAlta = (notificacion, metadata = {}) => {
  const texto = [
    notificacion.tipo,
    notificacion.titulo,
    notificacion.mensaje,
    metadata.prioridad,
    metadata.severidad,
    metadata.recordatorio_nivel,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  return (
    texto.includes("URGENTE") ||
    texto.includes("CRITICA") ||
    texto.includes("CRÍTICA") ||
    texto.includes("ALTA") ||
    texto.includes("REQUIERE_CORRECCION") ||
    texto.includes("CORRECCION") ||
    texto.includes("PAGO") ||
    texto.includes("NUEVA_LECTURA")
  );
};

const crearRecordatoriosPendientes = async (req) => {
  const ahora = new Date();
  const haceDosHoras = new Date(ahora.getTime() - 2 * 60 * 60 * 1000);

  const pendientes = await Notificacion.findAll({
    where: {
      ...whereVisiblesParaUsuario(req),
      leida: false,
      createdAt: { [Op.lte]: haceDosHoras },
      tipo: { [Op.notLike]: "RECORDATORIO_%" },
    },
    order: [["createdAt", "ASC"]],
    limit: 80,
  });

  for (const notificacion of pendientes) {
    if (!esTipoInsistente(notificacion.tipo)) continue;

    const metadata = normalizarMetadata(notificacion.metadata);
    const horas = (ahora.getTime() - new Date(notificacion.createdAt).getTime()) / 36e5;
    const nivel =
      horas >= 3 && esPrioridadAlta(notificacion, metadata) ? "FUERTE" : "SUAVE";

    const existente = await Notificacion.findOne({
      where: {
        recordatorio_de_id: notificacion.id,
        recordatorio_nivel: nivel,
      },
    });

    if (existente) continue;

    await Notificacion.create({
      usuarioDestino: notificacion.usuarioDestino,
      rolDestino: notificacion.rolDestino,
      tipo: "RECORDATORIO_OPERATIVO",
      titulo:
        nivel === "FUERTE"
          ? "Recordatorio fuerte: accion pendiente"
          : "Recordatorio operativo",
      mensaje:
        nivel === "FUERTE"
          ? `Sigue pendiente: ${notificacion.titulo}. ${notificacion.mensaje || ""}`.trim()
          : `Aun pendiente: ${notificacion.titulo}. ${notificacion.mensaje || ""}`.trim(),
      ordenId: notificacion.ordenId,
      archivoECUId: notificacion.archivoECUId,
      accion_url: notificacion.accion_url,
      accion_tipo: notificacion.accion_tipo,
      entidad_tipo: notificacion.entidad_tipo,
      entidad_id: notificacion.entidad_id,
      metadata: {
        ...metadata,
        recordatorio: true,
        recordatorio_nivel: nivel,
        notificacion_original_id: notificacion.id,
        tipo_original: notificacion.tipo,
      },
      recordatorio_de_id: notificacion.id,
      recordatorio_nivel: nivel,
    });
  }
};

const crearNotificacionesInternas = async ({
  usuariosDestino = [],
  rolesDestino = [],
  tipo,
  titulo,
  mensaje,
  ordenId = null,
  archivoECUId = null,
  accion_url = null,
  accion_tipo = null,
  entidad_tipo = null,
  entidad_id = null,
  metadata = {},
}) => {
  try {
    await prepararTablaNotificaciones();

    const accion = inferirAccionNotificacion({
      tipo,
      ordenId,
      archivoECUId,
      accion_url,
      accion_tipo,
      entidad_tipo,
      entidad_id,
      metadata,
    });

    const destinosUsuario = usuariosDestino
      .filter(Boolean)
      .map((usuarioDestino) => ({
        usuarioDestino,
        rolDestino: null,
        tipo,
        titulo,
        mensaje,
        ordenId,
        archivoECUId,
        ...accion,
      }));

    const destinosRol = rolesDestino
      .filter(Boolean)
      .map((rolDestino) => ({
        usuarioDestino: null,
        rolDestino,
        tipo,
        titulo,
        mensaje,
        ordenId,
        archivoECUId,
        ...accion,
      }));

    const payload = [...destinosUsuario, ...destinosRol];

    if (!payload.length || !tipo || !titulo) {
      return [];
    }

    return await Notificacion.bulkCreate(payload);
  } catch (error) {
    console.warn("No se pudo crear notificacion interna:", error.message);
    return [];
  }
};

const obtenerNotificaciones = async (req, res) => {
  try {
    await prepararTablaNotificaciones();
    await crearRecordatoriosPendientes(req);

    const notificaciones = await Notificacion.findAll({
      where: whereVisiblesParaUsuario(req),
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    const noLeidas = await Notificacion.count({
      where: {
        ...whereVisiblesParaUsuario(req),
        leida: false,
      },
    });

    res.json({
      notificaciones,
      noLeidas,
    });
  } catch (error) {
    console.error("ERROR OBTENIENDO NOTIFICACIONES:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const marcarLeida = async (req, res) => {
  try {
    await prepararTablaNotificaciones();

    const notificacion = await Notificacion.findOne({
      where: {
        id: req.params.id,
        ...whereVisiblesParaUsuario(req),
      },
    });

    if (!notificacion) {
      return res.status(404).json({
        error: "Notificacion no encontrada",
      });
    }

    await notificacion.update({
      leida: true,
      leida_at: new Date(),
    });

    res.json({
      mensaje: "Notificacion marcada como leida",
      notificacion,
    });
  } catch (error) {
    console.error("ERROR MARCANDO NOTIFICACION:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const marcarTodasLeidas = async (req, res) => {
  try {
    await prepararTablaNotificaciones();

    const [cantidad] = await Notificacion.update(
      {
        leida: true,
        leida_at: new Date(),
      },
      {
        where: {
          ...whereVisiblesParaUsuario(req),
          leida: false,
        },
      }
    );

    res.json({
      mensaje: "Notificaciones marcadas como leidas",
      cantidad,
    });
  } catch (error) {
    console.error("ERROR MARCANDO NOTIFICACIONES:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  obtenerNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
  crearNotificacionesInternas,
};
