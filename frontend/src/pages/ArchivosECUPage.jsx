import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import {
  getOperationalStatusLabel,
  getStatusColor,
} from "../utils/statusStyles";

const ESTADOS = {
  ORIGINAL_CARGADO: "Archivo original recibido",
  NOTIFICADO_MASTER: "Master notificado",
  MODIFICADO_LISTO: "MOD listo",
  NOTIFICADO_SLAVE: "Slave notificado",
  POST_ESCRITURA_PENDIENTE: "Falta prueba final",
  POST_ESCRITURA_OK: "Prueba final completada",
  REQUIERE_CORRECCION: "Requiere corrección",
  FINALIZADO: "Finalizado",
  FINALIZADO_TECNICO: "Trabajo técnico terminado",
  ARCHIVADO: "Archivado",
};

const RESULTADOS_POST_ESCRITURA = [
  { value: "OK", label: "OK - Sin problemas" },
  { value: "NO_APLICA", label: "No aplica - revision simple" },
  { value: "REQUIERE_CORRECCION", label: "Requiere corrección ECU" },
  { value: "FALLO_ESCRITURA", label: "Falló escritura" },
  { value: "EN_PRUEBA", label: "Vehículo en prueba" },
];

const RESULTADOS_TECNICOS_CIERRE = [
  { value: "OK", label: "OK - Listo para entrega" },
  { value: "FALLO", label: "Fallo / pendiente de prueba" },
  { value: "REQUIERE_CORRECCION", label: "Requiere correccion" },
  { value: "REQUIERE_NUEVA_LECTURA", label: "Requiere nueva lectura" },
  { value: "PENDIENTE", label: "Pendiente" },
];

const MOTIVOS_ARCHIVO = [
  { value: "CLIENTE_DESISTE", label: "Cliente desistió" },
  { value: "SIN_FACTIBILIDAD_TECNICA", label: "Sin factibilidad técnica" },
  { value: "DUPLICADO", label: "Trabajo duplicado" },
  { value: "ERROR_INGRESO", label: "Error de ingreso" },
  { value: "NO_AUTORIZADO", label: "Cliente no autorizó" },
  { value: "OTRO", label: "Otro" },
];

const FILTROS = [
  { value: "PENDIENTES", label: "Pendientes" },
  { value: "EN_PROCESO", label: "En proceso" },
  { value: "MOD_LISTO", label: "MOD listo" },
  { value: "PENDIENTE_POST", label: "Falta prueba final" },
  { value: "CORRECCIONES", label: "Corrección pendiente" },
  { value: "FINALIZADOS", label: "Finalizados" },
  { value: "ARCHIVADOS", label: "Archivados" },
  { value: "TODOS", label: "Todos" },
];

const ESTADOS_PROCESAMIENTO_EXTERNO = [
  "PENDIENTE",
  "EN_PROCESO",
  "COMPLETADO",
  "FALLIDO",
  "NO_APLICA",
];

const HERRAMIENTAS_PROCESAMIENTO_EXTERNO = [
  { value: "ALIENTECH_RECODE", label: "Alientech Recode" },
  { value: "KESS3", label: "KESS3" },
  { value: "STAGEX", label: "StageX" },
  { value: "OTRO", label: "Otro" },
];

const RESPONSABLES_FILE_SERVICE = [
  {
    campo: "tuner_asignado_a",
    campoId: "tuner_asignado_a_id",
    label: "Tuner / Master",
    roles: ["TUNER", "SUPERVISOR", "OWNER"],
  },
  {
    campo: "operador_ecu_asignado_a",
    campoId: "operador_ecu_asignado_a_id",
    label: "Operador ECU",
    roles: ["OPERADOR_ECU", "TUNER", "SUPERVISOR", "OWNER"],
  },
  {
    campo: "slave_asignado_a",
    campoId: "slave_asignado_a_id",
    label: "Slave / operador externo",
    roles: ["OPERADOR_ECU", "TUNER", "OWNER"],
  },
];

const PRIORIDADES_CORRECCION = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

const RESPONSABLES_CORRECCION = [
  { value: "", label: "Sin sugerencia" },
  { value: "OPERADOR_ECU", label: "Operador ECU" },
  { value: "TUNER", label: "Tuner / Master" },
  { value: "SUPERVISOR", label: "Supervisor" },
];

const SERVICIOS_FILE_SERVICE = [
  {
    grupo: "Performance",
    opciones: [
      { value: "STAGE_1", label: "Stage 1" },
      { value: "STAGE_2", label: "Stage 2" },
      { value: "STAGE_3", label: "Stage 3 / proyecto especial" },
      { value: "ECO_TUNE", label: "Eco Tune" },
      { value: "CUSTOM_TUNE", label: "Custom Tune" },
      { value: "TCU_STAGE", label: "TCU Stage" },
      { value: "TORQUE_LIMITER", label: "Torque limiter" },
      { value: "VMAX_OFF", label: "Vmax off" },
      { value: "LAUNCH_CONTROL", label: "Launch Control" },
      { value: "ANTILAG", label: "Antilag" },
      { value: "POPS_BANGS", label: "Pops & Bangs" },
      { value: "HARDCUT", label: "Hardcut" },
      { value: "POPCORN_DIESEL", label: "Popcorn / Hardcut diesel" },
    ],
  },
  {
    grupo: "Emisiones / uso sujeto a normativa aplicable",
    opciones: [
      { value: "DPF_OFF", label: "DPF off" },
      { value: "FAP_OFF", label: "FAP off" },
      { value: "EGR_OFF", label: "EGR off" },
      { value: "ADBLUE_SCR_OFF", label: "AdBlue / SCR off" },
      { value: "DEF_OFF", label: "DEF off" },
      { value: "NOX_OFF", label: "NOx off" },
      { value: "LAMBDA_OFF", label: "Lambda / O2 off" },
      { value: "TVA_OFF", label: "TVA off" },
      { value: "SWIRL_FLAPS_OFF", label: "Swirl flaps off" },
    ],
  },
  {
    grupo: "Diagnostico / electronica",
    opciones: [
      { value: "DTC_OFF", label: "DTC off" },
      { value: "IMMO_OFF", label: "IMMO off" },
      { value: "START_STOP_OFF", label: "Start/Stop off" },
      { value: "READINESS_CHECK", label: "Readiness check" },
      { value: "CHECKSUM", label: "Checksum" },
      { value: "CLONACION_ECU", label: "Clonacion ECU" },
      { value: "VIRGINIZAR_ECU", label: "Virginizar ECU" },
      { value: "BACKUP_ORIGINAL", label: "Backup original" },
      { value: "RESTAURAR_ORIGINAL", label: "Restaurar original" },
      { value: "OTRO", label: "Otro" },
      { value: "CUSTOM", label: "Custom" },
    ],
  },
];

const PRESETS_FILE_SERVICE = [
  { value: "DPF_EGR", label: "DPF + EGR", servicios: ["DPF_OFF", "EGR_OFF"] },
  {
    value: "ADBLUE_DPF_EGR",
    label: "AdBlue + DPF + EGR",
    servicios: ["ADBLUE_SCR_OFF", "DPF_OFF", "EGR_OFF"],
  },
  {
    value: "DPF_EGR_TVA",
    label: "DPF + EGR + TVA",
    servicios: ["DPF_OFF", "EGR_OFF", "TVA_OFF"],
  },
  { value: "EGR_DTC", label: "EGR + DTC", servicios: ["EGR_OFF", "DTC_OFF"] },
  {
    value: "DPF_EGR_DTC",
    label: "DPF + EGR + DTC",
    servicios: ["DPF_OFF", "EGR_OFF", "DTC_OFF"],
  },
  { value: "STAGE1_DTC", label: "Stage 1 + DTC", servicios: ["STAGE_1", "DTC_OFF"] },
  { value: "STAGE1_EGR", label: "Stage 1 + EGR", servicios: ["STAGE_1", "EGR_OFF"] },
  { value: "SOLO_DTC_OFF", label: "Solo DTC Off", servicios: ["DTC_OFF"] },
  { value: "SOLO_STAGE1", label: "Solo Stage 1", servicios: ["STAGE_1"] },
  { value: "CUSTOM", label: "Custom", servicios: ["CUSTOM"] },
];

const SERVICIO_LABELS = SERVICIOS_FILE_SERVICE.flatMap((grupo) => grupo.opciones).reduce(
  (acc, servicio) => ({ ...acc, [servicio.value]: servicio.label }),
  {}
);

const servicioLabel = (codigo) => SERVICIO_LABELS[codigo] || codigo;

const RUTA_DIAGNOSTICO = "/diagnosticos";

const getApiRoot = () => {
  const base = api.defaults.baseURL || "";
  return base.replace(/\/api\/?$/, "");
};

