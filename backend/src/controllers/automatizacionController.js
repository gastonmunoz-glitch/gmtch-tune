const { Op, QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const { AutomatizacionReporte, Notificacion } = require("../models");
const { crearNotificacionesInternas } = require("./notificacionController");
const {
  prepararColumnasArchivoECU,
  calcularProcessGuardArchivo,
} = require("./archivoECUController");
const {
  obtenerEstadoScheduler,
  ejecutarRevisionInterna,
} = require("../services/internalScheduler");

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
};

const LIMITE_LECTURA = 800;
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

  try {
    return await sequelize.query(
      `SELECT * FROM ${quoteIdent(tableName)} LIMIT :limit`,
      {
        replacements: { limit },
        type: QueryTypes.SELECT,
      }
    );
  } catch (error) {
    console.warn(`Automatizaciones: no se pudo leer ${tableName}:`, error.message);
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
  const ordenesActivas = ctx.ordenes.filter((orden) => upper(orden.estado) !== "ENTREGADO");
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
    const postOk = upper(archivo.post_escritura_estado) === "OK";
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
    (orden) => upper(orden.estado) !== "ENTREGADO" && upper(orden.estado_pago) !== "PAGADO"
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

const agregarPendienteUsuario = (usuarios, username, campo, cantidad = 1) => {
  const nombre = limpiarTexto(username) || "Sin responsable";
  if (!usuarios[nombre]) {
    usuarios[nombre] = {
      username: nombre,
      ordenes_pendientes: 0,
      file_service_pendientes: 0,
      material_pendiente: 0,
      recepciones_emergencia: 0,
      cobros_pendientes_asociados: 0,
      detalles: [],
    };
  }

  usuarios[nombre][campo] = numero(usuarios[nombre][campo]) + cantidad;
  return usuarios[nombre];
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

  const ordenesActivas = ctx.ordenes.filter(
    (orden) => upper(orden.estado) !== "ENTREGADO" && !booleano(orden.archivada)
  );
  const archivosActivos = ctx.archivos.filter(esArchivoActivo);

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
        item.responsable,
        "material_pendiente"
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

      if (!fotosOrden.length) pendientes.push("SIN_FOTOS");
      if (!itemsOrden.length) pendientes.push("SIN_ITEMS");
      if (!limpiarTexto(orden.feedback_por) && !limpiarTexto(orden.feedback_operario)) {
        pendientes.push("SIN_FEEDBACK");
      }
      if (materialPendienteOrden.length) pendientes.push("MATERIAL_PENDIENTE");
      if (upper(orden.estado) === "LISTO_PARA_ENTREGA" && upper(orden.estado_pago) !== "PAGADO") {
        pendientes.push("PAGO_PENDIENTE_LISTO_ENTREGA");
      }
      if (emergencia) pendientes.push("RECEPCION_EMERGENCIA");

      if (!pendientes.length) return null;

      const responsables = {
        diagnostico_asignado_a: orden.diagnostico_asignado_a || null,
        operador_ecu_asignado_a: orden.operador_ecu_asignado_a || null,
        mecanico_asignado_a: orden.mecanico_asignado_a || null,
        supervisor_asignado_a: orden.supervisor_asignado_a || null,
      };
      const usuariosOrden = [
        orden.recepcionado_por,
        orden.operador_ecu_asignado_a,
        orden.mecanico_asignado_a,
        orden.supervisor_asignado_a,
      ].filter(Boolean);

      if (!usuariosOrden.length) usuariosOrden.push("Sin responsable");

      usuariosOrden.forEach((username) => {
        const usuario = agregarPendienteUsuario(
          usuariosPendientes,
          username,
          "ordenes_pendientes"
        );
        usuario.detalles.push(`Orden #${ordenId}: ${pendientes.join(", ")}`);
      });

      if (emergencia) {
        const usuario = agregarPendienteUsuario(
          usuariosPendientes,
          orden.recepcionado_por,
          "recepciones_emergencia"
        );
        usuario.detalles.push(`Recepcion emergencia Orden #${ordenId}`);
      }

      if (pendientes.includes("PAGO_PENDIENTE_LISTO_ENTREGA")) {
        const usuario = agregarPendienteUsuario(
          usuariosPendientes,
          orden.recepcionado_por || "RECEPCION",
          "cobros_pendientes_asociados"
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
        responsables,
        diagnosticos_count: diagnosticosOrden.length,
        pendientes,
      };
    })
    .filter(Boolean);

  const file_service_pendiente = archivosActivos
    .map((archivo) => {
      const pendientes = [];
      const estadoArchivo = upper(archivo.estado);
      const postOk = upper(archivo.post_escritura_estado) === "OK";
      const activoMas24h = horasDesde(archivo.updatedAt || archivo.createdAt, ahora) > 24;

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

      if (!pendientes.length) return null;

      const responsable =
        limpiarTexto(
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

  return {
    generado_at: new Date().toISOString(),
    resumen,
    ordenes_con_pendientes: ordenes_con_pendientes.slice(0, 100),
    file_service_pendiente: file_service_pendiente.slice(0, 100),
    material_pendiente: material_pendiente.slice(0, 100),
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
  revisionFinanzas,
  revisionMaterialRecuperado,
  obtenerUltimoReporte,
  schedulerStatus,
  schedulerRunOnce,
};
