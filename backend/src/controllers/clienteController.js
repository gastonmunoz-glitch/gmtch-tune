const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const { Cliente, Vehiculo, OrdenTrabajo } = require("../models");

let columnasPreparadas = false;

const obtenerEmpresaIdRequerida = (req) => {
  const empresaId = String(req.auth?.empresaId || "").trim();

  if (!empresaId) {
    const error = new Error(
      "La empresa autenticada no esta disponible para operar en recepcion."
    );
    error.statusCode = 503;
    error.codigo = "EMPRESA_NO_DISPONIBLE";
    throw error;
  }

  return empresaId;
};

const responderErrorEmpresa = (res, error) => {
  if (error?.codigo !== "EMPRESA_NO_DISPONIBLE") return false;

  res.status(503).json({
    error: "EMPRESA_NO_DISPONIBLE",
    codigo: "EMPRESA_NO_DISPONIBLE",
    message: error.message,
  });
  return true;
};

const normalizarCategoria = (categoria) => {
  const valor = String(categoria || "NORMAL").trim().toUpperCase();
  const compatibilidad = {
    MAYORISTA: "TALLER_ALIADO",
    PROVEEDOR: "TALLER_ALIADO",
  };
  const normalizada = compatibilidad[valor] || valor;

  const permitidas = [
    "NORMAL",
    "VIP",
    "FLOTA",
    "TALLER_ALIADO",
    "GARANTIA_RECLAMO",
    "INTERNO",
  ];

  return permitidas.includes(normalizada) ? normalizada : "NORMAL";
};

const normalizarBoolean = (valor) => {
  if (valor === true || valor === false) return valor;
  if (valor === 1 || valor === "1") return true;
  if (valor === 0 || valor === "0") return false;

  const texto = String(valor ?? "").trim().toLowerCase();
  return ["true", "si", "sí", "yes", "on"].includes(texto);
};

const prepararColumnas = async () => {
  if (columnasPreparadas) return;

  await sequelize.query(`
    ALTER TABLE "clientes"
    ADD COLUMN IF NOT EXISTS "excluir_estadisticas" BOOLEAN DEFAULT false;

    UPDATE "clientes"
    SET "excluir_estadisticas" = false
    WHERE "excluir_estadisticas" IS NULL;
  `);

  columnasPreparadas = true;
};

const limpiarPayloadCliente = (body = {}) => {
  return {
    nombre: body.nombre || "",
    telefono: body.telefono || null,
    email: body.email || null,
    direccion: body.direccion || null,
    categoria_cliente: normalizarCategoria(body.categoria_cliente),
    excluir_estadisticas: normalizarBoolean(body.excluir_estadisticas),
    nota_cliente: body.nota_cliente || null,
  };
};

const toNumber = (valor) => {
  const numero = Number(valor || 0);
  return Number.isFinite(numero) ? numero : 0;
};

const maxFecha = (fechas) => {
  const validas = fechas
    .filter(Boolean)
    .map((fecha) => new Date(fecha))
    .filter((fecha) => !Number.isNaN(fecha.getTime()));

  if (!validas.length) return null;

  return validas.reduce((ultima, fecha) => (fecha > ultima ? fecha : ultima)).toISOString();
};

