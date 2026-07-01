const { CampaniaComercial, LeadComercial } = require("../models");

let tablaPreparada = false;

const CANALES = [
  "FACEBOOK_ADS",
  "INSTAGRAM_ADS",
  "WHATSAPP",
  "WEB",
  "GRUPO_FACEBOOK",
  "REFERIDO",
  "PRESENCIAL",
  "OTRO",
];

const OBJETIVOS = [
  "MENSAJES_WHATSAPP",
  "LEADS",
  "AGENDA",
  "VENTAS",
  "FILE_SERVICE",
  "FLOTA",
  "OTRO",
];

const ESTADOS = ["BORRADOR", "ACTIVA", "PAUSADA", "FINALIZADA"];

const limpiarTexto = (valor) => String(valor ?? "").trim();

const rolActual = (req) =>
  String(req.usuario?.rol || req.user?.rol || "").trim().toUpperCase();

const usuarioActual = (req) =>
  req.usuario?.username ||
  req.user?.username ||
  req.usuario?.nombre ||
  req.user?.nombre ||
  "sistema";

const puedeAdministrar = (req) => ["OWNER", "ADMIN"].includes(rolActual(req));
const puedeVerPresupuesto = (req) =>
  ["OWNER", "ADMIN", "SUPERVISOR"].includes(rolActual(req));

const normalizarEnum = (valor, permitidos, defecto) => {
  const normalizado = limpiarTexto(valor || defecto).toUpperCase();
  return permitidos.includes(normalizado) ? normalizado : defecto;
};

const normalizarMonto = (valor) => {
  if (valor === null || valor === undefined || valor === "") return 0;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero) : 0;
};

const normalizarFecha = (valor) => {
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const prepararTablaCampanias = async () => {
  if (tablaPreparada) return;

  await CampaniaComercial.sync();
  await CampaniaComercial.sequelize.query(`
    ALTER TABLE "campanias_comerciales"
      ADD COLUMN IF NOT EXISTS "nombre" VARCHAR(160) NOT NULL DEFAULT 'Campaña sin nombre',
      ADD COLUMN IF NOT EXISTS "canal" VARCHAR(40) NOT NULL DEFAULT 'OTRO',
      ADD COLUMN IF NOT EXISTS "objetivo" VARCHAR(40) NOT NULL DEFAULT 'OTRO',
      ADD COLUMN IF NOT EXISTS "presupuesto" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "fecha_inicio" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "fecha_fin" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "estado" VARCHAR(40) NOT NULL DEFAULT 'BORRADOR',
      ADD COLUMN IF NOT EXISTS "descripcion" TEXT,
      ADD COLUMN IF NOT EXISTS "utm_source" VARCHAR(120),
      ADD COLUMN IF NOT EXISTS "utm_campaign" VARCHAR(160),
      ADD COLUMN IF NOT EXISTS "utm_content" VARCHAR(160),
      ADD COLUMN IF NOT EXISTS "creado_por" VARCHAR(100)
  `);

  tablaPreparada = true;
};

const payloadCampania = (body = {}, parcial = false) => {
  const payload = {};

  if (!parcial || Object.prototype.hasOwnProperty.call(body, "nombre")) {
    payload.nombre = limpiarTexto(body.nombre);
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "canal")) {
    payload.canal = normalizarEnum(body.canal, CANALES, "OTRO");
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "objetivo")) {
    payload.objetivo = normalizarEnum(body.objetivo, OBJETIVOS, "OTRO");
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "presupuesto")) {
    payload.presupuesto = normalizarMonto(body.presupuesto);
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "fecha_inicio")) {
    payload.fecha_inicio = normalizarFecha(body.fecha_inicio);
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "fecha_fin")) {
    payload.fecha_fin = normalizarFecha(body.fecha_fin);
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "estado")) {
    payload.estado = normalizarEnum(body.estado, ESTADOS, "BORRADOR");
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "descripcion")) {
    payload.descripcion = limpiarTexto(body.descripcion) || null;
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "utm_source")) {
    payload.utm_source = limpiarTexto(body.utm_source) || null;
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "utm_campaign")) {
    payload.utm_campaign = limpiarTexto(body.utm_campaign) || null;
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "utm_content")) {
    payload.utm_content = limpiarTexto(body.utm_content) || null;
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  return payload;
};

const sanitizarCampania = (campania, req, resumen = null) => {
  if (!campania) return null;
  const data = campania.toJSON ? campania.toJSON() : { ...campania };
  if (!puedeVerPresupuesto(req)) {
    delete data.presupuesto;
  }
  if (resumen) {
    data.resumen = { ...resumen };
    if (!puedeVerPresupuesto(req)) {
      delete data.resumen.presupuesto;
      delete data.resumen.costo_estimado_por_lead;
      delete data.resumen.costo_estimado_por_lead_real;
    }
  }
  return data;
};

