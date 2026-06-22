const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const { ArchivoECU, OrdenTrabajo } = require("../models");

let columnasPreparadas = false;

const obtenerOrdenId = (body) => {
  return body.ordenId || body.orden_id || body.ordenTrabajoId || body.orden_trabajo_id;
};

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

const normalizarVersiones = (valor) => {
  if (Array.isArray(valor)) return valor;

  if (typeof valor === "string") {
    try {
      const parsed = JSON.parse(valor);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const obtenerRutaPublicaArchivo = (file) => {
  if (!file) return null;

  if (file.path && /^https?:\/\//i.test(file.path)) {
    return file.path;
  }

  if (file.filename) {
    return `/uploads/ecu/${file.filename}`;
  }

  return file.path || null;
};

const prepararColumnas = async () => {
  if (columnasPreparadas) return;

  await sequelize.query(`
    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "versiones_modificadas" JSONB DEFAULT '[]'::jsonb;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "ultima_version_modificada" INTEGER DEFAULT 0;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "notificado_master_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "notificado_master_por" VARCHAR(100);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "notificado_slave_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "notificado_slave_por" VARCHAR(100);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "correccion_pendiente" BOOLEAN DEFAULT false;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "dtc_post_escritura" TEXT;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "observacion_correccion" TEXT;

    ALTER TABLE "diagnosticos"
    ADD COLUMN IF NOT EXISTS "sin_dtc" BOOLEAN DEFAULT false;

    ALTER TABLE "diagnosticos"
    ADD COLUMN IF NOT EXISTS "fase" VARCHAR(40) DEFAULT 'PRE_FILE_SERVICE';

    ALTER TABLE "diagnosticos"
    ADD COLUMN IF NOT EXISTS "foto_scanner" TEXT;
  `);

  columnasPreparadas = true;
};

const validarDiagnosticoObligatorio = async (ordenId) => {
  await prepararColumnas();

  const diagnosticos = await sequelize.query(
    `
    SELECT
      "id",
      "ordenId",
      "fallas_detectadas",
      "codigos_dtc",
      "informe_scanner",
      "foto_scanner",
      "sin_dtc",
      "observaciones",
      "fase"
    FROM "diagnosticos"
    WHERE "ordenId" = :ordenId
    AND (
      "fase" IS NULL
      OR "fase" = 'PRE_FILE_SERVICE'
      OR "fase" = ''
    )
    ORDER BY "id" DESC
    LIMIT 1;
    `,
    {
      replacements: { ordenId },
      type: QueryTypes.SELECT,
    }
  );

  const faltantes = [];

  if (!diagnosticos.length) {
    return {
      ok: false,
      faltantes: [
        "Diagnóstico previo",
        "Foto del scanner",
        "DTC escritos o marcar SIN DTC",
        "Observación / fallas detectadas",
      ],
    };
  }

  const diag = diagnosticos[0];

  const tieneScanner =
    limpiarTexto(diag.informe_scanner) || limpiarTexto(diag.foto_scanner);

  const sinDtc =
    diag.sin_dtc === true ||
    String(diag.sin_dtc).toLowerCase() === "true" ||
    limpiarTexto(diag.codigos_dtc).toUpperCase().includes("SIN DTC");

  const tieneDtc = sinDtc || limpiarTexto(diag.codigos_dtc);
  const tieneObservacion =
    limpiarTexto(diag.observaciones) || limpiarTexto(diag.fallas_detectadas);

  if (!tieneScanner) faltantes.push("Foto del scanner");
  if (!tieneDtc) faltantes.push("DTC escritos o marcar SIN DTC");
  if (!tieneObservacion) faltantes.push("Observación / fallas detectadas");

  return {
    ok: faltantes.length === 0,
    faltantes,
    diagnostico: diag,
  };
};

const mapearArchivoRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    ordenId: row.ordenId,
    estado: row.estado,
    prioridad: row.prioridad,
    tipo_servicio: row.tipo_servicio,
    metodo_lectura: row.metodo_lectura,
    herramienta_lectura: row.herramienta_lectura,
    archivo_original: row.archivo_original,
    archivo_modificado: row.archivo_modificado,
    versiones_modificadas: normalizarVersiones(row.versiones_modificadas),
    ultima_version_modificada: row.ultima_version_modificada || 0,
    notificado_master_at: row.notificado_master_at,
    notificado_master_por: row.notificado_master_por,
    notificado_slave_at: row.notificado_slave_at,
    notificado_slave_por: row.notificado_slave_por,
    correccion_pendiente: row.correccion_pendiente,
    dtc_post_escritura: row.dtc_post_escritura,
    observacion_correccion: row.observacion_correccion,
    marca_ecu: row.marca_ecu,
    modelo_ecu: row.modelo_ecu,
    hw: row.hw,
    sw: row.sw,
    version_software: row.version_software,
    notas_operador: row.notas_operador,
    instrucciones_tuner: row.instrucciones_tuner,
    observaciones: row.observaciones,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,

    OrdenTrabajo: row.orden_id
      ? {
          id: row.orden_id,
          estado: row.orden_estado,
          prioridad: row.orden_prioridad,
          motivo_ingreso: row.orden_motivo_ingreso,
          monto_total: row.orden_monto_total,
          estado_pago: row.orden_estado_pago,
          Vehiculo: row.vehiculo_id
            ? {
                id: row.vehiculo_id,
                patente: row.vehiculo_patente,
                marca: row.vehiculo_marca,
                modelo: row.vehiculo_modelo,
                anio: row.vehiculo_anio,
                vin: row.vehiculo_vin,
                Cliente: row.cliente_id
                  ? {
                      id: row.cliente_id,
                      nombre: row.cliente_nombre,
                      telefono: row.cliente_telefono,
                      email: row.cliente_email,
                      categoria_cliente: row.cliente_categoria_cliente || "NORMAL",
                    }
                  : null,
              }
            : null,
        }
      : null,
  };
};

const queryArchivosBase = `
  SELECT
    a.*,

    o."id" AS "orden_id",
    o."estado" AS "orden_estado",
    o."prioridad" AS "orden_prioridad",
    o."motivo_ingreso" AS "orden_motivo_ingreso",
    o."monto_total" AS "orden_monto_total",
    o."estado_pago" AS "orden_estado_pago",

    v."id" AS "vehiculo_id",
    v."patente" AS "vehiculo_patente",
    v."marca" AS "vehiculo_marca",
    v."modelo" AS "vehiculo_modelo",
    v."anio" AS "vehiculo_anio",
    v."vin" AS "vehiculo_vin",

    c."id" AS "cliente_id",
    c."nombre" AS "cliente_nombre",
    c."telefono" AS "cliente_telefono",
    c."email" AS "cliente_email",
    c."categoria_cliente" AS "cliente_categoria_cliente"

  FROM "archivos_ecu" a
  LEFT JOIN "ordenes_trabajo" o ON o."id" = a."ordenId"
  LEFT JOIN "vehiculos" v ON v."id" = o."vehiculoId"
  LEFT JOIN "clientes" c ON c."id" = v."clienteId"
`;

const obtenerArchivosECU = async (req, res) => {
  try {
    await prepararColumnas();

    const rows = await sequelize.query(
      `
      ${queryArchivosBase}
      ORDER BY a."id" DESC;
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    res.json(rows.map(mapearArchivoRow));
  } catch (error) {
    console.error("ERROR AL OBTENER ARCHIVOS ECU:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const crearArchivoECU = async (req, res) => {
  try {
    await prepararColumnas();

    if (!req.file) {
      return res.status(400).json({
        error: "No se recibió archivo original",
      });
    }

    const ordenId = Number(obtenerOrdenId(req.body));

    if (!ordenId || Number.isNaN(ordenId)) {
      return res.status(400).json({
        error: "Falta ordenId válido",
      });
    }

    const orden = await OrdenTrabajo.findByPk(ordenId);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const validacion = await validarDiagnosticoObligatorio(ordenId);

    if (!validacion.ok) {
      return res.status(409).json({
        error: "No se puede enviar a File Service. Falta diagnóstico obligatorio.",
        bloqueo: "DIAGNOSTICO_OBLIGATORIO",
        faltantes: validacion.faltantes,
      });
    }

    const nuevoArchivo = await ArchivoECU.create({
      ordenId,

      estado: "ORIGINAL_CARGADO",
      prioridad: limpiarTexto(req.body.prioridad) || "MEDIA",
      tipo_servicio: limpiarTexto(req.body.tipo_servicio),

      metodo_lectura: limpiarTexto(req.body.metodo_lectura),
      herramienta_lectura: limpiarTexto(req.body.herramienta_lectura),

      marca_ecu: limpiarTexto(req.body.marca_ecu),
      modelo_ecu: limpiarTexto(req.body.modelo_ecu),
      hw: limpiarTexto(req.body.hw),
      sw: limpiarTexto(req.body.sw),
      version_software: limpiarTexto(req.body.version_software),

      notas_operador: limpiarTexto(req.body.notas_operador),
      instrucciones_tuner: limpiarTexto(req.body.instrucciones_tuner),
      observaciones: limpiarTexto(req.body.observaciones),

      archivo_original: obtenerRutaPublicaArchivo(req.file),
      archivo_modificado: null,
      versiones_modificadas: [],
      ultima_version_modificada: 0,
      correccion_pendiente: false,
    });

    try {
      await orden.update({
        estado: "EN_PROGRAMACION",
      });
    } catch (estadoError) {
      console.warn(
        "No se pudo actualizar estado de orden al crear File Service:",
        estadoError.message
      );
    }

    res.status(201).json({
      mensaje: "Archivo ECU guardado correctamente",
      archivo: nuevoArchivo,
      id: nuevoArchivo.id,
      archivoECUId: nuevoArchivo.id,
    });
  } catch (error) {
    console.error("ERROR AL CREAR ARCHIVO ECU:", error);

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const subirArchivoModificado = async (req, res) => {
  try {
    await prepararColumnas();

    const { id } = req.params;

    const archivo = await ArchivoECU.findByPk(id);

    if (!archivo) {
      return res.status(404).json({
        error: "Registro no encontrado",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "No se cargó el archivo modificado",
      });
    }

    const instruccionesTuner =
      limpiarTexto(req.body.instrucciones_tuner) ||
      limpiarTexto(req.body.instrucciones) ||
      "";

    const observaciones =
      limpiarTexto(req.body.observaciones) ||
      instruccionesTuner ||
      archivo.observaciones ||
      "";

    const versionesActuales = normalizarVersiones(archivo.versiones_modificadas);
    const versionActual =
      Number(archivo.ultima_version_modificada || 0) || versionesActuales.length || 0;

    const nuevaVersionNumero = versionActual + 1;
    const rutaArchivo = obtenerRutaPublicaArchivo(req.file);

    const nuevaVersion = {
      version: nuevaVersionNumero,
      etiqueta:
        req.body.es_final === "true" || req.body.es_final === true
          ? "MOD FINAL"
          : `MOD V${nuevaVersionNumero}`,
      archivo: rutaArchivo,
      nombre_archivo: req.file.originalname || req.file.filename || null,
      instrucciones_tuner: instruccionesTuner,
      observaciones,
      cargado_por: usuarioActual(req),
      fecha: new Date().toISOString(),
    };

    const versionesActualizadas = [...versionesActuales, nuevaVersion];

    await archivo.update({
      archivo_modificado: rutaArchivo,
      versiones_modificadas: versionesActualizadas,
      ultima_version_modificada: nuevaVersionNumero,
      instrucciones_tuner: instruccionesTuner || archivo.instrucciones_tuner,
      observaciones,
      estado: "MODIFICADO_LISTO",
      correccion_pendiente: false,
    });

    res.json({
      mensaje: `Software modificado ${nuevaVersion.etiqueta} cargado con éxito`,
      archivo,
      version: nuevaVersion,
    });
  } catch (error) {
    console.error("ERROR AL SUBIR ARCHIVO MODIFICADO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const notificarMaster = async (req, res) => {
  try {
    await prepararColumnas();

    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo ECU no encontrado",
      });
    }

    await archivo.update({
      estado: "NOTIFICADO_MASTER",
      notificado_master_at: new Date(),
      notificado_master_por: usuarioActual(req),
    });

    res.json({
      mensaje: "Master notificado correctamente",
      archivo,
    });
  } catch (error) {
    console.error("ERROR NOTIFICANDO MASTER:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const notificarSlave = async (req, res) => {
  try {
    await prepararColumnas();

    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo ECU no encontrado",
      });
    }

    if (!archivo.archivo_modificado) {
      return res.status(400).json({
        error: "No puedes notificar al Slave sin archivo modificado cargado",
      });
    }

    await archivo.update({
      estado: "NOTIFICADO_SLAVE",
      notificado_slave_at: new Date(),
      notificado_slave_por: usuarioActual(req),
    });

    res.json({
      mensaje: "Slave / Operador ECU notificado correctamente",
      archivo,
    });
  } catch (error) {
    console.error("ERROR NOTIFICANDO SLAVE:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const solicitarCorreccion = async (req, res) => {
  try {
    await prepararColumnas();

    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo ECU no encontrado",
      });
    }

    const dtcPost = limpiarTexto(req.body.dtc_post_escritura);
    const observacion = limpiarTexto(req.body.observacion_correccion);

    if (!dtcPost && !observacion) {
      return res.status(400).json({
        error: "Debes indicar DTC post escritura u observación de corrección",
      });
    }

    await archivo.update({
      estado: "REQUIERE_CORRECCION",
      correccion_pendiente: true,
      dtc_post_escritura: dtcPost,
      observacion_correccion: observacion,
    });

    res.json({
      mensaje: "Corrección solicitada. El tuner puede cargar una nueva versión MOD.",
      archivo,
    });
  } catch (error) {
    console.error("ERROR SOLICITANDO CORRECCIÓN:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const obtenerArchivoECUPorId = async (req, res) => {
  try {
    await prepararColumnas();

    const rows = await sequelize.query(
      `
      ${queryArchivosBase}
      WHERE a."id" = :id
      LIMIT 1;
      `,
      {
        replacements: { id: req.params.id },
        type: QueryTypes.SELECT,
      }
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "No encontrado",
      });
    }

    res.json(mapearArchivoRow(rows[0]));
  } catch (error) {
    console.error("ERROR AL OBTENER ARCHIVO ECU:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const actualizarArchivoECU = async (req, res) => {
  try {
    await prepararColumnas();

    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "No encontrado",
      });
    }

    const payload = {};

    const camposPermitidos = [
      "estado",
      "prioridad",
      "tipo_servicio",
      "metodo_lectura",
      "herramienta_lectura",
      "marca_ecu",
      "modelo_ecu",
      "hw",
      "sw",
      "version_software",
      "notas_operador",
      "instrucciones_tuner",
      "observaciones",
      "dtc_post_escritura",
      "observacion_correccion",
    ];

    camposPermitidos.forEach((campo) => {
      if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
        payload[campo] = limpiarTexto(req.body[campo]);
      }
    });

    if (Object.prototype.hasOwnProperty.call(req.body, "correccion_pendiente")) {
      payload.correccion_pendiente =
        req.body.correccion_pendiente === true ||
        String(req.body.correccion_pendiente).toLowerCase() === "true";
    }

    await archivo.update(payload);

    res.json({
      mensaje: "Archivo ECU actualizado",
      archivo,
    });
  } catch (error) {
    console.error("ERROR AL ACTUALIZAR ARCHIVO ECU:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const eliminarArchivoECU = async (req, res) => {
  try {
    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo ECU no encontrado",
      });
    }

    await archivo.destroy();

    res.json({
      mensaje: "Archivo ECU eliminado correctamente",
      id: req.params.id,
    });
  } catch (error) {
    console.error("ERROR AL ELIMINAR ARCHIVO ECU:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  crearArchivoECU,
  obtenerArchivosECU,
  obtenerArchivoECUPorId,
  actualizarArchivoECU,
  subirArchivoModificado,
  notificarMaster,
  notificarSlave,
  solicitarCorreccion,
  eliminarArchivoECU,
};