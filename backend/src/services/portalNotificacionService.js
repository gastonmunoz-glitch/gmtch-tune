const axios = require("axios");

const CAMPOS_BLOQUEADOS = new Set([
  "password",
  "token",
  "portalToken",
  "authorization",
  "archivo",
  "archivo_original",
  "archivo_modificado",
  "archivo_nueva_lectura",
  "ruta",
  "path",
  "flow_token",
]);

const EVENTOS_OMNICANAL = new Set([
  "MENSAJE_OMNICANAL_NUEVO",
  "WHATSAPP_MENSAJE_NUEVO",
  "INSTAGRAM_COMENTARIO_NUEVO",
  "FACEBOOK_MENSAJE_NUEVO",
  "RESPUESTA_ENVIADA",
  "RESPUESTA_FALLIDA",
  "WHATSAPP_RESPUESTA_ENVIADA",
  "WHATSAPP_RESPUESTA_FALLIDA",
]);

const limpiarPayload = (valor) => {
  if (Array.isArray(valor)) return valor.map(limpiarPayload);

  if (valor && typeof valor === "object") {
    return Object.entries(valor).reduce((acc, [clave, item]) => {
      if (CAMPOS_BLOQUEADOS.has(String(clave).toLowerCase())) return acc;
      acc[clave] = limpiarPayload(item);
      return acc;
    }, {});
  }

  return valor;
};

const notificarN8nPortal = async (evento, payload = {}) => {
  const webhook = String(process.env.N8N_WEBHOOK_PORTAL_NOTIFICACIONES || "").trim();
  const eventoNormalizado = String(evento || "").trim().toUpperCase();

  if (!webhook) {
    console.warn(
      "N8N_WEBHOOK_PORTAL_NOTIFICACIONES no configurado. Evento portal omitido:",
      eventoNormalizado || evento
    );
    return { enviado: false, motivo: "WEBHOOK_NO_CONFIGURADO" };
  }

  try {
    await axios.post(
      webhook,
      limpiarPayload({
        evento: eventoNormalizado || evento,
        evento_omnicanal: EVENTOS_OMNICANAL.has(eventoNormalizado),
        ...payload,
        fecha: payload.fecha || new Date().toISOString(),
      }),
      {
        timeout: 5000,
      }
    );

    return { enviado: true };
  } catch (error) {
    console.warn("No se pudo notificar n8n portal:", eventoNormalizado || evento, error.message);
    return { enviado: false, motivo: error.message };
  }
};

module.exports = {
  EVENTOS_OMNICANAL,
  notificarN8nPortal,
};
