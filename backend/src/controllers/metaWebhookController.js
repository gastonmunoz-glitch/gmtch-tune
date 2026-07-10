const { notificarN8nPortal } = require("../services/portalNotificacionService");
const {
  extraerEventosMeta,
  guardarEventoEntrante,
} = require("../services/metaMessagingService");

const FRONTEND_URL = String(process.env.FRONTEND_URL || "https://gmtchtune.com").replace(
  /\/$/,
  ""
);

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const canalEventoN8n = (canal) => {
  if (canal === "WHATSAPP") return "WHATSAPP_MENSAJE_NUEVO";
  if (canal === "INSTAGRAM") return "INSTAGRAM_COMENTARIO_NUEVO";
  if (canal === "FACEBOOK") return "FACEBOOK_MENSAJE_NUEVO";
  return "MENSAJE_OMNICANAL_NUEVO";
};

const verificarWebhookMeta = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    console.warn("META_WEBHOOK_VERIFY_TOKEN no configurado para webhook Meta.");
    return res.sendStatus(403);
  }

  if (mode === "subscribe" && token === verifyToken) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

const payloadN8n = ({ evento, resultado }) => {
  const conversacion = resultado.conversacion || {};

  return {
    evento: "MENSAJE_OMNICANAL_NUEVO",
    evento_canal: canalEventoN8n(evento.canal),
    canal: evento.canal,
    proveedor: evento.proveedor || "META",
    cuenta: null,
    usuario: null,
    telefono: evento.telefono || evento.wa_id || null,
    username_externo: evento.username_externo || evento.external_user_id || null,
    mensaje_preview: limpiarTexto(evento.texto).slice(0, 240),
    conversacionId: conversacion.id || null,
    fecha: new Date().toISOString(),
    link_admin: `${FRONTEND_URL}/mensajes`,
    ids_externos: {
      external_conversation_id: evento.external_conversation_id || null,
      external_user_id: evento.external_user_id || null,
      external_message_id: evento.externo_message_id || null,
      page_id: evento.page_id || null,
      instagram_account_id: evento.instagram_account_id || null,
      post_id: evento.post_id || null,
      comment_id: evento.comment_id || null,
      ad_id: evento.ad_id || null,
    },
  };
};

const recibirWebhookMeta = async (req, res) => {
  try {
    const eventos = extraerEventosMeta(req.body || {});

    if (!eventos.length) {
      return res.status(200).json({
        ok: true,
        recibidos: 0,
        creados: 0,
        duplicados: 0,
        mensaje: "Payload Meta recibido sin eventos soportados en Fase 1.",
      });
    }

    const resultados = [];

    for (const evento of eventos) {
      const resultado = await guardarEventoEntrante(evento);
      resultados.push(resultado);

      if (resultado.creado) {
        await notificarN8nPortal("MENSAJE_OMNICANAL_NUEVO", payloadN8n({ evento, resultado }));
      }
    }

    const creados = resultados.filter((resultado) => resultado.creado).length;
    const duplicados = resultados.filter((resultado) => resultado.duplicado).length;

    return res.status(200).json({
      ok: true,
      recibidos: eventos.length,
      creados,
      duplicados,
    });
  } catch (error) {
    console.error("ERROR WEBHOOK META:", {
      mensaje: error.message,
    });

    return res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Error interno procesando webhook Meta"
          : error.message,
    });
  }
};

module.exports = {
  verificarWebhookMeta,
  recibirWebhookMeta,
};
