const {
  obtenerEstadoPush,
  registrarSuscripcion,
  desregistrarSuscripcion,
  enviarPushAUsuario,
  enviarPushPorRoles,
} = require("../services/pushService");

const datosUsuario = (req) => req.usuario || req.user || {};

const obtenerStatusPush = async (req, res) => {
  try {
    const estado = await obtenerEstadoPush(datosUsuario(req));
    return res.json(estado);
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo obtener estado de Web Push",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const obtenerVapidPublicKey = async (req, res) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY || "";
    return res.json({
      publicKey,
      enabled:
        String(process.env.ENABLE_WEB_PUSH || "false") === "true" && Boolean(publicKey),
    });
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo obtener clave publica VAPID",
    });
  }
};

const subscribe = async (req, res) => {
  try {
    const registro = await registrarSuscripcion({
      usuario: datosUsuario(req),
      body: req.body || {},
      userAgent: req.headers["user-agent"] || "",
    });

    return res.json({
      mensaje: "Dispositivo registrado para notificaciones push",
      device: {
        id: registro.id,
        active: registro.active,
        deviceLabel: registro.deviceLabel,
        platform: registro.platform,
        lastSeenAt: registro.lastSeenAt,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.statusCode === 400 ? error.message : "No se pudo registrar dispositivo",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const unsubscribe = async (req, res) => {
  try {
    const actualizados = await desregistrarSuscripcion({
      usuario: datosUsuario(req),
      body: req.body || {},
    });

    return res.json({
      mensaje: "Dispositivo desregistrado",
      actualizados,
    });
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo desregistrar dispositivo",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const testPush = async (req, res) => {
  try {
    const usuario = datosUsuario(req);
    const resultado = await enviarPushAUsuario({
      usuarioId: usuario.id,
      titulo: "Prueba GMTCH Tune OS",
      mensaje: "Notificaciones push activas en este dispositivo.",
      url: "/",
      prioridad: "MEDIA",
    });

    return res.json({
      mensaje: "Prueba push enviada al usuario actual",
      ...resultado,
    });
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo enviar prueba push",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const testCriticalPush = async (req, res) => {
  try {
    const resultado = await enviarPushPorRoles({
      roles: ["OWNER", "ADMIN"],
      titulo: "Alerta critica GMTCH",
      mensaje: "Prueba critica Web Push para OWNER/ADMIN.",
      url: "/",
      prioridad: "URGENTE",
    });

    return res.json({
      mensaje: "Prueba critica enviada a OWNER/ADMIN",
      ...resultado,
    });
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo enviar prueba critica push",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

module.exports = {
  obtenerStatusPush,
  obtenerVapidPublicKey,
  subscribe,
  unsubscribe,
  testPush,
  testCriticalPush,
};
