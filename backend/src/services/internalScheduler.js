const { Op, QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const { AutomatizacionReporte, Notificacion } = require("../models");
const { crearNotificacionesInternas } = require("../controllers/notificacionController");
const {
  prepararColumnasArchivoECU,
  calcularProcessGuardArchivo,
} = require("../controllers/archivoECUController");

const DOS_HORAS_MS = 2 * 60 * 60 * 1000;

const estadoScheduler = {
  enabled: false,
  intervalMinutes: 10,
  startDelaySeconds: 30,
  startedAt: null,
  lastRunAt: null,
  lastRunSummary: null,
  nextRunEstimate: null,
  running: false,
  timer: null,
  startTimer: null,
};

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const upper = (valor) => limpiarTexto(valor).toUpperCase();

const numeroSeguro = (valor, fallback) => {
  const parsed = Number(valor);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

const quoteIdent = (valor) => `"${String(valor).replace(/"/g, '""')}"`;

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
    console.warn(`[scheduler] No se pudo verificar tabla ${tableName}:`, error.message);
    return false;
  }
};

const leerTabla = async (tableName, limit = 800) => {
  if (!(await tablaExiste(tableName))) return [];

  try {
    return await sequelize.query(`SELECT * FROM ${quoteIdent(tableName)} LIMIT :limit`, {
      replacements: { limit },
      type: QueryTypes.SELECT,
    });
  } catch (error) {
    console.warn(`[scheduler] No se pudo leer tabla ${tableName}:`, error.message);
    return [];
  }
};

const archivoActivo = (archivo) => {
  const estado = upper(archivo.estado);
  return (
    !booleano(archivo.archivado) &&
    !["FINALIZADO_TECNICO", "FINALIZADO", "ARCHIVADO"].includes(estado)
  );
};

const alerta = ({
  modulo,
  tipo,
  titulo,
  mensaje,
  prioridad = "MEDIA",
  rolesDestino = ["OWNER", "ADMIN", "SUPERVISOR"],
  accion_url = "/",
  entidad_tipo = "AUTOMATIZACION",
  entidad_id = null,
  ordenId = null,
  archivoECUId = null,
  metadata = {},
  unaVezPorNivel = false,
}) => ({
  modulo,
  tipo,
  titulo,
  mensaje,
  prioridad,
  rolesDestino,
  accion_url,
  entidad_tipo,
  entidad_id: entidad_id === null || entidad_id === undefined ? null : String(entidad_id),
  ordenId,
  archivoECUId,
  metadata,
  unaVezPorNivel,
});

const alertaYaExiste = async ({ tipo, entidad_tipo, entidad_id, unaVezPorNivel }) => {
  const where = { tipo };
  if (entidad_tipo) where.entidad_tipo = entidad_tipo;
  if (entidad_id !== null && entidad_id !== undefined) where.entidad_id = String(entidad_id);

  if (!unaVezPorNivel) {
    where.createdAt = { [Op.gte]: new Date(Date.now() - DOS_HORAS_MS) };
  }

  try {
    const cantidad = await Notificacion.count({ where });
    return cantidad > 0;
  } catch (error) {
    console.warn("[scheduler] anti-spam no pudo consultar notificaciones:", error.message);
    return false;
  }
};

const crearNotificacionScheduler = async (item) => {
  try {
    await Notificacion.sync();

    const existe = await alertaYaExiste(item);
    if (existe) return false;

    await crearNotificacionesInternas({
      rolesDestino: item.rolesDestino,
      tipo: item.tipo,
      titulo: item.titulo,
      mensaje: item.mensaje,
      ordenId: item.ordenId,
      archivoECUId: item.archivoECUId,
      accion_url: item.accion_url,
      accion_tipo: "ABRIR_ALERTA_SCHEDULER",
      entidad_tipo: item.entidad_tipo,
      entidad_id: item.entidad_id,
      metadata: {
        ...item.metadata,
        origen: "SCHEDULER_INTERNO",
        prioridad: item.prioridad,
      },
    });

    return true;
  } catch (error) {
    console.warn("[scheduler] No se pudo crear notificacion:", error.message);
    return false;
  }
};

