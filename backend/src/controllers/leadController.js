const { Op } = require("sequelize");
const {
  LeadComercial,
  LeadInteraccion,
  Cliente,
  OrdenTrabajo,
  Vehiculo,
  Notificacion,
} = require("../models");
const { crearNotificacionesInternas } = require("./notificacionController");
const { buscarTarifaParaServicio } = require("./tarifaController");

let tablasPreparadas = false;

const CANALES = [
  "WHATSAPP",
  "INSTAGRAM",
  "WEB",
  "FACEBOOK",
  "PRESENCIAL",
  "REFERIDO",
  "LLAMADA",
  "OTRO",
];

const ESTADOS = [
  "NUEVO",
  "CONTACTADO",
  "CALIFICANDO",
  "POTENCIAL_REAL",
  "COTIZADO",
  "AGENDADO",
  "GANADO",
  "PERDIDO",
  "NO_INTERESADO",
  "SPAM",
];

const PRIORIDADES = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

const SERVICIOS = [
  "DIAGNOSTICO",
  "REVISION_DTC",
  "STAGE_1",
  "STAGE_2",
  "STAGE_3",
  "ECU",
  "TCU",
  "FILE_SERVICE",
  "DPF_FAP",
  "EGR",
  "SCR_ADBLUE",
  "NOX",
  "LAMBDA_O2",
  "TVA",
  "IMMO",
  "VMAX",
  "POPS_BANGS",
  "LAUNCH_CONTROL",
  "HARDCUT",
  "FLOTA",
  "SOPORTE_TALLERES",
  "OTRO",
];

const ROLES_VER_TODO = ["OWNER", "ADMIN", "RECEPCION", "SUPERVISOR"];
const ROLES_VER_ASIGNADO = ["OPERADOR_ECU", "TUNER"];
const ROLES_GESTION = ["OWNER", "ADMIN", "RECEPCION"];
const ROLES_ASIGNAR = ["OWNER", "ADMIN", "RECEPCION", "SUPERVISOR"];

const prepararTablasLeads = async () => {
  if (tablasPreparadas) return;

  await LeadComercial.sync();
  await LeadInteraccion.sync();

  await LeadComercial.sequelize.query(`
    ALTER TABLE "leads_comerciales"
      ADD COLUMN IF NOT EXISTS "resumen_ai" TEXT,
      ADD COLUMN IF NOT EXISTS "score_interes" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "motivo_score" TEXT,
      ADD COLUMN IF NOT EXISTS "proxima_accion" TEXT,
      ADD COLUMN IF NOT EXISTS "proximo_contacto_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "asignado_a" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "convertido_cliente_id" INTEGER,
      ADD COLUMN IF NOT EXISTS "convertido_orden_id" INTEGER,
      ADD COLUMN IF NOT EXISTS "perdido_motivo" TEXT,
      ADD COLUMN IF NOT EXISTS "presupuesto_estimado" INTEGER,
      ADD COLUMN IF NOT EXISTS "presupuesto_bajo" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "datos_minimos_completos" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "tarifa_servicio_id" INTEGER,
      ADD COLUMN IF NOT EXISTS "precio_desde_sugerido" INTEGER,
      ADD COLUMN IF NOT EXISTS "precio_referencia_sugerido" INTEGER
  `);

  await LeadInteraccion.sequelize.query(`
    ALTER TABLE "lead_interacciones"
      ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb
  `);

  tablasPreparadas = true;
};

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const usuarioActual = (req) =>
  req.usuario?.username ||
  req.user?.username ||
  req.usuario?.nombre ||
  req.user?.nombre ||
  "sistema";

const rolActual = (req) => String(req.usuario?.rol || req.user?.rol || "").toUpperCase();

const puedeGestionar = (req) => ROLES_GESTION.includes(rolActual(req));
const puedeAsignar = (req) => ROLES_ASIGNAR.includes(rolActual(req));

const normalizarEnum = (valor, permitidos, defecto) => {
  const normalizado = limpiarTexto(valor || defecto).toUpperCase();
  return permitidos.includes(normalizado) ? normalizado : defecto;
};

const normalizarEnteroOpcional = (valor) => {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
};

const normalizarMontoOpcional = (valor) => {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero) : null;
};

const formatoCLP = (valor) =>
  `$${Number(valor || 0).toLocaleString("es-CL")} CLP`;

const datosMinimosCompletosLead = (lead) =>
  Boolean(
    limpiarTexto(lead.vehiculo_marca) &&
      limpiarTexto(lead.vehiculo_modelo) &&
      limpiarTexto(lead.vehiculo_anio) &&
      limpiarTexto(lead.vehiculo_motor) &&
      normalizarEnum(lead.servicio_interes, SERVICIOS, "OTRO") !== "OTRO"
  );

