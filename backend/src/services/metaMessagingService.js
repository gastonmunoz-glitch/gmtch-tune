const crypto = require("crypto");
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const { Conversacion, MensajeConversacion } = require("../models");

let columnasOmnicanalPreparadas = false;

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const recortar = (valor, max = 240) => {
  const texto = limpiarTexto(valor);
  return texto.length > max ? `${texto.slice(0, max)}...` : texto;
};

const ordenarObjeto = (valor) => {
  if (Array.isArray(valor)) return valor.map(ordenarObjeto);
  if (!valor || typeof valor !== "object") return valor;

  return Object.keys(valor)
    .sort()
    .reduce((acc, clave) => {
      acc[clave] = ordenarObjeto(valor[clave]);
      return acc;
    }, {});
};

const generarPayloadHash = (payload) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(ordenarObjeto(payload || {})))
    .digest("hex");

const fechaDesdeTimestampMeta = (timestamp) => {
  const numero = Number(timestamp);
  if (!Number.isFinite(numero) || numero <= 0) return new Date();

  const ms = numero > 100000000000 ? numero : numero * 1000;
  const fecha = new Date(ms);

  return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
};

const prepararColumnasOmnicanal = async () => {
  if (columnasOmnicanalPreparadas) return;

  await sequelize.query(`
    ALTER TABLE "conversaciones"
      ADD COLUMN IF NOT EXISTS "proveedor" VARCHAR(80),
      ADD COLUMN IF NOT EXISTS "external_conversation_id" VARCHAR(220),
      ADD COLUMN IF NOT EXISTS "external_user_id" VARCHAR(220),
      ADD COLUMN IF NOT EXISTS "page_id" VARCHAR(220),
      ADD COLUMN IF NOT EXISTS "instagram_account_id" VARCHAR(220),
      ADD COLUMN IF NOT EXISTS "post_id" VARCHAR(220),
      ADD COLUMN IF NOT EXISTS "comment_id" VARCHAR(220),
      ADD COLUMN IF NOT EXISTS "ad_id" VARCHAR(220),
      ADD COLUMN IF NOT EXISTS "wa_id" VARCHAR(80),
      ADD COLUMN IF NOT EXISTS "username_externo" VARCHAR(160),
      ADD COLUMN IF NOT EXISTS "last_inbound_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "service_window_expires_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "requiere_template" BOOLEAN DEFAULT false;
  `);

  await sequelize.query(`
    ALTER TABLE "mensajes_conversacion"
      ADD COLUMN IF NOT EXISTS "proveedor" VARCHAR(80),
      ADD COLUMN IF NOT EXISTS "tipo_mensaje" VARCHAR(80),
      ADD COLUMN IF NOT EXISTS "external_parent_id" VARCHAR(220),
      ADD COLUMN IF NOT EXISTS "enviado_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "error_envio" TEXT,
      ADD COLUMN IF NOT EXISTS "payload_hash" VARCHAR(128);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS conversaciones_external_conversation_id_idx
      ON "conversaciones" ("external_conversation_id");
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS mensajes_conversacion_externo_message_id_idx
      ON "mensajes_conversacion" ("externo_message_id");
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS mensajes_conversacion_payload_hash_idx
      ON "mensajes_conversacion" ("payload_hash");
  `);

  columnasOmnicanalPreparadas = true;
};

const textoDesdeMensajeWhatsApp = (mensaje = {}) => {
  if (mensaje.text?.body) return mensaje.text.body;
  if (mensaje.button?.text) return mensaje.button.text;
  if (mensaje.interactive?.button_reply?.title) return mensaje.interactive.button_reply.title;
  if (mensaje.interactive?.list_reply?.title) return mensaje.interactive.list_reply.title;
  if (mensaje.image?.caption) return mensaje.image.caption;
  if (mensaje.document?.caption) return mensaje.document.caption;
  if (mensaje.audio) return "[Audio recibido]";
  if (mensaje.image) return "[Imagen recibida]";
  if (mensaje.video) return "[Video recibido]";
  if (mensaje.document) return "[Documento recibido]";
  if (mensaje.sticker) return "[Sticker recibido]";
  return `[Mensaje ${mensaje.type || "WhatsApp"} recibido]`;
};

