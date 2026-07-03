const { Op, QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const {
  OrdenTrabajo,
  Vehiculo,
  Cliente,
  Diagnostico,
  ArchivoECU,
  FotoVehiculo,
  OrdenServicioItem,
  MaterialRecuperado,
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

const normalizarDecimal = (valor, defecto = 0) => {
  const numero = normalizarNumero(valor, defecto);
  return Number(numero.toFixed(2));
};

const normalizarDecimal3 = (valor, defecto = 0) => {
  const numero = normalizarNumero(valor, defecto);
  return Number(numero.toFixed(3));
};

const rolActual = (req) =>
  String(req.usuario?.rol || req.user?.rol || "").trim().toUpperCase();

const tieneRol = (req, roles = []) => roles.includes(rolActual(req));

const enviarErrorPermiso = (res) =>
  res.status(403).json({
    error: "No tienes permisos para esta accion",
  });

const normalizarBoolean = (valor) => {
  if (valor === true || valor === false) return valor;
  if (valor === 1 || valor === "1") return true;
  if (valor === 0 || valor === "0") return false;

  const texto = String(valor ?? "").trim().toLowerCase();
  return ["true", "si", "sí", "yes", "on"].includes(texto);
};

const normalizarCategoriaCliente = (categoria) => {
  const valor = String(categoria || "NORMAL").trim().toUpperCase();
  if (["MAYORISTA", "PROVEEDOR"].includes(valor)) return "TALLER_ALIADO";

  return [
    "NORMAL",
    "VIP",
    "FLOTA",
    "TALLER_ALIADO",
    "GARANTIA_RECLAMO",
    "INTERNO",
  ].includes(valor)
    ? valor
    : "NORMAL";
};

const prioridadSugeridaPorCategoria = (categoria) => {
  const normalizada = normalizarCategoriaCliente(categoria);
  const mapa = {
    NORMAL: "MEDIA",
    VIP: "ALTA",
    FLOTA: "ALTA",
    TALLER_ALIADO: "ALTA",
    GARANTIA_RECLAMO: "URGENTE",
    INTERNO: "BAJA",
  };

  return mapa[normalizada] || "MEDIA";
};

const obtenerPrioridadSugeridaPorVehiculo = async (vehiculoId) => {
  try {
    const filas = await sequelize.query(
      `SELECT c."categoria_cliente"
       FROM "vehiculos" v
       LEFT JOIN "clientes" c ON c."id" = v."clienteId"
       WHERE v."id" = :vehiculoId
       LIMIT 1`,
      {
        replacements: { vehiculoId },
        type: QueryTypes.SELECT,
      }
    );

    return prioridadSugeridaPorCategoria(filas[0]?.categoria_cliente);
  } catch (error) {
    console.warn("No se pudo sugerir prioridad por categoría:", error.message);
    return "MEDIA";
  }
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

const ESTADOS_CORRECCION_TECNICA = [
  "CORRECCION_SOLICITADA",
  "EN_REVISION_CORRECCION",
  "MOD_CORRECCION_LISTO",
  "CORRECCION_APLICADA",
  "CERRADA",
];

const PRIORIDADES_CORRECCION = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

const TIPOS_INTERVENCION_FISICA = [
  "SIN_INTERVENCION",
  "ASOCIADA_SERVICIO_TECNICO",
  "MECANICA_INDEPENDIENTE",
];

const ROLES_NOTIFICACION_CORRECCION = [
  "OWNER",
  "ADMIN",
  "SUPERVISOR",
  "OPERADOR_ECU",
  "TUNER",
];

const normalizarEstadoCorreccion = (valor) => {
  const estado = limpiarTexto(valor).toUpperCase();
  return ESTADOS_CORRECCION_TECNICA.includes(estado)
    ? estado
    : "CORRECCION_SOLICITADA";
};

const normalizarPrioridadCorreccion = (valor) => {
  const prioridad = limpiarTexto(valor || "MEDIA").toUpperCase();
  return PRIORIDADES_CORRECCION.includes(prioridad) ? prioridad : "MEDIA";
};

const normalizarTipoIntervencionFisica = (valor) => {
  const tipo = limpiarTexto(valor || "SIN_INTERVENCION").toUpperCase();
  return TIPOS_INTERVENCION_FISICA.includes(tipo) ? tipo : "SIN_INTERVENCION";
};

const parseJsonSeguro = (valor, defecto = []) => {
  if (Array.isArray(valor)) return valor;
  if (!valor) return defecto;

  if (typeof valor === "object") return defecto;

  try {
    const parsed = JSON.parse(valor);
    return parsed || defecto;
  } catch {
    return defecto;
  }
};

const ESTADOS_ITEM_SERVICIO = ["PENDIENTE", "EN_PROCESO", "LISTO", "ANULADO"];

const CATEGORIAS_ITEM_SERVICIO = [
  "DIAGNOSTICO",
  "MECANICA",
  "MANTENIMIENTO",
  "ECU_TCU",
  "FILE_SERVICE",
  "DPF_FAP",
  "ELECTRONICA",
  "OTRO",
];

const ROLES_AJUSTE_COMERCIAL = ["OWNER", "ADMIN"];
const ROLES_CREAR_ORDEN = ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"];
const ROLES_CIERRE_COMERCIAL = ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"];
const ROLES_GESTION_ITEMS = ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"];
const ROLES_MATERIAL_RECUPERADO = [
  "OWNER",
  "ADMIN",
  "SUPERVISOR",
  "RECEPCION",
  "MECANICO",
];

const normalizarEstadoItem = (valor) => {
  const estado = limpiarTexto(valor || "PENDIENTE").toUpperCase();
  return ESTADOS_ITEM_SERVICIO.includes(estado) ? estado : "PENDIENTE";
};

const normalizarCategoriaItem = (valor) => {
  const categoria = limpiarTexto(valor || "OTRO").toUpperCase();
  return CATEGORIAS_ITEM_SERVICIO.includes(categoria) ? categoria : "OTRO";
};

const calcularSubtotalItem = (cantidad, precioUnitario) =>
  normalizarDecimal(
    normalizarDecimal(cantidad, 1) * normalizarDecimal(precioUnitario, 0),
    0
  );

const montoComercialOrden = (orden) =>
  normalizarDecimal(orden?.monto_final ?? orden?.monto_total ?? 0, 0);

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
    ADD COLUMN IF NOT EXISTS "monto_original" NUMERIC(10,2);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "monto_final" NUMERIC(10,2);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "motivo_ajuste" TEXT;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "ajustado_por" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "ajustado_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "historial_ajustes" JSONB DEFAULT '[]'::jsonb;

    UPDATE "ordenes_trabajo"
    SET "historial_ajustes" = '[]'::jsonb
    WHERE "historial_ajustes" IS NULL;

    UPDATE "ordenes_trabajo"
    SET "monto_final" = COALESCE("monto_final", "monto_total", 0)
    WHERE "monto_final" IS NULL;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "excluir_estadisticas" BOOLEAN DEFAULT false;

    UPDATE "ordenes_trabajo"
    SET "excluir_estadisticas" = false
    WHERE "excluir_estadisticas" IS NULL;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "feedback_operario" TEXT;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "detalle_pendiente" TEXT;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "recomendacion_futura" TEXT;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "requiere_seguimiento" BOOLEAN DEFAULT false;

    UPDATE "ordenes_trabajo"
    SET "requiere_seguimiento" = false
    WHERE "requiere_seguimiento" IS NULL;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "feedback_por" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "feedback_at" TIMESTAMP;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "correccion_estado" VARCHAR(60);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "correccion_prioridad" VARCHAR(30);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "correccion_motivo" TEXT;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "correccion_descripcion" TEXT;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "correccion_dtc" VARCHAR(120);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "correccion_sintoma_cliente" TEXT;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "correccion_archivo_ecu_id" INTEGER;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "correccion_responsable_sugerido" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "correccion_comentario_tecnico" TEXT;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "correccion_cliente_volvio" BOOLEAN DEFAULT false;

    UPDATE "ordenes_trabajo"
    SET "correccion_cliente_volvio" = false
    WHERE "correccion_cliente_volvio" IS NULL;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "correccion_creada_por" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "correccion_creada_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "correccion_actualizada_por" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "correccion_actualizada_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "correccion_historial" JSONB DEFAULT '[]'::jsonb;

    UPDATE "ordenes_trabajo"
    SET "correccion_historial" = '[]'::jsonb
    WHERE "correccion_historial" IS NULL;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "bitacora_operativa" JSONB DEFAULT '[]'::jsonb;

    UPDATE "ordenes_trabajo"
    SET "bitacora_operativa" = '[]'::jsonb
    WHERE "bitacora_operativa" IS NULL;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "intervencion_fisica_tipo" VARCHAR(60) DEFAULT 'SIN_INTERVENCION';

    UPDATE "ordenes_trabajo"
    SET "intervencion_fisica_tipo" = 'SIN_INTERVENCION'
    WHERE "intervencion_fisica_tipo" IS NULL;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "intervencion_fisica_descripcion" TEXT;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "intervencion_desmontaje_requerido" BOOLEAN DEFAULT false;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "intervencion_vaciado_revision_realizada" BOOLEAN DEFAULT false;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "intervencion_montaje_realizado" BOOLEAN DEFAULT false;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "intervencion_inspeccion_visual" BOOLEAN DEFAULT false;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "intervencion_listo_programacion" BOOLEAN DEFAULT false;

    UPDATE "ordenes_trabajo"
    SET
      "intervencion_desmontaje_requerido" = COALESCE("intervencion_desmontaje_requerido", false),
      "intervencion_vaciado_revision_realizada" = COALESCE("intervencion_vaciado_revision_realizada", false),
      "intervencion_montaje_realizado" = COALESCE("intervencion_montaje_realizado", false),
      "intervencion_inspeccion_visual" = COALESCE("intervencion_inspeccion_visual", false),
      "intervencion_listo_programacion" = COALESCE("intervencion_listo_programacion", false);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "intervencion_fisica_por" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "intervencion_fisica_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "clientes"
    ADD COLUMN IF NOT EXISTS "excluir_estadisticas" BOOLEAN DEFAULT false;

    UPDATE "clientes"
    SET "excluir_estadisticas" = false
    WHERE "excluir_estadisticas" IS NULL;

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

  await OrdenServicioItem.sync();
  await MaterialRecuperado.sync();

  await sequelize.query(`
    ALTER TABLE "orden_servicio_items"
    ADD COLUMN IF NOT EXISTS "ordenId" INTEGER;

    ALTER TABLE "orden_servicio_items"
    ADD COLUMN IF NOT EXISTS "tipo_servicio" VARCHAR(120) NOT NULL DEFAULT 'Otro';

    ALTER TABLE "orden_servicio_items"
    ADD COLUMN IF NOT EXISTS "categoria" VARCHAR(60) DEFAULT 'OTRO';

    ALTER TABLE "orden_servicio_items"
    ADD COLUMN IF NOT EXISTS "descripcion" TEXT;

    ALTER TABLE "orden_servicio_items"
    ADD COLUMN IF NOT EXISTS "cantidad" NUMERIC(10,2) DEFAULT 1;

    ALTER TABLE "orden_servicio_items"
    ADD COLUMN IF NOT EXISTS "precio_unitario" NUMERIC(10,2) DEFAULT 0;

    ALTER TABLE "orden_servicio_items"
    ADD COLUMN IF NOT EXISTS "subtotal" NUMERIC(10,2) DEFAULT 0;

    ALTER TABLE "orden_servicio_items"
    ADD COLUMN IF NOT EXISTS "responsable" VARCHAR(100);

    ALTER TABLE "orden_servicio_items"
    ADD COLUMN IF NOT EXISTS "estado" VARCHAR(30) DEFAULT 'PENDIENTE';

    ALTER TABLE "orden_servicio_items"
    ADD COLUMN IF NOT EXISTS "requiere_material_recuperado" BOOLEAN DEFAULT false;

    ALTER TABLE "orden_servicio_items"
    ADD COLUMN IF NOT EXISTS "material_recuperado_obligatorio" BOOLEAN DEFAULT false;

    ALTER TABLE "orden_servicio_items"
    ADD COLUMN IF NOT EXISTS "observaciones" TEXT;

    UPDATE "orden_servicio_items"
    SET
      "categoria" = COALESCE(NULLIF(TRIM("categoria"), ''), 'OTRO'),
      "estado" = COALESCE(NULLIF(TRIM("estado"), ''), 'PENDIENTE'),
      "cantidad" = COALESCE("cantidad", 1),
      "precio_unitario" = COALESCE("precio_unitario", 0),
      "subtotal" = COALESCE("subtotal", COALESCE("cantidad", 1) * COALESCE("precio_unitario", 0)),
      "requiere_material_recuperado" = COALESCE("requiere_material_recuperado", false),
      "material_recuperado_obligatorio" = COALESCE("material_recuperado_obligatorio", false);

    ALTER TABLE "materiales_recuperados"
    ADD COLUMN IF NOT EXISTS "itemId" INTEGER;

    ALTER TABLE "materiales_recuperados"
    ADD COLUMN IF NOT EXISTS "peso_kg" NUMERIC(10,3) DEFAULT 0;

    ALTER TABLE "materiales_recuperados"
    ADD COLUMN IF NOT EXISTS "foto" VARCHAR(255);

    ALTER TABLE "materiales_recuperados"
    ADD COLUMN IF NOT EXISTS "responsable" VARCHAR(100);

    ALTER TABLE "materiales_recuperados"
    ADD COLUMN IF NOT EXISTS "destino" VARCHAR(120);

    ALTER TABLE "materiales_recuperados"
    ADD COLUMN IF NOT EXISTS "motivo_excepcion_material" TEXT;

    ALTER TABLE "materiales_recuperados"
    ADD COLUMN IF NOT EXISTS "registrado_por" VARCHAR(100);

    ALTER TABLE "materiales_recuperados"
    ADD COLUMN IF NOT EXISTS "registrado_at" TIMESTAMP WITH TIME ZONE;

    UPDATE "materiales_recuperados"
    SET
      "peso_kg" = COALESCE("peso_kg", "kilos", 0),
      "registrado_por" = COALESCE("registrado_por", "creado_por"),
      "registrado_at" = COALESCE("registrado_at", "createdAt");
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
    c."excluir_estadisticas" AS "cliente_excluir_estadisticas",
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

const obtenerItemsOrdenInterno = async (ordenId) => {
  try {
    return await OrdenServicioItem.findAll({
      where: { ordenId },
      order: [["id", "ASC"]],
    });
  } catch (error) {
    console.warn("No se pudieron cargar items de servicio:", error.message);
    return [];
  }
};

const obtenerMaterialOrdenInterno = async (ordenId) => {
  try {
    return await MaterialRecuperado.findAll({
      where: { ordenId },
      order: [["createdAt", "DESC"]],
    });
  } catch (error) {
    console.warn("No se pudo cargar material recuperado:", error.message);
    return [];
  }
};

const materialCumpleRegistro = (material) => {
  if (!material) return false;
  const peso = normalizarDecimal3(material.peso_kg ?? material.kilos, 0);
  const excepcion = limpiarTexto(material.motivo_excepcion_material);
  return peso > 0 || Boolean(excepcion);
};

const validarMaterialObligatorioOrden = async (ordenId) => {
  const items = await OrdenServicioItem.findAll({
    where: {
      ordenId,
      estado: { [Op.ne]: "ANULADO" },
      material_recuperado_obligatorio: true,
    },
    order: [["id", "ASC"]],
  });

  if (!items.length) return;

  const materiales = await MaterialRecuperado.findAll({
    where: { ordenId },
  });

  const pendientes = items.filter((item) => {
    const materialItem = materiales.find(
      (material) => Number(material.itemId) === Number(item.id)
    );
    const materialOrden = materiales.find(
      (material) => !material.itemId || Number(material.itemId) === 0
    );

    return (
      !materialCumpleRegistro(materialItem) &&
      !materialCumpleRegistro(materialOrden)
    );
  });

  if (pendientes.length) {
    const error = new Error(
      "Esta orden tiene material recuperado pendiente. Registra peso o motivo de excepcion antes de cerrar tecnico."
    );
    error.statusCode = 400;
    error.itemsPendientes = pendientes.map((item) => ({
      id: item.id,
      tipo_servicio: item.tipo_servicio,
    }));
    throw error;
  }
};

const recalcularMontoOrdenPorItems = async (ordenId) => {
  const itemsActivos = await OrdenServicioItem.findAll({
    where: {
      ordenId,
      estado: { [Op.ne]: "ANULADO" },
    },
  });

  const total = itemsActivos.reduce(
    (acc, item) => acc + normalizarDecimal(item.subtotal, 0),
    0
  );
  const orden = await OrdenTrabajo.findByPk(ordenId);

  if (!orden) return null;

  const montoActual = normalizarDecimal(orden.monto_total, 0);
  const montoOriginal =
    orden.monto_original ?? (montoActual > 0 ? montoActual : total);

  await orden.update({
    monto_original: montoOriginal,
    monto_total: total,
    monto_final: total,
  });

  return await OrdenTrabajo.findByPk(ordenId);
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
    monto_original: row.monto_original,
    monto_final: row.monto_final ?? row.monto_total,
    motivo_ajuste: row.motivo_ajuste,
    ajustado_por: row.ajustado_por,
    ajustado_at: row.ajustado_at,
    historial_ajustes: parseJsonSeguro(row.historial_ajustes, []),
    excluir_estadisticas: row.excluir_estadisticas,
    feedback_operario: row.feedback_operario,
    detalle_pendiente: row.detalle_pendiente,
    recomendacion_futura: row.recomendacion_futura,
    requiere_seguimiento: row.requiere_seguimiento,
    feedback_por: row.feedback_por,
    feedback_at: row.feedback_at,

    correccion_estado: row.correccion_estado,
    correccion_prioridad: row.correccion_prioridad,
    correccion_motivo: row.correccion_motivo,
    correccion_descripcion: row.correccion_descripcion,
    correccion_dtc: row.correccion_dtc,
    correccion_sintoma_cliente: row.correccion_sintoma_cliente,
    correccion_archivo_ecu_id: row.correccion_archivo_ecu_id,
    correccion_responsable_sugerido: row.correccion_responsable_sugerido,
    correccion_comentario_tecnico: row.correccion_comentario_tecnico,
    correccion_cliente_volvio: row.correccion_cliente_volvio,
    correccion_creada_por: row.correccion_creada_por,
    correccion_creada_at: row.correccion_creada_at,
    correccion_actualizada_por: row.correccion_actualizada_por,
    correccion_actualizada_at: row.correccion_actualizada_at,
    correccion_historial: parseJsonSeguro(row.correccion_historial, []),
    bitacora_operativa: parseJsonSeguro(row.bitacora_operativa, []),

    intervencion_fisica_tipo: row.intervencion_fisica_tipo || "SIN_INTERVENCION",
    intervencion_fisica_descripcion: row.intervencion_fisica_descripcion,
    intervencion_desmontaje_requerido: row.intervencion_desmontaje_requerido,
    intervencion_vaciado_revision_realizada:
      row.intervencion_vaciado_revision_realizada,
    intervencion_montaje_realizado: row.intervencion_montaje_realizado,
    intervencion_inspeccion_visual: row.intervencion_inspeccion_visual,
    intervencion_listo_programacion: row.intervencion_listo_programacion,
    intervencion_fisica_por: row.intervencion_fisica_por,
    intervencion_fisica_at: row.intervencion_fisica_at,

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
                categoria_cliente: normalizarCategoriaCliente(
                  row.cliente_categoria_cliente
                ),
                excluir_estadisticas: row.cliente_excluir_estadisticas,
                nota_cliente: row.cliente_nota_cliente,
              }
            : null,
        }
      : null,
  };

  if (incluirDetalle) {
    const [diagnosticos, archivosECU, fotos, items, materialRecuperado] =
      await Promise.all([
      obtenerDiagnosticosOrden(row.id),
      obtenerArchivosOrden(row.id),
      obtenerFotosOrden(row.id),
      obtenerItemsOrdenInterno(row.id),
      obtenerMaterialOrdenInterno(row.id),
    ]);

    orden.Diagnosticos = diagnosticos;
    orden.ArchivoECUs = archivosECU;
    orden.ArchivosECU = archivosECU;
    orden.FotoVehiculos = fotos;
    orden.FotosVehiculo = fotos;
    orden.OrdenServicioItems = items;
    orden.ItemsServicio = items;
    orden.MaterialRecuperados = materialRecuperado;
    orden.MaterialRecuperado = materialRecuperado;
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

    if (!tieneRol(req, ROLES_CREAR_ORDEN)) {
      return enviarErrorPermiso(res);
    }

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

    const prioridadExplicita = limpiarTexto(req.body.prioridad);
    const prioridadFinal =
      prioridadExplicita || (await obtenerPrioridadSugeridaPorVehiculo(vehiculoId));
    const montoInicial = normalizarDecimal(req.body.monto_total, 0);

    const nuevaOrden = await OrdenTrabajo.create({
      vehiculoId,
      prioridad: prioridadFinal,
      estado: limpiarTexto(req.body.estado) || "RECEPCIONADO",
      estado_pago: limpiarTexto(req.body.estado_pago) || "PENDIENTE",
      medio_pago: limpiarTexto(req.body.medio_pago) || "PENDIENTE",
      monto_pagado: normalizarNumero(req.body.monto_pagado, 0),
      kilometraje: req.body.kilometraje ? Number(req.body.kilometraje) : null,
      motivo_ingreso: limpiarTexto(req.body.motivo_ingreso),
      monto_total: montoInicial,
      monto_original: montoInicial,
      monto_final: montoInicial,
      excluir_estadisticas: normalizarBoolean(req.body.excluir_estadisticas),
      intervencion_fisica_tipo: normalizarTipoIntervencionFisica(
        req.body.intervencion_fisica_tipo
      ),
      intervencion_fisica_descripcion: limpiarTexto(
        req.body.intervencion_fisica_descripcion
      ),
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
      "feedback_operario",
      "detalle_pendiente",
      "recomendacion_futura",
      "intervencion_fisica_descripcion",
    ];

    camposTexto.forEach((campo) => {
      if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
        payload[campo] = limpiarTexto(req.body[campo]);
      }
    });

    const camposFeedback = [
      "feedback_operario",
      "detalle_pendiente",
      "recomendacion_futura",
      "requiere_seguimiento",
    ];
    const actualizaFeedback = camposFeedback.some((campo) =>
      Object.prototype.hasOwnProperty.call(req.body, campo)
    );

    if (Object.prototype.hasOwnProperty.call(req.body, "requiere_seguimiento")) {
      payload.requiere_seguimiento = normalizarBoolean(req.body.requiere_seguimiento);
    }

    const camposIntervencionFisica = [
      "intervencion_fisica_tipo",
      "intervencion_fisica_descripcion",
      "intervencion_desmontaje_requerido",
      "intervencion_vaciado_revision_realizada",
      "intervencion_montaje_realizado",
      "intervencion_inspeccion_visual",
      "intervencion_listo_programacion",
    ];
    const actualizaIntervencionFisica = camposIntervencionFisica.some((campo) =>
      Object.prototype.hasOwnProperty.call(req.body, campo)
    );

    if (Object.prototype.hasOwnProperty.call(req.body, "intervencion_fisica_tipo")) {
      payload.intervencion_fisica_tipo = normalizarTipoIntervencionFisica(
        req.body.intervencion_fisica_tipo
      );
    }

    [
      "intervencion_desmontaje_requerido",
      "intervencion_vaciado_revision_realizada",
      "intervencion_montaje_realizado",
      "intervencion_inspeccion_visual",
      "intervencion_listo_programacion",
    ].forEach((campo) => {
      if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
        payload[campo] = normalizarBoolean(req.body[campo]);
      }
    });

    if (actualizaIntervencionFisica) {
      payload.intervencion_fisica_por = usuarioActual(req);
      payload.intervencion_fisica_at = new Date();
    }

    if (actualizaFeedback) {
      payload.feedback_por = usuarioActual(req);
      payload.feedback_at = new Date();
    }

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

    const intentoEditarMonto =
      Object.prototype.hasOwnProperty.call(req.body, "monto_total") ||
      Object.prototype.hasOwnProperty.call(req.body, "monto_final") ||
      Object.prototype.hasOwnProperty.call(req.body, "monto_original");

    if (intentoEditarMonto) {
      const nuevoMonto = normalizarDecimal(
        req.body.monto_final ?? req.body.monto_total ?? orden.monto_total,
        0
      );
      const montoActual = montoComercialOrden(orden);

      if (nuevoMonto !== montoActual) {
        return res.status(400).json({
          error:
            "Para modificar el monto de una orden usa /ordenes/:id/ajuste-comercial e indica motivo_ajuste.",
        });
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "monto_pagado")) {
      payload.monto_pagado = normalizarNumero(req.body.monto_pagado, 0);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "excluir_estadisticas")) {
      payload.excluir_estadisticas = normalizarBoolean(
        req.body.excluir_estadisticas
      );
    }

    if (payload.estado_pago === "PAGADO") {
      payload.fecha_pago = req.body.fecha_pago ? new Date(req.body.fecha_pago) : new Date();
      payload.cobrado_por = limpiarTexto(req.body.cobrado_por) || usuarioActual(req);

      if (!payload.medio_pago || payload.medio_pago === "PENDIENTE") {
        payload.medio_pago = "TRANSFERENCIA";
      }

      if (!payload.monto_pagado || Number(payload.monto_pagado) <= 0) {
        payload.monto_pagado = montoComercialOrden(orden);
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
      await validarMaterialObligatorioOrden(orden.id);
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

    res.status(error.statusCode || 500).json({
      error: error.message,
      itemsPendientes: error.itemsPendientes || undefined,
    });
  }
};

const registrarAjusteComercial = async (req, res) => {
  try {
    await prepararColumnas();

    if (!tieneRol(req, ROLES_AJUSTE_COMERCIAL)) {
      return enviarErrorPermiso(res);
    }

    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    if (orden.archivada) {
      return res.status(400).json({
        error: "No puedes ajustar una orden archivada",
      });
    }

    const montoFinal = normalizarDecimal(req.body.monto_final, NaN);
    const motivoAjuste = limpiarTexto(req.body.motivo_ajuste);

    if (!Number.isFinite(montoFinal) || montoFinal < 0) {
      return res.status(400).json({
        error: "Debes indicar un monto_final valido",
      });
    }

    if (!motivoAjuste) {
      return res.status(400).json({
        error: "Debes indicar motivo_ajuste para modificar el monto",
      });
    }

    const usuario = usuarioActual(req);
    const ahora = new Date();
    const montoAnterior = montoComercialOrden(orden);
    const historialActual = parseJsonSeguro(
      orden.getDataValue("historial_ajustes"),
      []
    );
    const evento = {
      tipo: "AJUSTE_COMERCIAL",
      monto_anterior: montoAnterior,
      monto_final: montoFinal,
      motivo_ajuste: motivoAjuste,
      ajustado_por: usuario,
      fecha: ahora.toISOString(),
      estado_pago: orden.estado_pago,
      monto_pagado: normalizarDecimal(orden.monto_pagado, 0),
    };
    const montoOriginal =
      orden.monto_original ?? normalizarDecimal(orden.monto_total, montoAnterior);

    await orden.update({
      monto_original: montoOriginal,
      monto_final: montoFinal,
      monto_total: montoFinal,
      motivo_ajuste: motivoAjuste,
      ajustado_por: usuario,
      ajustado_at: ahora,
      historial_ajustes: [...historialActual, evento],
    });

    const ordenActualizada = await OrdenTrabajo.findByPk(orden.id);

    res.json({
      mensaje: "Ajuste comercial registrado correctamente",
      orden: ordenActualizada,
      ajuste: evento,
    });
  } catch (error) {
    console.error("ERROR REGISTRANDO AJUSTE COMERCIAL:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const obtenerItemsOrden = async (req, res) => {
  try {
    await prepararColumnas();

    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const items = await obtenerItemsOrdenInterno(orden.id);

    res.json(items);
  } catch (error) {
    console.error("ERROR OBTENIENDO ITEMS DE ORDEN:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const crearItemOrden = async (req, res) => {
  try {
    await prepararColumnas();

    if (!tieneRol(req, ROLES_GESTION_ITEMS)) {
      return enviarErrorPermiso(res);
    }

    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    if (orden.archivada) {
      return res.status(400).json({
        error: "No puedes agregar items a una orden archivada",
      });
    }

    if (orden.estado_pago === "PAGADO" || orden.estado === "ENTREGADO") {
      return res.status(400).json({
        error:
          "La orden ya esta pagada o entregada. Usa ajuste comercial para corregir montos.",
      });
    }

    const tipoServicio = limpiarTexto(req.body.tipo_servicio);

    if (!tipoServicio) {
      return res.status(400).json({
        error: "Debes indicar tipo_servicio",
      });
    }

    const cantidad = Math.max(normalizarDecimal(req.body.cantidad, 1), 0);
    const precioUnitario = Math.max(
      normalizarDecimal(req.body.precio_unitario, 0),
      0
    );
    const subtotal = calcularSubtotalItem(cantidad, precioUnitario);

    const item = await OrdenServicioItem.create({
      ordenId: orden.id,
      tipo_servicio: tipoServicio,
      categoria: normalizarCategoriaItem(req.body.categoria),
      descripcion: limpiarTexto(req.body.descripcion),
      cantidad,
      precio_unitario: precioUnitario,
      subtotal,
      responsable: limpiarTexto(req.body.responsable),
      estado: normalizarEstadoItem(req.body.estado),
      requiere_material_recuperado: normalizarBoolean(
        req.body.requiere_material_recuperado
      ),
      material_recuperado_obligatorio: normalizarBoolean(
        req.body.material_recuperado_obligatorio
      ),
      observaciones: limpiarTexto(req.body.observaciones),
    });

    const ordenActualizada = await recalcularMontoOrdenPorItems(orden.id);

    res.status(201).json({
      mensaje: "Item de servicio agregado correctamente",
      item,
      orden: ordenActualizada,
    });
  } catch (error) {
    console.error("ERROR CREANDO ITEM DE ORDEN:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const actualizarItemOrden = async (req, res) => {
  try {
    await prepararColumnas();

    if (!tieneRol(req, ROLES_GESTION_ITEMS)) {
      return enviarErrorPermiso(res);
    }

    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const item = await OrdenServicioItem.findOne({
      where: {
        id: req.params.itemId,
        ordenId: orden.id,
      },
    });

    if (!item) {
      return res.status(404).json({
        error: "Item de servicio no encontrado",
      });
    }

    const alteraMonto =
      Object.prototype.hasOwnProperty.call(req.body, "cantidad") ||
      Object.prototype.hasOwnProperty.call(req.body, "precio_unitario") ||
      Object.prototype.hasOwnProperty.call(req.body, "estado");

    if (
      alteraMonto &&
      (orden.estado_pago === "PAGADO" || orden.estado === "ENTREGADO")
    ) {
      return res.status(400).json({
        error:
          "La orden ya esta pagada o entregada. Usa ajuste comercial para corregir montos.",
      });
    }

    const payload = {};

    ["tipo_servicio", "descripcion", "responsable", "observaciones"].forEach(
      (campo) => {
        if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
          payload[campo] = limpiarTexto(req.body[campo]);
        }
      }
    );

    if (Object.prototype.hasOwnProperty.call(req.body, "categoria")) {
      payload.categoria = normalizarCategoriaItem(req.body.categoria);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "estado")) {
      payload.estado = normalizarEstadoItem(req.body.estado);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "cantidad")) {
      payload.cantidad = Math.max(normalizarDecimal(req.body.cantidad, 1), 0);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "precio_unitario")) {
      payload.precio_unitario = Math.max(
        normalizarDecimal(req.body.precio_unitario, 0),
        0
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "requiere_material_recuperado"
      )
    ) {
      payload.requiere_material_recuperado = normalizarBoolean(
        req.body.requiere_material_recuperado
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "material_recuperado_obligatorio"
      )
    ) {
      payload.material_recuperado_obligatorio = normalizarBoolean(
        req.body.material_recuperado_obligatorio
      );
    }

    const cantidadFinal =
      payload.cantidad !== undefined
        ? payload.cantidad
        : normalizarDecimal(item.cantidad, 1);
    const precioFinal =
      payload.precio_unitario !== undefined
        ? payload.precio_unitario
        : normalizarDecimal(item.precio_unitario, 0);

    if (
      Object.prototype.hasOwnProperty.call(payload, "cantidad") ||
      Object.prototype.hasOwnProperty.call(payload, "precio_unitario")
    ) {
      payload.subtotal = calcularSubtotalItem(cantidadFinal, precioFinal);
    }

    await item.update(payload);

    const ordenActualizada = alteraMonto
      ? await recalcularMontoOrdenPorItems(orden.id)
      : orden;

    res.json({
      mensaje: "Item de servicio actualizado correctamente",
      item,
      orden: ordenActualizada,
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO ITEM DE ORDEN:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const eliminarItemOrden = async (req, res) => {
  try {
    await prepararColumnas();

    if (!tieneRol(req, ROLES_GESTION_ITEMS)) {
      return enviarErrorPermiso(res);
    }

    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    if (orden.estado_pago === "PAGADO" || orden.estado === "ENTREGADO") {
      return res.status(400).json({
        error: "No puedes eliminar items de una orden pagada o entregada",
      });
    }

    const item = await OrdenServicioItem.findOne({
      where: {
        id: req.params.itemId,
        ordenId: orden.id,
      },
    });

    if (!item) {
      return res.status(404).json({
        error: "Item de servicio no encontrado",
      });
    }

    const observaciones = [
      limpiarTexto(item.observaciones),
      `Anulado por ${usuarioActual(req)} el ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join("\n");

    await item.update({
      estado: "ANULADO",
      subtotal: 0,
      observaciones,
    });

    const ordenActualizada = await recalcularMontoOrdenPorItems(orden.id);

    res.json({
      mensaje: "Item de servicio anulado correctamente",
      item,
      orden: ordenActualizada,
    });
  } catch (error) {
    console.error("ERROR ANULANDO ITEM DE ORDEN:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const obtenerMaterialOrden = async (req, res) => {
  try {
    await prepararColumnas();

    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const materiales = await obtenerMaterialOrdenInterno(orden.id);

    res.json(materiales);
  } catch (error) {
    console.error("ERROR OBTENIENDO MATERIAL RECUPERADO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const registrarMaterialOrden = async (req, res) => {
  try {
    await prepararColumnas();

    if (!tieneRol(req, ROLES_MATERIAL_RECUPERADO)) {
      return enviarErrorPermiso(res);
    }

    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    if (orden.archivada) {
      return res.status(400).json({
        error: "No puedes registrar material en una orden archivada",
      });
    }

    const itemIdRaw = req.body.itemId || req.body.item_id;
    const itemId = itemIdRaw ? Number(itemIdRaw) : null;
    let item = null;

    if (itemId) {
      item = await OrdenServicioItem.findOne({
        where: {
          id: itemId,
          ordenId: orden.id,
        },
      });

      if (!item) {
        return res.status(404).json({
          error: "El item indicado no pertenece a esta orden",
        });
      }
    }

    const pesoKg = normalizarDecimal3(req.body.peso_kg ?? req.body.kilos, 0);
    const motivoExcepcion = limpiarTexto(req.body.motivo_excepcion_material);

    if (pesoKg < 0) {
      return res.status(400).json({
        error: "El peso_kg no puede ser negativo",
      });
    }

    if (pesoKg <= 0 && !motivoExcepcion) {
      return res.status(400).json({
        error: "Debes registrar peso_kg o motivo_excepcion_material",
      });
    }

    const detalle = await sequelize.query(
      `
      SELECT
        o."id" AS "orden_id",
        v."id" AS "vehiculo_id",
        v."patente",
        v."marca",
        v."modelo",
        v."anio",
        c."id" AS "cliente_id"
      FROM "ordenes_trabajo" o
      LEFT JOIN "vehiculos" v ON v."id" = o."vehiculoId"
      LEFT JOIN "clientes" c ON c."id" = v."clienteId"
      WHERE o."id" = :id
      LIMIT 1;
      `,
      {
        replacements: { id: orden.id },
        type: QueryTypes.SELECT,
      }
    );
    const datos = detalle[0] || {};
    const fechaSolicitada = req.body.fecha ? new Date(req.body.fecha) : new Date();
    const fecha = Number.isNaN(fechaSolicitada.getTime())
      ? new Date()
      : fechaSolicitada;
    const precioEstimadoKg = normalizarDecimal(req.body.precio_estimado_kg, 11000);
    const valorEstimado =
      req.body.valor_estimado !== undefined
        ? normalizarDecimal(req.body.valor_estimado, 0)
        : normalizarDecimal(pesoKg * precioEstimadoKg, 0);
    const usuario = usuarioActual(req);
    const eventoAuditoria = {
      tipo: "MATERIAL_RECUPERADO_REGISTRADO",
      ordenId: orden.id,
      itemId: itemId || null,
      peso_kg: pesoKg,
      motivo_excepcion_material: motivoExcepcion,
      registrado_por: usuario,
      fecha: new Date().toISOString(),
    };

    const material = await MaterialRecuperado.create({
      ordenId: orden.id,
      itemId: itemId || null,
      clienteId: datos.cliente_id || null,
      vehiculoId: datos.vehiculo_id || orden.vehiculoId || null,
      fecha: fecha.toISOString().slice(0, 10),
      marca: limpiarTexto(datos.marca) || "SIN MARCA",
      modelo: limpiarTexto(datos.modelo) || "SIN MODELO",
      motor: limpiarTexto(req.body.motor),
      anio: datos.anio || null,
      patente: limpiarTexto(datos.patente),
      tipo_material: limpiarTexto(req.body.tipo_material) || "LOZA_DPF",
      kilos: pesoKg,
      peso_kg: pesoKg,
      foto: limpiarTexto(req.body.foto || req.body.url_foto),
      precio_estimado_kg: precioEstimadoKg,
      valor_estimado: valorEstimado,
      lote_mes: fecha.toISOString().slice(0, 7),
      lote_estado: limpiarTexto(req.body.lote_estado) || "ABIERTO",
      estado: limpiarTexto(req.body.estado) || "ACUMULADO",
      observacion: limpiarTexto(req.body.observacion),
      responsable: limpiarTexto(req.body.responsable) || usuario,
      destino: limpiarTexto(req.body.destino),
      motivo_excepcion_material: motivoExcepcion,
      creado_por: usuario,
      registrado_por: usuario,
      registrado_at: new Date(),
      auditoria: [eventoAuditoria],
    });

    res.status(201).json({
      mensaje: "Material recuperado registrado correctamente",
      material,
      item,
    });
  } catch (error) {
    console.error("ERROR REGISTRANDO MATERIAL RECUPERADO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const registrarCorreccionTecnica = async (req, res) => {
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
        error: "No puedes registrar postventa en una orden archivada",
      });
    }

    const motivo = limpiarTexto(req.body.motivo || req.body.correccion_motivo);
    const descripcion = limpiarTexto(
      req.body.descripcion || req.body.correccion_descripcion
    );
    const sintomaCliente = limpiarTexto(
      req.body.sintoma_cliente || req.body.correccion_sintoma_cliente
    );
    const comentarioTecnico = limpiarTexto(
      req.body.comentario_tecnico || req.body.correccion_comentario_tecnico
    );

    if (!motivo && !descripcion && !sintomaCliente && !comentarioTecnico) {
      return res.status(400).json({
        error:
          "Debes indicar motivo, descripción, síntoma o comentario técnico",
      });
    }

    const ahora = new Date();
    const usuario = usuarioActual(req);
    const estado = normalizarEstadoCorreccion(
      req.body.estado || req.body.correccion_estado
    );
    const prioridad = normalizarPrioridadCorreccion(
      req.body.prioridad || req.body.correccion_prioridad
    );
    const archivoEcuIdRaw =
      req.body.archivo_ecu_id ||
      req.body.archivoECUId ||
      req.body.correccion_archivo_ecu_id;
    const archivoEcuId = archivoEcuIdRaw ? Number(archivoEcuIdRaw) : null;
    const clienteVolvio = normalizarBoolean(
      req.body.cliente_volvio || req.body.correccion_cliente_volvio
    );
    const historialActual = parseJsonSeguro(
      orden.getDataValue("correccion_historial"),
      []
    );
    const evento = {
      tipo: "CORRECCION_TECNICA",
      estado,
      prioridad,
      motivo,
      descripcion,
      dtc: limpiarTexto(req.body.dtc || req.body.correccion_dtc),
      sintoma_cliente: sintomaCliente,
      archivo_ecu_id:
        archivoEcuId && Number.isFinite(archivoEcuId) ? archivoEcuId : null,
      responsable_sugerido: limpiarTexto(
        req.body.responsable_sugerido ||
          req.body.correccion_responsable_sugerido
      ),
      comentario_tecnico: comentarioTecnico,
      cliente_volvio: clienteVolvio,
      creado_por: usuario,
      fecha: ahora.toISOString(),
    };

    await orden.update({
      correccion_estado: estado,
      correccion_prioridad: prioridad,
      correccion_motivo: motivo,
      correccion_descripcion: descripcion,
      correccion_dtc: evento.dtc,
      correccion_sintoma_cliente: sintomaCliente,
      correccion_archivo_ecu_id: evento.archivo_ecu_id,
      correccion_responsable_sugerido: evento.responsable_sugerido,
      correccion_comentario_tecnico: comentarioTecnico,
      correccion_cliente_volvio: clienteVolvio,
      correccion_creada_por: orden.correccion_creada_por || usuario,
      correccion_creada_at: orden.correccion_creada_at || ahora,
      correccion_actualizada_por: usuario,
      correccion_actualizada_at: ahora,
      correccion_historial: [...historialActual, evento],
    });

    try {
      await crearNotificacionesInternas({
        usuariosDestino: [],
        rolesDestino: ROLES_NOTIFICACION_CORRECCION,
        tipo: "CORRECCION_TECNICA_SOLICITADA",
        titulo: "Corrección técnica solicitada",
        mensaje:
          "Cliente volvió por DTC / revisión postventa. Requiere revisión ECU/File Service.",
        ordenId: orden.id,
        archivoECUId: evento.archivo_ecu_id,
        accion_url: `/ordenes?ordenId=${orden.id}#postventa`,
        accion_tipo: "ABRIR_POSTVENTA_TECNICA",
        entidad_tipo: "ORDEN_TRABAJO",
        entidad_id: String(orden.id),
        metadata: {
          correccion_estado: estado,
          correccion_prioridad: prioridad,
          archivo_ecu_id: evento.archivo_ecu_id,
          cliente_volvio: clienteVolvio,
          dtc: evento.dtc,
        },
      });
    } catch (errorNotificacion) {
      console.warn(
        "No se pudo crear notificación de corrección técnica:",
        errorNotificacion.message
      );
    }

    res.status(201).json({
      mensaje: "Corrección técnica registrada correctamente",
      ordenId: orden.id,
      correccion: evento,
    });
  } catch (error) {
    console.error("ERROR REGISTRANDO CORRECCIÓN TÉCNICA:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const actualizarCorreccionTecnica = async (req, res) => {
  try {
    await prepararColumnas();

    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const ahora = new Date();
    const usuario = usuarioActual(req);
    const estado = normalizarEstadoCorreccion(
      req.body.estado || req.body.correccion_estado
    );
    const prioridad = normalizarPrioridadCorreccion(
      req.body.prioridad || req.body.correccion_prioridad || orden.correccion_prioridad
    );
    const historialActual = parseJsonSeguro(
      orden.getDataValue("correccion_historial"),
      []
    );
    const evento = {
      tipo: "ACTUALIZACION_CORRECCION_TECNICA",
      estado,
      prioridad,
      comentario_tecnico: limpiarTexto(
        req.body.comentario_tecnico || req.body.correccion_comentario_tecnico
      ),
      actualizado_por: usuario,
      fecha: ahora.toISOString(),
    };

    await orden.update({
      correccion_estado: estado,
      correccion_prioridad: prioridad,
      correccion_comentario_tecnico:
        evento.comentario_tecnico || orden.correccion_comentario_tecnico,
      correccion_actualizada_por: usuario,
      correccion_actualizada_at: ahora,
      correccion_historial: [...historialActual, evento],
    });

    res.json({
      mensaje: "Estado de corrección técnica actualizado",
      ordenId: orden.id,
      correccion: evento,
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO CORRECCIÓN TÉCNICA:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const agregarBitacoraOrden = async (req, res) => {
  try {
    await prepararColumnas();

    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const texto = limpiarTexto(req.body.texto || req.body.observacion);

    if (!texto) {
      return res.status(400).json({
        error: "Debes escribir una observación para la bitácora",
      });
    }

    const evento = {
      tipo: limpiarTexto(req.body.tipo || "OTRO").toUpperCase(),
      texto,
      prioridad: normalizarPrioridadCorreccion(req.body.prioridad || "MEDIA"),
      modulo_relacionado: limpiarTexto(req.body.modulo_relacionado),
      creado_por: usuarioActual(req),
      fecha: new Date().toISOString(),
    };
    const bitacoraActual = parseJsonSeguro(
      orden.getDataValue("bitacora_operativa"),
      []
    );

    await orden.update({
      bitacora_operativa: [...bitacoraActual, evento],
    });

    res.status(201).json({
      mensaje: "Observación agregada a bitácora",
      ordenId: orden.id,
      evento,
    });
  } catch (error) {
    console.error("ERROR AGREGANDO BITÁCORA:", error);

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
      await validarMaterialObligatorioOrden(orden.id);
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

    res.status(error.statusCode || 500).json({
      error: error.message,
      itemsPendientes: error.itemsPendientes || undefined,
    });
  }
};

const registrarPago = async (req, res) => {
  try {
    await prepararColumnas();

    if (!tieneRol(req, ROLES_CIERRE_COMERCIAL)) {
      return enviarErrorPermiso(res);
    }

    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const medioPago = limpiarTexto(req.body.medio_pago) || "TRANSFERENCIA";
    const montoPagado = normalizarNumero(
      req.body.monto_pagado || req.body.monto_total || montoComercialOrden(orden),
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

    if (!tieneRol(req, ROLES_CIERRE_COMERCIAL)) {
      return enviarErrorPermiso(res);
    }

    const orden = await OrdenTrabajo.findByPk(req.params.id);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const medioPago = limpiarTexto(req.body.medio_pago) || "TRANSFERENCIA";
    const montoPagado = normalizarNumero(
      req.body.monto_pagado || req.body.monto_total || montoComercialOrden(orden),
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
  registrarAjusteComercial,
  obtenerItemsOrden,
  crearItemOrden,
  actualizarItemOrden,
  eliminarItemOrden,
  obtenerMaterialOrden,
  registrarMaterialOrden,
  registrarCorreccionTecnica,
  actualizarCorreccionTecnica,
  agregarBitacoraOrden,
  actualizarEstado,
  registrarPago,
  cobrarYEntregar,
};