const obtenerDatosFaltantes = (lead) => {
  const faltantes = [];
  if (!limpiarTexto(lead.vehiculo_marca)) faltantes.push("marca");
  if (!limpiarTexto(lead.vehiculo_modelo)) faltantes.push("modelo");
  if (!limpiarTexto(lead.vehiculo_anio)) faltantes.push("año");
  if (!limpiarTexto(lead.vehiculo_motor)) faltantes.push("motor/cilindrada");
  if (normalizarEnum(lead.servicio_interes, SERVICIOS, "OTRO") === "OTRO") {
    faltantes.push("servicio requerido");
  }
  return faltantes;
};

const enriquecerLeadComercial = async (lead) => {
  const tarifa = await buscarTarifaParaServicio(lead.servicio_interes);
  const presupuesto = normalizarMontoOpcional(lead.presupuesto_estimado);
  const precioMinimo = Number(tarifa?.precio_minimo || 0);
  const presupuestoBajo = Boolean(
    presupuesto !== null && precioMinimo > 0 && presupuesto < precioMinimo
  );

  return {
    tarifa,
    datosMinimosCompletos: datosMinimosCompletosLead(lead),
    datosFaltantes: obtenerDatosFaltantes(lead),
    presupuestoBajo,
    precioMinimo,
    precioDesde: Number(tarifa?.precio_desde || 0),
    precioReferencia: Number(tarifa?.precio_referencia || 0),
  };
};

