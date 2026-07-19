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
  OrdenEventoOperativo,
  Usuario,
} = require("../models");
const {
  crearNotificacionesInternas,
} = require("./notificacionController");
const {
  verificarGuardiaOperativaUsuario,
} = require("../services/guardiaOperativaService");

console.log("🧾 CONTROLLER_ORDENES_CIERRE_COMERCIAL_V2_CARGADO");

let columnasPreparadas = false;

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const normalizarTexto = limpiarTexto;

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

const usuarioActualId = (req) => limpiarTexto(req.usuario?.id || req.user?.id);

const obtenerSnapshotUsuario = (usuario) =>
  limpiarTexto(usuario?.username || usuario?.nombre || usuario?.id);

const obtenerSnapshotReqUsuario = (req) =>
  limpiarTexto(
    req.usuario?.username ||
      req.user?.username ||
      req.usuario?.nombre ||
      req.user?.nombre ||
      req.usuario?.id ||
      req.user?.id ||
      "sistema"
  );

const crearErrorHttp = (statusCode, message, extra = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
};

const obtenerEmpresaIdRequerida = (req) => {
  const empresaId = limpiarTexto(req.auth?.empresaId);

  if (!empresaId) {
    throw crearErrorHttp(
      503,
      "La empresa autenticada no esta disponible para operar en recepcion.",
      { codigo: "EMPRESA_NO_DISPONIBLE" }
    );
  }

  return empresaId;
};

const buscarUsuarioActivoPorId = async (usuarioId, empresaId = null) => {
  const id = limpiarTexto(usuarioId);
  if (!id) return null;

  const where = { id, activo: true };
  if (empresaId) where.empresaId = empresaId;

  const usuario = await Usuario.findOne({
    where,
    attributes: ["id", "nombre", "username", "rol", "activo", "empresaId"],
  });

  if (!usuario) {
    throw crearErrorHttp(400, "El responsable seleccionado no existe o está inactivo.", {
      codigo: "RESPONSABLE_INVALIDO",
    });
  }

  return usuario;
};

const resolverResponsableDesdeBody = async (
  body,
  campoId,
  campoTexto,
  opciones = {}
) => {
  const obligatorio = opciones.obligatorio === true;
  const empresaId = limpiarTexto(opciones.empresaId);
  const tieneCampoId = Object.prototype.hasOwnProperty.call(body, campoId);
  const tieneCampoTexto = Object.prototype.hasOwnProperty.call(body, campoTexto);
  const usuarioId = limpiarTexto(body[campoId]);

  if (usuarioId) {
    const usuario = await buscarUsuarioActivoPorId(usuarioId, empresaId || null);
    return {
      id: String(usuario.id),
      texto: obtenerSnapshotUsuario(usuario),
      usuario,
      legacy: false,
    };
  }

  if (tieneCampoId && !usuarioId && obligatorio) {
    throw crearErrorHttp(400, "Debes seleccionar un responsable activo.", {
      codigo: "RESPONSABLE_REQUERIDO",
    });
  }

  const texto = limpiarTexto(body[campoTexto]);
  if (texto && !obligatorio) {
    throw crearErrorHttp(
      400,
      "Para asignar un responsable debes enviar su ID de usuario activo.",
      { codigo: "RESPONSABLE_INVALIDO" }
    );
  }

  if ((tieneCampoId || tieneCampoTexto) && obligatorio) {
    throw crearErrorHttp(400, "Debes seleccionar un responsable activo.", {
      codigo: "RESPONSABLE_REQUERIDO",
    });
  }

  return null;
};

const aplicarResponsableResuelto = (payload, campoId, campoTexto, resuelto) => {
  if (!resuelto) return;
  if (resuelto.id) payload[campoId] = resuelto.id;
  payload[campoTexto] = resuelto.texto;
};

const validarGuardiaResponsable = async (usuario, opciones = {}) => {
  if (!usuario?.id || opciones.omitir === true) return null;

  const resultado = await verificarGuardiaOperativaUsuario({
    usuarioId: String(usuario.id),
    rol: usuario.rol,
  });

  if (resultado.bloqueado) {
    throw crearErrorHttp(
      409,
      "No puedes asignar más trabajo a este responsable porque tiene pendientes críticos sin resolver.",
      {
        codigo: "RESPONSABLE_BLOQUEADO",
        pendientes_criticos: resultado.pendientes_criticos || [],
      }
    );
  }

  return resultado;
};

let eventosOrdenPreparados = false;

const usuarioEventoDesdeReq = (req) =>
  limpiarTexto(
    req.usuario?.username ||
      req.usuario?.nombre ||
      req.user?.username ||
      req.user?.nombre ||
      req.usuario?.id ||
      req.user?.id
  ) || "sistema";

const metadataSensibleTokens = [
  "monto",
  "precio",
  "valor",
  "caja",
  "venta",
  "utilidad",
  "pago",
  "comprobante",
  "password",
  "token",
  "secret",
  "hash",
];

const sanitizarMetadataEvento = (metadata = {}) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return Object.entries(metadata).reduce((acc, [clave, valor]) => {
    const claveNormalizada = String(clave || "").toLowerCase();
    const esSensible = metadataSensibleTokens.some((token) =>
      claveNormalizada.includes(token)
    );

    if (esSensible || valor === undefined) return acc;

    if (
      valor === null ||
      ["string", "number", "boolean"].includes(typeof valor)
    ) {
      acc[clave] = valor;
    }

    return acc;
  }, {});
};

const prepararTablaEventosOrden = async () => {
  if (eventosOrdenPreparados) return;

  await OrdenEventoOperativo.sync();
  await sequelize.query(`
    ALTER TABLE "orden_eventos_operativos"
      ADD COLUMN IF NOT EXISTS "ordenId" INTEGER,
      ADD COLUMN IF NOT EXISTS "tipo_evento" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "categoria" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "titulo" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "descripcion" TEXT,
      ADD COLUMN IF NOT EXISTS "estado_anterior" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "estado_nuevo" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "usuario" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "usuario_rol" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "origen" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS "idx_orden_eventos_operativos_orden"
    ON "orden_eventos_operativos" ("ordenId")
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS "idx_orden_eventos_operativos_created"
    ON "orden_eventos_operativos" ("createdAt")
  `);

  eventosOrdenPreparados = true;
};

const registrarEventoOrden = async ({
  empresaId,
  ordenId,
  tipo_evento,
  categoria,
  titulo,
  descripcion,
  estado_anterior,
  estado_nuevo,
  usuario,
  usuario_rol,
  origen,
  metadata,
}) => {
  try {
    if (!ordenId || !tipo_evento || !titulo) return null;

    await prepararTablaEventosOrden();

    return await OrdenEventoOperativo.create({
      empresaId: empresaId || null,
      ordenId,
      tipo_evento,
      categoria: categoria || null,
      titulo,
      descripcion: descripcion || null,
      estado_anterior: estado_anterior || null,
      estado_nuevo: estado_nuevo || null,
      usuario: usuario || null,
      usuario_rol: usuario_rol || null,
      origen: origen || null,
      metadata: sanitizarMetadataEvento(metadata),
    });
  } catch (error) {
    console.warn("No se pudo registrar evento operativo de orden:", error.message);
    return null;
  }
};

const registrarEventoOrdenDesdeReq = async (
  req,
  datos,
  { estricto = false } = {}
) => {
  const evento = await registrarEventoOrden({
    ...datos,
    empresaId: obtenerEmpresaIdRequerida(req),
    usuario: datos.usuario || usuarioEventoDesdeReq(req),
    usuario_rol: datos.usuario_rol || rolActual(req),
  });

  if (!evento && estricto) {
    throw new Error(`No se pudo registrar el evento ${datos.tipo_evento || "ORDEN"}.`);
  }

  return evento;
};

const registrarEventoOrdenPostPersistenciaSeguro = async (
  req,
  datos,
  advertencias = []
) => {
  try {
    await registrarEventoOrdenDesdeReq(req, datos, { estricto: true });
    return true;
  } catch (error) {
    advertencias.push("AUDITORIA_OPERATIVA_PENDIENTE");
    console.warn(
      `Cambio persistido; evento ${datos.tipo_evento || "ORDEN"} pendiente:`,
      error.message
    );
    return false;
  }
};

const tieneRol = (req, roles = []) => roles.includes(rolActual(req));

const enviarErrorPermiso = (res) =>
  res.status(403).json({
    error: "No tienes permisos para esta accion",
  });

const responderErrorControlado = (res, error) => {
  if (error?.codigo === "EMPRESA_NO_DISPONIBLE") {
    return res.status(503).json({
      error: "EMPRESA_NO_DISPONIBLE",
      codigo: "EMPRESA_NO_DISPONIBLE",
      message: error.message,
    });
  }

  if (error?.codigo === "RESPONSABLE_BLOQUEADO") {
    return res.status(409).json({
      error: "RESPONSABLE_BLOQUEADO",
      message: error.message,
      pendientes_criticos: (error.pendientes_criticos || []).slice(0, 10),
    });
  }

  if (["RESPONSABLE_INVALIDO", "RESPONSABLE_REQUERIDO"].includes(error?.codigo)) {
    return res.status(error.statusCode || 400).json({
      error: error.codigo,
      message: error.message,
    });
  }

  if (error?.codigo && error?.statusCode) {
    return res.status(error.statusCode).json({
      error: error.codigo,
      message: error.message,
      advertencias: error.advertencias || undefined,
      archivos_pendientes: error.archivos_pendientes || undefined,
      items_pendientes: error.itemsPendientes || undefined,
    });
  }

  return null;
};

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

const obtenerPrioridadSugeridaPorVehiculo = async (vehiculoId, empresaId) => {
  try {
    const filas = await sequelize.query(
      `SELECT c."categoria_cliente"
       FROM "vehiculos" v
       LEFT JOIN "clientes" c
         ON c."id" = v."clienteId"
        AND c."empresaId" = v."empresaId"
       WHERE v."id" = :vehiculoId
         AND v."empresaId" = :empresaId
       LIMIT 1`,
      {
        replacements: { vehiculoId, empresaId },
        type: QueryTypes.SELECT,
      }
    );

    return prioridadSugeridaPorCategoria(filas[0]?.categoria_cliente);
  } catch (error) {
    console.warn("No se pudo sugerir prioridad por categoría:", error.message);
    return "MEDIA";
  }
};

const textoServicioOrden = (body = {}) =>
  [
    body.categoria_servicio,
    body.tipo_servicio,
    body.servicio,
    body.servicio_solicitado,
    body.motivo_ingreso,
  ]
    .map(limpiarTexto)
    .filter(Boolean)
    .join(" ");

const obtenerCampoResponsableTecnicoPorServicio = (body = {}) => {
  const servicio = textoServicioOrden(body)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  const esMecanica =
    servicio.includes("MECAN") ||
    servicio.includes("MANTEN") ||
    servicio.includes("ACEITE") ||
    servicio.includes("LIMPIEZA DPF") ||
    servicio.includes("LIMPIEZA FAP") ||
    servicio.includes("REGENER") ||
    servicio.includes("REVISION MECANICA") ||
    servicio.includes("REVISION FISICA");

  if (esMecanica) {
    return {
      campoId: "mecanico_asignado_a_id",
      campoTexto: "mecanico_asignado_a",
    };
  }

  const esEcu =
    servicio.includes("ECU") ||
    servicio.includes("TCU") ||
    servicio.includes("FILE SERVICE") ||
    servicio.includes("STAGE") ||
    servicio.includes("REPROGRAM") ||
    servicio.includes("ELECTRON") ||
    servicio.includes("DPF") ||
    servicio.includes("FAP") ||
    servicio.includes("EGR") ||
    servicio.includes("SCR") ||
    servicio.includes("ADBLUE") ||
    servicio.includes("DEF") ||
    servicio.includes("NOX") ||
    servicio.includes("LAMBDA") ||
    servicio.includes("O2") ||
    servicio.includes("TVA") ||
    servicio.includes("IMMO") ||
    servicio.includes("VMAX") ||
    servicio.includes("POPS") ||
    servicio.includes("LAUNCH") ||
    servicio.includes("HARDCUT");

  if (esEcu) {
    return {
      campoId: "operador_ecu_asignado_a_id",
      campoTexto: "operador_ecu_asignado_a",
    };
  }

  const esDiagnostico =
    servicio.includes("DIAGNOST") ||
    servicio.includes("SCANNER") ||
    servicio.includes("DTC") ||
    servicio.includes("REVISION ELECTRONICA");

  if (esDiagnostico) {
    return {
      campoId: "diagnostico_asignado_a_id",
      campoTexto: "diagnostico_asignado_a",
    };
  }

  return {
    campoId: "supervisor_asignado_a_id",
    campoTexto: "supervisor_asignado_a",
  };
};