const calcularResumenCampania = (campania, leads) => {
  const total = leads.length;
  const potencialesReales = leads.filter(
    (lead) => lead.estado === "POTENCIAL_REAL" || lead.es_lead_caliente
  ).length;
  const ganados = leads.filter((lead) => lead.estado === "GANADO").length;
  const presupuesto = Number(campania?.presupuesto || 0);

  return {
    leads_totales: total,
    leads_sin_datos_minimos: leads.filter((lead) => !lead.datos_minimos_completos)
      .length,
    potenciales_reales: potencialesReales,
    cotizados: leads.filter((lead) => lead.estado === "COTIZADO").length,
    agendados: leads.filter((lead) => lead.estado === "AGENDADO").length,
    ganados,
    perdidos: leads.filter((lead) =>
      ["PERDIDO", "NO_INTERESADO", "SPAM"].includes(lead.estado)
    ).length,
    presupuesto,
    costo_estimado_por_lead: total > 0 ? Math.round(presupuesto / total) : 0,
    costo_estimado_por_lead_real:
      potencialesReales > 0 ? Math.round(presupuesto / potencialesReales) : 0,
    conversion_simple: total > 0 ? Math.round((ganados / total) * 100) : 0,
  };
};

const obtenerCampanias = async (req, res) => {
  try {
    await prepararTablaCampanias();

    const where = {};
    if (rolActual(req) === "RECEPCION") {
      where.estado = "ACTIVA";
    } else if (req.query.estado) {
      where.estado = normalizarEnum(req.query.estado, ESTADOS, "ACTIVA");
    }

    const campanias = await CampaniaComercial.findAll({
      where,
      order: [
        ["estado", "ASC"],
        ["updatedAt", "DESC"],
      ],
      limit: Math.min(Number(req.query.limit || 200), 400),
    });

    res.json({ campanias: campanias.map((item) => sanitizarCampania(item, req)) });
  } catch (error) {
    console.error("ERROR LISTANDO CAMPANIAS:", error);
    res.status(500).json({ error: "No se pudieron listar las campañas" });
  }
};

const crearCampania = async (req, res) => {
  try {
    await prepararTablaCampanias();

    if (!puedeAdministrar(req)) {
      return res.status(403).json({ error: "Solo OWNER o ADMIN pueden crear campañas" });
    }

    const payload = payloadCampania(req.body);
    if (!payload.nombre) {
      return res.status(400).json({ error: "Debes indicar nombre de campaña" });
    }

    const campania = await CampaniaComercial.create({
      ...payload,
      creado_por: usuarioActual(req),
    });

    res.status(201).json({
      mensaje: "Campaña comercial creada",
      campania: sanitizarCampania(campania, req),
    });
  } catch (error) {
    console.error("ERROR CREANDO CAMPANIA:", error);
    res.status(500).json({ error: "No se pudo crear la campaña" });
  }
};

const actualizarCampania = async (req, res) => {
  try {
    await prepararTablaCampanias();

    if (!puedeAdministrar(req)) {
      return res.status(403).json({ error: "Solo OWNER o ADMIN pueden editar campañas" });
    }

    const campania = await CampaniaComercial.findByPk(req.params.id);
    if (!campania) return res.status(404).json({ error: "Campaña no encontrada" });

    const payload = payloadCampania(req.body, true);
    if (payload.nombre === "") {
      return res.status(400).json({ error: "El nombre de campaña no puede quedar vacío" });
    }

    await campania.update(payload);

    res.json({
      mensaje: "Campaña comercial actualizada",
      campania: sanitizarCampania(campania, req),
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO CAMPANIA:", error);
    res.status(500).json({ error: "No se pudo actualizar la campaña" });
  }
};

const obtenerResumenCampania = async (req, res) => {
  try {
    await prepararTablaCampanias();

    const campania = await CampaniaComercial.findByPk(req.params.id);
    if (!campania) return res.status(404).json({ error: "Campaña no encontrada" });

    const leads = await LeadComercial.findAll({ where: { campaniaId: campania.id } });
    const resumen = calcularResumenCampania(campania, leads);

    res.json({
      campania: sanitizarCampania(campania, req),
      resumen: sanitizarCampania(campania, req, resumen).resumen,
    });
  } catch (error) {
    console.error("ERROR RESUMEN CAMPANIA:", error);
    res.status(500).json({ error: "No se pudo obtener resumen de campaña" });
  }
};

module.exports = {
  CANALES,
  OBJETIVOS,
  ESTADOS,
  prepararTablaCampanias,
  obtenerCampanias,
  crearCampania,
  actualizarCampania,
  obtenerResumenCampania,
  calcularResumenCampania,
};
