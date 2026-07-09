const { Op } = require("sequelize");
const sequelize = require("../config/database");
const flow = require("../../config/flow");
const {
  PortalCuenta,
  PortalUsuario,
  PortalCreditoMovimiento,
  PortalCreditoCompra,
} = require("../models");
const { registrarEventoPortal } = require("./portalAuthController");
const { notificarN8nPortal } = require("../services/portalNotificacionService");

// AJUSTAR PRECIO ANTES DE PRODUCCION COMERCIAL.
const PAQUETES_CREDITOS = [
  {
    id: "PACK_INICIAL",
    nombre: "Pack inicial",
    creditos: 5,
    precio_clp: 50000,
    descripcion: "5 creditos para pruebas y trabajos puntuales.",
  },
  {
    id: "PACK_TALLER",
    nombre: "Pack taller",
    creditos: 10,
    precio_clp: 95000,
    descripcion: "10 creditos para talleres con flujo regular.",
  },
  {
    id: "PACK_PRO",
    nombre: "Pack pro",
    creditos: 25,
    precio_clp: 225000,
    descripcion: "25 creditos para operacion frecuente.",
  },
  {
    id: "PACK_MASTER",
    nombre: "Pack master",
    creditos: 50,
    precio_clp: 425000,
    descripcion: "50 creditos para masters y alto volumen.",
  },
];

const BACKEND_URL = String(process.env.BACKEND_URL || "http://localhost:3000").replace(/\/$/, "");
const FRONTEND_URL = String(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const normalizarMonto = (valor, defecto = 0) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return defecto;
  return Math.max(0, Number(numero.toFixed(2)));
};

const buscarPaquete = (paqueteId) =>
  PAQUETES_CREDITOS.find((paquete) => paquete.id === limpiarTexto(paqueteId));