const extraerEventosWhatsApp = (payload = {}) => {
  const eventos = [];

  (payload.entry || []).forEach((entry) => {
    (entry.changes || []).forEach((change) => {
      const value = change.value || {};
      const metadata = value.metadata || {};
      const contactosPorWaId = (value.contacts || []).reduce((acc, contacto) => {
        if (contacto.wa_id) acc[contacto.wa_id] = contacto;
        return acc;
      }, {});

      (value.messages || []).forEach((mensaje) => {
        const waId = limpiarTexto(mensaje.from);
        const contacto = contactosPorWaId[waId] || {};
        const inboundAt = fechaDesdeTimestampMeta(mensaje.timestamp);
        const serviceWindowExpiresAt = new Date(inboundAt.getTime() + 24 * 60 * 60 * 1000);
        const phoneNumberId = limpiarTexto(metadata.phone_number_id || entry.id);
        const texto = textoDesdeMensajeWhatsApp(mensaje);

        eventos.push({
          canal: "WHATSAPP",
          proveedor: "META",
          raw_tipo: "whatsapp_message",
          external_conversation_id: `WHATSAPP:${phoneNumberId}:${waId}`,
          external_user_id: waId,
          externo_message_id: limpiarTexto(mensaje.id),
          telefono: waId,
          wa_id: waId,
          nombre_contacto: contacto.profile?.name || waId || "WhatsApp",
          username_externo: contacto.profile?.name || null,
          page_id: phoneNumberId || null,
          texto,
          tipo_mensaje: mensaje.type || "text",
          inbound_at: inboundAt,
          service_window_expires_at: serviceWindowExpiresAt,
          requiere_template: false,
          external_parent_id: null,
          post_id: null,
          comment_id: null,
          ad_id: mensaje.context?.id || null,
          metadata: {
            raw_tipo: "whatsapp_message",
            from: waId,
            phone_number_id: phoneNumberId || null,
            text_preview: recortar(texto),
            timestamp: mensaje.timestamp || null,
            ids_externos: {
              message_id: mensaje.id || null,
              context_id: mensaje.context?.id || null,
            },
          },
        });
      });
    });
  });

  return eventos;
};

const extraerEventosMessaging = (payload = {}) => {
  const eventos = [];
  const objeto = limpiarTexto(payload.object).toLowerCase();
  const canalBase = objeto === "instagram" ? "INSTAGRAM" : "FACEBOOK";

  (payload.entry || []).forEach((entry) => {
    (entry.messaging || []).forEach((item) => {
      if (!item.message && !item.postback) return;

      const senderId = limpiarTexto(item.sender?.id);
      const recipientId = limpiarTexto(item.recipient?.id || entry.id);
      const message = item.message || {};
      const texto = message.text || item.postback?.title || "[Mensaje recibido]";
      const inboundAt = fechaDesdeTimestampMeta(item.timestamp);

      eventos.push({
        canal: canalBase,
        proveedor: "META",
        raw_tipo: `${canalBase.toLowerCase()}_dm`,
        external_conversation_id: `${canalBase}:DM:${recipientId}:${senderId}`,
        external_user_id: senderId,
        externo_message_id: limpiarTexto(message.mid || item.postback?.mid),
        telefono: null,
        wa_id: null,
        nombre_contacto: senderId || canalBase,
        username_externo: senderId || null,
        page_id: canalBase === "FACEBOOK" ? recipientId : null,
        instagram_account_id: canalBase === "INSTAGRAM" ? recipientId : null,
        texto,
        tipo_mensaje: message.text ? "text" : "postback",
        inbound_at: inboundAt,
        service_window_expires_at: null,
        requiere_template: false,
        external_parent_id: null,
        post_id: null,
        comment_id: null,
        ad_id: item.referral?.ad_id || null,
        metadata: {
          raw_tipo: `${canalBase.toLowerCase()}_dm`,
          from: senderId,
          recipient_id: recipientId,
          text_preview: recortar(texto),
          timestamp: item.timestamp || null,
          ids_externos: {
            message_id: message.mid || null,
            referral_ad_id: item.referral?.ad_id || null,
          },
        },
      });
    });
  });

  return eventos;
};

