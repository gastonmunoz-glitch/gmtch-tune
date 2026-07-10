const {
  Conversacion,
  MensajeConversacion,
  PortalCuenta,
  PortalUsuario,
} = require("../models");
const { registrarEventoPortal } = require("./portalAuthController");
const { notificarN8nPortal } = require("../services/portalNotificacionService");

const ESTADOS = ["NUEVA", "EN_ATENCION", "ESPERANDO_CLIENTE", "CERRADA"];
const PRIORIDADES = ["BAJA", "MEDIA", "ALTA", "URGENTE"];
const FRONTEND_URL = String(process.env.FRONTEND_URL || "http://localhost:5173").replace(
  /\/$/,
  ""
);

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const normalizarPrioridad = (valor, defecto = "MEDIA") => {
  const prioridad = limpiarTexto(valor).toUpperCase();
  return PRIORIDADES.includes(prioridad) ? prioridad : defecto;
};

const mapearCuenta = (cuenta) =>
  cuenta
    ? {
        id: cuenta.id,
        nombre_taller: cuenta.nombre_taller,
        contacto: cuenta.contacto,
        email: cuenta.email,
        telefono: cuenta.telefono,
        activo: cuenta.activo,
        aprobado: cuenta.aprobado,
      }
    : null;

const mapearUsuario = (usuario) =>
  usuario
    ? {
        id: usuario.id,
        cuentaId: usuario.cuentaId,
        nombre: usuario.nombre,
        email: usuario.email,
        username: usuario.username || null,
        activo: usuario.activo,
        aprobado: usuario.aprobado,
      }
    : null;

const mapearMensaje = (mensaje) => ({
  id: mensaje.id,
  conversacionId: mensaje.conversacionId,
  direccion: mensaje.direccion,
  canal: mensaje.canal,
  texto: mensaje.texto,
  enviado_por_tipo: mensaje.enviado_por_tipo,
  enviado_por_id: mensaje.enviado_por_id,
  enviado_por_nombre: mensaje.enviado_por_nombre,
  leido: mensaje.leido,
  leido_at: mensaje.leido_at,
  estado_envio: mensaje.estado_envio,
  createdAt: mensaje.createdAt,
  updatedAt: mensaje.updatedAt,
});

const mapearConversacion = async (conversacion, incluirMensajes = false) => {
  const json =
    typeof conversacion.toJSON === "function"
      ? conversacion.toJSON()
      : conversacion;

  const [ultimoMensaje, noLeidosPortal] = await Promise.all([
    MensajeConversacion.findOne({
      where: { conversacionId: json.id },
      order: [["createdAt", "DESC"]],
    }),
    MensajeConversacion.count({
      where: {
        conversacionId: json.id,
        direccion: "SALIENTE",
        leido: false,
      },
    }),
  ]);

  const base = {
    id: json.id,
    canal: json.canal,
    portalCuentaId: json.portalCuentaId,
    portalUsuarioId: json.portalUsuarioId,
    telefono: json.telefono,
    email: json.email,
    nombre_contacto: json.nombre_contacto,
    asunto: json.asunto,
    estado: json.estado,
    prioridad: json.prioridad,
    ultimo_mensaje_at: json.ultimo_mensaje_at,
    no_leidos_portal: noLeidosPortal,
    ultimo_mensaje: ultimoMensaje ? mapearMensaje(ultimoMensaje) : null,
    Cuenta: mapearCuenta(json.PortalCuenta),
    PortalUsuario: mapearUsuario(json.PortalUsuario),
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };

  if (!incluirMensajes) return base;

  const mensajes = await MensajeConversacion.findAll({
    where: { conversacionId: json.id },
    order: [["createdAt", "ASC"]],
  });

  return {
    ...base,
    mensajes: mensajes.map(mapearMensaje),
  };
};

const includePortal = [
  { model: PortalCuenta, required: false },
  {
    model: PortalUsuario,
    required: false,
    attributes: [
      "id",
      "cuentaId",
      "nombre",
      "email",
      "username",
      "activo",
      "aprobado",
    ],
  },
];

const buscarConversacionPortal = async (req, id) =>
  Conversacion.findOne({
    where: {
      id,
      portalCuentaId: req.portal.cuenta.id,
    },
    include: includePortal,
  });

const payloadN8nMensaje = ({ req, conversacion, mensaje }) => ({
  evento: "PORTAL_MENSAJE_NUEVO",
  cuenta: {
    id: req.portal.cuenta.id,
    nombre_taller: req.portal.cuenta.nombre_taller,
    email: req.portal.cuenta.email,
    telefono: req.portal.cuenta.telefono,
  },
  usuario: {
    id: req.portal.usuario.id,
    nombre: req.portal.usuario.nombre,
    email: req.portal.usuario.email,
    username: req.portal.usuario.username || null,
  },
  email: req.portal.usuario.email || req.portal.cuenta.email || null,
  whatsapp: req.portal.cuenta.telefono || null,
  conversacionId: conversacion.id,
  mensajeId: mensaje.id,
  asunto: conversacion.asunto,
  prioridad: conversacion.prioridad,
  fecha: new Date().toISOString(),
  link_admin: `${FRONTEND_URL}/mensajes?conversacionId=${conversacion.id}`,
});

const listarPortalConversaciones = async (req, res) => {
  try {
    const conversaciones = await Conversacion.findAll({
      where: {
        portalCuentaId: req.portal.cuenta.id,
      },
      include: includePortal,
      order: [
        ["ultimo_mensaje_at", "DESC"],
        ["updatedAt", "DESC"],
      ],
      limit: 100,
    });

    res.json({
      conversaciones: await Promise.all(
        conversaciones.map((conversacion) => mapearConversacion(conversacion))
      ),
    });
  } catch (error) {
    console.error("ERROR LISTANDO MENSAJES PORTAL:", error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Error interno del servidor"
          : error.message,
    });
  }
};