const detectarProcessGuard = async (ctx) => {
  await prepararColumnasArchivoECU();
  const ahora = new Date();

  return ctx.archivos
    .map((archivo) => {
      const evaluacion = calcularProcessGuardArchivo(archivo, ahora);
      const estado = upper(evaluacion.estado);
      const visible = !["SIN_RIESGO", "CERRADO"].includes(estado);

      if (!visible) return null;

      return alerta({
        modulo: "Process Guard",
        tipo: `PROCESS_GUARD_${estado}`,
        titulo:
          estado === "ESCALADO"
            ? "Process Guard escalado"
            : estado === "CRITICO"
            ? "Process Guard critico"
            : "Process Guard requiere cierre tecnico",
        mensaje: `File Service #${archivo.id}: ${evaluacion.motivo}. Lleva ${(
          evaluacion.minutos / 60
        ).toFixed(1)}h sin cierre tecnico.`,
        prioridad: ["CRITICO", "ESCALADO"].includes(estado)
          ? "URGENTE"
          : estado === "ADVERTENCIA"
          ? "ALTA"
          : "MEDIA",
        rolesDestino:
          estado === "ESCALADO"
            ? ["OWNER", "SUPERVISOR"]
            : ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_ECU", "TUNER"],
        accion_url: `/archivos-ecu?archivoId=${archivo.id}#post-escritura`,
        entidad_tipo: "ARCHIVO_ECU",
        entidad_id: archivo.id,
        ordenId: archivo.ordenId,
        archivoECUId: archivo.id,
        unaVezPorNivel: true,
        metadata: {
          proceso_guard: true,
          estado,
          minutos: Math.round(evaluacion.minutos),
          sonido: ["CRITICO", "ESCALADO"].includes(estado) ? "tsunami" : "fuerte",
        },
      });
    })
    .filter(Boolean);
};

const detectarFileServicePendiente = (ctx) =>
  ctx.archivos
    .filter((archivo) => archivoActivo(archivo))
    .filter((archivo) => {
      const estado = upper(archivo.estado);
      return ["ORIGINAL_CARGADO", "NOTIFICADO_MASTER"].includes(estado);
    })
    .filter((archivo) => horasDesde(archivo.updatedAt || archivo.createdAt) >= 1)
    .map((archivo) =>
      alerta({
        modulo: "File Service",
        tipo: "SCHEDULER_FILE_SERVICE_PENDIENTE",
        titulo: "File Service pendiente de avance",
        mensaje: `File Service #${archivo.id} tiene archivo original sin avance hace mas de 1h.`,
        prioridad: "ALTA",
        rolesDestino: ["OWNER", "ADMIN", "SUPERVISOR", "TUNER", "OPERADOR_ECU"],
        accion_url: `/archivos-ecu?archivoId=${archivo.id}`,
        entidad_tipo: "ARCHIVO_ECU",
        entidad_id: archivo.id,
        ordenId: archivo.ordenId,
        archivoECUId: archivo.id,
      })
    );

const detectarPostventa = (ctx) =>
  ctx.ordenes
    .filter((orden) => upper(orden.estado) !== "ENTREGADO")
    .filter((orden) => {
      const estado = upper(orden.correccion_estado);
      return (
        booleano(orden.correccion_cliente_volvio) ||
        (estado && !["CORRECCION_APLICADA", "CERRADA"].includes(estado))
      );
    })
    .map((orden) =>
      alerta({
        modulo: "Postventa tecnica",
        tipo: "SCHEDULER_POSTVENTA_ABIERTA",
        titulo: "Postventa tecnica abierta",
        mensaje: `Orden #${orden.id} tiene correccion/postventa tecnica pendiente.`,
        prioridad: upper(orden.correccion_prioridad) === "URGENTE" ? "URGENTE" : "ALTA",
        rolesDestino: ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_ECU", "TUNER"],
        accion_url: `/ordenes?ordenId=${orden.id}#postventa`,
        entidad_tipo: "ORDEN_TRABAJO",
        entidad_id: orden.id,
        ordenId: orden.id,
      })
    );

const detectarBitacoraCritica = (ctx) =>
  ctx.bitacora
    .filter((item) => !booleano(item.resuelto))
    .filter((item) => ["ALTA", "URGENTE"].includes(upper(item.prioridad)))
    .map((item) =>
      alerta({
        modulo: "Bitacora",
        tipo: "SCHEDULER_BITACORA_PRIORITARIA",
        titulo: "Bitacora prioritaria abierta",
        mensaje: `${item.titulo || "Observacion operativa"} sigue abierta.`,
        prioridad: upper(item.prioridad) === "URGENTE" ? "URGENTE" : "ALTA",
        rolesDestino: ["OWNER", "ADMIN", "SUPERVISOR"],
        accion_url: "/#bitacora",
        entidad_tipo: "BITACORA_OPERATIVA",
        entidad_id: item.id,
        metadata: {
          bitacoraId: item.id,
        },
      })
    );

