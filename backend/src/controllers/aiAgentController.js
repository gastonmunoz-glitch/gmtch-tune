const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");

const LIMITE_LECTURA = 600;

const TABLAS = {
  ordenes: "ordenes_trabajo",
  archivos: "archivos_ecu",
  clientes: "clientes",
  vehiculos: "vehiculos",
  bitacora: "bitacora_operativa",
  movimientos: "movimientos_financieros",
  comprobantes: "comprobantes_pago",
  materiales: "materiales_recuperados",
};

const texto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const estado = (valor) => texto(valor).toUpperCase();

const numero = (valor) => {
  const parsed = Number(valor || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const booleano = (valor) =>
  valor === true ||
  valor === 1 ||
  valor === "1" ||
  estado(valor) === "TRUE" ||
  estado(valor) === "SI";

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

const inicioMes = (base = new Date()) => {
  const fecha = new Date(base.getFullYear(), base.getMonth(), 1);
  fecha.setHours(0, 0, 0, 0);
  return fecha;
};

const dentroDesde = (valor, desde) => {
  const fecha = fechaValida(valor);
  return Boolean(fecha && fecha >= desde);
};

const quoteIdent = (tableName) => `"${String(tableName).replace(/"/g, '""')}"`;

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
    console.warn(`AI Agents: no se pudo verificar tabla ${tableName}:`, error.message);
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
    console.warn(`AI Agents: no se pudo leer tabla ${tableName}:`, error.message);
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
  if (estado(orden.estado_pago) !== "PAGADO") return 0;
  const pagado = numero(orden.monto_pagado);
  return pagado > 0 ? pagado : numero(orden.monto_total);
};

const esArchivoActivo = (archivo) => {
  const estadoArchivo = estado(archivo.estado);
  return (
    !booleano(archivo.archivado) &&
    !["FINALIZADO_TECNICO", "FINALIZADO", "ARCHIVADO"].includes(estadoArchivo)
  );
};

const esOrdenExcluida = (orden) =>
  booleano(orden.excluir_estadisticas) ||
  booleano(orden._cliente?.excluir_estadisticas);

const clienteVehiculo = (orden) => {
  const cliente = orden._cliente?.nombre || "Cliente no registrado";
  const vehiculo = [
    orden._vehiculo?.patente,
    orden._vehiculo?.marca,
    orden._vehiculo?.modelo,
  ]
    .filter(Boolean)
    .join(" ");

  return `${cliente} - ${vehiculo || "Vehiculo no registrado"}`;
};

const cargarContexto = async () => {
  const [
    ordenes,
    archivos,
    clientes,
    vehiculos,
    bitacora,
    movimientos,
    comprobantes,
    materiales,
  ] = await Promise.all([
    leerTabla(TABLAS.ordenes),
    leerTabla(TABLAS.archivos),
    leerTabla(TABLAS.clientes),
    leerTabla(TABLAS.vehiculos),
    leerTabla(TABLAS.bitacora, 200),
    leerTabla(TABLAS.movimientos, 300),
    leerTabla(TABLAS.comprobantes, 300),
    leerTabla(TABLAS.materiales, 300),
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

  const archivosOrdenados = ordenarPorFecha(archivos);
  const ordenesPorId = new Map(ordenesEnriquecidas.map((orden) => [Number(orden.id), orden]));
  const archivosEnriquecidos = archivosOrdenados.map((archivo) => ({
    ...archivo,
    _orden: ordenesPorId.get(Number(archivo.ordenId)) || null,
  }));

  return {
    ordenes: ordenesEnriquecidas,
    ordenesReales: ordenesEnriquecidas.filter((orden) => !esOrdenExcluida(orden)),
    archivos: archivosEnriquecidos,
    clientes,
    vehiculos,
    bitacora: ordenarPorFecha(bitacora),
    movimientos: ordenarPorFecha(movimientos),
    comprobantes: ordenarPorFecha(comprobantes),
    materiales: ordenarPorFecha(materiales),
  };
};

const analizarContexto = (ctx) => {
  const ahora = new Date();
  const desdeHoy = inicioDia(ahora);
  const desdeMes = inicioMes(ahora);

  const ordenesActivas = ctx.ordenes.filter((orden) => estado(orden.estado) !== "ENTREGADO");
  const ordenesRealesActivas = ctx.ordenesReales.filter(
    (orden) => estado(orden.estado) !== "ENTREGADO"
  );
  const listasEntrega = ordenesActivas.filter(
    (orden) => estado(orden.estado) === "LISTO_PARA_ENTREGA"
  );
  const pagosPendientes = ordenesRealesActivas.filter(
    (orden) => estado(orden.estado_pago) !== "PAGADO"
  );
  const entregadasHoy = ctx.ordenesReales.filter(
    (orden) =>
      estado(orden.estado) === "ENTREGADO" &&
      (dentroDesde(orden.entregado_at, desdeHoy) || dentroDesde(orden.updatedAt, desdeHoy))
  );
  const clientesPrioritarios = ordenesActivas.filter((orden) =>
    ["VIP", "FLOTA", "TALLER_ALIADO", "GARANTIA_RECLAMO"].includes(
      estado(orden._cliente?.categoria_cliente)
    )
  );

  const correccionesTecnicas = ordenesActivas.filter((orden) => {
    const correccion = estado(orden.correccion_estado);
    return (
      booleano(orden.correccion_cliente_volvio) ||
      (correccion && !["CORRECCION_APLICADA", "CERRADA"].includes(correccion))
    );
  });

  const ordenesAtrasadas = ordenesActivas.filter((orden) => {
    const estadoOrden = estado(orden.estado);
    const horas = horasDesde(orden.updatedAt || orden.createdAt, ahora);
    return (
      (estadoOrden === "RECEPCIONADO" && horas > 2) ||
      (estadoOrden === "PARA_DIAGNOSTICO" && horas > 4) ||
      (estadoOrden === "EN_PROGRAMACION" && horas > 24)
    );
  });

  const mecanicaAsociada = ordenesActivas.filter(
    (orden) => estado(orden.intervencion_fisica_tipo) === "ASOCIADA_SERVICIO_TECNICO"
  );
  const mecanicaIndependiente = ordenesActivas.filter(
    (orden) =>
      estado(orden.intervencion_fisica_tipo) === "MECANICA_INDEPENDIENTE" ||
      ["PARA_MECANICA", "EN_MECANICA"].includes(estado(orden.estado))
  );

  const archivosActivos = ctx.archivos.filter(esArchivoActivo);
  const archivosPostPendiente = archivosActivos.filter((archivo) => {
    const estadoArchivo = estado(archivo.estado);
    const postOk = estado(archivo.post_escritura_estado) === "OK";
    return (
      !postOk &&
      (["MODIFICADO_LISTO", "NOTIFICADO_SLAVE", "POST_ESCRITURA_PENDIENTE"].includes(
        estadoArchivo
      ) ||
        Boolean(archivo.archivo_modificado))
    );
  });
  const archivosCorreccion = archivosActivos.filter(
    (archivo) => booleano(archivo.correccion_pendiente) || estado(archivo.estado) === "REQUIERE_CORRECCION"
  );
  const archivosNuevaLectura = archivosActivos.filter(
    (archivo) => estado(archivo.estado) === "REQUIERE_NUEVA_LECTURA"
  );
  const archivosAtrasados = archivosActivos.filter(
    (archivo) => horasDesde(archivo.createdAt, ahora) > 24
  );
  const archivosModListo = archivosActivos.filter(
    (archivo) => estado(archivo.estado) === "MODIFICADO_LISTO"
  );

  const ventasMes = ctx.ordenesReales
    .filter((orden) => dentroDesde(orden.fecha_pago, desdeMes))
    .reduce((total, orden) => total + montoPagadoOrden(orden), 0);
  const cajaHoy = ctx.ordenesReales
    .filter((orden) => dentroDesde(orden.fecha_pago, desdeHoy))
    .reduce((total, orden) => total + montoPagadoOrden(orden), 0);
  const comprobantesPendientes = ctx.comprobantes.filter(
    (comprobante) => estado(comprobante.estado) === "PENDIENTE_REVISION"
  );
  const movimientosMes = ctx.movimientos.filter((movimiento) =>
    dentroDesde(movimiento.fecha || movimiento.createdAt, desdeMes)
  );
  const ingresosMes = movimientosMes
    .filter((movimiento) => estado(movimiento.tipo) === "INGRESO")
    .reduce((total, movimiento) => total + numero(movimiento.monto), 0);
  const egresosMes = movimientosMes
    .filter((movimiento) => estado(movimiento.tipo) === "EGRESO")
    .reduce((total, movimiento) => total + numero(movimiento.monto), 0);
  const materialMes = ctx.materiales
    .filter((material) => dentroDesde(material.fecha || material.createdAt, desdeMes))
    .reduce((total, material) => total + numero(material.kilos), 0);

  const bitacoraPrioritaria = ctx.bitacora.filter(
    (item) =>
      !booleano(item.resuelto) && ["ALTA", "URGENTE"].includes(estado(item.prioridad))
  );
  const bitacoraAbierta = ctx.bitacora.filter((item) => !booleano(item.resuelto));

  return {
    ahora,
    ordenesActivas,
    ordenesRealesActivas,
    listasEntrega,
    pagosPendientes,
    entregadasHoy,
    clientesPrioritarios,
    correccionesTecnicas,
    ordenesAtrasadas,
    mecanicaAsociada,
    mecanicaIndependiente,
    archivosActivos,
    archivosPostPendiente,
    archivosCorreccion,
    archivosNuevaLectura,
    archivosAtrasados,
    archivosModListo,
    ventasMes,
    cajaHoy,
    comprobantesPendientes,
    ingresosMes,
    egresosMes,
    materialMes,
    bitacoraPrioritaria,
    bitacoraAbierta,
  };
};

const alerta = (nivel, textoAlerta, url = null) => ({
  nivel,
  texto: textoAlerta,
  url,
});

const link = (label, url) => ({ label, url });

const respuestaAgente = ({
  agente,
  resumen,
  alertas = [],
  sugerencias = [],
  accionRecomendada,
  links = [],
  metricas = {},
}) => ({
  agente,
  modo: "deterministico_reglas_v1",
  solo_lectura: true,
  resumen,
  alertas,
  sugerencias,
  accion_recomendada: accionRecomendada,
  accionRecomendada,
  links,
  metricas,
  generado_at: new Date().toISOString(),
});

const crearResumenRecepcion = (ctx, analisis) => {
  const alertas = [];

  if (analisis.listasEntrega.length) {
    alertas.push(
      alerta(
        "atencion",
        `${analisis.listasEntrega.length} orden(es) lista(s) para entrega.`,
        "/ordenes"
      )
    );
  }
  if (analisis.pagosPendientes.length) {
    alertas.push(
      alerta(
        "atencion",
        `${analisis.pagosPendientes.length} orden(es) con pago pendiente.`,
        "/ordenes#pago"
      )
    );
  }
  if (analisis.clientesPrioritarios.length) {
    const orden = analisis.clientesPrioritarios[0];
    alertas.push(
      alerta(
        "critica",
        `Cliente prioritario en fila: ${estado(orden._cliente?.categoria_cliente)} - Orden #${orden.id}.`,
        `/ordenes?ordenId=${orden.id}`
      )
    );
  }

  return respuestaAgente({
    agente: "Asistente Recepcion",
    resumen: `Hay ${analisis.ordenesActivas.length} orden(es) activas, ${analisis.listasEntrega.length} lista(s) para entrega y ${analisis.pagosPendientes.length} pendiente(s) de pago.`,
    alertas,
    sugerencias: [
      "Abrir la fila de trabajo antes de recibir nuevos vehiculos.",
      "Priorizar entregas con pago pendiente antes de mover vehiculos.",
      "Registrar toda recepcion por patente para evitar duplicados.",
    ],
    accionRecomendada:
      analisis.listasEntrega.length > 0
        ? "Revisar ordenes listas para entrega y confirmar cierre comercial."
        : "Mantener recepcion por patente y revisar ordenes activas.",
    links: [link("Ver ordenes", "/ordenes"), link("Nueva recepcion", "/flujo")],
    metricas: {
      ordenes_activas: analisis.ordenesActivas.length,
      listas_entrega: analisis.listasEntrega.length,
      pagos_pendientes: analisis.pagosPendientes.length,
      clientes: ctx.clientes.length,
      vehiculos: ctx.vehiculos.length,
    },
  });
};

const crearAuditoriaOperativa = (_ctx, analisis) => {
  const alertas = [];

  analisis.ordenesAtrasadas.slice(0, 5).forEach((orden) => {
    alertas.push(
      alerta(
        estado(orden.estado) === "EN_PROGRAMACION" ? "critica" : "atencion",
        `Orden #${orden.id} en ${estado(orden.estado)} hace ${Math.floor(
          horasDesde(orden.updatedAt || orden.createdAt, analisis.ahora)
        )}h. ${clienteVehiculo(orden)}.`,
        `/ordenes?ordenId=${orden.id}`
      )
    );
  });

  if (analisis.bitacoraPrioritaria.length) {
    alertas.push(
      alerta(
        "critica",
        `${analisis.bitacoraPrioritaria.length} observacion(es) de bitacora ALTA/URGENTE abierta(s).`,
        "/#bitacora"
      )
    );
  }

  return respuestaAgente({
    agente: "Auditor Operativo",
    resumen: `Detecta ${analisis.ordenesAtrasadas.length} orden(es) con riesgo de tiempo muerto y ${analisis.bitacoraAbierta.length} observacion(es) abiertas.`,
    alertas,
    sugerencias: [
      "Asignar responsable a cada orden que no tenga dueno claro.",
      "Cerrar o resolver observaciones de bitacora antes de terminar el dia.",
      "Usar postventa tecnica cuando un cliente vuelva por DTC.",
    ],
    accionRecomendada:
      analisis.ordenesAtrasadas.length > 0
        ? "Revisar las ordenes atrasadas y definir proxima accion con responsable."
        : "Revisar bitacora y mantener trazabilidad diaria.",
    links: [link("Ver cola de trabajo", "/ordenes"), link("Ver bitacora", "/#bitacora")],
    metricas: {
      ordenes_atrasadas: analisis.ordenesAtrasadas.length,
      bitacora_abierta: analisis.bitacoraAbierta.length,
      bitacora_prioritaria: analisis.bitacoraPrioritaria.length,
      mecanica_asociada: analisis.mecanicaAsociada.length,
      mecanica_independiente: analisis.mecanicaIndependiente.length,
    },
  });
};

const crearAlertasFileService = (_ctx, analisis) => {
  const alertas = [];

  if (analisis.archivosCorreccion.length) {
    alertas.push(
      alerta(
        "critica",
        `${analisis.archivosCorreccion.length} File Service con correccion pendiente.`,
        "/archivos-ecu"
      )
    );
  }
  if (analisis.archivosNuevaLectura.length) {
    alertas.push(
      alerta(
        "critica",
        `${analisis.archivosNuevaLectura.length} caso(s) requieren nueva lectura.`,
        "/portal-admin"
      )
    );
  }
  if (analisis.archivosPostPendiente.length) {
    alertas.push(
      alerta(
        "atencion",
        `${analisis.archivosPostPendiente.length} archivo(s) sin post escritura OK.`,
        "/archivos-ecu#post-escritura"
      )
    );
  }
  if (analisis.archivosAtrasados.length) {
    alertas.push(
      alerta(
        "atencion",
        `${analisis.archivosAtrasados.length} File Service activo(s) por mas de 24h.`,
        "/archivos-ecu"
      )
    );
  }

  return respuestaAgente({
    agente: "Asistente File Service",
    resumen: `Hay ${analisis.archivosActivos.length} File Service activo(s), ${analisis.archivosModListo.length} MOD listo(s) y ${analisis.archivosPostPendiente.length} pendiente(s) de post escritura.`,
    alertas,
    sugerencias: [
      "No finalizar tecnico sin post escritura OK cuando corresponda.",
      "Resolver correcciones antes de cargar nuevos MOD del mismo caso.",
      "Registrar nueva lectura cuando el metodo recibido no sea valido.",
    ],
    accionRecomendada:
      analisis.archivosCorreccion.length > 0
        ? "Resolver correcciones pendientes de File Service."
        : "Revisar MOD listos y post escritura pendiente.",
    links: [link("Ver File Service", "/archivos-ecu"), link("Portal admin", "/portal-admin")],
    metricas: {
      activos: analisis.archivosActivos.length,
      mod_listo: analisis.archivosModListo.length,
      post_escritura_pendiente: analisis.archivosPostPendiente.length,
      correcciones: analisis.archivosCorreccion.length,
      nueva_lectura: analisis.archivosNuevaLectura.length,
    },
  });
};

const crearResumenFinanzas = (_ctx, analisis) => {
  const margen = analisis.ingresosMes - analisis.egresosMes;
  const alertas = [];

  if (analisis.comprobantesPendientes.length) {
    alertas.push(
      alerta(
        "atencion",
        `${analisis.comprobantesPendientes.length} comprobante(s) pendiente(s) de revision.`,
        "/finanzas"
      )
    );
  }
  if (analisis.pagosPendientes.length) {
    alertas.push(
      alerta(
        "atencion",
        `${analisis.pagosPendientes.length} orden(es) reales con pago pendiente.`,
        "/ordenes#pago"
      )
    );
  }

  return respuestaAgente({
    agente: "Asistente Finanzas",
    resumen: `Caja hoy ${analisis.cajaHoy.toLocaleString("es-CL")} CLP. Ingresos mes ${analisis.ingresosMes.toLocaleString("es-CL")} CLP y egresos mes ${analisis.egresosMes.toLocaleString("es-CL")} CLP.`,
    alertas,
    sugerencias: [
      "Validar comprobantes antes de considerar caja como definitiva.",
      "Mantener ventas pagadas separadas de presupuestos o pendientes.",
      "Usar este resumen como apoyo operativo, no como contabilidad formal.",
    ],
    accionRecomendada:
      analisis.comprobantesPendientes.length > 0
        ? "Revisar comprobantes pendientes en Finanzas."
        : "Revisar ordenes con pago pendiente antes de entrega.",
    links: [link("Ver Finanzas", "/finanzas"), link("Ver pagos pendientes", "/ordenes#pago")],
    metricas: {
      caja_hoy: analisis.cajaHoy,
      ventas_mes_pagadas: analisis.ventasMes,
      ingresos_mes: analisis.ingresosMes,
      egresos_mes: analisis.egresosMes,
      margen_operativo_mes: margen,
      comprobantes_pendientes: analisis.comprobantesPendientes.length,
      material_kg_mes: analisis.materialMes,
    },
  });
};

const crearGerenteDiario = (ctx, analisis) => {
  const puntosCriticos =
    analisis.correccionesTecnicas.length +
    analisis.archivosCorreccion.length +
    analisis.archivosNuevaLectura.length +
    analisis.ordenesAtrasadas.filter((orden) => estado(orden.estado) === "EN_PROGRAMACION")
      .length;

  const alertas = [];
  if (puntosCriticos > 0) {
    alertas.push(
      alerta(
        "critica",
        `${puntosCriticos} punto(s) critico(s) requieren decision de jefatura.`,
        "/"
      )
    );
  }
  if (analisis.listasEntrega.length && analisis.pagosPendientes.length) {
    alertas.push(
      alerta(
        "atencion",
        "Hay vehiculos listos para entrega con pagos pendientes por revisar.",
        "/ordenes#entrega"
      )
    );
  }

  const sugerencias = [
    "Abrir el dia revisando correcciones, post escritura y pagos pendientes.",
    "Confirmar responsables en trabajos con cliente prioritario.",
    "Cerrar bitacora prioritaria antes de iniciar nuevos trabajos no urgentes.",
  ];

  return respuestaAgente({
    agente: "Gerente Diario GMTCH",
    resumen: `Operacion con ${analisis.ordenesActivas.length} orden(es) activa(s), ${analisis.archivosActivos.length} File Service activo(s), ${analisis.correccionesTecnicas.length} postventa(s) tecnica(s) y ${analisis.bitacoraPrioritaria.length} bitacora(s) prioritaria(s).`,
    alertas,
    sugerencias,
    accionRecomendada:
      puntosCriticos > 0
        ? "Resolver primero correcciones, nueva lectura y ordenes atrasadas."
        : "Mantener flujo normal y revisar entregas/pagos del dia.",
    links: [
      link("Centro de mando", "/"),
      link("Ordenes", "/ordenes"),
      link("File Service", "/archivos-ecu"),
      link("Finanzas", "/finanzas"),
    ],
    metricas: {
      clientes: ctx.clientes.length,
      vehiculos: ctx.vehiculos.length,
      ordenes_activas: analisis.ordenesActivas.length,
      file_service_activos: analisis.archivosActivos.length,
      correcciones_tecnicas: analisis.correccionesTecnicas.length,
      puntos_criticos: puntosCriticos,
    },
  });
};

const ejecutarAgente = (creador) => async (req, res) => {
  try {
    const ctx = await cargarContexto();
    const analisis = analizarContexto(ctx);
    return res.json(creador(ctx, analisis));
  } catch (error) {
    console.error("Error en AI Agent V1:", error);
    return res.status(500).json({
      error: "No se pudo generar el resumen de Agentes IA",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

module.exports = {
  resumenOperativo: ejecutarAgente(crearResumenRecepcion),
  auditoriaDia: ejecutarAgente(crearAuditoriaOperativa),
  fileServiceAlertas: ejecutarAgente(crearAlertasFileService),
  finanzasResumen: ejecutarAgente(crearResumenFinanzas),
  gerenteDiario: ejecutarAgente(crearGerenteDiario),
};
