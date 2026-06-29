const { Op } = require("sequelize");
const { TarifaServicio } = require("../models");

let tablaPreparada = false;

const CATEGORIAS = [
  "PERFORMANCE",
  "DIAGNOSTICO",
  "FILE_SERVICE",
  "SOLUCION_TECNICA",
  "FLOTA",
  "TALLER",
  "OTRO",
];

const SERVICIO_ALIASES = {
  DIAGNOSTICO: "Diagnóstico profesional",
  REVISION_DTC: "Revisión DTC",
  STAGE_1: "Stage 1",
  STAGE_2: "Stage 2",
  STAGE_3: "Stage 3 / proyecto especial",
  ECU: "Reprogramación ECU",
  TCU: "Reprogramación TCU",
  FILE_SERVICE: "File Service",
  DPF_FAP: "DPF/FAP",
  EGR: "EGR",
  SCR_ADBLUE: "SCR/AdBlue/DEF",
  NOX: "NOx",
  LAMBDA_O2: "Lambda/O2",
  TVA: "TVA",
  IMMO: "IMMO",
  VMAX: "Vmax",
  POPS_BANGS: "Pops & Bangs",
  LAUNCH_CONTROL: "Launch Control",
  HARDCUT: "Hardcut",
  FLOTA: "Flotas / proyectos técnicos",
  SOPORTE_TALLERES: "Soporte a talleres",
};

const TARIFAS_INICIALES = [
  ["Diagnóstico profesional", "DIAGNOSTICO"],
  ["Revisión DTC", "DIAGNOSTICO"],
  ["Stage 1", "PERFORMANCE"],
  ["Stage 2", "PERFORMANCE"],
  ["Stage 3 / proyecto especial", "PERFORMANCE"],
  ["Reprogramación ECU", "PERFORMANCE"],
  ["Reprogramación TCU", "PERFORMANCE"],
  ["File Service", "FILE_SERVICE"],
  ["DPF/FAP", "SOLUCION_TECNICA"],
  ["EGR", "SOLUCION_TECNICA"],
  ["SCR/AdBlue/DEF", "SOLUCION_TECNICA"],
  ["NOx", "SOLUCION_TECNICA"],
  ["Lambda/O2", "SOLUCION_TECNICA"],
  ["TVA", "SOLUCION_TECNICA"],
  ["IMMO", "SOLUCION_TECNICA"],
  ["Vmax", "PERFORMANCE"],
  ["Pops & Bangs", "PERFORMANCE"],
  ["Launch Control", "PERFORMANCE"],
  ["Hardcut", "PERFORMANCE"],
  ["Flotas / proyectos técnicos", "FLOTA"],
  ["Soporte a talleres", "TALLER"],
];

const limpiarTexto = (valor) => String(valor ?? "").trim();

const rolActual = (req) =>
  String(req.usuario?.rol || req.user?.rol || "").trim().toUpperCase();

const puedeAdministrarTarifas = (req) => ["OWNER", "ADMIN"].includes(rolActual(req));

const puedeVerNotasInternas = (req) =>
  ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"].includes(rolActual(req));

const normalizarTextoClave = (valor) =>
  limpiarTexto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizarCategoria = (valor) => {
  const categoria = normalizarTextoClave(valor || "OTRO");
  return CATEGORIAS.includes(categoria) ? categoria : "OTRO";
};

const normalizarMoneda = (valor) => {
  const moneda = limpiarTexto(valor || "CLP").toUpperCase();
  return moneda || "CLP";
};

const normalizarNumero = (valor) => {
  if (valor === null || valor === undefined || valor === "") return 0;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero) : 0;
};

const normalizarBooleano = (valor, defecto = false) => {
  if (valor === null || valor === undefined || valor === "") return defecto;
  if (typeof valor === "boolean") return valor;
  return ["TRUE", "1", "SI", "SÍ", "YES", "ACTIVO"].includes(
    limpiarTexto(valor).toUpperCase()
  );
};