const normalizarFechaOpcional = (valor) => {
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const normalizarMetadata = (valor) => {
  if (!valor) return {};
  if (typeof valor === "object" && !Array.isArray(valor)) return valor;
  try {
    const parsed = JSON.parse(valor);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
};

const whereVisible = (req) => {
  const rol = rolActual(req);
  if (ROLES_VER_TODO.includes(rol)) return {};
  if (ROLES_VER_ASIGNADO.includes(rol)) {
    return { asignado_a: usuarioActual(req) };
  }
  return { id: null };
};

const textoLead = (lead) =>
  [
    lead.nombre,
    lead.telefono,
    lead.email,
    lead.canal,
    lead.origen_detalle,
    lead.vehiculo_marca,
    lead.vehiculo_modelo,
    lead.vehiculo_anio,
    lead.vehiculo_motor,
    lead.patente,
    lead.servicio_interes,
    lead.mensaje_inicial,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

const calcularScoreLead = (lead, contexto = {}) => {
  let score = 0;
  const motivos = [];
  const texto = textoLead(lead);
  const datosMinimosCompletos =
    contexto.datosMinimosCompletos ?? datosMinimosCompletosLead(lead);

  const tieneVehiculoClaro = Boolean(
    limpiarTexto(lead.vehiculo_marca) ||
      limpiarTexto(lead.vehiculo_modelo) ||
      limpiarTexto(lead.vehiculo_anio) ||
      limpiarTexto(lead.patente)
  );
  if (tieneVehiculoClaro) {
    score += 20;
    motivos.push("+20 vehiculo claro");
  }

  if (datosMinimosCompletos) {
    score += 15;
    motivos.push("+15 datos minimos para cotizar");
  }

  if (normalizarEnum(lead.servicio_interes, SERVICIOS, "OTRO") !== "OTRO") {
    score += 15;
    motivos.push("+15 servicio concreto");
  }

  if (
    texto.includes("SANTIAGO") ||
    texto.includes("LA FLORIDA") ||
    texto.includes("VICENTE") ||
    texto.includes("VALDES") ||
    texto.includes("VALDÉS")
  ) {
    score += 15;
    motivos.push("+15 ubicacion/visita posible");
  }

  if (
    texto.includes("AGENDAR") ||
    texto.includes("AGENDA") ||
    texto.includes("HORA") ||
    texto.includes("LLEVAR") ||
    texto.includes("VOY") ||
    texto.includes("MAÑANA") ||
    texto.includes("MANANA")
  ) {
    score += 20;
    motivos.push("+20 intencion de agenda");
  }

  if (limpiarTexto(lead.patente) || limpiarTexto(lead.vehiculo_motor)) {
    score += 10;
    motivos.push("+10 patente o motor");
  }

  if (
    normalizarEnum(lead.servicio_interes, SERVICIOS, "OTRO") === "FLOTA" ||
    texto.includes("FLOTA") ||
    texto.includes("TALLER") ||
    texto.includes("MASTER")
  ) {
    score += 10;
    motivos.push("+10 taller/flota");
  }

  const soloPrecio =
    (texto.includes("PRECIO") ||
      texto.includes("CUANTO") ||
      texto.includes("CUÁNTO") ||
      texto.includes("SALE") ||
      texto.includes("VALOR")) &&
    !datosMinimosCompletos;
  if (soloPrecio) {
    score -= 25;
    motivos.push("-25 pregunta precio sin datos minimos");
  }

  if (contexto.presupuestoBajo) {
    score -= 25;
    motivos.push("-25 presupuesto bajo el minimo");
  }

  const aceptaRango =
    contexto.precioDesde > 0 &&
    Number(lead.presupuesto_estimado || 0) >= Number(contexto.precioDesde || 0);
  if (datosMinimosCompletos && aceptaRango) {
    score += 15;
    motivos.push("+15 datos completos y presupuesto compatible");
  }

  const spam =
    texto.includes("SPAM") ||
    texto.includes("CRIPTO") ||
    texto.includes("CASINO") ||
    texto.includes("NO RELACIONADO");
  if (spam) {
    score -= 50;
    motivos.push("-50 spam/no relacionado");
  }

  score = Math.max(0, Math.min(100, score));

  let estado = "CALIFICANDO";
  let prioridad = "MEDIA";
  if (spam) {
    estado = "SPAM";
    prioridad = "BAJA";
  } else if (soloPrecio || !datosMinimosCompletos) {
    estado = "CALIFICANDO";
    prioridad = soloPrecio || contexto.presupuestoBajo ? "BAJA" : "MEDIA";
  } else if (contexto.presupuestoBajo) {
    estado = "CALIFICANDO";
    prioridad = "BAJA";
  } else if (score <= 30) {
    estado = "NO_INTERESADO";
    prioridad = "BAJA";
  } else if (score <= 60) {
    estado = "CALIFICANDO";
    prioridad = "MEDIA";
  } else if (score <= 80) {
    estado = "POTENCIAL_REAL";
    prioridad = "ALTA";
  } else {
    estado = "POTENCIAL_REAL";
    prioridad = "URGENTE";
  }

  return {
    score,
    estado,
    prioridad,
    motivo: motivos.join("; ") || "Sin señales suficientes",
    quiereAgendar: motivos.some((motivo) => motivo.includes("agenda")),
  };
};

const respuestaSugerida = (lead, contexto = {}) => {
  const servicio = normalizarEnum(lead.servicio_interes, SERVICIOS, "OTRO");
  const faltantes = contexto.datosFaltantes || obtenerDatosFaltantes(lead);
  const tarifa = contexto.tarifa || null;
  const precioDesde = Number(tarifa?.precio_desde || contexto.precioDesde || 0);
  const precioReferencia = Number(
    tarifa?.precio_referencia || contexto.precioReferencia || 0
  );
  const requiereEvaluacion =
    tarifa?.requiere_evaluacion !== undefined ? tarifa.requiere_evaluacion : true;

  const partes = ["Hola, gracias por contactar a GMTCH Tune."];

  if (faltantes.length) {
    partes.push(
      `Para orientarte bien necesito estos datos: ${faltantes.join(", ")}.`
    );
  }

  if (precioDesde > 0) {
    partes.push(`Como referencia, este servicio parte desde ${formatoCLP(precioDesde)}.`);
  } else if (precioReferencia > 0) {
    partes.push(
      `Como referencia interna, el valor estimado es ${formatoCLP(precioReferencia)}.`
    );
  }

  if (contexto.presupuestoBajo) {
    partes.push(
      "El presupuesto indicado está bajo el mínimo habitual, pero podemos revisar el caso y explicarte alternativas reales sin comprometer calidad ni trazabilidad."
    );
  }

  if (["DIAGNOSTICO", "REVISION_DTC"].includes(servicio)) {
    partes.push(
      "Podemos partir con diagnóstico profesional y revisión DTC para confirmar la causa antes de cotizar trabajos mayores."
    );
  } else if (["STAGE_1", "STAGE_2", "STAGE_3", "ECU", "TCU"].includes(servicio)) {
    partes.push(
      "Para calibración ECU/TCU revisamos vehículo, motor, estado técnico y objetivo del proyecto."
    );
  } else if (servicio === "FILE_SERVICE") {
    partes.push(
      "Para File Service necesitamos archivo original, método de lectura, herramienta usada y objetivo técnico."
    );
  } else {
    partes.push("Podemos revisar tu caso y orientarte con una evaluación técnica.");
  }

  if (requiereEvaluacion) {
    partes.push(
      "El valor final depende de evaluación técnica, normativa aplicable, uso autorizado y condición real del vehículo."
    );
  }

  partes.push(
    "Estamos en La Florida, Santiago, cerca de Metro Vicente Valdés. WhatsApp oficial: +56 9 6226 7642."
  );
  partes.push("Si te acomoda, envíanos los datos o coordinamos agenda.");

  return partes.join(" ");
};

const payloadLead = (body = {}) => ({
  nombre: limpiarTexto(body.nombre) || "Lead sin nombre",
  telefono: limpiarTexto(body.telefono) || null,
  email: limpiarTexto(body.email).toLowerCase() || null,
  canal: normalizarEnum(body.canal, CANALES, "OTRO"),
  origen_detalle: limpiarTexto(body.origen_detalle) || null,
  estado: normalizarEnum(body.estado, ESTADOS, "NUEVO"),
  prioridad: normalizarEnum(body.prioridad, PRIORIDADES, "MEDIA"),
  vehiculo_marca: limpiarTexto(body.vehiculo_marca) || null,
  vehiculo_modelo: limpiarTexto(body.vehiculo_modelo) || null,
  vehiculo_anio: limpiarTexto(body.vehiculo_anio) || null,
  vehiculo_motor: limpiarTexto(body.vehiculo_motor) || null,
  patente: limpiarTexto(body.patente).toUpperCase() || null,
  servicio_interes: normalizarEnum(body.servicio_interes, SERVICIOS, "OTRO"),
  presupuesto_estimado: normalizarMontoOpcional(body.presupuesto_estimado),
  presupuesto_bajo:
    body.presupuesto_bajo === undefined ? false : Boolean(body.presupuesto_bajo),
  datos_minimos_completos:
    body.datos_minimos_completos === undefined
      ? false
      : Boolean(body.datos_minimos_completos),
  tarifa_servicio_id: normalizarEnteroOpcional(body.tarifa_servicio_id),
  precio_desde_sugerido: normalizarMontoOpcional(body.precio_desde_sugerido),
  precio_referencia_sugerido: normalizarMontoOpcional(
    body.precio_referencia_sugerido
  ),
  mensaje_inicial: limpiarTexto(body.mensaje_inicial) || null,
  resumen_ai: limpiarTexto(body.resumen_ai) || null,
  proxima_accion: limpiarTexto(body.proxima_accion) || null,
  proximo_contacto_at: normalizarFechaOpcional(body.proximo_contacto_at),
  asignado_a: limpiarTexto(body.asignado_a) || null,
  perdido_motivo: limpiarTexto(body.perdido_motivo) || null,
});

const notificarLead = async (lead, tipo, titulo, mensaje, extra = {}) => {
  try {
    const existente = await Notificacion.findOne({
      where: {
        tipo,
        entidad_tipo: "LEAD_COMERCIAL",
        entidad_id: String(lead.id),
        createdAt: {
          [Op.gte]: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      },
    });

    if (existente) return;
  } catch {
    // Si la consulta defensiva falla, crearNotificacionesInternas igual maneja errores.
  }

  await crearNotificacionesInternas({
    rolesDestino: ["OWNER", "ADMIN", "RECEPCION", "SUPERVISOR"],
    usuariosDestino: lead.asignado_a ? [lead.asignado_a] : [],
    tipo,
    titulo,
    mensaje,
    accion_url: `/leads?leadId=${lead.id}`,
    accion_tipo: "ABRIR_LEAD_COMERCIAL",
    entidad_tipo: "LEAD_COMERCIAL",
    entidad_id: String(lead.id),
    metadata: {
      leadId: lead.id,
      estado: lead.estado,
      prioridad: lead.prioridad,
      score_interes: lead.score_interes,
      ...extra,
    },
  });
};

const evaluarNotificacionesLead = async (lead, calificacion = null) => {
  const score = Number(lead.score_interes || calificacion?.score || 0);
  const estado = String(lead.estado || calificacion?.estado || "").toUpperCase();
  const texto = textoLead(lead);
  const quiereAgendar =
    calificacion?.quiereAgendar ||
    estado === "AGENDADO" ||
    texto.includes("AGENDAR") ||
    texto.includes("HORA");

  if (score >= 70 || estado === "POTENCIAL_REAL") {
    await notificarLead(
      lead,
      "LEAD_POTENCIAL_REAL",
      "Lead comercial potencial real",
      `${lead.nombre} tiene score ${score}. Requiere seguimiento comercial.`
    );
  }

  if (quiereAgendar) {
    await notificarLead(
      lead,
      "LEAD_QUIERE_AGENDAR",
      "Lead quiere agendar",
      `${lead.nombre} muestra intención de agenda.`
    );
  }
};

const obtenerLeads = async (req, res) => {
  try {
    await prepararTablasLeads();

    const where = whereVisible(req);
    const filtros = {};
    ["canal", "estado", "prioridad", "servicio_interes", "asignado_a"].forEach(
      (campo) => {
        if (limpiarTexto(req.query[campo])) {
          filtros[campo] = limpiarTexto(req.query[campo]).toUpperCase();
        }
      }
    );

    const leads = await LeadComercial.findAll({
      where: { ...where, ...filtros },
      include: [{ model: LeadInteraccion, required: false }],
      order: [
        ["updatedAt", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit: Math.min(Number(req.query.limit || 200), 400),
    });

    res.json({ leads });
  } catch (error) {
    console.error("ERROR LISTANDO LEADS:", error);
    res.status(500).json({ error: "No se pudieron listar los leads" });
  }
};

const obtenerLeadPorId = async (req, res) => {
  try {
    await prepararTablasLeads();

    const lead = await LeadComercial.findOne({
      where: { id: req.params.id, ...whereVisible(req) },
      include: [{ model: LeadInteraccion, required: false }],
    });

    if (!lead) return res.status(404).json({ error: "Lead no encontrado" });

    res.json({ lead });
  } catch (error) {
    console.error("ERROR OBTENIENDO LEAD:", error);
    res.status(500).json({ error: "No se pudo obtener el lead" });
  }
};

const crearLead = async (req, res) => {
  try {
    await prepararTablasLeads();

    if (!puedeGestionar(req)) {
      return res.status(403).json({ error: "No tienes permiso para crear leads" });
    }

    const payload = payloadLead(req.body);
    if (!payload.telefono && !payload.email && !payload.mensaje_inicial) {
      return res.status(400).json({
        error: "Debes registrar telefono, email o mensaje inicial del lead.",
      });
    }

    const contexto = await enriquecerLeadComercial(payload);
    const calificacion = calcularScoreLead(payload, contexto);
    const lead = await LeadComercial.create({
      ...payload,
      score_interes: calificacion.score,
      motivo_score: calificacion.motivo,
      datos_minimos_completos: contexto.datosMinimosCompletos,
      presupuesto_bajo: contexto.presupuestoBajo,
      tarifa_servicio_id: contexto.tarifa?.id || null,
      precio_desde_sugerido: contexto.precioDesde || null,
      precio_referencia_sugerido: contexto.precioReferencia || null,
      estado: payload.estado === "NUEVO" ? calificacion.estado : payload.estado,
      prioridad:
        payload.prioridad === "MEDIA" ? calificacion.prioridad : payload.prioridad,
      resumen_ai: respuestaSugerida(payload, contexto),
      proxima_accion:
        contexto.datosFaltantes.length > 0
          ? `Pedir datos faltantes: ${contexto.datosFaltantes.join(", ")}`
          : contexto.presupuestoBajo
          ? "Educar al cliente y explicar rango mínimo antes de cotizar"
          : payload.proxima_accion ||
            (calificacion.score >= 61
              ? "Contactar y ofrecer agenda"
              : "Pedir datos faltantes y calificar"),
    });

    await LeadInteraccion.create({
      leadId: lead.id,
      canal: lead.canal,
      direccion: "ENTRANTE",
      mensaje: lead.mensaje_inicial || "Lead creado manualmente",
      autor: usuarioActual(req),
      metadata: { origen: "CREACION_MANUAL" },
    });

    await evaluarNotificacionesLead(lead, calificacion);

    res.status(201).json({ mensaje: "Lead comercial creado", lead });
  } catch (error) {
    console.error("ERROR CREANDO LEAD:", error);
    res.status(500).json({ error: "No se pudo crear el lead comercial" });
  }
};

const actualizarLead = async (req, res) => {
  try {
    await prepararTablasLeads();

    const soloAsignacion =
      Object.keys(req.body || {}).length > 0 &&
      Object.keys(req.body || {}).every((campo) => campo === "asignado_a");

    if (!puedeGestionar(req) && !(puedeAsignar(req) && soloAsignacion)) {
      return res.status(403).json({ error: "No tienes permiso para editar leads" });
    }

    const lead = await LeadComercial.findOne({
      where: { id: req.params.id, ...whereVisible(req) },
    });

    if (!lead) return res.status(404).json({ error: "Lead no encontrado" });

    const payload = payloadLead({ ...lead.toJSON(), ...req.body });
    const campos = {};
    Object.keys(payload).forEach((campo) => {
      if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
        campos[campo] = payload[campo];
      }
    });

    const recalcularComercial = [
      "vehiculo_marca",
      "vehiculo_modelo",
      "vehiculo_anio",
      "vehiculo_motor",
      "patente",
      "servicio_interes",
      "presupuesto_estimado",
      "mensaje_inicial",
    ].some((campo) => Object.prototype.hasOwnProperty.call(req.body, campo));

    if (recalcularComercial) {
      const contexto = await enriquecerLeadComercial(payload);
      const calificacion = calcularScoreLead(payload, contexto);
      campos.datos_minimos_completos = contexto.datosMinimosCompletos;
      campos.presupuesto_bajo = contexto.presupuestoBajo;
      campos.tarifa_servicio_id = contexto.tarifa?.id || null;
      campos.precio_desde_sugerido = contexto.precioDesde || null;
      campos.precio_referencia_sugerido = contexto.precioReferencia || null;
      campos.score_interes = calificacion.score;
      campos.motivo_score = calificacion.motivo;
      if (!Object.prototype.hasOwnProperty.call(req.body, "resumen_ai")) {
        campos.resumen_ai = respuestaSugerida(payload, contexto);
      }
      if (!Object.prototype.hasOwnProperty.call(req.body, "prioridad")) {
        campos.prioridad = calificacion.prioridad;
      }
      if (!Object.prototype.hasOwnProperty.call(req.body, "estado")) {
        campos.estado = calificacion.estado;
      }
      if (!Object.prototype.hasOwnProperty.call(req.body, "proxima_accion")) {
        campos.proxima_accion = contexto.datosFaltantes.length
          ? `Pedir datos faltantes: ${contexto.datosFaltantes.join(", ")}`
          : contexto.presupuestoBajo
          ? "Educar al cliente y explicar rango mínimo antes de cotizar"
          : calificacion.score >= 61
          ? "Contactar, confirmar datos y proponer agenda"
          : "Pedir datos faltantes antes de cotizar";
      }
    }

    await lead.update(campos);
    await evaluarNotificacionesLead(lead);

    res.json({ mensaje: "Lead actualizado", lead });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO LEAD:", error);
    res.status(500).json({ error: "No se pudo actualizar el lead" });
  }
};

const agregarInteraccion = async (req, res) => {
  try {
    await prepararTablasLeads();

    const lead = await LeadComercial.findOne({
      where: { id: req.params.id, ...whereVisible(req) },
    });

    if (!lead) return res.status(404).json({ error: "Lead no encontrado" });

    if (!puedeGestionar(req) && lead.asignado_a !== usuarioActual(req)) {
      return res.status(403).json({ error: "No tienes permiso para contactar este lead" });
    }

    const mensaje = limpiarTexto(req.body.mensaje);
    if (!mensaje) {
      return res.status(400).json({ error: "Debes escribir una interaccion." });
    }

    const interaccion = await LeadInteraccion.create({
      leadId: lead.id,
      canal: normalizarEnum(req.body.canal || lead.canal, CANALES, "OTRO"),
      direccion: normalizarEnum(
        req.body.direccion,
        ["ENTRANTE", "SALIENTE", "INTERNA"],
        "INTERNA"
      ),
      mensaje,
      autor: usuarioActual(req),
      metadata: normalizarMetadata(req.body.metadata),
    });

    if (lead.estado === "NUEVO" && interaccion.direccion === "SALIENTE") {
      await lead.update({ estado: "CONTACTADO" });
    } else {
      await lead.update({ updatedAt: new Date() });
    }

    res.status(201).json({ mensaje: "Interaccion registrada", interaccion });
  } catch (error) {
    console.error("ERROR AGREGANDO INTERACCION:", error);
    res.status(500).json({ error: "No se pudo registrar la interaccion" });
  }
};

const calificarLead = async (req, res) => {
  try {
    await prepararTablasLeads();

    if (!puedeGestionar(req)) {
      return res.status(403).json({ error: "No tienes permiso para calificar leads" });
    }

    const lead = await LeadComercial.findOne({
      where: { id: req.params.id, ...whereVisible(req) },
    });

    if (!lead) return res.status(404).json({ error: "Lead no encontrado" });

    const base = { ...lead.toJSON(), ...req.body };
    const contexto = await enriquecerLeadComercial(base);
    const calificacion = calcularScoreLead(base, contexto);

    await lead.update({
      score_interes: calificacion.score,
      motivo_score: calificacion.motivo,
      estado: calificacion.estado,
      prioridad: calificacion.prioridad,
      resumen_ai: respuestaSugerida(base, contexto),
      datos_minimos_completos: contexto.datosMinimosCompletos,
      presupuesto_bajo: contexto.presupuestoBajo,
      tarifa_servicio_id: contexto.tarifa?.id || null,
      precio_desde_sugerido: contexto.precioDesde || null,
      precio_referencia_sugerido: contexto.precioReferencia || null,
      proxima_accion:
        contexto.datosFaltantes.length > 0
          ? `Pedir datos faltantes: ${contexto.datosFaltantes.join(", ")}`
          : contexto.presupuestoBajo
          ? "Educar al cliente y explicar rango mínimo antes de cotizar"
          : calificacion.score >= 61
          ? "Contactar, confirmar datos y proponer agenda"
          : "Pedir datos faltantes antes de cotizar",
    });

    await LeadInteraccion.create({
      leadId: lead.id,
      canal: "OTRO",
      direccion: "INTERNA",
      mensaje: `Lead calificado: score ${calificacion.score}. ${calificacion.motivo}`,
      autor: usuarioActual(req),
      metadata: { score: calificacion.score, estado: calificacion.estado },
    });

    await evaluarNotificacionesLead(lead, calificacion);

    res.json({
      mensaje: "Lead calificado",
      lead,
      calificacion,
      sugerencia_respuesta: respuestaSugerida(lead, contexto),
    });
  } catch (error) {
    console.error("ERROR CALIFICANDO LEAD:", error);
    res.status(500).json({ error: "No se pudo calificar el lead" });
  }
};

const convertirCliente = async (req, res) => {
  try {
    await prepararTablasLeads();

    if (!puedeGestionar(req)) {
      return res.status(403).json({ error: "No tienes permiso para convertir leads" });
    }

    const lead = await LeadComercial.findOne({
      where: { id: req.params.id, ...whereVisible(req) },
    });

    if (!lead) return res.status(404).json({ error: "Lead no encontrado" });

    if (lead.convertido_cliente_id) {
      const clienteExistente = await Cliente.findByPk(lead.convertido_cliente_id);
      return res.json({
        mensaje: "Lead ya convertido a cliente",
        cliente: clienteExistente,
        lead,
      });
    }

    const cliente = await Cliente.create({
      nombre: lead.nombre,
      telefono: lead.telefono,
      email: lead.email,
      categoria_cliente:
        lead.servicio_interes === "FLOTA" ? "FLOTA" : "NORMAL",
      nota_cliente: `Creado desde lead #${lead.id}. Canal: ${lead.canal}. ${lead.mensaje_inicial || ""}`,
    });

    await lead.update({
      convertido_cliente_id: cliente.id,
      estado: lead.estado === "GANADO" ? "GANADO" : "AGENDADO",
      proxima_accion: "Crear vehiculo y orden real si corresponde",
    });

    await LeadInteraccion.create({
      leadId: lead.id,
      canal: "OTRO",
      direccion: "INTERNA",
      mensaje: `Lead convertido a cliente #${cliente.id}`,
      autor: usuarioActual(req),
      metadata: { clienteId: cliente.id },
    });

    res.json({ mensaje: "Lead convertido a cliente", cliente, lead });
  } catch (error) {
    console.error("ERROR CONVIRTIENDO LEAD A CLIENTE:", error);
    res.status(500).json({ error: "No se pudo convertir el lead a cliente" });
  }
};

const convertirOrden = async (req, res) => {
  try {
    await prepararTablasLeads();

    if (!puedeGestionar(req)) {
      return res.status(403).json({ error: "No tienes permiso para crear orden desde lead" });
    }

    const lead = await LeadComercial.findOne({
      where: { id: req.params.id, ...whereVisible(req) },
    });

    if (!lead) return res.status(404).json({ error: "Lead no encontrado" });

    const vehiculoId = normalizarEnteroOpcional(req.body.vehiculoId || req.body.vehiculo_id);
    if (!vehiculoId) {
      return res.status(400).json({
        error: "Debes indicar vehiculoId existente para crear la orden.",
      });
    }

    const vehiculo = await Vehiculo.findByPk(vehiculoId);
    if (!vehiculo) return res.status(404).json({ error: "Vehiculo no encontrado" });

    const motivo = [
      `Lead #${lead.id}`,
      `Servicio interesado: ${lead.servicio_interes}`,
      lead.mensaje_inicial,
    ]
      .filter(Boolean)
      .join("\n");

    const orden = await OrdenTrabajo.create({
      vehiculoId,
      prioridad: lead.prioridad || "MEDIA",
      estado: "RECEPCIONADO",
      estado_pago: "PENDIENTE",
      medio_pago: "PENDIENTE",
      monto_pagado: 0,
      kilometraje: req.body.kilometraje ? Number(req.body.kilometraje) : null,
      motivo_ingreso: limpiarTexto(req.body.motivo_ingreso) || motivo,
      monto_total: Number(req.body.monto_total || 0),
      recepcionado_por: usuarioActual(req),
    });

    await lead.update({
      convertido_orden_id: orden.id,
      estado: "GANADO",
      proxima_accion: "Continuar flujo operativo en orden de trabajo",
    });

    await LeadInteraccion.create({
      leadId: lead.id,
      canal: "OTRO",
      direccion: "INTERNA",
      mensaje: `Lead convertido a orden #${orden.id}`,
      autor: usuarioActual(req),
      metadata: { ordenId: orden.id, vehiculoId },
    });

    res.json({ mensaje: "Orden creada desde lead", orden, lead });
  } catch (error) {
    console.error("ERROR CREANDO ORDEN DESDE LEAD:", error);
    res.status(500).json({ error: "No se pudo crear orden desde lead" });
  }
};

const obtenerResumenLeads = async (req, res) => {
  try {
    await prepararTablasLeads();

    const leads = await LeadComercial.findAll({
      where: whereVisible(req),
      include: [{ model: LeadInteraccion, required: false }],
      order: [["updatedAt", "DESC"]],
      limit: 500,
    });

    const ahora = new Date();
    const semanaInicio = new Date(ahora);
    semanaInicio.setDate(ahora.getDate() - 7);

    const sinResponder = [];
    const cotizadosPendientes = [];
    const sinDatosMinimos = [];
    const presupuestoBajo = [];

    leads.forEach((lead) => {
      const interacciones =
        [
          lead.LeadInteraccions,
          lead.LeadInteracciones,
          lead.lead_interacciones,
          lead.Interacciones,
          lead.interacciones,
        ].find(Array.isArray) || [];
      const tieneSalida = interacciones.some(
        (item) => String(item.direccion || "").toUpperCase() === "SALIENTE"
      );
      const edadMin =
        (ahora.getTime() - new Date(lead.createdAt).getTime()) / 60000;

      if (!tieneSalida && edadMin >= 30 && lead.estado === "NUEVO") {
        sinResponder.push(lead);
      }

      const horasActualizado =
        (ahora.getTime() - new Date(lead.updatedAt).getTime()) / 36e5;
      if (lead.estado === "COTIZADO" && horasActualizado >= 24) {
        cotizadosPendientes.push(lead);
      }

      if (
        !["GANADO", "PERDIDO", "NO_INTERESADO", "SPAM"].includes(lead.estado) &&
        !lead.datos_minimos_completos
      ) {
        sinDatosMinimos.push(lead);
      }

      if (
        !["GANADO", "PERDIDO", "NO_INTERESADO", "SPAM"].includes(lead.estado) &&
        lead.presupuesto_bajo
      ) {
        presupuestoBajo.push(lead);
      }
    });

    for (const lead of sinResponder.slice(0, 5)) {
      await notificarLead(
        lead,
        "LEAD_SIN_RESPUESTA_30M",
        "Lead sin responder",
        `${lead.nombre} lleva mas de 30 minutos sin respuesta.`,
        { minutos: 30 }
      );
    }

    for (const lead of cotizadosPendientes.slice(0, 5)) {
      await notificarLead(
        lead,
        "LEAD_COTIZADO_SIN_SEGUIMIENTO",
        "Lead cotizado sin seguimiento",
        `${lead.nombre} lleva mas de 24h cotizado sin seguimiento.`,
        { horas: 24 }
      );
    }

    const ganadosSemana = leads.filter(
      (lead) => lead.estado === "GANADO" && new Date(lead.updatedAt) >= semanaInicio
    ).length;
    const perdidosSemana = leads.filter(
      (lead) =>
        ["PERDIDO", "NO_INTERESADO", "SPAM"].includes(lead.estado) &&
        new Date(lead.updatedAt) >= semanaInicio
    ).length;
    const totalCerrados = ganadosSemana + perdidosSemana;

    res.json({
      total: leads.length,
      nuevos: leads.filter((lead) => lead.estado === "NUEVO").length,
      potenciales_reales: leads.filter(
        (lead) => lead.estado === "POTENCIAL_REAL"
      ).length,
      sin_responder_30m: sinResponder.length,
      cotizados_pendientes: cotizadosPendientes.length,
      sin_datos_minimos: sinDatosMinimos.length,
      presupuesto_bajo: presupuestoBajo.length,
      ganados_semana: ganadosSemana,
      perdidos_semana: perdidosSemana,
      tasa_conversion:
        totalCerrados > 0 ? Math.round((ganadosSemana / totalCerrados) * 100) : 0,
    });
  } catch (error) {
    console.error("ERROR RESUMEN LEADS:", error);
    res.status(500).json({ error: "No se pudo obtener resumen de leads" });
  }
};

module.exports = {
  obtenerLeads,
  crearLead,
  obtenerLeadPorId,
  actualizarLead,
  agregarInteraccion,
  calificarLead,
  convertirCliente,
  convertirOrden,
  obtenerResumenLeads,
};