const obtenerClientes = async (req, res) => {
  try {
    const empresaId = obtenerEmpresaIdRequerida(req);
    await prepararColumnas();

    const clientes = await Cliente.findAll({
      where: { empresaId },
      include: [
        {
          model: Vehiculo,
          required: false,
          where: { empresaId },
          include: [
            {
              model: OrdenTrabajo,
              required: false,
              where: { empresaId },
            },
          ],
        },
      ],
      order: [["nombre", "ASC"]],
    });

    res.json(clientes);
  } catch (error) {
    console.error("ERROR OBTENIENDO CLIENTES:", error);

    if (responderErrorEmpresa(res, error)) return;

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const obtenerClientePorId = async (req, res) => {
  try {
    const empresaId = obtenerEmpresaIdRequerida(req);
    await prepararColumnas();

    const clienteId = req.params.id;

    const clientes = await sequelize.query(
      `SELECT id, nombre, telefono, email, direccion, categoria_cliente, excluir_estadisticas, nota_cliente, "createdAt", "updatedAt"
       FROM clientes
       WHERE id = :clienteId
         AND "empresaId" = :empresaId
       LIMIT 1`,
      {
        replacements: { clienteId, empresaId },
        type: QueryTypes.SELECT,
      }
    );

    const cliente = clientes[0];

    if (!cliente) {
      return res.status(404).json({
        error: "Cliente no encontrado",
      });
    }

    const vehiculos = await sequelize.query(
      `SELECT *
       FROM vehiculos
       WHERE "clienteId" = :clienteId
         AND "empresaId" = :empresaId
       ORDER BY patente ASC`,
      {
        replacements: { clienteId, empresaId },
        type: QueryTypes.SELECT,
      }
    );

    const vehiculoIds = vehiculos.map((vehiculo) => vehiculo.id);
    let ordenes = [];

    if (vehiculoIds.length > 0) {
      ordenes = await sequelize.query(
        `SELECT *
         FROM ordenes_trabajo
         WHERE "vehiculoId" IN (:vehiculoIds)
           AND "empresaId" = :empresaId
         ORDER BY "createdAt" DESC`,
        {
          replacements: { vehiculoIds, empresaId },
          type: QueryTypes.SELECT,
        }
      );
    }

    const ordenesPorVehiculo = ordenes.reduce((acc, orden) => {
      if (!acc[orden.vehiculoId]) acc[orden.vehiculoId] = [];
      acc[orden.vehiculoId].push(orden);
      return acc;
    }, {});

    const vehiculosConOrdenes = vehiculos.map((vehiculo) => ({
      ...vehiculo,
      OrdenTrabajos: ordenesPorVehiculo[vehiculo.id] || [],
    }));

    const ordenesActivas = ordenes.filter(
      (orden) => String(orden.estado || "").toUpperCase() !== "ENTREGADO"
    ).length;

    const pagosPendientes = ordenes.filter(
      (orden) => String(orden.estado_pago || "").toUpperCase() !== "PAGADO"
    ).length;

    const totalFacturado = ordenes.reduce(
      (total, orden) => total + toNumber(orden.monto_total),
      0
    );

    const totalPagado = ordenes.reduce(
      (total, orden) => total + toNumber(orden.monto_pagado),
      0
    );

    const metricas = {
      totalVehiculos: vehiculos.length,
      totalOrdenes: ordenes.length,
      ordenesActivas,
      totalFacturado,
      totalPagado,
      ultimaVisita: maxFecha(ordenes.map((orden) => orden.createdAt)),
      ultimaEntrega: maxFecha(ordenes.map((orden) => orden.entregado_at)),
      pagosPendientes,
    };

    res.json({
      ...cliente,
      Vehiculos: vehiculosConOrdenes,
      OrdenTrabajos: ordenes,
      Ordenes: ordenes,
      metricas,
      ...metricas,
    });
  } catch (error) {
    console.error("ERROR OBTENIENDO FICHA CRM CLIENTE:", error);

    if (responderErrorEmpresa(res, error)) return;

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const crearCliente = async (req, res) => {
  try {
    const empresaId = obtenerEmpresaIdRequerida(req);
    await prepararColumnas();

    const payload = {
      ...limpiarPayloadCliente(req.body),
      empresaId,
    };

    if (!payload.nombre || !payload.nombre.trim()) {
      return res.status(400).json({
        error: "El nombre del cliente es obligatorio",
      });
    }

    const nuevoCliente = await Cliente.create(payload);

    res.status(201).json(nuevoCliente);
  } catch (error) {
    console.error("ERROR CREANDO CLIENTE:", error);

    if (responderErrorEmpresa(res, error)) return;

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const actualizarCliente = async (req, res) => {
  try {
    await prepararColumnas();

    const cliente = await Cliente.findByPk(req.params.id);

    if (!cliente) {
      return res.status(404).json({
        error: "Cliente no encontrado",
      });
    }

    const payload = limpiarPayloadCliente({
      ...cliente.toJSON(),
      ...req.body,
    });

    await cliente.update(payload);

    res.json(cliente);
  } catch (error) {
    console.error("ERROR ACTUALIZANDO CLIENTE:", error);

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const eliminarCliente = async (req, res) => {
  try {
    await prepararColumnas();

    const cliente = await Cliente.findByPk(req.params.id, {
      include: [
        {
          model: Vehiculo,
          required: false,
          include: [
            {
              model: OrdenTrabajo,
              required: false,
            },
          ],
        },
      ],
    });

    if (!cliente) {
      return res.status(404).json({
        error: "Cliente no encontrado",
      });
    }

    const tieneVehiculos =
      Array.isArray(cliente.Vehiculos) && cliente.Vehiculos.length > 0;
    const tieneOrdenes =
      tieneVehiculos &&
      cliente.Vehiculos.some(
        (vehiculo) =>
          Array.isArray(vehiculo.OrdenTrabajos) &&
          vehiculo.OrdenTrabajos.length > 0
      );

    if (tieneVehiculos || tieneOrdenes) {
      return res.status(400).json({
        error:
          "No se puede eliminar un cliente con historial. Más adelante podrá archivarse.",
      });
    }

    await cliente.destroy();

    res.json({
      mensaje: "Cliente eliminado correctamente",
    });
  } catch (error) {
    console.error("ERROR ELIMINANDO CLIENTE:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  obtenerClientes,
  obtenerClientePorId,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
};