const normalizarServicioTarifa = (servicio) => {
  const limpio = limpiarTexto(servicio);
  if (!limpio) return "";
  const clave = normalizarTextoClave(limpio);
  return SERVICIO_ALIASES[clave] || limpio;
};

const prepararTablaTarifas = async () => {
  if (tablaPreparada) return;

  await TarifaServicio.sync();
  await TarifaServicio.sequelize.query(`
    ALTER TABLE "tarifas_servicios"
      ADD COLUMN IF NOT EXISTS "servicio" VARCHAR(120) NOT NULL DEFAULT 'Servicio sin nombre',
      ADD COLUMN IF NOT EXISTS "categoria" VARCHAR(40) NOT NULL DEFAULT 'OTRO',
      ADD COLUMN IF NOT EXISTS "precio_desde" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "precio_minimo" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "precio_referencia" INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "moneda" VARCHAR(10) NOT NULL DEFAULT 'CLP',
      ADD COLUMN IF NOT EXISTS "requiere_evaluacion" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "requiere_diagnostico" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "activo" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "descripcion" TEXT,
      ADD COLUMN IF NOT EXISTS "notas_internas" TEXT
  `);

  for (const [servicio, categoria] of TARIFAS_INICIALES) {
    const existente = await TarifaServicio.findOne({ where: { servicio } });
    if (!existente) {
      await TarifaServicio.create({
        servicio,
        categoria,
        precio_desde: 0,
        precio_minimo: 0,
        precio_referencia: 0,
        moneda: "CLP",
        requiere_evaluacion: true,
        requiere_diagnostico: categoria !== "FILE_SERVICE",
        activo: true,
        descripcion:
          "Tarifa base editable. Completar precio real antes de usar como referencia comercial.",
      });
    }
  }

  tablaPreparada = true;
};

const payloadTarifa = (body = {}, parcial = false) => {
  const payload = {};

  if (!parcial || Object.prototype.hasOwnProperty.call(body, "servicio")) {
    payload.servicio = normalizarServicioTarifa(body.servicio);
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "categoria")) {
    payload.categoria = normalizarCategoria(body.categoria);
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "precio_desde")) {
    payload.precio_desde = normalizarNumero(body.precio_desde);
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "precio_minimo")) {
    payload.precio_minimo = normalizarNumero(body.precio_minimo);
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "precio_referencia")) {
    payload.precio_referencia = normalizarNumero(body.precio_referencia);
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "moneda")) {
    payload.moneda = normalizarMoneda(body.moneda);
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "requiere_evaluacion")) {
    payload.requiere_evaluacion = normalizarBooleano(body.requiere_evaluacion, true);
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "requiere_diagnostico")) {
    payload.requiere_diagnostico = normalizarBooleano(body.requiere_diagnostico, false);
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "activo")) {
    payload.activo = normalizarBooleano(body.activo, true);
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "descripcion")) {
    payload.descripcion = limpiarTexto(body.descripcion) || null;
  }
  if (!parcial || Object.prototype.hasOwnProperty.call(body, "notas_internas")) {
    payload.notas_internas = limpiarTexto(body.notas_internas) || null;
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  return payload;
};

const sanitizarTarifa = (tarifa, req) => {
  if (!tarifa) return null;
  const data = tarifa.toJSON ? tarifa.toJSON() : { ...tarifa };
  if (req && !puedeVerNotasInternas(req)) {
    delete data.notas_internas;
  }
  return data;
};

const obtenerTarifas = async (req, res) => {
  try {
    await prepararTablaTarifas();

    const where = {};
    if (!puedeAdministrarTarifas(req)) {
      where.activo = true;
    } else if (req.query.activo !== undefined) {
      where.activo = normalizarBooleano(req.query.activo, true);
    }

    const tarifas = await TarifaServicio.findAll({
      where,
      order: [
        ["categoria", "ASC"],
        ["servicio", "ASC"],
      ],
    });

    res.json({ tarifas: tarifas.map((item) => sanitizarTarifa(item, req)) });
  } catch (error) {
    console.error("ERROR LISTANDO TARIFAS:", error);
    res.status(500).json({ error: "No se pudieron listar las tarifas" });
  }
};

