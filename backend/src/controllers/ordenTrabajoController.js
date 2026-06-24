const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const {
  OrdenTrabajo,
  Vehiculo,
  Cliente,
  Diagnostico,
  ArchivoECU,
  FotoVehiculo,
} = require("../models");
const {
  crearNotificacionesInternas,
} = require("./notificacionController");

console.log("🧾 CONTROLLER_ORDENES_CIERRE_COMERCIAL_V2_CARGADO");

let columnasPreparadas = false;

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const usuarioActual = (req) => {
  return (
    req.usuario?.username ||
    req.user?.username ||
    req.usuario?.nombre ||
    req.user?.nombre ||
    "sistema"
  );
};

const normalizarNumero = (valor, defecto = 0) => {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return defecto;
  return numero;
};

const NOTIFICACIONES_RESPONSABLES = {
  diagnostico_asignado_a: {
    tipo: "ORDEN_ASIGNADA_DIAGNOSTICO",
    titulo: "Diagnóstico asignado",
    etapa: "diagnóstico / scanner",
  },
  operador_ecu_asignado_a: {
    tipo: "ORDEN_ASIGNADA_ECU",
    titulo: "Trabajo ECU asignado",
    etapa: "trabajo ECU",
  },
  mecanico_asignado_a: {
    tipo: "ORDEN_ASIGNADA_MECANICA",
    titulo: "Trabajo mecánico asignado",
    etapa: "trabajo mecánico",
  },
  supervisor_asignado_a: {
    tipo: "ORDEN_ASIGNADA_SUPERVISION",
    titulo: "Supervisión asignada",
    etapa: "supervisión",
  },
};

const prepararColumnas = async () => {
  if (columnasPreparadas) return;

  await sequelize.query(`
    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "prioridad" VARCHAR(30) DEFAULT 'MEDIA';

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "estado" VARCHAR(60) DEFAULT 'RECEPCIONADO';

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "estado_pago" VARCHAR(30) DEFAULT 'PENDIENTE';

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "medio_pago" VARCHAR(40) DEFAULT 'PENDIENTE';

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "monto_pagado" NUMERIC(10,2) DEFAULT 0;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "fecha_pago" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "cobrado_por" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "observacion_pago" TEXT;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "kilometraje" INTEGER;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "motivo_ingreso" TEXT;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "monto_total" NUMERIC(10,2) DEFAULT 0;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "recepcionado_por" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "diagnostico_asignado_a" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "operador_ecu_asignado_a" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "mecanico_asignado_a" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "supervisor_asignado_a" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "tecnico_finalizado_por" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "tecnico_finalizado_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "entregado_por" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "entregado_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "observacion_cierre" TEXT;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "archivada" BOOLEAN DEFAULT false;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "archivada_motivo" VARCHAR(120);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "archivada_por" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "archivada_at" TIMESTAMP WITH TIME ZONE;
  `);

  columnasPreparadas = true;
};

const queryOrdenesBase = `
  SELECT
    o.*,

    v."id" AS "vehiculo_id",
    v."patente" AS "vehiculo_patente",
    v."marca" AS "vehiculo_marca",
    v."modelo" AS "vehiculo_modelo",
    v."anio" AS "vehiculo_anio",
    v."vin" AS "vehiculo_vin",
    v."tipo_unidad" AS "vehiculo_tipo_unidad",

    c."id" AS "cliente_id",
    c."nombre" AS "cliente_nombre",
    c."telefono" AS "cliente_telefono",
    c."email" AS "cliente_email",
    c."direccion" AS "cliente_direccion",
    c."categoria_cliente" AS "cliente_categoria_cliente",
    c."nota_cliente" AS "cliente_nota_cliente"

  FROM "ordenes_trabajo" o
  LEFT JOIN "vehiculos" v ON v."id" = o."vehiculoId"
  LEFT JOIN "clientes" c ON c."id" = v."clienteId"
`;

const obtenerDiagnosticosOrden = async (ordenId) => {
  try {
    return await Diagnostico.findAll({
      where: { ordenId },
      order: [["id", "DESC"]],
    });
  } catch (error) {
    console.warn("No se pudieron cargar diagnósticos:", error.message);
    return [];
  }
};

const obtenerArchivosOrden = async (ordenId) => {
  try {
    return await ArchivoECU.findAll({
      where: { ordenId },
      order: [["id", "DESC"]],
    });
  } catch (error) {
    console.warn("No se pudieron cargar archivos ECU:", error.message);
    return [];
  }
};

const obtenerFotosOrden = async (ordenId) => {
  try {
    return await FotoVehiculo.findAll({
      where: { ordenId },
      order: [["id", "DESC"]],
    });
  } catch (error) {
    console.warn("No se pudieron cargar fotos:", error.message);
    return [];
  }
};

