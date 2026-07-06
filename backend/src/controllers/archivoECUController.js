const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const { ArchivoECU, OrdenTrabajo, OrdenEventoOperativo, Usuario } = require("../models");
const {
  crearNotificacionesInternas,
} = require("./notificacionController");
const {
  verificarGuardiaOperativaUsuario,
} = require("../services/guardiaOperativaService");

console.log("📂 CONTROLLER_FILE_SERVICE_POST_ESCRITURA_V4_CIERRE_ORDEN_CARGADO");

let columnasPreparadas = false;

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const normalizarTexto = limpiarTexto;

const usuarioActualId = (req) => limpiarTexto(req.usuario?.id || req.user?.id);

const obtenerSnapshotUsuario = (usuario) =>
  limpiarTexto(usuario?.username || usuario?.nombre || usuario?.email || usuario?.id);

const crearErrorHttp = (statusCode, message, extra = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
};

const buscarUsuarioActivoPorId = async (usuarioId) => {
  const id = limpiarTexto(usuarioId);
  if (!id) return null;

  const usuario = await Usuario.findByPk(id, {
    attributes: ["id", "nombre", "username", "email", "rol", "activo"],
  });

  if (!usuario || usuario.activo === false) {
    throw crearErrorHttp(400, "Responsable no existe o esta inactivo.", {
      codigo: "RESPONSABLE_INVALIDO",
    });
  }

  return usuario;
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
      "No puedes asignar mas trabajo a este responsable porque tiene pendientes criticos sin resolver.",
      {
        codigo: "RESPONSABLE_BLOQUEADO",
        pendientes_criticos: resultado.pendientes_criticos || [],
      }
    );
  }

  return resultado;
};