const resolverResponsableTecnicoGenerico = async (body = {}, opciones = {}) => {
  const responsableId = limpiarTexto(body.responsable_tecnico_id);
  if (!responsableId) {
    if (
      limpiarTexto(body.responsable_tecnico_texto || body.responsable_tecnico)
    ) {
      throw crearErrorHttp(
        400,
        "Para asignar un responsable debes enviar su ID de usuario activo.",
        { codigo: "RESPONSABLE_INVALIDO" }
      );
    }

    return null;
  }

  const usuario = await buscarUsuarioActivoPorId(
    responsableId,
    limpiarTexto(opciones.empresaId) || null
  );
  const snapshot = obtenerSnapshotUsuario(usuario);
  const campo = obtenerCampoResponsableTecnicoPorServicio(body);

  return {
    ...campo,
    id: String(usuario.id),
    texto: snapshot,
    usuario,
  };
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

const RESPONSABLES_ORDEN_CONFIG = [
  {
    campoTexto: "recepcionado_por",
    campoId: "recepcionado_por_id",
  },
  {
    campoTexto: "diagnostico_asignado_a",
    campoId: "diagnostico_asignado_a_id",
  },
  {
    campoTexto: "operador_ecu_asignado_a",
    campoId: "operador_ecu_asignado_a_id",
  },
  {
    campoTexto: "mecanico_asignado_a",
    campoId: "mecanico_asignado_a_id",
  },
  {
    campoTexto: "supervisor_asignado_a",
    campoId: "supervisor_asignado_a_id",
  },
];

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
const ROLES_CREAR_ORDEN = [
  "OWNER",
  "ADMIN",
  "SUPERVISOR",
  "RECEPCION",
  "OPERADOR_ECU",
];
const ROLES_CIERRE_COMERCIAL = ["OWNER", "ADMIN", "RECEPCION"];
const ROLES_PATCH_COMERCIAL = ["OWNER", "ADMIN", "RECEPCION"];
const ROLES_GESTION_ITEMS = ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"];
const ROLES_MATERIAL_RECUPERADO = [
  "OWNER",
  "ADMIN",
  "SUPERVISOR",
  "RECEPCION",
  "MECANICO",
];

const ROLES_JEFATURA_URGENTE = ["OWNER", "ADMIN", "SUPERVISOR"];
const ROLES_OVERRIDE_COMERCIAL = ["OWNER", "ADMIN"];
const ADVERTENCIAS_REGULARIZACION_URGENTE = [
  "KILOMETRAJE_PENDIENTE",
  "SINTOMAS_PENDIENTES",
  "MONTO_PENDIENTE",
  "DETALLES_PENDIENTES",
  "FOTOS_PENDIENTES",
  "RESPONSABLE_PENDIENTE",
  "DIAGNOSTICO_PENDIENTE",
];

const modoUrgenteSolicitado = (body = {}) =>
  normalizarBoolean(body.modo_urgente);

const primerTexto = (...valores) =>
  valores.map(limpiarTexto).find(Boolean) || "";

const obtenerServicioUrgente = (body = {}) =>
  primerTexto(
    body.tipo_servicio,
    body.servicio,
    body.servicio_solicitado,
    body.categoria_servicio
  );

const obtenerSintomasUrgentes = (body = {}) =>
  primerTexto(
    body.sintomas,
    body.sintoma,
    body.descripcion_sintomas,
    body.falla_reportada,
    body.motivo_ingreso
  );

const obtenerDetallesUrgentes = (body = {}) =>
  primerTexto(
    body.detalles,
    body.detalle_servicio,
    body.descripcion,
    body.observaciones
  );

const construirMotivoIngresoUrgente = (body, servicio) => {
  const sintomas = obtenerSintomasUrgentes(body);
  const detalles = obtenerDetallesUrgentes(body);

  return [
    `Servicio urgente: ${servicio}`,
    sintomas ? `Sintomas iniciales: ${sintomas}` : "",
    detalles ? `Detalles iniciales: ${detalles}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const preservarServicioEnMotivo = (motivoActual, motivoNuevo) => {
  const patronLineaServicio =
    /^(?:servicio urgente|servicio solicitado)\s*:/i;
  const lineaServicio = limpiarTexto(motivoActual)
    .split(/\r?\n/)
    .map(limpiarTexto)
    .find((linea) => patronLineaServicio.test(linea));

  if (!lineaServicio) return motivoNuevo;

  // El servicio original define controles de cierre (por ejemplo, exigir File
  // Service). El PATCH puede completar sintomas y detalles, pero no sustituir
  // este marcador estructural mediante texto libre.
  const motivoEditable = limpiarTexto(motivoNuevo)
    .split(/\r?\n/)
    .filter((linea) => !patronLineaServicio.test(limpiarTexto(linea)))
    .join("\n")
    .trim();

  return [lineaServicio, motivoEditable].filter(Boolean).join("\n");
};

const construirAdvertenciasCreacionUrgente = ({
  body,
  montoInicial,
  tieneResponsableTecnico,
}) => {
  const advertencias = [];
  const kilometraje = Number(body.kilometraje);

  if (!Number.isFinite(kilometraje) || kilometraje <= 0) {
    advertencias.push("KILOMETRAJE_PENDIENTE");
  }
  if (!obtenerSintomasUrgentes(body)) {
    advertencias.push("SINTOMAS_PENDIENTES");
  }
  if (!(montoInicial > 0)) {
    advertencias.push("MONTO_PENDIENTE");
  }
  if (!obtenerDetallesUrgentes(body)) {
    advertencias.push("DETALLES_PENDIENTES");
  }

  // La orden aun no existe al procesar este POST, por lo que no puede tener fotos asociadas.
  advertencias.push("FOTOS_PENDIENTES");
  advertencias.push("DIAGNOSTICO_PENDIENTE");

  if (!tieneResponsableTecnico) {
    advertencias.push("RESPONSABLE_PENDIENTE");
  }

  return ADVERTENCIAS_REGULARIZACION_URGENTE.filter((codigo) =>
    advertencias.includes(codigo)
  );
};

const normalizarClaveServicio = (valor) =>
  limpiarTexto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[_-]+/g, " ");

const servicioRequiereFileService = (valor) => {
  const servicio = normalizarClaveServicio(valor);
  if (!servicio) return false;

  // DPF/FAP tambien puede ser una labor mecanica (limpieza o regeneracion),
  // que no debe exigir por si sola un archivo ECU.
  if (
    /\b(LIMPIEZA|REGENERACION|MANTENCION|MANTENIMIENTO|REVISION|DIAGNOSTICO)\b.*\b(DPF|FAP)\b/.test(
      servicio
    )
  ) {
    return false;
  }

  return [
    /\bFILE\s*SERVICE\b/,
    /\bSTAGE\s*[123]?\b/,
    /\bREPROGRAMACION\s+(ECU|TCU)\b/,
    /\bLECTURA\s+(ECU|TCU)\b/,
    /\bDTC\s*OFF\b/,
    /\bCHECKSUM\b/,
    /\bREADINESS\b/,
    /\bBACKUP\s+ORIGINAL\b/,
    /\bRESTAURAR\s+ORIGINAL\b/,
    /\b(CUSTOM|ECO)\s*TUNE\b/,
    /\bTORQUE\s*LIMITER\b/,
    /\b(DPF|FAP)\b/,
    /\bEGR\b/,
    /\b(SCR|ADBLUE|DEF)\b/,
    /\bNOX\b/,
    /\b(LAMBDA|O2)\b/,
    /\bTVA\b/,
    /\bIMMO\b/,
    /\bV\s*MAX\b/,
    /\bPOPS?(\s*&\s*BANGS?)?\b/,
    /\bLAUNCH\s+CONTROL\b/,
    /\bHARDCUT\b/,
  ].some((patron) => patron.test(servicio));
};

const archivoECURequiereModParaCierre = (archivo) => {
  const estado = limpiarTexto(archivo?.estado).toUpperCase();
  const servicios = parseJsonSeguro(archivo?.servicios_solicitados, [])
    .map((servicio) =>
      limpiarTexto(
        typeof servicio === "object" && servicio !== null
          ? servicio.value || servicio.nombre || servicio.label
          : servicio
      ).toUpperCase()
    )
    .filter(Boolean);

  if (limpiarTexto(archivo?.archivo_modificado)) return true;
  if (["MODIFICADO_LISTO", "NOTIFICADO_SLAVE"].includes(estado)) return true;

  const valoresServicio = [
    limpiarTexto(archivo?.tipo_servicio),
    limpiarTexto(archivo?.servicio_principal),
    ...servicios,
  ]
    .map((valor) => valor.toUpperCase())
    .filter(Boolean);

  if (!valoresServicio.length) return false;

  const marcadoresSoloRevision = [
    "READINESS",
    "CHECKSUM",
    "BACKUP_ORIGINAL",
    "RESTAURAR_ORIGINAL",
    "REVISION",
    "DIAGNOSTICO",
    "LECTURA",
  ];
  const marcadoresModificacion = [
    "STAGE",
    "DPF",
    "FAP",
    "EGR",
    "ADBLUE",
    "SCR",
    "DTC OFF",
    "IMMO",
    "POPS",
    "VMAX",
    "V-MAX",
    "TORQUE",
    "TUNING",
  ];

  if (
    valoresServicio.some((valor) =>
      marcadoresModificacion.some((marcador) => valor.includes(marcador))
    )
  ) {
    return true;
  }

  return valoresServicio.some(
    (valor) =>
      !marcadoresSoloRevision.some((marcador) => valor.includes(marcador))
  );
};

const validarCierreTecnicoFileServiceOrden = async (
  ordenId,
  { transaction, motivoIngresoProyectado } = {}
) => {
  const [archivos, orden, items] = await Promise.all([
    ArchivoECU.findAll({
      where: { ordenId },
      attributes: [
        "id",
        "estado",
        "archivado",
        "archivo_original",
        "archivo_modificado",
        "tipo_servicio",
        "servicio_principal",
        "servicios_solicitados",
        "tuner_asignado_a_id",
        "tuner_asignado_a",
        "operador_ecu_asignado_a_id",
        "operador_ecu_asignado_a",
        "slave_asignado_a_id",
        "slave_asignado_a",
        "post_escritura_estado",
        "post_escritura_dtc",
        "post_escritura_sin_dtc",
        "post_escritura_scanner",
        "post_escritura_observacion",
        "cierre_tecnico_at",
        "cierre_tecnico_obligatorio",
        "observacion_cierre_tecnico",
        "resultado_tecnico",
        "correccion_pendiente",
        "creado_en_modo_urgente",
        "requiere_regularizacion",
        "regularizacion_pendientes",
        "regularizar_antes_de_entrega",
      ],
      order: [["id", "ASC"]],
      transaction,
      ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    }),
    OrdenTrabajo.findByPk(ordenId, {
      attributes: ["id", "motivo_ingreso"],
      transaction,
    }),
    OrdenServicioItem.findAll({
      where: { ordenId },
      attributes: ["tipo_servicio", "categoria", "estado"],
      transaction,
    }),
  ]);
  const archivosActivos = archivos.filter((archivo) => {
    const estadoArchivo = limpiarTexto(archivo.estado).toUpperCase();
    return !normalizarBoolean(archivo.archivado) && estadoArchivo !== "ARCHIVADO";
  });
  const itemsActivos = items.filter(
    (item) => limpiarTexto(item.estado).toUpperCase() !== "ANULADO"
  );
  const motivoIngreso = limpiarTexto(
    motivoIngresoProyectado !== undefined
      ? motivoIngresoProyectado
      : orden?.motivo_ingreso
  );
  const servicioPersistido =
    motivoIngreso.match(
      /^(?:SERVICIO URGENTE|SERVICIO SOLICITADO)\s*:\s*(.+)$/im
    )?.[1] || "";
  const requiereFileServicePorMotivo = servicioRequiereFileService(servicioPersistido);
  const requiereFileServicePorItem = itemsActivos.some((item) => {
    const categoria = normalizarClaveServicio(item.categoria);
    const tipoServicio = limpiarTexto(item.tipo_servicio);
    return (
      categoria === "FILE SERVICE" || servicioRequiereFileService(tipoServicio)
    );
  });
  const requiereFileService =
    requiereFileServicePorMotivo || requiereFileServicePorItem;
  const archivosPendientes = [];

  if (requiereFileService && archivosActivos.length === 0) {
    archivosPendientes.push({
      archivo_ecu_id: null,
      estado: null,
      faltantes: ["FILE_SERVICE_REQUERIDO"],
    });
  }

  for (const archivo of archivosActivos) {
    const estadoArchivo = limpiarTexto(archivo.estado).toUpperCase();
    const faltantes = [];
    const postEstado = limpiarTexto(archivo.post_escritura_estado).toUpperCase();
    const postNoAplica =
      postEstado === "NO_APLICA" &&
      Boolean(limpiarTexto(archivo.post_escritura_observacion));
    const postOk = postEstado === "OK" || postNoAplica;
    const tieneServicios = Boolean(
      limpiarTexto(archivo.tipo_servicio) ||
        limpiarTexto(archivo.servicio_principal) ||
        parseJsonSeguro(archivo.servicios_solicitados, []).length
    );
    const tieneResponsable = Boolean(
      limpiarTexto(archivo.tuner_asignado_a_id) ||
        limpiarTexto(archivo.tuner_asignado_a) ||
        limpiarTexto(archivo.operador_ecu_asignado_a_id) ||
        limpiarTexto(archivo.operador_ecu_asignado_a) ||
        limpiarTexto(archivo.slave_asignado_a_id) ||
        limpiarTexto(archivo.slave_asignado_a)
    );
    const responsablesId = [
      limpiarTexto(archivo.tuner_asignado_a_id),
      limpiarTexto(archivo.operador_ecu_asignado_a_id),
      limpiarTexto(archivo.slave_asignado_a_id),
    ].filter(Boolean);

    for (const responsableId of new Set(responsablesId)) {
      await buscarUsuarioActivoPorId(responsableId);
    }

    const pendientesRegularizacion = parseJsonSeguro(
      archivo.regularizacion_pendientes,
      []
    ).map((pendiente) => limpiarTexto(pendiente).toUpperCase());
    const responsableJustificado = Boolean(
      normalizarBoolean(archivo.creado_en_modo_urgente) &&
        normalizarBoolean(archivo.requiere_regularizacion) &&
        !normalizarBoolean(archivo.regularizar_antes_de_entrega) &&
        pendientesRegularizacion.includes("RESPONSABLE_PENDIENTE") &&
        limpiarTexto(archivo.observacion_cierre_tecnico)
          .toUpperCase()
          .includes("OVERRIDE REGULARIZACION URGENTE")
    );

    if (!limpiarTexto(archivo.archivo_original)) {
      faltantes.push("ARCHIVO_ORIGINAL");
    }
    if (!tieneServicios) {
      faltantes.push("SERVICIO_FILE_SERVICE");
    }
    if (!tieneResponsable && !responsableJustificado) {
      faltantes.push("RESPONSABLE_FILE_SERVICE");
    }
    if (
      archivoECURequiereModParaCierre(archivo) &&
      !limpiarTexto(archivo.archivo_modificado)
    ) {
      faltantes.push("MOD_REQUERIDO");
    }

    if (!postOk) {
      faltantes.push("POST_ESCRITURA_OK_O_NO_APLICA");
    }
    if (postEstado === "OK" && !limpiarTexto(archivo.post_escritura_scanner)) {
      faltantes.push("EVIDENCIA_SCANNER_POST_ESCRITURA");
    }
    if (
      postEstado === "OK" &&
      !limpiarTexto(archivo.post_escritura_dtc) &&
      !normalizarBoolean(archivo.post_escritura_sin_dtc)
    ) {
      faltantes.push("DTC_POST_ESCRITURA_O_SIN_DTC");
    }
    if (
      !archivo.cierre_tecnico_at ||
      limpiarTexto(archivo.resultado_tecnico).toUpperCase() !== "OK"
    ) {
      faltantes.push("CIERRE_TECNICO_FILE_SERVICE");
    }
    if (!["FINALIZADO", "FINALIZADO_TECNICO"].includes(estadoArchivo)) {
      faltantes.push("ESTADO_FINAL_FILE_SERVICE");
    }
    if (normalizarBoolean(archivo.cierre_tecnico_obligatorio)) {
      faltantes.push("CIERRE_TECNICO_OBLIGATORIO");
    }
    if (!limpiarTexto(archivo.observacion_cierre_tecnico)) {
      faltantes.push("OBSERVACION_CIERRE_TECNICO");
    }
    if (normalizarBoolean(archivo.correccion_pendiente)) {
      faltantes.push("CORRECCION_TECNICA_PENDIENTE");
    }
    if (normalizarBoolean(archivo.regularizar_antes_de_entrega)) {
      faltantes.push("REGULARIZACION_FILE_SERVICE");
    }

    if (faltantes.length > 0) {
      archivosPendientes.push({
        archivo_ecu_id: archivo.id,
        estado: estadoArchivo || null,
        faltantes,
      });
    }
  }

  if (archivosPendientes.length > 0) {
    throw crearErrorHttp(
      409,
      "La orden tiene File Service sin prueba final o cierre tecnico completo.",
      {
        codigo: "CIERRE_TECNICO_FILE_SERVICE_REQUERIDO",
        archivos_pendientes: archivosPendientes,
      }
    );
  }
};

const bloquearArchivosFileServiceOrden = async (ordenId, transaction) => {
  if (!transaction) return;

  await ArchivoECU.findAll({
    where: { ordenId },
    attributes: ["id"],
    order: [["id", "ASC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
};

const validarGuardiaResponsableUrgente = async ({
  req,
  usuario,
  modoUrgente,
}) => {
  try {
    await validarGuardiaResponsable(usuario);
    return null;
  } catch (error) {
    if (error?.codigo !== "RESPONSABLE_BLOQUEADO") throw error;

    const overrideSolicitado = normalizarBoolean(req.body.override_guardia);
    if (!modoUrgente || !overrideSolicitado) throw error;

    if (!tieneRol(req, ROLES_JEFATURA_URGENTE)) {
      throw crearErrorHttp(
        403,
        "Solo jefatura puede autorizar una asignacion urgente a un responsable bloqueado.",
        { codigo: "OVERRIDE_GUARDIA_NO_AUTORIZADO" }
      );
    }

    const motivoOverride = limpiarTexto(req.body.motivo_override);
    if (!motivoOverride) {
      throw crearErrorHttp(
        400,
        "Debes indicar motivo_override para autorizar la asignacion urgente.",
        { codigo: "MOTIVO_OVERRIDE_REQUERIDO" }
      );
    }

    return {
      tipo: "OVERRIDE_GUARDIA_URGENTE",
      motivo: motivoOverride,
      responsable_id: String(usuario.id),
      responsable: obtenerSnapshotUsuario(usuario),
      pendientes_criticos: (error.pendientes_criticos || []).slice(0, 10),
    };
  }
};

const motivoIngresoTieneSintomas = (motivoIngreso) =>
  limpiarTexto(motivoIngreso)
    .split(/\r?\n/)
    .map(limpiarTexto)
    .filter(Boolean)
    .some(
      (linea) =>
        !/^servicio urgente\s*:/i.test(linea) &&
        !/^detalles iniciales\s*:/i.test(linea)
    );

const motivoIngresoTieneDetalles = (motivoIngreso) =>
  limpiarTexto(motivoIngreso)
    .split(/\r?\n/)
    .map(limpiarTexto)
    .some((linea) => /^detalles iniciales\s*:/i.test(linea));

const ordenTieneResponsableTecnico = (orden = {}, items = []) =>
  [
    orden.diagnostico_asignado_a_id,
    orden.operador_ecu_asignado_a_id,
    orden.mecanico_asignado_a_id,
    orden.supervisor_asignado_a_id,
  ].some((valor) => Boolean(limpiarTexto(valor))) ||
  items.some((item) => Boolean(limpiarTexto(item.responsable_id)));

const calcularAdvertenciasRegularizacionUrgente = async (
  orden,
  datosProyectados = {},
  { transaction } = {}
) => {
  const datos = {
    ...(typeof orden?.toJSON === "function" ? orden.toJSON() : orden || {}),
    ...datosProyectados,
  };

  if (!normalizarBoolean(datos.creado_en_modo_urgente)) return [];

  const [cantidadFotos, diagnostico, items] = await Promise.all([
    FotoVehiculo.count({ where: { ordenId: datos.id }, transaction }),
    Diagnostico.findOne({
      where: { ordenId: datos.id },
      attributes: ["fallas_detectadas", "observaciones"],
      order: [["id", "DESC"]],
      transaction,
    }),
    OrdenServicioItem.findAll({
      where: {
        ordenId: datos.id,
        estado: { [Op.ne]: "ANULADO" },
      },
      attributes: ["id", "responsable_id"],
      transaction,
    }),
  ]);

  const advertencias = [];
  const kilometraje = Number(datos.kilometraje);
  const monto = normalizarDecimal(datos.monto_final ?? datos.monto_total, 0);
  const diagnosticoConSintomas = Boolean(
    limpiarTexto(diagnostico?.fallas_detectadas) ||
      limpiarTexto(diagnostico?.observaciones)
  );

  if (!Number.isFinite(kilometraje) || kilometraje <= 0) {
    advertencias.push("KILOMETRAJE_PENDIENTE");
  }
  if (!motivoIngresoTieneSintomas(datos.motivo_ingreso) && !diagnosticoConSintomas) {
    advertencias.push("SINTOMAS_PENDIENTES");
  }
  if (!(monto > 0)) advertencias.push("MONTO_PENDIENTE");
  if (!items.length && !motivoIngresoTieneDetalles(datos.motivo_ingreso)) {
    advertencias.push("DETALLES_PENDIENTES");
  }
  if (!(cantidadFotos > 0)) advertencias.push("FOTOS_PENDIENTES");
  if (!diagnostico) advertencias.push("DIAGNOSTICO_PENDIENTE");
  if (!ordenTieneResponsableTecnico(datos, items)) {
    advertencias.push("RESPONSABLE_PENDIENTE");
  }

  return ADVERTENCIAS_REGULARIZACION_URGENTE.filter((codigo) =>
    advertencias.includes(codigo)
  );
};

const construirEntradaAuditoriaOverrideOrden = ({
  req,
  tipo,
  motivo,
  metadata = {},
}) => ({
    tipo,
    texto: motivo,
    creado_por: usuarioActual(req),
    fecha: new Date().toISOString(),
    ...metadata,
  });

const anexarAuditoriasOverrideAlPayload = ({ orden, payload, auditorias = [] }) => {
  if (!auditorias.length) return;

  const bitacoraActual = parseJsonSeguro(
    orden.getDataValue("bitacora_operativa"),
    []
  );
  payload.bitacora_operativa = [
    ...bitacoraActual,
    ...auditorias.map(construirEntradaAuditoriaOverrideOrden),
  ];
};

const registrarAuditoriaOverrideOrden = async ({
  req,
  orden,
  tipo,
  motivo,
  metadata = {},
  bitacoraYaPersistida = false,
}) => {
  if (!bitacoraYaPersistida) {
    await orden.reload();

    const bitacoraActual = parseJsonSeguro(
      orden.getDataValue("bitacora_operativa"),
      []
    );

    await orden.update({
      bitacora_operativa: [
        ...bitacoraActual,
        construirEntradaAuditoriaOverrideOrden({ req, tipo, motivo, metadata }),
      ],
    });
  }

  try {
    await registrarEventoOrdenDesdeReq(
      req,
      {
        ordenId: orden.id,
        tipo_evento: tipo,
        categoria: "AUDITORIA",
        titulo: "Override urgente autorizado",
        descripcion: motivo,
        origen: "MODO_URGENTE_V1",
        metadata,
      },
      { estricto: true }
    );
    return true;
  } catch (error) {
    if (!bitacoraYaPersistida) throw error;
    console.warn(`Override ${tipo} persistido; evento secundario pendiente:`, error.message);
    return false;
  }
};

const sincronizarRegularizacionUrgente = async (
  ordenId,
  req,
  { overrideAutorizado = false } = {}
) => {
  const orden = await OrdenTrabajo.findByPk(ordenId);
  if (!orden || !normalizarBoolean(orden.creado_en_modo_urgente)) {
    return { orden, advertencias: [] };
  }

  const advertencias = await calcularAdvertenciasRegularizacionUrgente(orden);
  const estabaPendiente =
    normalizarBoolean(orden.requiere_regularizacion) ||
    parseJsonSeguro(orden.regularizacion_pendientes, []).length > 0;
  const requiereRegularizacion = advertencias.length > 0;
  const advertenciasOperativas = [];
  const payload = {
    requiere_regularizacion: requiereRegularizacion,
    regularizacion_pendientes: advertencias,
    regularizar_antes_de_entrega:
      requiereRegularizacion && overrideAutorizado !== true,
  };

  if (requiereRegularizacion) {
    payload.regularizado_por = null;
    payload.regularizado_at = null;
  }

  if (!requiereRegularizacion && estabaPendiente) {
    payload.regularizado_por = usuarioActual(req);
    payload.regularizado_at = new Date();
  }

  await orden.update(payload);

  if (!requiereRegularizacion && estabaPendiente) {
    await registrarEventoOrdenPostPersistenciaSeguro(req, {
      ordenId: orden.id,
      tipo_evento: "ORDEN_URGENTE_REGULARIZADA",
      categoria: "OPERACION",
      titulo: "Orden urgente regularizada",
      descripcion: "Se completaron los pendientes de la recepcion rapida.",
      origen: "MODO_URGENTE_V1",
    }, advertenciasOperativas);
  }

  return {
    orden: await OrdenTrabajo.findByPk(orden.id),
    advertencias,
    advertenciasOperativas,
  };
};

const recargarOrdenPostPersistenciaSeguro = async (
  orden,
  advertenciasOperativas
) => {
  try {
    return (await OrdenTrabajo.findByPk(orden.id)) || orden;
  } catch (error) {
    advertenciasOperativas.push("RECARGA_ORDEN_PENDIENTE");
    console.warn(
      `Orden #${orden.id} persistida, pero fallo su recarga:`,
      error.message
    );
    return orden;
  }
};

