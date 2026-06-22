const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");

const normalizarPatente = (patente) => {
  return String(patente || "").trim().toUpperCase().replace(/\s+/g, "");
};

const limpiarTexto = (valor) => {
  const texto = String(valor || "").trim();
  return texto || null;
};

const mapearVehiculos = (rows = []) => {
  const mapa = new Map();

  rows.forEach((row) => {
    if (!mapa.has(row.id)) {
      mapa.set(row.id, {
        id: row.id,
        clienteId: row.clienteId,
        patente: row.patente,
        marca: row.marca,
        modelo: row.modelo,
        anio: row.anio,
        vin: row.vin,
        tipo_unidad: row.tipo_unidad,
        activo: row.activo,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,

        Cliente: row.cliente_id
          ? {
              id: row.cliente_id,
              nombre: row.cliente_nombre,
              telefono: row.cliente_telefono,
              email: row.cliente_email,
              direccion: row.cliente_direccion,
              categoria_cliente: row.cliente_categoria_cliente || "NORMAL",
              nota_cliente: row.cliente_nota_cliente,
            }
          : null,

        OrdenTrabajos: [],
      });
    }

    if (row.orden_id) {
      mapa.get(row.id).OrdenTrabajos.push({
        id: row.orden_id,
        vehiculoId: row.orden_vehiculoId,
        prioridad: row.orden_prioridad,
        estado: row.orden_estado,
        estado_pago: row.orden_estado_pago,
        medio_pago: row.orden_medio_pago,
        monto_pagado: row.orden_monto_pagado,
        fecha_pago: row.orden_fecha_pago,
        cobrado_por: row.orden_cobrado_por,
        observacion_pago: row.orden_observacion_pago,
        kilometraje: row.orden_kilometraje,
        motivo_ingreso: row.orden_motivo_ingreso,
        monto_total: row.orden_monto_total,
        createdAt: row.orden_createdAt,
        updatedAt: row.orden_updatedAt,
      });
    }
  });

  return Array.from(mapa.values());
};

const queryVehiculosBase = `
  SELECT
    v."id",
    v."clienteId",
    v."patente",
    v."marca",
    v."modelo",
    v."anio",
    v."vin",
    v."tipo_unidad",
    v."activo",
    v."createdAt",
    v."updatedAt",

    c."id" AS "cliente_id",
    c."nombre" AS "cliente_nombre",
    c."telefono" AS "cliente_telefono",
    c."email" AS "cliente_email",
    c."direccion" AS "cliente_direccion",
    c."categoria_cliente" AS "cliente_categoria_cliente",
    c."nota_cliente" AS "cliente_nota_cliente",

    o."id" AS "orden_id",
    o."vehiculoId" AS "orden_vehiculoId",
    o."prioridad" AS "orden_prioridad",
    o."estado" AS "orden_estado",
    o."estado_pago" AS "orden_estado_pago",
    o."medio_pago" AS "orden_medio_pago",
    o."monto_pagado" AS "orden_monto_pagado",
    o."fecha_pago" AS "orden_fecha_pago",
    o."cobrado_por" AS "orden_cobrado_por",
    o."observacion_pago" AS "orden_observacion_pago",
    o."kilometraje" AS "orden_kilometraje",
    o."motivo_ingreso" AS "orden_motivo_ingreso",
    o."monto_total" AS "orden_monto_total",
    o."createdAt" AS "orden_createdAt",
    o."updatedAt" AS "orden_updatedAt"

  FROM "vehiculos" v
  LEFT JOIN "clientes" c ON c."id" = v."clienteId"
  LEFT JOIN "ordenes_trabajo" o ON o."vehiculoId" = v."id"
`;

