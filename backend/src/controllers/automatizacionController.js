const { Op, QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const { AutomatizacionReporte, Notificacion, Usuario } = require("../models");
const { crearNotificacionesInternas } = require("./notificacionController");
const {
  prepararColumnasArchivoECU,
  calcularProcessGuardArchivo,
} = require("./archivoECUController");
const {
  obtenerEstadoScheduler,
  ejecutarRevisionInterna,
} = require("../services/internalScheduler");
const {
  verificarGuardiaOperativaUsuario: verificarGuardiaOperativaUsuarioService,
} = require("../services/guardiaOperativaService");

const TABLAS = {
  ordenes: "ordenes_trabajo",
  archivos: "archivos_ecu",
  clientes: "clientes",
  vehiculos: "vehiculos",
  bitacora: "bitacora_operativa",
  notificaciones: "notificaciones",
  movimientos: "movimientos_financieros",
  comprobantes: "comprobantes_pago",
  cierres: "cierres_semanales",
  fondo: "fondo_reserva_movimientos",
  materiales: "materiales_recuperados",
  fotos: "fotos_vehiculo",
  diagnosticos: "diagnosticos",
  items: "orden_servicio_items",
  eventosOrden: "orden_eventos_operativos",
};

const LIMITE_LECTURA = 800;
const LIMITE_OPERATIVO = 5000;
let tablaPreparada = false;

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const upper = (valor) => limpiarTexto(valor).toUpperCase();

const numero = (valor) => {
  const parsed = Number(valor || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const booleano = (valor) =>
  valor === true ||
  valor === 1 ||
  valor === "1" ||
  upper(valor) === "TRUE" ||
  upper(valor) === "SI";

const listaJson = (valor) => {
  if (Array.isArray(valor)) return valor.filter(Boolean);
  if (typeof valor !== "string" || !valor.trim()) return [];

  try {
    const parsed = JSON.parse(valor);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const esCreadoEnModoUrgente = (registro = {}) =>
  booleano(registro.creado_en_modo_urgente);

const requiereRegularizacion = (registro = {}) =>
  booleano(registro.requiere_regularizacion) ||
  listaJson(registro.regularizacion_pendientes).length > 0;

const pendientesRegularizacion = (registro = {}) =>
  listaJson(registro.regularizacion_pendientes).map((pendiente) =>
    typeof pendiente === "string"
      ? pendiente
      : pendiente?.codigo || pendiente?.tipo || pendiente?.mensaje
  ).filter(Boolean);

const ordenPorAsignar = (orden = {}, items = []) =>
  ![
    orden.diagnostico_asignado_a_id,
    orden.operador_ecu_asignado_a_id,
    orden.mecanico_asignado_a_id,
    orden.supervisor_asignado_a_id,
  ].some((valor) => Boolean(limpiarTexto(valor))) &&
  !items.some(
    (item) =>
      upper(item.estado) !== "ANULADO" &&
      Boolean(limpiarTexto(item.responsable_id))
  );

const archivoPorAsignar = (archivo = {}) =>
  ![
    archivo.tuner_asignado_a_id,
    archivo.operador_ecu_asignado_a_id,
    archivo.slave_asignado_a_id,
  ].some((valor) => Boolean(limpiarTexto(valor)));

const postEscrituraCumplida = (archivo = {}) => {
  const estado = upper(archivo.post_escritura_estado);
  return (
    estado === "OK" ||
    (estado === "NO_APLICA" &&
      Boolean(limpiarTexto(archivo.post_escritura_observacion)))
  );
};

const fechaValida = (valor) => {
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const horasDesde = (valor, base = new Date()) => {
  const fecha = fechaValida(valor);
  if (!fecha) return 0;
  return Math.max(0, (base.getTime() - fecha.getTime()) / 36e5);
};

const horasEntre = (fechaA, fechaB) => {
  const inicio = fechaValida(fechaA);
  const fin = fechaValida(fechaB);
  if (!inicio || !fin) return 0;
  return Math.max(0, (fin.getTime() - inicio.getTime()) / 36e5);
};

const inicioDia = (base = new Date()) => {
  const fecha = new Date(base);
  fecha.setHours(0, 0, 0, 0);
  return fecha;
};

const inicioSemana = (base = new Date()) => {
  const fecha = new Date(base);
  const dia = fecha.getDay() || 7;
  fecha.setDate(fecha.getDate() - dia + 1);
  fecha.setHours(0, 0, 0, 0);
  return fecha;
};

const inicioMes = (base = new Date()) => {
  const fecha = new Date(base.getFullYear(), base.getMonth(), 1);
  fecha.setHours(0, 0, 0, 0);
  return fecha;
};

const dentroDesde = (valor, desde) => {
  const fecha = fechaValida(valor);
  return Boolean(fecha && fecha >= desde);
};

const quoteIdent = (valor) => `"${String(valor).replace(/"/g, '""')}"`;

const usuarioActual = (req) =>
  req.usuario?.username || req.usuario?.nombre || req.user?.username || "sistema";

const rolActual = (req) => upper(req.usuario?.rol || req.user?.rol);

const esOwnerAdmin = (req) => ["OWNER", "ADMIN"].includes(rolActual(req));

const prepararTablaReportes = async () => {
  if (tablaPreparada) return;

  await AutomatizacionReporte.sync();
  await sequelize.query(`
    ALTER TABLE automatizacion_reportes
      ADD COLUMN IF NOT EXISTS tipo VARCHAR(60),
      ADD COLUMN IF NOT EXISTS titulo VARCHAR(180),
      ADD COLUMN IF NOT EXISTS resumen TEXT,
      ADD COLUMN IF NOT EXISTS prioridad VARCHAR(30) DEFAULT 'MEDIA',
      ADD COLUMN IF NOT EXISTS alertas JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS sugerencias JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS metricas JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS accion_url TEXT,
      ADD COLUMN IF NOT EXISTS generado_por VARCHAR(100),
      ADD COLUMN IF NOT EXISTS origen VARCHAR(60) DEFAULT 'AUTOMATIZACION'
  `);
  await sequelize.query(`
    UPDATE automatizacion_reportes
    SET
      alertas = COALESCE(alertas, '[]'::jsonb),
      sugerencias = COALESCE(sugerencias, '[]'::jsonb),
      metricas = COALESCE(metricas, '{}'::jsonb),
      origen = COALESCE(origen, 'AUTOMATIZACION')
  `);

  tablaPreparada = true;
};

const tablaExiste = async (tableName) => {
  try {
    const rows = await sequelize.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = :tableName
        ) AS existe
      `,
      {
        replacements: { tableName },
        type: QueryTypes.SELECT,
      }
    );

    return Boolean(rows?.[0]?.existe);
  } catch (error) {
    console.warn(`Automatizaciones: no se pudo verificar ${tableName}:`, error.message);
    return false;
  }
};

const leerTabla = async (tableName, limit = LIMITE_LECTURA) => {
  if (!(await tablaExiste(tableName))) return [];
  const esTablaOperativaPrincipal = [TABLAS.ordenes, TABLAS.archivos].includes(
    tableName
  );

  try {
    const tabla = quoteIdent(tableName);
    const sql = tableName === TABLAS.ordenes
      ? `
        SELECT *
        FROM (
          SELECT * FROM ${tabla}
          WHERE COALESCE("archivada", false) = true
             OR UPPER(COALESCE("estado", '')) = 'ENTREGADO'
          ORDER BY "updatedAt" DESC
          LIMIT :limit
        ) AS historicas
        UNION ALL
        SELECT *
        FROM (
          SELECT * FROM ${tabla}
          WHERE COALESCE("archivada", false) = false
            AND UPPER(COALESCE("estado", '')) <> 'ENTREGADO'
          ORDER BY "updatedAt" DESC
          LIMIT :operationalLimit
        ) AS activas
      `
      : tableName === TABLAS.archivos
        ? `
          SELECT *
          FROM (
            SELECT * FROM ${tabla}
            WHERE COALESCE("archivado", false) = true
               OR UPPER(COALESCE("estado", '')) IN ('FINALIZADO_TECNICO', 'FINALIZADO', 'ARCHIVADO')
            ORDER BY "updatedAt" DESC
            LIMIT :limit
          ) AS historicos
          UNION ALL
          SELECT *
          FROM (
            SELECT * FROM ${tabla}
            WHERE COALESCE("archivado", false) = false
              AND UPPER(COALESCE("estado", '')) NOT IN ('FINALIZADO_TECNICO', 'FINALIZADO', 'ARCHIVADO')
            ORDER BY "updatedAt" DESC
            LIMIT :operationalLimit
          ) AS activos
        `
        : `SELECT * FROM ${tabla} ORDER BY 1 DESC LIMIT :limit`;

    return await sequelize.query(
      sql,
      {
        replacements: { limit, operationalLimit: LIMITE_OPERATIVO },
        type: QueryTypes.SELECT,
      }
    );
  } catch (error) {
    console.warn(`Automatizaciones: no se pudo leer ${tableName}:`, error.message);
    if (esTablaOperativaPrincipal) throw error;
    return [];
  }
};

const ordenarPorFecha = (items = []) =>
  [...items].sort((a, b) => {
    const fechaA = fechaValida(a.updatedAt || a.createdAt)?.getTime() || 0;
    const fechaB = fechaValida(b.updatedAt || b.createdAt)?.getTime() || 0;
    return fechaB - fechaA;
  });

const montoPagadoOrden = (orden) => {
  if (upper(orden.estado_pago) !== "PAGADO") return 0;
  const pagado = numero(orden.monto_pagado);
  return pagado > 0 ? pagado : numero(orden.monto_total);
};

const esArchivoActivo = (archivo) => {
  const estadoArchivo = upper(archivo.estado);
  return (
    !booleano(archivo.archivado) &&
    !["FINALIZADO_TECNICO", "FINALIZADO", "ARCHIVADO"].includes(estadoArchivo)
  );
};

const ESTADOS_ORDEN_TERMINALES = new Set([
  "ENTREGADO",
  "ANULADO",
  "CANCELADO",
  "ARCHIVADO",
]);

const esOrdenActiva = (orden) =>
  !booleano(orden?.archivada) &&
  !ESTADOS_ORDEN_TERMINALES.has(upper(orden?.estado));

const cargarContexto = async () => {
  const [
    ordenes,
    archivos,
    clientes,
    vehiculos,
    bitacora,
    notificaciones,
    movimientos,
    comprobantes,
    cierres,
    fondo,
    materiales,
    fotos,
    diagnosticos,
    items,
    eventosOrden,
  ] = await Promise.all([
    leerTabla(TABLAS.ordenes),
    leerTabla(TABLAS.archivos),
    leerTabla(TABLAS.clientes),
    leerTabla(TABLAS.vehiculos),
    leerTabla(TABLAS.bitacora, 300),
    leerTabla(TABLAS.notificaciones, 500),
    leerTabla(TABLAS.movimientos, 500),
    leerTabla(TABLAS.comprobantes, 500),
    leerTabla(TABLAS.cierres, 100),
    leerTabla(TABLAS.fondo, 200),
    leerTabla(TABLAS.materiales, 500),
    leerTabla(TABLAS.fotos, 800),
    leerTabla(TABLAS.diagnosticos, 800),
    leerTabla(TABLAS.items, 800),
    leerTabla(TABLAS.eventosOrden, 2000),
  ]);

  const clientesPorId = new Map(clientes.map((cliente) => [Number(cliente.id), cliente]));
  const vehiculosPorId = new Map(vehiculos.map((vehiculo) => [Number(vehiculo.id), vehiculo]));

  const ordenesEnriquecidas = ordenarPorFecha(ordenes).map((orden) => {
    const vehiculo = vehiculosPorId.get(Number(orden.vehiculoId));
    const cliente = clientesPorId.get(Number(vehiculo?.clienteId || orden.clienteId));
    return {
      ...orden,
      _vehiculo: vehiculo || null,
      _cliente: cliente || null,
    };
  });

  const ordenesPorId = new Map(ordenesEnriquecidas.map((orden) => [Number(orden.id), orden]));

  return {
    ordenes: ordenesEnriquecidas,
    archivos: ordenarPorFecha(archivos).map((archivo) => ({
      ...archivo,
      _orden: ordenesPorId.get(Number(archivo.ordenId)) || null,
    })),
    clientes,
    vehiculos,
    bitacora: ordenarPorFecha(bitacora),
    notificaciones: ordenarPorFecha(notificaciones),
    movimientos: ordenarPorFecha(movimientos),
    comprobantes: ordenarPorFecha(comprobantes),
    cierres: ordenarPorFecha(cierres),
    fondo: ordenarPorFecha(fondo),
    materiales: ordenarPorFecha(materiales),
    fotos: ordenarPorFecha(fotos),
    diagnosticos: ordenarPorFecha(diagnosticos),
    items: ordenarPorFecha(items),
    eventosOrden: ordenarPorFecha(eventosOrden),
  };
};

const alerta = ({
  id,
  titulo,
  detalle,
  prioridad = "MEDIA",
  accion_url = null,
  entidad_tipo = null,
  entidad_id = null,
  sugerencia = null,
}) => ({
  id,
  titulo,
  detalle,
  prioridad,
  accion_url,
  entidad_tipo,
  entidad_id: entidad_id === null || entidad_id === undefined ? null : String(entidad_id),
  sugerencia,
});

const prioridadGeneral = (alertas = []) => {
  if (alertas.some((item) => upper(item.prioridad) === "URGENTE")) return "URGENTE";
  if (alertas.some((item) => upper(item.prioridad) === "ALTA")) return "ALTA";
  if (alertas.some((item) => upper(item.prioridad) === "MEDIA")) return "MEDIA";
  return "BAJA";
};

const crearRevisionBase = (ctx) => {
  const ahora = new Date();
  const ordenesActivas = ctx.ordenes.filter(esOrdenActiva);
  const archivosActivos = ctx.archivos.filter(esArchivoActivo);

  const ordenesSinResponsable = ordenesActivas.filter(
    (orden) =>
      !limpiarTexto(orden.diagnostico_asignado_a) &&
      !limpiarTexto(orden.operador_ecu_asignado_a) &&
      !limpiarTexto(orden.mecanico_asignado_a) &&
      !limpiarTexto(orden.supervisor_asignado_a)
  );
  const listasPagoPendiente = ordenesActivas.filter(
    (orden) =>
      upper(orden.estado) === "LISTO_PARA_ENTREGA" && upper(orden.estado_pago) !== "PAGADO"
  );
  const correccionesTecnicas = ordenesActivas.filter((orden) => {
    const correccion = upper(orden.correccion_estado);
    return (
      booleano(orden.correccion_cliente_volvio) ||
      (correccion && !["CORRECCION_APLICADA", "CERRADA"].includes(correccion))
    );
  });
  const clientesVolvieron = correccionesTecnicas.filter((orden) =>
    booleano(orden.correccion_cliente_volvio)
  );
  const archivosSinRevisar = archivosActivos.filter((archivo) =>
    ["ORIGINAL_CARGADO", "NOTIFICADO_MASTER"].includes(upper(archivo.estado))
  );
  const postEscrituraPendiente = archivosActivos.filter((archivo) => {
    const postOk = postEscrituraCumplida(archivo);
    return (
      !postOk &&
      (["MODIFICADO_LISTO", "NOTIFICADO_SLAVE", "POST_ESCRITURA_PENDIENTE"].includes(
        upper(archivo.estado)
      ) ||
        Boolean(archivo.archivo_modificado))
    );
  });
  const nuevaLectura = archivosActivos.filter(
    (archivo) => upper(archivo.estado) === "REQUIERE_NUEVA_LECTURA"
  );
  const archivosCorreccion = archivosActivos.filter(
    (archivo) => booleano(archivo.correccion_pendiente) || upper(archivo.estado) === "REQUIERE_CORRECCION"
  );
  const archivosSinResponsable = archivosActivos.filter(
    (archivo) =>
      !limpiarTexto(archivo.tuner_asignado_a_id) &&
      !limpiarTexto(archivo.operador_ecu_asignado_a_id) &&
      !limpiarTexto(archivo.slave_asignado_a_id) &&
      !limpiarTexto(archivo.tuner_asignado_a) &&
      !limpiarTexto(archivo.operador_ecu_asignado_a) &&
      !limpiarTexto(archivo.slave_asignado_a)
  );
  const archivosViejos = archivosActivos.filter(
    (archivo) => horasDesde(archivo.updatedAt || archivo.createdAt, ahora) > 24
  );
  const modListo = archivosActivos.filter((archivo) =>
    ["MODIFICADO_LISTO", "NOTIFICADO_SLAVE"].includes(upper(archivo.estado))
  );
  const bitacorasPrioritarias = ctx.bitacora.filter(
    (item) => !booleano(item.resuelto) && ["ALTA", "URGENTE"].includes(upper(item.prioridad))
  );
  const bitacorasAbiertas = ctx.bitacora.filter((item) => !booleano(item.resuelto));
  const notificacionesCriticas = ctx.notificaciones.filter(
    (item) =>
      !booleano(item.leida) &&
      ["URGENTE", "ALTA", "CRITICA", "CRITICA"].some((nivel) =>
        [item.titulo, item.mensaje, item.tipo, item.recordatorio_nivel]
          .filter(Boolean)
          .join(" ")
          .toUpperCase()
          .includes(nivel)
      )
  );
  const comprobantesPendientes = ctx.comprobantes.filter(
    (item) => upper(item.estado) === "PENDIENTE_REVISION"
  );
  const materialesFueraRango = ctx.materiales.filter((item) =>
    ["ALERTA", "REVISAR"].includes(upper(item.alerta_rango))
  );

  return {
    ahora,
    ordenesActivas,
    archivosActivos,
    ordenesSinResponsable,
    listasPagoPendiente,
    correccionesTecnicas,
    clientesVolvieron,
    archivosSinRevisar,
    postEscrituraPendiente,
    nuevaLectura,
    archivosCorreccion,
    archivosSinResponsable,
    archivosViejos,
    modListo,
    bitacorasPrioritarias,
    bitacorasAbiertas,
    notificacionesCriticas,
    comprobantesPendientes,
    materialesFueraRango,
  };
};

const estadoProcessGuardVisible = (estado) =>
  !["SIN_RIESGO", "CERRADO"].includes(upper(estado));

const responsableProcessGuard = (archivo) =>
  limpiarTexto(
    archivo.proceso_guard_responsable_id ||
      archivo.operador_ecu_asignado_a_id ||
      archivo.tuner_asignado_a_id ||
      archivo.slave_asignado_a_id ||
      archivo.operador_ecu_asignado_a ||
      archivo.tuner_asignado_a ||
      archivo.slave_asignado_a ||
      "Sin responsable"
  );

const generarItemsProcessGuard = (ctx) => {
  const ahora = new Date();

  return ctx.archivos
    .map((archivo) => {
      const evaluacion = calcularProcessGuardArchivo(archivo, ahora);
      const estadoArchivo = upper(archivo.estado);
      const cierrePendiente =
        booleano(archivo.cierre_tecnico_obligatorio) &&
        !fechaValida(archivo.cierre_tecnico_at);
      const visible =
        estadoProcessGuardVisible(evaluacion.estado) ||
        cierrePendiente ||
        ["MODIFICADO_LISTO", "NOTIFICADO_SLAVE", "POST_ESCRITURA_PENDIENTE"].includes(
          estadoArchivo
        );

      if (!visible) return null;

      const orden = archivo._orden || {};
      const vehiculo = orden._vehiculo || {};
      const cliente = orden._cliente || {};

      return {
        id: archivo.id,
        archivo,
        ordenId: archivo.ordenId,
        estado: evaluacion.estado,
        prioridad: evaluacion.prioridad,
        motivo: evaluacion.motivo,
        minutos: Math.round(evaluacion.minutos),
        horas: Number((evaluacion.minutos / 60).toFixed(1)),
        responsable: responsableProcessGuard(archivo),
        estado_archivo: archivo.estado,
        resultado_tecnico: archivo.resultado_tecnico || "PENDIENTE",
        post_escritura_estado: archivo.post_escritura_estado || "PENDIENTE",
        accion_url: `/archivos-ecu?archivoId=${archivo.id}#post-escritura`,
        cliente: cliente.nombre || "Cliente no informado",
        vehiculo: vehiculo.patente
          ? `${vehiculo.patente} ${vehiculo.marca || ""} ${vehiculo.modelo || ""}`.trim()
          : "Vehiculo no informado",
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const peso = { ESCALADO: 5, CRITICO: 4, ADVERTENCIA: 3, EN_ESPERA_POST_ESCRITURA: 2 };
      const prioridad = (peso[b.estado] || 0) - (peso[a.estado] || 0);
      if (prioridad !== 0) return prioridad;
      return b.minutos - a.minutos;
    });
};

const revisionProcessGuardData = (ctx) => {
  const items = generarItemsProcessGuard(ctx);
  const criticos = items.filter((item) => ["CRITICO", "ESCALADO"].includes(item.estado));
  const advertencias = items.filter((item) => item.estado === "ADVERTENCIA");
  const porResponsable = items.reduce((acc, item) => {
    acc[item.responsable] = (acc[item.responsable] || 0) + 1;
    return acc;
  }, {});

  const alertas = items.slice(0, 8).map((item) =>
    alerta({
      id: `process-guard-${item.id}-${item.estado}`,
      titulo:
        item.estado === "ESCALADO"
          ? "Process Guard escalado"
          : item.estado === "CRITICO"
          ? "Process Guard critico"
          : "Process Guard requiere seguimiento",
      detalle: `File #${item.id} - ${item.motivo} - ${item.horas}h sin cierre tecnico.`,
      prioridad: ["CRITICO", "ESCALADO"].includes(item.estado)
        ? "URGENTE"
        : item.estado === "ADVERTENCIA"
        ? "ALTA"
        : "MEDIA",
      accion_url: item.accion_url,
      entidad_tipo: "ARCHIVO_ECU",
      entidad_id: item.id,
      sugerencia:
        item.estado === "ESCALADO"
          ? "Escalar a OWNER/SUPERVISOR y registrar post escritura, correccion o nueva lectura."
          : "Registrar post escritura, resultado tecnico y cierre antes de entrega.",
    })
  );

  return {
    resumen:
      items.length === 0
        ? "Process Guard sin procesos tecnicos abiertos."
        : `Process Guard detecta ${items.length} proceso(s) sin cierre, ${criticos.length} critico(s).`,
    prioridad: prioridadGeneral(alertas),
    alertas,
    sugerencias: [
      "Despues de MOD listo o descargado, registrar post escritura y cierre tecnico.",
      "No dejar trabajos ECU/File Service cerrados por WhatsApp sin trazabilidad.",
      "Escalar a OWNER/SUPERVISOR si supera 180 minutos.",
    ],
    accion_recomendada:
      criticos.length > 0
        ? "Resolver o escalar procesos criticos antes de nuevas entregas."
        : "Revisar advertencias y registrar cierre tecnico pendiente.",
    metricas: {
      total: items.length,
      criticos: criticos.length,
      escalados: items.filter((item) => item.estado === "ESCALADO").length,
      advertencias: advertencias.length,
      espera_post: items.filter((item) => item.estado === "EN_ESPERA_POST_ESCRITURA").length,
      por_responsable: porResponsable,
    },
    items: items.map(({ archivo, ...item }) => item),
  };
};

const revisionOperativaData = (ctx) => {
  const base = crearRevisionBase(ctx);
  const processGuard = revisionProcessGuardData(ctx);
  const alertas = [];

  if (base.ordenesSinResponsable.length) {
    alertas.push(
      alerta({
        id: "ordenes-sin-responsable",
        titulo: "Ordenes activas sin responsable",
        detalle: `${base.ordenesSinResponsable.length} orden(es) requieren responsable.`,
        prioridad: "ALTA",
        accion_url: "/ordenes",
        entidad_tipo: "ORDEN_TRABAJO",
        sugerencia: "Asignar responsable antes de avanzar nuevos trabajos.",
      })
    );
  }
  if (base.listasPagoPendiente.length) {
    alertas.push(
      alerta({
        id: "listas-pago-pendiente",
        titulo: "Listas para entrega con pago pendiente",
        detalle: `${base.listasPagoPendiente.length} orden(es) listas para entrega aun no tienen pago confirmado.`,
        prioridad: "ALTA",
        accion_url: "/ordenes#pago",
        entidad_tipo: "ORDEN_TRABAJO",
        sugerencia: "Resolver cierre comercial antes de entregar.",
      })
    );
  }
  if (base.postEscrituraPendiente.length) {
    alertas.push(
      alerta({
        id: "post-escritura-pendiente",
        titulo: "Post escritura pendiente",
        detalle: `${base.postEscrituraPendiente.length} archivo(s) sin post escritura OK.`,
        prioridad: "ALTA",
        accion_url: "/archivos-ecu#post-escritura",
        entidad_tipo: "ARCHIVO_ECU",
        sugerencia: "Registrar post escritura antes de finalizar tecnico.",
      })
    );
  }
  if (processGuard.metricas.total > 0) {
    alertas.push(
      alerta({
        id: "process-guard-sin-cierre",
        titulo: "Procesos tecnicos sin cierre",
        detalle: `${processGuard.metricas.total} File Service requieren post escritura, resultado tecnico o cierre.`,
        prioridad: processGuard.metricas.criticos > 0 ? "URGENTE" : "ALTA",
        accion_url: "/archivos-ecu#post-escritura",
        entidad_tipo: "ARCHIVO_ECU",
        sugerencia: "Usar Process Guard para cerrar o escalar lo pendiente.",
      })
    );
  }
  if (base.correccionesTecnicas.length) {
    alertas.push(
      alerta({
        id: "correcciones-tecnicas-abiertas",
        titulo: "Correcciones tecnicas abiertas",
        detalle: `${base.correccionesTecnicas.length} correccion(es) o postventa tecnica siguen abiertas.`,
        prioridad: "URGENTE",
        accion_url: "/ordenes#postventa",
        entidad_tipo: "ORDEN_TRABAJO",
        sugerencia: "Resolver cliente que volvio por DTC antes de nuevos trabajos no urgentes.",
      })
    );
  }
  if (base.clientesVolvieron.length) {
    alertas.push(
      alerta({
        id: "clientes-volvieron-dtc",
        titulo: "Clientes volvieron por DTC/postventa",
        detalle: `${base.clientesVolvieron.length} caso(s) requieren seguimiento visible.`,
        prioridad: "URGENTE",
        accion_url: "/ordenes#postventa",
        entidad_tipo: "ORDEN_TRABAJO",
        sugerencia: "Asignar responsable y dejar trazabilidad tecnica.",
      })
    );
  }
  if (base.archivosSinRevisar.length) {
    alertas.push(
      alerta({
        id: "archivos-ecu-sin-revisar",
        titulo: "Archivos ECU sin revisar",
        detalle: `${base.archivosSinRevisar.length} archivo(s) originales siguen sin avance claro.`,
        prioridad: "MEDIA",
        accion_url: "/archivos-ecu",
        entidad_tipo: "ARCHIVO_ECU",
        sugerencia: "Asignar Tuner/Master o registrar procesamiento.",
      })
    );
  }
  if (base.nuevaLectura.length) {
    alertas.push(
      alerta({
        id: "nueva-lectura-requerida",
        titulo: "Nueva lectura requerida",
        detalle: `${base.nuevaLectura.length} caso(s) requieren nueva lectura.`,
        prioridad: "URGENTE",
        accion_url: "/portal-admin#nueva-lectura",
        entidad_tipo: "PORTAL_FILE",
        sugerencia: "Confirmar que el master/slave suba lectura correcta.",
      })
    );
  }
  if (base.bitacorasPrioritarias.length) {
    alertas.push(
      alerta({
        id: "bitacoras-prioritarias",
        titulo: "Bitacoras ALTA/URGENTE abiertas",
        detalle: `${base.bitacorasPrioritarias.length} observacion(es) prioritarias siguen abiertas.`,
        prioridad: "ALTA",
        accion_url: "/#bitacora",
        entidad_tipo: "BITACORA_OPERATIVA",
        sugerencia: "Resolver o asignar seguimiento antes del cierre del dia.",
      })
    );
  }
  if (base.notificacionesCriticas.length) {
    alertas.push(
      alerta({
        id: "notificaciones-criticas-no-leidas",
        titulo: "Notificaciones criticas no leidas",
        detalle: `${base.notificacionesCriticas.length} notificacion(es) criticas siguen sin leer.`,
        prioridad: "ALTA",
        accion_url: "/",
        entidad_tipo: "NOTIFICACION",
        sugerencia: "Revisar campana y accionar lo pendiente.",
      })
    );
  }
  if (base.comprobantesPendientes.length) {
    alertas.push(
      alerta({
        id: "comprobantes-pendientes",
        titulo: "Comprobantes pendientes de validar",
        detalle: `${base.comprobantesPendientes.length} comprobante(s) requieren revision financiera.`,
        prioridad: "MEDIA",
        accion_url: "/finanzas",
        entidad_tipo: "COMPROBANTE_PAGO",
        sugerencia: "Validar comprobantes antes de considerar caja como definitiva.",
      })
    );
  }
  if (base.materialesFueraRango.length) {
    alertas.push(
      alerta({
        id: "material-fuera-rango",
        titulo: "Material recuperado fuera de rango",
        detalle: `${base.materialesFueraRango.length} registro(s) requieren revision.`,
        prioridad: "MEDIA",
        accion_url: "/finanzas#material",
        entidad_tipo: "MATERIAL_RECUPERADO",
        sugerencia: "Revisar kg, modelo y confianza estadistica.",
      })
    );
  }

  const prioridad = prioridadGeneral(alertas);

  return {
    resumen:
      alertas.length === 0
        ? "Sin bloqueos operativos relevantes detectados."
        : `Se detectaron ${alertas.length} foco(s) operativo(s) para revisar.`,
    prioridad,
    alertas,
    sugerencias: alertas.map((item) => item.sugerencia).filter(Boolean).slice(0, 8),
    accion_recomendada:
      prioridad === "URGENTE"
        ? "Resolver primero correcciones, nueva lectura y post escritura pendiente."
        : "Revisar responsables, pagos pendientes y bitacoras abiertas.",
    metricas: {
      ordenes_activas: base.ordenesActivas.length,
      archivos_activos: base.archivosActivos.length,
      alertas: alertas.length,
      post_escritura_pendiente: base.postEscrituraPendiente.length,
      process_guard_sin_cierre: processGuard.metricas.total,
      process_guard_criticos: processGuard.metricas.criticos,
      correcciones_tecnicas: base.correccionesTecnicas.length,
      bitacoras_prioritarias: base.bitacorasPrioritarias.length,
      comprobantes_pendientes: base.comprobantesPendientes.length,
      material_fuera_rango: base.materialesFueraRango.length,
    },
  };
};

const revisionFileServiceData = (ctx) => {
  const base = crearRevisionBase(ctx);
  const processGuard = revisionProcessGuardData(ctx);
  const alertas = [];

  [
    ["archivos-sin-revisar", "Archivos sin revisar", base.archivosSinRevisar, "MEDIA", "/archivos-ecu"],
    ["mod-listo", "MOD listo / notificado", base.modListo, "MEDIA", "/archivos-ecu"],
    ["post-pendiente", "Post escritura pendiente", base.postEscrituraPendiente, "ALTA", "/archivos-ecu#post-escritura"],
    ["correccion-pendiente", "Correcciones pendientes", base.archivosCorreccion, "URGENTE", "/archivos-ecu#correccion"],
    ["nueva-lectura", "Nueva lectura requerida", base.nuevaLectura, "URGENTE", "/portal-admin#nueva-lectura"],
    ["process-guard", "Procesos sin cierre tecnico", processGuard.items || [], processGuard.metricas.criticos > 0 ? "URGENTE" : "ALTA", "/archivos-ecu#post-escritura"],
    ["sin-responsable", "Archivos sin responsable", base.archivosSinResponsable, "ALTA", "/archivos-ecu"],
    ["viejos", "Archivos viejos sin movimiento", base.archivosViejos, "MEDIA", "/archivos-ecu"],
  ].forEach(([id, titulo, lista, prioridad, accion_url]) => {
    if (lista.length) {
      alertas.push(
        alerta({
          id,
          titulo,
          detalle: `${lista.length} caso(s) detectado(s).`,
          prioridad,
          accion_url,
          entidad_tipo: "ARCHIVO_ECU",
          sugerencia: "Revisar detalle del File Service y dejar siguiente accion registrada.",
        })
      );
    }
  });

  return {
    resumen: `File Service: ${base.archivosActivos.length} activo(s), ${base.modListo.length} MOD listo(s), ${base.postEscrituraPendiente.length} post escritura pendiente.`,
    prioridad: prioridadGeneral(alertas),
    alertas,
    sugerencias: [
      "Asignar responsable a cada archivo activo.",
      "No finalizar tecnico sin post escritura OK cuando corresponda.",
      "Cerrar Process Guard con resultado tecnico y observacion.",
      "Usar nueva lectura requerida cuando el metodo de lectura no sea valido.",
    ],
    accion_recomendada:
      base.archivosCorreccion.length || base.nuevaLectura.length
        ? "Resolver correcciones y nuevas lecturas antes de nuevos MOD."
        : "Revisar MOD listo y post escritura pendiente.",
    metricas: {
      activos: base.archivosActivos.length,
      sin_revisar: base.archivosSinRevisar.length,
      mod_listo: base.modListo.length,
      post_escritura_pendiente: base.postEscrituraPendiente.length,
      correcciones: base.archivosCorreccion.length,
      nueva_lectura: base.nuevaLectura.length,
      process_guard_total: processGuard.metricas.total,
      process_guard_criticos: processGuard.metricas.criticos,
      sin_responsable: base.archivosSinResponsable.length,
      viejos: base.archivosViejos.length,
    },
  };
};

const revisionFinanzasData = (ctx) => {
  const ahora = new Date();
  const desdeSemana = inicioSemana(ahora);
  const movimientosSemana = ctx.movimientos.filter((movimiento) =>
    dentroDesde(movimiento.fecha || movimiento.createdAt, desdeSemana)
  );
  const ingresosPagadosSemana = movimientosSemana
    .filter((movimiento) => upper(movimiento.tipo) === "INGRESO")
    .reduce((total, movimiento) => total + numero(movimiento.monto), 0);
  const gastosSemana = movimientosSemana
    .filter((movimiento) => upper(movimiento.tipo) === "EGRESO")
    .reduce((total, movimiento) => total + numero(movimiento.monto), 0);
  const sueldosPendientes = ctx.movimientos.filter(
    (movimiento) =>
      upper(movimiento.categoria) === "SUELDO" &&
      !["PAGADO", "CERRADO", "REGISTRADO"].includes(upper(movimiento.estado))
  );
  const comprobantesPendientes = ctx.comprobantes.filter(
    (item) => upper(item.estado) === "PENDIENTE_REVISION"
  );
  const pendientesPago = ctx.ordenes.filter(
    (orden) => esOrdenActiva(orden) && upper(orden.estado_pago) !== "PAGADO"
  );
  const fondoReserva = ctx.fondo.reduce((total, movimiento) => {
    const tipo = upper(movimiento.tipo);
    const monto = numero(movimiento.monto);
    return tipo === "RETIRO" ? total - monto : total + monto;
  }, 0);
  const cierreSemanaDisponible =
    ingresosPagadosSemana > 0 &&
    !ctx.cierres.some((cierre) => dentroDesde(cierre.createdAt, desdeSemana));
  const materialesVendidosSinIngreso = ctx.materiales.filter(
    (material) =>
      upper(material.estado) === "VENDIDO" &&
      !ctx.movimientos.some(
        (movimiento) =>
          upper(movimiento.categoria) === "VENTA_MATERIAL" &&
          Number(movimiento.ordenId || 0) === Number(material.ordenId || -1)
      )
  );

  const alertas = [];
  if (comprobantesPendientes.length) {
    alertas.push(
      alerta({
        id: "comprobantes",
        titulo: "Comprobantes pendientes",
        detalle: `${comprobantesPendientes.length} comprobante(s) requieren validacion.`,
        prioridad: "ALTA",
        accion_url: "/finanzas",
        entidad_tipo: "COMPROBANTE_PAGO",
        sugerencia: "Validar antes de considerar caja como definitiva.",
      })
    );
  }
  if (materialesVendidosSinIngreso.length) {
    alertas.push(
      alerta({
        id: "material-vendido-sin-ingreso",
        titulo: "Material vendido sin ingreso financiero",
        detalle: `${materialesVendidosSinIngreso.length} registro(s) requieren ingreso financiero.`,
        prioridad: "ALTA",
        accion_url: "/finanzas#material",
        entidad_tipo: "MATERIAL_RECUPERADO",
        sugerencia: "Registrar ingreso VENTA_MATERIAL si corresponde.",
      })
    );
  }

  return {
    resumen: `Semana: ingresos ${ingresosPagadosSemana.toLocaleString("es-CL")} CLP, gastos ${gastosSemana.toLocaleString("es-CL")} CLP, fondo reserva ${fondoReserva.toLocaleString("es-CL")} CLP.`,
    prioridad: prioridadGeneral(alertas),
    alertas,
    sugerencias: [
      "Separar caja pagada de presupuestos o pagos pendientes.",
      "Revisar comprobantes antes del cierre semanal.",
      "Usar cierre semanal como control operativo, no contabilidad formal.",
    ],
    accion_recomendada:
      comprobantesPendientes.length > 0
        ? "Validar comprobantes pendientes."
        : "Revisar si corresponde preparar cierre semanal.",
    metricas: {
      ingresos_pagados_semana: ingresosPagadosSemana,
      gastos_semana: gastosSemana,
      pendientes_pago: pendientesPago.length,
      comprobantes_pendientes: comprobantesPendientes.length,
      sueldos_pendientes: sueldosPendientes.length,
      fondo_reserva: fondoReserva,
      cierre_semanal_disponible: cierreSemanaDisponible,
      material_vendido_sin_ingreso: materialesVendidosSinIngreso.length,
    },
  };
};

const revisionMaterialData = (ctx) => {
  const ahora = new Date();
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  const materialesMes = ctx.materiales.filter(
    (material) => material.lote_mes === mesActual || dentroDesde(material.fecha, inicioMes(ahora))
  );
  const fueraRango = ctx.materiales.filter((item) =>
    ["ALERTA", "REVISAR"].includes(upper(item.alerta_rango))
  );
  const loteAbierto = ctx.materiales.filter(
    (item) => upper(item.lote_estado) === "ABIERTO" && item.lote_mes === mesActual
  );
  const bajaConfianza = ctx.materiales.filter(
    (item) => upper(item.confianza_estadistica) === "BAJA"
  );
  const kgReal = materialesMes.reduce((total, item) => total + numero(item.kilos), 0);
  const kgEsperado = materialesMes.reduce(
    (total, item) => total + numero(item.promedio_historico_kg),
    0
  );
  const vendidosSinIngreso = ctx.materiales.filter(
    (material) =>
      upper(material.estado) === "VENDIDO" &&
      !ctx.movimientos.some(
        (movimiento) =>
          upper(movimiento.categoria) === "VENTA_MATERIAL" &&
          Number(movimiento.ordenId || 0) === Number(material.ordenId || -1)
      )
  );

  const alertas = [];
  if (fueraRango.length) {
    alertas.push(
      alerta({
        id: "fuera-rango",
        titulo: "Registros fuera de rango",
        detalle: `${fueraRango.length} registro(s) con alerta estadistica.`,
        prioridad: "ALTA",
        accion_url: "/finanzas#material",
        entidad_tipo: "MATERIAL_RECUPERADO",
        sugerencia: "Revisar kg, modelo, motor y observacion administrativa.",
      })
    );
  }
  if (vendidosSinIngreso.length) {
    alertas.push(
      alerta({
        id: "vendido-sin-ingreso",
        titulo: "Material vendido sin ingreso",
        detalle: `${vendidosSinIngreso.length} venta(s) de material no asociadas a ingreso financiero.`,
        prioridad: "ALTA",
        accion_url: "/finanzas#material",
        entidad_tipo: "MATERIAL_RECUPERADO",
        sugerencia: "Registrar ingreso financiero VENTA_MATERIAL.",
      })
    );
  }

  return {
    resumen: `Material mes: ${kgReal.toLocaleString("es-CL")} kg reales, ${kgEsperado.toLocaleString("es-CL")} kg esperados.`,
    prioridad: prioridadGeneral(alertas),
    alertas,
    sugerencias: [
      "Revisar registros fuera de rango antes de cerrar lote.",
      "No mezclar control de material con cierre comercial de orden.",
      "Mejorar datos de marca/modelo/motor para subir confianza estadistica.",
    ],
    accion_recomendada:
      fueraRango.length > 0
        ? "Revisar material fuera de rango."
        : "Mantener lote mensual actualizado.",
    metricas: {
      lote_mes: mesActual,
      lote_abierto: loteAbierto.length,
      kg_real_mes: kgReal,
      kg_esperado_mes: kgEsperado,
      fuera_rango: fueraRango.length,
      vendidos_sin_ingreso: vendidosSinIngreso.length,
      baja_confianza: bajaConfianza.length,
    },
  };
};

const crearReporteData = (ctx, tipo) => {
  const revision = revisionOperativaData(ctx);
  const file = revisionFileServiceData(ctx);
  const processGuard = revisionProcessGuardData(ctx);
  const finanzas = revisionFinanzasData(ctx);
  const material = revisionMaterialData(ctx);
  const base = crearRevisionBase(ctx);
  const hoy = new Date();
  const desdeHoy = inicioDia(hoy);
  const cerradasHoy = ctx.ordenes.filter(
    (orden) =>
      upper(orden.estado) === "ENTREGADO" &&
      (dentroDesde(orden.entregado_at, desdeHoy) || dentroDesde(orden.updatedAt, desdeHoy))
  );

  const alertas =
    tipo === "CIERRE_DIA"
      ? [
          ...revision.alertas,
          ...file.alertas.filter((item) => ["URGENTE", "ALTA"].includes(upper(item.prioridad))),
          ...processGuard.alertas.filter((item) => ["URGENTE", "ALTA"].includes(upper(item.prioridad))),
        ]
      : [...revision.alertas.slice(0, 8), ...file.alertas.slice(0, 4), ...processGuard.alertas.slice(0, 4)];

  return {
    tipo,
    titulo:
      tipo === "CIERRE_DIA"
        ? "Reporte cierre del dia GMTCH"
        : "Reporte apertura del dia GMTCH",
    resumen:
      tipo === "CIERRE_DIA"
        ? `Cierre: ${cerradasHoy.length} orden(es) entregada(s) hoy, ${base.ordenesActivas.length} activa(s), ${processGuard.metricas.total} proceso(s) tecnico(s) sin cierre, ${base.bitacorasAbiertas.length} bitacora(s) abierta(s).`
        : `Apertura: ${base.ordenesActivas.length} orden(es) activa(s), ${base.archivosActivos.length} File Service activo(s), ${base.listasPagoPendiente.length} entrega(s) con pago pendiente.`,
    prioridad: prioridadGeneral(alertas),
    alertas,
    sugerencias: [
      revision.accion_recomendada,
      file.accion_recomendada,
      finanzas.accion_recomendada,
      material.accion_recomendada,
    ].filter(Boolean),
    accion_url: "/",
    metricas: {
      pendientes_criticos: alertas.filter((item) => ["URGENTE", "ALTA"].includes(upper(item.prioridad))).length,
      ordenes_activas: base.ordenesActivas.length,
      entregas_listas: base.listasPagoPendiente.length,
      pagos_pendientes: revision.metricas.comprobantes_pendientes,
      archivos_pendientes: base.archivosSinRevisar.length,
      postventas_abiertas: base.correccionesTecnicas.length,
      process_guard_sin_cierre: processGuard.metricas.total,
      process_guard_criticos: processGuard.metricas.criticos,
      bitacoras_abiertas: base.bitacorasAbiertas.length,
      material_kg_mes: material.metricas.kg_real_mes,
      cerradas_hoy: cerradasHoy.length,
      finanzas: finanzas.metricas,
    },
  };
};

const agregarPendienteUsuario = (usuarios, username, campo, cantidad = 1, etiqueta = null) => {
  const clave = limpiarTexto(username) || "Sin responsable";
  const nombre = limpiarTexto(etiqueta) || clave;
  if (!usuarios[clave]) {
    usuarios[clave] = {
      usuario_id: clave === nombre ? null : clave,
      username: nombre,
      ordenes_pendientes: 0,
      file_service_pendientes: 0,
      material_pendiente: 0,
      recepciones_emergencia: 0,
      cobros_pendientes_asociados: 0,
      detalles: [],
    };
  }

  usuarios[clave][campo] = numero(usuarios[clave][campo]) + cantidad;
  return usuarios[clave];
};

const materialCumpleCumplimiento = (material) => {
  if (!material) return false;
  const peso = numero(material.peso_kg ?? material.kilos);
  const excepcion = limpiarTexto(material.motivo_excepcion_material);
  return peso > 0 || Boolean(excepcion);
};

const crearCumplimientoOperativoData = (ctx) => {
  const ahora = new Date();
  const fotosPorOrden = new Map();
  const diagnosticosPorOrden = new Map();
  const itemsPorOrden = new Map();
  const materialesPorOrden = new Map();
  const materialesPorItem = new Map();
  const usuariosPendientes = {};

  ctx.fotos.forEach((foto) => {
    const ordenId = Number(foto.ordenId || foto.orden_id || foto.ordenTrabajoId);
    if (!ordenId) return;
    if (!fotosPorOrden.has(ordenId)) fotosPorOrden.set(ordenId, []);
    fotosPorOrden.get(ordenId).push(foto);
  });

  ctx.diagnosticos.forEach((diagnostico) => {
    const ordenId = Number(
      diagnostico.ordenId || diagnostico.orden_id || diagnostico.ordenTrabajoId
    );
    if (!ordenId) return;
    if (!diagnosticosPorOrden.has(ordenId)) diagnosticosPorOrden.set(ordenId, []);
    diagnosticosPorOrden.get(ordenId).push(diagnostico);
  });

  ctx.items.forEach((item) => {
    const ordenId = Number(item.ordenId || item.orden_id);
    if (!ordenId) return;
    if (!itemsPorOrden.has(ordenId)) itemsPorOrden.set(ordenId, []);
    itemsPorOrden.get(ordenId).push(item);
  });

  ctx.materiales.forEach((material) => {
    const ordenId = Number(material.ordenId || material.orden_id);
    const itemId = Number(material.itemId || material.item_id || 0);
    if (ordenId) {
      if (!materialesPorOrden.has(ordenId)) materialesPorOrden.set(ordenId, []);
      materialesPorOrden.get(ordenId).push(material);
    }
    if (itemId) {
      if (!materialesPorItem.has(itemId)) materialesPorItem.set(itemId, []);
      materialesPorItem.get(itemId).push(material);
    }
  });

  const ordenesActivas = ctx.ordenes.filter(esOrdenActiva);
  const archivosActivos = ctx.archivos.filter(esArchivoActivo);
  const ordenesUrgentes = ordenesActivas.filter(esCreadoEnModoUrgente);
  const archivosUrgentes = archivosActivos.filter(esCreadoEnModoUrgente);

  const itemMaterialCumplido = (item, ordenId) => {
    const itemId = Number(item.id);
    const materialesItem = materialesPorItem.get(itemId) || [];
    const materialesOrden = (materialesPorOrden.get(Number(ordenId)) || []).filter(
      (material) => !Number(material.itemId || material.item_id || 0)
    );
    return [...materialesItem, ...materialesOrden].some(materialCumpleCumplimiento);
  };

  const material_pendiente = [];
  ctx.items.forEach((item) => {
    const ordenId = Number(item.ordenId || item.orden_id);
    const obligatorio =
      booleano(item.material_recuperado_obligatorio) ||
      booleano(item.requiere_material_recuperado);
    if (!ordenId || !obligatorio || upper(item.estado) === "ANULADO") return;

    if (!itemMaterialCumplido(item, ordenId)) {
      const pendiente = {
        ordenId,
        itemId: item.id,
        tipo_servicio: item.tipo_servicio || "Servicio no registrado",
        responsable: item.responsable || "Sin responsable",
        material_recuperado_obligatorio: Boolean(obligatorio),
        estado: item.estado || "PENDIENTE",
        motivo: "Debe registrar peso o motivo de excepcion",
      };
      material_pendiente.push(pendiente);

      const usuario = agregarPendienteUsuario(
        usuariosPendientes,
        item.responsable_id || item.responsable,
        "material_pendiente",
        1,
        item.responsable
      );
      usuario.detalles.push(`Material pendiente Orden #${ordenId}`);
    }
  });

  const ordenes_con_pendientes = ordenesActivas
    .map((orden) => {
      const ordenId = Number(orden.id);
      const pendientes = [];
      const itemsOrden = itemsPorOrden.get(ordenId) || [];
      const fotosOrden = fotosPorOrden.get(ordenId) || [];
      const diagnosticosOrden = diagnosticosPorOrden.get(ordenId) || [];
      const materialPendienteOrden = material_pendiente.filter(
        (item) => Number(item.ordenId) === ordenId
      );
      const emergencia = upper(orden.origen_recepcion) === "RECEPCION_EMERGENCIA_OPERADOR";
      const urgente = esCreadoEnModoUrgente(orden);
      const sinRegularizar = urgente && requiereRegularizacion(orden);
      const porAsignar = urgente && ordenPorAsignar(orden, itemsOrden);

      if (!fotosOrden.length) pendientes.push("SIN_FOTOS");
      if (!itemsOrden.length && !urgente) pendientes.push("SIN_ITEMS");
      if (!limpiarTexto(orden.feedback_por) && !limpiarTexto(orden.feedback_operario)) {
        pendientes.push("SIN_FEEDBACK");
      }
      if (materialPendienteOrden.length) pendientes.push("MATERIAL_PENDIENTE");
      if (upper(orden.estado) === "LISTO_PARA_ENTREGA" && upper(orden.estado_pago) !== "PAGADO") {
        pendientes.push("PAGO_PENDIENTE_LISTO_ENTREGA");
      }
      if (emergencia) pendientes.push("RECEPCION_EMERGENCIA");
      if (sinRegularizar) pendientes.push("URGENTE_SIN_REGULARIZAR");
      if (porAsignar) pendientes.push("POR_ASIGNAR");
      if (sinRegularizar && booleano(orden.regularizar_antes_de_entrega)) {
        pendientes.push("PENDIENTE_ANTES_DE_ENTREGA");
      }

      if (!pendientes.length) return null;

      const responsables = {
        diagnostico_asignado_a: orden.diagnostico_asignado_a || null,
        diagnostico_asignado_a_id: orden.diagnostico_asignado_a_id || null,
        operador_ecu_asignado_a: orden.operador_ecu_asignado_a || null,
        operador_ecu_asignado_a_id: orden.operador_ecu_asignado_a_id || null,
        mecanico_asignado_a: orden.mecanico_asignado_a || null,
        mecanico_asignado_a_id: orden.mecanico_asignado_a_id || null,
        supervisor_asignado_a: orden.supervisor_asignado_a || null,
        supervisor_asignado_a_id: orden.supervisor_asignado_a_id || null,
      };
      const usuariosOrden = [
        [orden.recepcionado_por_id || orden.recepcionado_por, orden.recepcionado_por],
        [
          orden.diagnostico_asignado_a_id || orden.diagnostico_asignado_a,
          orden.diagnostico_asignado_a,
        ],
        [
          orden.operador_ecu_asignado_a_id || orden.operador_ecu_asignado_a,
          orden.operador_ecu_asignado_a,
        ],
        [orden.mecanico_asignado_a_id || orden.mecanico_asignado_a, orden.mecanico_asignado_a],
        [
          orden.supervisor_asignado_a_id || orden.supervisor_asignado_a,
          orden.supervisor_asignado_a,
        ],
      ].filter(([clave]) => Boolean(clave));

      if (!usuariosOrden.length) usuariosOrden.push("Sin responsable");

      usuariosOrden.forEach((itemUsuario) => {
        const [username, etiqueta] = Array.isArray(itemUsuario)
          ? itemUsuario
          : [itemUsuario, itemUsuario];
        const usuario = agregarPendienteUsuario(
          usuariosPendientes,
          username,
          "ordenes_pendientes",
          1,
          etiqueta
        );
        usuario.detalles.push(`Orden #${ordenId}: ${pendientes.join(", ")}`);
      });

      if (emergencia) {
        const usuario = agregarPendienteUsuario(
          usuariosPendientes,
          orden.recepcionado_por_id || orden.recepcionado_por,
          "recepciones_emergencia",
          1,
          orden.recepcionado_por
        );
        usuario.detalles.push(`Recepcion emergencia Orden #${ordenId}`);
      }

      if (pendientes.includes("PAGO_PENDIENTE_LISTO_ENTREGA")) {
        const usuario = agregarPendienteUsuario(
          usuariosPendientes,
          orden.recepcionado_por_id || orden.recepcionado_por || "RECEPCION",
          "cobros_pendientes_asociados",
          1,
          orden.recepcionado_por || "RECEPCION"
        );
        usuario.detalles.push(`Pago pendiente Orden #${ordenId}`);
      }

      return {
        ordenId,
        estado: orden.estado || "SIN_ESTADO",
        estado_pago: orden.estado_pago || "PENDIENTE",
        cliente: orden._cliente?.nombre || "Cliente no registrado",
        vehiculo: orden._vehiculo?.patente
          ? `${orden._vehiculo.patente} ${orden._vehiculo.marca || ""} ${orden._vehiculo.modelo || ""}`.trim()
          : "Vehiculo no registrado",
        recepcionado_por: orden.recepcionado_por || null,
        recepcionado_por_id: orden.recepcionado_por_id || null,
        responsables,
        diagnosticos_count: diagnosticosOrden.length,
        creado_en_modo_urgente: urgente,
        requiere_regularizacion: sinRegularizar,
        regularizacion_pendientes: pendientesRegularizacion(orden),
        por_asignar: porAsignar,
        pendientes,
      };
    })
    .filter(Boolean);

  const file_service_pendiente = archivosActivos
    .map((archivo) => {
      const pendientes = [];
      const estadoArchivo = upper(archivo.estado);
      const postOk = postEscrituraCumplida(archivo);
      const activoMas24h = horasDesde(archivo.updatedAt || archivo.createdAt, ahora) > 24;
      const urgente = esCreadoEnModoUrgente(archivo);
      const sinRegularizar = urgente && requiereRegularizacion(archivo);
      const porAsignar = urgente && archivoPorAsignar(archivo);

      if (
        !postOk &&
        (["MODIFICADO_LISTO", "NOTIFICADO_SLAVE", "POST_ESCRITURA_PENDIENTE"].includes(
          estadoArchivo
        ) ||
          Boolean(archivo.archivo_modificado))
      ) {
        pendientes.push("SIN_POST_ESCRITURA_OK");
      }
      if (booleano(archivo.correccion_pendiente) || estadoArchivo === "REQUIERE_CORRECCION") {
        pendientes.push("CORRECCION_PENDIENTE");
      }
      if (activoMas24h) pendientes.push("ACTIVO_MAS_24H");
      if (sinRegularizar) pendientes.push("URGENTE_SIN_REGULARIZAR");
      if (porAsignar) pendientes.push("POR_ASIGNAR");
      if (sinRegularizar && booleano(archivo.regularizar_antes_de_entrega)) {
        pendientes.push("PENDIENTE_ANTES_DE_ENTREGA");
      }

      if (!pendientes.length) return null;

      const responsable =
        limpiarTexto(
          archivo.operador_ecu_asignado_a_id ||
            archivo.tuner_asignado_a_id ||
            archivo.slave_asignado_a_id ||
            archivo.operador_ecu_asignado_a ||
            archivo.tuner_asignado_a ||
            archivo.slave_asignado_a ||
            archivo.proceso_guard_responsable_id
        ) || "Sin responsable";

      const usuario = agregarPendienteUsuario(
        usuariosPendientes,
        responsable,
        "file_service_pendientes"
      );
      usuario.detalles.push(`File #${archivo.id}: ${pendientes.join(", ")}`);

      return {
        archivoECUId: archivo.id,
        ordenId: archivo.ordenId,
        estado: archivo.estado || "SIN_ESTADO",
        tipo_servicio: archivo.tipo_servicio || "No registrado",
        responsable_principal: responsable,
        creado_en_modo_urgente: urgente,
        requiere_regularizacion: sinRegularizar,
        regularizacion_pendientes: pendientesRegularizacion(archivo),
        por_asignar: porAsignar,
        pendientes,
      };
    })
    .filter(Boolean);

  const resumen = {
    total_ordenes_activas: ordenesActivas.length,
    ordenes_sin_fotos: ordenes_con_pendientes.filter((orden) =>
      orden.pendientes.includes("SIN_FOTOS")
    ).length,
    ordenes_sin_items: ordenes_con_pendientes.filter((orden) =>
      orden.pendientes.includes("SIN_ITEMS")
    ).length,
    ordenes_sin_feedback: ordenes_con_pendientes.filter((orden) =>
      orden.pendientes.includes("SIN_FEEDBACK")
    ).length,
    ordenes_emergencia_operador: ordenes_con_pendientes.filter((orden) =>
      orden.pendientes.includes("RECEPCION_EMERGENCIA")
    ).length,
    items_material_pendiente: material_pendiente.length,
    file_service_sin_post_escritura: file_service_pendiente.filter((archivo) =>
      archivo.pendientes.includes("SIN_POST_ESCRITURA_OK")
    ).length,
    file_service_correccion_pendiente: file_service_pendiente.filter((archivo) =>
      archivo.pendientes.includes("CORRECCION_PENDIENTE")
    ).length,
    ordenes_listas_pago_pendiente: ordenes_con_pendientes.filter((orden) =>
      orden.pendientes.includes("PAGO_PENDIENTE_LISTO_ENTREGA")
    ).length,
    urgentes_sin_regularizar:
      ordenesUrgentes.filter(requiereRegularizacion).length +
      archivosUrgentes.filter(requiereRegularizacion).length,
    ordenes_creadas_rapidas: ordenesUrgentes.length,
    file_service_urgente: archivosUrgentes.length,
    pendientes_antes_de_entrega:
      ordenesUrgentes.filter(
        (orden) =>
          requiereRegularizacion(orden) &&
          booleano(orden.regularizar_antes_de_entrega)
      ).length +
      archivosUrgentes.filter(
        (archivo) =>
          requiereRegularizacion(archivo) &&
          booleano(archivo.regularizar_antes_de_entrega)
      ).length,
    por_asignar:
      ordenesUrgentes.filter((orden) =>
        ordenPorAsignar(orden, itemsPorOrden.get(Number(orden.id)) || [])
      ).length +
      archivosUrgentes.filter(archivoPorAsignar).length,
  };

  const alertas = [];
  if (resumen.ordenes_listas_pago_pendiente > 0) {
    alertas.push({
      tipo: "CRITICO",
      titulo: "Ordenes listas con pago pendiente",
      mensaje: `${resumen.ordenes_listas_pago_pendiente} orden(es) listas para entrega siguen sin pago confirmado.`,
    });
  }
  if (resumen.items_material_pendiente > 0) {
    alertas.push({
      tipo: "ATENCION",
      titulo: "Material recuperado pendiente",
      mensaje: `${resumen.items_material_pendiente} item(s) deben registrar peso o excepcion.`,
    });
  }
  if (resumen.file_service_sin_post_escritura > 0) {
    alertas.push({
      tipo: "ATENCION",
      titulo: "File Service sin post escritura",
      mensaje: `${resumen.file_service_sin_post_escritura} archivo(s) requieren post escritura OK.`,
    });
  }
  if (resumen.file_service_correccion_pendiente > 0) {
    alertas.push({
      tipo: "CRITICO",
      titulo: "Correcciones File Service pendientes",
      mensaje: `${resumen.file_service_correccion_pendiente} archivo(s) requieren correccion.`,
    });
  }
  if (resumen.ordenes_emergencia_operador > 0) {
    alertas.push({
      tipo: "INFO",
      titulo: "Recepciones de emergencia",
      mensaje: `${resumen.ordenes_emergencia_operador} recepcion(es) fueron creadas por operador.`,
    });
  }
  if (resumen.urgentes_sin_regularizar > 0) {
    alertas.push({
      tipo: "ATENCION",
      titulo: "Urgentes sin regularizar",
      mensaje: `${resumen.urgentes_sin_regularizar} trabajo(s) urgente(s) deben completar datos antes del cierre o entrega.`,
    });
  }
  if (resumen.por_asignar > 0) {
    alertas.push({
      tipo: "ATENCION",
      titulo: "Trabajos urgentes por asignar",
      mensaje: `${resumen.por_asignar} trabajo(s) urgente(s) aun no tienen encargado.`,
    });
  }

  const urgentes_sin_regularizar = [
    ...ordenes_con_pendientes
      .filter((orden) => orden.pendientes.includes("URGENTE_SIN_REGULARIZAR"))
      .map((orden) => ({ tipo: "ORDEN", ...orden })),
    ...file_service_pendiente
      .filter((archivo) => archivo.pendientes.includes("URGENTE_SIN_REGULARIZAR"))
      .map((archivo) => ({ tipo: "FILE_SERVICE", ...archivo })),
  ];
  const por_asignar = [
    ...ordenes_con_pendientes
      .filter((orden) => orden.pendientes.includes("POR_ASIGNAR"))
      .map((orden) => ({ tipo: "ORDEN", ...orden })),
    ...file_service_pendiente
      .filter((archivo) => archivo.pendientes.includes("POR_ASIGNAR"))
      .map((archivo) => ({ tipo: "FILE_SERVICE", ...archivo })),
  ];

  return {
    generado_at: new Date().toISOString(),
    resumen,
    ordenes_con_pendientes: ordenes_con_pendientes.slice(0, 100),
    file_service_pendiente: file_service_pendiente.slice(0, 100),
    material_pendiente: material_pendiente.slice(0, 100),
    urgentes_sin_regularizar: urgentes_sin_regularizar.slice(0, 100),
    por_asignar: por_asignar.slice(0, 100),
    usuarios: Object.values(usuariosPendientes)
      .map((usuario) => ({
        ...usuario,
        detalles: usuario.detalles.slice(0, 6),
      }))
      .sort(
        (a, b) =>
          b.ordenes_pendientes +
          b.file_service_pendientes +
          b.material_pendiente -
          (a.ordenes_pendientes + a.file_service_pendientes + a.material_pendiente)
      ),
    alertas: alertas.slice(0, 20),
  };
};

const normalizarClaveUsuario = (valor) => limpiarTexto(valor).toLowerCase();

const crearIdentidadUsuario = (req) => {
  const usuario = req.usuario || req.user || {};
  const id = limpiarTexto(usuario.id);
  const username = limpiarTexto(usuario.username);
  const nombre = limpiarTexto(usuario.nombre);
  const rol = upper(usuario.rol);
  const claves = new Set(
    [id, username, nombre]
      .map(normalizarClaveUsuario)
      .filter(Boolean)
  );

  return {
    id,
    username,
    nombre,
    rol,
    claves,
  };
};

const coincideIdentidad = (identidad, ...valores) =>
  valores.some((valor) => {
    const clave = normalizarClaveUsuario(valor);
    return Boolean(clave && identidad.claves.has(clave));
  });

const datosOrdenOperativa = (orden) => {
  const vehiculo = orden?._vehiculo || {};
  const cliente = orden?._cliente || {};
  const partesVehiculo = [vehiculo.marca, vehiculo.modelo, vehiculo.anio || vehiculo.year]
    .map(limpiarTexto)
    .filter(Boolean);

  return {
    cliente: cliente.nombre || "Cliente no registrado",
    vehiculo: partesVehiculo.join(" ") || "Vehiculo no registrado",
    patente: vehiculo.patente || "",
  };
};

const prioridadPendiente = (pendiente) => {
  const severidadPeso = {
    CRITICO: 4,
    ATENCION: 3,
    SEGUIMIENTO: 2,
    INFO: 1,
  };
  const prioridadPeso = {
    URGENTE: 4,
    ALTA: 3,
    MEDIA: 2,
    BAJA: 1,
  };

  return (
    (severidadPeso[upper(pendiente.severidad)] || 0) * 10 +
    (prioridadPeso[upper(pendiente.prioridad)] || 0)
  );
};

const crearMisPendientesData = (ctx, req) => {
  const identidad = crearIdentidadUsuario(req);
  const rol = identidad.rol;
  const esJefatura = ["OWNER", "ADMIN", "SUPERVISOR"].includes(rol);
  const fotosPorOrden = new Map();
  const itemsPorOrden = new Map();
  const materialesPorOrden = new Map();
  const materialesPorItem = new Map();
  const pendientesMap = new Map();
  const resumen = {
    total: 0,
    ordenes_asignadas: 0,
    ordenes_sin_feedback: 0,
    post_escritura_pendiente: 0,
    correcciones_pendientes: 0,
    material_recuperado_pendiente: 0,
    servicios_sin_cerrar: 0,
    recepciones_emergencia_sin_fotos: 0,
    listas_para_entrega: 0,
    urgentes_sin_regularizar: 0,
    ordenes_creadas_rapidas: 0,
    file_service_urgente: 0,
    pendientes_antes_de_entrega: 0,
    por_asignar: 0,
  };

  ctx.fotos.forEach((foto) => {
    const ordenId = Number(foto.ordenId || foto.orden_id || foto.ordenTrabajoId);
    if (!ordenId) return;
    if (!fotosPorOrden.has(ordenId)) fotosPorOrden.set(ordenId, []);
    fotosPorOrden.get(ordenId).push(foto);
  });

  ctx.items.forEach((item) => {
    const ordenId = Number(item.ordenId || item.orden_id);
    if (!ordenId) return;
    if (!itemsPorOrden.has(ordenId)) itemsPorOrden.set(ordenId, []);
    itemsPorOrden.get(ordenId).push(item);
  });

  ctx.materiales.forEach((material) => {
    const ordenId = Number(material.ordenId || material.orden_id);
    const itemId = Number(material.itemId || material.item_id || 0);
    if (ordenId) {
      if (!materialesPorOrden.has(ordenId)) materialesPorOrden.set(ordenId, []);
      materialesPorOrden.get(ordenId).push(material);
    }
    if (itemId) {
      if (!materialesPorItem.has(itemId)) materialesPorItem.set(itemId, []);
      materialesPorItem.get(itemId).push(material);
    }
  });

  const itemMaterialCumplido = (item, ordenId) => {
    const itemId = Number(item.id);
    const materialesItem = materialesPorItem.get(itemId) || [];
    const materialesOrden = (materialesPorOrden.get(Number(ordenId)) || []).filter(
      (material) => !Number(material.itemId || material.item_id || 0)
    );
    return [...materialesItem, ...materialesOrden].some(materialCumpleCumplimiento);
  };

  const agregarPendiente = (pendiente) => {
    const key = [
      pendiente.tipo,
      pendiente.ordenId || "",
      pendiente.archivoECUId || "",
      pendiente.itemId || "",
    ].join(":");

    if (pendientesMap.has(key)) return;
    pendientesMap.set(key, {
      tipo: pendiente.tipo,
      severidad: pendiente.severidad || "INFO",
      titulo: pendiente.titulo,
      descripcion: pendiente.descripcion,
      ordenId: pendiente.ordenId || null,
      archivoECUId: pendiente.archivoECUId || null,
      itemId: pendiente.itemId || null,
      estado: pendiente.estado || "",
      prioridad: pendiente.prioridad || "",
      cliente: pendiente.cliente || "Cliente no registrado",
      vehiculo: pendiente.vehiculo || "Vehiculo no registrado",
      patente: pendiente.patente || "",
      accion_url: pendiente.accion_url || "/",
    });

    if (Object.prototype.hasOwnProperty.call(resumen, pendiente.contador)) {
      resumen[pendiente.contador] += 1;
    }
  };

  const ordenesActivas = ctx.ordenes.filter(esOrdenActiva);

  ordenesActivas.forEach((orden) => {
    const ordenId = Number(orden.id);
    const estado = upper(orden.estado);
    const datos = datosOrdenOperativa(orden);
    const fotosOrden = fotosPorOrden.get(ordenId) || [];
    const emergencia = upper(orden.origen_recepcion) === "RECEPCION_EMERGENCIA_OPERADOR";
    const asignadaAlUsuario = coincideIdentidad(
      identidad,
      orden.recepcionado_por_id,
      orden.recepcionado_por,
      orden.diagnostico_asignado_a_id,
      orden.diagnostico_asignado_a,
      orden.operador_ecu_asignado_a_id,
      orden.operador_ecu_asignado_a,
      orden.mecanico_asignado_a_id,
      orden.mecanico_asignado_a,
      orden.supervisor_asignado_a_id,
      orden.supervisor_asignado_a
    );
    const esColaRecepcion = rol === "RECEPCION" && estado === "LISTO_PARA_ENTREGA";
    const esColaScanner =
      rol === "OPERADOR_SCANNER" &&
      (coincideIdentidad(
        identidad,
        orden.diagnostico_asignado_a_id,
        orden.diagnostico_asignado_a
      ) ||
        ["PARA_DIAGNOSTICO", "RECEPCIONADO"].includes(estado));
    const urgente = esCreadoEnModoUrgente(orden);
    const sinRegularizar = urgente && requiereRegularizacion(orden);
    const porAsignar =
      urgente && ordenPorAsignar(orden, itemsPorOrden.get(ordenId) || []);
    const visibleRegularizacion =
      asignadaAlUsuario || esColaScanner || esJefatura || rol === "RECEPCION";

    if (sinRegularizar && visibleRegularizacion) {
      agregarPendiente({
        tipo: "URGENTE_SIN_REGULARIZAR",
        severidad: "ATENCION",
        titulo: "Trabajo urgente sin regularizar",
        descripcion:
          pendientesRegularizacion(orden).join(", ") ||
          "Completa los datos pendientes antes de entregar.",
        ordenId,
        estado: orden.estado || "SIN_ESTADO",
        prioridad: "URGENTE",
        ...datos,
        accion_url: `/ordenes?ordenId=${ordenId}`,
        contador: "urgentes_sin_regularizar",
      });
    }

    if (porAsignar && (esJefatura || rol === "RECEPCION")) {
      agregarPendiente({
        tipo: "URGENTE_POR_ASIGNAR",
        severidad: "ATENCION",
        titulo: "Trabajo urgente por asignar",
        descripcion: "El trabajo fue creado rapido y aun necesita encargado.",
        ordenId,
        estado: orden.estado || "SIN_ESTADO",
        prioridad: "URGENTE",
        ...datos,
        accion_url: `/ordenes?ordenId=${ordenId}`,
        contador: "por_asignar",
      });
    }

    if (asignadaAlUsuario || esColaScanner) {
      agregarPendiente({
        tipo: estado === "PARA_DIAGNOSTICO" ? "DIAGNOSTICO_PENDIENTE" : "ORDEN_ASIGNADA",
        severidad: ["URGENTE", "ALTA"].includes(upper(orden.prioridad))
          ? "ATENCION"
          : "SEGUIMIENTO",
        titulo: estado === "PARA_DIAGNOSTICO" ? "Diagnostico pendiente" : "Orden asignada",
        descripcion: "Orden asociada a tu usuario requiere seguimiento operativo.",
        ordenId,
        estado: orden.estado || "SIN_ESTADO",
        prioridad: orden.prioridad || "",
        ...datos,
        accion_url: `/ordenes?ordenId=${ordenId}`,
        contador: "ordenes_asignadas",
      });
    }

    if (
      (asignadaAlUsuario || esColaScanner) &&
      !limpiarTexto(orden.feedback_por) &&
      !limpiarTexto(orden.feedback_operario)
    ) {
      agregarPendiente({
        tipo: "SIN_FEEDBACK",
        severidad: "SEGUIMIENTO",
        titulo: "Feedback operativo pendiente",
        descripcion: "La orden asociada no tiene feedback operativo registrado.",
        ordenId,
        estado: orden.estado || "SIN_ESTADO",
        prioridad: orden.prioridad || "",
        ...datos,
        accion_url: `/ordenes?ordenId=${ordenId}#feedback`,
        contador: "ordenes_sin_feedback",
      });
    }

    if (
      (coincideIdentidad(identidad, orden.recepcionado_por_id, orden.recepcionado_por) ||
        rol === "RECEPCION") &&
      emergencia &&
      fotosOrden.length === 0
    ) {
      agregarPendiente({
        tipo: "RECEPCION_EMERGENCIA_SIN_FOTOS",
        severidad: "ATENCION",
        titulo: "Recepcion de emergencia sin fotos",
        descripcion: "Completa evidencia fotografica de la recepcion de emergencia.",
        ordenId,
        estado: orden.estado || "SIN_ESTADO",
        prioridad: orden.prioridad || "",
        ...datos,
        accion_url: `/fotos?ordenId=${ordenId}`,
        contador: "recepciones_emergencia_sin_fotos",
      });
    }

    if (esColaRecepcion && upper(orden.estado_pago) !== "PAGADO") {
      agregarPendiente({
        tipo: "LISTO_PARA_ENTREGA",
        severidad: "ATENCION",
        titulo: "Lista para entrega con pago pendiente",
        descripcion: "Orden lista para entrega requiere cierre comercial antes de entregar.",
        ordenId,
        estado: orden.estado || "SIN_ESTADO",
        prioridad: orden.prioridad || "",
        ...datos,
        accion_url: `/ordenes?ordenId=${ordenId}#entrega`,
        contador: "listas_para_entrega",
      });
    }
  });

  ctx.items.forEach((item) => {
    const ordenId = Number(item.ordenId || item.orden_id);
    if (!ordenId) return;
    const orden = ctx.ordenes.find((actual) => Number(actual.id) === ordenId) || {};
    if (!esOrdenActiva(orden)) return;
    const datos = datosOrdenOperativa(orden);
    const asignadoItem = coincideIdentidad(identidad, item.responsable_id, item.responsable);
    const asignadoMecanico =
      rol === "MECANICO" &&
      coincideIdentidad(identidad, orden.mecanico_asignado_a_id, orden.mecanico_asignado_a);
    const estadoItem = upper(item.estado || "PENDIENTE");
    const cerrado = ["CERRADO", "COMPLETADO", "FINALIZADO", "ANULADO"].includes(estadoItem);
    const requiereMaterial =
      booleano(item.material_recuperado_obligatorio) ||
      booleano(item.requiere_material_recuperado);

    if ((asignadoItem || asignadoMecanico) && !cerrado) {
      agregarPendiente({
        tipo: "SERVICIO_SIN_CERRAR",
        severidad: "SEGUIMIENTO",
        titulo: "Servicio sin cerrar",
        descripcion: item.tipo_servicio
          ? `Item pendiente: ${item.tipo_servicio}.`
          : "Item de servicio pendiente de cierre operativo.",
        ordenId,
        itemId: item.id || null,
        estado: item.estado || "PENDIENTE",
        prioridad: orden.prioridad || "",
        ...datos,
        accion_url: `/ordenes?ordenId=${ordenId}#items`,
        contador: "servicios_sin_cerrar",
      });
    }

    if ((asignadoItem || asignadoMecanico) && requiereMaterial && !itemMaterialCumplido(item, ordenId)) {
      agregarPendiente({
        tipo: "MATERIAL_PENDIENTE",
        severidad: "ATENCION",
        titulo: "Material recuperado pendiente",
        descripcion: "Registra peso recuperado o motivo de excepcion del item.",
        ordenId,
        itemId: item.id || null,
        estado: item.estado || "PENDIENTE",
        prioridad: orden.prioridad || "",
        ...datos,
        accion_url: `/ordenes?ordenId=${ordenId}#material`,
        contador: "material_recuperado_pendiente",
      });
    }
  });

  ctx.archivos.filter(esArchivoActivo).forEach((archivo) => {
    const estadoArchivo = upper(archivo.estado);
    const orden = archivo._orden || {};
    const datos = datosOrdenOperativa(orden);
    const asignadoArchivo = coincideIdentidad(
      identidad,
      archivo.tuner_asignado_a_id,
      archivo.tuner_asignado_a,
      archivo.operador_ecu_asignado_a_id,
      archivo.operador_ecu_asignado_a,
      archivo.slave_asignado_a_id,
      archivo.slave_asignado_a,
      archivo.proceso_guard_responsable_id
    );
    const colaOperador =
      rol === "OPERADOR_ECU" &&
      (asignadoArchivo ||
        ["MODIFICADO_LISTO", "NOTIFICADO_SLAVE", "POST_ESCRITURA_PENDIENTE"].includes(
          estadoArchivo
        ));
    const colaTuner =
      rol === "TUNER" &&
      (asignadoArchivo ||
        ["REQUIERE_CORRECCION", "CORRECCION_SOLICITADA", "EN_REVISION"].includes(
          estadoArchivo
        ));
    const urgente = esCreadoEnModoUrgente(archivo);
    const sinRegularizar = urgente && requiereRegularizacion(archivo);
    const porAsignar = urgente && archivoPorAsignar(archivo);
    const visibleRegularizacion =
      asignadoArchivo || colaOperador || colaTuner || esJefatura;

    if (sinRegularizar && visibleRegularizacion) {
      agregarPendiente({
        tipo: "FILE_SERVICE_URGENTE_SIN_REGULARIZAR",
        severidad: "ATENCION",
        titulo: "File Service urgente sin regularizar",
        descripcion:
          pendientesRegularizacion(archivo).join(", ") ||
          "Completa diagnóstico y encargado antes del cierre técnico.",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        estado: archivo.estado || "SIN_ESTADO",
        prioridad: "URGENTE",
        ...datos,
        accion_url: `/archivos-ecu?archivoId=${archivo.id}`,
        contador: "urgentes_sin_regularizar",
      });
    }

    if (porAsignar && (esJefatura || ["OPERADOR_ECU", "TUNER"].includes(rol))) {
      agregarPendiente({
        tipo: "FILE_SERVICE_URGENTE_POR_ASIGNAR",
        severidad: "ATENCION",
        titulo: "File Service urgente por asignar",
        descripcion: "El original está guardado, pero falta asignar encargado.",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        estado: archivo.estado || "SIN_ESTADO",
        prioridad: "URGENTE",
        ...datos,
        accion_url: `/archivos-ecu?archivoId=${archivo.id}`,
        contador: "por_asignar",
      });
    }

    if (asignadoArchivo || colaOperador || colaTuner) {
      agregarPendiente({
        tipo: "FILE_SERVICE_PENDIENTE",
        severidad: estadoArchivo === "REQUIERE_CORRECCION" ? "CRITICO" : "SEGUIMIENTO",
        titulo: "File Service pendiente",
        descripcion: "Archivo ECU asociado a tu usuario requiere seguimiento.",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        estado: archivo.estado || "SIN_ESTADO",
        prioridad: archivo.prioridad || orden.prioridad || "",
        ...datos,
        accion_url: `/archivos-ecu?archivoId=${archivo.id}`,
        contador: "ordenes_asignadas",
      });
    }

    if (
      (asignadoArchivo || colaOperador) &&
      !postEscrituraCumplida(archivo) &&
      (["MODIFICADO_LISTO", "NOTIFICADO_SLAVE", "POST_ESCRITURA_PENDIENTE"].includes(
        estadoArchivo
      ) ||
        Boolean(archivo.archivo_modificado))
    ) {
      agregarPendiente({
        tipo: "POST_ESCRITURA_PENDIENTE",
        severidad: "ATENCION",
        titulo: "Post escritura pendiente",
        descripcion: "Archivo/orden requiere post escritura o validacion.",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        estado: archivo.estado || "SIN_ESTADO",
        prioridad: archivo.prioridad || orden.prioridad || "",
        ...datos,
        accion_url: `/archivos-ecu?archivoId=${archivo.id}#post-escritura`,
        contador: "post_escritura_pendiente",
      });
    }

    if (
      (asignadoArchivo || colaTuner || colaOperador) &&
      (booleano(archivo.correccion_pendiente) || estadoArchivo === "REQUIERE_CORRECCION")
    ) {
      agregarPendiente({
        tipo: "CORRECCION_PENDIENTE",
        severidad: "CRITICO",
        titulo: "Correccion pendiente",
        descripcion: "File Service requiere revision o correccion tecnica.",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        estado: archivo.estado || "SIN_ESTADO",
        prioridad: archivo.prioridad || orden.prioridad || "",
        ...datos,
        accion_url: `/archivos-ecu?archivoId=${archivo.id}#correccion`,
        contador: "correcciones_pendientes",
      });
    }
  });

  const pendientesCompletos = [...pendientesMap.values()].sort(
    (a, b) => prioridadPendiente(b) - prioridadPendiente(a)
  );
  const pendientes = pendientesCompletos.slice(0, 50);
  resumen.total = pendientesCompletos.length;
  const ordenesUrgentes = ctx.ordenes.filter(
    (orden) => esOrdenActiva(orden) && esCreadoEnModoUrgente(orden)
  );
  const archivosUrgentes = ctx.archivos.filter(
    (archivo) => esArchivoActivo(archivo) && esCreadoEnModoUrgente(archivo)
  );
  const ordenesUrgentesSinRegularizar = ordenesUrgentes.filter(
    requiereRegularizacion
  );
  const archivosUrgentesSinRegularizar = archivosUrgentes.filter(
    requiereRegularizacion
  );

  resumen.urgentes_sin_regularizar =
    ordenesUrgentesSinRegularizar.length +
    archivosUrgentesSinRegularizar.length;
  resumen.ordenes_creadas_rapidas = ordenesUrgentes.length;
  resumen.file_service_urgente = archivosUrgentes.length;
  resumen.pendientes_antes_de_entrega =
    ordenesUrgentesSinRegularizar.filter((orden) =>
      booleano(orden.regularizar_antes_de_entrega)
    ).length +
    archivosUrgentesSinRegularizar.filter((archivo) =>
      booleano(archivo.regularizar_antes_de_entrega)
    ).length;
  resumen.por_asignar =
    ordenesUrgentes.filter((orden) =>
      ordenPorAsignar(orden, itemsPorOrden.get(Number(orden.id)) || [])
    ).length + archivosUrgentes.filter(archivoPorAsignar).length;

  return {
    generado_at: new Date().toISOString(),
    usuario: {
      username: identidad.username,
      nombre: identidad.nombre,
      rol,
    },
    resumen,
    pendientes,
    mensaje_critico: pendientes.some((pendiente) => upper(pendiente.severidad) === "CRITICO")
      ? "Debes resolver esto antes de recibir nuevos trabajos."
      : null,
    solo_lectura: true,
    enfoque: "mis_pendientes_v1",
  };
};

const normalizarEstado = (estado) => upper(estado || "SIN_ESTADO");

const redondearHoras = (valor) => Number(Math.max(0, valor || 0).toFixed(1));

const crearEventosPorOrden = (eventos = []) => {
  const mapa = new Map();

  eventos.forEach((evento) => {
    const ordenId = Number(evento.ordenId || evento.orden_id);
    if (!ordenId) return;
    if (!mapa.has(ordenId)) mapa.set(ordenId, []);
    mapa.get(ordenId).push(evento);
  });

  mapa.forEach((items) => {
    items.sort((a, b) => {
      const fechaA = fechaValida(a.createdAt)?.getTime() || 0;
      const fechaB = fechaValida(b.createdAt)?.getTime() || 0;
      return fechaA - fechaB;
    });
  });

  return mapa;
};

const obtenerUltimoEventoOrden = (eventosPorOrden, ordenId) => {
  const eventos = eventosPorOrden.get(Number(ordenId)) || [];
  return eventos[eventos.length - 1] || null;
};

const obtenerUltimoCambioEstado = (eventosPorOrden, ordenId, estadoNuevo = "") => {
  const estadoObjetivo = normalizarEstado(estadoNuevo);
  const eventos = (eventosPorOrden.get(Number(ordenId)) || []).filter((evento) => {
    if (upper(evento.tipo_evento) !== "ESTADO_CAMBIADO") return false;
    return !estadoNuevo || normalizarEstado(evento.estado_nuevo) === estadoObjetivo;
  });

  return eventos[eventos.length - 1] || null;
};

const obtenerFechaEstadoActual = (orden, eventosPorOrden) => {
  const ordenId = Number(orden.id);
  const estado = normalizarEstado(orden.estado);
  const cambioActual = obtenerUltimoCambioEstado(eventosPorOrden, ordenId, estado);
  if (cambioActual?.createdAt) return cambioActual.createdAt;

  const ultimoCambio = obtenerUltimoCambioEstado(eventosPorOrden, ordenId);
  if (ultimoCambio?.createdAt) return ultimoCambio.createdAt;

  const eventos = eventosPorOrden.get(ordenId) || [];
  const eventoCreacion = eventos.find((evento) => upper(evento.tipo_evento) === "ORDEN_CREADA");
  if (eventoCreacion?.createdAt) return eventoCreacion.createdAt;

  return orden.updatedAt || orden.createdAt;
};

const obtenerDatosOrdenSLA = (orden) => {
  const vehiculo = orden?._vehiculo || {};
  const cliente = orden?._cliente || {};
  const vehiculoTexto = [vehiculo.marca, vehiculo.modelo, vehiculo.anio || vehiculo.year]
    .map(limpiarTexto)
    .filter(Boolean)
    .join(" ");

  return {
    cliente: cliente.nombre || "Cliente no registrado",
    vehiculo: vehiculoTexto || "Vehiculo no registrado",
    patente: vehiculo.patente || "",
  };
};

const responsableOrdenSLA = (orden) =>
  limpiarTexto(
    orden.operador_ecu_asignado_a ||
      orden.diagnostico_asignado_a ||
      orden.mecanico_asignado_a ||
      orden.supervisor_asignado_a ||
      orden.recepcionado_por
  ) || "Sin responsable";

const responsableArchivoSLA = (archivo) =>
  limpiarTexto(
    archivo.operador_ecu_asignado_a_id ||
      archivo.tuner_asignado_a_id ||
      archivo.slave_asignado_a_id ||
      archivo.operador_ecu_asignado_a ||
      archivo.tuner_asignado_a ||
      archivo.slave_asignado_a ||
      archivo.post_escritura_por_id ||
      archivo.post_escritura_por ||
      archivo.cierre_tecnico_por_id ||
      archivo.cierre_tecnico_por ||
      archivo.proceso_guard_responsable_id
  ) || "Sin responsable";

const crearTiemposOperativosData = (ctx) => {
  const ahora = new Date();
  const eventosPorOrden = crearEventosPorOrden(ctx.eventosOrden || []);
  const fotosPorOrden = new Map();
  const diagnosticosPorOrden = new Map();
  const itemsPorOrden = new Map();
  const materialesPorOrden = new Map();
  const materialesPorItem = new Map();
  const alertasMap = new Map();
  const ordenesSet = new Set();
  const archivosSet = new Set();

  const resumen = {
    ordenes_atrasadas: 0,
    recepcion_sin_diagnostico: 0,
    programacion_atrasada: 0,
    listas_sin_entrega: 0,
    file_service_atrasado: 0,
    post_escritura_atrasada: 0,
    correccion_atrasada: 0,
    material_pendiente_atrasado: 0,
    recepcion_emergencia_atrasada: 0,
    feedback_pendiente_atrasado: 0,
  };

  ctx.fotos.forEach((foto) => {
    const ordenId = Number(foto.ordenId || foto.orden_id || foto.ordenTrabajoId);
    if (!ordenId) return;
    if (!fotosPorOrden.has(ordenId)) fotosPorOrden.set(ordenId, []);
    fotosPorOrden.get(ordenId).push(foto);
  });

  ctx.diagnosticos.forEach((diagnostico) => {
    const ordenId = Number(
      diagnostico.ordenId || diagnostico.orden_id || diagnostico.ordenTrabajoId
    );
    if (!ordenId) return;
    if (!diagnosticosPorOrden.has(ordenId)) diagnosticosPorOrden.set(ordenId, []);
    diagnosticosPorOrden.get(ordenId).push(diagnostico);
  });

  ctx.items.forEach((item) => {
    const ordenId = Number(item.ordenId || item.orden_id);
    if (!ordenId) return;
    if (!itemsPorOrden.has(ordenId)) itemsPorOrden.set(ordenId, []);
    itemsPorOrden.get(ordenId).push(item);
  });

  ctx.materiales.forEach((material) => {
    const ordenId = Number(material.ordenId || material.orden_id);
    const itemId = Number(material.itemId || material.item_id || 0);
    if (ordenId) {
      if (!materialesPorOrden.has(ordenId)) materialesPorOrden.set(ordenId, []);
      materialesPorOrden.get(ordenId).push(material);
    }
    if (itemId) {
      if (!materialesPorItem.has(itemId)) materialesPorItem.set(itemId, []);
      materialesPorItem.get(itemId).push(material);
    }
  });

  const itemMaterialCumplido = (item, ordenId) => {
    const itemId = Number(item.id);
    const materialesItem = materialesPorItem.get(itemId) || [];
    const materialesOrden = (materialesPorOrden.get(Number(ordenId)) || []).filter(
      (material) => !Number(material.itemId || material.item_id || 0)
    );
    return [...materialesItem, ...materialesOrden].some(materialCumpleCumplimiento);
  };

  const agregarAlertaTiempo = ({
    tipo,
    severidad,
    titulo,
    descripcion,
    ordenId = null,
    archivoECUId = null,
    itemId = null,
    usuario_responsable,
    estado,
    horas_sin_movimiento,
    accion_url,
    contador,
    extra = {},
  }) => {
    const key = [tipo, ordenId || "", archivoECUId || "", itemId || ""].join(":");
    if (alertasMap.has(key)) return;

    const alertaTiempo = {
      tipo,
      severidad,
      titulo,
      descripcion,
      ordenId,
      archivoECUId,
      itemId,
      usuario_responsable: usuario_responsable || "Sin responsable",
      estado: estado || "SIN_ESTADO",
      horas_sin_movimiento: redondearHoras(horas_sin_movimiento),
      accion_url: accion_url || "/",
      ...extra,
    };

    alertasMap.set(key, alertaTiempo);
    if (contador && Object.prototype.hasOwnProperty.call(resumen, contador)) {
      resumen[contador] += 1;
    }
    if (ordenId) ordenesSet.add(Number(ordenId));
    if (archivoECUId) archivosSet.add(Number(archivoECUId));
  };

  const ordenesActivas = ctx.ordenes.filter(esOrdenActiva);

  ordenesActivas.forEach((orden) => {
    const ordenId = Number(orden.id);
    const estado = normalizarEstado(orden.estado);
    const datos = obtenerDatosOrdenSLA(orden);
    const fechaEstado = obtenerFechaEstadoActual(orden, eventosPorOrden);
    const horasEstado = horasDesde(fechaEstado, ahora);
    const ultimoEvento = obtenerUltimoEventoOrden(eventosPorOrden, ordenId);
    const horasSinMovimiento = horasDesde(
      ultimoEvento?.createdAt || orden.updatedAt || orden.createdAt,
      ahora
    );
    const diagnosticos = diagnosticosPorOrden.get(ordenId) || [];
    const fotos = fotosPorOrden.get(ordenId) || [];
    const items = itemsPorOrden.get(ordenId) || [];
    const responsable = responsableOrdenSLA(orden);
    const accionOrden = `/ordenes?ordenId=${ordenId}`;

    if (estado === "RECEPCIONADO" && diagnosticos.length === 0 && horasEstado > 2) {
      agregarAlertaTiempo({
        tipo: "RECEPCION_SIN_DIAGNOSTICO",
        severidad: "ATENCION",
        titulo: "Recepcion sin diagnostico",
        descripcion: "Orden recepcionada sin diagnostico registrado dentro del SLA referencial.",
        ordenId,
        usuario_responsable: responsable,
        estado: orden.estado,
        horas_sin_movimiento: horasEstado,
        accion_url: `${accionOrden}#diagnostico`,
        contador: "recepcion_sin_diagnostico",
        extra: datos,
      });
    }

    if (estado === "PARA_DIAGNOSTICO" && horasEstado > 4) {
      agregarAlertaTiempo({
        tipo: "DIAGNOSTICO_ATRASADO",
        severidad: "ATENCION",
        titulo: "Diagnostico atrasado",
        descripcion: "Orden en PARA_DIAGNOSTICO por mas de 4 horas corridas.",
        ordenId,
        usuario_responsable: responsable,
        estado: orden.estado,
        horas_sin_movimiento: horasEstado,
        accion_url: `${accionOrden}#diagnostico`,
        contador: "recepcion_sin_diagnostico",
        extra: datos,
      });
    }

    if (estado === "EN_PROGRAMACION" && horasEstado > 24) {
      agregarAlertaTiempo({
        tipo: "PROGRAMACION_ATRASADA",
        severidad: "CRITICO",
        titulo: "Programacion atrasada",
        descripcion: "Orden en programacion por mas de 24 horas corridas.",
        ordenId,
        usuario_responsable: responsable,
        estado: orden.estado,
        horas_sin_movimiento: horasEstado,
        accion_url: accionOrden,
        contador: "programacion_atrasada",
        extra: datos,
      });
    }

    if (estado === "LISTO_PARA_ENTREGA" && !orden.entregado_at && horasEstado > 24) {
      agregarAlertaTiempo({
        tipo: "LISTO_SIN_ENTREGA",
        severidad: "CRITICO",
        titulo: "Lista sin entrega",
        descripcion: "Orden lista para entrega por mas de 24 horas corridas.",
        ordenId,
        usuario_responsable: responsable,
        estado: orden.estado,
        horas_sin_movimiento: horasEstado,
        accion_url: `${accionOrden}#entrega`,
        contador: "listas_sin_entrega",
        extra: datos,
      });
    }

    if (
      upper(orden.origen_recepcion) === "RECEPCION_EMERGENCIA_OPERADOR" &&
      (fotos.length === 0 || items.length === 0) &&
      horasDesde(orden.createdAt, ahora) > 2
    ) {
      agregarAlertaTiempo({
        tipo: "RECEPCION_EMERGENCIA_ATRASADA",
        severidad: "ATENCION",
        titulo: "Recepcion emergencia incompleta",
        descripcion: "Recepcion de emergencia sin fotos o items despues de 2 horas corridas.",
        ordenId,
        usuario_responsable: orden.recepcionado_por || responsable,
        estado: orden.estado,
        horas_sin_movimiento: horasDesde(orden.createdAt, ahora),
        accion_url: accionOrden,
        contador: "recepcion_emergencia_atrasada",
        extra: datos,
      });
    }

    if (
      orden.tecnico_finalizado_at &&
      !limpiarTexto(orden.feedback_por) &&
      !limpiarTexto(orden.feedback_operario) &&
      horasDesde(orden.tecnico_finalizado_at, ahora) > 12
    ) {
      agregarAlertaTiempo({
        tipo: "FEEDBACK_PENDIENTE_ATRASADO",
        severidad: "SEGUIMIENTO",
        titulo: "Feedback pendiente",
        descripcion: "Orden finalizada tecnicamente sin feedback operativo despues de 12 horas.",
        ordenId,
        usuario_responsable: responsable,
        estado: orden.estado,
        horas_sin_movimiento: horasDesde(orden.tecnico_finalizado_at, ahora),
        accion_url: `${accionOrden}#feedback`,
        contador: "feedback_pendiente_atrasado",
        extra: datos,
      });
    }

    if (horasSinMovimiento > 24 && !["LISTO_PARA_ENTREGA", "EN_PROGRAMACION"].includes(estado)) {
      agregarAlertaTiempo({
        tipo: "SIN_MOVIMIENTO_RECIENTE",
        severidad: "SEGUIMIENTO",
        titulo: "Orden sin movimiento reciente",
        descripcion: "Orden activa sin eventos o actualizaciones recientes por mas de 24 horas.",
        ordenId,
        usuario_responsable: responsable,
        estado: orden.estado,
        horas_sin_movimiento: horasSinMovimiento,
        accion_url: accionOrden,
        extra: datos,
      });
    }
  });

  ctx.items.forEach((item) => {
    const ordenId = Number(item.ordenId || item.orden_id);
    const orden = ctx.ordenes.find((actual) => Number(actual.id) === ordenId);
    if (!orden || !esOrdenActiva(orden)) {
      return;
    }

    const obligatorio =
      booleano(item.material_recuperado_obligatorio) ||
      booleano(item.requiere_material_recuperado);
    if (!obligatorio || normalizarEstado(item.estado) === "ANULADO") return;
    if (itemMaterialCumplido(item, ordenId)) return;

    const horasItem = horasDesde(item.updatedAt || item.createdAt || orden.createdAt, ahora);
    if (horasItem <= 24) return;

    agregarAlertaTiempo({
      tipo: "MATERIAL_PENDIENTE_ATRASADO",
      severidad: "ATENCION",
      titulo: "Material obligatorio pendiente",
      descripcion: "Item con material recuperado obligatorio pendiente por mas de 24 horas.",
      ordenId,
      itemId: item.id || null,
      usuario_responsable: item.responsable || responsableOrdenSLA(orden),
      estado: item.estado || "PENDIENTE",
      horas_sin_movimiento: horasItem,
      accion_url: `/ordenes?ordenId=${ordenId}#material`,
      contador: "material_pendiente_atrasado",
      extra: obtenerDatosOrdenSLA(orden),
    });
  });

  ctx.archivos.filter(esArchivoActivo).forEach((archivo) => {
    const estadoArchivo = normalizarEstado(archivo.estado);
    const horasArchivo = horasDesde(archivo.updatedAt || archivo.createdAt, ahora);
    const orden = archivo._orden || {};
    const datos = obtenerDatosOrdenSLA(orden);
    const responsable = responsableArchivoSLA(archivo);
    const accion = `/archivos-ecu?archivoId=${archivo.id}`;
    const postPendiente =
      !postEscrituraCumplida(archivo) &&
      (["MODIFICADO_LISTO", "NOTIFICADO_SLAVE", "POST_ESCRITURA_PENDIENTE"].includes(
        estadoArchivo
      ) ||
        Boolean(archivo.archivo_modificado));
    const correccionPendiente =
      booleano(archivo.correccion_pendiente) || estadoArchivo === "REQUIERE_CORRECCION";

    if (postPendiente && horasArchivo > 24) {
      agregarAlertaTiempo({
        tipo: "POST_ESCRITURA_ATRASADA",
        severidad: "CRITICO",
        titulo: "Post escritura atrasada",
        descripcion: "File Service sin post escritura OK por mas de 24 horas.",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        usuario_responsable: responsable,
        estado: archivo.estado,
        horas_sin_movimiento: horasArchivo,
        accion_url: `${accion}#post-escritura`,
        contador: "post_escritura_atrasada",
        extra: datos,
      });
    }

    if (correccionPendiente && horasArchivo > 12) {
      agregarAlertaTiempo({
        tipo: "CORRECCION_ATRASADA",
        severidad: "CRITICO",
        titulo: "Correccion atrasada",
        descripcion: "File Service con correccion pendiente por mas de 12 horas.",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        usuario_responsable: responsable,
        estado: archivo.estado,
        horas_sin_movimiento: horasArchivo,
        accion_url: `${accion}#correccion`,
        contador: "correccion_atrasada",
        extra: datos,
      });
    }

    if (!postPendiente && !correccionPendiente && horasArchivo > 24) {
      agregarAlertaTiempo({
        tipo: "FILE_SERVICE_ATRASADO",
        severidad: "ATENCION",
        titulo: "File Service activo atrasado",
        descripcion: "File Service activo por mas de 24 horas corridas.",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        usuario_responsable: responsable,
        estado: archivo.estado,
        horas_sin_movimiento: horasArchivo,
        accion_url: accion,
        extra: datos,
      });
    }
  });

  const alertas_tiempo = [...alertasMap.values()].sort((a, b) => {
    const peso = { CRITICO: 3, ATENCION: 2, SEGUIMIENTO: 1 };
    const severidad = (peso[upper(b.severidad)] || 0) - (peso[upper(a.severidad)] || 0);
    if (severidad !== 0) return severidad;
    return numero(b.horas_sin_movimiento) - numero(a.horas_sin_movimiento);
  });

  resumen.ordenes_atrasadas = ordenesSet.size;
  resumen.file_service_atrasado = archivosSet.size;

  return {
    generado_at: new Date().toISOString(),
    enfoque: "sla_operativo_referencial_v1",
    solo_lectura: true,
    resumen,
    alertas_tiempo: alertas_tiempo.slice(0, 100),
    ordenes_atrasadas: alertas_tiempo
      .filter((alertaItem) => alertaItem.ordenId && !alertaItem.archivoECUId && !alertaItem.itemId)
      .slice(0, 100),
    file_service_atrasado: alertas_tiempo
      .filter((alertaItem) => alertaItem.archivoECUId)
      .slice(0, 100),
    material_atrasado: alertas_tiempo
      .filter((alertaItem) => alertaItem.itemId)
      .slice(0, 100),
  };
};

const esCriticoCierreDiario = (item = {}) => {
  const severidad = upper(item.severidad || item.tipo || item.prioridad);
  const prioridad = upper(item.prioridad);
  return ["CRITICO", "URGENTE", "ALTA"].includes(severidad) || ["URGENTE", "ALTA"].includes(prioridad);
};

const normalizarPendienteCierreDiario = (item = {}, fallback = {}) => ({
  tipo: item.tipo || fallback.tipo || "PENDIENTE_OPERATIVO",
  severidad: item.severidad || item.tipo || fallback.severidad || "ATENCION",
  titulo: item.titulo || fallback.titulo || "Pendiente operativo",
  descripcion:
    item.descripcion ||
    item.mensaje ||
    item.motivo ||
    fallback.descripcion ||
    "Requiere revision antes de cerrar la jornada.",
  ordenId: item.ordenId || item.orden_id || fallback.ordenId || null,
  archivoECUId: item.archivoECUId || item.archivo_ecu_id || fallback.archivoECUId || null,
  usuario_responsable:
    item.usuario_responsable ||
    item.responsable_principal ||
    item.responsable ||
    fallback.usuario_responsable ||
    "Sin responsable",
  accion_url:
    item.accion_url ||
    fallback.accion_url ||
    (item.archivoECUId
      ? `/archivos-ecu?archivoId=${item.archivoECUId}`
      : item.ordenId
        ? `/ordenes?ordenId=${item.ordenId}`
        : null),
});

const agregarPendienteCierreDiario = (mapa, item = {}, fallback = {}) => {
  const pendiente = normalizarPendienteCierreDiario(item, fallback);
  const clave = [
    pendiente.tipo,
    pendiente.ordenId || "sin-orden",
    pendiente.archivoECUId || "sin-file",
    pendiente.titulo,
  ].join("-");

  if (!mapa.has(clave)) {
    mapa.set(clave, pendiente);
  }
};

const datosBasicosOrdenCierre = (orden = {}) => ({
  cliente: orden._cliente?.nombre || "Cliente no registrado",
  vehiculo: orden._vehiculo?.patente
    ? `${orden._vehiculo.patente} ${orden._vehiculo.marca || ""} ${orden._vehiculo.modelo || ""}`.trim()
    : "Vehiculo no registrado",
});

const crearCierreDiarioData = (ctx) => {
  const ahora = new Date();
  // V1 usa dia local del servidor. Si Railway queda en UTC, ajustar V1.1 a timezone America/Santiago.
  const desdeHoy = inicioDia(ahora);
  const cumplimiento = crearCumplimientoOperativoData(ctx);
  const tiempos = crearTiemposOperativosData(ctx);
  const reporte = crearReporteData(ctx, "CIERRE_DIA");
  const pendientesMap = new Map();
  const itemsPorOrden = new Map();

  ctx.items.forEach((item) => {
    const ordenId = Number(item.ordenId || item.orden_id);
    if (!ordenId) return;
    if (!itemsPorOrden.has(ordenId)) itemsPorOrden.set(ordenId, []);
    itemsPorOrden.get(ordenId).push(item);
  });

  const ordenesActivas = ctx.ordenes.filter(esOrdenActiva);
  const archivosActivos = ctx.archivos.filter(esArchivoActivo);
  const ordenesCreadasHoy = ctx.ordenes.filter((orden) => dentroDesde(orden.createdAt, desdeHoy));
  const ordenesEntregadasHoy = ctx.ordenes.filter(
    (orden) =>
      upper(orden.estado) === "ENTREGADO" &&
      (dentroDesde(orden.entregado_at, desdeHoy) || dentroDesde(orden.updatedAt, desdeHoy))
  );
  const listasSinEntrega = ordenesActivas.filter(
    (orden) => upper(orden.estado) === "LISTO_PARA_ENTREGA"
  );
  const pagosPendientes = ordenesActivas.filter((orden) => upper(orden.estado_pago) !== "PAGADO");
  const recepcionesEmergenciaHoy = ctx.ordenes.filter(
    (orden) =>
      upper(orden.origen_recepcion) === "RECEPCION_EMERGENCIA_OPERADOR" &&
      dentroDesde(orden.createdAt, desdeHoy)
  );
  const ordenesUrgentes = ordenesActivas.filter(esCreadoEnModoUrgente);
  const archivosUrgentes = archivosActivos.filter(esCreadoEnModoUrgente);
  const ordenesUrgentesSinRegularizar = ordenesUrgentes.filter(
    requiereRegularizacion
  );
  const archivosUrgentesSinRegularizar = archivosUrgentes.filter(
    requiereRegularizacion
  );
  const fileServiceSinPostEscritura = archivosActivos.filter((archivo) => {
    const estado = upper(archivo.estado);
    return (
      !postEscrituraCumplida(archivo) &&
      (["MODIFICADO_LISTO", "NOTIFICADO_SLAVE", "POST_ESCRITURA_PENDIENTE"].includes(estado) ||
        Boolean(archivo.archivo_modificado))
    );
  });
  const fileServiceSinCierreTecnico = archivosActivos.filter(
    (archivo) =>
      booleano(archivo.cierre_tecnico_obligatorio) &&
      !fechaValida(archivo.cierre_tecnico_at)
  );

  listasSinEntrega.forEach((orden) => {
    agregarPendienteCierreDiario(
      pendientesMap,
      {
        tipo: "LISTA_SIN_ENTREGA",
        severidad: "ATENCION",
        titulo: `Orden #${orden.id} lista sin entregar`,
        descripcion: "Orden lista para entrega debe revisarse antes del cierre del dia.",
        ordenId: orden.id,
        usuario_responsable: orden.recepcionado_por || "RECEPCION",
        accion_url: `/ordenes?ordenId=${orden.id}#entrega`,
      }
    );
  });

  pagosPendientes
    .filter((orden) => upper(orden.estado) === "LISTO_PARA_ENTREGA")
    .forEach((orden) => {
      agregarPendienteCierreDiario(
        pendientesMap,
        {
          tipo: "PAGO_PENDIENTE",
          severidad: "CRITICO",
          titulo: `Pago pendiente Orden #${orden.id}`,
          descripcion: "No cerrar el dia sin revisar pago pendiente asociado a entrega.",
          ordenId: orden.id,
          usuario_responsable: orden.recepcionado_por || "RECEPCION",
          accion_url: `/ordenes?ordenId=${orden.id}#pago`,
        }
      );
    });

  fileServiceSinPostEscritura.forEach((archivo) => {
    agregarPendienteCierreDiario(
      pendientesMap,
      {
        tipo: "FILE_SERVICE_SIN_POST_ESCRITURA",
        severidad: "ATENCION",
        titulo: `File Service #${archivo.id} sin post escritura OK`,
        descripcion: "Registrar post escritura o dejar continuidad clara para manana.",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        usuario_responsable: responsableArchivoSLA(archivo),
        accion_url: `/archivos-ecu?archivoId=${archivo.id}#post-escritura`,
      }
    );
  });

  fileServiceSinCierreTecnico.forEach((archivo) => {
    agregarPendienteCierreDiario(
      pendientesMap,
      {
        tipo: "FILE_SERVICE_SIN_CIERRE_TECNICO",
        severidad: ["CRITICO", "ESCALADO"].includes(upper(archivo.proceso_guard_estado))
          ? "CRITICO"
          : "ATENCION",
        titulo: `File Service #${archivo.id} sin cierre tecnico`,
        descripcion: "Process Guard requiere cierre tecnico, correccion o continuidad documentada.",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        usuario_responsable: responsableArchivoSLA(archivo),
        accion_url: `/archivos-ecu?archivoId=${archivo.id}#post-escritura`,
      }
    );
  });

  ordenesUrgentesSinRegularizar.forEach((orden) => {
    agregarPendienteCierreDiario(pendientesMap, {
      tipo: "URGENTE_SIN_REGULARIZAR",
      severidad: "ATENCION",
      titulo: `Orden urgente #${orden.id} sin regularizar`,
      descripcion:
        pendientesRegularizacion(orden).join(", ") ||
        "Completar datos pendientes antes de entregar.",
      ordenId: orden.id,
      usuario_responsable:
        orden.recepcionado_por ||
        orden.operador_ecu_asignado_a ||
        orden.mecanico_asignado_a ||
        "Por asignar",
      accion_url: `/ordenes?ordenId=${orden.id}`,
    });
  });

  archivosUrgentesSinRegularizar.forEach((archivo) => {
    agregarPendienteCierreDiario(pendientesMap, {
      tipo: "FILE_SERVICE_URGENTE_SIN_REGULARIZAR",
      severidad: "ATENCION",
      titulo: `File Service urgente #${archivo.id} sin regularizar`,
      descripcion:
        pendientesRegularizacion(archivo).join(", ") ||
        "Completar diagnóstico y encargado antes del cierre técnico.",
      ordenId: archivo.ordenId || null,
      archivoECUId: archivo.id,
      usuario_responsable: responsableArchivoSLA(archivo) || "Por asignar",
      accion_url: `/archivos-ecu?archivoId=${archivo.id}`,
    });
  });

  (cumplimiento.material_pendiente || []).forEach((item) => {
    agregarPendienteCierreDiario(
      pendientesMap,
      {
        ...item,
        tipo: "MATERIAL_OBLIGATORIO_PENDIENTE",
        severidad: "ATENCION",
        titulo: `Material pendiente Orden #${item.ordenId}`,
        descripcion: item.motivo || "Debe registrar peso o motivo de excepcion.",
        accion_url: `/ordenes?ordenId=${item.ordenId}#material`,
      }
    );
  });

  (cumplimiento.ordenes_con_pendientes || []).forEach((orden) => {
    if (orden.pendientes?.includes("SIN_FOTOS")) {
      agregarPendienteCierreDiario(
        pendientesMap,
        {
          tipo: "ORDEN_SIN_FOTOS",
          severidad: "ATENCION",
          titulo: `Orden #${orden.ordenId} sin fotos`,
          descripcion: "Completar evidencia fotografica o registrar motivo antes de cerrar la jornada.",
          ordenId: orden.ordenId,
          usuario_responsable: orden.recepcionado_por || "Sin responsable",
          accion_url: `/fotos?ordenId=${orden.ordenId}`,
        }
      );
    }

    if (orden.pendientes?.includes("SIN_ITEMS")) {
      agregarPendienteCierreDiario(
        pendientesMap,
        {
          tipo: "ORDEN_SIN_ITEMS",
          severidad: "ATENCION",
          titulo: `Orden #${orden.ordenId} sin items`,
          descripcion: "La orden debe tener al menos un item/servicio para trazabilidad comercial-operativa.",
          ordenId: orden.ordenId,
          usuario_responsable: orden.recepcionado_por || "Sin responsable",
          accion_url: `/ordenes?ordenId=${orden.ordenId}#items`,
        }
      );
    }

    if (orden.pendientes?.includes("RECEPCION_EMERGENCIA")) {
      agregarPendienteCierreDiario(
        pendientesMap,
        {
          tipo: "RECEPCION_EMERGENCIA",
          severidad: "SEGUIMIENTO",
          titulo: `Recepcion emergencia Orden #${orden.ordenId}`,
          descripcion: "Verificar que la recepcion de emergencia tenga evidencia e items claros.",
          ordenId: orden.ordenId,
          usuario_responsable: orden.recepcionado_por || "Sin responsable",
          accion_url: `/ordenes?ordenId=${orden.ordenId}`,
        }
      );
    }

    if (orden.pendientes?.includes("SIN_FEEDBACK")) {
      agregarPendienteCierreDiario(
        pendientesMap,
        {
          tipo: "ORDEN_SIN_FEEDBACK",
          severidad: "SEGUIMIENTO",
          titulo: `Orden #${orden.ordenId} sin feedback operativo`,
          descripcion: "Si el trabajo continua o quedo tecnico, dejar feedback operativo.",
          ordenId: orden.ordenId,
          usuario_responsable: orden.recepcionado_por || "Sin responsable",
          accion_url: `/ordenes?ordenId=${orden.ordenId}#feedback`,
        }
      );
    }
  });

  (tiempos.alertas_tiempo || []).forEach((item) => {
    if (esCriticoCierreDiario(item)) {
      agregarPendienteCierreDiario(pendientesMap, item, {
        tipo: item.tipo || "SLA_CRITICO",
        severidad: item.severidad || "CRITICO",
      });
    }
  });

  const pendientes_para_cerrar_dia = [...pendientesMap.values()].sort(
    (a, b) => prioridadPendiente(b) - prioridadPendiente(a)
  );
  const idsPendientes = new Set(
    pendientes_para_cerrar_dia
      .map((item) => item.ordenId)
      .filter(Boolean)
      .map(String)
  );
  const archivosPendientes = new Set(
    pendientes_para_cerrar_dia
      .map((item) => item.archivoECUId)
      .filter(Boolean)
      .map(String)
  );
  const continuarOrdenes = ordenesActivas
    .filter((orden) => !idsPendientes.has(String(orden.id)))
    .map((orden) => ({
      tipo: "ORDEN_CONTINUA",
      titulo: `Orden #${orden.id} continua manana`,
      descripcion: `Estado actual: ${orden.estado || "SIN_ESTADO"}`,
      ordenId: orden.id,
      usuario_responsable: responsableOrdenSLA(orden),
      accion_url: `/ordenes?ordenId=${orden.id}`,
      ...datosBasicosOrdenCierre(orden),
    }));
  const continuarArchivos = archivosActivos
    .filter((archivo) => !archivosPendientes.has(String(archivo.id)))
    .map((archivo) => ({
      tipo: "FILE_SERVICE_CONTINUA",
      titulo: `File Service #${archivo.id} continua manana`,
      descripcion: `Estado actual: ${archivo.estado || "SIN_ESTADO"}`,
      ordenId: archivo.ordenId || null,
      archivoECUId: archivo.id,
      usuario_responsable: responsableArchivoSLA(archivo),
      accion_url: `/archivos-ecu?archivoId=${archivo.id}`,
    }));

  const resumen = {
    ordenes_creadas_hoy: ordenesCreadasHoy.length,
    ordenes_entregadas_hoy: ordenesEntregadasHoy.length,
    ordenes_activas: ordenesActivas.length,
    listas_sin_entrega: listasSinEntrega.length,
    pagos_pendientes: pagosPendientes.length,
    file_service_pendiente: archivosActivos.length,
    file_service_sin_post_escritura: fileServiceSinPostEscritura.length,
    file_service_sin_cierre_tecnico: fileServiceSinCierreTecnico.length,
    material_pendiente: cumplimiento.resumen?.items_material_pendiente || 0,
    ordenes_sin_fotos: cumplimiento.resumen?.ordenes_sin_fotos || 0,
    ordenes_sin_items: cumplimiento.resumen?.ordenes_sin_items || 0,
    recepciones_emergencia_hoy: recepcionesEmergenciaHoy.length,
    pendientes_criticos: pendientes_para_cerrar_dia.filter(esCriticoCierreDiario).length,
    urgentes_sin_regularizar:
      ordenesUrgentesSinRegularizar.length + archivosUrgentesSinRegularizar.length,
    ordenes_creadas_rapidas: ordenesUrgentes.length,
    file_service_urgente: archivosUrgentes.length,
    pendientes_antes_de_entrega:
      ordenesUrgentesSinRegularizar.filter((orden) =>
        booleano(orden.regularizar_antes_de_entrega)
      ).length +
      archivosUrgentesSinRegularizar.filter((archivo) =>
        booleano(archivo.regularizar_antes_de_entrega)
      ).length,
    por_asignar:
      ordenesUrgentes.filter((orden) =>
        ordenPorAsignar(orden, itemsPorOrden.get(Number(orden.id)) || [])
      ).length +
      archivosUrgentes.filter(archivoPorAsignar).length,
  };

  return {
    generado_at: new Date().toISOString(),
    fecha: desdeHoy.toISOString().slice(0, 10),
    resumen,
    pendientes_para_cerrar_dia: pendientes_para_cerrar_dia.slice(0, 100),
    continuar_manana: [...continuarOrdenes, ...continuarArchivos].slice(0, 100),
    alertas: [
      ...(reporte.alertas || []).map((item) => ({
        tipo: item.prioridad || "ATENCION",
        titulo: item.titulo || "Alerta operativa",
        mensaje: item.detalle || item.mensaje || item.descripcion || "",
        accion_url: item.accion_url || null,
      })),
      ...(tiempos.alertas_tiempo || []).slice(0, 20),
    ].slice(0, 50),
    responsables_con_pendientes: (cumplimiento.usuarios || []).slice(0, 50),
    urgentes_sin_regularizar: [
      ...ordenesUrgentesSinRegularizar.map((orden) => ({
        tipo: "ORDEN",
        ordenId: orden.id,
        motivo_urgencia: orden.motivo_urgencia || null,
        regularizacion_pendientes: pendientesRegularizacion(orden),
        accion_url: `/ordenes?ordenId=${orden.id}`,
      })),
      ...archivosUrgentesSinRegularizar.map((archivo) => ({
        tipo: "FILE_SERVICE",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        motivo_urgencia: archivo.motivo_urgencia || null,
        regularizacion_pendientes: pendientesRegularizacion(archivo),
        accion_url: `/archivos-ecu?archivoId=${archivo.id}`,
      })),
    ].slice(0, 100),
    por_asignar: [
      ...ordenesUrgentes
        .filter((orden) =>
          ordenPorAsignar(orden, itemsPorOrden.get(Number(orden.id)) || [])
        )
        .map((orden) => ({
        tipo: "ORDEN",
        ordenId: orden.id,
        accion_url: `/ordenes?ordenId=${orden.id}`,
        })),
      ...archivosUrgentes.filter(archivoPorAsignar).map((archivo) => ({
        tipo: "FILE_SERVICE",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        accion_url: `/archivos-ecu?archivoId=${archivo.id}`,
      })),
    ].slice(0, 100),
    solo_lectura: true,
  };
};

const crearIdentidadDesdeUsuario = (usuario = {}) => {
  const id = limpiarTexto(usuario.id);
  const username = limpiarTexto(usuario.username);
  const nombre = limpiarTexto(usuario.nombre);
  const rol = upper(usuario.rol);
  const claves = new Set(
    [id, username, nombre]
      .map(normalizarClaveUsuario)
      .filter(Boolean)
  );

  return {
    id,
    username,
    nombre,
    rol,
    claves,
  };
};

const verificarGuardiaOperativaUsuario = async ({ usuarioId, rol, contexto } = {}) => {
  const id = limpiarTexto(usuarioId);

  if (!id) {
    return {
      bloqueado: false,
      usuarioId: null,
      pendientes_criticos: [],
    };
  }

  const usuario = await Usuario.findByPk(id, {
    attributes: ["id", "nombre", "username", "rol", "activo"],
  });

  if (!usuario || usuario.activo === false) {
    return {
      bloqueado: true,
      usuarioId: id,
      usuario: null,
      pendientes_criticos: [
        {
          tipo: "USUARIO_NO_ASIGNABLE",
          titulo: "Usuario no asignable",
          descripcion: "El usuario no existe o esta inactivo.",
          ordenId: null,
          archivoECUId: null,
          itemId: null,
          horas: 0,
          accion_url: "/usuarios",
        },
      ],
    };
  }

  const ctx = contexto || (await cargarContexto());
  const identidad = crearIdentidadDesdeUsuario({
    ...usuario.toJSON(),
    rol: rol || usuario.rol,
  });
  const ahora = new Date();
  const fotosPorOrden = new Map();
  const itemsPorOrden = new Map();
  const materialesPorOrden = new Map();
  const materialesPorItem = new Map();
  const pendientesMap = new Map();

  ctx.fotos.forEach((foto) => {
    const ordenId = Number(foto.ordenId || foto.orden_id || foto.ordenTrabajoId);
    if (!ordenId) return;
    if (!fotosPorOrden.has(ordenId)) fotosPorOrden.set(ordenId, []);
    fotosPorOrden.get(ordenId).push(foto);
  });

  ctx.items.forEach((item) => {
    const ordenId = Number(item.ordenId || item.orden_id);
    if (!ordenId) return;
    if (!itemsPorOrden.has(ordenId)) itemsPorOrden.set(ordenId, []);
    itemsPorOrden.get(ordenId).push(item);
  });

  ctx.materiales.forEach((material) => {
    const ordenId = Number(material.ordenId || material.orden_id);
    const itemId = Number(material.itemId || material.item_id || 0);
    if (ordenId) {
      if (!materialesPorOrden.has(ordenId)) materialesPorOrden.set(ordenId, []);
      materialesPorOrden.get(ordenId).push(material);
    }
    if (itemId) {
      if (!materialesPorItem.has(itemId)) materialesPorItem.set(itemId, []);
      materialesPorItem.get(itemId).push(material);
    }
  });

  const itemMaterialCumplido = (item, ordenId) => {
    const itemId = Number(item.id);
    const materialesItem = materialesPorItem.get(itemId) || [];
    const materialesOrden = (materialesPorOrden.get(Number(ordenId)) || []).filter(
      (material) => !Number(material.itemId || material.item_id || 0)
    );
    return [...materialesItem, ...materialesOrden].some(materialCumpleCumplimiento);
  };

  const agregarPendienteCritico = (pendiente) => {
    const key = [
      pendiente.tipo,
      pendiente.ordenId || "",
      pendiente.archivoECUId || "",
      pendiente.itemId || "",
    ].join(":");

    if (pendientesMap.has(key)) return;

    pendientesMap.set(key, {
      tipo: pendiente.tipo,
      titulo: pendiente.titulo,
      descripcion: pendiente.descripcion,
      ordenId: pendiente.ordenId || null,
      archivoECUId: pendiente.archivoECUId || null,
      itemId: pendiente.itemId || null,
      horas: redondearHoras(pendiente.horas || 0),
      accion_url: pendiente.accion_url || "/",
    });
  };

  const usuarioAsignadoOrden = (orden) =>
    coincideIdentidad(
      identidad,
      orden.recepcionado_por_id,
      orden.recepcionado_por,
      orden.diagnostico_asignado_a_id,
      orden.diagnostico_asignado_a,
      orden.operador_ecu_asignado_a_id,
      orden.operador_ecu_asignado_a,
      orden.mecanico_asignado_a_id,
      orden.mecanico_asignado_a,
      orden.supervisor_asignado_a_id,
      orden.supervisor_asignado_a
    );

  const usuarioAsignadoRecepcion = (orden) =>
    coincideIdentidad(identidad, orden.recepcionado_por_id, orden.recepcionado_por);

  const usuarioAsignadoArchivo = (archivo) =>
    coincideIdentidad(
      identidad,
      archivo.tuner_asignado_a_id,
      archivo.tuner_asignado_a,
      archivo.operador_ecu_asignado_a_id,
      archivo.operador_ecu_asignado_a,
      archivo.slave_asignado_a_id,
      archivo.slave_asignado_a,
      archivo.post_escritura_por_id,
      archivo.post_escritura_por,
      archivo.cierre_tecnico_por_id,
      archivo.cierre_tecnico_por,
      archivo.proceso_guard_responsable_id
    );

  ctx.ordenes
    .filter(esOrdenActiva)
    .forEach((orden) => {
      const ordenId = Number(orden.id);
      const estado = normalizarEstado(orden.estado);
      const horasOrden = horasDesde(orden.updatedAt || orden.createdAt, ahora);
      const accionOrden = `/ordenes?ordenId=${ordenId}`;

      if (estado === "EN_PROGRAMACION" && usuarioAsignadoOrden(orden) && horasOrden > 24) {
        agregarPendienteCritico({
          tipo: "PROGRAMACION_ATRASADA",
          titulo: "Programacion atrasada",
          descripcion: "Orden en programacion por mas de 24 horas corridas.",
          ordenId,
          horas: horasOrden,
          accion_url: accionOrden,
        });
      }

      if (
        estado === "LISTO_PARA_ENTREGA" &&
        usuarioAsignadoRecepcion(orden) &&
        !orden.entregado_at &&
        horasOrden > 24
      ) {
        agregarPendienteCritico({
          tipo: "LISTO_SIN_ENTREGA",
          titulo: "Lista sin entrega",
          descripcion: "Orden lista para entrega por mas de 24 horas corridas.",
          ordenId,
          horas: horasOrden,
          accion_url: `${accionOrden}#entrega`,
        });
      }

      const emergencia = upper(orden.origen_recepcion) === "RECEPCION_EMERGENCIA_OPERADOR";
      const fotosOrden = fotosPorOrden.get(ordenId) || [];
      const itemsOrden = itemsPorOrden.get(ordenId) || [];

      if (
        emergencia &&
        usuarioAsignadoRecepcion(orden) &&
        (fotosOrden.length === 0 || itemsOrden.length === 0) &&
        horasDesde(orden.createdAt, ahora) > 2
      ) {
        agregarPendienteCritico({
          tipo: "RECEPCION_EMERGENCIA_INCOMPLETA",
          titulo: "Recepcion emergencia incompleta",
          descripcion: "Recepcion de emergencia sin fotos o items despues de 2 horas corridas.",
          ordenId,
          horas: horasDesde(orden.createdAt, ahora),
          accion_url: accionOrden,
        });
      }
    });

  ctx.items.forEach((item) => {
    const ordenId = Number(item.ordenId || item.orden_id);
    const orden = ctx.ordenes.find((actual) => Number(actual.id) === ordenId);
    if (!orden || !esOrdenActiva(orden)) {
      return;
    }

    const asignadoItem = coincideIdentidad(identidad, item.responsable_id, item.responsable);
    const obligatorio =
      booleano(item.material_recuperado_obligatorio) ||
      booleano(item.requiere_material_recuperado);
    const cerrado = ["ANULADO", "LISTO", "CERRADO", "COMPLETADO", "FINALIZADO"].includes(
      normalizarEstado(item.estado)
    );
    const horasItem = horasDesde(item.updatedAt || item.createdAt || orden.createdAt, ahora);

    if (asignadoItem && obligatorio && !cerrado && !itemMaterialCumplido(item, ordenId) && horasItem > 24) {
      agregarPendienteCritico({
        tipo: "MATERIAL_OBLIGATORIO_PENDIENTE",
        titulo: "Material obligatorio pendiente",
        descripcion: "Item con material recuperado obligatorio pendiente por mas de 24 horas.",
        ordenId,
        itemId: item.id || null,
        horas: horasItem,
        accion_url: `/ordenes?ordenId=${ordenId}#material`,
      });
    }
  });

  ctx.materiales.forEach((material) => {
    const asignadoMaterial = coincideIdentidad(
      identidad,
      material.responsable_id,
      material.responsable,
      material.registrado_por_id,
      material.registrado_por
    );
    if (!asignadoMaterial) return;
    const ordenId = Number(material.ordenId || material.orden_id);
    const horasMaterial = horasDesde(material.updatedAt || material.createdAt, ahora);
    const pendiente = !materialCumpleCumplimiento(material);

    if (pendiente && horasMaterial > 24) {
      agregarPendienteCritico({
        tipo: "MATERIAL_REGISTRO_INCOMPLETO",
        titulo: "Registro de material incompleto",
        descripcion: "Material recuperado sin peso o motivo de excepcion por mas de 24 horas.",
        ordenId: ordenId || null,
        itemId: material.itemId || null,
        horas: horasMaterial,
        accion_url: ordenId ? `/ordenes?ordenId=${ordenId}#material` : "/",
      });
    }
  });

  ctx.archivos.filter(esArchivoActivo).forEach((archivo) => {
    if (!usuarioAsignadoArchivo(archivo)) return;

    const estadoArchivo = normalizarEstado(archivo.estado);
    const horasArchivo = horasDesde(archivo.updatedAt || archivo.createdAt, ahora);
    const accion = `/archivos-ecu?archivoId=${archivo.id}`;
    const postPendiente =
      !postEscrituraCumplida(archivo) &&
      (["MODIFICADO_LISTO", "NOTIFICADO_SLAVE", "POST_ESCRITURA_PENDIENTE"].includes(
        estadoArchivo
      ) ||
        Boolean(archivo.archivo_modificado));
    const correccionPendiente =
      booleano(archivo.correccion_pendiente) || estadoArchivo === "REQUIERE_CORRECCION";
    const guardCritico = ["CRITICO", "ESCALADO"].includes(
      upper(archivo.proceso_guard_estado)
    );

    if (correccionPendiente && horasArchivo > 12) {
      agregarPendienteCritico({
        tipo: "CORRECCION_FILE_SERVICE_ATRASADA",
        titulo: "Correccion File Service atrasada",
        descripcion: "File Service con correccion pendiente por mas de 12 horas.",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        horas: horasArchivo,
        accion_url: `${accion}#correccion`,
      });
    }

    if (postPendiente && horasArchivo > 24) {
      agregarPendienteCritico({
        tipo: "POST_ESCRITURA_ATRASADA",
        titulo: "Post escritura atrasada",
        descripcion: "File Service sin post escritura OK por mas de 24 horas.",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        horas: horasArchivo,
        accion_url: `${accion}#post-escritura`,
      });
    }

    if (guardCritico) {
      agregarPendienteCritico({
        tipo: "PROCESS_GUARD_CRITICO",
        titulo: "Process Guard critico",
        descripcion: "Proceso tecnico con cierre obligatorio en estado critico o escalado.",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        horas: horasArchivo,
        accion_url: accion,
      });
    }
  });

  const pendientes_criticos = [...pendientesMap.values()].sort(
    (a, b) => numero(b.horas) - numero(a.horas)
  );

  return {
    bloqueado: pendientes_criticos.length > 0,
    usuarioId: id,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      username: usuario.username,
      rol: usuario.rol,
    },
    pendientes_criticos,
  };
};

const guardiaOperativa = async (req, res) => {
  try {
    const usuarioId = limpiarTexto(req.params.usuarioId);

    if (!usuarioId) {
      return res.status(400).json({
        error: "usuarioId requerido",
      });
    }

    const rol = rolActual(req);
    const esJefatura = ["OWNER", "ADMIN", "SUPERVISOR"].includes(rol);
    const usuarioActualId = limpiarTexto(req.usuario?.id || req.user?.id);

    if (!esJefatura && usuarioId !== usuarioActualId) {
      return res.status(403).json({
        error: "Solo puedes consultar tu propia guardia operativa.",
      });
    }

    const resultado = await verificarGuardiaOperativaUsuarioService({ usuarioId });

    return res.json({
      ...resultado,
      enfoque: "guardia_operativa_critica_v1",
      solo_lectura: true,
      mensaje: resultado.bloqueado
        ? "Este responsable no puede recibir una nueva asignacion hasta resolver sus bloqueos o registrar un override autorizado."
        : resultado.advertencias_operativas?.length
          ? "El responsable puede recibir trabajo. Mantiene advertencias operativas que no bloquean."
          : "Usuario sin bloqueos de asignacion.",
    });
  } catch (error) {
    console.error("ERROR GUARDIA OPERATIVA:", error);
    const status = Number(error?.statusCode) || 500;
    const codigo = error?.codigo || "GUARDIA_OPERATIVA_ERROR";

    return res.status(status).json({
      error: codigo,
      message:
        status === 503
          ? error.message
          : "No se pudo revisar guardia operativa.",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const crearNotificacionAntiSpam = async ({
  rolesDestino,
  tipo,
  titulo,
  mensaje,
  accion_url,
  entidad_tipo,
  entidad_id,
  ordenId = null,
  archivoECUId = null,
  metadata = {},
  ventanaMs = 2 * 60 * 60 * 1000,
}) => {
  try {
    const where = {
      tipo,
    };

    if (ventanaMs) {
      where.createdAt = {
        [Op.gte]: new Date(Date.now() - ventanaMs),
      };
    }

    if (entidad_tipo) where.entidad_tipo = entidad_tipo;
    if (entidad_id !== null && entidad_id !== undefined) where.entidad_id = String(entidad_id);

    const existente = await Notificacion.count({ where });
    if (existente > 0) return false;

    await crearNotificacionesInternas({
      rolesDestino,
      tipo,
      titulo,
      mensaje,
      ordenId,
      archivoECUId,
      accion_url,
      accion_tipo: "ABRIR_ALERTA_AUTOMATIZACION",
      entidad_tipo,
      entidad_id,
      metadata: {
        ...metadata,
        origen: "AUTOMATIZACION",
      },
    });

    return true;
  } catch (error) {
    console.warn("Automatizaciones: no se pudo crear notificacion:", error.message);
    return false;
  }
};

const notificarAlertasPrioritarias = async (resultado, tipoReporte = "REVISION_OPERATIVA") => {
  const prioritarias = (resultado.alertas || []).filter((item) =>
    ["URGENTE", "ALTA"].includes(upper(item.prioridad))
  );

  let creadas = 0;

  for (const item of prioritarias.slice(0, 5)) {
    const creada = await crearNotificacionAntiSpam({
      rolesDestino: ["OWNER", "ADMIN", "SUPERVISOR"],
      tipo: "AUTOMATIZACION_ALERTA",
      titulo: item.titulo,
      mensaje: item.detalle,
      accion_url: item.accion_url || "/",
      entidad_tipo: item.entidad_tipo || "AUTOMATIZACION",
      entidad_id: item.entidad_id || item.id,
      metadata: {
        tipoReporte,
        prioridad: item.prioridad,
        sugerencia: item.sugerencia,
      },
    });
    if (creada) creadas += 1;
  }

  return creadas;
};

const sincronizarProcessGuard = async (ctx, notificar = false) => {
  await prepararColumnasArchivoECU();

  const items = generarItemsProcessGuard(ctx);
  let actualizados = 0;
  let notificaciones = 0;

  for (const item of items) {
    const estadoAnterior = upper(item.archivo.proceso_guard_estado || "SIN_RIESGO");
    const estadoNuevo = item.estado;
    const requiereUpdate =
      estadoAnterior !== estadoNuevo ||
      !item.archivo.proceso_guard_started_at ||
      booleano(item.archivo.cierre_tecnico_obligatorio) !== true;

    if (requiereUpdate) {
      await sequelize.query(
        `
        UPDATE "archivos_ecu"
        SET
          "proceso_guard_estado" = :estado,
          "proceso_guard_started_at" = COALESCE("proceso_guard_started_at", "mod_descargado_at", "updatedAt", NOW()),
          "proceso_guard_escalado_at" = CASE
            WHEN :estado = 'ESCALADO' AND "proceso_guard_escalado_at" IS NULL THEN NOW()
            ELSE "proceso_guard_escalado_at"
          END,
          "cierre_tecnico_obligatorio" = true,
          "resultado_tecnico" = COALESCE("resultado_tecnico", 'PENDIENTE'),
          "updatedAt" = NOW()
        WHERE "id" = :id
        `,
        {
          replacements: {
            id: item.id,
            estado: estadoNuevo,
          },
        }
      );
      actualizados += 1;
    }

    const debeNotificar =
      notificar &&
      estadoProcessGuardVisible(estadoNuevo) &&
      ["EN_ESPERA_POST_ESCRITURA", "ADVERTENCIA", "CRITICO", "ESCALADO"].includes(
        estadoNuevo
      );

    if (debeNotificar) {
      const tipo = `PROCESS_GUARD_${estadoNuevo}`;
      const rolesDestino =
        estadoNuevo === "ESCALADO"
          ? ["OWNER", "SUPERVISOR"]
          : ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_ECU", "TUNER"];
      const creada = await crearNotificacionAntiSpam({
        rolesDestino,
        tipo,
        titulo:
          estadoNuevo === "ESCALADO"
            ? "Process Guard escalado"
            : estadoNuevo === "CRITICO"
            ? "Process Guard critico"
            : "Process Guard requiere cierre tecnico",
        mensaje: `File Service #${item.id}: ${item.motivo}. Lleva ${item.horas}h sin cierre tecnico.`,
        ordenId: item.ordenId,
        archivoECUId: item.id,
        accion_url: item.accion_url,
        entidad_tipo: "ARCHIVO_ECU",
        entidad_id: item.id,
        metadata: {
          proceso_guard: true,
          estado: estadoNuevo,
          prioridad: ["CRITICO", "ESCALADO"].includes(estadoNuevo) ? "URGENTE" : "ALTA",
          minutos: item.minutos,
          responsable: item.responsable,
          sonido: ["CRITICO", "ESCALADO"].includes(estadoNuevo) ? "tsunami" : "fuerte",
        },
        ventanaMs: null,
      });

      if (creada) {
        await sequelize.query(
          `
          UPDATE "archivos_ecu"
          SET "proceso_guard_last_alert_at" = NOW()
          WHERE "id" = :id
          `,
          {
            replacements: { id: item.id },
          }
        );
        notificaciones += 1;
      }
    }
  }

  return {
    actualizados,
    notificaciones,
    items,
  };
};

const responderRevision = (creador, notificar = false, tipoNotificacion = "REVISION") => async (req, res) => {
  try {
    const ctx = await cargarContexto();
    const resultado = creador(ctx);
    const notificacionesCreadas = notificar
      ? await notificarAlertasPrioritarias(resultado, tipoNotificacion)
      : 0;

    return res.json({
      ...resultado,
      notificaciones_creadas: notificacionesCreadas,
      solo_lectura: true,
      generado_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("ERROR AUTOMATIZACION:", error);
    return res.status(500).json({
      error: "No se pudo ejecutar la automatizacion",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const revisionOperativa = responderRevision(revisionOperativaData, false, "REVISION_OPERATIVA");
const revisionFileService = responderRevision(revisionFileServiceData, false, "FILE_SERVICE");
const revisionMaterialRecuperado = responderRevision(revisionMaterialData, false, "MATERIAL_RECUPERADO");
const revisionProcessGuard = responderRevision(revisionProcessGuardData, false, "PROCESS_GUARD");

const cumplimientoOperativo = async (req, res) => {
  try {
    const ctx = await cargarContexto();
    const resultado = crearCumplimientoOperativoData(ctx);

    return res.json({
      ...resultado,
      solo_lectura: true,
      enfoque: "pendientes_operativos_v1",
    });
  } catch (error) {
    console.error("ERROR CUMPLIMIENTO OPERATIVO:", error);
    return res.status(500).json({
      error: "No se pudo cargar cumplimiento operativo.",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const misPendientes = async (req, res) => {
  try {
    const ctx = await cargarContexto();
    const resultado = crearMisPendientesData(ctx, req);

    return res.json(resultado);
  } catch (error) {
    console.error("ERROR MIS PENDIENTES:", error);
    return res.status(500).json({
      error: "No se pudo cargar Mis pendientes.",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const tiemposOperativos = async (req, res) => {
  try {
    const ctx = await cargarContexto();
    const resultado = crearTiemposOperativosData(ctx);

    return res.json(resultado);
  } catch (error) {
    console.error("ERROR TIEMPOS OPERATIVOS:", error);
    return res.status(500).json({
      error: "No se pudo cargar tiempos operativos.",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const cierreDiario = async (req, res) => {
  try {
    const ctx = await cargarContexto();
    const resultado = crearCierreDiarioData(ctx);

    return res.json(resultado);
  } catch (error) {
    console.error("ERROR CIERRE DIARIO OPERATIVO:", error);
    return res.status(500).json({
      error: "No se pudo cargar cierre diario operativo.",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const revisarProcessGuard = async (req, res) => {
  try {
    const ctx = await cargarContexto();
    const sync = await sincronizarProcessGuard(ctx, true);
    const ctxActualizado = await cargarContexto();
    const resultado = revisionProcessGuardData(ctxActualizado);

    return res.json({
      ...resultado,
      actualizados: sync.actualizados,
      notificaciones_creadas: sync.notificaciones,
      solo_lectura: false,
      generado_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("ERROR PROCESS GUARD:", error);
    return res.status(500).json({
      error: "No se pudo revisar Process Guard",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const revisionFinanzas = async (req, res) => {
  if (!esOwnerAdmin(req)) {
    return res.status(403).json({
      error: "Solo OWNER/ADMIN pueden ver revision de finanzas",
    });
  }
  return responderRevision(revisionFinanzasData, false, "FINANZAS")(req, res);
};

const crearReporte = (tipo) => async (req, res) => {
  try {
    await prepararTablaReportes();
    const ctx = await cargarContexto();
    const data = crearReporteData(ctx, tipo);
    const reporte = await AutomatizacionReporte.create({
      ...data,
      generado_por: usuarioActual(req),
      origen: "AUTOMATIZACION",
    });

    const notificacionesCreadas = await notificarAlertasPrioritarias(data, tipo);
    await crearNotificacionAntiSpam({
      rolesDestino: ["OWNER", "ADMIN", "SUPERVISOR"],
      tipo: "AUTOMATIZACION_REPORTE_GENERADO",
      titulo: data.titulo,
      mensaje: data.resumen,
      accion_url: "/",
      entidad_tipo: "AUTOMATIZACION_REPORTE",
      entidad_id: reporte.id,
      metadata: {
        tipoReporte: tipo,
        origen: "AUTOMATIZACION",
      },
    });

    return res.status(201).json({
      mensaje: "Reporte de automatizacion generado",
      reporte,
      notificaciones_creadas: notificacionesCreadas,
      solo_lectura: true,
    });
  } catch (error) {
    console.error("ERROR CREANDO REPORTE AUTOMATIZACION:", error);
    return res.status(500).json({
      error: "No se pudo generar el reporte",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const obtenerUltimoReporte = async (req, res) => {
  try {
    await prepararTablaReportes();
    const reporte = await AutomatizacionReporte.findOne({
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      reporte,
      solo_lectura: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo obtener el ultimo reporte",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const schedulerStatus = async (req, res) => {
  try {
    return res.json(obtenerEstadoScheduler());
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo obtener el estado del scheduler",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const schedulerRunOnce = async (req, res) => {
  try {
    const summary = await ejecutarRevisionInterna({
      triggeredBy: usuarioActual(req),
    });

    return res.json({
      mensaje: "Revision interna ejecutada",
      summary,
      status: obtenerEstadoScheduler(),
      solo_lectura: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo ejecutar la revision interna",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

module.exports = {
  revisionOperativa,
  reporteApertura: crearReporte("APERTURA_DIA"),
  reporteCierre: crearReporte("CIERRE_DIA"),
  revisionFileService,
  revisionProcessGuard,
  revisarProcessGuard,
  cumplimientoOperativo,
  misPendientes,
  tiemposOperativos,
  cierreDiario,
  guardiaOperativa,
  verificarGuardiaOperativaUsuario: verificarGuardiaOperativaUsuarioService,
  revisionFinanzas,
  revisionMaterialRecuperado,
  obtenerUltimoReporte,
  schedulerStatus,
  schedulerRunOnce,
};