const sincronizarRegularizacionPostPersistenciaSeguro = async (
  ordenId,
  req,
  opciones,
  advertenciasOperativas,
  ordenFallback = null
) => {
  try {
    return await sincronizarRegularizacionUrgente(ordenId, req, opciones);
  } catch (error) {
    advertenciasOperativas.push("SINCRONIZACION_REGULARIZACION_PENDIENTE");
    console.warn(
      `Orden #${ordenId} persistida, pero fallo la sincronizacion de regularizacion:`,
      error.message
    );

    let orden = ordenFallback;
    try {
      orden = await OrdenTrabajo.findByPk(ordenId);
    } catch (errorRecarga) {
      advertenciasOperativas.push("RECARGA_ORDEN_PENDIENTE");
      console.warn(
        `No se pudo recargar Orden #${ordenId} tras persistir:`,
        errorRecarga.message
      );
    }
    return {
      orden,
      advertencias: parseJsonSeguro(orden?.regularizacion_pendientes, []),
      advertenciasOperativas: ["SINCRONIZACION_REGULARIZACION_PENDIENTE"],
    };
  }
};

const validarRegularizacionUrgenteParaCierre = async ({
  req,
  orden,
  datosProyectados = {},
  transaction,
}) => {
  if (!normalizarBoolean(orden.creado_en_modo_urgente)) return null;

  const advertencias = await calcularAdvertenciasRegularizacionUrgente(
    orden,
    datosProyectados,
    { transaction }
  );
  if (!advertencias.length) return null;

  if (!normalizarBoolean(req.body.override_regularizacion)) {
    throw crearErrorHttp(
      409,
      "Debes regularizar los datos pendientes antes de cerrar o entregar esta orden urgente.",
      {
        codigo: "REGULARIZACION_PENDIENTE",
        advertencias,
      }
    );
  }

  if (!tieneRol(req, ROLES_JEFATURA_URGENTE)) {
    throw crearErrorHttp(
      403,
      "Solo jefatura puede justificar el cierre con regularizacion pendiente.",
      { codigo: "OVERRIDE_REGULARIZACION_NO_AUTORIZADO" }
    );
  }

  const motivoOverride = limpiarTexto(req.body.motivo_override);
  if (!motivoOverride) {
    throw crearErrorHttp(
      400,
      "Debes indicar motivo_override para justificar los pendientes.",
      { codigo: "MOTIVO_OVERRIDE_REQUERIDO" }
    );
  }

  return {
    tipo: "OVERRIDE_REGULARIZACION_URGENTE",
    motivo: motivoOverride,
    advertencias,
  };
};

const validarEntregaOrden = async ({
  req,
  orden,
  datosProyectados = {},
  pagoSeConfirmara = false,
  transaction,
}) => {
  const estadoActual = limpiarTexto(orden.estado).toUpperCase();

  if (estadoActual !== "LISTO_PARA_ENTREGA") {
    throw crearErrorHttp(
      409,
      "La orden debe estar en Listo para entregar y tener un cierre tecnico vigente.",
      { codigo: "CIERRE_TECNICO_REQUERIDO" }
    );
  }

  await validarItemsServicioListosOrden(orden.id, { transaction });
  await validarCierreTecnicoFileServiceOrden(orden.id, { transaction });
  await validarMaterialObligatorioOrden(orden.id, { transaction });

  const overrideRegularizacion = await validarRegularizacionUrgenteParaCierre({
    req,
    orden,
    datosProyectados,
    transaction,
  });
  const estadoPago = limpiarTexto(
    datosProyectados.estado_pago ?? orden.estado_pago
  ).toUpperCase();
  const montoPagado = normalizarDecimal(
    datosProyectados.monto_pagado ?? orden.monto_pagado,
    0
  );
  const pagoConfirmado = pagoSeConfirmara || (estadoPago === "PAGADO" && montoPagado > 0);
  let overrideComercial = null;

  if (!pagoConfirmado) {
    if (!normalizarBoolean(req.body.override_comercial)) {
      throw crearErrorHttp(409, "No puedes entregar una orden sin pago confirmado.", {
        codigo: "PAGO_REQUERIDO",
      });
    }

    if (!tieneRol(req, ROLES_OVERRIDE_COMERCIAL)) {
      throw crearErrorHttp(
        403,
        "Solo OWNER o ADMIN puede autorizar una entrega sin pago.",
        { codigo: "OVERRIDE_COMERCIAL_NO_AUTORIZADO" }
      );
    }

    const motivoOverride = limpiarTexto(req.body.motivo_override);
    if (!motivoOverride) {
      throw crearErrorHttp(
        400,
        "Debes indicar motivo_override para entregar sin pago.",
        { codigo: "MOTIVO_OVERRIDE_REQUERIDO" }
      );
    }

    overrideComercial = {
      tipo: "OVERRIDE_COMERCIAL_ENTREGA",
      motivo: motivoOverride,
    };
  }

  return { overrideRegularizacion, overrideComercial };
};

