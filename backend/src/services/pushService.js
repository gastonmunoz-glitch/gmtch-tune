const { Op } = require("sequelize");
const sequelize = require("../config/database");
const { PushSubscription, Usuario } = require("../models");

let webPush = null;

try {
  webPush = require("web-push");
} catch (error) {
  console.warn("[push] web-push no disponible:", error.message);
}

let tablaPreparada = false;
let vapidConfigurado = false;
const antiSpamPush = new Map();

const CINCO_MINUTOS_MS = 5 * 60 * 1000;
const PRIORIDADES = {
  BAJA: 1,
  MEDIA: 2,
  ALTA: 3,
  URGENTE: 4,
  CRITICA: 4,
  CRITICO: 4,
};

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const upper = (valor) => limpiarTexto(valor).toUpperCase();

const normalizarPrioridad = (valor) => {
  const prioridad = upper(valor);
  if (prioridad === "CRITICA" || prioridad === "CRITICO") return "URGENTE";
  return PRIORIDADES[prioridad] ? prioridad : "MEDIA";
};

const prioridadCumpleMinimo = (prioridad) => {
  const actual = PRIORIDADES[normalizarPrioridad(prioridad)] || 0;
  const minimo = PRIORIDADES[normalizarPrioridad(process.env.PUSH_MIN_PRIORITY || "ALTA")] || 3;
  return actual >= minimo;
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

const pushHabilitado = () =>
  String(process.env.ENABLE_WEB_PUSH || "false") === "true" &&
  Boolean(process.env.VAPID_PUBLIC_KEY) &&
  Boolean(process.env.VAPID_PRIVATE_KEY) &&
  Boolean(webPush);

const configurarVapid = () => {
  if (!pushHabilitado()) return false;
  if (vapidConfigurado) return true;

  const subject =
    process.env.VAPID_SUBJECT || "mailto:contacto@gmtchtune.com";

  webPush.setVapidDetails(
    subject,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  vapidConfigurado = true;
  return true;
};

const prepararTablaPush = async () => {
  if (tablaPreparada) return;

  await PushSubscription.sync();
  await sequelize.query(`
    ALTER TABLE push_subscriptions
      ADD COLUMN IF NOT EXISTS "usuarioId" UUID,
      ADD COLUMN IF NOT EXISTS endpoint TEXT,
      ADD COLUMN IF NOT EXISTS p256dh TEXT,
      ADD COLUMN IF NOT EXISTS auth TEXT,
      ADD COLUMN IF NOT EXISTS "userAgent" TEXT,
      ADD COLUMN IF NOT EXISTS "deviceLabel" VARCHAR(120),
      ADD COLUMN IF NOT EXISTS platform VARCHAR(80),
      ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "lastPushAt" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "lastError" TEXT
  `);
  tablaPreparada = true;
};

const obtenerEstadoPush = async (usuario = null) => {
  await prepararTablaPush();

  const enabled = pushHabilitado();
  const configured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  const ownWhere = usuario?.id ? { usuarioId: usuario.id, active: true } : null;

  const misDispositivos = ownWhere
    ? await PushSubscription.count({ where: ownWhere })
    : 0;

  const respuesta = {
    enabled,
    configured,
    webPushDisponible: Boolean(webPush),
    minPriority: normalizarPrioridad(process.env.PUSH_MIN_PRIORITY || "ALTA"),
    misDispositivos,
  };

  if (["OWNER", "ADMIN"].includes(upper(usuario?.rol))) {
    respuesta.totalActivas = await PushSubscription.count({ where: { active: true } });
    respuesta.totalInactivas = await PushSubscription.count({ where: { active: false } });
  }

  return respuesta;
};

const extraerSubscription = (body = {}) => {
  const subscription = body.subscription || body;
  const endpoint = limpiarTexto(subscription.endpoint);
  const keys = subscription.keys || {};
  const p256dh = limpiarTexto(keys.p256dh || subscription.p256dh);
  const auth = limpiarTexto(keys.auth || subscription.auth);

  return {
    endpoint,
    p256dh,
    auth,
  };
};

const registrarSuscripcion = async ({ usuario, body, userAgent }) => {
  await prepararTablaPush();

  const datos = extraerSubscription(body);
  if (!usuario?.id || !datos.endpoint || !datos.p256dh || !datos.auth) {
    const error = new Error("Suscripcion push incompleta");
    error.statusCode = 400;
    throw error;
  }

  const [registro, creado] = await PushSubscription.findOrCreate({
    where: { endpoint: datos.endpoint },
    defaults: {
      usuarioId: usuario.id,
      endpoint: datos.endpoint,
      p256dh: datos.p256dh,
      auth: datos.auth,
      userAgent,
      deviceLabel: limpiarTexto(body.deviceLabel) || null,
      platform: limpiarTexto(body.platform) || null,
      active: true,
      lastSeenAt: new Date(),
      lastError: null,
    },
  });

  if (!creado) {
    await registro.update({
      usuarioId: usuario.id,
      p256dh: datos.p256dh,
      auth: datos.auth,
      userAgent,
      deviceLabel: limpiarTexto(body.deviceLabel) || registro.deviceLabel,
      platform: limpiarTexto(body.platform) || registro.platform,
      active: true,
      lastSeenAt: new Date(),
      lastError: null,
    });
  }

  return registro;
};

const desregistrarSuscripcion = async ({ usuario, body }) => {
  await prepararTablaPush();

  const datos = extraerSubscription(body);
  if (!usuario?.id) return 0;

  const where = {
    usuarioId: usuario.id,
  };

  if (datos.endpoint) {
    where.endpoint = datos.endpoint;
  }

  const [actualizados] = await PushSubscription.update(
    {
      active: false,
      lastSeenAt: new Date(),
    },
    { where }
  );

  return actualizados;
};

const limpiarCacheAntiSpam = () => {
  const limite = Date.now() - CINCO_MINUTOS_MS;
  for (const [key, timestamp] of antiSpamPush.entries()) {
    if (timestamp < limite) antiSpamPush.delete(key);
  }
};

const puedeEnviarPorAntiSpam = ({ usuarioId, tag }) => {
  limpiarCacheAntiSpam();
  const key = `${usuarioId || "anon"}:${tag || "general"}`;
  const ultimo = antiSpamPush.get(key);
  if (ultimo && Date.now() - ultimo < CINCO_MINUTOS_MS) {
    return false;
  }
  antiSpamPush.set(key, Date.now());
  return true;
};

const payloadSuscripcion = (suscripcion) => ({
  endpoint: suscripcion.endpoint,
  keys: {
    p256dh: suscripcion.p256dh,
    auth: suscripcion.auth,
  },
});

const enviarPushASuscripcion = async (suscripcion, payload) => {
  if (!configurarVapid()) {
    return { enviada: false, motivo: "push_disabled" };
  }

  try {
    await webPush.sendNotification(
      payloadSuscripcion(suscripcion),
      JSON.stringify(payload)
    );

    await suscripcion.update({
      lastPushAt: new Date(),
      lastError: null,
    });

    return { enviada: true };
  } catch (error) {
    const statusCode = Number(error.statusCode || error.status);
    const invalida = statusCode === 404 || statusCode === 410;

    await suscripcion.update({
      active: invalida ? false : suscripcion.active,
      lastError: `${statusCode || "ERROR"} ${limpiarTexto(error.message).slice(0, 180)}`,
    });

    console.warn("[push] envio fallido:", statusCode || error.message);
    return { enviada: false, motivo: invalida ? "subscription_invalid" : "send_error" };
  }
};

const buscarUsuariosDestino = async (notificacion) => {
  if (notificacion.usuarioDestino) {
    const usuario = await Usuario.findOne({
      where: {
        username: notificacion.usuarioDestino,
        activo: true,
      },
      attributes: ["id", "username", "rol", "activo"],
    });
    return usuario ? [usuario] : [];
  }

  if (notificacion.rolDestino) {
    return Usuario.findAll({
      where: {
        rol: notificacion.rolDestino,
        activo: true,
      },
      attributes: ["id", "username", "rol", "activo"],
    });
  }

  return [];
};

const prioridadNotificacion = (notificacion) => {
  const metadata = normalizarMetadata(notificacion.metadata);
  return normalizarPrioridad(
    metadata.prioridad ||
      metadata.severidad ||
      notificacion.prioridad ||
      (upper(notificacion.tipo).includes("URGENTE") ? "URGENTE" : "MEDIA")
  );
};

const crearPayloadNotificacion = (notificacion, prioridad) => {
  const entidadTipo =
    notificacion.entidad_tipo ||
    (notificacion.archivoECUId ? "ARCHIVO_ECU" : null) ||
    (notificacion.ordenId ? "ORDEN_TRABAJO" : null) ||
    "NOTIFICACION";
  const entidadId =
    notificacion.entidad_id ||
    notificacion.archivoECUId ||
    notificacion.ordenId ||
    notificacion.id;
  const tag = `gmtch-${entidadTipo}-${entidadId}-${prioridad}`.toLowerCase();

  return {
    title: notificacion.titulo || "GMTCH Tune OS",
    body: notificacion.mensaje || "Nueva alerta operativa",
    url: notificacion.accion_url || "/login",
    prioridad,
    entidad_tipo: entidadTipo,
    entidad_id: entidadId,
    icon: "/pwa/icon-192.png",
    badge: "/pwa/icon-192.png",
    tag,
    data: {
      url: notificacion.accion_url || "/login",
    },
  };
};

const enviarPushParaNotificaciones = async (notificaciones = []) => {
  if (!Array.isArray(notificaciones) || !notificaciones.length || !pushHabilitado()) {
    return { enviadas: 0, omitidas: notificaciones.length || 0 };
  }

  await prepararTablaPush();

  let enviadas = 0;
  let omitidas = 0;

  for (const notificacion of notificaciones) {
    const prioridad = prioridadNotificacion(notificacion);
    if (!prioridadCumpleMinimo(prioridad)) {
      omitidas += 1;
      continue;
    }

    let usuarios = await buscarUsuariosDestino(notificacion);
    if (normalizarPrioridad(prioridad) === "URGENTE") {
      const administradores = await Usuario.findAll({
        where: {
          rol: { [Op.in]: ["OWNER", "ADMIN"] },
          activo: true,
        },
        attributes: ["id", "username", "rol", "activo"],
      });
      const vistos = new Set(usuarios.map((usuario) => String(usuario.id)));
      usuarios = [
        ...usuarios,
        ...administradores.filter((usuario) => !vistos.has(String(usuario.id))),
      ];
    }
    if (!usuarios.length) {
      omitidas += 1;
      continue;
    }

    const ids = [...new Set(usuarios.map((usuario) => usuario.id).filter(Boolean))];
    const suscripciones = await PushSubscription.findAll({
      where: {
        usuarioId: { [Op.in]: ids },
        active: true,
      },
    });

    const payload = crearPayloadNotificacion(notificacion, prioridad);

    for (const suscripcion of suscripciones) {
      if (!puedeEnviarPorAntiSpam({
        usuarioId: suscripcion.usuarioId,
        tag: payload.tag,
      })) {
        omitidas += 1;
        continue;
      }

      const resultado = await enviarPushASuscripcion(suscripcion, payload);
      if (resultado.enviada) enviadas += 1;
      else omitidas += 1;
    }
  }

  return { enviadas, omitidas };
};

const enviarPushAUsuario = async ({ usuarioId, titulo, mensaje, url, prioridad = "ALTA" }) => {
  await prepararTablaPush();

  const suscripciones = await PushSubscription.findAll({
    where: { usuarioId, active: true },
  });
  const payload = {
    title: titulo || "GMTCH Tune OS",
    body: mensaje || "Alerta operativa",
    url: url || "/",
    prioridad: normalizarPrioridad(prioridad),
    icon: "/pwa/icon-192.png",
    badge: "/pwa/icon-192.png",
    tag: `gmtch-test-${usuarioId}-${Date.now()}`,
    data: { url: url || "/" },
  };

  let enviadas = 0;
  for (const suscripcion of suscripciones) {
    const resultado = await enviarPushASuscripcion(suscripcion, payload);
    if (resultado.enviada) enviadas += 1;
  }
  return { enviadas, total: suscripciones.length };
};

const enviarPushPorRoles = async ({ roles = [], titulo, mensaje, url, prioridad = "ALTA" }) => {
  await prepararTablaPush();

  const usuarios = await Usuario.findAll({
    where: {
      rol: { [Op.in]: roles },
      activo: true,
    },
    attributes: ["id"],
  });

  const ids = usuarios.map((usuario) => usuario.id);
  const suscripciones = ids.length
    ? await PushSubscription.findAll({
        where: {
          usuarioId: { [Op.in]: ids },
          active: true,
        },
      })
    : [];

  const payload = {
    title: titulo || "Alerta critica GMTCH",
    body: mensaje || "Revision operativa requerida",
    url: url || "/",
    prioridad: normalizarPrioridad(prioridad),
    entidad_tipo: "TEST_CRITICO",
    entidad_id: "owner-admin",
    icon: "/pwa/icon-192.png",
    badge: "/pwa/icon-192.png",
    tag: `gmtch-test-critical-${Date.now()}`,
    data: { url: url || "/" },
  };

  let enviadas = 0;
  for (const suscripcion of suscripciones) {
    const resultado = await enviarPushASuscripcion(suscripcion, payload);
    if (resultado.enviada) enviadas += 1;
  }
  return { enviadas, total: suscripciones.length };
};

module.exports = {
  obtenerEstadoPush,
  registrarSuscripcion,
  desregistrarSuscripcion,
  enviarPushParaNotificaciones,
  enviarPushAUsuario,
  enviarPushPorRoles,
  pushHabilitado,
};
