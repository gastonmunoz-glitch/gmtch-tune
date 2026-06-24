const { Usuario } = require("../models");

const ROLES_VALIDOS = [
  "OWNER",
  "ADMIN",
  "SUPERVISOR",
  "RECEPCION",
  "OPERADOR_SCANNER",
  "OPERADOR_ECU",
  "MECANICO",
  "TUNER",
];

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: ["id", "nombre", "username", "rol", "activo", "createdAt", "updatedAt"],
      order: [["createdAt", "DESC"]],
    });

    res.json(usuarios);
  } catch (error) {
    console.error("ERROR LISTANDO USUARIOS:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const crearUsuario = async (req, res) => {
  try {
    const nombre = limpiarTexto(req.body.nombre);
    const username = limpiarTexto(req.body.username).toLowerCase();
    const password = limpiarTexto(req.body.password);
    const rol = limpiarTexto(req.body.rol) || "RECEPCION";

    if (!username || !password) {
      return res.status(400).json({
        error: "Falta username o password",
      });
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({
        error: "Rol no válido",
      });
    }

    const existe = await Usuario.findOne({
      where: { username },
    });

    if (existe) {
      return res.status(409).json({
        error: "Ese usuario ya existe",
      });
    }

    const usuario = await Usuario.create({
      nombre,
      username,
      password,
      rol,
      activo: true,
    });

    res.status(201).json({
      mensaje: "Usuario creado correctamente",
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        username: usuario.username,
        rol: usuario.rol,
        activo: usuario.activo,
      },
    });
  } catch (error) {
    console.error("ERROR CREANDO USUARIO:", error);

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({
        error: "Usuario no encontrado",
      });
    }

    const payload = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "nombre")) {
      payload.nombre = limpiarTexto(req.body.nombre);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "username")) {
      payload.username = limpiarTexto(req.body.username).toLowerCase();
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "rol")) {
      const rol = limpiarTexto(req.body.rol);

      if (!ROLES_VALIDOS.includes(rol)) {
        return res.status(400).json({
          error: "Rol no válido",
        });
      }

      payload.rol = rol;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "activo")) {
      payload.activo = Boolean(req.body.activo);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "password")) {
      const password = limpiarTexto(req.body.password);

      if (password) {
        payload.password = password;
      }
    }

    await usuario.update(payload);

    res.json({
      mensaje: "Usuario actualizado",
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        username: usuario.username,
        rol: usuario.rol,
        activo: usuario.activo,
      },
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO USUARIO:", error);

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const eliminarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({
        error: "Usuario no encontrado",
      });
    }

    if (String(usuario.id) === String(req.usuario.id)) {
      return res.status(400).json({
        error: "No puedes desactivar tu propio usuario",
      });
    }

    await usuario.update({
      activo: false,
    });

    res.json({
      mensaje: "Usuario desactivado correctamente",
      id: req.params.id,
    });
  } catch (error) {
    console.error("ERROR ELIMINANDO USUARIO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
};
