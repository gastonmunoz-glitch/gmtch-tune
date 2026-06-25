const sequelize = require("../config/database");
const {
  PortalCuenta,
  PortalUsuario,
  PortalFileService,
  PortalCreditoMovimiento,
} = require("../models");

const ESTADOS_VALIDOS = [
  "RECIBIDO",
  "EN_REVISION",
  "EN_PROCESO",
  "MOD_LISTO",
  "CORRECCION_SOLICITADA",
  "CORREGIDO",
  "ENTREGADO",
  "RECHAZADO",
];

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const normalizarMonto = (valor, defecto = 0) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return defecto;
  return Math.max(0, Number(numero.toFixed(2)));
};

const usuarioInternoActual = (req) => {
  return (
    req.usuario?.username ||
    req.user?.username ||
    req.usuario?.nombre ||
    req.user?.nombre ||
    "sistema"
  );
};

const mapearCuentaAdmin = (cuenta) => ({
  id: cuenta.id,
  nombre_taller: cuenta.nombre_taller,
  contacto: cuenta.contacto,
  email: cuenta.email,
  telefono: cuenta.telefono,
  pais: cuenta.pais,
  ciudad: cuenta.ciudad,
  activo: cuenta.activo,
  aprobado: cuenta.aprobado,
  saldo_creditos: cuenta.saldo_creditos,
  observaciones: cuenta.observaciones,
  createdAt: cuenta.createdAt,
  updatedAt: cuenta.updatedAt,
});

const mapearUsuarioAdmin = (usuario) => {
  if (!usuario) return null;

  return {
    id: usuario.id,
    cuentaId: usuario.cuentaId,
    nombre: usuario.nombre,
    email: usuario.email,
    activo: usuario.activo,
    aprobado: usuario.aprobado,
    last_login_at: usuario.last_login_at,
    last_seen_at: usuario.last_seen_at,
    createdAt: usuario.createdAt,
    updatedAt: usuario.updatedAt,
  };
};

const mapearFileAdmin = (archivo) => {
  const json = typeof archivo.toJSON === "function" ? archivo.toJSON() : archivo;

  return {
    id: json.id,
    cuentaId: json.cuentaId,
    usuarioId: json.usuarioId,
    estado: json.estado,
    tipo_servicio: json.tipo_servicio,
    marca_vehiculo: json.marca_vehiculo,
    modelo_vehiculo: json.modelo_vehiculo,
    anio_vehiculo: json.anio_vehiculo,
    ecu_info: json.ecu_info,
    observaciones_cliente: json.observaciones_cliente,
    observaciones_internas: json.observaciones_internas,
    nombre_original: json.nombre_original,
    nombre_modificado: json.nombre_modificado,
    archivo_original_disponible: Boolean(json.archivo_original),
    archivo_modificado_disponible: Boolean(json.archivo_modificado),
    creditos_requeridos: json.creditos_requeridos,
    creditos_consumidos: json.creditos_consumidos,
    fecha_subida: json.fecha_subida,
    fecha_mod_listo: json.fecha_mod_listo,
    fecha_descarga: json.fecha_descarga,
    descargas_count: json.descargas_count,
    correccion_solicitada: json.correccion_solicitada,
    observacion_correccion: json.observacion_correccion,
    Cuenta: json.PortalCuenta ? mapearCuentaAdmin(json.PortalCuenta) : null,
    Usuario: json.PortalUsuario ? mapearUsuarioAdmin(json.PortalUsuario) : null,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };
};

