const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");

const {
  Vehiculo,
  Cliente,
  OrdenTrabajo,
  ArchivoECU,
  FotoVehiculo,
  Diagnostico,
} = require("../models");

const normalizarPatente = (patente) => {
  return String(patente || "").trim().toUpperCase().replace(/\s+/g, "");
};

const limpiarTexto = (valor) => {
  const texto = String(valor || "").trim();
  return texto || null;
};

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

    const cliente = await Cliente.findByPk(clienteId);

    if (!cliente) {
      return res.status(404).json({
        error: "Cliente no encontrado",
      });
    }

    const existente = await sequelize.query(
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
        type: QueryTypes.INSERT,
      }
    );

    const vehiculo = Array.isArray(insertado?.[0]) ? insertado[0][0] : insertado[0];

    res.status(201).json({
      mensaje: "Vehículo creado correctamente",
      vehiculo,
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
    const vehiculos = await Vehiculo.findAll({
      include: [
        {
          model: Cliente,
          required: false,
        },
        {
          model: OrdenTrabajo,
          required: false,
          include: [
            {
              model: ArchivoECU,
              required: false,
            },
            {
              model: FotoVehiculo,
              required: false,
            },
            {
              model: Diagnostico,
              required: false,
            },
          ],
        },
      ],
      order: [
        ["patente", "ASC"],
      ],
    });

    res.json(vehiculos);
  } catch (error) {
    console.error("ERROR OBTENIENDO VEHÍCULOS:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const obtenerVehiculoPorId = async (req, res) => {
  try {
    const vehiculo = await Vehiculo.findByPk(req.params.id, {
      include: [
        {
          model: Cliente,
          required: false,
        },
        {
          model: OrdenTrabajo,
          required: false,
          include: [
            {
              model: ArchivoECU,
              required: false,
            },
            {
              model: FotoVehiculo,
              required: false,
            },
            {
              model: Diagnostico,
              required: false,
            },
          ],
        },
      ],
    });

    if (!vehiculo) {
      return res.status(404).json({
        error: "Vehículo no encontrado",
      });
    }

    res.json(vehiculo);
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

    const vehiculo = await Vehiculo.findOne({
      where: {
        patente,
      },
      include: [
        {
          model: Cliente,
          required: false,
        },
        {
          model: OrdenTrabajo,
          required: false,
          include: [
            {
              model: ArchivoECU,
              required: false,
            },
            {
              model: FotoVehiculo,
              required: false,
            },
            {
              model: Diagnostico,
              required: false,
            },
          ],
        },
      ],
    });

    if (!vehiculo) {
      return res.status(404).json({
        error: "Vehículo no encontrado",
      });
    }

    res.json(vehiculo);
  } catch (error) {
    console.error("ERROR OBTENIENDO VEHÍCULO POR PATENTE:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const actualizarVehiculo = async (req, res) => {
  try {
    const vehiculo = await Vehiculo.findByPk(req.params.id);

    if (!vehiculo) {
      return res.status(404).json({
        error: "Vehículo no encontrado",
      });
    }

    const payload = {
      ...req.body,
    };

    if (payload.patente) {
      payload.patente = normalizarPatente(payload.patente);
    }

    await vehiculo.update(payload);

    res.json(vehiculo);
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
    const vehiculo = await Vehiculo.findByPk(req.params.id, {
      include: [
        {
          model: OrdenTrabajo,
          required: false,
        },
      ],
    });

    if (!vehiculo) {
      return res.status(404).json({
        error: "Vehículo no encontrado",
      });
    }

    const tieneHistorial =
      Array.isArray(vehiculo.OrdenTrabajos) && vehiculo.OrdenTrabajos.length > 0;

    if (tieneHistorial) {
      return res.status(400).json({
        error:
          "Este vehículo tiene historial de órdenes. Por seguridad no se elimina.",
      });
    }

    await vehiculo.destroy();

    res.json({
      mensaje: "Vehículo eliminado correctamente",
      id: req.params.id,
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