const CAMPOS_COMERCIALES_SENSIBLES = [
  "estado_pago",
  "medio_pago",
  "monto_pagado",
  "fecha_pago",
  "cobrado_por",
  "cobrado_por_id",
  "observacion_pago",
  "entregado_por",
  "entregado_por_id",
  "entregado_at",
  "observacion_cierre",
  "monto_total",
  "monto_final",
  "monto_original",
  "motivo_ajuste",
  "ajustado_por_id",
  "historial_ajustes",
];

const camposPresentes = (body = {}, campos = []) =>
  campos.filter((campo) => Object.prototype.hasOwnProperty.call(body, campo));

const camposComercialesPatchRecibidos = (body = {}) => {
  const campos = camposPresentes(body, CAMPOS_COMERCIALES_SENSIBLES);
  const estadoSolicitado = limpiarTexto(body.estado).toUpperCase();

  if (estadoSolicitado === "ENTREGADO") {
    campos.push("estado=ENTREGADO");
  }

  return campos;
};

const intentoCobroEntregaEnCreacion = (body = {}) => {
  const estadoSolicitado = limpiarTexto(body.estado).toUpperCase();
  const estadoPagoSolicitado = limpiarTexto(body.estado_pago).toUpperCase();
  const medioPagoSolicitado = limpiarTexto(body.medio_pago).toUpperCase();
  const montoPagadoSolicitado = normalizarNumero(body.monto_pagado, 0);

  return (
    ["LISTO_PARA_ENTREGA", "ENTREGADO"].includes(estadoSolicitado) ||
    (estadoPagoSolicitado && estadoPagoSolicitado !== "PENDIENTE") ||
    (medioPagoSolicitado && medioPagoSolicitado !== "PENDIENTE") ||
    montoPagadoSolicitado > 0 ||
    Boolean(limpiarTexto(body.fecha_pago)) ||
    Boolean(limpiarTexto(body.cobrado_por)) ||
    Boolean(limpiarTexto(body.observacion_pago)) ||
    Boolean(limpiarTexto(body.entregado_por)) ||
    Boolean(limpiarTexto(body.entregado_at)) ||
    Boolean(limpiarTexto(body.observacion_cierre))
  );
};

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
    ADD COLUMN IF NOT EXISTS "cobrado_por_id" UUID;

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
    ADD COLUMN IF NOT EXISTS "ajustado_por_id" UUID;

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
    ADD COLUMN IF NOT EXISTS "feedback_por_id" UUID;

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
    ADD COLUMN IF NOT EXISTS "recepcionado_por_id" UUID;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "origen_recepcion" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "diagnostico_asignado_a" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "diagnostico_asignado_a_id" UUID;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "operador_ecu_asignado_a" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "operador_ecu_asignado_a_id" UUID;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "mecanico_asignado_a" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "mecanico_asignado_a_id" UUID;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "supervisor_asignado_a" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "supervisor_asignado_a_id" UUID;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "tecnico_finalizado_por" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "tecnico_finalizado_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "entregado_por" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "entregado_por_id" UUID;

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
    ADD COLUMN IF NOT EXISTS "responsable_id" UUID;

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
    ADD COLUMN IF NOT EXISTS "responsable_id" UUID;

    ALTER TABLE "materiales_recuperados"
    ADD COLUMN IF NOT EXISTS "destino" VARCHAR(120);

    ALTER TABLE "materiales_recuperados"
    ADD COLUMN IF NOT EXISTS "motivo_excepcion_material" TEXT;

    ALTER TABLE "materiales_recuperados"
    ADD COLUMN IF NOT EXISTS "registrado_por" VARCHAR(100);

    ALTER TABLE "materiales_recuperados"
    ADD COLUMN IF NOT EXISTS "registrado_por_id" UUID;

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
  LEFT JOIN "vehiculos" v
    ON v."id" = o."vehiculoId"
   AND v."empresaId" = o."empresaId"
  LEFT JOIN "clientes" c
    ON c."id" = v."clienteId"
   AND c."empresaId" = o."empresaId"
