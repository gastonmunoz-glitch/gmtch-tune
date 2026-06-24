const { Op } = require("sequelize");
const { Notificacion } = require("../models");

let tablaPreparada = false;

const prepararTablaNotificaciones = async () => {
  if (tablaPreparada) return;

  await Notificacion.sync();
  tablaPreparada = true;
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

const crearNotificacionesInternas = async ({
  usuariosDestino = [],
  rolesDestino = [],
  tipo,
  titulo,
  mensaje,
  ordenId = null,
  archivoECUId = null,
}) => {
  try {
    await prepararTablaNotificaciones();

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