const detectarPagosBloqueantes = (ctx) =>
  ctx.ordenes
    .filter((orden) => upper(orden.estado) === "LISTO_PARA_ENTREGA")
    .filter((orden) => upper(orden.estado_pago) !== "PAGADO")
    .map((orden) =>
      alerta({
        modulo: "Pagos",
        tipo: "SCHEDULER_PAGO_BLOQUEA_ENTREGA",
        titulo: "Pago bloquea entrega",
        mensaje: `Orden #${orden.id} esta lista para entrega, pero el pago no esta confirmado.`,
        prioridad: "ALTA",
        rolesDestino: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
        accion_url: `/ordenes?ordenId=${orden.id}#pago`,
        entidad_tipo: "ORDEN_TRABAJO",
        entidad_id: orden.id,
        ordenId: orden.id,
        metadata: {
          comercial: true,
        },
      })
    );

const detectarComprobantesPendientes = (ctx) =>
  ctx.comprobantes
    .filter((item) => upper(item.estado) === "PENDIENTE_REVISION")
    .map((item) =>
      alerta({
        modulo: "Finanzas",
        tipo: "SCHEDULER_COMPROBANTE_PENDIENTE",
        titulo: "Comprobante pendiente de revision",
        mensaje: `Comprobante #${item.id} requiere validacion administrativa.`,
        prioridad: "ALTA",
        rolesDestino: ["OWNER", "ADMIN"],
        accion_url: "/finanzas?tab=comprobantes",
        entidad_tipo: "COMPROBANTE_PAGO",
        entidad_id: item.id,
        ordenId: item.ordenId || null,
        metadata: {
          finanzas: true,
        },
      })
    );

const cargarContextoScheduler = async () => {
  const [archivos, ordenes, bitacora, comprobantes] = await Promise.all([
    leerTabla("archivos_ecu"),
    leerTabla("ordenes_trabajo"),
    leerTabla("bitacora_operativa", 400),
    leerTabla("comprobantes_pago", 400),
  ]);

  return {
    archivos,
    ordenes,
    bitacora,
    comprobantes,
  };
};

const prioridadGeneral = (alertas) => {
  if (alertas.some((item) => upper(item.prioridad) === "URGENTE")) return "URGENTE";
  if (alertas.some((item) => upper(item.prioridad) === "ALTA")) return "ALTA";
  if (alertas.some((item) => upper(item.prioridad) === "MEDIA")) return "MEDIA";
  return "BAJA";
};

const guardarReporteScheduler = async (summary, alertas) => {
  if (!alertas.length) return null;

  try {
    await AutomatizacionReporte.sync();
    return await AutomatizacionReporte.create({
      tipo: "SCHEDULER_INTERNO",
      titulo: "Scheduler interno GMTCH",
      resumen: summary.resumen,
      prioridad: summary.prioridad,
      alertas: alertas.slice(0, 80).map((item) => ({
        modulo: item.modulo,
        tipo: item.tipo,
        titulo: item.titulo,
        mensaje: item.mensaje,
        prioridad: item.prioridad,
        accion_url: item.accion_url,
        entidad_tipo: item.entidad_tipo,
        entidad_id: item.entidad_id,
      })),
      sugerencias: [
        "Revisar alertas accionables desde campana o Centro de Mando.",
        "No cerrar procesos ni pagos sin validacion humana.",
      ],
      metricas: summary.metricas,
      accion_url: "/",
      generado_por: summary.triggeredBy || "scheduler",
      origen: "SCHEDULER_INTERNO",
    });
  } catch (error) {
    console.warn("[scheduler] No se pudo guardar reporte:", error.message);
    return null;
  }
};