const extraerEventosComentarios = (payload = {}) => {
  const eventos = [];
  const objeto = limpiarTexto(payload.object).toLowerCase();
  const canalBase = objeto === "instagram" ? "INSTAGRAM" : "FACEBOOK";

  (payload.entry || []).forEach((entry) => {
    (entry.changes || []).forEach((change) => {
      const value = change.value || {};
      const field = limpiarTexto(change.field).toLowerCase();
      const esComentario =
        field.includes("comment") ||
        Boolean(value.comment_id || value.commentId || value.id);

      if (!esComentario || (!value.text && !value.message)) return;

      const from = value.from || {};
      const externalUserId = limpiarTexto(from.id || value.sender_id || value.user_id);
      const username = limpiarTexto(from.username || from.name || value.username);
      const postId = limpiarTexto(value.post_id || value.media?.id || value.parent_id || entry.id);
      const commentId = limpiarTexto(value.comment_id || value.commentId || value.id);
      const texto = value.text || value.message || "[Comentario recibido]";
      const inboundAt = fechaDesdeTimestampMeta(value.created_time || entry.time);

      eventos.push({
        canal: canalBase,
        proveedor: "META",
        raw_tipo: `${canalBase.toLowerCase()}_comment`,
        external_conversation_id: `${canalBase}:COMMENT:${postId}:${commentId || externalUserId}`,
        external_user_id: externalUserId || username,
        externo_message_id: commentId,
        telefono: null,
        wa_id: null,
        nombre_contacto: username || externalUserId || canalBase,
        username_externo: username || externalUserId || null,
        page_id: canalBase === "FACEBOOK" ? limpiarTexto(entry.id) : null,
        instagram_account_id: canalBase === "INSTAGRAM" ? limpiarTexto(entry.id) : null,
        texto,
        tipo_mensaje: "comment",
        inbound_at: inboundAt,
        service_window_expires_at: null,
        requiere_template: false,
        external_parent_id: postId || null,
        post_id: postId || null,
        comment_id: commentId || null,
        ad_id: limpiarTexto(value.ad_id || value.ad?.id) || null,
        metadata: {
          raw_tipo: `${canalBase.toLowerCase()}_comment`,
          from: externalUserId || username || null,
          text_preview: recortar(texto),
          timestamp: value.created_time || entry.time || null,
          ids_externos: {
            post_id: postId || null,
            comment_id: commentId || null,
            ad_id: value.ad_id || value.ad?.id || null,
          },
        },
      });
    });
  });

  return eventos;
};

const extraerEventosMeta = (payload = {}) => [
  ...extraerEventosWhatsApp(payload),
  ...extraerEventosMessaging(payload),
  ...extraerEventosComentarios(payload),
];

const buscarMensajeExistente = async ({ externo_message_id, payload_hash }) => {
  const filtros = [];

  if (externo_message_id) {
    filtros.push({ externo_message_id });
  }

  if (payload_hash) {
    filtros.push({ payload_hash });
  }

  if (!filtros.length) return null;

  return MensajeConversacion.findOne({
    where: {
      [Op.or]: filtros,
    },
  });
};

