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

  if (!webhook) {
    console.warn("N8N_WEBHOOK_PORTAL_NOTIFICACIONES no configurado. Evento portal omitido:", evento);
    return { enviado: false, motivo: "WEBHOOK_NO_CONFIGURADO" };
  }

  try {
    await axios.post(
      webhook,
      limpiarPayload({
        evento,
        ...payload,
        fecha: payload.fecha || new Date().toISOString(),
      }),
      {
        timeout: 5000,
      }
    );

    return { enviado: true };
  } catch (error) {
    console.warn("No se pudo notificar n8n portal:", evento, error.message);
    return { enviado: false, motivo: error.message };
  }
};

module.exports = {
  notificarN8nPortal,
};
