const { Op } = require("sequelize");
const {
  Conversacion,
  MensajeConversacion,
  PortalCuenta,
  PortalUsuario,
  Usuario,
} = require("../models");

const ESTADOS = ["NUEVA", "EN_ATENCION", "ESPERANDO_CLIENTE", "CERRADA"];
const PRIORIDADES = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const normalizarEstado = (valor, defecto = "NUEVA") => {
  const estado = limpiarTexto(valor).toUpperCase();
  return ESTADOS.includes(estado) ? estado : defecto;
};

const normalizarPrioridad = (valor, defecto = "MEDIA") => {
  const prioridad = limpiarTexto(valor).toUpperCase();
  return PRIORIDADES.includes(prioridad) ? prioridad : defecto;
};

const usuarioActual = (req) =>
  req.usuario?.username ||
  req.usuario?.nombre ||
  req.usuario?.email ||
  req.user?.username ||
  req.user?.nombre ||
  "GMTCH";

const usuarioIdActual = (req) => req.usuario?.id || req.user?.id || null;

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

const mapearPortalUsuario = (usuario) =>
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

const mapearAsignado = (usuario) =>
  usuario
    ? {
        id: usuario.id,
        nombre: usuario.nombre,
        username: usuario.username,
        rol: usuario.rol,
        activo: usuario.activo,
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
  metadata: mensaje.metadata || {},
  createdAt: mensaje.createdAt,
  updatedAt: mensaje.updatedAt,
});