const crearCuenta = async (req, res) => {
  try {
    const nombreTaller = limpiarTexto(req.body.nombre_taller);

    if (!nombreTaller) {
      return res.status(400).json({
        error: "El nombre del taller es obligatorio",
      });
    }

    const usuarioEmail = limpiarTexto(
      req.body.usuario_email || req.body.email_usuario || req.body.email
    ).toLowerCase();
    const usuarioPassword = limpiarTexto(
      req.body.usuario_password || req.body.password
    );
    const usuarioNombre = limpiarTexto(
      req.body.usuario_nombre || req.body.nombre_usuario || req.body.contacto
    );

    const resultado = await sequelize.transaction(async (transaction) => {
      const cuenta = await PortalCuenta.create(
        {
          nombre_taller: nombreTaller,
          contacto: limpiarTexto(req.body.contacto),
          email: limpiarTexto(req.body.email).toLowerCase(),
          telefono: limpiarTexto(req.body.telefono),
          pais: limpiarTexto(req.body.pais),
          ciudad: limpiarTexto(req.body.ciudad),
          activo:
            Object.prototype.hasOwnProperty.call(req.body, "activo")
              ? Boolean(req.body.activo)
              : true,
          aprobado:
            Object.prototype.hasOwnProperty.call(req.body, "aprobado")
              ? Boolean(req.body.aprobado)
              : true,
          saldo_creditos: normalizarMonto(req.body.saldo_creditos, 0),
          observaciones: limpiarTexto(req.body.observaciones),
        },
        { transaction }
      );

      let usuario = null;

      if (usuarioEmail || usuarioPassword || usuarioNombre) {
        if (!usuarioEmail || !usuarioPassword || !usuarioNombre) {
          throw Object.assign(
            new Error("Para crear usuario portal debes enviar nombre, email y password"),
            { status: 400 }
          );
        }

        usuario = await PortalUsuario.create(
          {
            cuentaId: cuenta.id,
            nombre: usuarioNombre,
            email: usuarioEmail,
            password: usuarioPassword,
            activo: true,
            aprobado: true,
          },
          { transaction }
        );
      }

      return { cuenta, usuario };
    });

    res.status(201).json({
      mensaje: "Cuenta portal creada correctamente",
      cuenta: mapearCuentaAdmin(resultado.cuenta),
      usuario: mapearUsuarioAdmin(resultado.usuario),
    });
  } catch (error) {
    console.error("ERROR CREANDO CUENTA PORTAL:", error);
    res.status(error.status || 500).json({
      error: error.message,
    });
  }
};

const listarCuentas = async (req, res) => {
  try {
    const cuentas = await PortalCuenta.findAll({
      include: [
        {
          model: PortalUsuario,
          required: false,
          attributes: [
            "id",
            "cuentaId",
            "nombre",
            "email",
            "activo",
            "aprobado",
            "last_login_at",
            "last_seen_at",
            "createdAt",
            "updatedAt",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(
      cuentas.map((cuenta) => {
        const json = cuenta.toJSON();
        return {
          ...mapearCuentaAdmin(json),
          Usuarios: (json.PortalUsuarios || []).map(mapearUsuarioAdmin),
        };
      })
    );
  } catch (error) {
    console.error("ERROR LISTANDO CUENTAS PORTAL:", error);
    res.status(500).json({ error: error.message });
  }
};

const listarFilesAdmin = async (req, res) => {
  try {
    const archivos = await PortalFileService.findAll({
      include: [
        { model: PortalCuenta, required: false },
        {
          model: PortalUsuario,
          required: false,
          attributes: [
            "id",
            "cuentaId",
            "nombre",
            "email",
            "activo",
            "aprobado",
            "last_login_at",
            "last_seen_at",
            "createdAt",
            "updatedAt",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(archivos.map(mapearFileAdmin));
  } catch (error) {
    console.error("ERROR LISTANDO FILES PORTAL ADMIN:", error);
    res.status(500).json({ error: error.message });
  }
};

const obtenerFileAdmin = async (req, res) => {
  try {
    const archivo = await PortalFileService.findByPk(req.params.id, {
      include: [
        { model: PortalCuenta, required: false },
        {
          model: PortalUsuario,
          required: false,
          attributes: [
            "id",
            "cuentaId",
            "nombre",
            "email",
            "activo",
            "aprobado",
            "last_login_at",
            "last_seen_at",
            "createdAt",
            "updatedAt",
          ],
        },
      ],
    });

    if (!archivo) {
      return res.status(404).json({
        error: "Solicitud portal no encontrada",
      });
    }

    res.json(mapearFileAdmin(archivo));
  } catch (error) {
    console.error("ERROR DETALLE FILE PORTAL ADMIN:", error);
    res.status(500).json({ error: error.message });
  }
};

const actualizarFileAdmin = async (req, res) => {
  try {
    const archivo = await PortalFileService.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Solicitud portal no encontrada",
      });
    }

    const payload = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "estado")) {
      const estado = limpiarTexto(req.body.estado).toUpperCase();

      if (!ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({
          error: "Estado portal no valido",
        });
      }

      if (["MOD_LISTO", "CORREGIDO", "ENTREGADO"].includes(estado) && !archivo.archivo_modificado) {
        return res.status(400).json({
          error: "Debes subir un MOD antes de marcar este estado",
        });
      }

      payload.estado = estado;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "observaciones_internas")) {
      payload.observaciones_internas = limpiarTexto(req.body.observaciones_internas);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "creditos_requeridos")) {
      payload.creditos_requeridos = normalizarMonto(req.body.creditos_requeridos, 1);
    }

    await archivo.update(payload);

    res.json({
      mensaje: "Solicitud portal actualizada",
      archivo: mapearFileAdmin(archivo),
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO FILE PORTAL ADMIN:", error);
    res.status(500).json({ error: error.message });
  }
};

const subirModAdmin = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Debes adjuntar el MOD",
      });
    }

    const archivo = await PortalFileService.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Solicitud portal no encontrada",
      });
    }

    await archivo.update({
      archivo_modificado: req.file.path,
      nombre_modificado: req.file.originalname || req.file.filename,
      estado: "MOD_LISTO",
      fecha_mod_listo: new Date(),
      correccion_solicitada: false,
    });

    res.json({
      mensaje: "MOD cargado correctamente",
      archivo: mapearFileAdmin(archivo),
    });
  } catch (error) {
    console.error("ERROR SUBIENDO MOD PORTAL ADMIN:", error);
    res.status(500).json({ error: error.message });
  }
};

