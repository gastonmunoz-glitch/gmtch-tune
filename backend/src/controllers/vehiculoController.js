const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");

console.log("🚗 VEHICULO CONTROLLER VERSION: SQL-DIRECT-V5-2026-06-22");

const normalizarPatente = (patente) => {
  return String(patente || "").trim().toUpperCase().replace(/\s+/g, "");
};

const limpiarTexto = (valor) => {
  const texto = String(valor || "").trim();
  return texto || null;
};

const crearVehiculo = async (req, res) => {
  try {
    console.log("🚗 CREAR VEHICULO SQL-DIRECT-V5 BODY:", req.body);

    const patente = normalizarPatente(req.body.patente);
    const clienteId = req.body.clienteId ? Number(req.body.clienteId) : null;
    const marca = limpiarTexto(req.body.marca) || "SIN MARCA";
    const modelo = limpiarTexto(req.body.modelo) || "SIN MODELO";
    const anio = req.body.anio ? Number(req.body.anio) : null;
    const vin = limpiarTexto(req.body.vin);
    const tipo_unidad = limpiarTexto(req.body.tipo_unidad) || "AUTO";

    if (!patente) {
      return res.status(400).json({ error: "Falta patente" });
    }

    if (!clienteId) {
      return res.status(400).json({ error: "Falta clienteId" });
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
      return res.status(404).json({ error: "Cliente no encontrado" });
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

    return res.status(201).json({
      mensaje: "Vehículo creado correctamente",
      controller: "SQL-DIRECT-V5",
      vehiculo: insertado[0],
    });
  } catch (error) {
    console.error("❌ ERROR CREANDO VEHÍCULO SQL-DIRECT-V5:", error);

    return res.status(500).json({
      error: error.message,
      controller: "SQL-DIRECT-V5",
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const obtenerVehiculos = async (req, res) => {
  try {
    const rows = await sequelize.query(
      `
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

        (
          SELECT COUNT(*)::int
          FROM "ordenes_trabajo" o
          WHERE o."vehiculoId" = v."id"
        ) AS "total_ordenes"

      FROM "vehiculos" v
      LEFT JOIN "clientes" c ON c."id" = v."clienteId"
      ORDER BY c."nombre" ASC NULLS LAST, v."patente" ASC;
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    const data = rows.map((row) => ({
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
      OrdenTrabajos: Array.from({ length: Number(row.total_ordenes || 0) }, (_, i) => ({
        id: `historial-${i + 1}`,
      })),
    }));

    return res.json(data);
  } catch (error) {
    console.error("❌ ERROR OBTENIENDO VEHÍCULOS SQL-DIRECT-V5:", error);

    return res.status(500).json({
      error: error.message,
      controller: "SQL-DIRECT-V5",
    });
  }
};

const obtenerVehiculoPorId = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const rows = await sequelize.query(
      `
      SELECT
        v.*,
        c."id" AS "cliente_id",
        c."nombre" AS "cliente_nombre",
        c."telefono" AS "cliente_telefono",
        c."email" AS "cliente_email",
        c."direccion" AS "cliente_direccion",
        c."categoria_cliente" AS "cliente_categoria_cliente",
        c."nota_cliente" AS "cliente_nota_cliente"
      FROM "vehiculos" v
      LEFT JOIN "clientes" c ON c."id" = v."clienteId"
      WHERE v."id" = :id
      LIMIT 1;
      `,
      {
        replacements: { id },
        type: QueryTypes.SELECT,
      }
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    const row = rows[0];

    const ordenes = await sequelize.query(
      `
      SELECT *
      FROM "ordenes_trabajo"
      WHERE "vehiculoId" = :id
      ORDER BY "createdAt" DESC;
      `,
      {
        replacements: { id },
        type: QueryTypes.SELECT,
      }
    );

    return res.json({
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
      OrdenTrabajos: ordenes,
    });
  } catch (error) {
    console.error("❌ ERROR OBTENIENDO VEHÍCULO SQL-DIRECT-V5:", error);

    return res.status(500).json({
      error: error.message,
      controller: "SQL-DIRECT-V5",
    });
  }
};

const obtenerVehiculoPorPatente = async (req, res) => {
  try {
    const patente = normalizarPatente(req.params.patente);

    const rows = await sequelize.query(
      `
      SELECT *
      FROM "vehiculos"
      WHERE UPPER(TRIM("patente")) = :patente
      LIMIT 1;
      `,
      {
        replacements: { patente },
        type: QueryTypes.SELECT,
      }
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("❌ ERROR OBTENIENDO VEHÍCULO POR PATENTE SQL-DIRECT-V5:", error);

    return res.status(500).json({
      error: error.message,
      controller: "SQL-DIRECT-V5",
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
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    const actual = existente[0];

    const clienteId =
      req.body.clienteId !== undefined ? Number(req.body.clienteId) : actual.clienteId;

    const patente =
      req.body.patente !== undefined
        ? normalizarPatente(req.body.patente)
        : actual.patente;

    const marca =
      req.body.marca !== undefined
        ? limpiarTexto(req.body.marca) || actual.marca
        : actual.marca;

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

    const activo =
      req.body.activo !== undefined ? Boolean(req.body.activo) : actual.activo;

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

    return res.json(actualizado[0]);
  } catch (error) {
    console.error("❌ ERROR ACTUALIZANDO VEHÍCULO SQL-DIRECT-V5:", error);

    return res.status(500).json({
      error: error.message,
      controller: "SQL-DIRECT-V5",
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
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    return res.json({
      mensaje: "Vehículo eliminado correctamente",
      id,
    });
  } catch (error) {
    console.error("❌ ERROR ELIMINANDO VEHÍCULO SQL-DIRECT-V5:", error);

    return res.status(500).json({
      error: error.message,
      controller: "SQL-DIRECT-V5",
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