const mapearConversacion = async (conversacion, incluirMensajes = false) => {
  const json =
    typeof conversacion.toJSON === "function"
      ? conversacion.toJSON()
      : conversacion;

  const [ultimoMensaje, noLeidosInternos] = await Promise.all([
    MensajeConversacion.findOne({
      where: { conversacionId: json.id },
      order: [["createdAt", "DESC"]],
    }),
    MensajeConversacion.count({
      where: {
        conversacionId: json.id,
        direccion: "ENTRANTE",
        leido: false,
      },
    }),
  ]);

  const base = {
    id: json.id,
    canal: json.canal,
    portalCuentaId: json.portalCuentaId,
    portalUsuarioId: json.portalUsuarioId,
    clienteId: json.clienteId,
    telefono: json.telefono,
    email: json.email,
    nombre_contacto: json.nombre_contacto,
    asunto: json.asunto,
    estado: json.estado,
    prioridad: json.prioridad,
    asignado_a_id: json.asignado_a_id,
    ultimo_mensaje_at: json.ultimo_mensaje_at,
    metadata: json.metadata || {},
    no_leidos_internos: noLeidosInternos,
    ultimo_mensaje: ultimoMensaje ? mapearMensaje(ultimoMensaje) : null,
    Cuenta: mapearCuenta(json.PortalCuenta),
    PortalUsuario: mapearPortalUsuario(json.PortalUsuario),
    AsignadoA: mapearAsignado(json.AsignadoA),
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

const includeConversacion = [
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
  {
    model: Usuario,
    as: "AsignadoA",
    required: false,
    attributes: ["id", "nombre", "username", "rol", "activo"],
  },
];

const listarConversaciones = async (req, res) => {
  try {
    const where = {};
    const estado = limpiarTexto(req.query.estado).toUpperCase();
    const canal = limpiarTexto(req.query.canal).toUpperCase();
    const asignadoAId = limpiarTexto(req.query.asignado_a_id);
    const search = limpiarTexto(req.query.search);

    if (estado && ESTADOS.includes(estado)) where.estado = estado;
    if (canal) where.canal = canal;
    if (asignadoAId) where.asignado_a_id = asignadoAId;

    if (search) {
      where[Op.or] = [
        { asunto: { [Op.iLike]: `%${search}%` } },
        { nombre_contacto: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { telefono: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const conversaciones = await Conversacion.findAll({
      where,
      include: includeConversacion,
      order: [
        ["ultimo_mensaje_at", "DESC"],
        ["updatedAt", "DESC"],
      ],
      limit: Math.min(Math.max(Number(req.query.limit) || 100, 1), 200),
    });

    res.json({
      conversaciones: await Promise.all(
        conversaciones.map((conversacion) => mapearConversacion(conversacion))
      ),
    });
  } catch (error) {
    console.error("ERROR LISTANDO CONVERSACIONES:", error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Error interno del servidor"
          : error.message,
    });
  }
};

const obtenerConversacion = async (req, res) => {
  try {
    const conversacion = await Conversacion.findByPk(req.params.id, {
      include: includeConversacion,
    });

    if (!conversacion) {
      return res.status(404).json({ error: "Conversacion no encontrada" });
    }

    await MensajeConversacion.update(
      { leido: true, leido_at: new Date() },
      {
        where: {
          conversacionId: conversacion.id,
          direccion: "ENTRANTE",
          leido: false,
        },
      }
    );

    res.json({
      conversacion: await mapearConversacion(conversacion, true),
    });
  } catch (error) {
    console.error("ERROR OBTENIENDO CONVERSACION:", error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Error interno del servidor"
          : error.message,
    });
  }
};

const responderConversacion = async (req, res) => {
  try {
    const conversacion = await Conversacion.findByPk(req.params.id);

    if (!conversacion) {
      return res.status(404).json({ error: "Conversacion no encontrada" });
    }

    if (conversacion.estado === "CERRADA") {
      return res.status(400).json({
        error: "La conversacion esta cerrada. Cambia el estado antes de responder.",
      });
    }

    const texto = limpiarTexto(req.body.texto);

    if (!texto) {
      return res.status(400).json({ error: "El mensaje es obligatorio" });
    }

    const ahora = new Date();
    const mensaje = await MensajeConversacion.create({
      conversacionId: conversacion.id,
      direccion: "SALIENTE",
      canal: conversacion.canal,
      texto,
      enviado_por_tipo: "USUARIO_INTERNO",
      enviado_por_id: usuarioIdActual(req),
      enviado_por_nombre: usuarioActual(req),
      leido: false,
      metadata: {},
    });

    await conversacion.update({
      estado: "ESPERANDO_CLIENTE",
      asignado_a_id: conversacion.asignado_a_id || usuarioIdActual(req),
      ultimo_mensaje_at: ahora,
    });

    res.status(201).json({
      mensaje: mapearMensaje(mensaje),
      conversacion: await mapearConversacion(conversacion),
    });
  } catch (error) {
    console.error("ERROR RESPONDIENDO CONVERSACION:", error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Error interno del servidor"
          : error.message,
    });
  }
};

const asignarConversacion = async (req, res) => {
  try {
    const conversacion = await Conversacion.findByPk(req.params.id);

    if (!conversacion) {
      return res.status(404).json({ error: "Conversacion no encontrada" });
    }

    const asignadoAId = limpiarTexto(req.body.asignado_a_id);

    if (!asignadoAId) {
      await conversacion.update({ asignado_a_id: null });
      return res.json({
        mensaje: "Conversacion sin responsable asignado",
        conversacion: await mapearConversacion(conversacion),
      });
    }

    const usuario = await Usuario.findByPk(asignadoAId);

    if (!usuario || !usuario.activo) {
      return res.status(400).json({ error: "Responsable no encontrado o inactivo" });
    }

    await conversacion.update({
      asignado_a_id: usuario.id,
      estado: conversacion.estado === "NUEVA" ? "EN_ATENCION" : conversacion.estado,
    });

    res.json({
      mensaje: "Conversacion asignada",
      conversacion: await mapearConversacion(conversacion),
    });
  } catch (error) {
    console.error("ERROR ASIGNANDO CONVERSACION:", error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Error interno del servidor"
          : error.message,
    });
  }
};

const cambiarEstadoConversacion = async (req, res) => {
  try {
    const conversacion = await Conversacion.findByPk(req.params.id);

    if (!conversacion) {
      return res.status(404).json({ error: "Conversacion no encontrada" });
    }

    const estado = normalizarEstado(req.body.estado, "");

    if (!estado) {
      return res.status(400).json({ error: "Estado de conversacion no valido" });
    }

    await conversacion.update({ estado });

    res.json({
      mensaje: "Estado de conversacion actualizado",
      conversacion: await mapearConversacion(conversacion),
    });
  } catch (error) {
    console.error("ERROR CAMBIANDO ESTADO CONVERSACION:", error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Error interno del servidor"
          : error.message,
    });
  }
};

const cerrarConversacion = async (req, res) => {
  try {
    const conversacion = await Conversacion.findByPk(req.params.id);

    if (!conversacion) {
      return res.status(404).json({ error: "Conversacion no encontrada" });
    }

    await conversacion.update({ estado: "CERRADA" });

    res.json({
      mensaje: "Conversacion cerrada",
      conversacion: await mapearConversacion(conversacion),
    });
  } catch (error) {
    console.error("ERROR CERRANDO CONVERSACION:", error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Error interno del servidor"
          : error.message,
    });
  }
};

module.exports = {
  listarConversaciones,
  obtenerConversacion,
  responderConversacion,
  asignarConversacion,
  cambiarEstadoConversacion,
  cerrarConversacion,
  normalizarPrioridad,
};