const obtenerTarifaPorServicio = async (req, res) => {
  try {
    await prepararTablaTarifas();

    const tarifa = await buscarTarifaParaServicio(req.params.servicio, {
      incluirInactivas: puedeAdministrarTarifas(req),
    });

    if (!tarifa) {
      return res.status(404).json({ error: "Tarifa no encontrada para el servicio" });
    }

    res.json({ tarifa: sanitizarTarifa(tarifa, req) });
  } catch (error) {
    console.error("ERROR OBTENIENDO TARIFA:", error);
    res.status(500).json({ error: "No se pudo obtener la tarifa" });
  }
};

const crearTarifa = async (req, res) => {
  try {
    await prepararTablaTarifas();

    if (!puedeAdministrarTarifas(req)) {
      return res.status(403).json({ error: "Solo OWNER o ADMIN pueden crear tarifas" });
    }

    const payload = payloadTarifa(req.body);
    if (!payload.servicio) {
      return res.status(400).json({ error: "Debes indicar el servicio de la tarifa" });
    }

    const existente = await buscarTarifaParaServicio(payload.servicio, {
      incluirInactivas: true,
    });
    if (existente) {
      return res.status(409).json({
        error: "Ya existe una tarifa para este servicio. Edita la tarifa existente.",
        tarifa: sanitizarTarifa(existente, req),
      });
    }

    const tarifa = await TarifaServicio.create(payload);
    res.status(201).json({ mensaje: "Tarifa creada", tarifa: sanitizarTarifa(tarifa, req) });
  } catch (error) {
    console.error("ERROR CREANDO TARIFA:", error);
    res.status(500).json({ error: "No se pudo crear la tarifa" });
  }
};

const actualizarTarifa = async (req, res) => {
  try {
    await prepararTablaTarifas();

    if (!puedeAdministrarTarifas(req)) {
      return res.status(403).json({ error: "Solo OWNER o ADMIN pueden editar tarifas" });
    }

    const tarifa = await TarifaServicio.findByPk(req.params.id);
    if (!tarifa) return res.status(404).json({ error: "Tarifa no encontrada" });

    const payload = payloadTarifa(req.body, true);
    if (payload.servicio === "") {
      return res.status(400).json({ error: "El servicio no puede quedar vacío" });
    }

    await tarifa.update(payload);
    res.json({ mensaje: "Tarifa actualizada", tarifa: sanitizarTarifa(tarifa, req) });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO TARIFA:", error);
    res.status(500).json({ error: "No se pudo actualizar la tarifa" });
  }
};

const buscarTarifaParaServicio = async (servicio, opciones = {}) => {
  await prepararTablaTarifas();

  const servicioNormalizado = normalizarServicioTarifa(servicio);
  if (!servicioNormalizado) return null;

  const where = opciones.incluirInactivas ? {} : { activo: true };
  const exacta = await TarifaServicio.findOne({
    where: {
      ...where,
      servicio: { [Op.iLike]: servicioNormalizado },
    },
  });
  if (exacta) return exacta;

  const claveBuscada = normalizarTextoClave(servicioNormalizado);
  const tarifas = await TarifaServicio.findAll({ where });
  return (
    tarifas.find(
      (tarifa) => normalizarTextoClave(tarifa.servicio) === claveBuscada
    ) || null
  );
};

module.exports = {
  obtenerTarifas,
  crearTarifa,
  actualizarTarifa,
  obtenerTarifaPorServicio,
  buscarTarifaParaServicio,
  prepararTablaTarifas,
  normalizarServicioTarifa,
};
