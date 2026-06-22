const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const { Diagnostico, OrdenTrabajo } = require("../models");

let columnasPreparadas = false;

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const boolDesdeBody = (valor) => {
  return valor === true || String(valor).toLowerCase() === "true" || valor === "1";
};

const obtenerRutaPublicaScanner = (file) => {
  if (!file) return null;

  if (file.path && /^https?:\/\//i.test(file.path)) {
    return file.path;
  }

  if (file.filename) {
    return `/uploads/scanner/${file.filename}`;
  }

  return file.path || null;
};

const prepararColumnas = async () => {
  if (columnasPreparadas) return;

  await sequelize.query(`
    ALTER TABLE "diagnosticos"
    ADD COLUMN IF NOT EXISTS "sin_dtc" BOOLEAN DEFAULT false;

    ALTER TABLE "diagnosticos"
    ADD COLUMN IF NOT EXISTS "fase" VARCHAR(40) DEFAULT 'PRE_FILE_SERVICE';

    ALTER TABLE "diagnosticos"
    ADD COLUMN IF NOT EXISTS "foto_scanner" TEXT;
  `);

  columnasPreparadas = true;
};

const validarPayload = async (req, modo = "crear") => {
  const ordenId = Number(req.body.ordenId || req.body.orden_id || req.body.ordenTrabajoId);
  const sinDtc = boolDesdeBody(req.body.sin_dtc);
  const codigosDtc = limpiarTexto(req.body.codigos_dtc);
  const fallas = limpiarTexto(req.body.fallas_detectadas);
  const observaciones = limpiarTexto(req.body.observaciones);
  const scanner =
    obtenerRutaPublicaScanner(req.file) ||
    limpiarTexto(req.body.informe_scanner) ||
    limpiarTexto(req.body.foto_scanner);

  if (!ordenId || Number.isNaN(ordenId)) {
    return {
      ok: false,
      status: 400,
      error: "Falta ordenId válido",
    };
  }

  const orden = await OrdenTrabajo.findByPk(ordenId);

  if (!orden) {
    return {
      ok: false,
      status: 404,
      error: "Orden no encontrada",
    };
  }

  if (modo === "crear" && !scanner) {
    return {
      ok: false,
      status: 400,
      error: "La foto o captura del scanner es obligatoria",
    };
  }

  if (!sinDtc && !codigosDtc) {
    return {
      ok: false,
      status: 400,
      error: "Debes escribir los DTC o marcar SIN DTC PRESENTES",
    };
  }

  if (!fallas && !observaciones) {
    return {
      ok: false,
      status: 400,
      error: "Debes registrar fallas detectadas u observación del diagnóstico",
    };
  }

  return {
    ok: true,
    data: {
      ordenId,
      fase: limpiarTexto(req.body.fase) || "PRE_FILE_SERVICE",
      fallas_detectadas: fallas,
      codigos_dtc: sinDtc ? "SIN DTC PRESENTES" : codigosDtc,
      sin_dtc: sinDtc,
      informe_scanner: scanner || null,
      foto_scanner: scanner || null,
      observaciones,
    },
  };
};

const crearDiagnostico = async (req, res) => {
  try {
    await prepararColumnas();

    const validacion = await validarPayload(req, "crear");

    if (!validacion.ok) {
      return res.status(validacion.status).json({
        error: validacion.error,
      });
    }

    const nuevoDiagnostico = await Diagnostico.create(validacion.data);

    try {
      await OrdenTrabajo.update(
        {
          estado: "PARA_DIAGNOSTICO",
        },
        {
          where: {
            id: validacion.data.ordenId,
          },
        }
      );
    } catch (estadoError) {
      console.warn("No se pudo actualizar estado de orden:", estadoError.message);
    }

    res.status(201).json({
      mensaje: "Diagnóstico creado",
      diagnostico: nuevoDiagnostico,
    });
  } catch (error) {
    console.error("ERROR CREANDO DIAGNÓSTICO:", error);

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const obtenerDiagnosticos = async (req, res) => {
  try {
    await prepararColumnas();

    const diagnosticos = await sequelize.query(
      `
      SELECT
        d.*,
        o."estado" AS "orden_estado",
        o."motivo_ingreso" AS "orden_motivo_ingreso",
        v."patente" AS "vehiculo_patente",
        v."marca" AS "vehiculo_marca",
        v."modelo" AS "vehiculo_modelo",
        c."nombre" AS "cliente_nombre"
      FROM "diagnosticos" d
      LEFT JOIN "ordenes_trabajo" o ON o."id" = d."ordenId"
      LEFT JOIN "vehiculos" v ON v."id" = o."vehiculoId"
      LEFT JOIN "clientes" c ON c."id" = v."clienteId"
      ORDER BY d."id" DESC;
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    res.json(diagnosticos);
  } catch (error) {
    console.error("ERROR OBTENIENDO DIAGNÓSTICOS:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const obtenerDiagnosticoPorId = async (req, res) => {
  try {
    await prepararColumnas();

    const diagnostico = await Diagnostico.findByPk(req.params.id, {
      include: [OrdenTrabajo],
    });

    if (!diagnostico) {
      return res.status(404).json({
        error: "Diagnóstico no encontrado",
      });
    }

    res.json(diagnostico);
  } catch (error) {
    console.error("ERROR OBTENIENDO DIAGNÓSTICO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const obtenerDiagnosticosPorOrden = async (req, res) => {
  try {
    await prepararColumnas();

    const diagnosticos = await Diagnostico.findAll({
      where: {
        ordenId: req.params.ordenId,
      },
      order: [["id", "DESC"]],
    });

    res.json(diagnosticos);
  } catch (error) {
    console.error("ERROR OBTENIENDO DIAGNÓSTICOS POR ORDEN:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const actualizarDiagnostico = async (req, res) => {
  try {
    await prepararColumnas();

    const diagnostico = await Diagnostico.findByPk(req.params.id);

    if (!diagnostico) {
      return res.status(404).json({
        error: "Diagnóstico no encontrado",
      });
    }

    const sinDtc = boolDesdeBody(req.body.sin_dtc);
    const codigosDtc = limpiarTexto(req.body.codigos_dtc);
    const scanner = obtenerRutaPublicaScanner(req.file);

    const payload = {
      fase: limpiarTexto(req.body.fase) || diagnostico.fase,
      fallas_detectadas:
        req.body.fallas_detectadas !== undefined
          ? limpiarTexto(req.body.fallas_detectadas)
          : diagnostico.fallas_detectadas,
      codigos_dtc:
        req.body.codigos_dtc !== undefined || req.body.sin_dtc !== undefined
          ? sinDtc
            ? "SIN DTC PRESENTES"
            : codigosDtc
          : diagnostico.codigos_dtc,
      sin_dtc:
        req.body.sin_dtc !== undefined ? sinDtc : diagnostico.sin_dtc,
      informe_scanner: scanner || diagnostico.informe_scanner,
      foto_scanner: scanner || diagnostico.foto_scanner,
      observaciones:
        req.body.observaciones !== undefined
          ? limpiarTexto(req.body.observaciones)
          : diagnostico.observaciones,
    };

    await diagnostico.update(payload);

    res.json({
      mensaje: "Diagnóstico actualizado",
      diagnostico,
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO DIAGNÓSTICO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  crearDiagnostico,
  obtenerDiagnosticos,
  obtenerDiagnosticoPorId,
  obtenerDiagnosticosPorOrden,
  actualizarDiagnostico,
};