const crearVehiculo = async (req, res) => {
  try {
    const patente = normalizarPatente(req.body.patente);
    const clienteId = req.body.clienteId ? Number(req.body.clienteId) : null;
    const marca = limpiarTexto(req.body.marca) || "SIN MARCA";
    const modelo = limpiarTexto(req.body.modelo) || "SIN MODELO";
    const anio = req.body.anio ? Number(req.body.anio) : null;
    const vin = limpiarTexto(req.body.vin);
    const tipo_unidad = limpiarTexto(req.body.tipo_unidad) || "AUTO";

    if (!patente) {
      return res.status(400).json({
        error: "Falta patente",
      });
    }

    if (!clienteId) {
      return res.status(400).json({
        error: "Falta clienteId",
      });
    }

    const cliente = await sequelize.query(
      `
      SELECT "id"
      FROM "clientes"
      WHERE "id" = :clienteId
      LIMIT 1;
      `,
      {
        replacements: { clienteId },
        type: QueryTypes.SELECT,
      }
    );

    if (cliente.length === 0) {
      return res.status(404).json({
        error: "Cliente no encontrado",
      });
    }

    const existente = await sequelize.query(
      `
      SELECT "id", "patente"
      FROM "vehiculos"
      WHERE UPPER(TRIM("patente")) = :patente
      LIMIT 1;
      `,
      {
        replacements: { patente },
        type: QueryTypes.SELECT,
      }
    );

    if (existente.length > 0) {
      return res.status(409).json({
        error: "La patente ya está registrada",
        vehiculo: existente[0],
      });
    }

    const insertado = await sequelize.query(
      `
      INSERT INTO "vehiculos"
        (
          "clienteId",
          "patente",
          "marca",
          "modelo",
          "anio",
          "vin",
          "tipo_unidad",
          "activo",
          "createdAt",
          "updatedAt"
        )
      VALUES
        (
          :clienteId,
          :patente,
          :marca,
          :modelo,
          :anio,
          :vin,
          :tipo_unidad,
          true,
          NOW(),
          NOW()
        )
      RETURNING *;
      `,
      {
        replacements: {
          clienteId,
          patente,
          marca,
          modelo,
          anio,
          vin,
          tipo_unidad,
        },
        type: QueryTypes.SELECT,
      }
    );

    res.status(201).json({
      mensaje: "Vehículo creado correctamente",
      vehiculo: insertado[0],
    });
  } catch (error) {
    console.error("ERROR CREANDO VEHÍCULO:", error);

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const obtenerVehiculos = async (req, res) => {
  try {
    const rows = await sequelize.query(
      `
      ${queryVehiculosBase}
      ORDER BY
        c."nombre" ASC NULLS LAST,
        v."patente" ASC,
        o."createdAt" DESC NULLS LAST;
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    res.json(mapearVehiculos(rows));
  } catch (error) {
    console.error("ERROR OBTENIENDO VEHÍCULOS:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const obtenerVehiculoPorId = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const rows = await sequelize.query(
      `
      ${queryVehiculosBase}
      WHERE v."id" = :id
      ORDER BY o."createdAt" DESC NULLS LAST;
      `,
      {
        replacements: { id },
        type: QueryTypes.SELECT,
      }
    );

    const vehiculos = mapearVehiculos(rows);

    if (vehiculos.length === 0) {
      return res.status(404).json({
        error: "Vehículo no encontrado",
      });
    }

    res.json(vehiculos[0]);
  } catch (error) {
    console.error("ERROR OBTENIENDO VEHÍCULO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const obtenerVehiculoPorPatente = async (req, res) => {
  try {
    const patente = normalizarPatente(req.params.patente);

    const rows = await sequelize.query(
      `
      ${queryVehiculosBase}
      WHERE UPPER(TRIM(v."patente")) = :patente
      ORDER BY o."createdAt" DESC NULLS LAST;
      `,
      {
        replacements: { patente },
        type: QueryTypes.SELECT,
      }
    );

    const vehiculos = mapearVehiculos(rows);

    if (vehiculos.length === 0) {
      return res.status(404).json({
        error: "Vehículo no encontrado",
      });
    }

    res.json(vehiculos[0]);
  } catch (error) {
    console.error("ERROR OBTENIENDO VEHÍCULO POR PATENTE:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const actualizarVehiculo = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const existente = await sequelize.query(
      `
      SELECT *
      FROM "vehiculos"
      WHERE "id" = :id
      LIMIT 1;
      `,
      {
        replacements: { id },
        type: QueryTypes.SELECT,
      }
    );

    if (existente.length === 0) {
      return res.status(404).json({
        error: "Vehículo no encontrado",
      });
    }

    const actual = existente[0];

    const clienteId =
      req.body.clienteId !== undefined ? Number(req.body.clienteId) : actual.clienteId;

    const patente =
      req.body.patente !== undefined
        ? normalizarPatente(req.body.patente)
        : actual.patente;

    const marca =
      req.body.marca !== undefined ? limpiarTexto(req.body.marca) || actual.marca : actual.marca;

    const modelo =
      req.body.modelo !== undefined
        ? limpiarTexto(req.body.modelo) || actual.modelo
        : actual.modelo;

    const anio = req.body.anio !== undefined ? Number(req.body.anio) || null : actual.anio;
    const vin = req.body.vin !== undefined ? limpiarTexto(req.body.vin) : actual.vin;

    const tipo_unidad =
      req.body.tipo_unidad !== undefined
        ? limpiarTexto(req.body.tipo_unidad) || "AUTO"
        : actual.tipo_unidad;

    const activo = req.body.activo !== undefined ? Boolean(req.body.activo) : actual.activo;

    const actualizado = await sequelize.query(
      `
      UPDATE "vehiculos"
      SET
        "clienteId" = :clienteId,
        "patente" = :patente,
        "marca" = :marca,
        "modelo" = :modelo,
        "anio" = :anio,
        "vin" = :vin,
        "tipo_unidad" = :tipo_unidad,
        "activo" = :activo,
        "updatedAt" = NOW()
      WHERE "id" = :id
      RETURNING *;
      `,
      {
        replacements: {
          id,
          clienteId,
          patente,
          marca,
          modelo,
          anio,
          vin,
          tipo_unidad,
          activo,
        },
        type: QueryTypes.SELECT,
      }
    );

    res.json(actualizado[0]);
  } catch (error) {
    console.error("ERROR ACTUALIZANDO VEHÍCULO:", error);

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const eliminarVehiculo = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const historial = await sequelize.query(
      `
      SELECT COUNT(*)::int AS total
      FROM "ordenes_trabajo"
      WHERE "vehiculoId" = :id;
      `,
      {
        replacements: { id },
        type: QueryTypes.SELECT,
      }
    );

    if ((historial[0]?.total || 0) > 0) {
      return res.status(400).json({
        error:
          "Este vehículo tiene historial de órdenes. Por seguridad no se elimina.",
      });
    }

    const eliminado = await sequelize.query(
      `
      DELETE FROM "vehiculos"
      WHERE "id" = :id
      RETURNING "id";
      `,
      {
        replacements: { id },
        type: QueryTypes.SELECT,
      }
    );

    if (eliminado.length === 0) {
      return res.status(404).json({
        error: "Vehículo no encontrado",
      });
    }

    res.json({
      mensaje: "Vehículo eliminado correctamente",
      id,
    });
  } catch (error) {
    console.error("ERROR ELIMINANDO VEHÍCULO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  crearVehiculo,
  obtenerVehiculos,
  obtenerVehiculoPorId,
  obtenerVehiculoPorPatente,
  actualizarVehiculo,
  eliminarVehiculo,
};