`;

const obtenerDiagnosticosOrden = async (ordenId, empresaId = null) => {
  try {
    return await Diagnostico.findAll({
      where: empresaId ? { ordenId, empresaId } : { ordenId },
      order: [["id", "DESC"]],
    });
  } catch (error) {
    console.warn("No se pudieron cargar diagnósticos:", error.message);
    return [];
  }
};

const obtenerArchivosOrden = async (ordenId, empresaId = null) => {
  try {
    return await ArchivoECU.findAll({
      where: empresaId ? { ordenId, empresaId } : { ordenId },
      order: [["id", "DESC"]],
    });
  } catch (error) {
    console.warn("No se pudieron cargar archivos ECU:", error.message);
    return [];
  }
};

const obtenerFotosOrden = async (ordenId, empresaId = null) => {
  try {
    return await FotoVehiculo.findAll({
      where: empresaId ? { ordenId, empresaId } : { ordenId },
      order: [["id", "DESC"]],
    });
  } catch (error) {
    console.warn("No se pudieron cargar fotos:", error.message);
    return [];
  }
};

const obtenerItemsOrdenInterno = async (ordenId, empresaId = null) => {
  try {
    return await OrdenServicioItem.findAll({
      where: empresaId ? { ordenId, empresaId } : { ordenId },
      order: [["id", "ASC"]],
    });
  } catch (error) {
    console.warn("No se pudieron cargar items de servicio:", error.message);
    return [];
  }
};

const obtenerMaterialOrdenInterno = async (ordenId, empresaId = null) => {
  try {
    return await MaterialRecuperado.findAll({
      where: empresaId ? { ordenId, empresaId } : { ordenId },
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

const validarMaterialObligatorioOrden = async (
  ordenId,
  { transaction } = {}
) => {
  const items = await OrdenServicioItem.findAll({
    where: {
      ordenId,
      estado: { [Op.ne]: "ANULADO" },
      material_recuperado_obligatorio: true,
    },
    order: [["id", "ASC"]],
    transaction,
  });

  if (!items.length) return;

  const materiales = await MaterialRecuperado.findAll({
    where: { ordenId },
    transaction,
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
    error.codigo = "MATERIAL_RECUPERADO_PENDIENTE";
    error.itemsPendientes = pendientes.map((item) => ({
      id: item.id,
      tipo_servicio: item.tipo_servicio,
    }));
    throw error;
  }
};

const validarItemsServicioListosOrden = async (
  ordenId,
  { transaction } = {}
) => {
  const items = await OrdenServicioItem.findAll({
    where: { ordenId },
    attributes: ["id", "tipo_servicio", "estado"],
    order: [["id", "ASC"]],
    transaction,
  });
  const itemsPendientes = items
    .filter((item) => {
      const estado = limpiarTexto(item.estado).toUpperCase();
      return estado !== "ANULADO" && estado !== "LISTO";
    })
    .map((item) => ({
      id: item.id,
      tipo_servicio: item.tipo_servicio,
      estado: limpiarTexto(item.estado).toUpperCase() || "PENDIENTE",
    }));

  if (itemsPendientes.length > 0) {
    throw crearErrorHttp(
      409,
      "Hay servicios pendientes. Marca cada servicio activo como LISTO antes del cierre tecnico.",
      {
        codigo: "ITEMS_SERVICIO_PENDIENTES",
        itemsPendientes,
      }
    );
  }
};

const invalidarCierreTecnicoPorCambioServicio = async (
  orden,
  { transaction } = {}
) => {
  const estadoAnterior = limpiarTexto(orden.estado).toUpperCase();
  const teniaCierreVigente =
    estadoAnterior === "LISTO_PARA_ENTREGA" ||
    Boolean(orden.tecnico_finalizado_at) ||
    Boolean(limpiarTexto(orden.tecnico_finalizado_por));

  if (!teniaCierreVigente) return null;

  const estadoNuevo =
    estadoAnterior === "LISTO_PARA_ENTREGA"
      ? "EN_PROGRAMACION"
      : estadoAnterior || "EN_PROGRAMACION";

  await orden.update(
    {
      estado: estadoNuevo,
      tecnico_finalizado_at: null,
      tecnico_finalizado_por: null,
    },
    { transaction }
  );

  return {
    estado_anterior: estadoAnterior,
    estado_nuevo: estadoNuevo,
  };
};

// El cierre de un ArchivoECU puede completar su etapa tecnica, pero la orden
// solo pasa a lista para entrega cuando TODOS los controles de orden cumplen.
// No admite override implicito: jefatura debe justificarlo en el endpoint de
// estado de la orden, donde queda la auditoria correspondiente.
const validarOrdenListaParaEntregaDesdeFileService = async ({
  ordenId,
  transaction,
}) => {
  const orden = await OrdenTrabajo.findByPk(ordenId, {
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });

  if (!orden) {
    throw crearErrorHttp(404, "Orden asociada no encontrada.", {
      codigo: "ORDEN_NO_ENCONTRADA",
    });
  }

  if (normalizarBoolean(orden.creado_en_modo_urgente)) {
    const advertencias = await calcularAdvertenciasRegularizacionUrgente(
      orden,
      {},
      { transaction }
    );

    if (advertencias.length > 0) {
      throw crearErrorHttp(
        409,
        "La etapa File Service termino, pero la orden urgente aun debe regularizar datos antes de quedar lista para entrega.",
        {
          codigo: "REGULARIZACION_PENDIENTE",
          advertencias,
        }
      );
    }
  }

  await validarItemsServicioListosOrden(ordenId, { transaction });
  await validarCierreTecnicoFileServiceOrden(ordenId, { transaction });
  await validarMaterialObligatorioOrden(ordenId, { transaction });

  return orden;
};

const recalcularMontoOrdenPorItems = async (
  ordenId,
  { transaction = null } = {}
) => {
  const itemsActivos = await OrdenServicioItem.findAll({
    where: {
      ordenId,
      estado: { [Op.ne]: "ANULADO" },
    },
    transaction,
  });

  const total = itemsActivos.reduce(
    (acc, item) => acc + normalizarDecimal(item.subtotal, 0),
    0
  );
  const orden = await OrdenTrabajo.findByPk(ordenId, {
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });

  if (!orden) return null;

  const montoActual = normalizarDecimal(orden.monto_total, 0);
  const montoOriginal =
    orden.monto_original ?? (montoActual > 0 ? montoActual : total);

  await orden.update(
    {
      monto_original: montoOriginal,
      monto_total: total,
      monto_final: total,
    },
    { transaction }
  );

  return await OrdenTrabajo.findByPk(ordenId, { transaction });
};

const mapearOrdenRow = async (row, incluirDetalle = true, empresaId = null) => {
  const orden = {
    id: row.id,
    vehiculoId: row.vehiculoId,

    prioridad: row.prioridad,
    creado_en_modo_urgente: row.creado_en_modo_urgente,
    motivo_urgencia: row.motivo_urgencia,
    requiere_regularizacion: row.requiere_regularizacion,
    regularizacion_pendientes: parseJsonSeguro(
      row.regularizacion_pendientes,
      []
    ),
    regularizar_antes_de_entrega: row.regularizar_antes_de_entrega,
    urgente_creado_por: row.urgente_creado_por,
    urgente_creado_at: row.urgente_creado_at,
    regularizado_por: row.regularizado_por,
    regularizado_at: row.regularizado_at,
    estado: row.estado,
    estado_pago: row.estado_pago,
    medio_pago: row.medio_pago,
    monto_pagado: row.monto_pagado,
    fecha_pago: row.fecha_pago,
    cobrado_por: row.cobrado_por,
    cobrado_por_id: row.cobrado_por_id,
    observacion_pago: row.observacion_pago,

    kilometraje: row.kilometraje,
    motivo_ingreso: row.motivo_ingreso,
    monto_total: row.monto_total,
    monto_original: row.monto_original,
    monto_final: row.monto_final ?? row.monto_total,
    motivo_ajuste: row.motivo_ajuste,
    ajustado_por: row.ajustado_por,
    ajustado_por_id: row.ajustado_por_id,
    ajustado_at: row.ajustado_at,
    historial_ajustes: parseJsonSeguro(row.historial_ajustes, []),
    excluir_estadisticas: row.excluir_estadisticas,
    feedback_operario: row.feedback_operario,
    detalle_pendiente: row.detalle_pendiente,
    recomendacion_futura: row.recomendacion_futura,
    requiere_seguimiento: row.requiere_seguimiento,
    feedback_por: row.feedback_por,
    feedback_por_id: row.feedback_por_id,
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
    recepcionado_por_id: row.recepcionado_por_id,
    origen_recepcion: row.origen_recepcion,
    diagnostico_asignado_a: row.diagnostico_asignado_a,
    diagnostico_asignado_a_id: row.diagnostico_asignado_a_id,
    operador_ecu_asignado_a: row.operador_ecu_asignado_a,
    operador_ecu_asignado_a_id: row.operador_ecu_asignado_a_id,
    mecanico_asignado_a: row.mecanico_asignado_a,
    mecanico_asignado_a_id: row.mecanico_asignado_a_id,
    supervisor_asignado_a: row.supervisor_asignado_a,
    supervisor_asignado_a_id: row.supervisor_asignado_a_id,

    tecnico_finalizado_por: row.tecnico_finalizado_por,
    tecnico_finalizado_at: row.tecnico_finalizado_at,

    entregado_por: row.entregado_por,
    entregado_por_id: row.entregado_por_id,
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
      obtenerDiagnosticosOrden(row.id, empresaId),
      obtenerArchivosOrden(row.id, empresaId),
      obtenerFotosOrden(row.id, empresaId),
      obtenerItemsOrdenInterno(row.id, empresaId),
      obtenerMaterialOrdenInterno(row.id, empresaId),
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
    const empresaId = obtenerEmpresaIdRequerida(req);
    await prepararColumnas();

    const rows = await sequelize.query(
      `
      ${queryOrdenesBase}
      WHERE o."id" = :id
        AND o."empresaId" = :empresaId
      LIMIT 1;
      `,
      {
        replacements: { id: req.params.id, empresaId },
        type: QueryTypes.SELECT,
      }
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const orden = await mapearOrdenRow(rows[0], true, empresaId);

    res.json(orden);
  } catch (error) {
    console.error("ERROR OBTENIENDO ORDEN:", error);

    const controlado = responderErrorControlado(res, error);
    if (controlado) return;

    res.status(500).json({
      error: error.message,
    });
  }
};

const obtenerEventosOrden = async (req, res) => {
  try {
    const ordenId = Number(req.params.id);

    if (!ordenId || Number.isNaN(ordenId)) {
      return res.status(400).json({
        error: "ID de orden invalido",
      });
    }

    await prepararTablaEventosOrden();

    const orden = await OrdenTrabajo.findByPk(ordenId, {
      attributes: ["id"],
    });

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const eventos = await OrdenEventoOperativo.findAll({
      where: { ordenId },
      order: [
        ["createdAt", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.json({
      ordenId,
      eventos: eventos.map((evento) => {
        const data = evento.toJSON();
        return {
          id: data.id,
          tipo_evento: data.tipo_evento,
          categoria: data.categoria,
          titulo: data.titulo,
          descripcion: data.descripcion,
          estado_anterior: data.estado_anterior,
          estado_nuevo: data.estado_nuevo,
          usuario: data.usuario,
          usuario_rol: data.usuario_rol,
          origen: data.origen,
          metadata_publica: sanitizarMetadataEvento(data.metadata),
          createdAt: data.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error("ERROR OBTENIENDO EVENTOS DE ORDEN:", error);

    return res.status(500).json({
      error: "No se pudo cargar la bitacora operativa de la orden",
      detalle: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

const crearOrden = async (req, res) => {
  try {
    const empresaId = obtenerEmpresaIdRequerida(req);
    await prepararColumnas();

    const modoUrgente = modoUrgenteSolicitado(req.body);

    if (!tieneRol(req, ROLES_CREAR_ORDEN)) {
      return enviarErrorPermiso(res);
    }

    const esRecepcionEmergenciaOperador = rolActual(req) === "OPERADOR_ECU";

    const servicioUrgente = modoUrgente ? obtenerServicioUrgente(req.body) : "";
    const motivoUrgencia = modoUrgente
      ? limpiarTexto(req.body.motivo_urgencia)
      : "";

    if (modoUrgente && !servicioUrgente) {
      return res.status(400).json({
        error: "SERVICIO_REQUERIDO",
        message: "Debes indicar el servicio para crear una orden urgente.",
      });
    }

    if (modoUrgente && !motivoUrgencia) {
      return res.status(400).json({
        error: "MOTIVO_URGENCIA_REQUERIDO",
        message: "Debes indicar motivo_urgencia para usar el modo urgente.",
      });
    }

    if (intentoCobroEntregaEnCreacion(req.body)) {
      return res.status(409).json({
        error: "CIERRE_COMERCIAL_REQUIERE_FLUJO_DEDICADO",
        message:
          "Una orden nueva no puede nacer lista, pagada o entregada. Completa el trabajo y usa los flujos dedicados de cierre, pago y entrega.",
      });
    }

    const vehiculoId = Number(req.body.vehiculoId || req.body.vehiculo_id);

    if (!vehiculoId || Number.isNaN(vehiculoId)) {
      return res.status(400).json({
        error: "Falta vehiculoId válido",
      });
    }

    const vehiculo = await Vehiculo.findOne({
      where: {
        id: vehiculoId,
        empresaId,
      },
      attributes: ["id", "clienteId", "empresaId"],
    });

    if (!vehiculo) {
      return res.status(404).json({
        error: "Vehículo no encontrado",
      });
    }

    if (!vehiculo.clienteId) {
      return res.status(409).json({
        error: "RELACION_RECEPCION_INVALIDA",
        codigo: "RELACION_RECEPCION_INVALIDA",
        message: "El vehiculo no tiene un cliente asociado dentro de la empresa.",
      });
    }

    const cliente = await Cliente.findOne({
      where: {
        id: vehiculo.clienteId,
        empresaId,
      },
      attributes: ["id", "empresaId"],
    });

    if (!cliente) {
      return res.status(409).json({
        error: "RELACION_RECEPCION_INVALIDA",
        codigo: "RELACION_RECEPCION_INVALIDA",
        message: "El cliente asociado al vehiculo no pertenece a la empresa autenticada.",
      });
    }

    const clienteIdSolicitado = Number(
      req.body.clienteId || req.body.cliente_id || 0
    );

    if (clienteIdSolicitado && clienteIdSolicitado !== Number(cliente.id)) {
      return res.status(400).json({
        error: "RELACION_RECEPCION_INVALIDA",
        codigo: "RELACION_RECEPCION_INVALIDA",
        message: "El vehiculo no corresponde al cliente seleccionado.",
      });
    }

    const prioridadExplicita = modoUrgente
      ? "URGENTE"
      : limpiarTexto(req.body.prioridad);
    const prioridadFinal =
      prioridadExplicita ||
      (await obtenerPrioridadSugeridaPorVehiculo(vehiculoId, empresaId));
    const montoInicial = normalizarDecimal(req.body.monto_total, 0);
    const responsablesCreacion = {};
    const overridesGuardia = [];
    const responsableTecnicoGenerico = await resolverResponsableTecnicoGenerico(
      req.body,
      { empresaId }
    );

    for (const [campoId, campoTexto] of [
      ["diagnostico_asignado_a_id", "diagnostico_asignado_a"],
      ["operador_ecu_asignado_a_id", "operador_ecu_asignado_a"],
      ["mecanico_asignado_a_id", "mecanico_asignado_a"],
      ["supervisor_asignado_a_id", "supervisor_asignado_a"],
    ]) {
      const resuelto = await resolverResponsableDesdeBody(req.body, campoId, campoTexto, {
        obligatorio: false,
        empresaId,
      });
      if (resuelto?.usuario) {
        const overrideGuardia = await validarGuardiaResponsableUrgente({
          req,
          usuario: resuelto.usuario,
          modoUrgente,
        });
        if (overrideGuardia) overridesGuardia.push(overrideGuardia);
      }
      aplicarResponsableResuelto(responsablesCreacion, campoId, campoTexto, resuelto);
    }

    let tieneResponsableTecnico = [
      "diagnostico_asignado_a_id",
      "operador_ecu_asignado_a_id",
      "mecanico_asignado_a_id",
      "supervisor_asignado_a_id",
    ].some((campo) => limpiarTexto(responsablesCreacion[campo]));

    if (!tieneResponsableTecnico && responsableTecnicoGenerico) {
      const overrideGuardia = await validarGuardiaResponsableUrgente({
        req,
        usuario: responsableTecnicoGenerico.usuario,
        modoUrgente,
      });
      if (overrideGuardia) overridesGuardia.push(overrideGuardia);
      responsablesCreacion[responsableTecnicoGenerico.campoId] =
        responsableTecnicoGenerico.id;
      responsablesCreacion[responsableTecnicoGenerico.campoTexto] =
        responsableTecnicoGenerico.texto;
      tieneResponsableTecnico = true;
    }

    if (
      !tieneResponsableTecnico &&
      (!modoUrgente || !tieneRol(req, ROLES_JEFATURA_URGENTE))
    ) {
      throw crearErrorHttp(
        400,
        modoUrgente
          ? "Solo jefatura puede crear una orden urgente por asignar. Selecciona un responsable tecnico."
          : "Debes seleccionar un responsable técnico para crear la orden.",
        { codigo: "RESPONSABLE_REQUERIDO" }
      );
    }

    const advertencias = modoUrgente
      ? construirAdvertenciasCreacionUrgente({
          body: req.body,
          montoInicial,
          tieneResponsableTecnico,
        })
      : [];
    const requiereRegularizacion = modoUrgente && advertencias.length > 0;
    const ahoraUrgente = modoUrgente ? new Date() : null;
    const recepcionadoPor = usuarioActual(req);
    const recepcionadoPorId = usuarioActualId(req) || null;
    const origenRecepcion = modoUrgente
      ? "MODO_URGENTE_V1"
      : esRecepcionEmergenciaOperador
        ? "RECEPCION_EMERGENCIA_OPERADOR"
        : limpiarTexto(req.body.origen_recepcion);
    const auditoriaUrgente = modoUrgente
      ? [
          {
            tipo: "ORDEN_CREADA_MODO_URGENTE",
            texto: motivoUrgencia,
            servicio: servicioUrgente,
            creado_por: usuarioActual(req),
            fecha: ahoraUrgente.toISOString(),
            advertencias,
          },
          ...overridesGuardia.map((override) => ({
            ...override,
            creado_por: usuarioActual(req),
            fecha: ahoraUrgente.toISOString(),
          })),
        ]
      : [];

    const nuevaOrden = await OrdenTrabajo.create({
      empresaId,
      vehiculoId,
      prioridad: prioridadFinal,
      estado: modoUrgente
        ? "RECEPCIONADO"
        : limpiarTexto(req.body.estado) || "RECEPCIONADO",
      estado_pago: esRecepcionEmergenciaOperador || modoUrgente
        ? "PENDIENTE"
        : limpiarTexto(req.body.estado_pago) || "PENDIENTE",
      medio_pago: esRecepcionEmergenciaOperador || modoUrgente
        ? "PENDIENTE"
        : limpiarTexto(req.body.medio_pago) || "PENDIENTE",
      monto_pagado: esRecepcionEmergenciaOperador || modoUrgente
        ? 0
        : normalizarNumero(req.body.monto_pagado, 0),
      kilometraje: req.body.kilometraje ? Number(req.body.kilometraje) : null,
      motivo_ingreso: modoUrgente
        ? construirMotivoIngresoUrgente(req.body, servicioUrgente)
        : limpiarTexto(req.body.motivo_ingreso),
      monto_total: montoInicial,
      monto_original: montoInicial,
      monto_final: montoInicial,
      creado_en_modo_urgente: modoUrgente,
      motivo_urgencia: modoUrgente ? motivoUrgencia : null,
      requiere_regularizacion: requiereRegularizacion,
      regularizacion_pendientes: advertencias,
      regularizar_antes_de_entrega: requiereRegularizacion,
      urgente_creado_por: modoUrgente ? usuarioActual(req) : null,
      urgente_creado_at: ahoraUrgente,
      recepcionado_por: recepcionadoPor,
      recepcionado_por_id: recepcionadoPorId,
      origen_recepcion: origenRecepcion || null,
      ...responsablesCreacion,
      bitacora_operativa: auditoriaUrgente,
      excluir_estadisticas: normalizarBoolean(req.body.excluir_estadisticas),
      intervencion_fisica_tipo: normalizarTipoIntervencionFisica(
        req.body.intervencion_fisica_tipo
      ),
      intervencion_fisica_descripcion: limpiarTexto(
        req.body.intervencion_fisica_descripcion
      ),
    });

    const advertenciasOperativas = [];
    const registrarEventoCreacionSeguro = async (evento) => {
      try {
        await registrarEventoOrdenDesdeReq(req, evento, { estricto: true });
      } catch (errorEvento) {
        advertenciasOperativas.push("AUDITORIA_OPERATIVA_PENDIENTE");
        console.warn(
          `Orden #${nuevaOrden.id} creada, pero fallo un evento de auditoria:`,
          errorEvento.message
        );
      }
    };

    await registrarEventoCreacionSeguro({
      ordenId: nuevaOrden.id,
      tipo_evento: "ORDEN_CREADA",
      categoria: "OPERACION",
      titulo: "Orden creada",
      descripcion: "Orden creada en el sistema.",
      estado_nuevo: nuevaOrden.estado,
      origen: origenRecepcion || "NORMAL",
      metadata: {
        prioridad: prioridadFinal,
        recepcion_emergencia: esRecepcionEmergenciaOperador,
        modo_urgente: modoUrgente,
      },
    });

    if (modoUrgente) {
      await registrarEventoCreacionSeguro({
        ordenId: nuevaOrden.id,
        tipo_evento: "ORDEN_CREADA_MODO_URGENTE",
        categoria: "OPERACION",
        titulo: "Orden creada en modo urgente",
        descripcion: motivoUrgencia,
        estado_nuevo: nuevaOrden.estado,
        origen: "MODO_URGENTE_V1",
        metadata: {
          servicio: servicioUrgente,
          requiere_regularizacion: requiereRegularizacion,
          cantidad_advertencias: advertencias.length,
        },
      });

      for (const override of overridesGuardia) {
        await registrarEventoCreacionSeguro({
          ordenId: nuevaOrden.id,
          tipo_evento: override.tipo,
          categoria: "AUDITORIA",
          titulo: "Override de guardia autorizado",
          descripcion: override.motivo,
          origen: "MODO_URGENTE_V1",
          metadata: {
            responsable_id: override.responsable_id,
            responsable: override.responsable,
          },
        });
      }
    }

    if (origenRecepcion === "RECEPCION_EMERGENCIA_OPERADOR") {
      await registrarEventoCreacionSeguro({
        ordenId: nuevaOrden.id,
        tipo_evento: "RECEPCION_EMERGENCIA",
        categoria: "OPERACION",
        titulo: "Recepcion de emergencia operador",
        descripcion: "Orden ingresada por operador en flujo de emergencia.",
        estado_nuevo: nuevaOrden.estado,
        origen: origenRecepcion,
      });
    }

    res.status(201).json({
      mensaje: "Orden creada correctamente",
      orden: {
        ...nuevaOrden.toJSON(),
        recepcionado_por: recepcionadoPor,
        recepcionado_por_id: recepcionadoPorId,
        ...responsablesCreacion,
        origen_recepcion: origenRecepcion || null,
      },
      id: nuevaOrden.id,
      advertencias_operativas: [...new Set(advertenciasOperativas)],
      ...(modoUrgente
        ? {
            requiere_regularizacion: requiereRegularizacion,
            advertencias,
          }
        : {}),
    });
  } catch (error) {
    console.error("ERROR CREANDO ORDEN:", error);
    const controlado = responderErrorControlado(res, error);
    if (controlado) return;

    res.status(500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const actualizarOrden = async (req, res) => {
  let transaction = null;

  try {
    const empresaId = obtenerEmpresaIdRequerida(req);
    await prepararColumnas();

    const orden = await OrdenTrabajo.findOne({
      where: {
        id: req.params.id,
        empresaId,
      },
    });

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

    if (limpiarTexto(orden.estado).toUpperCase() === "ENTREGADO") {
      throw crearErrorHttp(
        409,
        "La orden ya fue entregada. Usa un flujo explícito de reapertura autorizado para modificarla.",
        { codigo: "ORDEN_YA_ENTREGADA" }
      );
    }

    if (limpiarTexto(req.body.estado).toUpperCase() === "ENTREGADO") {
      throw crearErrorHttp(
        409,
        "Para entregar una orden usa el endpoint dedicado /api/ordenes/:id/cobrar-entregar.",
        { codigo: "ENTREGA_REQUIERE_ENDPOINT_DEDICADO" }
      );
    }

    let estadoAnteriorOrden = limpiarTexto(orden.estado);
    const camposComerciales = camposComercialesPatchRecibidos(req.body);

    if (camposComerciales.length > 0 && !tieneRol(req, ROLES_PATCH_COMERCIAL)) {
      return res.status(403).json({
        error:
          "No tienes permisos para modificar campos comerciales de pago, cobro, entrega o montos.",
        campos: camposComerciales,
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

    if (Object.prototype.hasOwnProperty.call(payload, "estado")) {
      const estadoNormalizado = limpiarTexto(payload.estado).toUpperCase();
      if (["ENTREGADO", "LISTO_PARA_ENTREGA"].includes(estadoNormalizado)) {
        payload.estado = estadoNormalizado;
      }

    }

    if (Object.prototype.hasOwnProperty.call(payload, "estado_pago")) {
      const estadoPagoNormalizado = limpiarTexto(payload.estado_pago).toUpperCase();
      if (estadoPagoNormalizado === "PAGADO") {
        payload.estado_pago = estadoPagoNormalizado;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "motivo_ingreso")) {
      payload.motivo_ingreso = preservarServicioEnMotivo(
        orden.motivo_ingreso,
        payload.motivo_ingreso
      );
    }

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
      payload.feedback_por_id = usuarioActualId(req) || null;
      payload.feedback_at = new Date();
    }

    const responsablesPayload = {};
    const responsablesResueltos = {};
    const overridesGuardiaPatch = [];

    for (const config of RESPONSABLES_ORDEN_CONFIG) {
      const tieneCampoTexto = Object.prototype.hasOwnProperty.call(payload, config.campoTexto);
      const tieneCampoId = Object.prototype.hasOwnProperty.call(req.body, config.campoId);

      if (tieneCampoTexto) {
        delete payload[config.campoTexto];
      }

      if (tieneCampoTexto || tieneCampoId) {
        if (tieneCampoTexto && !tieneCampoId) {
          const textoSolicitado = limpiarTexto(req.body[config.campoTexto]);
          const textoActual = limpiarTexto(orden[config.campoTexto]);

          if (textoSolicitado === textoActual) continue;

          throw crearErrorHttp(
            400,
            "Para cambiar un responsable debes enviar su ID de usuario activo.",
            { codigo: "RESPONSABLE_INVALIDO" }
          );
        }

        const resuelto = await resolverResponsableDesdeBody(
          req.body,
          config.campoId,
          config.campoTexto,
          {
            obligatorio: tieneCampoId,
            empresaId,
          }
        );

        if (resuelto) {
          aplicarResponsableResuelto(
            responsablesPayload,
            config.campoId,
            config.campoTexto,
            resuelto
          );
          responsablesResueltos[config.campoTexto] = resuelto;
        }
      }
    }

    let responsablesActuales = {};

    if (Object.keys(responsablesPayload).length > 0) {
      const responsablesRows = await sequelize.query(
        `
        SELECT
          "recepcionado_por",
          "recepcionado_por_id",
          "diagnostico_asignado_a",
          "diagnostico_asignado_a_id",
          "operador_ecu_asignado_a",
          "operador_ecu_asignado_a_id",
          "mecanico_asignado_a",
          "mecanico_asignado_a_id",
          "supervisor_asignado_a",
          "supervisor_asignado_a_id"
        FROM "ordenes_trabajo"
        WHERE "id" = :id
          AND "empresaId" = :empresaId
        LIMIT 1;
        `,
        {
          replacements: { id: orden.id, empresaId },
          type: QueryTypes.SELECT,
        }
      );

      responsablesActuales = responsablesRows[0] || {};
    }

    for (const config of RESPONSABLES_ORDEN_CONFIG) {
      const resuelto = responsablesResueltos[config.campoTexto];
      if (!resuelto?.usuario) continue;

      const anteriorId = limpiarTexto(responsablesActuales[config.campoId]);
      if (anteriorId && anteriorId === resuelto.id) continue;

      const overrideGuardia = await validarGuardiaResponsableUrgente({
        req,
        usuario: resuelto.usuario,
        modoUrgente: normalizarBoolean(orden.creado_en_modo_urgente),
      });
      if (overrideGuardia) overridesGuardiaPatch.push(overrideGuardia);
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
      payload.cobrado_por_id = usuarioActualId(req) || null;

      if (!payload.medio_pago || payload.medio_pago === "PENDIENTE") {
        payload.medio_pago = "TRANSFERENCIA";
      }

      if (!payload.monto_pagado || Number(payload.monto_pagado) <= 0) {
        payload.monto_pagado = montoComercialOrden(orden);
      }
    }

    transaction = await sequelize.transaction();

    if (payload.estado === "LISTO_PARA_ENTREGA") {
      await bloquearArchivosFileServiceOrden(orden.id, transaction);
    }

    await orden.reload({ transaction, lock: transaction.LOCK.UPDATE });

    if (
      orden.archivada ||
      limpiarTexto(orden.estado).toUpperCase() === "ENTREGADO"
    ) {
      await transaction.rollback();
      throw crearErrorHttp(
        409,
        "La orden ya no esta activa para ser modificada.",
        { codigo: "ORDEN_YA_ENTREGADA" }
      );
    }

    estadoAnteriorOrden = limpiarTexto(orden.estado);
    let overrideRegularizacionCierre = null;

    if (Object.prototype.hasOwnProperty.call(payload, "motivo_ingreso")) {
      payload.motivo_ingreso = preservarServicioEnMotivo(
        orden.motivo_ingreso,
        payload.motivo_ingreso
      );

      const patronServicioEstructural =
        /^(?:servicio urgente|servicio solicitado)\s*:/im;
      const introduceServicioEstructural =
        !patronServicioEstructural.test(limpiarTexto(orden.motivo_ingreso)) &&
        patronServicioEstructural.test(limpiarTexto(payload.motivo_ingreso));
      const teniaCierreTecnico =
        limpiarTexto(estadoAnteriorOrden).toUpperCase() ===
          "LISTO_PARA_ENTREGA" ||
        Boolean(orden.tecnico_finalizado_at) ||
        Boolean(limpiarTexto(orden.tecnico_finalizado_por));
      const revalidaComoListoEnEstePatch =
        limpiarTexto(payload.estado).toUpperCase() === "LISTO_PARA_ENTREGA";

      if (
        introduceServicioEstructural &&
        teniaCierreTecnico &&
        !revalidaComoListoEnEstePatch
      ) {
        if (
          limpiarTexto(estadoAnteriorOrden).toUpperCase() ===
          "LISTO_PARA_ENTREGA"
        ) {
          payload.estado = "EN_PROGRAMACION";
        }
        payload.tecnico_finalizado_at = null;
        payload.tecnico_finalizado_por = null;
      }
    }

    if (
      limpiarTexto(estadoAnteriorOrden).toUpperCase() === "LISTO_PARA_ENTREGA" &&
      Object.prototype.hasOwnProperty.call(payload, "estado") &&
      limpiarTexto(payload.estado).toUpperCase() !== "LISTO_PARA_ENTREGA"
    ) {
      payload.tecnico_finalizado_at = null;
      payload.tecnico_finalizado_por = null;
    }

    const datosProyectados = {
      ...payload,
      ...responsablesPayload,
    };

    if (payload.estado === "LISTO_PARA_ENTREGA") {
      overrideRegularizacionCierre =
        await validarRegularizacionUrgenteParaCierre({
          req,
          orden,
          datosProyectados,
          transaction,
        });
      await validarItemsServicioListosOrden(orden.id, { transaction });
      await validarCierreTecnicoFileServiceOrden(orden.id, {
        transaction,
        motivoIngresoProyectado: datosProyectados.motivo_ingreso,
      });
      await validarMaterialObligatorioOrden(orden.id, { transaction });
      payload.tecnico_finalizado_at = orden.tecnico_finalizado_at || new Date();
      payload.tecnico_finalizado_por =
        orden.tecnico_finalizado_por || usuarioActual(req);
    }

    const auditoriasOverridePatch = [
      ...overridesGuardiaPatch.map((override) => ({
        req,
        tipo: override.tipo,
        motivo: override.motivo,
        metadata: {
          responsable_id: override.responsable_id,
          responsable: override.responsable,
          pendientes_criticos: override.pendientes_criticos,
        },
      })),
      ...(overrideRegularizacionCierre
        ? [
            {
              req,
              ...overrideRegularizacionCierre,
              metadata: {
                advertencias: overrideRegularizacionCierre.advertencias,
                destino: "LISTO_PARA_ENTREGA",
              },
            },
          ]
        : []),
    ];
    anexarAuditoriasOverrideAlPayload({
      orden,
      payload,
      auditorias: auditoriasOverridePatch,
    });
    Object.assign(payload, responsablesPayload);
    await orden.update(payload, { transaction });
    await transaction.commit();
    const advertenciasOperativas = [];

    if (
      Object.prototype.hasOwnProperty.call(payload, "estado") &&
      limpiarTexto(payload.estado) &&
      limpiarTexto(payload.estado) !== estadoAnteriorOrden
    ) {
      await registrarEventoOrdenPostPersistenciaSeguro(req, {
        ordenId: orden.id,
        tipo_evento: "ESTADO_CAMBIADO",
        categoria: "OPERACION",
        titulo: "Estado actualizado",
        descripcion: "Estado de orden actualizado.",
        estado_anterior: estadoAnteriorOrden,
        estado_nuevo: payload.estado,
        origen: "PATCH_ORDEN",
      }, advertenciasOperativas);
    }

    if (actualizaFeedback) {
      await registrarEventoOrdenPostPersistenciaSeguro(req, {
        ordenId: orden.id,
        tipo_evento: "FEEDBACK_REGISTRADO",
        categoria: "OPERACION",
        titulo: "Feedback operativo registrado",
        descripcion: "Se registro feedback operativo en la orden.",
        origen: "PATCH_ORDEN",
        metadata: {
          requiere_seguimiento: payload.requiere_seguimiento === true,
        },
      }, advertenciasOperativas);
    }

    for (const auditoria of auditoriasOverridePatch) {
      const eventoRegistrado = await registrarAuditoriaOverrideOrden({
        ...auditoria,
        orden,
        bitacoraYaPersistida: true,
      });
      if (!eventoRegistrado) {
        advertenciasOperativas.push("AUDITORIA_OPERATIVA_PENDIENTE");
      }
    }

    if (Object.keys(responsablesPayload).length > 0) {
      const responsablesCambiados = Object.entries(responsablesPayload)
        .filter(([campo]) => NOTIFICACIONES_RESPONSABLES[campo])
        .filter(([, nuevoResponsable]) => Boolean(limpiarTexto(nuevoResponsable)))
        .filter(([campo, nuevoResponsable]) => {
          const anterior = limpiarTexto(responsablesActuales[campo]);
          return limpiarTexto(nuevoResponsable) !== anterior;
        });

      for (const [campo, nuevoResponsable] of responsablesCambiados) {
        const meta = NOTIFICACIONES_RESPONSABLES[campo];
        await registrarEventoOrdenPostPersistenciaSeguro(req, {
          ordenId: orden.id,
          tipo_evento: "RESPONSABLE_ASIGNADO",
          categoria: "OPERACION",
          titulo: "Responsable actualizado",
          descripcion: "Responsable asignado o modificado.",
          origen: "PATCH_ORDEN",
          metadata: {
            campo,
            etapa: meta.etapa,
            responsable_anterior: limpiarTexto(responsablesActuales[campo]),
            responsable_nuevo: limpiarTexto(nuevoResponsable),
          },
        }, advertenciasOperativas);
      }
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

    const esOrdenUrgente = normalizarBoolean(orden.creado_en_modo_urgente);
    const regularizacion = esOrdenUrgente
      ? await sincronizarRegularizacionPostPersistenciaSeguro(
          orden.id,
          req,
          { overrideAutorizado: Boolean(overrideRegularizacionCierre) },
          advertenciasOperativas,
          orden
        )
      : {
          orden: await recargarOrdenPostPersistenciaSeguro(
            orden,
            advertenciasOperativas
          ),
          advertencias: [],
        };
    advertenciasOperativas.push(...(regularizacion.advertenciasOperativas || []));

    res.json({
      mensaje: "Orden actualizada correctamente",
      orden: regularizacion.orden,
      ...(esOrdenUrgente
        ? {
            requiere_regularizacion: regularizacion.advertencias.length > 0,
            advertencias: regularizacion.advertencias,
          }
        : {}),
      advertencias_operativas: [...new Set(advertenciasOperativas)],
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("ERROR ACTUALIZANDO ORDEN:", error);
    const controlado = responderErrorControlado(res, error);
    if (controlado) return;

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
      ajustado_por_id: usuarioActualId(req) || null,
      ajustado_at: ahora,
      historial_ajustes: [...historialActual, evento],
    });

    await registrarEventoOrdenDesdeReq(req, {
      ordenId: orden.id,
      tipo_evento: "AJUSTE_COMERCIAL",
      categoria: "COMERCIAL",
      titulo: "Ajuste comercial registrado",
      descripcion: "Se registro un ajuste comercial con motivo obligatorio.",
      origen: "AJUSTE_COMERCIAL",
      metadata: {
        tiene_motivo: Boolean(motivoAjuste),
      },
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
  let transaction = null;

  try {
    await prepararColumnas();

    if (!tieneRol(req, ROLES_GESTION_ITEMS)) {
      return enviarErrorPermiso(res);
    }

    const tipoServicio = limpiarTexto(req.body.tipo_servicio);

    if (!tipoServicio) {
      return res.status(400).json({
        error: "Debes indicar tipo_servicio",
      });
    }

    const responsableResuelto = await resolverResponsableDesdeBody(
      req.body,
      "responsable_id",
      "responsable",
      { obligatorio: true }
    );

    const cantidad = Math.max(normalizarDecimal(req.body.cantidad, 1), 0);
    const precioUnitario = Math.max(
      normalizarDecimal(req.body.precio_unitario, 0),
      0
    );
    const subtotal = calcularSubtotalItem(cantidad, precioUnitario);

    transaction = await sequelize.transaction();
    const orden = await OrdenTrabajo.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!orden) {
      throw crearErrorHttp(404, "Orden no encontrada.", {
        codigo: "ORDEN_NO_ENCONTRADA",
      });
    }

    if (orden.archivada) {
      throw crearErrorHttp(
        409,
        "No puedes agregar servicios a una orden archivada.",
        { codigo: "ORDEN_ARCHIVADA" }
      );
    }

    if (
      limpiarTexto(orden.estado_pago).toUpperCase() === "PAGADO" ||
      limpiarTexto(orden.estado).toUpperCase() === "ENTREGADO"
    ) {
      throw crearErrorHttp(
        409,
        "La orden ya esta pagada o entregada. Usa ajuste comercial para corregir montos.",
        { codigo: "ORDEN_COMERCIAL_CERRADA" }
      );
    }

    const overrideGuardiaItem = await validarGuardiaResponsableUrgente({
      req,
      usuario: responsableResuelto.usuario,
      modoUrgente: normalizarBoolean(orden.creado_en_modo_urgente),
    });

    const item = await OrdenServicioItem.create(
      {
        ordenId: orden.id,
        tipo_servicio: tipoServicio,
        categoria: normalizarCategoriaItem(req.body.categoria),
        descripcion: limpiarTexto(req.body.descripcion),
        cantidad,
        precio_unitario: precioUnitario,
        subtotal,
        responsable: responsableResuelto.texto,
        responsable_id: responsableResuelto.id,
        estado: normalizarEstadoItem(req.body.estado),
        requiere_material_recuperado: normalizarBoolean(
          req.body.requiere_material_recuperado
        ),
        material_recuperado_obligatorio: normalizarBoolean(
          req.body.material_recuperado_obligatorio
        ),
        observaciones: limpiarTexto(req.body.observaciones),
      },
      { transaction }
    );

    if (overrideGuardiaItem) {
      const payloadAuditoria = {};
      anexarAuditoriasOverrideAlPayload({
        orden,
        payload: payloadAuditoria,
        auditorias: [
          {
            req,
            ...overrideGuardiaItem,
            metadata: {
              itemId: item.id,
              responsable_id: overrideGuardiaItem.responsable_id,
              responsable: overrideGuardiaItem.responsable,
              pendientes_criticos: overrideGuardiaItem.pendientes_criticos,
            },
          },
        ],
      });
      await orden.update(payloadAuditoria, { transaction });
    }

    const cierreTecnicoInvalidado =
      await invalidarCierreTecnicoPorCambioServicio(orden, { transaction });

    const ordenActualizada = await recalcularMontoOrdenPorItems(orden.id, {
      transaction,
    });

    await transaction.commit();
    transaction = null;

    const advertenciasOperativas = [];
    if (overrideGuardiaItem) {
      const eventoRegistrado = await registrarAuditoriaOverrideOrden({
        req,
        orden,
        ...overrideGuardiaItem,
        metadata: {
          itemId: item.id,
          responsable_id: overrideGuardiaItem.responsable_id,
          responsable: overrideGuardiaItem.responsable,
          pendientes_criticos: overrideGuardiaItem.pendientes_criticos,
        },
        bitacoraYaPersistida: true,
      });
      if (!eventoRegistrado) {
        advertenciasOperativas.push("AUDITORIA_OPERATIVA_PENDIENTE");
      }
    }

    if (cierreTecnicoInvalidado) {
      advertenciasOperativas.push("CIERRE_TECNICO_REABIERTO");
      await registrarEventoOrdenPostPersistenciaSeguro(
        req,
        {
          ordenId: orden.id,
          tipo_evento: "CIERRE_TECNICO_REABIERTO",
          categoria: "OPERACION",
          titulo: "Cierre tecnico reabierto",
          descripcion:
            "Se agrego un servicio despues del cierre tecnico; la orden debe validarse nuevamente.",
          estado_anterior: cierreTecnicoInvalidado.estado_anterior,
          estado_nuevo: cierreTecnicoInvalidado.estado_nuevo,
          origen: "ITEM_SERVICIO",
          metadata: { itemId: item.id },
        },
        advertenciasOperativas
      );
    }

    await registrarEventoOrdenPostPersistenciaSeguro(
      req,
      {
        ordenId: orden.id,
        tipo_evento: "ITEM_SERVICIO_AGREGADO",
        categoria: "SERVICIO",
        titulo: "Item de servicio agregado",
        descripcion: "Se agrego un servicio a la orden.",
        origen: "ITEM_SERVICIO",
        metadata: {
          itemId: item.id,
          tipo_servicio: item.tipo_servicio,
          categoria: item.categoria,
          requiere_material_recuperado:
            item.requiere_material_recuperado === true,
          material_recuperado_obligatorio:
            item.material_recuperado_obligatorio === true,
        },
      },
      advertenciasOperativas
    );

    res.status(201).json({
      mensaje: "Item de servicio agregado correctamente",
      item,
      orden: ordenActualizada,
      advertencias_operativas: [...new Set(advertenciasOperativas)],
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("ERROR CREANDO ITEM DE ORDEN:", error);
    const controlado = responderErrorControlado(res, error);
    if (controlado) return;

    res.status(500).json({
      error: error.message,
    });
  }
};

const actualizarItemOrden = async (req, res) => {
  let transaction = null;

  try {
    await prepararColumnas();

    if (!tieneRol(req, ROLES_GESTION_ITEMS)) {
      return enviarErrorPermiso(res);
    }

    transaction = await sequelize.transaction();
    const orden = await OrdenTrabajo.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!orden) {
      throw crearErrorHttp(404, "Orden no encontrada.", {
        codigo: "ORDEN_NO_ENCONTRADA",
      });
    }

    if (orden.archivada) {
      throw crearErrorHttp(
        409,
        "No puedes modificar servicios de una orden archivada.",
        { codigo: "ORDEN_ARCHIVADA" }
      );
    }

    if (limpiarTexto(orden.estado).toUpperCase() === "ENTREGADO") {
      throw crearErrorHttp(
        409,
        "La orden ya fue entregada y sus servicios no se pueden modificar.",
        { codigo: "ORDEN_YA_ENTREGADA" }
      );
    }

    const item = await OrdenServicioItem.findOne({
      where: {
        id: req.params.itemId,
        ordenId: orden.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!item) {
      throw crearErrorHttp(404, "Item de servicio no encontrado.", {
        codigo: "ITEM_SERVICIO_NO_ENCONTRADO",
      });
    }

    const alteraMonto =
      Object.prototype.hasOwnProperty.call(req.body, "cantidad") ||
      Object.prototype.hasOwnProperty.call(req.body, "precio_unitario") ||
      Object.prototype.hasOwnProperty.call(req.body, "estado");

    if (
      alteraMonto &&
      limpiarTexto(orden.estado_pago).toUpperCase() === "PAGADO"
    ) {
      throw crearErrorHttp(
        409,
        "La orden ya esta pagada. Usa ajuste comercial para corregir montos.",
        { codigo: "ORDEN_PAGADA" }
      );
    }

    const payload = {};
    let overrideGuardiaItem = null;

    ["tipo_servicio", "descripcion", "observaciones"].forEach(
      (campo) => {
        if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
          payload[campo] = limpiarTexto(req.body[campo]);
        }
      }
    );

    const intentaCambiarResponsableItem =
      Object.prototype.hasOwnProperty.call(req.body, "responsable_id") ||
      Object.prototype.hasOwnProperty.call(req.body, "responsable");

    if (intentaCambiarResponsableItem) {
      const responsableResuelto = await resolverResponsableDesdeBody(
        req.body,
        "responsable_id",
        "responsable",
        {
          obligatorio: Object.prototype.hasOwnProperty.call(req.body, "responsable_id"),
        }
      );

      if (responsableResuelto) {
        if (
          responsableResuelto.usuario &&
          limpiarTexto(item.responsable_id) !== responsableResuelto.id
        ) {
          overrideGuardiaItem = await validarGuardiaResponsableUrgente({
            req,
            usuario: responsableResuelto.usuario,
            modoUrgente: normalizarBoolean(orden.creado_en_modo_urgente),
          });
        }
        aplicarResponsableResuelto(
          payload,
          "responsable_id",
          "responsable",
          responsableResuelto
        );
      }
    }

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

    await item.update(payload, { transaction });

    if (overrideGuardiaItem) {
      const payloadAuditoria = {};
      anexarAuditoriasOverrideAlPayload({
        orden,
        payload: payloadAuditoria,
        auditorias: [
          {
            req,
            ...overrideGuardiaItem,
            metadata: {
              itemId: item.id,
              responsable_id: overrideGuardiaItem.responsable_id,
              responsable: overrideGuardiaItem.responsable,
              pendientes_criticos: overrideGuardiaItem.pendientes_criticos,
            },
          },
        ],
      });
      await orden.update(payloadAuditoria, { transaction });
    }

    const cierreTecnicoInvalidado =
      Object.keys(payload).length > 0
        ? await invalidarCierreTecnicoPorCambioServicio(orden, { transaction })
        : null;

    const ordenActualizada = alteraMonto
      ? await recalcularMontoOrdenPorItems(orden.id, { transaction })
      : orden;

    await transaction.commit();
    transaction = null;

    const advertenciasOperativas = [];
    if (overrideGuardiaItem) {
      const eventoRegistrado = await registrarAuditoriaOverrideOrden({
        req,
        orden,
        ...overrideGuardiaItem,
        metadata: {
          itemId: item.id,
          responsable_id: overrideGuardiaItem.responsable_id,
          responsable: overrideGuardiaItem.responsable,
          pendientes_criticos: overrideGuardiaItem.pendientes_criticos,
        },
        bitacoraYaPersistida: true,
      });
      if (!eventoRegistrado) {
        advertenciasOperativas.push("AUDITORIA_OPERATIVA_PENDIENTE");
      }
    }

    if (cierreTecnicoInvalidado) {
      advertenciasOperativas.push("CIERRE_TECNICO_REABIERTO");
      await registrarEventoOrdenPostPersistenciaSeguro(
        req,
        {
          ordenId: orden.id,
          tipo_evento: "CIERRE_TECNICO_REABIERTO",
          categoria: "OPERACION",
          titulo: "Cierre tecnico reabierto",
          descripcion:
            "Se modifico un servicio despues del cierre tecnico; la orden debe validarse nuevamente.",
          estado_anterior: cierreTecnicoInvalidado.estado_anterior,
          estado_nuevo: cierreTecnicoInvalidado.estado_nuevo,
          origen: "ITEM_SERVICIO",
          metadata: { itemId: item.id },
        },
        advertenciasOperativas
      );
    }

    await registrarEventoOrdenPostPersistenciaSeguro(
      req,
      {
        ordenId: orden.id,
        tipo_evento: "ITEM_SERVICIO_ACTUALIZADO",
        categoria: "SERVICIO",
        titulo: "Item de servicio actualizado",
        descripcion: "Se actualizo o modifico un servicio de la orden.",
        origen: "ITEM_SERVICIO",
        metadata: {
          itemId: item.id,
          tipo_servicio: item.tipo_servicio,
          estado: item.estado,
        },
      },
      advertenciasOperativas
    );

    res.json({
      mensaje: "Item de servicio actualizado correctamente",
      item,
      orden: ordenActualizada,
      advertencias_operativas: [...new Set(advertenciasOperativas)],
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("ERROR ACTUALIZANDO ITEM DE ORDEN:", error);
    const controlado = responderErrorControlado(res, error);
    if (controlado) return;

    res.status(500).json({
      error: error.message,
    });
  }
};

const eliminarItemOrden = async (req, res) => {
  let transaction = null;

  try {
    await prepararColumnas();

    if (!tieneRol(req, ROLES_GESTION_ITEMS)) {
      return enviarErrorPermiso(res);
    }

    transaction = await sequelize.transaction();
    const orden = await OrdenTrabajo.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!orden) {
      throw crearErrorHttp(404, "Orden no encontrada.", {
        codigo: "ORDEN_NO_ENCONTRADA",
      });
    }

    if (
      limpiarTexto(orden.estado_pago).toUpperCase() === "PAGADO" ||
      limpiarTexto(orden.estado).toUpperCase() === "ENTREGADO"
    ) {
      throw crearErrorHttp(
        409,
        "No puedes anular servicios de una orden pagada o entregada.",
        { codigo: "ORDEN_COMERCIAL_CERRADA" }
      );
    }

    const item = await OrdenServicioItem.findOne({
      where: {
        id: req.params.itemId,
        ordenId: orden.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!item) {
      throw crearErrorHttp(404, "Item de servicio no encontrado.", {
        codigo: "ITEM_SERVICIO_NO_ENCONTRADO",
      });
    }

    const observaciones = [
      limpiarTexto(item.observaciones),
      `Anulado por ${usuarioActual(req)} el ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join("\n");

    await item.update(
      {
        estado: "ANULADO",
        subtotal: 0,
        observaciones,
      },
      { transaction }
    );
    const cierreTecnicoInvalidado =
      await invalidarCierreTecnicoPorCambioServicio(orden, { transaction });

    const ordenActualizada = await recalcularMontoOrdenPorItems(orden.id, {
      transaction,
    });

    await transaction.commit();
    transaction = null;

    const advertenciasOperativas = [];
    if (cierreTecnicoInvalidado) {
      advertenciasOperativas.push("CIERRE_TECNICO_REABIERTO");
      await registrarEventoOrdenPostPersistenciaSeguro(
        req,
        {
          ordenId: orden.id,
          tipo_evento: "CIERRE_TECNICO_REABIERTO",
          categoria: "OPERACION",
          titulo: "Cierre tecnico reabierto",
          descripcion:
            "Se anulo un servicio despues del cierre tecnico; la orden debe validarse nuevamente.",
          estado_anterior: cierreTecnicoInvalidado.estado_anterior,
          estado_nuevo: cierreTecnicoInvalidado.estado_nuevo,
          origen: "ITEM_SERVICIO",
          metadata: { itemId: item.id },
        },
        advertenciasOperativas
      );
    }

    await registrarEventoOrdenPostPersistenciaSeguro(
      req,
      {
        ordenId: orden.id,
        tipo_evento: "ITEM_SERVICIO_ACTUALIZADO",
        categoria: "SERVICIO",
        titulo: "Item de servicio actualizado",
        descripcion: "Se actualizo o anulo un servicio de la orden.",
        origen: "ITEM_SERVICIO",
        metadata: {
          itemId: item.id,
          tipo_servicio: item.tipo_servicio,
          estado: item.estado,
        },
      },
      advertenciasOperativas
    );

    res.json({
      mensaje: "Item de servicio anulado correctamente",
      item,
      orden: ordenActualizada,
      advertencias_operativas: [...new Set(advertenciasOperativas)],
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("ERROR ANULANDO ITEM DE ORDEN:", error);

    const controlado = responderErrorControlado(res, error);
    if (controlado) return;

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
    let responsableMaterial = null;

    if (limpiarTexto(req.body.responsable_id)) {
      responsableMaterial = await resolverResponsableDesdeBody(
        req.body,
        "responsable_id",
        "responsable",
        { obligatorio: true }
      );
    } else if (limpiarTexto(req.body.responsable)) {
      throw crearErrorHttp(
        400,
        "Debes seleccionar responsable_id desde usuarios activos para registrar material.",
        { codigo: "RESPONSABLE_REQUERIDO" }
      );
    } else if (usuarioActualId(req)) {
      responsableMaterial = {
        id: usuarioActualId(req),
        texto: usuario,
        usuario: req.usuario || req.user || null,
        legacy: false,
      };
    }

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
      responsable: responsableMaterial?.texto || usuario,
      responsable_id: responsableMaterial?.id || null,
      destino: limpiarTexto(req.body.destino),
      motivo_excepcion_material: motivoExcepcion,
      creado_por: usuario,
      registrado_por: usuario,
      registrado_por_id: usuarioActualId(req) || null,
      registrado_at: new Date(),
      auditoria: [eventoAuditoria],
    });

    await registrarEventoOrdenDesdeReq(req, {
      ordenId: orden.id,
      tipo_evento: "MATERIAL_RECUPERADO_REGISTRADO",
      categoria: "OPERACION",
      titulo: "Material recuperado registrado",
      descripcion: "Se registro material recuperado o motivo de excepcion.",
      origen: "MATERIAL_RECUPERADO",
      metadata: {
        materialId: material.id,
        itemId: itemId || null,
        tipo_material: material.tipo_material,
        tiene_peso: pesoKg > 0,
        tiene_excepcion: Boolean(motivoExcepcion),
      },
    });

    res.status(201).json({
      mensaje: "Material recuperado registrado correctamente",
      material,
      item,
    });
  } catch (error) {
    console.error("ERROR REGISTRANDO MATERIAL RECUPERADO:", error);
    const controlado = responderErrorControlado(res, error);
    if (controlado) return;

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
  let transaction = null;

  try {
    await prepararColumnas();

    let orden = await OrdenTrabajo.findByPk(req.params.id);

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

    const estadoSolicitado = limpiarTexto(req.body.estado);
    const estadoNormalizado = estadoSolicitado.toUpperCase();
    const estado = ["ENTREGADO", "LISTO_PARA_ENTREGA"].includes(
      estadoNormalizado
    )
      ? estadoNormalizado
      : estadoSolicitado;

    if (!estado) {
      return res.status(400).json({
        error: "Debes indicar estado",
      });
    }

    if (estado === "ENTREGADO" && !tieneRol(req, ROLES_PATCH_COMERCIAL)) {
      return res.status(403).json({
        error: "No tienes permisos para entregar ordenes por cambio de estado.",
      });
    }

    transaction = await sequelize.transaction();

    if (["LISTO_PARA_ENTREGA", "ENTREGADO"].includes(estado)) {
      await bloquearArchivosFileServiceOrden(orden.id, transaction);
    }

    orden = await OrdenTrabajo.findByPk(orden.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!orden || orden.archivada) {
      await transaction.rollback();
      return res.status(409).json({
        error: "ORDEN_NO_ACTIVA",
        message: "La orden ya no esta activa para cambiar de estado.",
      });
    }

    if (limpiarTexto(orden.estado).toUpperCase() === "ENTREGADO") {
      await transaction.rollback();
      return res.status(409).json({
        error: "ORDEN_YA_ENTREGADA",
        message:
          "La orden ya fue entregada. Usa un flujo explícito de reapertura autorizado.",
      });
    }

    const estadoAnteriorOrden = limpiarTexto(orden.estado);

    const payload = {
      estado,
    };

    if (
      limpiarTexto(estadoAnteriorOrden).toUpperCase() === "LISTO_PARA_ENTREGA" &&
      limpiarTexto(estado).toUpperCase() !== "LISTO_PARA_ENTREGA"
    ) {
      payload.tecnico_finalizado_at = null;
      payload.tecnico_finalizado_por = null;
    }

    let overrideRegularizacionCierre = null;
    let overridesEntrega = {
      overrideRegularizacion: null,
      overrideComercial: null,
    };

    if (estado === "LISTO_PARA_ENTREGA") {
      overrideRegularizacionCierre =
        await validarRegularizacionUrgenteParaCierre({
          req,
          orden,
          transaction,
        });
      await validarItemsServicioListosOrden(orden.id, { transaction });
      await validarCierreTecnicoFileServiceOrden(orden.id, { transaction });
      await validarMaterialObligatorioOrden(orden.id, { transaction });
      payload.tecnico_finalizado_at = orden.tecnico_finalizado_at || new Date();
      payload.tecnico_finalizado_por =
        orden.tecnico_finalizado_por || usuarioActual(req);
    }

    if (estado === "ENTREGADO") {
      overridesEntrega = await validarEntregaOrden({ req, orden, transaction });
      payload.entregado_at = new Date();
      payload.entregado_por = usuarioActual(req);
      payload.entregado_por_id = usuarioActualId(req) || null;
      payload.observacion_cierre =
        limpiarTexto(req.body.observacion_cierre) ||
        limpiarTexto(orden.observacion_cierre) ||
        `Orden entregada por ${usuarioActual(req)}`;
    }

    const auditoriasOverrideEstado = [
      ...(overrideRegularizacionCierre
        ? [
            {
              req,
              ...overrideRegularizacionCierre,
              metadata: {
                advertencias: overrideRegularizacionCierre.advertencias,
                destino: "LISTO_PARA_ENTREGA",
              },
            },
          ]
        : []),
      ...(overridesEntrega.overrideRegularizacion
        ? [
            {
              req,
              ...overridesEntrega.overrideRegularizacion,
              metadata: {
                advertencias: overridesEntrega.overrideRegularizacion.advertencias,
                destino: "ENTREGADO",
              },
            },
          ]
        : []),
      ...(overridesEntrega.overrideComercial
        ? [
            {
              req,
              ...overridesEntrega.overrideComercial,
              metadata: {
                destino: "ENTREGADO",
                estado_pago: limpiarTexto(orden.estado_pago),
              },
            },
          ]
        : []),
    ];
    anexarAuditoriasOverrideAlPayload({
      orden,
      payload,
      auditorias: auditoriasOverrideEstado,
    });
    await orden.update(payload, transaction ? { transaction } : undefined);

    if (transaction) {
      await transaction.commit();
    }

    const advertenciasOperativas = [];

    if (estadoAnteriorOrden !== estado) {
      await registrarEventoOrdenPostPersistenciaSeguro(req, {
        ordenId: orden.id,
        tipo_evento: "ESTADO_CAMBIADO",
        categoria: "OPERACION",
        titulo: "Estado actualizado",
        descripcion: "Estado de orden actualizado.",
        estado_anterior: estadoAnteriorOrden,
        estado_nuevo: estado,
        origen: "PATCH_ESTADO",
      }, advertenciasOperativas);
    }

    for (const auditoria of auditoriasOverrideEstado) {
      const eventoRegistrado = await registrarAuditoriaOverrideOrden({
        ...auditoria,
        orden,
        bitacoraYaPersistida: true,
      });
      if (!eventoRegistrado) {
        advertenciasOperativas.push("AUDITORIA_OPERATIVA_PENDIENTE");
      }
    }

    const esOrdenUrgente = normalizarBoolean(orden.creado_en_modo_urgente);
    const regularizacion = esOrdenUrgente
      ? await sincronizarRegularizacionPostPersistenciaSeguro(
          orden.id,
          req,
          {
            overrideAutorizado: Boolean(
              overrideRegularizacionCierre ||
                overridesEntrega.overrideRegularizacion
            ),
          },
          advertenciasOperativas,
          orden
        )
      : {
          orden: await recargarOrdenPostPersistenciaSeguro(
            orden,
            advertenciasOperativas
          ),
          advertencias: [],
        };
    advertenciasOperativas.push(...(regularizacion.advertenciasOperativas || []));

    res.json({
      mensaje: "Estado actualizado correctamente",
      orden: regularizacion.orden,
      ...(esOrdenUrgente
        ? {
            requiere_regularizacion: regularizacion.advertencias.length > 0,
            advertencias: regularizacion.advertencias,
          }
        : {}),
      advertencias_operativas: [...new Set(advertenciasOperativas)],
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("ERROR ACTUALIZANDO ESTADO:", error);

    const controlado = responderErrorControlado(res, error);
    if (controlado) return;

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

    const estadoPagoAnterior = limpiarTexto(orden.estado_pago);

    await orden.update({
      estado_pago: "PAGADO",
      medio_pago: medioPago,
      monto_pagado: montoPagado,
      fecha_pago: new Date(),
      cobrado_por: usuarioActual(req),
      cobrado_por_id: usuarioActualId(req) || null,
      observacion_pago:
        limpiarTexto(req.body.observacion_pago) ||
        `Pago confirmado por ${usuarioActual(req)}`,
    });

    await registrarEventoOrdenDesdeReq(req, {
      ordenId: orden.id,
      tipo_evento: "PAGO_CONFIRMADO",
      categoria: "COMERCIAL",
      titulo: "Pago confirmado",
      descripcion: "Pago confirmado por usuario autorizado.",
      estado_anterior: estadoPagoAnterior,
      estado_nuevo: "PAGADO",
      origen: "REGISTRAR_PAGO",
      metadata: {
        medio_pago: medioPago,
      },
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
  let transaction = null;

  try {
    await prepararColumnas();

    if (!tieneRol(req, ROLES_CIERRE_COMERCIAL)) {
      return enviarErrorPermiso(res);
    }

    transaction = await sequelize.transaction();
    await bloquearArchivosFileServiceOrden(req.params.id, transaction);
    const orden = await OrdenTrabajo.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!orden) {
      await transaction.rollback();
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    if (orden.archivada) {
      await transaction.rollback();
      return res.status(400).json({
        error: "No puedes cobrar ni entregar una orden archivada",
      });
    }

    if (limpiarTexto(orden.estado).toUpperCase() === "ENTREGADO") {
      const pagoYaConfirmado =
        limpiarTexto(orden.estado_pago).toUpperCase() === "PAGADO" &&
        normalizarDecimal(orden.monto_pagado, 0) > 0;
      await transaction.rollback();

      if (pagoYaConfirmado) {
        return res.json({
          mensaje: "La orden ya estaba cobrada y entregada.",
          orden,
          idempotente: true,
          advertencias_operativas: [],
        });
      }

      return res.status(409).json({
        error: "ORDEN_YA_ENTREGADA",
        message:
          "La orden ya fue entregada. Registra el pago pendiente con el flujo de pago autorizado.",
      });
    }

    const medioPago = limpiarTexto(req.body.medio_pago) || "TRANSFERENCIA";
    const montoPagado = normalizarNumero(
      req.body.monto_pagado || req.body.monto_total || montoComercialOrden(orden),
      0
    );

    if (montoPagado <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        error: "El monto pagado debe ser mayor a 0",
      });
    }

    const estadoAnteriorOrden = limpiarTexto(orden.estado);
    const estadoPagoAnterior = limpiarTexto(orden.estado_pago);
    const overridesEntrega = await validarEntregaOrden({
      req,
      orden,
      pagoSeConfirmara: true,
      transaction,
    });

    const payloadEntrega = {
      estado: "ENTREGADO",
      estado_pago: "PAGADO",
      medio_pago: medioPago,
      monto_pagado: montoPagado,
      fecha_pago: new Date(),
      cobrado_por: usuarioActual(req),
      cobrado_por_id: usuarioActualId(req) || null,
      entregado_at: new Date(),
      entregado_por: usuarioActual(req),
      entregado_por_id: usuarioActualId(req) || null,
      observacion_pago:
        limpiarTexto(req.body.observacion_pago) ||
        `Pago y entrega confirmados por ${usuarioActual(req)}`,
      observacion_cierre:
        limpiarTexto(req.body.observacion_cierre) ||
        `Orden cerrada comercialmente por ${usuarioActual(req)}`,
    };
    const auditoriasOverrideEntrega = overridesEntrega.overrideRegularizacion
      ? [
          {
            req,
            ...overridesEntrega.overrideRegularizacion,
            metadata: {
              advertencias: overridesEntrega.overrideRegularizacion.advertencias,
              destino: "ENTREGADO",
              pago_confirmado_en_operacion: true,
            },
          },
        ]
      : [];
    anexarAuditoriasOverrideAlPayload({
      orden,
      payload: payloadEntrega,
      auditorias: auditoriasOverrideEntrega,
    });
    await orden.update(payloadEntrega, { transaction });
    await transaction.commit();
    const advertenciasOperativas = [];

    await registrarEventoOrdenPostPersistenciaSeguro(req, {
      ordenId: orden.id,
      tipo_evento: "PAGO_CONFIRMADO",
      categoria: "COMERCIAL",
      titulo: "Pago confirmado",
      descripcion: "Pago confirmado por usuario autorizado.",
      estado_anterior: estadoPagoAnterior,
      estado_nuevo: "PAGADO",
      origen: "COBRAR_ENTREGAR",
      metadata: {
        medio_pago: medioPago,
      },
    }, advertenciasOperativas);

    await registrarEventoOrdenPostPersistenciaSeguro(req, {
      ordenId: orden.id,
      tipo_evento: "ENTREGA_CONFIRMADA",
      categoria: "COMERCIAL",
      titulo: "Entrega confirmada",
      descripcion: "Vehiculo/orden entregada por usuario autorizado.",
      estado_anterior: estadoAnteriorOrden,
      estado_nuevo: "ENTREGADO",
      origen: "COBRAR_ENTREGAR",
    }, advertenciasOperativas);

    for (const auditoria of auditoriasOverrideEntrega) {
      const eventoRegistrado = await registrarAuditoriaOverrideOrden({
        ...auditoria,
        orden,
        bitacoraYaPersistida: true,
      });
      if (!eventoRegistrado) {
        advertenciasOperativas.push("AUDITORIA_OPERATIVA_PENDIENTE");
      }
    }

    const esOrdenUrgente = normalizarBoolean(orden.creado_en_modo_urgente);
    const regularizacion = esOrdenUrgente
      ? await sincronizarRegularizacionPostPersistenciaSeguro(
          orden.id,
          req,
          {
            overrideAutorizado: Boolean(overridesEntrega.overrideRegularizacion),
          },
          advertenciasOperativas,
          orden
        )
      : {
          orden: await recargarOrdenPostPersistenciaSeguro(
            orden,
            advertenciasOperativas
          ),
          advertencias: [],
        };
    advertenciasOperativas.push(...(regularizacion.advertenciasOperativas || []));

    res.json({
      mensaje: "Orden cobrada y entregada correctamente",
      orden: regularizacion.orden,
      ...(esOrdenUrgente
        ? {
            requiere_regularizacion: regularizacion.advertencias.length > 0,
            advertencias: regularizacion.advertencias,
          }
        : {}),
      advertencias_operativas: [...new Set(advertenciasOperativas)],
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("ERROR COBRANDO Y ENTREGANDO:", error);

    const controlado = responderErrorControlado(res, error);
    if (controlado) return;

    res.status(error.statusCode || 500).json({
      error: error.message,
    });
  }
};

module.exports = {
  crearOrden,
  obtenerOrdenes,
  obtenerOrdenPorId,
  obtenerEventosOrden,
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
  validarOrdenListaParaEntregaDesdeFileService,
};