const cargarCreditos = async (req, res) => {
  try {
    const monto = normalizarMonto(req.body.monto, 0);

    if (monto <= 0) {
      return res.status(400).json({
        error: "El monto de creditos debe ser mayor a 0",
      });
    }

    const resultado = await sequelize.transaction(async (transaction) => {
      const cuenta = await PortalCuenta.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!cuenta) {
        throw Object.assign(new Error("Cuenta portal no encontrada"), {
          status: 404,
        });
      }

      const saldoAnterior = normalizarMonto(cuenta.saldo_creditos, 0);
      const saldoNuevo = normalizarMonto(saldoAnterior + monto, 0);

      await cuenta.update(
        {
          saldo_creditos: saldoNuevo,
        },
        { transaction }
      );

      const movimiento = await PortalCreditoMovimiento.create(
        {
          cuentaId: cuenta.id,
          tipo: "CARGA_MANUAL",
          monto,
          saldo_anterior: saldoAnterior,
          saldo_nuevo: saldoNuevo,
          referencia: limpiarTexto(req.body.referencia),
          creado_por: usuarioInternoActual(req),
          observacion: limpiarTexto(req.body.observacion),
        },
        { transaction }
      );

      return { cuenta, movimiento };
    });

    res.json({
      mensaje: "Creditos cargados correctamente",
      cuenta: mapearCuentaAdmin(resultado.cuenta),
      movimiento: resultado.movimiento,
    });
  } catch (error) {
    console.error("ERROR CARGANDO CREDITOS PORTAL:", error);
    res.status(error.status || 500).json({
      error: error.message,
    });
  }
};

const listarMovimientosCuenta = async (req, res) => {
  try {
    const cuenta = await PortalCuenta.findByPk(req.params.id);

    if (!cuenta) {
      return res.status(404).json({
        error: "Cuenta portal no encontrada",
      });
    }

    const movimientos = await PortalCreditoMovimiento.findAll({
      where: {
        cuentaId: cuenta.id,
      },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      cuenta: mapearCuentaAdmin(cuenta),
      movimientos,
    });
  } catch (error) {
    console.error("ERROR LISTANDO MOVIMIENTOS PORTAL:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  crearCuenta,
  listarCuentas,
  listarFilesAdmin,
  obtenerFileAdmin,
  actualizarFileAdmin,
  subirModAdmin,
  cargarCreditos,
  listarMovimientosCuenta,
};
