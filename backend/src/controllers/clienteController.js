const { Cliente, Vehiculo, OrdenTrabajo } = require("../models");

const normalizarCategoria = (categoria) => {
  const valor = String(categoria || "NORMAL").trim().toUpperCase();

  const permitidas = [
    "NORMAL",
    "VIP",
    "FLOTA",
    "MAYORISTA",
    "PROVEEDOR",
    "INTERNO",
  ];

  return permitidas.includes(valor) ? valor : "NORMAL";
};

const limpiarPayloadCliente = (body = {}) => {
  return {
    nombre: body.nombre || "",
    telefono: body.telefono || null,
    email: body.email || null,
    direccion: body.direccion || null,
    categoria_cliente: normalizarCategoria(body.categoria_cliente),
    nota_cliente: body.nota_cliente || null,
  };
};

const obtenerClientes = async (req, res) => {
  try {
    const clientes = await Cliente.findAll({
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
      order: [["nombre", "ASC"]],
    });

    res.json(clientes);
  } catch (error) {
    console.error("ERROR OBTENIENDO CLIENTES:", error);

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const crearCliente = async (req, res) => {
  try {
    const payload = limpiarPayloadCliente(req.body);

    if (!payload.nombre || !payload.nombre.trim()) {
      return res.status(400).json({
        error: "El nombre del cliente es obligatorio",
      });
    }

    const nuevoCliente = await Cliente.create(payload);

    res.status(201).json(nuevoCliente);
  } catch (error) {
    console.error("ERROR CREANDO CLIENTE:", error);

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const actualizarCliente = async (req, res) => {
  try {
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

    if (tieneVehiculos) {
      return res.status(400).json({
        error:
          "Este cliente tiene vehículos o historial asociado. Por control interno no se elimina.",
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
  crearCliente,
  actualizarCliente,
  eliminarCliente,
};