const guardarEventoEntrante = async (evento) => {
  await prepararColumnasOmnicanal();

  const payloadHash = generarPayloadHash({
    canal: evento.canal,
    proveedor: evento.proveedor,
    external_conversation_id: evento.external_conversation_id,
    external_user_id: evento.external_user_id,
    externo_message_id: evento.externo_message_id,
    texto: evento.texto,
    inbound_at: evento.inbound_at,
    metadata: evento.metadata,
  });

  const existente = await buscarMensajeExistente({
    externo_message_id: evento.externo_message_id,
    payload_hash: payloadHash,
  });

  if (existente) {
    return {
      creado: false,
      duplicado: true,
      mensaje: existente,
      conversacion: await Conversacion.findByPk(existente.conversacionId),
    };
  }

  const ahoraInbound = evento.inbound_at || new Date();
  const [conversacion] = await Conversacion.findOrCreate({
    where: {
      external_conversation_id: evento.external_conversation_id,
    },
    defaults: {
      canal: evento.canal,
      proveedor: evento.proveedor,
      external_conversation_id: evento.external_conversation_id,
      external_user_id: evento.external_user_id || null,
      page_id: evento.page_id || null,
      instagram_account_id: evento.instagram_account_id || null,
      post_id: evento.post_id || null,
      comment_id: evento.comment_id || null,
      ad_id: evento.ad_id || null,
      telefono: evento.telefono || null,
      wa_id: evento.wa_id || null,
      username_externo: evento.username_externo || null,
      nombre_contacto: evento.nombre_contacto || evento.username_externo || evento.telefono,
      asunto: evento.asunto || `${evento.canal} / ${evento.raw_tipo || "mensaje"}`,
      estado: "NUEVA",
      prioridad: "MEDIA",
      ultimo_mensaje_at: ahoraInbound,
      last_inbound_at: ahoraInbound,
      service_window_expires_at: evento.service_window_expires_at || null,
      requiere_template: Boolean(evento.requiere_template),
      metadata: evento.metadata || {},
    },
  });

  await conversacion.update({
    canal: evento.canal,
    proveedor: evento.proveedor,
    external_user_id: evento.external_user_id || conversacion.external_user_id || null,
    page_id: evento.page_id || conversacion.page_id || null,
    instagram_account_id:
      evento.instagram_account_id || conversacion.instagram_account_id || null,
    post_id: evento.post_id || conversacion.post_id || null,
    comment_id: evento.comment_id || conversacion.comment_id || null,
    ad_id: evento.ad_id || conversacion.ad_id || null,
    telefono: evento.telefono || conversacion.telefono || null,
    wa_id: evento.wa_id || conversacion.wa_id || null,
    username_externo: evento.username_externo || conversacion.username_externo || null,
    nombre_contacto:
      evento.nombre_contacto || conversacion.nombre_contacto || evento.telefono || null,
    estado: "NUEVA",
    ultimo_mensaje_at: ahoraInbound,
    last_inbound_at: ahoraInbound,
    service_window_expires_at:
      evento.service_window_expires_at || conversacion.service_window_expires_at || null,
    requiere_template: Boolean(evento.requiere_template),
    metadata: {
      ...(conversacion.metadata || {}),
      ...(evento.metadata || {}),
    },
  });

  const mensaje = await MensajeConversacion.create({
    conversacionId: conversacion.id,
    direccion: "ENTRANTE",
    canal: evento.canal,
    proveedor: evento.proveedor,
    tipo_mensaje: evento.tipo_mensaje || null,
    texto: evento.texto || "[Mensaje recibido]",
    enviado_por_tipo: `EXTERNO_${evento.canal}`,
    enviado_por_id: null,
    enviado_por_nombre:
      evento.nombre_contacto || evento.username_externo || evento.telefono || "Externo",
    leido: false,
    externo_message_id: evento.externo_message_id || null,
    external_parent_id: evento.external_parent_id || null,
    enviado_at: ahoraInbound,
    estado_envio: "RECIBIDO",
    error_envio: null,
    payload_hash: payloadHash,
    metadata: evento.metadata || {},
  });

  return {
    creado: true,
    duplicado: false,
    mensaje,
    conversacion,
  };
};

module.exports = {
  prepararColumnasOmnicanal,
  generarPayloadHash,
  extraerEventosMeta,
  guardarEventoEntrante,
};