const fileUrl = (ruta) => {
  if (!ruta) return "#";
  if (/^https?:\/\//i.test(ruta)) return ruta;

  const root = getApiRoot();

  if (ruta.startsWith("/")) {
    return `${root}${ruta}`;
  }

  return `${root}/${ruta}`;
};

const formatearFecha = (fecha) => {
  if (!fecha) return "-";

  try {
    return new Date(fecha).toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return fecha;
  }
};

const limpiar = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const normalizarLista = (valor) => {
  if (Array.isArray(valor)) return valor;
  if (!valor) return [];
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

const normalizarAdvertenciasRespuesta = (data) => {
  const valores = [
    data?.advertencias,
    data?.advertencias_operativas,
    data?.warnings,
    data?.advertencia,
    data?.warning,
  ];

  const etiquetas = {
    KILOMETRAJE_PENDIENTE: "Falta kilometraje",
    SINTOMAS_PENDIENTES: "Faltan síntomas del cliente",
    MONTO_PENDIENTE: "Falta monto",
    DETALLES_PENDIENTES: "Faltan detalles del trabajo",
    FOTOS_PENDIENTES: "Faltan fotos de ingreso",
    RESPONSABLE_PENDIENTE: "Falta asignar encargado",
    DIAGNOSTICO_PENDIENTE: "Falta diagnóstico",
    AUDITORIA_OPERATIVA_PENDIENTE:
      "Trabajo guardado; quedó pendiente registrar parte de la auditoría",
    NOTIFICACION_INTERNA_PENDIENTE:
      "Trabajo guardado; quedó pendiente una notificación interna",
  };

  return valores
    .flatMap((valor) => (Array.isArray(valor) ? valor : valor ? [valor] : []))
    .map((valor) => {
      const texto =
        typeof valor === "string"
          ? valor
          : valor?.message || valor?.mensaje || valor?.detalle || "";
      return etiquetas[String(texto).trim().toUpperCase()] || texto;
    })
    .filter(Boolean);
};

const resumenDtcSnapshot = (dtcs = []) =>
  normalizarLista(dtcs)
    .map((item) => item?.codigo || item)
    .filter(Boolean)
    .join(", ");

const badgeClass = (estado) => {
  return getStatusColor(estado || "SIN_ESTADO", "dark");
};

const minutosDesde = (fecha) => {
  if (!fecha) return 0;
  const inicio = new Date(fecha);
  if (Number.isNaN(inicio.getTime())) return 0;
  return Math.max(0, Math.round((Date.now() - inicio.getTime()) / 60000));
};

const formatearDuracionMinutos = (minutos) => {
  if (!minutos || minutos < 1) return "Menos de 1 min";
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas}h ${resto}m` : `${horas}h`;
};

const processGuardClass = (estado) => {
  const valor = String(estado || "").toUpperCase();
  if (valor === "CERRADO") {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-100";
  }
  if (valor === "CRITICO" || valor === "ESCALADO") {
    return "border-red-500/60 bg-red-500/20 text-red-100";
  }
  if (valor === "ADVERTENCIA" || valor === "EN_ESPERA_POST_ESCRITURA") {
    return "border-yellow-500/50 bg-yellow-500/15 text-yellow-100";
  }
  if (valor === "REQUIERE_NUEVA_LECTURA") {
    return "border-purple-500/50 bg-purple-500/15 text-purple-100";
  }
  return "border-blue-500/40 bg-blue-500/15 text-blue-100";
};

const processGuardLabel = (estado) => {
  const valor = String(estado || "SIN_RIESGO").toUpperCase();
  const labels = {
    SIN_RIESGO: "Sin riesgo",
    EN_ESPERA_POST_ESCRITURA: "Falta prueba final",
    ADVERTENCIA: "Requiere atención",
    CRITICO: "Atención urgente",
    ESCALADO: "Atención urgente escalada",
    CERRADO: "Cerrado",
  };
  return labels[valor] || valor;
};

const procesoGuardInicio = (archivo) =>
  archivo.mod_descargado_at ||
  archivo.proceso_guard_started_at ||
  archivo.post_escritura_at ||
  archivo.updatedAt ||
  archivo.createdAt;

const procesoTecnicoAbierto = (archivo) => {
  const estado = String(archivo.estado || "").toUpperCase();
  const guard = String(archivo.proceso_guard_estado || "").toUpperCase();
  return (
    archivo.archivo_modificado &&
    !archivo.archivado &&
    !archivo.cierre_tecnico_at &&
    !["FINALIZADO_TECNICO", "FINALIZADO", "ARCHIVADO"].includes(estado) &&
    guard !== "CERRADO"
  );
};

const estadoLabel = (estado) => {
  return ESTADOS[estado] || getOperationalStatusLabel(estado) || "Sin estado";
};

const obtenerResponsablePrincipal = (archivo) => {
  return (
    archivo.tuner_asignado_a ||
    archivo.operador_ecu_asignado_a ||
    archivo.slave_asignado_a ||
    "Sin responsable"
  );
};

const snapshotUsuario = (usuario) =>
  limpiar(usuario?.username || usuario?.nombre || usuario?.id);

const ROLES_CIERRE_TECNICO_LEGACY = ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"];

const usuarioPuedeCerrarLegacy = () =>
  ROLES_CIERRE_TECNICO_LEGACY.includes(
    String(localStorage.getItem("rol") || "").toUpperCase()
  );

const requiereModParaCierre = (archivo) => {
  const estado = String(archivo?.estado || "").toUpperCase();
  const servicios = normalizarLista(archivo?.servicios_solicitados)
    .map((servicio) => String(servicio?.value || servicio || "").toUpperCase());
  const valoresServicio = [
    archivo?.tipo_servicio,
    archivo?.servicio_principal,
    ...servicios,
  ]
    .map((valor) => String(valor || "").toUpperCase())
    .filter(Boolean);

  if (archivo?.archivo_modificado) return true;
  if (["MODIFICADO_LISTO", "NOTIFICADO_SLAVE"].includes(estado)) {
    return true;
  }

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

const checklistCierreTecnico = (archivo, cierreForm = {}, opciones = {}) => {
  const postEstado = String(archivo?.post_escritura_estado || "").toUpperCase();
  const postNoAplica =
    postEstado === "NO_APLICA" && limpiar(archivo?.post_escritura_observacion);
  const responsableIdOk = Boolean(
    limpiar(archivo?.tuner_asignado_a_id) ||
      limpiar(archivo?.operador_ecu_asignado_a_id) ||
      limpiar(archivo?.slave_asignado_a_id)
  );
  const responsableTextoOk = Boolean(
    limpiar(archivo?.tuner_asignado_a) ||
      limpiar(archivo?.operador_ecu_asignado_a) ||
      limpiar(archivo?.slave_asignado_a)
  );
  const cierreLegacyAutorizado =
    opciones.permitirLegacySinResponsable === true &&
    !responsableIdOk &&
    !responsableTextoOk;
  const responsableOk = Boolean(
    responsableIdOk || responsableTextoOk || cierreLegacyAutorizado
  );
  const modRequerido = requiereModParaCierre(archivo);

  return [
    {
      key: "original",
      label: "Archivo original",
      ok: Boolean(archivo?.archivo_original),
    },
    {
      key: "servicios",
      label: "Servicios solicitados",
      ok:
        normalizarLista(archivo?.servicios_solicitados).length > 0 ||
        Boolean(limpiar(archivo?.tipo_servicio)),
    },
    {
      key: "responsable",
      label: "Responsable asignado",
      ok: responsableOk,
    },
    {
      key: "mod",
      label: modRequerido ? "MOD cargado" : "MOD no aplica",
      ok: !modRequerido || Boolean(archivo?.archivo_modificado),
    },
    {
      key: "post",
      label: "Prueba final completada / No aplica",
      ok: postEstado === "OK" || postNoAplica,
    },
    {
      key: "dtc",
      label: "DTC final revisado",
      ok:
        Boolean(postNoAplica) ||
        Boolean(limpiar(archivo?.post_escritura_dtc) || archivo?.post_escritura_sin_dtc),
    },
    {
      key: "observacion",
      label: "Observacion final",
      ok: Boolean(limpiar(cierreForm.observacion_cierre_tecnico)),
    },
    {
      key: "cierre",
      label: "Trabajo técnico terminado",
      ok: Boolean(archivo?.cierre_tecnico_at),
    },
  ];
};

const obtenerProximaAccion = (archivo) => {
  if (archivo.archivado || archivo.estado === "ARCHIVADO") return "Archivado";
  if (archivo.estado === "FINALIZADO_TECNICO" || archivo.estado === "FINALIZADO") {
    return "Trabajo técnico finalizado";
  }
  if (archivo.estado === "REQUIERE_CORRECCION" || archivo.correccion_pendiente) {
    return "Resolver corrección";
  }
  if (!archivo.archivo_original) return "Subir archivo original";
  if (archivo.post_escritura_estado === "OK" && !archivo.cierre_tecnico_at) {
    return "Terminar trabajo técnico";
  }
  if (archivo.post_escritura_estado === "OK") return "Dejar listo para entrega";
  if (archivo.archivo_modificado && archivo.estado === "MODIFICADO_LISTO") {
    return "Notificar operador ECU";
  }
  if (["NOTIFICADO_SLAVE", "POST_ESCRITURA_PENDIENTE"].includes(archivo.estado)) {
    return "Registrar prueba final";
  }
  if (
    archivo.procesamiento_externo_estado &&
    !["COMPLETADO", "NO_APLICA"].includes(archivo.procesamiento_externo_estado)
  ) {
    return "Procesar archivo externo";
  }
  if (archivo.estado === "ORIGINAL_CARGADO" || archivo.estado === "NOTIFICADO_MASTER") {
    return archivo.tuner_asignado_a ? "Subir MOD" : "Asignar o avisar Master";
  }

  return "Revisar siguiente etapa";
};

const obtenerClienteVehiculo = (archivo) => {
  const orden = archivo?.OrdenTrabajo;
  const vehiculo = orden?.Vehiculo;
  const cliente = vehiculo?.Cliente;

  return {
    orden,
    vehiculo,
    cliente,
    textoCliente: cliente?.nombre || "Cliente no informado",
    textoVehiculo: vehiculo
      ? `${vehiculo.patente || "Sin patente"} · ${vehiculo.marca || ""} ${
          vehiculo.modelo || ""
        } ${vehiculo.anio || ""}`.trim()
      : "Vehículo no informado",
  };
};

export default function ArchivosECUPage() {
  const rolUsuario = String(localStorage.getItem("rol") || "").toUpperCase();
  const puedeUrgentePorAsignar = ["OWNER", "ADMIN", "SUPERVISOR"].includes(
    rolUsuario
  );
  const [searchParams] = useSearchParams();
  const archivoIdQuery = searchParams.get("archivoId");
  const ordenIdQuery = searchParams.get("ordenId");
  const vehiculoIdQuery = searchParams.get("vehiculoId");
  const [archivos, setArchivos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [advertencia, setAdvertencia] = useState("");
  const [bloqueoDiagnostico, setBloqueoDiagnostico] = useState(null);
  const [contextoSolicitud, setContextoSolicitud] = useState(null);
  const [cargandoContexto, setCargandoContexto] = useState(false);

  const [filtro, setFiltro] = useState("PENDIENTES");
  const [busqueda, setBusqueda] = useState("");
  const [archivoSeleccionadoId, setArchivoSeleccionadoId] = useState("");
  const [modoUrgenteNuevo, setModoUrgenteNuevo] = useState(false);

  const [nuevo, setNuevo] = useState({
    ordenId: "",
    prioridad: "MEDIA",
    tipo_servicio: "",
    servicios_solicitados: [],
    servicios_preset: "",
    servicio_principal: "",
    observacion_servicios: "",
    motivo_urgencia: "",
    diagnosticoId: "",
    dtc_snapshot: [],
    dtc_resumen: "",
    metodo_lectura: "",
    herramienta_lectura: "",
    marca_ecu: "",
    modelo_ecu: "",
    hw: "",
    sw: "",
    version_software: "",
    notas_operador: "",
    instrucciones_tuner: "",
    observaciones: "",
    tuner_asignado_a_id: "",
    tuner_asignado_a: "",
    operador_ecu_asignado_a_id: "",
    operador_ecu_asignado_a: "",
    slave_asignado_a_id: "",
    slave_asignado_a: "",
    override_guardia: false,
    motivo_override: "",
    archivo: null,
  });

  const [modForms, setModForms] = useState({});
  const [procesamientoForms, setProcesamientoForms] = useState({});
  const [postForms, setPostForms] = useState({});
  const [correccionForms, setCorreccionForms] = useState({});
  const [archivarForms, setArchivarForms] = useState({});
  const [cierreTecnicoForms, setCierreTecnicoForms] = useState({});

  const obtenerDatos = useCallback(async () => {
    const [archivosRes, ordenesRes, usuariosRes] = await Promise.allSettled([
      api.get("/archivos-ecu"),
      api.get("/ordenes"),
      api.get("/usuarios/responsables"),
    ]);

    if (archivosRes.status !== "fulfilled") {
      throw archivosRes.reason;
    }

    const archivosData = archivosRes.value.data;

    let ordenesData = [];
    let usuariosData = [];

    if (ordenesRes.status === "fulfilled") {
      ordenesData = ordenesRes.value.data;
    } else {
      console.warn("No se pudieron cargar órdenes:", ordenesRes.reason);
    }

    if (usuariosRes.status === "fulfilled") {
      usuariosData = usuariosRes.value.data;
    } else {
      console.warn("No se pudieron cargar usuarios:", usuariosRes.reason);
    }

    return {
      archivos: Array.isArray(archivosData)
        ? archivosData
        : archivosData.archivos || [],
      ordenes: Array.isArray(ordenesData)
        ? ordenesData
        : ordenesData.ordenes || [],
      usuarios: Array.isArray(usuariosData)
        ? usuariosData
        : usuariosData.usuarios || [],
    };
  }, []);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await obtenerDatos();

      setArchivos(data.archivos);
      setOrdenes(data.ordenes);
      setUsuarios(data.usuarios);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Error cargando archivos ECU"
      );
    } finally {
      setLoading(false);
    }
  }, [obtenerDatos]);

  useEffect(() => {
    let activo = true;

    const iniciarCarga = async () => {
      try {
        const data = await obtenerDatos();

        if (!activo) return;

        setArchivos(data.archivos);
        setOrdenes(data.ordenes);
        setUsuarios(data.usuarios);
      } catch (err) {
        if (!activo) return;

        console.error(err);
        setError(
          err.response?.data?.error ||
            err.message ||
            "Error cargando archivos ECU"
        );
      } finally {
        if (activo) {
          setLoading(false);
        }
      }
    };

    iniciarCarga();

    return () => {
      activo = false;
    };
  }, [obtenerDatos]);

  const archivosFiltrados = useMemo(() => {
    const term = busqueda.toLowerCase().trim();

    return archivos.filter((archivo) => {
      const { textoCliente, textoVehiculo } = obtenerClienteVehiculo(archivo);

      const matchTexto =
        !term ||
        [
          archivo.id,
          archivo.ordenId,
          archivo.estado,
          archivo.tipo_servicio,
          normalizarLista(archivo.servicios_solicitados).join(" "),
          resumenDtcSnapshot(archivo.dtc_snapshot),
          archivo.metodo_lectura,
          archivo.herramienta_lectura,
          archivo.marca_ecu,
          archivo.modelo_ecu,
          archivo.hw,
          archivo.sw,
          textoCliente,
          textoVehiculo,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);

      if (!matchTexto) return false;

      if (filtro === "TODOS") return true;

      if (filtro === "PENDIENTES") {
        return (
          !archivo.archivado &&
          ["ORIGINAL_CARGADO", "NOTIFICADO_MASTER"].includes(archivo.estado)
        );
      }

      if (filtro === "EN_PROCESO") {
        return (
          !archivo.archivado &&
          ![
            "MODIFICADO_LISTO",
            "NOTIFICADO_SLAVE",
            "POST_ESCRITURA_PENDIENTE",
            "REQUIERE_CORRECCION",
            "FINALIZADO",
            "FINALIZADO_TECNICO",
            "ARCHIVADO",
          ].includes(archivo.estado)
        );
      }

      if (filtro === "MOD_LISTO") {
        return ["MODIFICADO_LISTO", "NOTIFICADO_SLAVE"].includes(
          archivo.estado
        );
      }

      if (filtro === "PENDIENTE_POST") {
        return [
          "MODIFICADO_LISTO",
          "NOTIFICADO_SLAVE",
          "POST_ESCRITURA_PENDIENTE",
        ].includes(archivo.estado);
      }

      if (filtro === "CORRECCIONES") {
        return archivo.estado === "REQUIERE_CORRECCION" || archivo.correccion_pendiente;
      }

      if (filtro === "FINALIZADOS") {
        return ["POST_ESCRITURA_OK", "FINALIZADO", "FINALIZADO_TECNICO"].includes(
          archivo.estado
        );
      }

      if (filtro === "ARCHIVADOS") {
        return archivo.archivado || archivo.estado === "ARCHIVADO";
      }

      return true;
    });
  }, [archivos, filtro, busqueda]);

  const archivoSeleccionado = useMemo(
    () =>
      archivosFiltrados.find(
        (archivo) => String(archivo.id) === String(archivoSeleccionadoId)
      ) || null,
    [archivosFiltrados, archivoSeleccionadoId]
  );

  useEffect(() => {
    if (archivoIdQuery || ordenIdQuery || vehiculoIdQuery) {
      setFiltro("TODOS");
    }

    const encontrado = archivosFiltrados.find((archivo) => {
      const vehiculo = archivo?.OrdenTrabajo?.Vehiculo;

      return (
        (archivoIdQuery && String(archivo.id) === String(archivoIdQuery)) ||
        (ordenIdQuery && String(archivo.ordenId) === String(ordenIdQuery)) ||
        (vehiculoIdQuery &&
          vehiculo?.id &&
          String(vehiculo.id) === String(vehiculoIdQuery))
      );
    });

    if (encontrado) {
      setArchivoSeleccionadoId(String(encontrado.id));
    }
  }, [archivosFiltrados, archivoIdQuery, ordenIdQuery, vehiculoIdQuery]);

  const usuariosPorRoles = useCallback(
    (roles) =>
      usuarios.filter(
        (usuario) =>
          usuario &&
          usuario.activo !== false &&
          roles.includes(usuario.rol)
      ),
    [usuarios]
  );

  const buscarUsuarioPorId = useCallback(
    (usuarioId) =>
      usuarios.find((usuario) => String(usuario.id) === String(usuarioId)) ||
      null,
    [usuarios]
  );

  const actualizarResponsableNuevo = (responsable, usuarioId) => {
    const usuario = buscarUsuarioPorId(usuarioId);

    setNuevo((prev) => ({
      ...prev,
      [responsable.campoId]: usuario?.id || "",
      [responsable.campo]: usuario ? snapshotUsuario(usuario) : "",
      override_guardia: false,
      motivo_override: "",
    }));
  };

  const mostrarError = (err, fallback = "Error inesperado") => {
    console.error(err);

    const data = err.response?.data;
    const codigo = String(data?.error || data?.codigo || "").toUpperCase();

    if (data?.bloqueo === "DIAGNOSTICO_OBLIGATORIO") {
      setBloqueoDiagnostico(data);
      if (modoUrgenteNuevo) {
        setError("");
        setAdvertencia(
          data.message ||
            "No se pudo guardar la urgencia. El diagnóstico quedó señalado como pendiente; revisa los faltantes e intenta nuevamente."
        );
        return;
      }
      setError(
        data.message ||
          "Falta diagnóstico antes de crear el trabajo de archivos ECU. Completa ese paso para continuar."
      );
      return;
    }

    if (codigo === "RESPONSABLE_BLOQUEADO") {
      const detalle = normalizarLista(data.pendientes_criticos)
        .slice(0, 3)
        .map((item) => item.titulo || item.tipo || item.descripcion)
        .filter(Boolean)
        .join(" / ");
      setError(
        `${data.message || "Este encargado tiene pendientes urgentes. Elige otro o resuelve sus pendientes."}${
          detalle ? ` Pendientes: ${detalle}` : ""
        }`
      );
      return;
    }

    if (codigo === "RESPONSABLE_REQUERIDO") {
      setError("Falta seleccionar encargado. Elige quién se hará cargo para continuar.");
      return;
    }

    if (codigo === "RESPONSABLE_INVALIDO") {
      setError("El encargado seleccionado no está activo. Elige otra persona.");
      return;
    }

    if (codigo.includes("ARCHIVO") && codigo.includes("INVALID")) {
      setError("Archivo inválido. Usa un formato permitido como .bin, .ori, .zip o .rar.");
      return;
    }

    if (codigo.includes("POST_ESCRITURA") || codigo.includes("CIERRE_TECNICO")) {
      setError("Falta la prueba final antes de terminar el trabajo técnico.");
      return;
    }

    if (Array.isArray(data?.faltantes) && data.faltantes.length > 0) {
      setError(
        `${data.message || fallback}: ${data.faltantes.join(", ")}`
      );
      return;
    }

    setError(data?.message || err.message || fallback);
  };

  const limpiarMensajes = () => {
    setMensaje("");
    setError("");
    setAdvertencia("");
    setBloqueoDiagnostico(null);
  };

  const cargarContextoSolicitud = async (ordenId) => {
    if (!ordenId) {
      setContextoSolicitud(null);
      setNuevo((prev) => ({
        ...prev,
        diagnosticoId: "",
        dtc_snapshot: [],
        dtc_resumen: "",
      }));
      return;
    }

    try {
      setCargandoContexto(true);
      const res = await api.get(`/archivos-ecu/contexto-solicitud/${ordenId}`);
      const contexto = res.data || {};
      const dtcs = normalizarLista(contexto.dtcs_activos);

      setContextoSolicitud(contexto);
      setNuevo((prev) => ({
        ...prev,
        diagnosticoId: contexto.diagnostico?.id || "",
        dtc_snapshot: dtcs,
        dtc_resumen: contexto.dtc_resumen || resumenDtcSnapshot(dtcs),
      }));
    } catch (err) {
      console.warn("No se pudo cargar contexto File Service:", err.response?.data || err.message);
      setContextoSolicitud(null);
      setNuevo((prev) => ({
        ...prev,
        diagnosticoId: "",
        dtc_snapshot: [],
        dtc_resumen: "",
      }));
    } finally {
      setCargandoContexto(false);
    }
  };

  const seleccionarOrdenSolicitud = (ordenId) => {
    setNuevo((prev) => ({
      ...prev,
      ordenId,
      diagnosticoId: "",
      dtc_snapshot: [],
      dtc_resumen: "",
    }));
    cargarContextoSolicitud(ordenId);
  };

  const toggleServicioSolicitado = (codigo) => {
    setNuevo((prev) => {
      const actual = normalizarLista(prev.servicios_solicitados);
      const existe = actual.includes(codigo);
      const siguientes = existe
        ? actual.filter((servicio) => servicio !== codigo)
        : [...actual, codigo];

      return {
        ...prev,
        servicios_solicitados: siguientes,
        servicios_preset: "",
        servicio_principal: siguientes[0] || "",
        tipo_servicio: siguientes[0] || "",
      };
    });
  };

  const aplicarPresetServicios = (preset) => {
    setNuevo((prev) => ({
      ...prev,
      servicios_solicitados: preset.servicios,
      servicios_preset: preset.value,
      servicio_principal: preset.servicios[0] || preset.value,
      tipo_servicio: preset.servicios[0] || preset.value,
    }));
  };

  const crearArchivo = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!nuevo.ordenId) {
      setError("Debes seleccionar una orden");
      return;
    }

    const serviciosSeleccionados = normalizarLista(nuevo.servicios_solicitados);
    const tipoServicio = limpiar(
      nuevo.servicio_principal || serviciosSeleccionados[0] || nuevo.tipo_servicio
    );

    if (!serviciosSeleccionados.length) {
      setError("Falta seleccionar al menos un servicio para el trabajo de archivos ECU.");
      return;
    }

    if (modoUrgenteNuevo && !limpiar(nuevo.motivo_urgencia)) {
      setError("Falta indicar el motivo de la urgencia antes de enviar.");
      return;
    }

    if (
      serviciosSeleccionados.some((servicio) =>
        ["CUSTOM", "OTRO"].includes(String(servicio).toUpperCase())
      ) &&
      !limpiar(nuevo.observacion_servicios)
    ) {
      setError("Describe qué trabajo especial se necesita antes de continuar.");
      return;
    }

    const tieneTunerUOperador = Boolean(
      nuevo.tuner_asignado_a_id || nuevo.operador_ecu_asignado_a_id
    );
    const tieneResponsableUrgente = Boolean(
      tieneTunerUOperador || nuevo.slave_asignado_a_id
    );

    if (
      (!modoUrgenteNuevo && !tieneTunerUOperador) ||
      (modoUrgenteNuevo &&
        !tieneResponsableUrgente &&
        !puedeUrgentePorAsignar)
    ) {
      setError(
        modoUrgenteNuevo
          ? "Debes asignar un encargado activo o pedir a jefatura dejarlo por asignar."
          : "Debes asignar Tuner/Master u Operador ECU activo."
      );
      return;
    }

    if (
      modoUrgenteNuevo &&
      puedeUrgentePorAsignar &&
      nuevo.override_guardia &&
      !limpiar(nuevo.motivo_override)
    ) {
      setError("Debes justificar el override de guardia.");
      return;
    }

    if (!nuevo.archivo) {
      setError("Debes cargar el archivo original");
      return;
    }

    try {
      setGuardando(true);

      const diagnosticoPendiente = !nuevo.diagnosticoId;
      if (modoUrgenteNuevo && diagnosticoPendiente) {
        setAdvertencia(
          "Diagnóstico pendiente. Se intentará guardar como urgente y deberá regularizarse antes de la prueba final."
        );
      }

      const fd = new FormData();

      Object.entries(nuevo).forEach(([key, value]) => {
        if (key === "archivo") return;
        if (key === "tipo_servicio") {
          fd.append(key, tipoServicio);
          return;
        }
        if (key === "servicios_solicitados" || key === "dtc_snapshot") {
          fd.append(key, JSON.stringify(normalizarLista(value)));
          return;
        }
        fd.append(key, value ?? "");
      });

      fd.set("tipo_servicio", tipoServicio);
      fd.set("servicio_principal", tipoServicio);
      fd.set("dtc_resumen", nuevo.dtc_resumen || resumenDtcSnapshot(nuevo.dtc_snapshot));
      fd.set("modo_urgente", String(modoUrgenteNuevo));
      fd.set("motivo_urgencia", modoUrgenteNuevo ? nuevo.motivo_urgencia : "");

      fd.append("archivo", nuevo.archivo);

      const res = await api.post("/archivos-ecu", fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMensaje("Archivo original guardado. El trabajo de archivos ECU fue creado.");
      const advertenciasBackend = normalizarAdvertenciasRespuesta(res.data);
      if (advertenciasBackend.length > 0) {
        setAdvertencia(advertenciasBackend.join(" · "));
      } else if (modoUrgenteNuevo && diagnosticoPendiente) {
        setAdvertencia(
          "Trabajo urgente creado con diagnóstico pendiente. Regularízalo antes de registrar la prueba final."
        );
      }

      setNuevo({
        ordenId: "",
        prioridad: "MEDIA",
        tipo_servicio: "",
        servicios_solicitados: [],
        servicios_preset: "",
        servicio_principal: "",
        observacion_servicios: "",
        motivo_urgencia: "",
        diagnosticoId: "",
        dtc_snapshot: [],
        dtc_resumen: "",
        metodo_lectura: "",
        herramienta_lectura: "",
        marca_ecu: "",
        modelo_ecu: "",
        hw: "",
        sw: "",
        version_software: "",
        notas_operador: "",
        instrucciones_tuner: "",
        observaciones: "",
        tuner_asignado_a_id: "",
        tuner_asignado_a: "",
        operador_ecu_asignado_a_id: "",
        operador_ecu_asignado_a: "",
        slave_asignado_a_id: "",
        slave_asignado_a: "",
        override_guardia: false,
        motivo_override: "",
        archivo: null,
      });
      setModoUrgenteNuevo(false);

      e.target.reset();

      await cargarDatos();
    } catch (err) {
      mostrarError(err, "No se pudo crear el trabajo. Revisa el archivo, el diagnóstico y el encargado.");
    } finally {
      setGuardando(false);
    }
  };

  const actualizarModForm = (archivoId, campo, valor) => {
    setModForms((prev) => ({
      ...prev,
      [archivoId]: {
        ...(prev[archivoId] || {}),
        [campo]: valor,
      },
    }));
  };

  const actualizarProcesamientoForm = (archivoId, campo, valor) => {
    setProcesamientoForms((prev) => ({
      ...prev,
      [archivoId]: {
        procesamiento_externo_estado: "EN_PROCESO",
        procesamiento_externo_herramienta: "OTRO",
        procesamiento_externo_observacion: "",
        archivo_resultado: null,
        ...(prev[archivoId] || {}),
        [campo]: valor,
      },
    }));
  };

  const actualizarPostForm = (archivoId, campo, valor) => {
    setPostForms((prev) => ({
      ...prev,
      [archivoId]: {
        post_escritura_estado: "OK",
        post_escritura_sin_dtc: false,
        post_escritura_dtc: "",
        post_escritura_observacion: "",
        scanner_post_escritura: null,
        ...(prev[archivoId] || {}),
        [campo]: valor,
      },
    }));
  };

  const actualizarCierreTecnicoForm = (archivoId, campo, valor) => {
    setCierreTecnicoForms((prev) => ({
      ...prev,
      [archivoId]: {
        resultado_tecnico: "OK",
        observacion_cierre_tecnico: "",
        ...(prev[archivoId] || {}),
        [campo]: valor,
      },
    }));
  };

  const actualizarCorreccionForm = (archivoId, campo, valor) => {
    setCorreccionForms((prev) => ({
      ...prev,
      [archivoId]: {
        motivo: "Postventa técnica File Service",
        descripcion: "",
        dtc: "",
        sintoma_cliente: "",
        prioridad: "MEDIA",
        responsable_sugerido: "OPERADOR_ECU",
        comentario_tecnico: "",
        cliente_volvio: false,
        ...(prev[archivoId] || {}),
        [campo]: valor,
      },
    }));
  };

  const actualizarArchivarForm = (archivoId, campo, valor) => {
    setArchivarForms((prev) => ({
      ...prev,
      [archivoId]: {
        archivado_motivo: "",
        archivado_comentario: "",
        ...(prev[archivoId] || {}),
        [campo]: valor,
      },
    }));
  };

  const registrarCorreccionPostventa = async (archivo) => {
    limpiarMensajes();

    if (!archivo.ordenId) {
      setError("Este trabajo no tiene una orden asociada para registrar la corrección.");
      return;
    }

    const form = {
      motivo: "Postventa técnica File Service",
      descripcion: "",
      dtc: "",
      sintoma_cliente: "",
      prioridad: "MEDIA",
      responsable_sugerido: "OPERADOR_ECU",
      comentario_tecnico: "",
      cliente_volvio: false,
      ...(correccionForms[archivo.id] || {}),
    };

    if (
      !limpiar(form.motivo) &&
      !limpiar(form.descripcion) &&
      !limpiar(form.sintoma_cliente) &&
      !limpiar(form.comentario_tecnico)
    ) {
      setError("Debes indicar motivo, descripción, síntoma o comentario técnico.");
      return;
    }

    try {
      await api.post(`/ordenes/${archivo.ordenId}/correccion-tecnica`, {
        ...form,
        archivo_ecu_id: archivo.id,
      });
      setContextoSolicitud(null);

      setMensaje("Postventa técnica registrada y notificada internamente");
      setCorreccionForms((prev) => ({
        ...prev,
        [archivo.id]: {},
      }));
      await cargarDatos();
    } catch (err) {
      mostrarError(err, "Error registrando postventa técnica");
    }
  };

  const asignarResponsableFileService = async (archivo, responsable, usuarioId) => {
    limpiarMensajes();
    const usuario = buscarUsuarioPorId(usuarioId);
    let extraInicial = {};

    if (!usuario && archivo.creado_en_modo_urgente === true) {
      const conservaOtroEncargado = RESPONSABLES_FILE_SERVICE.some(
        (item) =>
          item.campoId !== responsable.campoId &&
          Boolean(limpiar(archivo[item.campoId]))
      );

      if (!conservaOtroEncargado) {
        if (!puedeUrgentePorAsignar) {
          setError("Solo jefatura puede dejar una urgencia por asignar.");
          return;
        }

        const motivo = limpiar(
          window.prompt(
            "Motivo obligatorio para dejar este File Service urgente por asignar:"
          )
        );
        if (!motivo) {
          setError("No se quitó el encargado: debes indicar un motivo.");
          return;
        }
        extraInicial = { motivo_override: motivo };
      }
    }

    try {
      const ejecutarAsignacion = (extra = {}) =>
        api.patch(`/archivos-ecu/${archivo.id}`, {
          [responsable.campoId]: usuario?.id || "",
          [responsable.campo]: usuario ? snapshotUsuario(usuario) : "",
          ...extra,
        });

      try {
        await ejecutarAsignacion(extraInicial);
      } catch (errorInicial) {
        const data = errorInicial.response?.data || {};
        const codigo = String(data.error || data.codigo || "").toUpperCase();
        if (
          codigo !== "RESPONSABLE_BLOQUEADO" ||
          archivo.creado_en_modo_urgente !== true ||
          !puedeUrgentePorAsignar ||
          !usuario
        ) {
          throw errorInicial;
        }

        const confirmar = window.confirm(
          `${data.message || "Este encargado tiene pendientes críticos."}\n\n¿Asignarlo de todas formas a esta urgencia?`
        );
        if (!confirmar) return;

        const motivo = limpiar(
          window.prompt("Escribe el motivo obligatorio para dejar trazabilidad:")
        );
        if (!motivo) {
          setError("No se aplicó el override: debes escribir un motivo.");
          return;
        }

        await ejecutarAsignacion({
          override_guardia: true,
          motivo_override: motivo,
        });
      }

      setMensaje("Encargado actualizado correctamente.");
      await cargarDatos();
    } catch (err) {
      mostrarError(err, "No se pudo asignar el encargado. Elige una persona activa.");
    }
  };

  const registrarProcesamientoExterno = async (archivoId) => {
    limpiarMensajes();

    const form = {
      procesamiento_externo_estado: "EN_PROCESO",
      procesamiento_externo_herramienta: "OTRO",
      procesamiento_externo_observacion: "",
      archivo_resultado: null,
      ...(procesamientoForms[archivoId] || {}),
    };

    try {
      const fd = new FormData();

      fd.append(
        "procesamiento_externo_estado",
        form.procesamiento_externo_estado || "EN_PROCESO"
      );
      fd.append(
        "procesamiento_externo_herramienta",
        form.procesamiento_externo_herramienta || "OTRO"
      );
      fd.append(
        "procesamiento_externo_observacion",
        form.procesamiento_externo_observacion || ""
      );

      if (form.archivo_resultado) {
        fd.append("archivo_resultado", form.archivo_resultado);
      }

      await api.post(`/archivos-ecu/${archivoId}/procesamiento-externo`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMensaje("Procesamiento externo registrado correctamente");

      setProcesamientoForms((prev) => ({
        ...prev,
        [archivoId]: {},
      }));

      await cargarDatos();
    } catch (err) {
      mostrarError(err, "Error registrando procesamiento externo");
    }
  };

  const subirModificado = async (archivoId) => {
    limpiarMensajes();

    const form = modForms[archivoId] || {};

    if (!form.archivo) {
      setError("Debes seleccionar un archivo modificado");
      return;
    }

    try {
      const fd = new FormData();

      fd.append("archivo", form.archivo);
      fd.append("instrucciones_tuner", form.instrucciones_tuner || "");
      fd.append("observaciones", form.observaciones || "");
      fd.append("es_final", form.es_final ? "true" : "false");

      await api.post(`/archivos-ecu/${archivoId}/modificado`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMensaje("MOD cargado correctamente");

      setModForms((prev) => ({
        ...prev,
        [archivoId]: {},
      }));

      await cargarDatos();
    } catch (err) {
      mostrarError(err, "Error subiendo archivo modificado");
    }
  };

  const notificarMaster = async (archivo) => {
    limpiarMensajes();

    try {
      await api.post(`/archivos-ecu/${archivo.id}/notificar-master`);

      const { textoCliente, textoVehiculo } = obtenerClienteVehiculo(archivo);

      const mensajeWhatsApp = encodeURIComponent(
        `Hola Master, se cargó un archivo original en File Service.\n\n` +
          `ID File Service: ${archivo.id}\n` +
          `Orden: ${archivo.ordenId}\n` +
          `Cliente: ${textoCliente}\n` +
          `Vehículo: ${textoVehiculo}\n` +
          `Servicio: ${archivo.tipo_servicio || "-"}\n\n` +
          `Favor revisar en el portal GMTCH.`
      );

      window.open(`https://wa.me/56962267642?text=${mensajeWhatsApp}`, "_blank");

      setMensaje("Master notificado correctamente");
      await cargarDatos();
    } catch (err) {
      mostrarError(err, "Error notificando Master");
    }
  };

  const notificarSlave = async (archivo) => {
    limpiarMensajes();

    if (!archivo.archivo_modificado) {
      setError("No puedes notificar al Slave sin MOD cargado");
      return;
    }

    try {
      await api.post(`/archivos-ecu/${archivo.id}/notificar-slave`);

      const { textoCliente, textoVehiculo } = obtenerClienteVehiculo(archivo);

      const mensajeWhatsApp = encodeURIComponent(
        `Hola, el MOD está listo para escritura.\n\n` +
          `ID File Service: ${archivo.id}\n` +
          `Orden: ${archivo.ordenId}\n` +
          `Cliente: ${textoCliente}\n` +
          `Vehículo: ${textoVehiculo}\n` +
          `Servicio: ${archivo.tipo_servicio || "-"}\n` +
          `Última versión: MOD V${archivo.ultima_version_modificada || 1}\n\n` +
          `IMPORTANTE: Después de escribir, debes registrar scanner post escritura y DTC en el portal.`
      );

      window.open(`https://wa.me/56962267642?text=${mensajeWhatsApp}`, "_blank");

      setMensaje("Slave / Operador ECU notificado correctamente");
      await cargarDatos();
    } catch (err) {
      mostrarError(err, "Error notificando Slave");
    }
  };

  const registrarPostEscritura = async (archivoId) => {
    limpiarMensajes();

    const form = {
      post_escritura_estado: "OK",
      post_escritura_sin_dtc: false,
      post_escritura_dtc: "",
      post_escritura_observacion: "",
      scanner_post_escritura: null,
      ...(postForms[archivoId] || {}),
    };

    if (form.post_escritura_estado !== "NO_APLICA" && !form.scanner_post_escritura) {
      setError("Falta la foto o captura del scanner de la prueba final.");
      return;
    }

    if (!form.post_escritura_estado) {
      setError("Falta seleccionar el resultado de la prueba final.");
      return;
    }

    if (
      form.post_escritura_estado === "NO_APLICA" &&
      !limpiar(form.post_escritura_observacion)
    ) {
      setError("Explica por qué la prueba final no aplica.");
      return;
    }

    if (
      form.post_escritura_estado !== "NO_APLICA" &&
      !form.post_escritura_sin_dtc &&
      !limpiar(form.post_escritura_dtc)
    ) {
      setError(
        "Ingresa los códigos de falla finales o marca que no hay códigos."
      );
      return;
    }

    try {
      const fd = new FormData();

      fd.append("post_escritura_estado", form.post_escritura_estado);
      fd.append(
        "post_escritura_sin_dtc",
        form.post_escritura_sin_dtc ? "true" : "false"
      );
      fd.append("post_escritura_dtc", form.post_escritura_dtc || "");
      fd.append(
        "post_escritura_observacion",
        form.post_escritura_observacion || ""
      );
      if (form.scanner_post_escritura) {
        fd.append("scanner_post_escritura", form.scanner_post_escritura);
      }

      await api.post(`/archivos-ecu/${archivoId}/post-escritura`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMensaje("Prueba final registrada correctamente.");

      setPostForms((prev) => ({
        ...prev,
        [archivoId]: {},
      }));

      await cargarDatos();
    } catch (err) {
      mostrarError(err, "No se pudo guardar la prueba final. Revisa scanner, resultado y códigos de falla.");
    }
  };

  const marcarModDescargado = async (archivo) => {
    limpiarMensajes();

    if (!archivo.archivo_modificado) {
      setError("No puedes marcar MOD descargado sin MOD cargado.");
      return;
    }

    try {
      await api.post(`/archivos-ecu/${archivo.id}/mod-descargado`);
      setMensaje("Archivo MOD marcado como aplicado. El seguimiento obligatorio quedó activo.");
      await cargarDatos();
    } catch (err) {
      mostrarError(err, "Error marcando MOD descargado");
    }
  };

  const registrarCierreTecnico = async (archivo) => {
    limpiarMensajes();

    const form = {
      resultado_tecnico: "OK",
      observacion_cierre_tecnico: "",
      override_regularizacion: false,
      motivo_override: "",
      ...(cierreTecnicoForms[archivo.id] || {}),
    };

    if (!form.resultado_tecnico) {
      setError("Debes seleccionar resultado técnico.");
      return;
    }

    const checklist = checklistCierreTecnico(archivo, form, {
      permitirLegacySinResponsable: usuarioPuedeCerrarLegacy(),
    });
    const faltantes = checklist
      .filter((item) => item.key !== "cierre" && !item.ok)
      .map((item) => item.label);

    if (form.resultado_tecnico === "OK" && faltantes.length > 0) {
      setError(`Para cerrar OK faltan: ${faltantes.join(", ")}.`);
      return;
    }

    if (form.resultado_tecnico !== "OK" && !limpiar(form.observacion_cierre_tecnico)) {
      setError("Debes indicar observacion tecnica para cierre no OK.");
      return;
    }

    if (
      form.override_regularizacion &&
      (!puedeUrgentePorAsignar || !limpiar(form.motivo_override))
    ) {
      setError(
        puedeUrgentePorAsignar
          ? "Debes justificar el override de regularización."
          : "Tu rol no puede autorizar un cierre con regularización pendiente."
      );
      return;
    }

    const confirmar = window.confirm(
      form.resultado_tecnico === "OK"
        ? "¿Confirmas cierre técnico OK? La orden solo quedará lista si además cumple regularización, material y los demás controles."
        : "¿Confirmas registrar resultado técnico no OK? El proceso seguirá pendiente hasta resolver."
    );

    if (!confirmar) return;

    try {
      await api.post(`/archivos-ecu/${archivo.id}/cierre-tecnico`, form);
      setMensaje("Resultado de cierre técnico registrado.");
      setCierreTecnicoForms((prev) => ({
        ...prev,
        [archivo.id]: {},
      }));
      await cargarDatos();
    } catch (err) {
      mostrarError(err, "Error registrando cierre técnico");
    }
  };

  const solicitarCorreccion = async (archivoId) => {
    limpiarMensajes();

    const form = {
      post_escritura_dtc: "",
      post_escritura_observacion: "",
      ...(postForms[archivoId] || {}),
    };

    if (
      !limpiar(form.post_escritura_dtc) &&
      !limpiar(form.post_escritura_observacion)
    ) {
      setError("Debes indicar DTC u observación para solicitar corrección");
      return;
    }

    try {
      await api.post(`/archivos-ecu/${archivoId}/solicitar-correccion`, {
        dtc_post_escritura: form.post_escritura_dtc,
        observacion_correccion: form.post_escritura_observacion,
      });

      setMensaje("Corrección solicitada correctamente");
      await cargarDatos();
    } catch (err) {
      mostrarError(err, "Error solicitando corrección");
    }
  };

  const finalizarTecnico = async (archivo) => {
    limpiarMensajes();

    const cierreForm = {
      resultado_tecnico: "OK",
      observacion_cierre_tecnico: archivo.observacion_cierre_tecnico || "",
      override_regularizacion: false,
      motivo_override: "",
      ...(cierreTecnicoForms[archivo.id] || {}),
    };
    const faltantes = checklistCierreTecnico(archivo, cierreForm, {
      permitirLegacySinResponsable: usuarioPuedeCerrarLegacy(),
    })
      .filter((item) => item.key !== "cierre" && !item.ok)
      .map((item) => item.label);

    if (faltantes.length > 0) {
      setError(
        `No puedes finalizar tecnicamente. Faltan: ${faltantes.join(", ")}.`
      );
      return;
    }

    if (
      cierreForm.override_regularizacion &&
      (!puedeUrgentePorAsignar || !limpiar(cierreForm.motivo_override))
    ) {
      setError("Debes tener rol de jefatura y justificar el override.");
      return;
    }

    const confirmar = window.confirm(
      "¿Confirmas que el trabajo técnico está terminado? Esto no confirma pago ni entrega."
    );

    if (!confirmar) return;

    try {
      await api.patch(`/archivos-ecu/${archivo.id}`, {
        estado: "FINALIZADO_TECNICO",
        correccion_pendiente: false,
        observacion_cierre_tecnico: cierreForm.observacion_cierre_tecnico,
        override_regularizacion: cierreForm.override_regularizacion === true,
        motivo_override: cierreForm.motivo_override || undefined,
      });

      setMensaje("Trabajo técnico terminado. Quedó listo para el siguiente paso.");
      await cargarDatos();
    } catch (err) {
      mostrarError(err, "Error finalizando técnicamente");
    }
  };

  const archivarArchivo = async (archivoId) => {
    limpiarMensajes();

    const form = archivarForms[archivoId] || {};

    if (!form.archivado_motivo) {
      setError("Debes seleccionar motivo de archivado");
      return;
    }

    const confirmar = window.confirm(
      "¿Seguro que quieres archivar este trabajo? No se eliminará, pero saldrá del listado activo."
    );

    if (!confirmar) return;

    try {
      await api.post(`/archivos-ecu/${archivoId}/archivar`, {
        archivado_motivo: form.archivado_motivo,
        archivado_comentario: form.archivado_comentario || "",
      });

      setMensaje("Trabajo archivado correctamente.");
      await cargarDatos();
    } catch (err) {
      mostrarError(err, "No se pudo archivar el trabajo. Revisa el motivo e intenta nuevamente.");
    }
  };

  const ordenLabel = (orden) => {
    const vehiculo = orden?.Vehiculo;
    const cliente = vehiculo?.Cliente;

    return [
      `Orden #${orden.id}`,
      cliente?.nombre || "Cliente sin nombre",
      vehiculo?.patente || "Sin patente",
      vehiculo?.marca || "",
      vehiculo?.modelo || "",
    ]
      .filter(Boolean)
      .join(" · ");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Trabajos de archivos ECU</h1>
            <p className="text-slate-400 mt-1">
              Original, archivo modificado, prueba final y trabajo técnico terminado.
            </p>
          </div>

          <button
            onClick={cargarDatos}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </header>

        <section className="border border-amber-500/40 bg-amber-500/10 rounded-3xl p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
            Regla operativa de archivos ECU
          </p>
          <p className="mt-2 text-sm md:text-base font-semibold text-amber-50">
            Todo archivo recibido debe quedar registrado aquí. Si no está en Archivos ECU, no existe oficialmente.
          </p>
        </section>

        {mensaje && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 p-4 rounded-2xl">
            {mensaje}
          </div>
        )}

        {advertencia && (
          <div className="rounded-2xl border border-amber-400/50 bg-amber-500/10 p-4 text-amber-100 space-y-3">
            <p className="font-semibold">{advertencia}</p>
            {modoUrgenteNuevo && bloqueoDiagnostico?.faltantes?.length > 0 && (
              <div>
                <p className="text-sm font-bold">Pendiente de regularizar:</p>
                <ul className="mt-1 list-disc list-inside text-sm">
                  {bloqueoDiagnostico.faltantes.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-2xl space-y-3">
            <p className="font-semibold">{error}</p>

            {bloqueoDiagnostico?.faltantes?.length > 0 && (
              <div>
                <p className="text-sm text-red-100 mb-2">Falta completar:</p>
                <ul className="list-disc list-inside text-sm">
                  {bloqueoDiagnostico.faltantes.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>

                <button
                  onClick={() => {
                    window.location.href = RUTA_DIAGNOSTICO;
                  }}
                  className="mt-3 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white"
                >
                  Ir a diagnóstico obligatorio
                </button>
              </div>
            )}
          </div>
        )}

        <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <h2 className="text-xl font-semibold mb-4">Nuevo trabajo de archivos ECU</h2>

          <form onSubmit={crearArchivo} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className={`md:col-span-3 rounded-2xl border p-4 ${
                modoUrgenteNuevo
                  ? "border-red-400 bg-red-500/10"
                  : "border-slate-700 bg-slate-950/60"
              }`}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={modoUrgenteNuevo}
                  onChange={(e) => {
                    const activo = e.target.checked;
                    setModoUrgenteNuevo(activo);
                    setAdvertencia("");
                    setNuevo((prev) => ({
                      ...prev,
                      override_guardia: activo ? prev.override_guardia : false,
                      motivo_override: activo ? prev.motivo_override : "",
                      prioridad: activo
                        ? "URGENTE"
                        : prev.prioridad === "URGENTE"
                        ? "MEDIA"
                        : prev.prioridad,
                    }));
                  }}
                  className="mt-1 h-4 w-4 accent-red-600"
                />
                <span>
                  <span className="block text-sm font-black uppercase text-white">
                    Trabajo urgente
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-slate-300">
                    Exige archivo original, servicio y motivo. Si falta diagnóstico, quedará señalado para regularizar.
                  </span>
                </span>
              </label>
            </div>

            <div className="md:col-span-3">
              <label className="text-xs text-slate-400 ml-1">Orden de trabajo</label>
              <select
                value={nuevo.ordenId}
                onChange={(e) => seleccionarOrdenSolicitud(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
              >
                <option value="">-- Selecciona una orden --</option>
                {ordenes.map((orden) => (
                  <option key={orden.id} value={orden.id}>
                    {ordenLabel(orden)}
                  </option>
                ))}
              </select>
              {ordenes.length === 0 && (
                <p className="mt-2 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs font-semibold text-yellow-100">
                  Selecciona o crea una orden antes de registrar archivos.
                </p>
              )}
            </div>

            {nuevo.ordenId && (
              <div className="md:col-span-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
                {cargandoContexto ? (
                  <p className="text-xs font-bold uppercase text-blue-100">
                    Cargando DTC desde diagnostico...
                  </p>
                ) : contextoSolicitud?.diagnostico ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase text-blue-100">
                      Importado desde diagnostico #{contextoSolicitud.diagnostico.id} /{" "}
                      {formatearFecha(contextoSolicitud.diagnostico.createdAt)}
                    </p>
                    {normalizarLista(nuevo.dtc_snapshot).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {normalizarLista(nuevo.dtc_snapshot).map((dtc) => (
                          <span
                            key={`dtc-nuevo-${dtc.codigo || dtc}`}
                            className="rounded-full border border-blue-400/50 bg-slate-950 px-3 py-1 text-xs font-black text-blue-100"
                          >
                            {dtc.codigo || dtc}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-slate-300">
                        Diagnostico encontrado sin DTC activos detectables.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase text-yellow-100">
                      No hay diagnostico registrado para importar DTC.
                    </p>
                    {modoUrgenteNuevo && (
                      <p className="rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 text-xs font-black uppercase text-amber-100">
                        Diagnóstico pendiente · regularizar antes de la prueba final.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs text-slate-400 ml-1">Prioridad</label>
              <select
                value={modoUrgenteNuevo ? "URGENTE" : nuevo.prioridad}
                disabled={modoUrgenteNuevo}
                onChange={(e) =>
                  setNuevo((prev) => ({ ...prev, prioridad: e.target.value }))
                }
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
              >
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>

            <div className="md:col-span-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-300">
                    ¿Quién tiene la tarea?
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {modoUrgenteNuevo
                      ? puedeUrgentePorAsignar
                        ? "Puedes elegir Tuner/Master, Operador ECU o Slave, o dejarlo por asignar con motivo."
                        : "Elige Tuner/Master, Operador ECU o Slave activo antes de enviar."
                      : "Debe existir Tuner/Master u Operador ECU asignado antes de enviar."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {RESPONSABLES_FILE_SERVICE.map((responsable) => {
                  const opciones = usuariosPorRoles(responsable.roles);
                  return (
                    <label
                      key={`nuevo-${responsable.campoId}`}
                      className="text-sm text-slate-300"
                    >
                      <span className="mb-1 block text-xs text-slate-500">
                        {responsable.label}
                      </span>
                      <select
                        value={nuevo[responsable.campoId] || ""}
                        onChange={(e) =>
                          actualizarResponsableNuevo(responsable, e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-blue-500"
                      >
                        <option value="">Sin asignar</option>
                        {opciones.map((usuario) => (
                          <option key={usuario.id} value={usuario.id}>
                            {usuario.nombre || usuario.username || String(usuario.id)}
                            {usuario.rol ? ` (${usuario.rol})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>

              {modoUrgenteNuevo &&
                puedeUrgentePorAsignar &&
                !nuevo.tuner_asignado_a_id &&
                !nuevo.operador_ecu_asignado_a_id &&
                !nuevo.slave_asignado_a_id && (
                  <p className="mt-3 rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 text-xs font-black uppercase text-amber-100">
                    Por asignar · jefatura debe definir encargado antes del cierre técnico o la entrega.
                  </p>
                )}

              {modoUrgenteNuevo &&
                puedeUrgentePorAsignar &&
                (nuevo.tuner_asignado_a_id ||
                  nuevo.operador_ecu_asignado_a_id ||
                  nuevo.slave_asignado_a_id) && (
                  <div className="mt-3 rounded-xl border border-red-400/50 bg-red-500/10 p-3">
                    <label className="flex items-start gap-2 text-xs font-black uppercase text-red-100">
                      <input
                        type="checkbox"
                        checked={nuevo.override_guardia === true}
                        onChange={(e) =>
                          setNuevo((prev) => ({
                            ...prev,
                            override_guardia: e.target.checked,
                            motivo_override: e.target.checked
                              ? prev.motivo_override
                              : "",
                          }))
                        }
                      />
                      Autorizar asignación aunque el encargado tenga bloqueos críticos
                    </label>
                    {nuevo.override_guardia && (
                      <textarea
                        value={nuevo.motivo_override || ""}
                        onChange={(e) =>
                          setNuevo((prev) => ({
                            ...prev,
                            motivo_override: e.target.value,
                          }))
                        }
                        placeholder="Motivo obligatorio del override"
                        className="mt-3 w-full rounded-xl border border-red-400 bg-slate-950 p-3 text-sm text-white"
                      />
                    )}
                  </div>
                )}
            </div>

            <div className="md:col-span-3 space-y-4">
              <div>
                <label className="text-xs text-slate-400 ml-1">
                  Presets rapidos
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESETS_FILE_SERVICE.map((preset) => (
                    <button
                      type="button"
                      key={preset.value}
                      onClick={() => aplicarPresetServicios(preset)}
                      className={`rounded-full border px-3 py-2 text-xs font-black uppercase transition ${
                        nuevo.servicios_preset === preset.value
                          ? "border-blue-400 bg-blue-500 text-white"
                          : "border-slate-700 bg-slate-950 text-slate-200 hover:border-blue-400"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <label className="text-xs font-bold uppercase text-slate-300">
                    Servicios solicitados
                  </label>
                  <span className="text-[11px] font-semibold uppercase text-slate-500">
                    Servicios internos sujetos a normativa aplicable y uso autorizado.
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {SERVICIOS_FILE_SERVICE.map((grupo) => (
                    <div key={grupo.grupo} className="space-y-2">
                      <p className="text-[11px] font-black uppercase text-blue-200">
                        {grupo.grupo}
                      </p>
                      {grupo.opciones.map((servicio) => {
                        const checked = normalizarLista(nuevo.servicios_solicitados).includes(
                          servicio.value
                        );

                        return (
                          <label
                            key={servicio.value}
                            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
                              checked
                                ? "border-blue-400 bg-blue-500/20 text-blue-50"
                                : "border-slate-800 bg-slate-900 text-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleServicioSolicitado(servicio.value)}
                            />
                            {servicio.label}
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {modoUrgenteNuevo && (
                <div className="rounded-2xl border border-red-400/50 bg-red-500/10 p-4">
                  <label className="text-xs font-black uppercase text-red-100">
                    Motivo de la urgencia *
                  </label>
                  <input
                    value={nuevo.motivo_urgencia}
                    onChange={(e) =>
                      setNuevo((prev) => ({
                        ...prev,
                        motivo_urgencia: e.target.value,
                      }))
                    }
                    placeholder="Explica por qué debe atenderse de inmediato"
                    className="mt-2 w-full rounded-xl border border-red-400 bg-slate-950 p-3 outline-none focus:border-red-300"
                  />
                </div>
              )}

              {normalizarLista(nuevo.servicios_solicitados).some((servicio) =>
                ["CUSTOM", "OTRO"].includes(String(servicio).toUpperCase())
              ) && (
                <div>
                  <label className="text-xs text-slate-400 ml-1">
                    Observacion servicio Custom / Otro
                  </label>
                  <input
                    value={nuevo.observacion_servicios}
                    onChange={(e) =>
                      setNuevo((prev) => ({
                        ...prev,
                        observacion_servicios: e.target.value,
                      }))
                    }
                    placeholder="Describe el servicio requerido"
                    className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-400 ml-1">Método lectura</label>
              <input
                value={nuevo.metodo_lectura}
                onChange={(e) =>
                  setNuevo((prev) => ({
                    ...prev,
                    metodo_lectura: e.target.value,
                  }))
                }
                placeholder="OBD, Bench, Boot, BDM..."
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 ml-1">Herramienta</label>
              <input
                value={nuevo.herramienta_lectura}
                onChange={(e) =>
                  setNuevo((prev) => ({
                    ...prev,
                    herramienta_lectura: e.target.value,
                  }))
                }
                placeholder="KESS3, FLEX, PCMFlash..."
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 ml-1">Marca ECU</label>
              <input
                value={nuevo.marca_ecu}
                onChange={(e) =>
                  setNuevo((prev) => ({ ...prev, marca_ecu: e.target.value }))
                }
                placeholder="Bosch, Delphi, Continental..."
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 ml-1">Modelo ECU</label>
              <input
                value={nuevo.modelo_ecu}
                onChange={(e) =>
                  setNuevo((prev) => ({ ...prev, modelo_ecu: e.target.value }))
                }
                placeholder="EDC17, MD1, MED17..."
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <details className="md:col-span-3 bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
              <summary className="cursor-pointer font-semibold text-slate-200">
                Datos avanzados ECU opcionales
              </summary>

              <p className="text-xs text-slate-500 mt-2 mb-4">
                Estos datos son opcionales. Un Master puede completarlos si los
                tiene; un Slave o taller pequeño puede dejarlo vacío.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 ml-1">HW</label>
                  <input
                    value={nuevo.hw}
                    onChange={(e) =>
                      setNuevo((prev) => ({ ...prev, hw: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 ml-1">SW</label>
                  <input
                    value={nuevo.sw}
                    onChange={(e) =>
                      setNuevo((prev) => ({ ...prev, sw: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 ml-1">
                    Version software
                  </label>
                  <input
                    value={nuevo.version_software}
                    onChange={(e) =>
                      setNuevo((prev) => ({
                        ...prev,
                        version_software: e.target.value,
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </details>

            <div className="md:col-span-3">
              <label className="text-xs text-slate-400 ml-1">
                Archivo original *
              </label>
              <input
                type="file"
                onChange={(e) =>
                  setNuevo((prev) => ({
                    ...prev,
                    archivo: e.target.files?.[0] || null,
                  }))
                }
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-xs text-slate-400 ml-1">
                Notas operador
              </label>
              <textarea
                value={nuevo.notas_operador}
                onChange={(e) =>
                  setNuevo((prev) => ({
                    ...prev,
                    notas_operador: e.target.value,
                  }))
                }
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-xs text-slate-400 ml-1">
                Instrucciones para tuner
              </label>
              <textarea
                value={nuevo.instrucciones_tuner}
                onChange={(e) =>
                  setNuevo((prev) => ({
                    ...prev,
                    instrucciones_tuner: e.target.value,
                  }))
                }
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={guardando}
                className="w-full md:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold"
              >
                {guardando ? "Guardando..." : "Crear trabajo de archivos ECU"}
              </button>

              <p className="text-xs text-slate-500 mt-3">
                {modoUrgenteNuevo
                  ? "Urgente: archivo, servicio y motivo son obligatorios. El diagnóstico pendiente se mostrará para regularizar."
                  : "Antes de crear el trabajo debe existir un diagnóstico con scanner y códigos de falla, o indicar que no hay códigos."}
              </p>
            </div>
          </form>
        </section>

        <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold">Trabajos de archivos ECU</h2>
              <p className="text-slate-400 text-sm">
                {archivosFiltrados.length} registros activos
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar cliente, patente, ECU, orden..."
                className="bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500 min-w-[260px]"
              />

              <div className="flex flex-wrap gap-2">
                {FILTROS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFiltro(item.value)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold uppercase transition ${
                      filtro === item.value
                        ? "bg-blue-600 border-blue-400 text-white"
                        : "bg-slate-950 border-slate-700 text-slate-300 hover:border-blue-500"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading && (
            <div className="text-slate-400 p-4">Cargando registros...</div>
          )}

          {!loading && archivosFiltrados.length === 0 && (
            <div className="text-slate-400 p-4 border border-dashed border-slate-700 rounded-2xl">
              {archivos.length === 0
                ? "Selecciona o crea una orden antes de registrar archivos."
                : "No hay archivos ECU activos con este filtro."}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-5">
            <div className="space-y-3 xl:max-h-[calc(100vh-180px)] xl:overflow-auto pr-1">
              {archivosFiltrados.map((archivo) => {
                const { textoCliente, textoVehiculo } =
                  obtenerClienteVehiculo(archivo);
                const seleccionado =
                  String(archivo.id) === String(archivoSeleccionadoId);
                const serviciosArchivo = normalizarLista(
                  archivo.servicios_solicitados
                );
                const dtcsArchivo = normalizarLista(archivo.dtc_snapshot);

                return (
                  <button
                    key={archivo.id}
                    type="button"
                    onClick={() => setArchivoSeleccionadoId(String(archivo.id))}
                    className={`w-full text-left rounded-2xl border p-4 transition ${
                      seleccionado
                        ? "border-blue-400 bg-blue-950/60 shadow-[0_0_0_2px_rgba(59,130,246,0.35)]"
                        : "border-slate-800 bg-slate-950/70 hover:border-blue-500"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">
                          Archivo ECU #{archivo.id}
                        </p>
                        <p className="text-xs text-slate-400">
                          Orden #{archivo.ordenId || "Sin orden"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${badgeClass(
                          archivo.estado
                        )}`}
                      >
                        {estadoLabel(archivo.estado)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm font-semibold text-slate-200">
                      {textoCliente}
                    </p>
                    <p className="text-xs text-slate-400">{textoVehiculo}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(serviciosArchivo.length
                        ? serviciosArchivo.slice(0, 3)
                        : [archivo.tipo_servicio || "Servicio no informado"]
                      ).map((servicio) => (
                        <span
                          key={`${archivo.id}-svc-${servicio}`}
                          className="rounded-full bg-slate-900 px-2 py-1 text-[10px] uppercase text-slate-300"
                        >
                          {servicioLabel(servicio)}
                        </span>
                      ))}
                      {serviciosArchivo.length > 3 && (
                        <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] uppercase text-slate-300">
                          +{serviciosArchivo.length - 3}
                        </span>
                      )}
                      {dtcsArchivo.length > 0 && (
                        <span className="rounded-full bg-blue-950 px-2 py-1 text-[10px] uppercase text-blue-200">
                          DTC: {resumenDtcSnapshot(dtcsArchivo)}
                        </span>
                      )}
                      <span className="rounded-full bg-blue-950 px-2 py-1 text-[10px] uppercase text-blue-200">
                        {obtenerProximaAccion(archivo)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div>
              {!archivoSeleccionado ? (
                <div className="min-h-[360px] rounded-3xl border border-dashed border-slate-700 bg-slate-950/60 p-8 flex items-center justify-center text-center">
                  <div>
                    <p className="text-xl font-semibold text-slate-200">
                      Selecciona una orden o archivo para ver el detalle técnico.
                    </p>
                    <p className="mt-3 text-sm text-slate-500">
                      La lista compacta mantiene filtros y búsqueda sin cargar toda
                      la ficha técnica de cada trabajo de archivos ECU.
                    </p>
                  </div>
                </div>
              ) : (
                (() => {
                  const archivo = archivoSeleccionado;
              const { orden, vehiculo, cliente, textoCliente, textoVehiculo } =
                obtenerClienteVehiculo(archivo);

              const versiones = Array.isArray(archivo.versiones_modificadas)
                ? archivo.versiones_modificadas
                : [];

              const historialProcesamiento = Array.isArray(
                archivo.procesamiento_externo_archivos
              )
                ? archivo.procesamiento_externo_archivos
                : [];

              const procesamientoForm = {
                procesamiento_externo_estado: "EN_PROCESO",
                procesamiento_externo_herramienta: "OTRO",
                procesamiento_externo_observacion: "",
                archivo_resultado: null,
                ...(procesamientoForms[archivo.id] || {}),
              };

              const postForm = {
                post_escritura_estado: "OK",
                post_escritura_sin_dtc: false,
                post_escritura_dtc: "",
                post_escritura_observacion: "",
                scanner_post_escritura: null,
                ...(postForms[archivo.id] || {}),
              };

              const correccionForm = {
                motivo: "Postventa técnica File Service",
                descripcion: "",
                dtc: "",
                sintoma_cliente: "",
                prioridad: "MEDIA",
                responsable_sugerido: "OPERADOR_ECU",
                comentario_tecnico: "",
                cliente_volvio: false,
                ...(correccionForms[archivo.id] || {}),
              };

              const archForm = {
                archivado_motivo: "",
                archivado_comentario: "",
                ...(archivarForms[archivo.id] || {}),
              };

              const cierreForm = {
                resultado_tecnico: archivo.resultado_tecnico || "OK",
                observacion_cierre_tecnico:
                  archivo.observacion_cierre_tecnico || "",
                override_regularizacion: false,
                motivo_override: "",
                ...(cierreTecnicoForms[archivo.id] || {}),
              };

              const cierreLegacyAutorizado = usuarioPuedeCerrarLegacy();
              const checklistTecnico = checklistCierreTecnico(archivo, cierreForm, {
                permitirLegacySinResponsable: cierreLegacyAutorizado,
              });
              const faltantesCierreOk = checklistTecnico.filter(
                (item) => item.key !== "cierre" && !item.ok
              );
              const puedeFinalizar = faltantesCierreOk.length === 0;
              const legacySinResponsableId =
                !limpiar(archivo.tuner_asignado_a_id) &&
                !limpiar(archivo.operador_ecu_asignado_a_id) &&
                !limpiar(archivo.slave_asignado_a_id);
              const legacySinResponsable =
                legacySinResponsableId &&
                !limpiar(archivo.tuner_asignado_a) &&
                !limpiar(archivo.operador_ecu_asignado_a) &&
                !limpiar(archivo.slave_asignado_a);
              const responsablePrincipal = obtenerResponsablePrincipal(archivo);
              const proximaAccion = obtenerProximaAccion(archivo);
              const serviciosArchivo = normalizarLista(archivo.servicios_solicitados);
              const dtcsArchivo = normalizarLista(archivo.dtc_snapshot);
              const guardEstado = archivo.proceso_guard_estado || "SIN_RIESGO";
              const guardAbierto = procesoTecnicoAbierto(archivo);
              const guardMinutos = minutosDesde(procesoGuardInicio(archivo));
              const guardCritico = ["CRITICO", "ESCALADO"].includes(
                String(guardEstado || "").toUpperCase()
              );
              const estadoArchivo = String(archivo.estado || "").toUpperCase();
              const archivoActivo =
                !archivo.archivado &&
                !["FINALIZADO_TECNICO", "FINALIZADO", "ARCHIVADO"].includes(
                  estadoArchivo
                );
              const activoMas24h =
                archivoActivo && minutosDesde(archivo.createdAt) > 1440;
              const badgesCumplimiento = [
                archivoActivo &&
                archivo.archivo_modificado &&
                archivo.post_escritura_estado !== "OK"
                  ? "Falta prueba final"
                  : null,
                !archivo.correccion_pendiente && estadoArchivo === "REQUIERE_CORRECCION"
                  ? "Correccion pendiente"
                  : null,
                activoMas24h ? "Activo mas de 24h" : null,
              ].filter(Boolean);
              const pendientesUrgentes = normalizarAdvertenciasRespuesta({
                advertencias: normalizarLista(archivo.regularizacion_pendientes),
              });
              const muestraRegularizacionUrgente =
                archivo.creado_en_modo_urgente === true &&
                (archivo.requiere_regularizacion === true ||
                  archivo.regularizar_antes_de_entrega === true ||
                  pendientesUrgentes.length > 0);

              return (
                <article
                  key={archivo.id}
                  id={`archivo-${archivo.id}-datos`}
                  className="border border-slate-800 bg-slate-950/70 rounded-3xl p-5 space-y-5"
                >
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
                    {[
                      ["datos", "1. Datos recibidos"],
                      ["servicios", "2. Servicios"],
                      ["dtc", "3. Códigos de falla"],
                      ["encargado", "4. Quién la tiene"],
                      ["mod", "5. Archivo MOD"],
                      ["prueba", "6. Prueba final"],
                      ["cierre", "7. Terminar trabajo"],
                    ].map(([ancla, label]) => (
                      <a
                        key={`${archivo.id}-${ancla}`}
                        href={`#archivo-${archivo.id}-${ancla}`}
                        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-center text-[10px] font-black uppercase text-slate-300 transition hover:border-blue-400 hover:text-white"
                      >
                        {label}
                      </a>
                    ))}
                  </div>

                  {muestraRegularizacionUrgente && (
                    <div className="rounded-2xl border border-amber-400/50 bg-amber-500/10 p-4 text-amber-100">
                      <p className="text-xs font-black uppercase">
                        File Service urgente · faltan datos
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {pendientesUrgentes.length > 0
                          ? pendientesUrgentes.join(" · ")
                          : "Debes regularizar este trabajo antes del cierre técnico o la entrega."}
                      </p>
                      <p className="mt-1 text-xs text-amber-200">
                        No bloquea el trabajo ahora, pero debe quedar resuelto o justificado al cerrar.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">
                        1. Datos recibidos
                      </p>
                      <div className="flex flex-wrap gap-2 items-center mb-2">
                        <span className="text-lg font-bold">
                          Archivo ECU #{archivo.id}
                        </span>

                        <span
                          className={`text-xs px-3 py-1 rounded-full border ${badgeClass(
                            archivo.estado
                          )}`}
                        >
                          {estadoLabel(archivo.estado)}
                        </span>

                        <span
                          className={`text-xs px-3 py-1 rounded-full border ${processGuardClass(
                            guardEstado
                          )}`}
                        >
                          Seguimiento obligatorio: {processGuardLabel(guardEstado)}
                        </span>

                        {archivo.correccion_pendiente && (
                          <span className="text-xs px-3 py-1 rounded-full border bg-red-500/15 text-red-300 border-red-500/30">
                            Corrección pendiente
                          </span>
                        )}

                        {badgesCumplimiento.map((badge) => (
                          <span
                            key={`${archivo.id}-${badge}`}
                            className="text-xs px-3 py-1 rounded-full border bg-amber-500/15 text-amber-200 border-amber-500/40"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>

                      <p className="text-slate-200">{textoCliente}</p>
                      <p className="text-slate-400 text-sm">{textoVehiculo}</p>
                      <p className="text-slate-500 text-sm">
                        Orden #{archivo.ordenId} · Servicio:{" "}
                        {archivo.tipo_servicio || "-"}
                      </p>

                      <div
                        id={`archivo-${archivo.id}-servicios`}
                        className="mt-3 space-y-2 scroll-mt-24"
                      >
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">
                          2. Servicios solicitados
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(serviciosArchivo.length
                            ? serviciosArchivo
                            : [archivo.tipo_servicio || "Servicio no informado"]
                          ).map((servicio) => (
                            <span
                              key={`${archivo.id}-detalle-svc-${servicio}`}
                              className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase text-blue-100"
                            >
                              {servicioLabel(servicio)}
                            </span>
                          ))}
                        </div>

                        {archivo.servicios_preset && (
                          <p className="text-xs font-semibold uppercase text-slate-400">
                            Preset: {archivo.servicios_preset}
                          </p>
                        )}

                        <div id={`archivo-${archivo.id}-dtc`} className="scroll-mt-24">
                          <p className="mb-1 text-xs font-bold uppercase text-slate-400">
                            3. Códigos de falla (DTC)
                          </p>
                          {dtcsArchivo.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {dtcsArchivo.map((dtc) => (
                                <span
                                  key={`${archivo.id}-dtc-${dtc.codigo || dtc}`}
                                  className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-black uppercase text-cyan-100"
                                >
                                  {dtc.codigo || dtc}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-slate-500">
                              Sin códigos de falla importados.
                            </p>
                          )}
                          {archivo.diagnosticoId && (
                            <p className="mt-1 text-[11px] font-semibold uppercase text-slate-500">
                              Fuente diagnóstico #{archivo.diagnosticoId}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase">
                        {vehiculo?.id ? (
                          <>
                            <Link
                              to={`/vehiculos/${vehiculo.id}#historial`}
                              className="rounded-xl border border-slate-600 px-3 py-2 text-slate-200 hover:border-blue-400 hover:text-blue-200"
                            >
                              Ficha vehículo
                            </Link>
                            <Link
                              to={`/vehiculos/${vehiculo.id}#archivos`}
                              className="rounded-xl border border-slate-600 px-3 py-2 text-slate-200 hover:border-blue-400 hover:text-blue-200"
                            >
                              Historial archivos
                            </Link>
                          </>
                        ) : (
                          <span className="rounded-xl border border-slate-700 px-3 py-2 text-slate-500">
                            Sin vínculo vehículo
                          </span>
                        )}

                        {archivo.ordenId ? (
                          <Link
                            to={`/ordenes?ordenId=${archivo.ordenId}`}
                            className="rounded-xl border border-slate-600 px-3 py-2 text-slate-200 hover:border-blue-400 hover:text-blue-200"
                          >
                            Orden #{archivo.ordenId}
                          </Link>
                        ) : (
                          <span className="rounded-xl border border-slate-700 px-3 py-2 text-slate-500">
                            Sin vínculo orden
                          </span>
                        )}

                        {cliente?.id ? (
                          <Link
                            to={`/clientes?clienteId=${cliente.id}`}
                            className="rounded-xl border border-slate-600 px-3 py-2 text-slate-200 hover:border-blue-400 hover:text-blue-200"
                          >
                            Cliente
                          </Link>
                        ) : null}
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                          <p className="text-xs uppercase text-slate-500">
                            Quién debe actuar ahora
                          </p>
                          <p className="font-semibold text-slate-100">
                            {responsablePrincipal}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                          <p className="text-xs uppercase text-emerald-300">
                            Próxima acción
                          </p>
                          <p className="font-semibold text-emerald-100">
                            {proximaAccion}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-slate-400 md:text-right">
                      <p>Creado: {formatearFecha(archivo.createdAt)}</p>
                      <p>
                        Original por:{" "}
                        {archivo.archivo_original_subido_por || "No registrado"}
                      </p>
                      <details className="mt-3 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3 text-left">
                        <summary className="cursor-pointer text-xs font-semibold text-purple-200">
                          Opciones avanzadas · Estado de notificaciones
                        </summary>
                        <div className="mt-2 text-xs">
                          <p>Encargado avisado: {archivo.notificado_master_at ? "Sí" : "No"}</p>
                          <p>
                            Fecha:{" "}
                            {archivo.notificado_master_at
                              ? formatearFecha(archivo.notificado_master_at)
                              : "No registrado"}
                          </p>
                          <p>Por: {archivo.notificado_master_por || "No registrado"}</p>
                        </div>
                      </details>
                    </div>
                  </div>

                  {guardCritico && (
                    <div className="rounded-2xl border border-red-500 bg-red-500/15 p-4 text-red-100">
                      <p className="text-sm font-bold uppercase">
                        Este proceso no puede quedar inconcluso.
                      </p>
                      <p className="mt-1 text-xs text-red-100/90">
                        Registra la prueba final, una corrección, una nueva lectura o
                        termina el trabajo técnico. Tiempo abierto:{" "}
                        {formatearDuracionMinutos(guardMinutos)}.
                      </p>
                    </div>
                  )}

                  <details
                    id={`archivo-${archivo.id}-encargado`}
                    className="scroll-mt-24 bg-slate-900 border border-slate-800 rounded-2xl p-4"
                  >
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-300">
                      4. Quién tiene la tarea
                    </summary>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      {RESPONSABLES_FILE_SERVICE.map((responsable) => {
                        const opciones = usuariosPorRoles(responsable.roles);
                        const valorActualId = archivo[responsable.campoId] || "";
                        const valorActualTexto = archivo[responsable.campo] || "";
                        const existeActual = opciones.some(
                          (usuario) => String(usuario.id) === String(valorActualId)
                        );

                        return (
                          <label
                            key={`${archivo.id}-${responsable.campo}`}
                            className="text-sm text-slate-300"
                          >
                            <span className="block text-xs text-slate-500 mb-1">
                              {responsable.label}
                            </span>
                            <select
                              value={valorActualId}
                              onChange={(e) =>
                                asignarResponsableFileService(
                                  archivo,
                                  responsable,
                                  e.target.value
                                )
                              }
                              className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                            >
                              <option value="">Sin asignar</option>
                              {!valorActualId && valorActualTexto && !existeActual && (
                                <option value="" disabled>
                                  Actual: {valorActualTexto}
                                </option>
                              )}
                              {opciones.map((usuario) => (
                                <option
                                  key={`${responsable.campo}-${usuario.id}`}
                                  value={usuario.id}
                                >
                                  {usuario.nombre || usuario.username || String(usuario.id)}
                                  {usuario.rol ? ` (${usuario.rol})` : ""}
                                </option>
                              ))}
                            </select>
                            {valorActualTexto && (
                              <span className="mt-1 block text-[11px] text-slate-500">
                                Actual: {valorActualTexto}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </details>

                  <details className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                      Datos técnicos ECU avanzados
                    </summary>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                      <p className="text-slate-500">Lectura</p>
                      <p>{archivo.metodo_lectura || "-"}</p>
                      <p className="text-slate-400">
                        {archivo.herramienta_lectura || "-"}
                      </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                      <p className="text-slate-500">ECU</p>
                      <p>
                        {archivo.marca_ecu || "-"} {archivo.modelo_ecu || ""}
                      </p>
                      <p className="text-slate-400">
                        HW: {archivo.hw || "-"} · SW: {archivo.sw || "-"}
                      </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                      <p className="text-slate-500">Última versión MOD</p>
                      <p>MOD V{archivo.ultima_version_modificada || 0}</p>
                      <p className="text-slate-400">
                        Versiones: {versiones.length}
                      </p>
                    </div>
                  </div>

                  </details>

                  <div className="flex flex-wrap gap-2">
                    {archivo.archivo_original && (
                      <a
                        href={fileUrl(archivo.archivo_original)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm"
                      >
                        Descargar original
                      </a>
                    )}

                    {archivo.archivo_modificado && (
                      <a
                        href={fileUrl(archivo.archivo_modificado)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-sm"
                      >
                        Descargar último MOD
                      </a>
                    )}

                    {archivo.archivo_modificado && !archivo.cierre_tecnico_at && (
                      <button
                        type="button"
                        onClick={() => marcarModDescargado(archivo)}
                        className="px-4 py-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-sm text-white"
                      >
                        Marcar MOD descargado/aplicado
                      </button>
                    )}

                    {archivo.post_escritura_scanner && (
                      <a
                        href={fileUrl(archivo.post_escritura_scanner)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-sm"
                      >
                        Ver scanner de la prueba final
                      </a>
                    )}
                  </div>

                  {versiones.length > 0 && (
                    <details className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                      <summary className="cursor-pointer font-semibold">
                        Opciones avanzadas · Historial de archivos MOD
                      </summary>

                      <div className="mt-3 space-y-2">
                        {versiones.map((version, index) => (
                          <div
                            key={`${version.version || index}-${
                              version.fecha || index
                            }`}
                            className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border border-slate-800 rounded-xl p-3"
                          >
                            <div>
                              <p className="font-semibold">
                                {version.etiqueta || `MOD V${version.version}`}
                              </p>
                              <p className="text-xs text-slate-400">
                                Por {version.cargado_por || "-"} ·{" "}
                                {formatearFecha(version.fecha)}
                              </p>
                              {version.observaciones && (
                                <p className="text-sm text-slate-300 mt-1">
                                  {version.observaciones}
                                </p>
                              )}
                            </div>

                            {version.archivo && (
                              <a
                                href={fileUrl(version.archivo)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm text-center"
                              >
                                Descargar
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  <div
                    id={`archivo-${archivo.id}-mod`}
                    className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-2 gap-4"
                  >
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h3 className="font-semibold">5. Archivo modificado (MOD)</h3>

                      <input
                        type="file"
                        onChange={(e) =>
                          actualizarModForm(
                            archivo.id,
                            "archivo",
                            e.target.files?.[0] || null
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl"
                      />

                      <textarea
                        placeholder="Instrucciones / cambios realizados"
                        value={modForms[archivo.id]?.instrucciones_tuner || ""}
                        onChange={(e) =>
                          actualizarModForm(
                            archivo.id,
                            "instrucciones_tuner",
                            e.target.value
                          )
                        }
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                      />

                      <textarea
                        placeholder="Observaciones del MOD"
                        value={modForms[archivo.id]?.observaciones || ""}
                        onChange={(e) =>
                          actualizarModForm(
                            archivo.id,
                            "observaciones",
                            e.target.value
                          )
                        }
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                      />

                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={!!modForms[archivo.id]?.es_final}
                          onChange={(e) =>
                            actualizarModForm(
                              archivo.id,
                              "es_final",
                              e.target.checked
                            )
                          }
                        />
                        Marcar como MOD final
                      </label>

                      <button
                        onClick={() => subirModificado(archivo.id)}
                        className="w-full px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500"
                      >
                        Subir MOD V{(archivo.ultima_version_modificada || 0) + 1}
                      </button>
                    </div>

                    <details className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                      <summary className="cursor-pointer font-semibold">
                        Opciones avanzadas · Notificaciones
                      </summary>

                      <div className="mt-3 space-y-3">
                      <button
                        onClick={() => notificarMaster(archivo)}
                        className="w-full px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500"
                      >
                        Avisar Master por WhatsApp
                      </button>

                      <button
                        onClick={() => notificarSlave(archivo)}
                        disabled={!archivo.archivo_modificado}
                        className="w-full px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Notificar Slave / Operador ECU
                      </button>

                      <p className="text-xs text-slate-500">
                        La notificación interna se registra al crear el trabajo.
                        WhatsApp es un aviso manual opcional.
                      </p>
                      </div>
                    </details>
                  </div>

                  <details className="bg-red-950/30 border border-red-500/30 rounded-2xl p-4">
                    <summary className="cursor-pointer font-semibold text-red-100">
                      Opciones avanzadas · Correcciones y postventa
                    </summary>

                    <div className="mt-4 space-y-3">
                      <p className="text-xs text-red-200">
                        Registra aquí cuando un cliente vuelve por DTC,
                        revisión postventa o garantía técnica. Esto no cambia
                        pago ni entrega comercial.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          value={correccionForm.motivo}
                          onChange={(e) =>
                            actualizarCorreccionForm(
                              archivo.id,
                              "motivo",
                              e.target.value
                            )
                          }
                          placeholder="Motivo"
                          className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-red-500"
                        />

                        <input
                          value={correccionForm.dtc}
                          onChange={(e) =>
                            actualizarCorreccionForm(
                              archivo.id,
                              "dtc",
                              e.target.value
                            )
                          }
                          placeholder="DTC si existe"
                          className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-red-500"
                        />

                        <textarea
                          value={correccionForm.descripcion}
                          onChange={(e) =>
                            actualizarCorreccionForm(
                              archivo.id,
                              "descripcion",
                              e.target.value
                            )
                          }
                          rows={2}
                          placeholder="Descripción técnica"
                          className="md:col-span-2 w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-red-500"
                        />

                        <textarea
                          value={correccionForm.sintoma_cliente}
                          onChange={(e) =>
                            actualizarCorreccionForm(
                              archivo.id,
                              "sintoma_cliente",
                              e.target.value
                            )
                          }
                          rows={2}
                          placeholder="Síntoma reportado por cliente"
                          className="md:col-span-2 w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-red-500"
                        />

                        <select
                          value={correccionForm.prioridad}
                          onChange={(e) =>
                            actualizarCorreccionForm(
                              archivo.id,
                              "prioridad",
                              e.target.value
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-red-500"
                        >
                          {PRIORIDADES_CORRECCION.map((prioridad) => (
                            <option key={prioridad} value={prioridad}>
                              {prioridad}
                            </option>
                          ))}
                        </select>

                        <select
                          value={correccionForm.responsable_sugerido}
                          onChange={(e) =>
                            actualizarCorreccionForm(
                              archivo.id,
                              "responsable_sugerido",
                              e.target.value
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-red-500"
                        >
                          {RESPONSABLES_CORRECCION.map((item) => (
                            <option key={item.value || "sin"} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>

                        <label className="flex items-center gap-2 text-sm text-slate-300">
                          <input
                            type="checkbox"
                            checked={!!correccionForm.cliente_volvio}
                            onChange={(e) =>
                              actualizarCorreccionForm(
                                archivo.id,
                                "cliente_volvio",
                                e.target.checked
                              )
                            }
                          />
                          Cliente volvió al taller
                        </label>

                        <textarea
                          value={correccionForm.comentario_tecnico}
                          onChange={(e) =>
                            actualizarCorreccionForm(
                              archivo.id,
                              "comentario_tecnico",
                              e.target.value
                            )
                          }
                          rows={2}
                          placeholder="Comentario técnico interno"
                          className="md:col-span-2 w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-red-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => registrarCorreccionPostventa(archivo)}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 font-semibold"
                      >
                        Registrar postventa técnica
                      </button>
                    </div>
                  </details>

                  <details className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <summary className="cursor-pointer font-semibold text-slate-200">
                      Opciones avanzadas · Herramienta externa
                    </summary>

                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                          <p className="text-slate-500">Estado</p>
                          <p>{archivo.procesamiento_externo_estado || "No registrado"}</p>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                          <p className="text-slate-500">Herramienta</p>
                          <p>
                            {archivo.procesamiento_externo_herramienta ||
                              "No registrado"}
                          </p>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                          <p className="text-slate-500">Responsable</p>
                          <p>
                            {archivo.procesamiento_externo_responsable ||
                              "No registrado"}
                          </p>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                          <p className="text-slate-500">Fecha</p>
                          <p>
                            {archivo.procesamiento_externo_at
                              ? formatearFecha(archivo.procesamiento_externo_at)
                              : "No registrado"}
                          </p>
                        </div>

                        <div className="md:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-3">
                          <p className="text-slate-500">Observacion</p>
                          <p>
                            {archivo.procesamiento_externo_observacion ||
                              "Sin observacion"}
                          </p>
                        </div>
                      </div>

                      {archivo.procesamiento_externo_archivo_resultado && (
                        <a
                          href={fileUrl(
                            archivo.procesamiento_externo_archivo_resultado
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm"
                        >
                          Descargar resultado externo
                        </a>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 ml-1">
                            Estado
                          </label>
                          <select
                            value={procesamientoForm.procesamiento_externo_estado}
                            onChange={(e) =>
                              actualizarProcesamientoForm(
                                archivo.id,
                                "procesamiento_externo_estado",
                                e.target.value
                              )
                            }
                            className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                          >
                            {ESTADOS_PROCESAMIENTO_EXTERNO.map((estado) => (
                              <option key={estado} value={estado}>
                                {estado}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-slate-400 ml-1">
                            Herramienta
                          </label>
                          <select
                            value={
                              procesamientoForm.procesamiento_externo_herramienta
                            }
                            onChange={(e) =>
                              actualizarProcesamientoForm(
                                archivo.id,
                                "procesamiento_externo_herramienta",
                                e.target.value
                              )
                            }
                            className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                          >
                            {HERRAMIENTAS_PROCESAMIENTO_EXTERNO.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-xs text-slate-400 ml-1">
                            Observacion opcional
                          </label>
                          <textarea
                            value={
                              procesamientoForm.procesamiento_externo_observacion
                            }
                            onChange={(e) =>
                              actualizarProcesamientoForm(
                                archivo.id,
                                "procesamiento_externo_observacion",
                                e.target.value
                              )
                            }
                            rows={2}
                            className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-xs text-slate-400 ml-1">
                            Archivo resultado opcional
                          </label>
                          <input
                            type="file"
                            onChange={(e) =>
                              actualizarProcesamientoForm(
                                archivo.id,
                                "archivo_resultado",
                                e.target.files?.[0] || null
                              )
                            }
                            className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => registrarProcesamientoExterno(archivo.id)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500"
                      >
                        Registrar procesamiento externo
                      </button>

                      {historialProcesamiento.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-300">
                            Historial procesamiento externo
                          </p>

                          {historialProcesamiento.map((evento, index) => (
                            <div
                              key={`${evento.fecha || index}-${index}`}
                              className="border border-slate-800 rounded-xl p-3 text-sm"
                            >
                              <p className="font-semibold">
                                {evento.estado || "-"} -{" "}
                                {evento.herramienta || "-"}
                              </p>
                              <p className="text-xs text-slate-400">
                                Por {evento.responsable || "-"} -{" "}
                                {formatearFecha(evento.fecha)}
                              </p>
                              {evento.observacion && (
                                <p className="text-slate-300 mt-1">
                                  {evento.observacion}
                                </p>
                              )}
                              {evento.archivo && (
                                <a
                                  href={fileUrl(evento.archivo)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-block mt-2 text-blue-300 hover:text-blue-200"
                                >
                                  Ver archivo
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </details>

                  <div
                    id="post-escritura"
                    className="scroll-mt-24 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
                  >
                    <span id={`archivo-${archivo.id}-prueba`} className="block scroll-mt-24" />
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">
                          6. Prueba final después de cargar el MOD
                        </h3>
                        <p className="text-xs text-slate-500">
                          Registra el scanner y los códigos de falla antes de terminar.
                        </p>
                        <p className="text-xs font-semibold text-yellow-300 mt-2">
                          Sin esta prueba, el trabajo queda incompleto.
                        </p>
                      </div>

                      {archivo.post_escritura_estado && (
                        <span
                          className={`text-xs px-3 py-1 rounded-full border ${badgeClass(
                            archivo.post_escritura_estado
                          )}`}
                        >
                          {estadoLabel(archivo.post_escritura_estado)}
                        </span>
                      )}
                    </div>

                    {archivo.post_escritura_at && (
                      <div className="text-sm text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-3">
                        <p>
                          <strong>Registrado por:</strong>{" "}
                          {archivo.post_escritura_por || "-"}
                        </p>
                        <p>
                          <strong>Fecha:</strong>{" "}
                          {formatearFecha(archivo.post_escritura_at)}
                        </p>
                        <p>
                          <strong>Códigos de falla en prueba final:</strong>{" "}
                          {archivo.post_escritura_dtc || "-"}
                        </p>
                        <p>
                          <strong>Observación:</strong>{" "}
                          {archivo.post_escritura_observacion || "-"}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 ml-1">
                          Resultado de la prueba final
                        </label>
                        <select
                          value={postForm.post_escritura_estado}
                          onChange={(e) =>
                            actualizarPostForm(
                              archivo.id,
                              "post_escritura_estado",
                              e.target.value
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                        >
                          {RESULTADOS_POST_ESCRITURA.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 ml-1">
                          Foto o captura del scanner en la prueba final
                        </label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) =>
                            actualizarPostForm(
                              archivo.id,
                              "scanner_post_escritura",
                              e.target.files?.[0] || null
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={!!postForm.post_escritura_sin_dtc}
                        onChange={(e) =>
                          actualizarPostForm(
                            archivo.id,
                            "post_escritura_sin_dtc",
                            e.target.checked
                          )
                        }
                      />
                      Sin códigos de falla en la prueba final
                    </label>

                    {!postForm.post_escritura_sin_dtc && (
                      <textarea
                        placeholder="Códigos de falla finales. Ej: P0401, P2002, U0100..."
                        value={postForm.post_escritura_dtc}
                        onChange={(e) =>
                          actualizarPostForm(
                            archivo.id,
                            "post_escritura_dtc",
                            e.target.value
                          )
                        }
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                      />
                    )}

                    <textarea
                      placeholder="Observación final / resultado de prueba"
                      value={postForm.post_escritura_observacion}
                      onChange={(e) =>
                        actualizarPostForm(
                          archivo.id,
                          "post_escritura_observacion",
                          e.target.value
                        )
                      }
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                    />

                    <div
                      id={`archivo-${archivo.id}-cierre`}
                      className={`rounded-2xl border p-4 ${processGuardClass(
                        guardEstado
                      )}`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-bold uppercase">
                            7. Terminar trabajo técnico
                          </p>
                          <p className="mt-1 text-xs opacity-90">
                            Tiempo desde MOD listo/descargado:{" "}
                            {formatearDuracionMinutos(guardMinutos)}. Tiempo recomendado:
                            30/60/120/180 min.
                          </p>
                          <p className="mt-1 text-xs opacity-90">
                            Estado: {processGuardLabel(guardEstado)} - Resultado:{" "}
                            {archivo.resultado_tecnico || "PENDIENTE"}
                          </p>
                          <p className="mt-2 text-xs font-semibold opacity-90">
                            Esto termina el trabajo técnico; no confirma pago ni entrega.
                          </p>
                          {archivo.cierre_tecnico_at && (
                            <p className="mt-1 text-xs opacity-90">
                              Cerrado por {archivo.cierre_tecnico_por || "-"} -{" "}
                              {formatearFecha(archivo.cierre_tecnico_at)}
                            </p>
                          )}
                        </div>
                        <span className="rounded-full border border-current px-3 py-1 text-[10px] font-bold uppercase">
                          {guardAbierto ? "Abierto" : "Cerrado / sin riesgo"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="text-xs font-semibold uppercase">
                          Resultado del trabajo
                          <select
                            value={cierreForm.resultado_tecnico}
                            onChange={(e) =>
                              actualizarCierreTecnicoForm(
                                archivo.id,
                                "resultado_tecnico",
                                e.target.value
                              )
                            }
                            className="mt-1 w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                          >
                            {RESULTADOS_TECNICOS_CIERRE.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="text-xs font-semibold uppercase">
                          Observación del trabajo terminado
                          <textarea
                            value={cierreForm.observacion_cierre_tecnico}
                            onChange={(e) =>
                              actualizarCierreTecnicoForm(
                                archivo.id,
                                "observacion_cierre_tecnico",
                                e.target.value
                              )
                            }
                            rows={2}
                            className="mt-1 w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                            placeholder="Resultado aplicado, prueba, pendiente, correccion o nueva lectura."
                          />
                        </label>
                      </div>

                      <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-3">
                        <p className="mb-2 text-xs font-black uppercase text-slate-300">
                          Qué falta para terminar
                        </p>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {checklistTecnico.map((item) => (
                            <div
                              key={`${archivo.id}-check-${item.key}`}
                              className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                                item.ok
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                                  : "border-amber-500/30 bg-amber-500/10 text-amber-100"
                              }`}
                            >
                              {item.ok ? "OK" : "Pendiente"} - {item.label}
                            </div>
                          ))}
                        </div>
                      </div>

                      {legacySinResponsable && cierreLegacyAutorizado && (
                        <p className="mt-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs font-semibold text-yellow-100">
                          Orden antigua sin responsable por ID. Se permitira cierre
                          autorizado y quedara registrado en bitacora.
                        </p>
                      )}

                      {archivo.creado_en_modo_urgente &&
                        (archivo.requiere_regularizacion ||
                          archivo.regularizar_antes_de_entrega ||
                          normalizarLista(archivo.regularizacion_pendientes).length > 0) && (
                          <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3">
                            <p className="text-xs font-black uppercase text-amber-100">
                              Este trabajo urgente aún tiene datos por regularizar.
                            </p>
                            {puedeUrgentePorAsignar ? (
                              <>
                                <label className="mt-3 flex items-start gap-2 text-xs font-bold text-amber-100">
                                  <input
                                    type="checkbox"
                                    checked={
                                      cierreForm.override_regularizacion === true
                                    }
                                    onChange={(e) =>
                                      actualizarCierreTecnicoForm(
                                        archivo.id,
                                        "override_regularizacion",
                                        e.target.checked
                                      )
                                    }
                                  />
                                  Autorizar cierre técnico con justificación
                                </label>
                                {cierreForm.override_regularizacion && (
                                  <textarea
                                    value={cierreForm.motivo_override || ""}
                                    onChange={(e) =>
                                      actualizarCierreTecnicoForm(
                                        archivo.id,
                                        "motivo_override",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Motivo obligatorio del override"
                                    className="mt-3 w-full rounded-xl border border-amber-400 bg-slate-950 p-3 text-sm text-white"
                                  />
                                )}
                              </>
                            ) : (
                              <p className="mt-2 text-xs font-semibold text-amber-100">
                                Regulariza los datos o solicita autorización a jefatura.
                              </p>
                            )}
                          </div>
                        )}

                      <button
                        type="button"
                        onClick={() => registrarCierreTecnico(archivo)}
                        disabled={
                          cierreForm.resultado_tecnico === "OK" && !puedeFinalizar
                        }
                        className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Guardar trabajo técnico terminado
                      </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2">
                      <button
                        onClick={() => registrarPostEscritura(archivo.id)}
                        disabled={
                          !archivo.archivo_modificado &&
                          postForm.post_escritura_estado !== "NO_APLICA"
                        }
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40"
                      >
                        Registrar prueba final
                      </button>

                      <button
                        onClick={() => solicitarCorreccion(archivo.id)}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500"
                      >
                        Pedir corrección
                      </button>

                      <button
                        onClick={() => finalizarTecnico(archivo)}
                        disabled={!puedeFinalizar}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Dejar listo para entrega
                      </button>
                    </div>

                    {!puedeFinalizar && (
                      <p className="text-xs text-yellow-300">
                        Para dejarlo listo debes completar la prueba final con resultado OK.
                      </p>
                    )}
                  </div>

                  <details className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <summary className="cursor-pointer font-semibold text-slate-200">
                      Opciones avanzadas · Archivar trabajo
                    </summary>

                    <div className="mt-3 space-y-3">
                    <p className="text-xs text-slate-500">
                      Archivar reemplaza eliminar. El registro queda guardado
                      para auditoría, pero sale del listado activo.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        value={archForm.archivado_motivo}
                        onChange={(e) =>
                          actualizarArchivarForm(
                            archivo.id,
                            "archivado_motivo",
                            e.target.value
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                      >
                        <option value="">-- Motivo de archivado --</option>
                        {MOTIVOS_ARCHIVO.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>

                      <input
                        value={archForm.archivado_comentario}
                        onChange={(e) =>
                          actualizarArchivarForm(
                            archivo.id,
                            "archivado_comentario",
                            e.target.value
                          )
                        }
                        placeholder="Comentario opcional"
                        className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                      />
                    </div>

                    <button
                      onClick={() => archivarArchivo(archivo.id)}
                      className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm"
                    >
                      Archivar
                    </button>
                    </div>
                  </details>
                </article>
              );
                })()
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