const mapearOrdenRow = async (row, incluirDetalle = true) => {
  const orden = {
    id: row.id,
    vehiculoId: row.vehiculoId,

    prioridad: row.prioridad,
    estado: row.estado,
    estado_pago: row.estado_pago,
    medio_pago: row.medio_pago,
    monto_pagado: row.monto_pagado,
    fecha_pago: row.fecha_pago,
    cobrado_por: row.cobrado_por,
    observacion_pago: row.observacion_pago,

    kilometraje: row.kilometraje,
    motivo_ingreso: row.motivo_ingreso,
    monto_total: row.monto_total,

    recepcionado_por: row.recepcionado_por,
    diagnostico_asignado_a: row.diagnostico_asignado_a,
    operador_ecu_asignado_a: row.operador_ecu_asignado_a,
    mecanico_asignado_a: row.mecanico_asignado_a,
    supervisor_asignado_a: row.supervisor_asignado_a,

    tecnico_finalizado_por: row.tecnico_finalizado_por,
    tecnico_finalizado_at: row.tecnico_finalizado_at,

    entregado_por: row.entregado_por,
    entregado_at: row.entregado_at,
    observacion_cierre: row.observacion_cierre,

    archivada: row.archivada,
    archivada_motivo: row.archivada_motivo,
    archivada_por: row.archivada_por,
    archivada_at: row.archivada_at,

    createdAt: row.createdAt,
    updatedAt: row.updatedAt,

    Vehiculo: row.vehiculo_id
      ? {
          id: row.vehiculo_id,
          patente: row.vehiculo_patente,
          marca: row.vehiculo_marca,
          modelo: row.vehiculo_modelo,
          anio: row.vehiculo_anio,
          vin: row.vehiculo_vin,
          tipo_unidad: row.vehiculo_tipo_unidad,
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
        }
      : null,
  };

  if (incluirDetalle) {
    const [diagnosticos, archivosECU, fotos] = await Promise.all([
      obtenerDiagnosticosOrden(row.id),
      obtenerArchivosOrden(row.id),
      obtenerFotosOrden(row.id),
    ]);

    orden.Diagnosticos = diagnosticos;
    orden.ArchivoECUs = archivosECU;
    orden.ArchivosECU = archivosECU;
    orden.FotoVehiculos = fotos;
    orden.FotosVehiculo = fotos;
  }

  return orden;
};