const crearUrlPago = (respuestaFlow = {}) => {
  const url = limpiarTexto(respuestaFlow.url);
  const token = limpiarTexto(respuestaFlow.token);
  if (!url || !token) return url || "";
  if (url.includes("token=")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
};

const estadoPagoExitoso = (status = {}) => Number(status.status) === 2;

const estadoPagoFallido = (status = {}) =>
  [3, 4, 5].includes(Number(status.status)) ||
  ["RECHAZADO", "ANULADO", "FALLIDO", "EXPIRED", "EXPIRE"].includes(
    limpiarTexto(status.status).toUpperCase()
  );

const estadoTextoFlow = (status = {}) =>
  limpiarTexto(status.status) || limpiarTexto(status.statusText) || "SIN_ESTADO";

const payloadN8nCompra = ({ compra, cuenta, usuario, evento, status = null }) => ({
  evento,
  cuenta: cuenta
    ? {
        id: cuenta.id,
        nombre_taller: cuenta.nombre_taller,
        email: cuenta.email,
        telefono: cuenta.telefono,
      }
    : null,
  usuario: usuario
    ? {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        username: usuario.username || null,
      }
    : null,
  email: usuario?.email || cuenta?.email || null,
  whatsapp: cuenta?.telefono || null,
  creditos: compra?.creditos || null,
  monto: compra?.monto_clp || null,
  archivoId: null,
  servicios: "Compra de creditos Portal Master",
  fecha: new Date().toISOString(),
  link_admin: `${FRONTEND_URL}/portal-admin?cuentaId=${cuenta?.id || ""}`,
  flow_status: status ? estadoTextoFlow(status) : compra?.flow_status || null,
});

const mapearCompra = (compra) => {
  const json = typeof compra.toJSON === "function" ? compra.toJSON() : compra;
  return {
    id: json.id,
    cuentaId: json.cuentaId,
    usuarioId: json.usuarioId,
    paquete_id: json.paquete_id,
    creditos: json.creditos,
    monto_clp: json.monto_clp,
    estado: json.estado,
    flow_commerce_order: json.flow_commerce_order,
    flow_status: json.flow_status,
    pagada_at: json.pagada_at,
    fallida_at: json.fallida_at,
    movimientoId: json.movimientoId,
    Cuenta: json.PortalCuenta
      ? {
          id: json.PortalCuenta.id,
          nombre_taller: json.PortalCuenta.nombre_taller,
          email: json.PortalCuenta.email,
          telefono: json.PortalCuenta.telefono,
          saldo_creditos: json.PortalCuenta.saldo_creditos,
        }
      : null,
    Usuario: json.PortalUsuario
      ? {
          id: json.PortalUsuario.id,
          nombre: json.PortalUsuario.nombre,
          email: json.PortalUsuario.email,
          username: json.PortalUsuario.username || null,
        }
      : null,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };
};

const obtenerCreditos = async (req, res) => {
  try {
    const movimientos = await PortalCreditoMovimiento.findAll({
      where: {
        cuentaId: req.portal.cuenta.id,
      },
      order: [["createdAt", "DESC"]],
      limit: 20,
    });

    const compras = await PortalCreditoCompra.findAll({
      where: {
        cuentaId: req.portal.cuenta.id,
      },
      order: [["createdAt", "DESC"]],
      limit: 10,
    });

    res.json({
      cuentaId: req.portal.cuenta.id,
      saldo_creditos: req.portal.cuenta.saldo_creditos,
      paquetes: PAQUETES_CREDITOS,
      compras: compras.map(mapearCompra),
      movimientos: movimientos.map((movimiento) => ({
        id: movimiento.id,
        tipo: movimiento.tipo,
        monto: movimiento.monto,
        saldo_anterior: movimiento.saldo_anterior,
        saldo_nuevo: movimiento.saldo_nuevo,
        referencia: movimiento.referencia,
        observacion: movimiento.observacion,
        createdAt: movimiento.createdAt,
      })),
    });
  } catch (error) {
    console.error("ERROR PORTAL CREDITOS:", error);
    res.status(500).json({ error: error.message });
  }
};

const listarPaquetes = async (req, res) => {
  res.json(PAQUETES_CREDITOS);
};

const listarCompras = async (req, res) => {
  try {
    const compras = await PortalCreditoCompra.findAll({
      where: {
        cuentaId: req.portal.cuenta.id,
      },
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    res.json({
      compras: compras.map(mapearCompra),
    });
  } catch (error) {
    console.error("ERROR LISTANDO COMPRAS CREDITOS:", error);
    res.status(500).json({ error: error.message });
  }
};

const comprarCreditos = async (req, res) => {
  let compra = null;
  try {
    const paquete = buscarPaquete(req.body.paquete_id);

    if (!paquete) {
      return res.status(400).json({
        error: "Paquete de creditos no valido.",
      });
    }

    if (!req.portal.cuenta.activo || !req.portal.cuenta.aprobado) {
      return res.status(403).json({
        error: "Cuenta portal inactiva.",
      });
    }

    if (!req.portal.usuario.activo || !req.portal.usuario.aprobado) {
      return res.status(403).json({
        error: "Usuario portal inactivo.",
      });
    }

    const commerceOrder = `PORTAL-CRED-${String(req.portal.cuenta.id).slice(0, 8)}-${Date.now()}`;
    compra = await PortalCreditoCompra.create({
      cuentaId: req.portal.cuenta.id,
      usuarioId: req.portal.usuario.id,
      paquete_id: paquete.id,
      creditos: paquete.creditos,
      monto_clp: paquete.precio_clp,
      estado: "PENDIENTE",
      flow_commerce_order: commerceOrder,
    });

    const flowResponse = await flow.createPayment({
      commerceOrder,
      subject: `GMTCH Portal Master - ${paquete.nombre}`,
      amount: paquete.precio_clp,
      email: req.portal.usuario.email || req.portal.cuenta.email,
      urlConfirmation: `${BACKEND_URL}/api/portal/creditos/flow/confirmacion`,
      urlReturn: `${FRONTEND_URL}/portal/creditos?compra=${compra.id}`,
      optional: {
        tipo: "PORTAL_CREDITOS",
        compraId: compra.id,
        cuentaId: req.portal.cuenta.id,
        usuarioId: req.portal.usuario.id,
        paquete_id: paquete.id,
      },
    });

    await compra.update({
      flow_token: limpiarTexto(flowResponse.token),
      flow_payload: {
        token_recibido: Boolean(flowResponse.token),
        url_recibida: Boolean(flowResponse.url),
        flowOrder: flowResponse.flowOrder || null,
      },
    });

    await registrarEventoPortal({
      req,
      cuentaId: req.portal.cuenta.id,
      usuarioId: req.portal.usuario.id,
      tipo: "PORTAL_COMPRA_CREDITOS_INICIADA",
      resultado: "OK",
      descripcion: "Compra de creditos iniciada en Portal Master",
      metadata: {
        compraId: compra.id,
        paquete_id: paquete.id,
        creditos: paquete.creditos,
        monto_clp: paquete.precio_clp,
        commerceOrder,
      },
      creado_por: req.portal.usuario.email,
    });

    await notificarN8nPortal(
      "PORTAL_COMPRA_CREDITOS_INICIADA",
      payloadN8nCompra({
        compra,
        cuenta: req.portal.cuenta,
        usuario: req.portal.usuario,
        evento: "PORTAL_COMPRA_CREDITOS_INICIADA",
      })
    );

    return res.status(201).json({
      mensaje: "Compra iniciada correctamente.",
      compra: mapearCompra({
        ...compra.toJSON(),
        flow_token: undefined,
      }),
      paquete,
      url: flowResponse.url,
      token: flowResponse.token,
      url_pago: crearUrlPago(flowResponse),
    });
  } catch (error) {
    console.error("ERROR COMPRANDO CREDITOS PORTAL:", error.response?.data || error.message);
    if (compra?.id) {
      try {
        await compra.update({
          estado: "FALLIDA",
          fallida_at: new Date(),
          flow_payload: {
            error: error.response?.data || error.message,
          },
        });
      } catch (updateError) {
        console.warn("No se pudo marcar compra Flow como fallida:", updateError.message);
      }
    }
    return res.status(500).json({
      error: "No se pudo iniciar la compra de creditos.",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const resolverCompraPorFlow = async (status = {}, token = "") => {
  const commerceOrder = limpiarTexto(status.commerceOrder);
  const where = [];

  if (token) where.push({ flow_token: token });
  if (commerceOrder) where.push({ flow_commerce_order: commerceOrder });

  if (!where.length) return null;

  return PortalCreditoCompra.findOne({
    where: {
      [Op.or]: where,
    },
    include: [
      { model: PortalCuenta, required: false },
      { model: PortalUsuario, required: false },
    ],
  });
};

const confirmarFlow = async (req, res) => {
  const token = limpiarTexto(req.body.token || req.query.token);

  if (!token) {
    return res.status(400).json({ error: "Falta token Flow." });
  }

  try {
    const status = await flow.getPaymentStatus(token);
    const compraEncontrada = await resolverCompraPorFlow(status, token);

    if (!compraEncontrada) {
      await registrarEventoPortal({
        req,
        tipo: "PORTAL_PAGO_CREDITOS_COMPRA_NO_ENCONTRADA",
        resultado: "ERROR",
        descripcion: "Flow confirmo un pago sin compra portal asociada",
        metadata: {
          commerceOrder: status.commerceOrder || null,
          flow_status: estadoTextoFlow(status),
        },
      });
      return res.json({ ok: true });
    }

    if (compraEncontrada.estado === "PAGADA") {
      return res.json({ ok: true, idempotente: true });
    }

    if (estadoPagoExitoso(status)) {
      const resultado = await sequelize.transaction(async (transaction) => {
        const compra = await PortalCreditoCompra.findByPk(compraEncontrada.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!compra || compra.estado === "PAGADA") {
          return { compra, cuenta: null, usuario: null, movimiento: null, idempotente: true };
        }

        const cuenta = await PortalCuenta.findByPk(compra.cuentaId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const usuario = await PortalUsuario.findByPk(compra.usuarioId, { transaction });

        if (!cuenta) {
          throw new Error("Cuenta portal no encontrada para compra Flow.");
        }

        const saldoAnterior = normalizarMonto(cuenta.saldo_creditos, 0);
        const creditos = normalizarMonto(compra.creditos, 0);
        const saldoNuevo = normalizarMonto(saldoAnterior + creditos, 0);

        await cuenta.update({ saldo_creditos: saldoNuevo }, { transaction });

        const movimiento = await PortalCreditoMovimiento.create(
          {
            cuentaId: cuenta.id,
            tipo: "COMPRA_FLOW",
            monto: creditos,
            saldo_anterior: saldoAnterior,
            saldo_nuevo: saldoNuevo,
            referencia: compra.flow_commerce_order,
            creado_por: "flow",
            observacion: "Compra de creditos via Flow",
          },
          { transaction }
        );

        await compra.update(
          {
            estado: "PAGADA",
            flow_status: estadoTextoFlow(status),
            flow_payload: status,
            pagada_at: new Date(),
            movimientoId: movimiento.id,
          },
          { transaction }
        );

        return { compra, cuenta, usuario, movimiento, idempotente: false };
      });

      if (!resultado.idempotente) {
        await registrarEventoPortal({
          req,
          cuentaId: resultado.compra.cuentaId,
          usuarioId: resultado.compra.usuarioId,
          tipo: "PORTAL_PAGO_CREDITOS_OK",
          resultado: "OK",
          descripcion: "Pago Flow confirmado y creditos cargados",
          metadata: {
            compraId: resultado.compra.id,
            movimientoId: resultado.movimiento?.id || null,
            creditos: resultado.compra.creditos,
            monto_clp: resultado.compra.monto_clp,
            commerceOrder: resultado.compra.flow_commerce_order,
          },
          creado_por: "flow",
        });

        await notificarN8nPortal(
          "PORTAL_PAGO_CREDITOS_OK",
          payloadN8nCompra({
            compra: resultado.compra,
            cuenta: resultado.cuenta,
            usuario: resultado.usuario,
            evento: "PORTAL_PAGO_CREDITOS_OK",
            status,
          })
        );
      }

      return res.json({ ok: true });
    }

    if (estadoPagoFallido(status)) {
      await compraEncontrada.update({
        estado: "FALLIDA",
        flow_status: estadoTextoFlow(status),
        flow_payload: status,
        fallida_at: new Date(),
      });

      await registrarEventoPortal({
        req,
        cuentaId: compraEncontrada.cuentaId,
        usuarioId: compraEncontrada.usuarioId,
        tipo: "PORTAL_PAGO_CREDITOS_FALLIDO",
        resultado: "ERROR",
        descripcion: "Pago Flow de creditos fallido",
        metadata: {
          compraId: compraEncontrada.id,
          commerceOrder: compraEncontrada.flow_commerce_order,
          flow_status: estadoTextoFlow(status),
        },
        creado_por: "flow",
      });

      await notificarN8nPortal(
        "PORTAL_PAGO_CREDITOS_FALLIDO",
        payloadN8nCompra({
          compra: compraEncontrada,
          cuenta: compraEncontrada.PortalCuenta,
          usuario: compraEncontrada.PortalUsuario,
          evento: "PORTAL_PAGO_CREDITOS_FALLIDO",
          status,
        })
      );
    } else {
      await compraEncontrada.update({
        flow_status: estadoTextoFlow(status),
        flow_payload: status,
      });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error("ERROR CONFIRMACION FLOW PORTAL CREDITOS:", error.response?.data || error.message);
    return res.status(500).json({
      error: "No se pudo procesar confirmacion Flow.",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const retornoFlow = async (req, res) => {
  res.json({
    ok: true,
    mensaje: "Retorno recibido. El saldo se actualiza solo cuando Flow confirma el pago al backend.",
  });
};

const listarComprasAdmin = async (req, res) => {
  try {
    const compras = await PortalCreditoCompra.findAll({
      include: [
        { model: PortalCuenta, required: false },
        { model: PortalUsuario, required: false },
      ],
      order: [["createdAt", "DESC"]],
      limit: 100,
    });

    res.json({
      compras: compras.map(mapearCompra),
    });
  } catch (error) {
    console.error("ERROR ADMIN COMPRAS CREDITOS:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  PAQUETES_CREDITOS,
  obtenerCreditos,
  listarPaquetes,
  listarCompras,
  comprarCreditos,
  confirmarFlow,
  retornoFlow,
  listarComprasAdmin,
};
