const { Op, QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const { AutomatizacionReporte, Notificacion } = require("../models");
const { crearNotificacionesInternas } = require("./notificacionController");

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

const revisionOperativaData = (ctx) => {
  const base = crearRevisionBase(ctx);
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
      correcciones_tecnicas: base.correccionesTecnicas.length,
      bitacoras_prioritarias: base.bitacorasPrioritarias.length,
      comprobantes_pendientes: base.comprobantesPendientes.length,
      material_fuera_rango: base.materialesFueraRango.length,
    },
  };
};

const revisionFileServiceData = (ctx) => {
  const base = crearRevisionBase(ctx);
  const alertas = [];

  [
    ["archivos-sin-revisar", "Archivos sin revisar", base.archivosSinRevisar, "MEDIA", "/archivos-ecu"],
    ["mod-listo", "MOD listo / notificado", base.modListo, "MEDIA", "/archivos-ecu"],
    ["post-pendiente", "Post escritura pendiente", base.postEscrituraPendiente, "ALTA", "/archivos-ecu#post-escritura"],
    ["correccion-pendiente", "Correcciones pendientes", base.archivosCorreccion, "URGENTE", "/archivos-ecu#correccion"],
    ["nueva-lectura", "Nueva lectura requerida", base.nuevaLectura, "URGENTE", "/portal-admin#nueva-lectura"],
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
        ]
      : [...revision.alertas.slice(0, 8), ...file.alertas.slice(0, 4)];

  return {
    tipo,
    titulo:
      tipo === "CIERRE_DIA"
        ? "Reporte cierre del dia GMTCH"
        : "Reporte apertura del dia GMTCH",
    resumen:
      tipo === "CIERRE_DIA"
        ? `Cierre: ${cerradasHoy.length} orden(es) entregada(s) hoy, ${base.ordenesActivas.length} activa(s), ${base.bitacorasAbiertas.length} bitacora(s) abierta(s).`
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
      bitacoras_abiertas: base.bitacorasAbiertas.length,
      material_kg_mes: material.metricas.kg_real_mes,
      cerradas_hoy: cerradasHoy.length,
      finanzas: finanzas.metricas,
    },
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
  metadata = {},
}) => {
  try {
    const desde = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const where = {
      tipo,
      createdAt: {
        [Op.gte]: desde,
      },
    };

    if (entidad_tipo) where.entidad_tipo = entidad_tipo;
    if (entidad_id !== null && entidad_id !== undefined) where.entidad_id = String(entidad_id);

    const existente = await Notificacion.count({ where });
    if (existente > 0) return false;

    await crearNotificacionesInternas({
      rolesDestino,
      tipo,
      titulo,
      mensaje,
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

module.exports = {
  revisionOperativa,
  reporteApertura: crearReporte("APERTURA_DIA"),
  reporteCierre: crearReporte("CIERRE_DIA"),
  revisionFileService,
  revisionFinanzas,
  revisionMaterialRecuperado,
  obtenerUltimoReporte,
};