const resolverResponsableArchivoDesdeBody = async (
  body,
  campoId,
  campoTexto,
  opciones = {}
) => {
  const obligatorio = opciones.obligatorio === true;
  const tieneCampoId = Object.prototype.hasOwnProperty.call(body, campoId);
  const tieneCampoTexto = Object.prototype.hasOwnProperty.call(body, campoTexto);
  const usuarioId = limpiarTexto(body[campoId]);

  if (usuarioId) {
    const usuario = await buscarUsuarioActivoPorId(usuarioId);
    if (opciones.validarGuardia !== false) {
      await validarGuardiaResponsable(usuario);
    }
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
    return {
      id: null,
      texto,
      usuario: null,
      legacy: true,
    };
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

const responderErrorResponsable = (res, error) => {
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

  return null;
};

const SERVICIOS_FILE_SERVICE_V1 = new Set([
  "STAGE_1",
  "STAGE_2",
  "STAGE_3",
  "ECO_TUNE",
  "CUSTOM_TUNE",
  "TCU_STAGE",
  "TORQUE_LIMITER",
  "VMAX_OFF",
  "LAUNCH_CONTROL",
  "ANTILAG",
  "POPS_BANGS",
  "HARDCUT",
  "POPCORN_DIESEL",
  "DPF_OFF",
  "FAP_OFF",
  "EGR_OFF",
  "ADBLUE_SCR_OFF",
  "DEF_OFF",
  "NOX_OFF",
  "LAMBDA_OFF",
  "TVA_OFF",
  "SWIRL_FLAPS_OFF",
  "DTC_OFF",
  "IMMO_OFF",
  "START_STOP_OFF",
  "READINESS_CHECK",
  "CHECKSUM",
  "CLONACION_ECU",
  "VIRGINIZAR_ECU",
  "BACKUP_ORIGINAL",
  "RESTAURAR_ORIGINAL",
  "OTRO",
  "CUSTOM",
]);

const PRESETS_SERVICIOS_FILE_SERVICE = {
  DPF_EGR: ["DPF_OFF", "EGR_OFF"],
  ADBLUE_DPF_EGR: ["ADBLUE_SCR_OFF", "DPF_OFF", "EGR_OFF"],
  DPF_EGR_TVA: ["DPF_OFF", "EGR_OFF", "TVA_OFF"],
  EGR_DTC: ["EGR_OFF", "DTC_OFF"],
  DPF_EGR_DTC: ["DPF_OFF", "EGR_OFF", "DTC_OFF"],
  STAGE1_DTC: ["STAGE_1", "DTC_OFF"],
  STAGE1_EGR: ["STAGE_1", "EGR_OFF"],
  SOLO_DTC_OFF: ["DTC_OFF"],
  SOLO_STAGE1: ["STAGE_1"],
  CUSTOM: ["CUSTOM"],
};

const parsearJsonSeguro = (valor, fallback = null) => {
  if (valor === null || valor === undefined || valor === "") return fallback;
  if (Array.isArray(valor) || typeof valor === "object") return valor;

  try {
    return JSON.parse(String(valor));
  } catch {
    return fallback;
  }
};

const normalizarArrayUnico = (valores = []) => {
  const salida = [];
  const vistos = new Set();

  valores.forEach((valor) => {
    const texto = limpiarTexto(valor).toUpperCase();
    if (!texto || vistos.has(texto)) return;
    vistos.add(texto);
    salida.push(texto);
  });

  return salida;
};

const normalizarServiciosSolicitados = ({ servicios, tipoServicio, preset }) => {
  const parsed = parsearJsonSeguro(servicios, servicios);
  const lista = Array.isArray(parsed) ? parsed : [];
  let normalizados = normalizarArrayUnico(lista);

  if (!normalizados.length && preset && PRESETS_SERVICIOS_FILE_SERVICE[preset]) {
    normalizados = [...PRESETS_SERVICIOS_FILE_SERVICE[preset]];
  }

  if (normalizados.length) {
    const invalidos = normalizados.filter(
      (servicio) => !SERVICIOS_FILE_SERVICE_V1.has(servicio)
    );

    if (invalidos.length) {
      const error = new Error(
        `Servicios File Service no permitidos: ${invalidos.join(", ")}`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  if (!normalizados.length && limpiarTexto(tipoServicio)) {
    normalizados = [limpiarTexto(tipoServicio)];
  }

  return normalizados;
};

const parsearDtcDiagnostico = (diagnostico = {}) => {
  const origen = [
    diagnostico.codigos_dtc,
    diagnostico.fallas_detectadas,
    diagnostico.observaciones,
  ]
    .map(limpiarTexto)
    .filter(Boolean)
    .join("\n");

  if (!origen || origen.toUpperCase().includes("SIN DTC")) return [];

  const encontrados = origen.match(/\b[PCBU][0-9A-F]{4}\b/gi) || [];
  return normalizarArrayUnico(encontrados).map((codigo) => ({
    codigo,
    fuente: "diagnostico",
    activo: true,
  }));
};

const normalizarDtcSnapshot = (valor) => {
  const parsed = parsearJsonSeguro(valor, valor);
  const lista = Array.isArray(parsed) ? parsed : [];
  const codigos = new Set();

  return lista
    .map((item) => {
      const codigo =
        typeof item === "string" ? limpiarTexto(item) : limpiarTexto(item?.codigo);
      const normalizado = codigo.toUpperCase();
      if (!/^[PCBU][0-9A-F]{4}$/.test(normalizado) || codigos.has(normalizado)) {
        return null;
      }
      codigos.add(normalizado);
      return {
        codigo: normalizado,
        fuente: limpiarTexto(item?.fuente) || "diagnostico",
        activo: item?.activo === false ? false : true,
      };
    })
    .filter(Boolean);
};

const resumenDtc = (snapshot = []) =>
  snapshot.map((item) => item.codigo).filter(Boolean).join(", ");

const registrarEventoFileServiceOrden = async ({
  ordenId,
  archivoECUId,
  tipo_evento,
  titulo,
  descripcion,
  usuario,
  usuario_rol,
  metadata = {},
}) => {
  if (!ordenId) return;

  try {
    await OrdenEventoOperativo.create({
      ordenId,
      tipo_evento,
      categoria: "FILE_SERVICE",
      titulo,
      descripcion,
      usuario: usuario || "sistema",
      usuario_rol: usuario_rol || null,
      origen: "FILE_SERVICE",
      metadata: {
        archivoECUId,
        ...metadata,
      },
    });
  } catch (error) {
    console.warn(`No se pudo registrar evento ${tipo_evento}:`, error.message);
  }
};

const buscarDiagnosticoParaFileService = async ({ ordenId, vehiculoId } = {}) => {
  const ordenIdNumero = Number(ordenId);
  const vehiculoIdNumero = Number(vehiculoId);

  if (ordenIdNumero && !Number.isNaN(ordenIdNumero)) {
    const diagnosticos = await sequelize.query(
      `
      SELECT
        "id",
        "ordenId",
        "fallas_detectadas",
        "codigos_dtc",
        "informe_scanner",
        "foto_scanner",
        "sin_dtc",
        "observaciones",
        "fase",
        "createdAt",
        "updatedAt"
      FROM "diagnosticos"
      WHERE "ordenId" = :ordenId
      ORDER BY
        CASE
          WHEN "fase" IS NULL OR "fase" = '' OR "fase" = 'PRE_FILE_SERVICE' THEN 0
          ELSE 1
        END,
        "id" DESC
      LIMIT 1;
      `,
      {
        replacements: { ordenId: ordenIdNumero },
        type: QueryTypes.SELECT,
      }
    );

    if (diagnosticos.length) return diagnosticos[0];
  }

  if (vehiculoIdNumero && !Number.isNaN(vehiculoIdNumero)) {
    const diagnosticos = await sequelize.query(
      `
      SELECT
        d."id",
        d."ordenId",
        d."fallas_detectadas",
        d."codigos_dtc",
        d."informe_scanner",
        d."foto_scanner",
        d."sin_dtc",
        d."observaciones",
        d."fase",
        d."createdAt",
        d."updatedAt"
      FROM "diagnosticos" d
      INNER JOIN "ordenes_trabajo" o ON o."id" = d."ordenId"
      WHERE o."vehiculoId" = :vehiculoId
      ORDER BY
        CASE
          WHEN d."fase" IS NULL OR d."fase" = '' OR d."fase" = 'PRE_FILE_SERVICE' THEN 0
          ELSE 1
        END,
        d."id" DESC
      LIMIT 1;
      `,
      {
        replacements: { vehiculoId: vehiculoIdNumero },
        type: QueryTypes.SELECT,
      }
    );

    if (diagnosticos.length) return diagnosticos[0];
  }

  return null;
};

const registrarEventoFileServiceCreado = async ({
  req,
  ordenId,
  archivoECUId,
  servicios_solicitados,
  dtc_snapshot,
  servicios_preset,
}) => {
  await registrarEventoFileServiceOrden({
    ordenId,
    archivoECUId,
    tipo_evento: "FILE_SERVICE_CREADO",
    titulo: "File Service creado",
    descripcion: "Se creo solicitud File Service con servicios y DTC importados.",
    usuario: usuarioActual(req),
    usuario_rol: req.usuario?.rol || req.user?.rol || null,
    metadata: {
      servicios_solicitados,
      tiene_dtc_snapshot: Array.isArray(dtc_snapshot) && dtc_snapshot.length > 0,
      cantidad_dtcs: Array.isArray(dtc_snapshot) ? dtc_snapshot.length : 0,
      servicios_preset: servicios_preset || null,
    },
  });
};

const NOTIFICACIONES_RESPONSABLES_FILE = {
  tuner_asignado_a: {
    tipo: "FILE_TUNER_ASIGNADO",
    titulo: "Tuner / Master asignado",
    etapa: "File Service como Tuner / Master",
  },
  operador_ecu_asignado_a: {
    tipo: "FILE_OPERADOR_ECU_ASIGNADO",
    titulo: "Operador ECU asignado",
    etapa: "File Service como Operador ECU",
  },
  slave_asignado_a: {
    tipo: "FILE_SLAVE_ASIGNADO",
    titulo: "Slave / operador externo asignado",
    etapa: "File Service como Slave / operador externo",
  },
};

const PROCESS_GUARD_ESTADOS = [
  "SIN_RIESGO",
  "EN_ESPERA_POST_ESCRITURA",
  "ADVERTENCIA",
  "CRITICO",
  "ESCALADO",
  "CERRADO",
];

const RESULTADOS_TECNICOS = [
  "OK",
  "FALLO",
  "REQUIERE_CORRECCION",
  "REQUIERE_NUEVA_LECTURA",
  "PENDIENTE",
];

const normalizarProcessGuardEstado = (valor) => {
  const estado = limpiarTexto(valor || "SIN_RIESGO").toUpperCase();
  return PROCESS_GUARD_ESTADOS.includes(estado) ? estado : "SIN_RIESGO";
};

const normalizarResultadoTecnico = (valor) => {
  const resultado = limpiarTexto(valor || "PENDIENTE").toUpperCase();
  if (resultado === "FALLO_ESCRITURA") return "FALLO";
  return RESULTADOS_TECNICOS.includes(resultado) ? resultado : "PENDIENTE";
};

const resultadoTecnicoDesdePost = (resultadoPost) => {
  const resultado = limpiarTexto(resultadoPost).toUpperCase();
  if (resultado === "OK") return "OK";
  if (resultado === "NO_APLICA") return "PENDIENTE";
  if (resultado === "REQUIERE_CORRECCION") return "REQUIERE_CORRECCION";
  if (resultado === "FALLO_ESCRITURA") return "FALLO";
  return "PENDIENTE";
};

const tieneListaOperativa = (valor) => normalizarVersiones(valor).length > 0;

const tieneResponsableFileService = (archivo) =>
  Boolean(
    limpiarTexto(archivo?.tuner_asignado_a_id) ||
      limpiarTexto(archivo?.operador_ecu_asignado_a_id) ||
      limpiarTexto(archivo?.tuner_asignado_a) ||
      limpiarTexto(archivo?.operador_ecu_asignado_a)
  );

const requiereModParaCierre = (archivo) => {
  const estado = limpiarTexto(archivo?.estado).toUpperCase();
  const servicios = normalizarVersiones(archivo?.servicios_solicitados)
    .map((servicio) => limpiarTexto(servicio?.value || servicio).toUpperCase())
    .filter(Boolean);

  if (limpiarTexto(archivo?.archivo_modificado)) return true;
  if (
    [
      "MODIFICADO_LISTO",
      "NOTIFICADO_SLAVE",
      "POST_ESCRITURA_PENDIENTE",
      "POST_ESCRITURA_OK",
    ].includes(estado)
  ) {
    return true;
  }

  const servicioTexto = [
    limpiarTexto(archivo?.tipo_servicio),
    limpiarTexto(archivo?.servicio_principal),
    servicios.join(" "),
  ]
    .join(" ")
    .toUpperCase();

  if (!servicioTexto) return false;

  const marcadoresSoloRevision = [
    "READINESS",
    "CHECKSUM",
    "BACKUP_ORIGINAL",
    "RESTAURAR_ORIGINAL",
    "REVISION",
    "DIAGNOSTICO",
    "LECTURA",
  ];

  return !marcadoresSoloRevision.some((marcador) => servicioTexto.includes(marcador));
};

const validarChecklistCierreTecnicoOK = (archivo, observacion) => {
  const faltantes = [];
  const postEstado = limpiarTexto(archivo?.post_escritura_estado).toUpperCase();
  const postNoAplica =
    postEstado === "NO_APLICA" && limpiarTexto(archivo?.post_escritura_observacion);
  const postOk = postEstado === "OK" || postNoAplica;

  if (!limpiarTexto(archivo?.archivo_original)) {
    faltantes.push("Archivo original");
  }

  if (!tieneListaOperativa(archivo?.servicios_solicitados) && !limpiarTexto(archivo?.tipo_servicio)) {
    faltantes.push("Servicios solicitados");
  }

  if (!tieneResponsableFileService(archivo)) {
    faltantes.push("Responsable File Service");
  }

  if (requiereModParaCierre(archivo) && !limpiarTexto(archivo?.archivo_modificado)) {
    faltantes.push("MOD cargado");
  }

  if (!postOk) {
    faltantes.push("Post escritura OK o No aplica con observacion");
  }

  if (postEstado === "OK" && !limpiarTexto(archivo?.post_escritura_scanner)) {
    faltantes.push("Foto/captura scanner post escritura");
  }

  if (!limpiarTexto(archivo?.post_escritura_dtc) && !archivo?.post_escritura_sin_dtc) {
    faltantes.push("DTC post escritura o SIN DTC POST ESCRITURA");
  }

  if (!limpiarTexto(observacion)) {
    faltantes.push("Observacion final de cierre tecnico");
  }

  return {
    ok: faltantes.length === 0,
    faltantes,
  };
};

const processGuardResponsableArchivo = (archivo) =>
  limpiarTexto(
    archivo?.operador_ecu_asignado_a_id ||
      archivo?.tuner_asignado_a_id ||
      archivo?.slave_asignado_a_id ||
      archivo?.operador_ecu_asignado_a ||
      archivo?.tuner_asignado_a ||
      archivo?.slave_asignado_a
  ) || null;

const archivoRequiereProcessGuard = (archivo) => {
  if (!archivo) return false;
  const estado = limpiarTexto(archivo.estado).toUpperCase();
  if (archivo.archivado || ["ARCHIVADO", "FINALIZADO", "FINALIZADO_TECNICO"].includes(estado)) {
    return false;
  }

  return Boolean(
    archivo.archivo_modificado ||
      ["MODIFICADO_LISTO", "NOTIFICADO_SLAVE", "POST_ESCRITURA_PENDIENTE"].includes(estado)
  );
};

const fechaInicioProcessGuard = (archivo) => {
  return (
    archivo.mod_descargado_at ||
    archivo.proceso_guard_started_at ||
    archivo.post_escritura_at ||
    archivo.updatedAt ||
    archivo.createdAt ||
    new Date()
  );
};

const minutosDesde = (fecha, ahora = new Date()) => {
  const inicio = fecha ? new Date(fecha) : null;
  if (!inicio || Number.isNaN(inicio.getTime())) return 0;
  return Math.max(0, (ahora.getTime() - inicio.getTime()) / 60000);
};

const calcularProcessGuardArchivo = (archivo, ahora = new Date()) => {
  if (!archivo) {
    return {
      estado: "SIN_RIESGO",
      minutos: 0,
      prioridad: "BAJA",
      motivo: "Sin archivo",
    };
  }

  const estadoArchivo = limpiarTexto(archivo.estado).toUpperCase();
  const postOk = limpiarTexto(archivo.post_escritura_estado).toUpperCase() === "OK";
  const cierreAt = archivo.cierre_tecnico_at;

  if (
    archivo.archivado ||
    estadoArchivo === "ARCHIVADO" ||
    cierreAt ||
    normalizarProcessGuardEstado(archivo.proceso_guard_estado) === "CERRADO"
  ) {
    return {
      estado: "CERRADO",
      minutos: 0,
      prioridad: "BAJA",
      motivo: "Proceso técnico cerrado",
    };
  }

  if (!archivoRequiereProcessGuard(archivo)) {
    return {
      estado: "SIN_RIESGO",
      minutos: 0,
      prioridad: "BAJA",
      motivo: "Aún no requiere cierre técnico",
    };
  }

  const minutos = minutosDesde(fechaInicioProcessGuard(archivo), ahora);
  const correccion =
    archivo.correccion_pendiente === true || estadoArchivo === "REQUIERE_CORRECCION";
  const nuevaLectura = estadoArchivo === "REQUIERE_NUEVA_LECTURA";
  const sinPost = !postOk;

  if (nuevaLectura) {
    return {
      estado: minutos >= 180 ? "ESCALADO" : "ADVERTENCIA",
      minutos,
      prioridad: minutos >= 180 ? "URGENTE" : "ALTA",
      motivo: "Nueva lectura requerida sin respuesta",
    };
  }

  if (correccion) {
    return {
      estado: minutos >= 120 ? "CRITICO" : "ADVERTENCIA",
      minutos,
      prioridad: minutos >= 120 ? "URGENTE" : "ALTA",
      motivo: "Corrección pendiente",
    };
  }

  if (minutos >= 180) {
    return {
      estado: "ESCALADO",
      minutos,
      prioridad: "URGENTE",
      motivo: sinPost
        ? "MOD sin post escritura ni cierre técnico por más de 180 min"
        : "Post escritura OK sin cierre técnico por más de 180 min",
    };
  }

  if (minutos >= 120) {
    return {
      estado: "CRITICO",
      minutos,
      prioridad: "URGENTE",
      motivo: sinPost
        ? "MOD sin post escritura por más de 120 min"
        : "Post escritura OK sin cierre técnico por más de 120 min",
    };
  }

  if (minutos >= 60) {
    return {
      estado: "ADVERTENCIA",
      minutos,
      prioridad: "ALTA",
      motivo: sinPost
        ? "MOD sin post escritura por más de 60 min"
        : "Post escritura OK sin cierre técnico por más de 60 min",
    };
  }

  if (minutos >= 30) {
    return {
      estado: "EN_ESPERA_POST_ESCRITURA",
      minutos,
      prioridad: "MEDIA",
      motivo: sinPost
        ? "MOD listo esperando post escritura"
        : "Post escritura OK esperando cierre técnico",
    };
  }

  return {
    estado: "EN_ESPERA_POST_ESCRITURA",
    minutos,
    prioridad: "MEDIA",
    motivo: sinPost
      ? "MOD listo esperando post escritura"
      : "Post escritura OK esperando cierre técnico",
  };
};

const obtenerOrdenId = (body = {}) => {
  return body.ordenId || body.orden_id || body.ordenTrabajoId || body.orden_trabajo_id;
};

const usuarioActual = (req) => {
  return (
    req.usuario?.username ||
    req.user?.username ||
    req.usuario?.nombre ||
    req.user?.nombre ||
    req.usuario?.rol ||
    req.user?.rol ||
    "sistema"
  );
};

const normalizarVersiones = (valor) => {
  if (Array.isArray(valor)) return valor;

  if (typeof valor === "string") {
    try {
      const parsed = JSON.parse(valor);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const obtenerRutaPublicaArchivo = (file) => {
  if (!file) return null;

  if (file.path && /^https?:\/\//i.test(file.path)) {
    return file.path;
  }

  if (file.filename) {
    return `/uploads/ecu/${file.filename}`;
  }

  return file.path || null;
};

const prepararColumnas = async () => {
  if (columnasPreparadas) return;

  await sequelize.query(`
    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "versiones_modificadas" JSONB DEFAULT '[]'::jsonb;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "ultima_version_modificada" INTEGER DEFAULT 0;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "diagnosticoId" INTEGER;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "dtc_snapshot" JSONB DEFAULT '[]'::jsonb;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "dtc_resumen" TEXT;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "dtc_importado_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "dtc_importado_por" VARCHAR(100);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "servicios_solicitados" JSONB DEFAULT '[]'::jsonb;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "servicios_preset" VARCHAR(80);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "servicio_principal" VARCHAR(120);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "observacion_servicios" TEXT;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "notificado_master_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "notificado_master_por" VARCHAR(100);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "notificado_slave_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "notificado_slave_por" VARCHAR(100);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "correccion_pendiente" BOOLEAN DEFAULT false;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "dtc_post_escritura" TEXT;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "observacion_correccion" TEXT;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "archivo_original_subido_por" VARCHAR(100);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "archivo_original_subido_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "procesamiento_externo_estado" VARCHAR(60);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "procesamiento_externo_herramienta" VARCHAR(80);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "procesamiento_externo_responsable" VARCHAR(100);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "procesamiento_externo_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "procesamiento_externo_observacion" TEXT;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "procesamiento_externo_archivo_resultado" TEXT;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "procesamiento_externo_archivos" JSONB DEFAULT '[]'::jsonb;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "tuner_asignado_a" VARCHAR(100);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "tuner_asignado_a_id" UUID;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "operador_ecu_asignado_a" VARCHAR(100);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "operador_ecu_asignado_a_id" UUID;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "slave_asignado_a" VARCHAR(100);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "slave_asignado_a_id" UUID;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "post_escritura_estado" VARCHAR(60);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "post_escritura_dtc" TEXT;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "post_escritura_sin_dtc" BOOLEAN DEFAULT false;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "post_escritura_scanner" TEXT;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "post_escritura_observacion" TEXT;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "post_escritura_por" VARCHAR(100);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "post_escritura_por_id" UUID;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "post_escritura_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "mod_descargado_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "proceso_guard_estado" VARCHAR(60) DEFAULT 'SIN_RIESGO';

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "proceso_guard_started_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "proceso_guard_last_alert_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "proceso_guard_escalado_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "proceso_guard_responsable_id" VARCHAR(100);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "cierre_tecnico_obligatorio" BOOLEAN DEFAULT false;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "cierre_tecnico_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "cierre_tecnico_por" VARCHAR(100);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "cierre_tecnico_por_id" UUID;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "resultado_tecnico" VARCHAR(60) DEFAULT 'PENDIENTE';

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "observacion_cierre_tecnico" TEXT;

    UPDATE "archivos_ecu"
    SET
      "dtc_snapshot" = COALESCE("dtc_snapshot", '[]'::jsonb),
      "servicios_solicitados" = COALESCE("servicios_solicitados", '[]'::jsonb),
      "proceso_guard_estado" = COALESCE("proceso_guard_estado", 'SIN_RIESGO'),
      "cierre_tecnico_obligatorio" = COALESCE("cierre_tecnico_obligatorio", false),
      "resultado_tecnico" = COALESCE("resultado_tecnico", 'PENDIENTE');

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "archivado" BOOLEAN DEFAULT false;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "archivado_motivo" VARCHAR(120);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "archivado_comentario" TEXT;

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "archivado_por" VARCHAR(100);

    ALTER TABLE "archivos_ecu"
    ADD COLUMN IF NOT EXISTS "archivado_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "tecnico_finalizado_por" VARCHAR(100);

    ALTER TABLE "ordenes_trabajo"
    ADD COLUMN IF NOT EXISTS "tecnico_finalizado_at" TIMESTAMP WITH TIME ZONE;

    ALTER TABLE "diagnosticos"
    ADD COLUMN IF NOT EXISTS "sin_dtc" BOOLEAN DEFAULT false;

    ALTER TABLE "diagnosticos"
    ADD COLUMN IF NOT EXISTS "fase" VARCHAR(40) DEFAULT 'PRE_FILE_SERVICE';

    ALTER TABLE "diagnosticos"
    ADD COLUMN IF NOT EXISTS "foto_scanner" TEXT;
  `);

  columnasPreparadas = true;
};

const validarDiagnosticoObligatorio = async (ordenId) => {
  await prepararColumnas();

  const diag = await buscarDiagnosticoParaFileService({ ordenId });

  if (!diag) {
    return {
      ok: false,
      faltantes: [
        "Diagnóstico previo",
        "Foto del scanner",
        "DTC escritos o marcar SIN DTC",
        "Observación / fallas detectadas",
      ],
    };
  }

  const faltantes = [];

  const tieneScanner =
    limpiarTexto(diag.informe_scanner) || limpiarTexto(diag.foto_scanner);

  const sinDtc =
    diag.sin_dtc === true ||
    String(diag.sin_dtc).toLowerCase() === "true" ||
    limpiarTexto(diag.codigos_dtc).toUpperCase().includes("SIN DTC");

  const tieneDtc = sinDtc || limpiarTexto(diag.codigos_dtc);

  const tieneObservacion =
    limpiarTexto(diag.observaciones) || limpiarTexto(diag.fallas_detectadas);

  if (!tieneScanner) faltantes.push("Foto del scanner");
  if (!tieneDtc) faltantes.push("DTC escritos o marcar SIN DTC");
  if (!tieneObservacion) faltantes.push("Observación / fallas detectadas");

  return {
    ok: faltantes.length === 0,
    faltantes,
    diagnostico: diag,
  };
};

const mapearArchivoRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    ordenId: row.ordenId,

    estado: row.estado,
    prioridad: row.prioridad,
    tipo_servicio: row.tipo_servicio,
    diagnosticoId: row.diagnosticoId,
    dtc_snapshot: normalizarVersiones(row.dtc_snapshot),
    dtc_resumen: row.dtc_resumen,
    dtc_importado_at: row.dtc_importado_at,
    dtc_importado_por: row.dtc_importado_por,
    servicios_solicitados: normalizarVersiones(row.servicios_solicitados),
    servicios_preset: row.servicios_preset,
    servicio_principal: row.servicio_principal,
    observacion_servicios: row.observacion_servicios,
    metodo_lectura: row.metodo_lectura,
    herramienta_lectura: row.herramienta_lectura,

    archivo_original: row.archivo_original,
    archivo_original_subido_por: row.archivo_original_subido_por,
    archivo_original_subido_at: row.archivo_original_subido_at,

    archivo_modificado: row.archivo_modificado,
    versiones_modificadas: normalizarVersiones(row.versiones_modificadas),
    ultima_version_modificada: row.ultima_version_modificada || 0,

    notificado_master_at: row.notificado_master_at,
    notificado_master_por: row.notificado_master_por,
    notificado_slave_at: row.notificado_slave_at,
    notificado_slave_por: row.notificado_slave_por,

    correccion_pendiente: row.correccion_pendiente,
    dtc_post_escritura: row.dtc_post_escritura,
    observacion_correccion: row.observacion_correccion,

    post_escritura_estado: row.post_escritura_estado,
    post_escritura_dtc: row.post_escritura_dtc,
    post_escritura_sin_dtc: row.post_escritura_sin_dtc,
    post_escritura_scanner: row.post_escritura_scanner,
    post_escritura_observacion: row.post_escritura_observacion,
    post_escritura_por: row.post_escritura_por,
    post_escritura_por_id: row.post_escritura_por_id,
    post_escritura_at: row.post_escritura_at,

    mod_descargado_at: row.mod_descargado_at,
    proceso_guard_estado: normalizarProcessGuardEstado(row.proceso_guard_estado),
    proceso_guard_started_at: row.proceso_guard_started_at,
    proceso_guard_last_alert_at: row.proceso_guard_last_alert_at,
    proceso_guard_escalado_at: row.proceso_guard_escalado_at,
    proceso_guard_responsable_id: row.proceso_guard_responsable_id,
    cierre_tecnico_obligatorio: row.cierre_tecnico_obligatorio,
    cierre_tecnico_at: row.cierre_tecnico_at,
    cierre_tecnico_por: row.cierre_tecnico_por,
    cierre_tecnico_por_id: row.cierre_tecnico_por_id,
    resultado_tecnico: normalizarResultadoTecnico(row.resultado_tecnico),
    observacion_cierre_tecnico: row.observacion_cierre_tecnico,

    archivado: row.archivado,
    archivado_motivo: row.archivado_motivo,
    archivado_comentario: row.archivado_comentario,
    archivado_por: row.archivado_por,
    archivado_at: row.archivado_at,

    marca_ecu: row.marca_ecu,
    modelo_ecu: row.modelo_ecu,
    hw: row.hw,
    sw: row.sw,
    version_software: row.version_software,

    notas_operador: row.notas_operador,
    instrucciones_tuner: row.instrucciones_tuner,
    observaciones: row.observaciones,

    procesamiento_externo_estado: row.procesamiento_externo_estado,
    procesamiento_externo_herramienta: row.procesamiento_externo_herramienta,
    procesamiento_externo_responsable: row.procesamiento_externo_responsable,
    procesamiento_externo_at: row.procesamiento_externo_at,
    procesamiento_externo_observacion: row.procesamiento_externo_observacion,
    procesamiento_externo_archivo_resultado:
      row.procesamiento_externo_archivo_resultado,
    procesamiento_externo_archivos: normalizarVersiones(
      row.procesamiento_externo_archivos
    ),

    tuner_asignado_a: row.tuner_asignado_a,
    tuner_asignado_a_id: row.tuner_asignado_a_id,
    operador_ecu_asignado_a: row.operador_ecu_asignado_a,
    operador_ecu_asignado_a_id: row.operador_ecu_asignado_a_id,
    slave_asignado_a: row.slave_asignado_a,
    slave_asignado_a_id: row.slave_asignado_a_id,

    createdAt: row.createdAt,
    updatedAt: row.updatedAt,

    OrdenTrabajo: row.orden_id
      ? {
          id: row.orden_id,
          estado: row.orden_estado,
          prioridad: row.orden_prioridad,
          motivo_ingreso: row.orden_motivo_ingreso,
          monto_total: row.orden_monto_total,
          estado_pago: row.orden_estado_pago,
          Vehiculo: row.vehiculo_id
            ? {
                id: row.vehiculo_id,
                patente: row.vehiculo_patente,
                marca: row.vehiculo_marca,
                modelo: row.vehiculo_modelo,
                anio: row.vehiculo_anio,
                vin: row.vehiculo_vin,
                Cliente: row.cliente_id
                  ? {
                      id: row.cliente_id,
                      nombre: row.cliente_nombre,
                      telefono: row.cliente_telefono,
                      email: row.cliente_email,
                      categoria_cliente: row.cliente_categoria_cliente || "NORMAL",
                    }
                  : null,
              }
            : null,
        }
      : null,
  };
};

const queryArchivosBase = `
  SELECT
    a.*,

    o."id" AS "orden_id",
    o."estado" AS "orden_estado",
    o."prioridad" AS "orden_prioridad",
    o."motivo_ingreso" AS "orden_motivo_ingreso",
    o."monto_total" AS "orden_monto_total",
    o."estado_pago" AS "orden_estado_pago",

    v."id" AS "vehiculo_id",
    v."patente" AS "vehiculo_patente",
    v."marca" AS "vehiculo_marca",
    v."modelo" AS "vehiculo_modelo",
    v."anio" AS "vehiculo_anio",
    v."vin" AS "vehiculo_vin",

    c."id" AS "cliente_id",
    c."nombre" AS "cliente_nombre",
    c."telefono" AS "cliente_telefono",
    c."email" AS "cliente_email",
    c."categoria_cliente" AS "cliente_categoria_cliente"

  FROM "archivos_ecu" a
  LEFT JOIN "ordenes_trabajo" o ON o."id" = a."ordenId"
  LEFT JOIN "vehiculos" v ON v."id" = o."vehiculoId"
  LEFT JOIN "clientes" c ON c."id" = v."clienteId"
`;

const obtenerArchivosECU = async (req, res) => {
  try {
    await prepararColumnas();

    const rows = await sequelize.query(
      `
      ${queryArchivosBase}
      WHERE COALESCE(a."archivado", false) = false
      ORDER BY a."id" DESC;
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    res.json(rows.map(mapearArchivoRow));
  } catch (error) {
    console.error("ERROR AL OBTENER ARCHIVOS ECU:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const obtenerContextoSolicitud = async (req, res) => {
  try {
    await prepararColumnas();

    const ordenId = Number(req.params.ordenId);
    if (!ordenId || Number.isNaN(ordenId)) {
      return res.status(400).json({
        error: "Falta ordenId valido",
      });
    }

    const rows = await sequelize.query(
      `
      SELECT
        o."id" AS "orden_id",
        o."estado" AS "orden_estado",
        o."prioridad" AS "orden_prioridad",
        o."motivo_ingreso" AS "orden_motivo_ingreso",
        o."vehiculoId" AS "vehiculo_id",
        v."patente" AS "vehiculo_patente",
        v."marca" AS "vehiculo_marca",
        v."modelo" AS "vehiculo_modelo",
        v."anio" AS "vehiculo_anio",
        v."vin" AS "vehiculo_vin",
        c."id" AS "cliente_id",
        c."nombre" AS "cliente_nombre",
        c."telefono" AS "cliente_telefono",
        c."email" AS "cliente_email"
      FROM "ordenes_trabajo" o
      LEFT JOIN "vehiculos" v ON v."id" = o."vehiculoId"
      LEFT JOIN "clientes" c ON c."id" = v."clienteId"
      WHERE o."id" = :ordenId
      LIMIT 1;
      `,
      {
        replacements: { ordenId },
        type: QueryTypes.SELECT,
      }
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const row = rows[0];
    const diagnostico = await buscarDiagnosticoParaFileService({
      ordenId,
      vehiculoId: row.vehiculo_id,
    });
    const dtcs = parsearDtcDiagnostico(diagnostico || {});

    res.json({
      orden: {
        id: row.orden_id,
        estado: row.orden_estado,
        prioridad: row.orden_prioridad,
        motivo_ingreso: row.orden_motivo_ingreso,
      },
      vehiculo: row.vehiculo_id
        ? {
            id: row.vehiculo_id,
            patente: row.vehiculo_patente,
            marca: row.vehiculo_marca,
            modelo: row.vehiculo_modelo,
            anio: row.vehiculo_anio,
            vin: row.vehiculo_vin,
            cliente: row.cliente_id
              ? {
                  id: row.cliente_id,
                  nombre: row.cliente_nombre,
                  telefono: row.cliente_telefono,
                  email: row.cliente_email,
                }
              : null,
          }
        : null,
      diagnostico: diagnostico
        ? {
            id: diagnostico.id,
            createdAt: diagnostico.createdAt,
            codigos_dtc: diagnostico.codigos_dtc,
            fallas_detectadas: diagnostico.fallas_detectadas,
            observaciones: diagnostico.observaciones,
          }
        : null,
      dtcs_activos: dtcs,
      dtc_resumen: resumenDtc(dtcs),
      servicios_sugeridos: [],
    });
  } catch (error) {
    console.error("ERROR OBTENIENDO CONTEXTO FILE SERVICE:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

const crearArchivoECU = async (req, res) => {
  try {
    await prepararColumnas();

    if (!req.file) {
      return res.status(400).json({
        error: "No se recibió archivo original",
      });
    }

    const ordenId = Number(obtenerOrdenId(req.body));

    if (!ordenId || Number.isNaN(ordenId)) {
      return res.status(400).json({
        error: "Falta ordenId válido",
      });
    }

    const orden = await OrdenTrabajo.findByPk(ordenId);

    if (!orden) {
      return res.status(404).json({
        error: "Orden no encontrada",
      });
    }

    const validacion = await validarDiagnosticoObligatorio(ordenId);

    if (!validacion.ok) {
      return res.status(409).json({
        error: "No se puede enviar a File Service. Falta diagnóstico obligatorio.",
        bloqueo: "DIAGNOSTICO_OBLIGATORIO",
        faltantes: validacion.faltantes,
      });
    }

    const diagnostico = validacion.diagnostico || null;
    const preset = limpiarTexto(req.body.servicios_preset).toUpperCase();

    if (preset && !PRESETS_SERVICIOS_FILE_SERVICE[preset]) {
      return res.status(400).json({
        error: "Preset File Service no permitido",
      });
    }

    const tipoServicioBody = limpiarTexto(req.body.tipo_servicio);
    const serviciosSolicitados = normalizarServiciosSolicitados({
      servicios: req.body.servicios_solicitados,
      tipoServicio: tipoServicioBody,
      preset,
    });
    const observacionServicios = limpiarTexto(req.body.observacion_servicios);
    const requiereObservacionCustom = serviciosSolicitados.some((servicio) =>
      ["CUSTOM", "OTRO"].includes(limpiarTexto(servicio).toUpperCase())
    );

    if (requiereObservacionCustom && !observacionServicios) {
      return res.status(400).json({
        error: "Debes describir el servicio custom / otro en observacion_servicios.",
      });
    }

    const snapshotFrontend = normalizarDtcSnapshot(req.body.dtc_snapshot);
    const snapshotDiagnostico = parsearDtcDiagnostico(diagnostico || {});
    const dtcSnapshot = snapshotFrontend.length ? snapshotFrontend : snapshotDiagnostico;
    const dtcResumen = limpiarTexto(req.body.dtc_resumen) || resumenDtc(dtcSnapshot);
    const diagnosticoId =
      Number(req.body.diagnosticoId || req.body.diagnostico_id || diagnostico?.id) ||
      null;
    const servicioPrincipal =
      limpiarTexto(req.body.servicio_principal) ||
      serviciosSolicitados[0] ||
      tipoServicioBody ||
      preset ||
      "CUSTOM";
    const tipoServicioFinal = tipoServicioBody || servicioPrincipal || preset;
    const responsablesCreacion = {};

    for (const [campoId, campoTexto] of [
      ["tuner_asignado_a_id", "tuner_asignado_a"],
      ["operador_ecu_asignado_a_id", "operador_ecu_asignado_a"],
      ["slave_asignado_a_id", "slave_asignado_a"],
    ]) {
      const resuelto = await resolverResponsableArchivoDesdeBody(
        req.body,
        campoId,
        campoTexto,
        { obligatorio: false }
      );
      aplicarResponsableResuelto(responsablesCreacion, campoId, campoTexto, resuelto);
    }

    if (
      !limpiarTexto(responsablesCreacion.tuner_asignado_a_id) &&
      !limpiarTexto(responsablesCreacion.operador_ecu_asignado_a_id)
    ) {
      return res.status(400).json({
        error: "RESPONSABLE_REQUERIDO",
        message:
          "Debes seleccionar Tuner/Master u Operador ECU activo para crear File Service.",
      });
    }

    const nuevoArchivo = await ArchivoECU.create({
      ordenId,

      estado: "NOTIFICADO_MASTER",
      prioridad: limpiarTexto(req.body.prioridad) || "MEDIA",
      tipo_servicio: tipoServicioFinal,
      diagnosticoId,
      dtc_snapshot: dtcSnapshot,
      dtc_resumen: dtcResumen,
      dtc_importado_at: diagnostico ? new Date() : null,
      dtc_importado_por: diagnostico ? usuarioActual(req) : null,
      servicios_solicitados: serviciosSolicitados,
      servicios_preset: preset || null,
      servicio_principal: servicioPrincipal,
      observacion_servicios: observacionServicios || null,

      metodo_lectura: limpiarTexto(req.body.metodo_lectura),
      herramienta_lectura: limpiarTexto(req.body.herramienta_lectura),

      marca_ecu: limpiarTexto(req.body.marca_ecu),
      modelo_ecu: limpiarTexto(req.body.modelo_ecu),
      hw: limpiarTexto(req.body.hw),
      sw: limpiarTexto(req.body.sw),
      version_software: limpiarTexto(req.body.version_software),

      notas_operador: limpiarTexto(req.body.notas_operador),
      instrucciones_tuner: limpiarTexto(req.body.instrucciones_tuner),
      observaciones: limpiarTexto(req.body.observaciones),

      archivo_original: obtenerRutaPublicaArchivo(req.file),
      archivo_original_subido_por: usuarioActual(req),
      archivo_original_subido_at: new Date(),

      procesamiento_externo_estado: null,
      procesamiento_externo_herramienta: null,
      procesamiento_externo_responsable: null,
      procesamiento_externo_at: null,
      procesamiento_externo_observacion: null,
      procesamiento_externo_archivo_resultado: null,
      procesamiento_externo_archivos: [],

      ...responsablesCreacion,

      notificado_master_at: new Date(),
      notificado_master_por: usuarioActual(req),

      archivo_modificado: null,
      versiones_modificadas: [],
      ultima_version_modificada: 0,

      correccion_pendiente: false,

      post_escritura_estado: null,
      post_escritura_dtc: null,
      post_escritura_sin_dtc: false,
      post_escritura_scanner: null,
      post_escritura_observacion: null,
      post_escritura_por: null,
      post_escritura_por_id: null,
      post_escritura_at: null,

      mod_descargado_at: null,
      proceso_guard_estado: "SIN_RIESGO",
      proceso_guard_started_at: null,
      proceso_guard_last_alert_at: null,
      proceso_guard_escalado_at: null,
      proceso_guard_responsable_id: null,
      cierre_tecnico_obligatorio: false,
      cierre_tecnico_at: null,
      cierre_tecnico_por: null,
      resultado_tecnico: "PENDIENTE",
      observacion_cierre_tecnico: null,

      archivado: false,
    });

    try {
      await orden.update({
        estado: "EN_PROGRAMACION",
      });
    } catch (estadoError) {
      console.warn(
        "No se pudo actualizar estado de orden al crear File Service:",
        estadoError.message
      );
    }

    await crearNotificacionesInternas({
      rolesDestino: ["TUNER", "OWNER"],
      tipo: "FILE_ORIGINAL_CARGADO",
      titulo: "File Service original cargado",
      mensaje: `Se cargo un archivo original para la orden #${ordenId}.`,
      ordenId,
      archivoECUId: nuevoArchivo.id,
    });

    await registrarEventoFileServiceCreado({
      req,
      ordenId,
      archivoECUId: nuevoArchivo.id,
      servicios_solicitados: serviciosSolicitados,
      dtc_snapshot: dtcSnapshot,
      servicios_preset: preset || null,
    });

    res.status(201).json({
      mensaje: "Archivo ECU guardado y Master notificado internamente",
      archivo: nuevoArchivo,
      id: nuevoArchivo.id,
      archivoECUId: nuevoArchivo.id,
    });
  } catch (error) {
    console.error("ERROR AL CREAR ARCHIVO ECU:", error);

    const controlado = responderErrorResponsable(res, error);
    if (controlado) return;

    res.status(error.statusCode || 500).json({
      error: error.message,
      detalle: error.errors?.map((e) => e.message) || null,
    });
  }
};

const subirArchivoModificado = async (req, res) => {
  try {
    await prepararColumnas();

    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Registro no encontrado",
      });
    }

    if (archivo.archivado) {
      return res.status(400).json({
        error: "No puedes subir modificaciones a un archivo archivado",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "No se cargó el archivo modificado",
      });
    }

    const instruccionesTuner =
      limpiarTexto(req.body.instrucciones_tuner) ||
      limpiarTexto(req.body.instrucciones) ||
      "";

    const observaciones =
      limpiarTexto(req.body.observaciones) ||
      instruccionesTuner ||
      archivo.observaciones ||
      "";

    const versionesActuales = normalizarVersiones(archivo.versiones_modificadas);

    const versionActual =
      Number(archivo.ultima_version_modificada || 0) ||
      versionesActuales.length ||
      0;

    const nuevaVersionNumero = versionActual + 1;
    const rutaArchivo = obtenerRutaPublicaArchivo(req.file);

    const nuevaVersion = {
      version: nuevaVersionNumero,
      etiqueta:
        req.body.es_final === "true" || req.body.es_final === true
          ? "MOD FINAL"
          : `MOD V${nuevaVersionNumero}`,
      archivo: rutaArchivo,
      nombre_archivo: req.file.originalname || req.file.filename || null,
      instrucciones_tuner: instruccionesTuner,
      observaciones,
      cargado_por: usuarioActual(req),
      fecha: new Date().toISOString(),
    };

    const versionesActualizadas = [...versionesActuales, nuevaVersion];
    const inicioGuard = archivo.proceso_guard_started_at || new Date();

    await archivo.update({
      archivo_modificado: rutaArchivo,
      versiones_modificadas: versionesActualizadas,
      ultima_version_modificada: nuevaVersionNumero,
      instrucciones_tuner: instruccionesTuner || archivo.instrucciones_tuner,
      observaciones,
      estado: "MODIFICADO_LISTO",
      correccion_pendiente: false,

      post_escritura_estado: null,
      post_escritura_dtc: null,
      post_escritura_sin_dtc: false,
      post_escritura_scanner: null,
      post_escritura_observacion: null,
      post_escritura_por: null,
      post_escritura_at: null,

      mod_descargado_at: null,
      proceso_guard_estado: "EN_ESPERA_POST_ESCRITURA",
      proceso_guard_started_at: inicioGuard,
      proceso_guard_responsable_id: processGuardResponsableArchivo(archivo),
      cierre_tecnico_obligatorio: true,
      cierre_tecnico_at: null,
      cierre_tecnico_por: null,
      cierre_tecnico_por_id: null,
      resultado_tecnico: "PENDIENTE",
      observacion_cierre_tecnico: null,
    });

    await registrarEventoFileServiceOrden({
      ordenId: archivo.ordenId,
      archivoECUId: archivo.id,
      tipo_evento: "MOD_SUBIDO",
      titulo: "MOD cargado",
      descripcion: `Se cargo ${nuevaVersion.etiqueta} para File Service.`,
      usuario: usuarioActual(req),
      usuario_rol: req.usuario?.rol || req.user?.rol || null,
      metadata: {
        version: nuevaVersionNumero,
        es_final: req.body.es_final === "true" || req.body.es_final === true,
      },
    });

    await crearNotificacionesInternas({
      rolesDestino: ["OPERADOR_ECU", "OWNER"],
      tipo: "FILE_MOD_LISTO",
      titulo: "MOD listo para escritura",
      mensaje: `Se cargo ${nuevaVersion.etiqueta} para el File Service #${archivo.id}.`,
      ordenId: archivo.ordenId,
      archivoECUId: archivo.id,
      accion_url: `/archivos-ecu?archivoId=${archivo.id}#post-escritura`,
      accion_tipo: "ABRIR_POST_ESCRITURA",
      entidad_tipo: "ARCHIVO_ECU",
      entidad_id: archivo.id,
      metadata: {
        prioridad: "ALTA",
        proceso_guard: true,
      },
    });

    res.json({
      mensaje: `Software modificado ${nuevaVersion.etiqueta} cargado con éxito`,
      archivo,
      version: nuevaVersion,
    });
  } catch (error) {
    console.error("ERROR AL SUBIR ARCHIVO MODIFICADO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const registrarProcesamientoExterno = async (req, res) => {
  try {
    await prepararColumnas();

    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Registro no encontrado",
      });
    }

    if (archivo.archivado) {
      return res.status(400).json({
        error: "No puedes registrar procesamiento externo en un archivo archivado",
      });
    }

    const estadosPermitidos = [
      "PENDIENTE",
      "EN_PROCESO",
      "COMPLETADO",
      "FALLIDO",
      "NO_APLICA",
    ];

    const herramientasPermitidas = [
      "ALIENTECH_RECODE",
      "KESS3",
      "STAGEX",
      "OTRO",
    ];

    let estado =
      limpiarTexto(req.body.procesamiento_externo_estado) ||
      limpiarTexto(req.body.estado) ||
      "EN_PROCESO";

    let herramienta =
      limpiarTexto(req.body.procesamiento_externo_herramienta) ||
      limpiarTexto(req.body.herramienta) ||
      "OTRO";

    estado = estado.toUpperCase();
    herramienta = herramienta.toUpperCase();

    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        error: "Estado de procesamiento externo inválido",
      });
    }

    if (!herramientasPermitidas.includes(herramienta)) {
      return res.status(400).json({
        error: "Herramienta de procesamiento externo inválida",
      });
    }

    const observacion =
      limpiarTexto(req.body.procesamiento_externo_observacion) ||
      limpiarTexto(req.body.observacion);

    const rutaArchivo = obtenerRutaPublicaArchivo(req.file);
    const responsable = usuarioActual(req);
    const fecha = new Date();

    const evento = {
      estado,
      herramienta,
      observacion,
      archivo: rutaArchivo,
      responsable,
      fecha: fecha.toISOString(),
    };

    const historial = normalizarVersiones(archivo.procesamiento_externo_archivos);

    await archivo.update({
      procesamiento_externo_estado: estado,
      procesamiento_externo_herramienta: herramienta,
      procesamiento_externo_responsable: responsable,
      procesamiento_externo_at: fecha,
      procesamiento_externo_observacion: observacion,
      procesamiento_externo_archivo_resultado:
        rutaArchivo || archivo.procesamiento_externo_archivo_resultado,
      procesamiento_externo_archivos: [...historial, evento],
    });

    res.json({
      mensaje: "Procesamiento externo registrado correctamente",
      archivo,
      evento,
    });
  } catch (error) {
    console.error("ERROR AL REGISTRAR PROCESAMIENTO EXTERNO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const notificarMaster = async (req, res) => {
  try {
    await prepararColumnas();

    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo ECU no encontrado",
      });
    }

    if (archivo.archivado) {
      return res.status(400).json({
        error: "No puedes notificar un archivo archivado",
      });
    }

    await archivo.update({
      estado: "NOTIFICADO_MASTER",
      notificado_master_at: new Date(),
      notificado_master_por: usuarioActual(req),
    });

    res.json({
      mensaje: "Master notificado correctamente",
      archivo,
    });
  } catch (error) {
    console.error("ERROR NOTIFICANDO MASTER:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const notificarSlave = async (req, res) => {
  try {
    await prepararColumnas();

    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo ECU no encontrado",
      });
    }

    if (archivo.archivado) {
      return res.status(400).json({
        error: "No puedes notificar un archivo archivado",
      });
    }

    if (!archivo.archivo_modificado) {
      return res.status(400).json({
        error: "No puedes notificar al Slave sin archivo modificado cargado",
      });
    }

    await archivo.update({
      estado: "NOTIFICADO_SLAVE",
      notificado_slave_at: new Date(),
      notificado_slave_por: usuarioActual(req),
      mod_descargado_at: archivo.mod_descargado_at || new Date(),
      proceso_guard_estado:
        normalizarProcessGuardEstado(archivo.proceso_guard_estado) === "SIN_RIESGO"
          ? "EN_ESPERA_POST_ESCRITURA"
          : normalizarProcessGuardEstado(archivo.proceso_guard_estado),
      proceso_guard_started_at: archivo.proceso_guard_started_at || new Date(),
      proceso_guard_responsable_id: processGuardResponsableArchivo(archivo),
      cierre_tecnico_obligatorio: true,
      resultado_tecnico: normalizarResultadoTecnico(archivo.resultado_tecnico),
    });

    res.json({
      mensaje: "Slave / Operador ECU notificado correctamente",
      archivo,
    });
  } catch (error) {
    console.error("ERROR NOTIFICANDO SLAVE:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const solicitarCorreccion = async (req, res) => {
  try {
    await prepararColumnas();

    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo ECU no encontrado",
      });
    }

    if (archivo.archivado) {
      return res.status(400).json({
        error: "No puedes solicitar corrección de un archivo archivado",
      });
    }

    const dtcPost = limpiarTexto(req.body.dtc_post_escritura);
    const observacion = limpiarTexto(req.body.observacion_correccion);

    if (!dtcPost && !observacion) {
      return res.status(400).json({
        error: "Debes indicar DTC post escritura u observación de corrección",
      });
    }

    await archivo.update({
      estado: "REQUIERE_CORRECCION",
      correccion_pendiente: true,
      dtc_post_escritura: dtcPost,
      observacion_correccion: observacion,
      proceso_guard_estado: "CRITICO",
      proceso_guard_started_at: archivo.proceso_guard_started_at || new Date(),
      cierre_tecnico_obligatorio: true,
      resultado_tecnico: "REQUIERE_CORRECCION",
    });

    await crearNotificacionesInternas({
      rolesDestino: ["TUNER", "OWNER"],
      tipo: "FILE_REQUIERE_CORRECCION",
      titulo: "File Service requiere correccion",
      mensaje: `El File Service #${archivo.id} requiere correccion.`,
      ordenId: archivo.ordenId,
      archivoECUId: archivo.id,
      accion_url: `/archivos-ecu?archivoId=${archivo.id}#post-escritura`,
      accion_tipo: "ABRIR_CORRECCION_FILE_SERVICE",
      entidad_tipo: "ARCHIVO_ECU",
      entidad_id: archivo.id,
      metadata: {
        prioridad: "URGENTE",
        proceso_guard: true,
      },
    });

    await registrarEventoFileServiceOrden({
      ordenId: archivo.ordenId,
      archivoECUId: archivo.id,
      tipo_evento: "CORRECCION_SOLICITADA",
      titulo: "Correccion File Service solicitada",
      descripcion:
        observacion || dtcPost || "Se solicito correccion tecnica de File Service.",
      usuario: usuarioActual(req),
      usuario_rol: req.usuario?.rol || req.user?.rol || null,
      metadata: {
        tiene_dtc_post: Boolean(dtcPost),
      },
    });

    res.json({
      mensaje: "Corrección solicitada. El tuner puede cargar una nueva versión MOD.",
      archivo,
    });
  } catch (error) {
    console.error("ERROR SOLICITANDO CORRECCIÓN:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const registrarPostEscritura = async (req, res) => {
  try {
    await prepararColumnas();

    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo ECU no encontrado",
      });
    }

    if (archivo.archivado) {
      return res.status(400).json({
        error: "No puedes registrar post escritura en un archivo archivado",
      });
    }

    const resultado = limpiarTexto(req.body.post_escritura_estado);
    const dtc = limpiarTexto(req.body.post_escritura_dtc);
    const observacion = limpiarTexto(req.body.post_escritura_observacion);

    const sinDtc =
      req.body.post_escritura_sin_dtc === true ||
      String(req.body.post_escritura_sin_dtc).toLowerCase() === "true" ||
      String(req.body.post_escritura_sin_dtc) === "1";

    if (!resultado) {
      return res.status(400).json({
        error: "Debes indicar resultado post escritura",
      });
    }

    const resultadosPermitidos = [
      "OK",
      "NO_APLICA",
      "REQUIERE_CORRECCION",
      "FALLO_ESCRITURA",
      "EN_PRUEBA",
    ];

    if (!resultadosPermitidos.includes(resultado)) {
      return res.status(400).json({
        error: "Resultado post escritura inválido",
        permitidos: resultadosPermitidos,
      });
    }

    if (resultado !== "NO_APLICA" && !archivo.archivo_modificado) {
      return res.status(400).json({
        error: "No puedes registrar post escritura sin archivo modificado cargado",
      });
    }

    if (resultado !== "NO_APLICA" && !req.file) {
      return res.status(400).json({
        error: "La foto/captura del scanner post escritura es obligatoria",
      });
    }

    if (resultado === "NO_APLICA" && !observacion) {
      return res.status(400).json({
        error: "Debes indicar observacion tecnica cuando post escritura no aplica",
      });
    }

    if (!sinDtc && !dtc) {
      return res.status(400).json({
        error: "Debes ingresar DTC post escritura o marcar SIN DTC POST ESCRITURA",
      });
    }

    let nuevoEstado = "POST_ESCRITURA_PENDIENTE";
    let correccionPendiente = false;

    if (resultado === "OK" || resultado === "NO_APLICA") {
      nuevoEstado = "POST_ESCRITURA_OK";
      correccionPendiente = false;
    }

    if (resultado === "REQUIERE_CORRECCION" || resultado === "FALLO_ESCRITURA") {
      nuevoEstado = "REQUIERE_CORRECCION";
      correccionPendiente = true;
    }

    if (resultado === "EN_PRUEBA") {
      nuevoEstado = "POST_ESCRITURA_PENDIENTE";
      correccionPendiente = false;
    }

    const rutaScanner = obtenerRutaPublicaArchivo(req.file);
    const textoDtc = sinDtc ? "SIN DTC POST ESCRITURA" : dtc;
    const resultadoTecnico = resultadoTecnicoDesdePost(resultado);
    const procesoGuardEstado =
      resultado === "OK" || resultado === "NO_APLICA"
        ? "EN_ESPERA_POST_ESCRITURA"
        : resultado === "EN_PRUEBA"
        ? "ADVERTENCIA"
        : "CRITICO";

    await archivo.update({
      estado: nuevoEstado,

      post_escritura_estado: resultado,
      post_escritura_dtc: textoDtc,
      post_escritura_sin_dtc: sinDtc,
      post_escritura_scanner: rutaScanner,
      post_escritura_observacion: observacion,
      post_escritura_por: usuarioActual(req),
      post_escritura_por_id: usuarioActualId(req) || null,
      post_escritura_at: new Date(),

      correccion_pendiente: correccionPendiente,

      dtc_post_escritura: textoDtc,
      proceso_guard_estado: procesoGuardEstado,
      proceso_guard_started_at: archivo.proceso_guard_started_at || new Date(),
      proceso_guard_responsable_id: processGuardResponsableArchivo(archivo),
      cierre_tecnico_obligatorio: true,
      resultado_tecnico: resultadoTecnico,

      observacion_correccion:
        resultado === "REQUIERE_CORRECCION" || resultado === "FALLO_ESCRITURA"
          ? observacion
          : archivo.observacion_correccion,
    });

    await registrarEventoFileServiceOrden({
      ordenId: archivo.ordenId,
      archivoECUId: archivo.id,
      tipo_evento: "POST_ESCRITURA_REGISTRADA",
      titulo: "Post escritura registrada",
      descripcion: `Resultado post escritura: ${resultado}.`,
      usuario: usuarioActual(req),
      usuario_rol: req.usuario?.rol || req.user?.rol || null,
      metadata: {
        resultado,
        sin_dtc: sinDtc,
        tiene_dtc: Boolean(textoDtc),
      },
    });

    res.json({
      mensaje:
        resultado === "OK"
          ? "Post escritura registrado correctamente. Archivo listo para cierre técnico."
          : "Post escritura registrado. Revisa el estado del trabajo.",
      archivo,
    });
  } catch (error) {
    console.error("ERROR REGISTRANDO POST ESCRITURA:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const marcarModDescargado = async (req, res) => {
  try {
    await prepararColumnas();

    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo ECU no encontrado",
      });
    }

    if (archivo.archivado) {
      return res.status(400).json({
        error: "No puedes marcar MOD descargado en un archivo archivado",
      });
    }

    if (!archivo.archivo_modificado) {
      return res.status(400).json({
        error: "No puedes marcar MOD descargado sin archivo modificado cargado",
      });
    }

    const fecha = new Date();
    const evaluacion = calcularProcessGuardArchivo({
      ...archivo.get({ plain: true }),
      mod_descargado_at: archivo.mod_descargado_at || fecha,
      proceso_guard_started_at: archivo.proceso_guard_started_at || fecha,
      cierre_tecnico_obligatorio: true,
    });

    await archivo.update({
      mod_descargado_at: archivo.mod_descargado_at || fecha,
      proceso_guard_started_at: archivo.proceso_guard_started_at || fecha,
      proceso_guard_estado:
        evaluacion.estado === "CERRADO" ? "EN_ESPERA_POST_ESCRITURA" : evaluacion.estado,
      proceso_guard_responsable_id: processGuardResponsableArchivo(archivo),
      cierre_tecnico_obligatorio: true,
      resultado_tecnico: normalizarResultadoTecnico(archivo.resultado_tecnico),
    });

    res.json({
      mensaje:
        "MOD marcado como descargado/aplicado. Se mantiene contador de cierre técnico.",
      archivo,
      process_guard: evaluacion,
    });
  } catch (error) {
    console.error("ERROR MARCANDO MOD DESCARGADO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const registrarCierreTecnico = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    await prepararColumnas();

    const archivo = await ArchivoECU.findByPk(req.params.id, { transaction });

    if (!archivo) {
      await transaction.rollback();
      return res.status(404).json({
        error: "Archivo ECU no encontrado",
      });
    }

    if (archivo.archivado) {
      await transaction.rollback();
      return res.status(400).json({
        error: "No puedes cerrar técnicamente un archivo archivado",
      });
    }

    const resultado = normalizarResultadoTecnico(
      req.body.resultado_tecnico || req.body.resultado
    );
    const observacion =
      limpiarTexto(req.body.observacion_cierre_tecnico) ||
      limpiarTexto(req.body.observacion) ||
      "";

    if (!RESULTADOS_TECNICOS.includes(resultado)) {
      await transaction.rollback();
      return res.status(400).json({
        error: "Resultado técnico inválido",
        permitidos: RESULTADOS_TECNICOS,
      });
    }

    if (resultado === "OK") {
      const { faltantes } = validarChecklistCierreTecnicoOK(archivo, observacion);

      if (faltantes.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          error: "CHECKLIST_CIERRE_INCOMPLETO",
          message: "No se puede cerrar tecnicamente. Faltan requisitos.",
          faltantes,
        });
      }
    } else if (!observacion) {
      await transaction.rollback();
      return res.status(400).json({
        error: "OBSERVACION_CIERRE_REQUERIDA",
        message: "Debes indicar observacion tecnica cuando el cierre no queda OK.",
      });
    }

    const fecha = new Date();
    const payload = {
      resultado_tecnico: resultado,
      observacion_cierre_tecnico: observacion,
      proceso_guard_started_at: archivo.proceso_guard_started_at || fecha,
      cierre_tecnico_obligatorio: true,
    };

    if (resultado === "OK") {
      payload.estado = "FINALIZADO_TECNICO";
      payload.correccion_pendiente = false;
      payload.proceso_guard_estado = "CERRADO";
      payload.cierre_tecnico_obligatorio = false;
      payload.cierre_tecnico_at = fecha;
      payload.cierre_tecnico_por = usuarioActual(req);
      payload.cierre_tecnico_por_id = usuarioActualId(req) || null;
    }

    if (resultado === "FALLO") {
      payload.estado = "POST_ESCRITURA_PENDIENTE";
      payload.proceso_guard_estado = "CRITICO";
      payload.correccion_pendiente = false;
    }

    if (resultado === "REQUIERE_CORRECCION") {
      payload.estado = "REQUIERE_CORRECCION";
      payload.proceso_guard_estado = "CRITICO";
      payload.correccion_pendiente = true;
      payload.observacion_correccion = observacion || archivo.observacion_correccion;
    }

    if (resultado === "REQUIERE_NUEVA_LECTURA") {
      payload.estado = "REQUIERE_NUEVA_LECTURA";
      payload.proceso_guard_estado = "ESCALADO";
      payload.correccion_pendiente = false;
    }

    if (resultado === "PENDIENTE") {
      payload.estado = archivo.post_escritura_estado === "OK"
        ? "POST_ESCRITURA_OK"
        : "POST_ESCRITURA_PENDIENTE";
      payload.proceso_guard_estado = "EN_ESPERA_POST_ESCRITURA";
    }

    await archivo.update(payload, { transaction });

    if (resultado === "OK") {
      const [resultadoOrden] = await sequelize.query(
        `
        UPDATE "ordenes_trabajo"
        SET
          "estado" = 'LISTO_PARA_ENTREGA',
          "tecnico_finalizado_por" = :usuario,
          "tecnico_finalizado_at" = NOW(),
          "updatedAt" = NOW()
        WHERE "id" = :ordenId
        RETURNING "id";
        `,
        {
          replacements: {
            ordenId: archivo.ordenId,
            usuario: usuarioActual(req),
          },
          transaction,
        }
      );

      if (!resultadoOrden || resultadoOrden.length === 0) {
        await transaction.rollback();
        return res.status(404).json({
          error:
            "Cierre técnico válido, pero no se encontró la orden asociada. No se aplicaron cambios.",
        });
      }
    }

    await transaction.commit();

    const archivoActualizado = await ArchivoECU.findByPk(req.params.id);

    await registrarEventoFileServiceOrden({
      ordenId: archivo.ordenId,
      archivoECUId: archivo.id,
      tipo_evento: "CIERRE_TECNICO",
      titulo:
        resultado === "OK"
          ? "Cierre tecnico File Service OK"
          : "Cierre tecnico File Service no OK",
      descripcion: observacion || `Resultado tecnico: ${resultado}.`,
      usuario: usuarioActual(req),
      usuario_rol: req.usuario?.rol || req.user?.rol || null,
      metadata: {
        resultado_tecnico: resultado,
      },
    });

    if (resultado === "OK") {
      await crearNotificacionesInternas({
        rolesDestino: ["RECEPCION", "ADMIN", "OWNER"],
        tipo: "ORDEN_LISTA_ENTREGA",
        titulo: "Orden lista para entrega",
        mensaje: `La orden #${archivo.ordenId} esta lista para entrega comercial.`,
        ordenId: archivo.ordenId,
        archivoECUId: archivo.id,
        accion_url: `/ordenes?ordenId=${archivo.ordenId}#entrega`,
        accion_tipo: "ABRIR_ENTREGA",
        entidad_tipo: "ORDEN_TRABAJO",
        entidad_id: archivo.ordenId,
        metadata: {
          proceso_guard: true,
          prioridad: "ALTA",
        },
      });
    } else {
      await crearNotificacionesInternas({
        rolesDestino: ["OWNER", "SUPERVISOR", "TUNER", "OPERADOR_ECU"],
        tipo: "PROCESS_GUARD_CIERRE_NO_OK",
        titulo: "Cierre técnico requiere acción",
        mensaje: `File Service #${archivo.id} quedó con resultado técnico ${resultado}.`,
        ordenId: archivo.ordenId,
        archivoECUId: archivo.id,
        accion_url: `/archivos-ecu?archivoId=${archivo.id}#post-escritura`,
        accion_tipo: "ABRIR_PROCESS_GUARD",
        entidad_tipo: "ARCHIVO_ECU",
        entidad_id: archivo.id,
        metadata: {
          proceso_guard: true,
          resultado_tecnico: resultado,
          prioridad: ["REQUIERE_CORRECCION", "REQUIERE_NUEVA_LECTURA", "FALLO"].includes(
            resultado
          )
            ? "URGENTE"
            : "ALTA",
        },
      });
    }

    res.json({
      mensaje:
        resultado === "OK"
          ? "Cierre técnico registrado. Orden lista para entrega comercial."
          : "Resultado técnico registrado. El proceso sigue pendiente hasta resolver.",
      archivo: archivoActualizado,
    });
  } catch (error) {
    await transaction.rollback();

    console.error("ERROR REGISTRANDO CIERRE TECNICO:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const archivarArchivoECU = async (req, res) => {
  try {
    await prepararColumnas();

    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo ECU no encontrado",
      });
    }

    const motivo = limpiarTexto(req.body.archivado_motivo || req.body.motivo);
    const comentario = limpiarTexto(
      req.body.archivado_comentario || req.body.comentario
    );

    if (!motivo) {
      return res.status(400).json({
        error: "Debes indicar motivo de archivado",
      });
    }

    const motivosPermitidos = [
      "CLIENTE_DESISTE",
      "SIN_FACTIBILIDAD_TECNICA",
      "DUPLICADO",
      "ERROR_INGRESO",
      "NO_AUTORIZADO",
      "OTRO",
    ];

    if (!motivosPermitidos.includes(motivo)) {
      return res.status(400).json({
        error: "Motivo de archivado inválido",
        permitidos: motivosPermitidos,
      });
    }

    await archivo.update({
      estado: "ARCHIVADO",
      archivado: true,
      archivado_motivo: motivo,
      archivado_comentario: comentario,
      archivado_por: usuarioActual(req),
      archivado_at: new Date(),
      proceso_guard_estado: "CERRADO",
      cierre_tecnico_obligatorio: false,
    });

    res.json({
      mensaje: "Archivo ECU archivado correctamente",
      archivo,
    });
  } catch (error) {
    console.error("ERROR ARCHIVANDO ARCHIVO ECU:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const obtenerArchivoECUPorId = async (req, res) => {
  try {
    await prepararColumnas();

    const rows = await sequelize.query(
      `
      ${queryArchivosBase}
      WHERE a."id" = :id
      LIMIT 1;
      `,
      {
        replacements: {
          id: req.params.id,
        },
        type: QueryTypes.SELECT,
      }
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "No encontrado",
      });
    }

    res.json(mapearArchivoRow(rows[0]));
  } catch (error) {
    console.error("ERROR AL OBTENER ARCHIVO ECU:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const actualizarArchivoECU = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    await prepararColumnas();

    const archivo = await ArchivoECU.findByPk(req.params.id, { transaction });

    if (!archivo) {
      await transaction.rollback();

      return res.status(404).json({
        error: "No encontrado",
      });
    }

    if (archivo.archivado) {
      await transaction.rollback();

      return res.status(400).json({
        error: "No puedes modificar un archivo archivado",
      });
    }

    const nuevoEstado = limpiarTexto(req.body.estado);

    const quiereFinalizarTecnico =
      nuevoEstado === "FINALIZADO" || nuevoEstado === "FINALIZADO_TECNICO";
    const observacionCierreSolicitada =
      limpiarTexto(req.body.observacion_cierre_tecnico) ||
      limpiarTexto(req.body.observacion) ||
      archivo.observacion_cierre_tecnico ||
      "";

    if (quiereFinalizarTecnico) {
      const { faltantes } = validarChecklistCierreTecnicoOK(
        archivo,
        observacionCierreSolicitada
      );

      if (faltantes.length > 0) {
        await transaction.rollback();

        return res.status(400).json({
          error:
            "No puedes finalizar técnicamente sin evidencia post escritura completa",
          faltantes,
        });
      }
    }

    const payload = {};

    const camposTexto = [
      "estado",
      "prioridad",
      "tipo_servicio",
      "servicio_principal",
      "servicios_preset",
      "dtc_resumen",
      "observacion_servicios",
      "metodo_lectura",
      "herramienta_lectura",
      "marca_ecu",
      "modelo_ecu",
      "hw",
      "sw",
      "version_software",
      "notas_operador",
      "instrucciones_tuner",
      "observaciones",
      "dtc_post_escritura",
      "observacion_correccion",
      "tuner_asignado_a",
      "operador_ecu_asignado_a",
      "slave_asignado_a",
    ];

    camposTexto.forEach((campo) => {
      if (Object.prototype.hasOwnProperty.call(req.body, campo)) {
        payload[campo] = limpiarTexto(req.body[campo]);
      }
    });

    if (Object.prototype.hasOwnProperty.call(req.body, "servicios_solicitados")) {
      payload.servicios_solicitados = normalizarServiciosSolicitados({
        servicios: req.body.servicios_solicitados,
        tipoServicio: payload.tipo_servicio || archivo.tipo_servicio,
        preset: payload.servicios_preset || archivo.servicios_preset,
      });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "dtc_snapshot")) {
      payload.dtc_snapshot = normalizarDtcSnapshot(req.body.dtc_snapshot);
      payload.dtc_resumen = payload.dtc_resumen || resumenDtc(payload.dtc_snapshot);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "diagnosticoId")) {
      payload.diagnosticoId = Number(req.body.diagnosticoId) || null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "correccion_pendiente")) {
      payload.correccion_pendiente =
        req.body.correccion_pendiente === true ||
        String(req.body.correccion_pendiente).toLowerCase() === "true";
    }

    const responsablesIdConfig = [
      ["tuner_asignado_a_id", "tuner_asignado_a"],
      ["operador_ecu_asignado_a_id", "operador_ecu_asignado_a"],
      ["slave_asignado_a_id", "slave_asignado_a"],
    ];

    for (const [campoId, campoTexto] of responsablesIdConfig) {
      if (!Object.prototype.hasOwnProperty.call(req.body, campoId)) continue;

      const nuevoResponsableId = limpiarTexto(req.body[campoId]);

      if (!nuevoResponsableId) {
        payload[campoId] = null;
        payload[campoTexto] = Object.prototype.hasOwnProperty.call(req.body, campoTexto)
          ? limpiarTexto(req.body[campoTexto])
          : "";
        continue;
      }

      const resuelto = await resolverResponsableArchivoDesdeBody(
        req.body,
        campoId,
        campoTexto,
        {
          validarGuardia:
            String(archivo[campoId] || "") !== String(nuevoResponsableId),
        }
      );

      aplicarResponsableResuelto(payload, campoId, campoTexto, resuelto);
    }

    if (quiereFinalizarTecnico) {
      payload.estado = "FINALIZADO_TECNICO";
      payload.correccion_pendiente = false;
      payload.proceso_guard_estado = "CERRADO";
      payload.cierre_tecnico_obligatorio = false;
      payload.cierre_tecnico_at = new Date();
      payload.cierre_tecnico_por = usuarioActual(req);
      payload.cierre_tecnico_por_id = usuarioActualId(req) || null;
      payload.resultado_tecnico = "OK";
      payload.observacion_cierre_tecnico =
        limpiarTexto(req.body.observacion_cierre_tecnico) ||
        limpiarTexto(req.body.observacion) ||
        archivo.observacion_cierre_tecnico ||
        "Cierre técnico registrado al finalizar File Service.";
    }

    const responsablesPrevios = {
      tuner_asignado_a: limpiarTexto(archivo.tuner_asignado_a),
      operador_ecu_asignado_a: limpiarTexto(archivo.operador_ecu_asignado_a),
      slave_asignado_a: limpiarTexto(archivo.slave_asignado_a),
    };

    const notificacionesResponsables = Object.entries(
      NOTIFICACIONES_RESPONSABLES_FILE
    )
      .filter(([campo]) => Object.prototype.hasOwnProperty.call(payload, campo))
      .map(([campo, config]) => ({
        ...config,
        usuarioDestino: limpiarTexto(payload[campo]),
        usuarioAnterior: responsablesPrevios[campo],
      }))
      .filter(
        (notificacion) =>
          notificacion.usuarioDestino &&
          notificacion.usuarioDestino !== notificacion.usuarioAnterior
      );

    await archivo.update(payload, { transaction });

    if (quiereFinalizarTecnico) {
      const [resultadoOrden] = await sequelize.query(
        `
        UPDATE "ordenes_trabajo"
        SET
          "estado" = 'LISTO_PARA_ENTREGA',
          "tecnico_finalizado_por" = :usuario,
          "tecnico_finalizado_at" = NOW(),
          "updatedAt" = NOW()
        WHERE "id" = :ordenId
        RETURNING "id", "estado", "estado_pago", "monto_total";
        `,
        {
          replacements: {
            ordenId: archivo.ordenId,
            usuario: usuarioActual(req),
          },
          transaction,
        }
      );

      if (!resultadoOrden || resultadoOrden.length === 0) {
        await transaction.rollback();

        return res.status(404).json({
          error:
            "Archivo finalizado técnicamente, pero no se encontró la orden asociada. No se aplicaron cambios.",
        });
      }
    }

    await transaction.commit();

    const archivoActualizado = await ArchivoECU.findByPk(req.params.id);

    for (const notificacion of notificacionesResponsables) {
      await registrarEventoFileServiceOrden({
        ordenId: archivo.ordenId,
        archivoECUId: archivo.id,
        tipo_evento: "RESPONSABLE_FILE_SERVICE_ASIGNADO",
        titulo: notificacion.titulo,
        descripcion: `Responsable asignado para ${notificacion.etapa}.`,
        usuario: usuarioActual(req),
        usuario_rol: req.usuario?.rol || req.user?.rol || null,
        metadata: {
          responsable: notificacion.usuarioDestino,
        },
      });
    }

    if (quiereFinalizarTecnico) {
      await registrarEventoFileServiceOrden({
        ordenId: archivo.ordenId,
        archivoECUId: archivo.id,
        tipo_evento: "CIERRE_TECNICO",
        titulo: "Cierre tecnico File Service OK",
        descripcion:
          payload.observacion_cierre_tecnico ||
          "File Service finalizado tecnicamente por PATCH.",
        usuario: usuarioActual(req),
        usuario_rol: req.usuario?.rol || req.user?.rol || null,
        metadata: {
          resultado_tecnico: "OK",
        },
      });
    }

    if (quiereFinalizarTecnico) {
      await crearNotificacionesInternas({
        rolesDestino: ["RECEPCION", "ADMIN", "OWNER"],
        tipo: "ORDEN_LISTA_ENTREGA",
        titulo: "Orden lista para entrega",
        mensaje: `La orden #${archivo.ordenId} esta lista para entrega comercial.`,
        ordenId: archivo.ordenId,
        archivoECUId: archivo.id,
      });
    }

    if (notificacionesResponsables.length > 0) {
      try {
        await Promise.all(
          notificacionesResponsables.map((notificacion) =>
            crearNotificacionesInternas({
              usuariosDestino: [notificacion.usuarioDestino],
              tipo: notificacion.tipo,
              titulo: notificacion.titulo,
              mensaje: `Te asignaron el File Service #${archivo.id} para ${notificacion.etapa}.`,
              ordenId: archivo.ordenId,
              archivoECUId: archivo.id,
            })
          )
        );
      } catch (errorNotificacion) {
        console.warn(
          "No se pudieron crear notificaciones de responsables File Service:",
          errorNotificacion.message
        );
      }
    }

    res.json({
      mensaje: quiereFinalizarTecnico
        ? "Archivo ECU finalizado técnicamente y orden marcada como LISTO_PARA_ENTREGA"
        : "Archivo ECU actualizado",
      archivo: archivoActualizado,
    });
  } catch (error) {
    await transaction.rollback();

    console.error("ERROR AL ACTUALIZAR ARCHIVO ECU:", error);

    const controlado = responderErrorResponsable(res, error);
    if (controlado) return;

    res.status(500).json({
      error: error.message,
    });
  }
};