const obtenerPortalConversacion = async (req, res) => {
  try {
    const conversacion = await buscarConversacionPortal(req, req.params.id);

    if (!conversacion) {
      return res.status(404).json({ error: "Conversacion no encontrada" });
    }

    await MensajeConversacion.update(
      { leido: true, leido_at: new Date() },
      {
        where: {
          conversacionId: conversacion.id,
          direccion: "SALIENTE",
          leido: false,
        },
      }
    );

    res.json({
      conversacion: await mapearConversacion(conversacion, true),
    });
  } catch (error) {
    console.error("ERROR OBTENIENDO MENSAJE PORTAL:", error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Error interno del servidor"
          : error.message,
    });
  }
};

const crearPortalConversacion = async (req, res) => {
  try {
    const texto = limpiarTexto(req.body.texto || req.body.mensaje);
    const asunto = limpiarTexto(req.body.asunto) || "Soporte Portal Master";

    if (!texto) {
      return res.status(400).json({ error: "El mensaje es obligatorio" });
    }

    const ahora = new Date();
    const conversacion = await Conversacion.create({
      canal: "PORTAL",
      portalCuentaId: req.portal.cuenta.id,
      portalUsuarioId: req.portal.usuario.id,
      telefono: req.portal.cuenta.telefono || null,
      email: req.portal.usuario.email || req.portal.cuenta.email || null,
      nombre_contacto:
        req.portal.usuario.nombre ||
        req.portal.cuenta.contacto ||
        req.portal.cuenta.nombre_taller,
      asunto,
      estado: "NUEVA",
      prioridad: normalizarPrioridad(req.body.prioridad),
      ultimo_mensaje_at: ahora,
      metadata: {},
    });

    const mensaje = await MensajeConversacion.create({
      conversacionId: conversacion.id,
      direccion: "ENTRANTE",
      canal: "PORTAL",
      texto,
      enviado_por_tipo: "PORTAL_USUARIO",
      enviado_por_id: req.portal.usuario.id,
      enviado_por_nombre:
        req.portal.usuario.nombre ||
        req.portal.usuario.username ||
        req.portal.usuario.email,
      leido: false,
      metadata: {},
    });

    await registrarEventoPortal({
      req,
      cuentaId: req.portal.cuenta.id,
      usuarioId: req.portal.usuario.id,
      tipo: "PORTAL_MENSAJE_NUEVO",
      resultado: "OK",
      descripcion: "Master envio nuevo mensaje de soporte desde portal",
      metadata: {
        conversacionId: conversacion.id,
        mensajeId: mensaje.id,
        asunto,
        prioridad: conversacion.prioridad,
      },
      creado_por: req.portal.usuario.email,
    });

    await notificarN8nPortal(
      "PORTAL_MENSAJE_NUEVO",
      payloadN8nMensaje({ req, conversacion, mensaje })
    );

    const conversacionConRelaciones = await buscarConversacionPortal(
      req,
      conversacion.id
    );

    res.status(201).json({
      mensaje: "Mensaje enviado a GMTCH.",
      conversacion: await mapearConversacion(conversacionConRelaciones, true),
    });
  } catch (error) {
    console.error("ERROR CREANDO MENSAJE PORTAL:", error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Error interno del servidor"
          : error.message,
    });
  }
};

const responderPortalConversacion = async (req, res) => {
  try {
    const conversacion = await buscarConversacionPortal(req, req.params.id);

    if (!conversacion) {
      return res.status(404).json({ error: "Conversacion no encontrada" });
    }

    if (conversacion.estado === "CERRADA") {
      return res.status(400).json({
        error: "La conversacion esta cerrada. Crea una nueva consulta si necesitas soporte.",
      });
    }

    const texto = limpiarTexto(req.body.texto || req.body.mensaje);

    if (!texto) {
      return res.status(400).json({ error: "El mensaje es obligatorio" });
    }

    const mensaje = await MensajeConversacion.create({
      conversacionId: conversacion.id,
      direccion: "ENTRANTE",
      canal: "PORTAL",
      texto,
      enviado_por_tipo: "PORTAL_USUARIO",
      enviado_por_id: req.portal.usuario.id,
      enviado_por_nombre:
        req.portal.usuario.nombre ||
        req.portal.usuario.username ||
        req.portal.usuario.email,
      leido: false,
      metadata: {},
    });

    await conversacion.update({
      estado: "NUEVA",
      ultimo_mensaje_at: new Date(),
    });

    await registrarEventoPortal({
      req,
      cuentaId: req.portal.cuenta.id,
      usuarioId: req.portal.usuario.id,
      tipo: "PORTAL_MENSAJE_NUEVO",
      resultado: "OK",
      descripcion: "Master respondio conversacion desde portal",
      metadata: {
        conversacionId: conversacion.id,
        mensajeId: mensaje.id,
      },
      creado_por: req.portal.usuario.email,
    });

    await notificarN8nPortal(
      "PORTAL_MENSAJE_NUEVO",
      payloadN8nMensaje({ req, conversacion, mensaje })
    );

    const conversacionActualizada = await buscarConversacionPortal(
      req,
      conversacion.id
    );

    res.status(201).json({
      mensaje: "Respuesta enviada a GMTCH.",
      conversacion: await mapearConversacion(conversacionActualizada, true),
    });
  } catch (error) {
    console.error("ERROR RESPONDIENDO MENSAJE PORTAL:", error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Error interno del servidor"
          : error.message,
    });
  }
};

module.exports = {
  listarPortalConversaciones,
  obtenerPortalConversacion,
  crearPortalConversacion,
  responderPortalConversacion,
};