const obtenerOrdenes = async (req, res) => {
  try {
    await prepararColumnas();

    const incluirArchivadas =
      req.query.incluirArchivadas === "true" ||
      req.query.incluir_archivadas === "true";

    const rows = await sequelize.query(
      `
      ${queryOrdenesBase}
      ${
        incluirArchivadas
          ? ""
          : 'WHERE COALESCE(o."archivada", false) = false'
      }
      ORDER BY
        CASE
          WHEN o."prioridad" = 'URGENTE' THEN 1
          WHEN o."prioridad" = 'ALTA' THEN 2
          WHEN o."prioridad" = 'MEDIA' THEN 3
          WHEN o."prioridad" = 'BAJA' THEN 4
          ELSE 5
        END,
        o."id" DESC;
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    const ordenes = await Promise.all(rows.map((row) => mapearOrdenRow(row, true)));

    res.json(ordenes);
  } catch (error) {
    console.error("ERROR OBTENIENDO ÓRDENES:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const obtenerOrdenPorId = async (req, res) => {
  try {
    await prepararColumnas();

    const rows = await sequelize.query(
      `
      ${queryOrdenesBase}
      WHERE o."id" = :id
      LIMIT 1;
      `,
      {
        replacements: { id: req.params.id },
        type: QueryTypes.SELECT,
      }
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const orden = await mapearOrdenRow(rows[0], true);

    res.json(orden);
  } catch (error) {
    console.error("ERROR OBTENIENDO ORDEN:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const crearOrden = async (req, res) => {
  try {
    await prepararColumnas();

    const vehiculoId = Number(req.body.vehiculoId || req.body.vehiculo_id);

    if (!vehiculoId || Number.isNaN(vehiculoId)) {
      return res.status(400).json({
        error: "Falta vehiculoId válido",
      });
    }

    const vehiculo = await Vehiculo.findByPk(vehiculoId);

    if (!vehiculo) {
      return res.status(404).json({
        error: "Vehículo no encontrado",
      });
    }

    const nuevaOrden = await OrdenTrabajo.create({
      vehiculoId,
      prioridad: limpiarTexto(req.body.prioridad) || "MEDIA",
      estado: limpiarTexto(req.body.estado) || "RECEPCIONADO",
      estado_pago: limpiarTexto(req.body.estado_pago) || "PENDIENTE",
      medio_pago: limpiarTexto(req.body.medio_pago) || "PENDIENTE",
      monto_pagado: normalizarNumero(req.body.monto_pagado, 0),
      kilometraje: req.body.kilometraje ? Number(req.body.kilometraje) : null,
      motivo_ingreso: limpiarTexto(req.body.motivo_ingreso),
      monto_total: normalizarNumero(req.body.monto_total, 0),
    });

    const recepcionadoPor =
      limpiarTexto(req.body.recepcionado_por) || usuarioActual(req);

    await sequelize.query(
      `
      UPDATE "ordenes_trabajo"
      SET
        "recepcionado_por" = :recepcionadoPor,
        "updatedAt" = NOW()
      WHERE "id" = :id;
      `,
      {
        replacements: {
          id: nuevaOrden.id,
          recepcionadoPor,
        },
      }
    );

    res.status(201).json({
      mensaje: "Orden creada correctamente",
      orden: nuevaOrden,
      id: nuevaOrden.id,
    });
  } catch (error) {
    console.error("ERROR CREANDO ORDEN:", error);

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const actualizarOrden = async (req, res) => {
  try {
    await prepararColumnas();

    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    if (orden.archivada) {
      return res.status(400).json({
        error: "No puedes modificar una orden archivada",
      });
    }

    const payload = {};

    const camposTexto = [
      "prioridad",
      "estado",
      "estado_pago",
      "medio_pago",
      "motivo_ingreso",
      "observacion_pago",
      "observacion_cierre",
      "recepcionado_por",
      "diagnostico_asignado_a",
      "operador_ecu_asignado_a",
      "mecanico_asignado_a",
      "supervisor_asignado_a",
    ];

    camposTexto.forEach((campo) => {
      if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
        payload[campo] = limpiarTexto(req.body[campo]);
      }
    });

    const camposResponsables = [
      "recepcionado_por",
      "diagnostico_asignado_a",
      "operador_ecu_asignado_a",
      "mecanico_asignado_a",
      "supervisor_asignado_a",
    ];

    const responsablesPayload = {};

    camposResponsables.forEach((campo) => {
      if (Object.prototype.hasOwnProperty.call(payload, campo)) {
        responsablesPayload[campo] = payload[campo];
        delete payload[campo];
      }
    });

    let responsablesActuales = {};

    if (Object.keys(responsablesPayload).length > 0) {
      const responsablesRows = await sequelize.query(
        `
        SELECT
          "diagnostico_asignado_a",
          "operador_ecu_asignado_a",
          "mecanico_asignado_a",
          "supervisor_asignado_a"
        FROM "ordenes_trabajo"
        WHERE "id" = :id
        LIMIT 1;
        `,
        {
          replacements: { id: orden.id },
          type: QueryTypes.SELECT,
        }
      );

      responsablesActuales = responsablesRows[0] || {};
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "kilometraje")) {
      payload.kilometraje = req.body.kilometraje ? Number(req.body.kilometraje) : null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "monto_total")) {
      payload.monto_total = normalizarNumero(req.body.monto_total, 0);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "monto_pagado")) {
      payload.monto_pagado = normalizarNumero(req.body.monto_pagado, 0);
    }

    if (payload.estado_pago === "PAGADO") {
      payload.fecha_pago = req.body.fecha_pago ? new Date(req.body.fecha_pago) : new Date();
      payload.cobrado_por = limpiarTexto(req.body.cobrado_por) || usuarioActual(req);

      if (!payload.medio_pago || payload.medio_pago === "PENDIENTE") {
        payload.medio_pago = "TRANSFERENCIA";
      }

      if (!payload.monto_pagado || Number(payload.monto_pagado) <= 0) {
        payload.monto_pagado = normalizarNumero(req.body.monto_total || orden.monto_total, 0);
      }
    }

    if (payload.estado === "ENTREGADO") {
      payload.entregado_at = new Date();
      payload.entregado_por = usuarioActual(req);

      if (!payload.observacion_cierre) {
        payload.observacion_cierre = `Orden entregada por ${usuarioActual(req)}`;
      }
    }

    if (payload.estado === "LISTO_PARA_ENTREGA") {
      payload.tecnico_finalizado_at = orden.tecnico_finalizado_at || new Date();
      payload.tecnico_finalizado_por =
        orden.tecnico_finalizado_por || usuarioActual(req);
    }

    await orden.update(payload);

    if (Object.keys(responsablesPayload).length > 0) {
      const asignaciones = Object.keys(responsablesPayload).map(
        (campo) => `"${campo}" = :${campo}`
      );

      await sequelize.query(
        `
        UPDATE "ordenes_trabajo"
        SET
          ${asignaciones.join(",\n          ")},
          "updatedAt" = NOW()
        WHERE "id" = :id;
        `,
        {
          replacements: {
            id: orden.id,
            ...responsablesPayload,
          },
        }
      );
    }

    if (Object.keys(responsablesPayload).length > 0) {
      try {
        const notificaciones = Object.entries(responsablesPayload)
          .filter(([campo]) => NOTIFICACIONES_RESPONSABLES[campo])
          .filter(([, nuevoResponsable]) => Boolean(limpiarTexto(nuevoResponsable)))
          .filter(([campo, nuevoResponsable]) => {
            const anterior = limpiarTexto(responsablesActuales[campo]);
            return limpiarTexto(nuevoResponsable) !== anterior;
          })
          .map(([campo, nuevoResponsable]) => {
            const meta = NOTIFICACIONES_RESPONSABLES[campo];

            return crearNotificacionesInternas({
              usuariosDestino: [limpiarTexto(nuevoResponsable)],
              rolesDestino: [],
              tipo: meta.tipo,
              titulo: meta.titulo,
              mensaje: `Te asignaron la Orden #${orden.id} para ${meta.etapa}.`,
              ordenId: orden.id,
              archivoECUId: null,
            });
          });

        await Promise.all(notificaciones);
      } catch (errorNotificacion) {
        console.warn(
          "No se pudieron crear notificaciones de responsables:",
          errorNotificacion.message
        );
      }
    }

    res.json({
      mensaje: "Orden actualizada correctamente",
      orden,
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO ORDEN:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const actualizarEstado = async (req, res) => {
  try {
    await prepararColumnas();

    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const estado = limpiarTexto(req.body.estado);

    if (!estado) {
      return res.status(400).json({
        error: "Debes indicar estado",
      });
    }

    const payload = {
      estado,
    };

    if (estado === "LISTO_PARA_ENTREGA") {
      payload.tecnico_finalizado_at = new Date();
      payload.tecnico_finalizado_por = usuarioActual(req);
    }

    if (estado === "ENTREGADO") {
      payload.entregado_at = new Date();
      payload.entregado_por = usuarioActual(req);
    }

    await orden.update(payload);

    res.json({
      mensaje: "Estado actualizado correctamente",
      orden,
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO ESTADO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const registrarPago = async (req, res) => {
  try {
    await prepararColumnas();

    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const medioPago = limpiarTexto(req.body.medio_pago) || "TRANSFERENCIA";
    const montoPagado = normalizarNumero(
      req.body.monto_pagado || req.body.monto_total || orden.monto_total,
      0
    );

    if (montoPagado <= 0) {
      return res.status(400).json({
        error: "El monto pagado debe ser mayor a 0",
      });
    }

    await orden.update({
      estado_pago: "PAGADO",
      medio_pago: medioPago,
      monto_pagado: montoPagado,
      fecha_pago: new Date(),
      cobrado_por: usuarioActual(req),
      observacion_pago:
        limpiarTexto(req.body.observacion_pago) ||
        `Pago confirmado por ${usuarioActual(req)}`,
    });

    res.json({
      mensaje: "Pago registrado correctamente",
      orden,
    });
  } catch (error) {
    console.error("ERROR REGISTRANDO PAGO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const cobrarYEntregar = async (req, res) => {
  try {
    await prepararColumnas();

    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const medioPago = limpiarTexto(req.body.medio_pago) || "TRANSFERENCIA";
    const montoPagado = normalizarNumero(
      req.body.monto_pagado || req.body.monto_total || orden.monto_total,
      0
    );

    if (montoPagado <= 0) {
      return res.status(400).json({
        error: "El monto pagado debe ser mayor a 0",
      });
    }

    await orden.update({
      estado: "ENTREGADO",
      estado_pago: "PAGADO",
      medio_pago: medioPago,
      monto_pagado: montoPagado,
      fecha_pago: new Date(),
      cobrado_por: usuarioActual(req),
      entregado_at: new Date(),
      entregado_por: usuarioActual(req),
      observacion_pago:
        limpiarTexto(req.body.observacion_pago) ||
        `Pago y entrega confirmados por ${usuarioActual(req)}`,
      observacion_cierre:
        limpiarTexto(req.body.observacion_cierre) ||
        `Orden cerrada comercialmente por ${usuarioActual(req)}`,
    });

    res.json({
      mensaje: "Orden cobrada y entregada correctamente",
      orden,
    });
  } catch (error) {
    console.error("ERROR COBRANDO Y ENTREGANDO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  crearOrden,
  obtenerOrdenes,
  obtenerOrdenPorId,
  actualizarOrden,
  actualizarEstado,
  registrarPago,
  cobrarYEntregar,
};