const eliminarArchivoECU = async (req, res) => {
  try {
    await prepararColumnas();

    const archivo = await ArchivoECU.findByPk(req.params.id);

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo ECU no encontrado",
      });
    }

    await archivo.update({
      estado: "ARCHIVADO",
      archivado: true,
      archivado_motivo: "ELIMINADO_COMPATIBILIDAD",
      archivado_comentario:
        "Este registro fue archivado usando la ruta antigua DELETE. No fue eliminado físicamente.",
      archivado_por: usuarioActual(req),
      archivado_at: new Date(),
      proceso_guard_estado: "CERRADO",
      cierre_tecnico_obligatorio: false,
    });

    res.json({
      mensaje:
        "Archivo ECU archivado correctamente. La eliminación física fue reemplazada por archivado.",
      id: req.params.id,
    });
  } catch (error) {
    console.error("ERROR AL ARCHIVAR DESDE DELETE:", error);

    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  crearArchivoECU,
  obtenerArchivosECU,
  obtenerContextoSolicitud,
  obtenerArchivoECUPorId,
  actualizarArchivoECU,
  subirArchivoModificado,
  registrarProcesamientoExterno,
  notificarMaster,
  notificarSlave,
  solicitarCorreccion,
  registrarPostEscritura,
  marcarModDescargado,
  registrarCierreTecnico,
  archivarArchivoECU,
  eliminarArchivoECU,
  prepararColumnasArchivoECU: prepararColumnas,
  calcularProcessGuardArchivo,
};