const ejecutarRevisionInterna = async ({ triggeredBy = "scheduler" } = {}) => {
  if (estadoScheduler.running) {
    return {
      skipped: true,
      reason: "scheduler_running",
      resumen: "Revision omitida: ciclo anterior aun en ejecucion.",
    };
  }

  estadoScheduler.running = true;
  const inicio = new Date();

  try {
    const ctx = await cargarContextoScheduler();
    const modulos = [];
    const alertas = [];

    const ejecutarModulo = async (nombre, fn) => {
      try {
        const resultado = await fn(ctx);
        const items = Array.isArray(resultado) ? resultado : [];
        alertas.push(...items);
        modulos.push({ nombre, ok: true, alertas: items.length });
      } catch (error) {
        modulos.push({ nombre, ok: false, error: error.message, alertas: 0 });
        console.warn(`[scheduler] Modulo ${nombre} fallo:`, error.message);
      }
    };

    await ejecutarModulo("process_guard", detectarProcessGuard);
    await ejecutarModulo("file_service", detectarFileServicePendiente);
    await ejecutarModulo("postventa", detectarPostventa);
    await ejecutarModulo("bitacora", detectarBitacoraCritica);
    await ejecutarModulo("pagos", detectarPagosBloqueantes);
    await ejecutarModulo("comprobantes", detectarComprobantesPendientes);

    let notificacionesCreadas = 0;
    for (const item of alertas) {
      const creada = await crearNotificacionScheduler(item);
      if (creada) notificacionesCreadas += 1;
    }

    const summary = {
      triggeredBy,
      startedAt: inicio.toISOString(),
      finishedAt: new Date().toISOString(),
      totalAlertas: alertas.length,
      notificacionesCreadas,
      prioridad: prioridadGeneral(alertas),
      modulos,
      metricas: {
        process_guard: alertas.filter((item) => item.modulo === "Process Guard").length,
        file_service: alertas.filter((item) => item.modulo === "File Service").length,
        postventa: alertas.filter((item) => item.modulo === "Postventa tecnica").length,
        bitacora: alertas.filter((item) => item.modulo === "Bitacora").length,
        pagos: alertas.filter((item) => item.modulo === "Pagos").length,
        comprobantes: alertas.filter((item) => item.modulo === "Finanzas").length,
      },
      resumen:
        alertas.length === 0
          ? "Scheduler interno sin alertas criticas en este ciclo."
          : `Scheduler interno detecto ${alertas.length} alerta(s) y creo ${notificacionesCreadas} notificacion(es).`,
    };

    await guardarReporteScheduler(summary, alertas);

    estadoScheduler.lastRunAt = summary.finishedAt;
    estadoScheduler.lastRunSummary = summary;
    estadoScheduler.nextRunEstimate = estadoScheduler.enabled
      ? new Date(Date.now() + estadoScheduler.intervalMinutes * 60 * 1000).toISOString()
      : null;

    console.log(
      `[scheduler] ciclo finalizado: alertas=${summary.totalAlertas}, notificaciones=${summary.notificacionesCreadas}`
    );

    return summary;
  } catch (error) {
    const summary = {
      triggeredBy,
      startedAt: inicio.toISOString(),
      finishedAt: new Date().toISOString(),
      totalAlertas: 0,
      notificacionesCreadas: 0,
      prioridad: "ALTA",
      error: error.message,
      resumen: "Scheduler interno fallo sin detener el servidor.",
    };

    estadoScheduler.lastRunAt = summary.finishedAt;
    estadoScheduler.lastRunSummary = summary;
    console.warn("[scheduler] ciclo fallo:", error.message);
    return summary;
  } finally {
    estadoScheduler.running = false;
  }
};

const obtenerEstadoScheduler = () => ({
  enabled: estadoScheduler.enabled,
  intervalMinutes: estadoScheduler.intervalMinutes,
  startDelaySeconds: estadoScheduler.startDelaySeconds,
  startedAt: estadoScheduler.startedAt,
  lastRunAt: estadoScheduler.lastRunAt,
  lastRunSummary: estadoScheduler.lastRunSummary,
  nextRunEstimate: estadoScheduler.nextRunEstimate,
  running: estadoScheduler.running,
});

const iniciarSchedulerInterno = () => {
  const enabled = String(process.env.ENABLE_INTERNAL_AUTOMATIONS || "false") === "true";
  const intervalMinutes = numeroSeguro(process.env.AUTOMATION_INTERVAL_MINUTES, 10);
  const startDelaySeconds = numeroSeguro(process.env.AUTOMATION_START_DELAY_SECONDS, 30);

  estadoScheduler.enabled = enabled;
  estadoScheduler.intervalMinutes = intervalMinutes;
  estadoScheduler.startDelaySeconds = startDelaySeconds;

  if (!enabled) {
    console.log("[scheduler] desactivado. ENABLE_INTERNAL_AUTOMATIONS no es true.");
    return obtenerEstadoScheduler();
  }

  if (estadoScheduler.timer || estadoScheduler.startTimer) {
    return obtenerEstadoScheduler();
  }

  estadoScheduler.startedAt = new Date().toISOString();
  estadoScheduler.nextRunEstimate = new Date(
    Date.now() + startDelaySeconds * 1000
  ).toISOString();

  estadoScheduler.startTimer = setTimeout(async () => {
    estadoScheduler.startTimer = null;
    await ejecutarRevisionInterna({ triggeredBy: "scheduler_start" });
    estadoScheduler.timer = setInterval(() => {
      ejecutarRevisionInterna({ triggeredBy: "scheduler_interval" }).catch((error) => {
        console.warn("[scheduler] error no controlado:", error.message);
      });
    }, intervalMinutes * 60 * 1000);
  }, startDelaySeconds * 1000);

  console.log(
    `[scheduler] activo. Primer ciclo en ${startDelaySeconds}s, intervalo ${intervalMinutes} min.`
  );

  return obtenerEstadoScheduler();
};

module.exports = {
  iniciarSchedulerInterno,
  obtenerEstadoScheduler,
  ejecutarRevisionInterna,
};
