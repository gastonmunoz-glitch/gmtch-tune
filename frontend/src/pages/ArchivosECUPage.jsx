import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const ESTADOS = {
  ORIGINAL_CARGADO: "Original cargado",
  NOTIFICADO_MASTER: "Master notificado",
  MODIFICADO_LISTO: "MOD listo",
  NOTIFICADO_SLAVE: "Slave notificado",
  POST_ESCRITURA_PENDIENTE: "Post escritura pendiente",
  POST_ESCRITURA_OK: "Post escritura OK",
  REQUIERE_CORRECCION: "Requiere corrección",
  FINALIZADO: "Finalizado",
  FINALIZADO_TECNICO: "Finalizado técnico",
  ARCHIVADO: "Archivado",
};

const RESULTADOS_POST_ESCRITURA = [
  { value: "OK", label: "OK - Sin problemas" },
  { value: "REQUIERE_CORRECCION", label: "Requiere corrección ECU" },
  { value: "FALLO_ESCRITURA", label: "Falló escritura" },
  { value: "EN_PRUEBA", label: "Vehículo en prueba" },
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
  { value: "PENDIENTE_POST", label: "Post escritura pendiente" },
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
    label: "Tuner / Master",
    roles: ["TUNER", "SUPERVISOR", "OWNER"],
  },
  {
    campo: "operador_ecu_asignado_a",
    label: "Operador ECU",
    roles: ["OPERADOR_ECU", "TUNER", "SUPERVISOR", "OWNER"],
  },
  {
    campo: "slave_asignado_a",
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

const SERVICIO_PERSONALIZADO = "Otro / personalizado";

const SERVICIOS_FILE_SERVICE = [
  {
    grupo: "Reprogramaci\u00F3n / Performance",
    opciones: [
      { value: "Stage 1", label: "\u2699\uFE0F Stage 1" },
      { value: "Stage 2", label: "\uD83D\uDD25 Stage 2" },
      { value: "Stage 3 / Competici\u00F3n", label: "\uD83C\uDFC1 Stage 3 / Competici\u00F3n" },
      { value: "Eco Tune / Consumo", label: "\uD83C\uDF31 Eco Tune / Consumo" },
      { value: "Pops & Bangs", label: "\uD83D\uDCA5 Pops & Bangs" },
      { value: "Hardcut / Limitador RPM", label: "\uD83E\uDDE8 Hardcut / Limitador RPM" },
      { value: "Launch Control", label: "\uD83D\uDE80 Launch Control" },
      { value: "Vmax / Limitador velocidad", label: "\uD83C\uDFCE\uFE0F Vmax / Limitador velocidad" },
    ],
  },
  {
    grupo: "Sistemas anticontaminaci\u00F3n / gesti\u00F3n t\u00E9cnica",
    opciones: [
      { value: "DPF / FAP", label: "\uD83C\uDF2B\uFE0F DPF / FAP" },
      { value: "EGR", label: "\u267B\uFE0F EGR" },
      { value: "SCR / AdBlue / DEF", label: "\uD83D\uDCA7 SCR / AdBlue / DEF" },
      { value: "NOx", label: "\uD83E\uDDEA NOx" },
      { value: "TVA / Mariposa admisi\u00F3n", label: "\uD83E\uDEC1 TVA / Mariposa admisi\u00F3n" },
      { value: "Lambda / O2", label: "\uD83E\uDDEF Lambda / O2" },
      { value: "DTC / revisi\u00F3n de fallas", label: "\uD83E\uDDE0 DTC / revisi\u00F3n de fallas" },
    ],
  },
  {
    grupo: "Combinaciones frecuentes",
    opciones: [
      { value: "Stage 1 + DPF/FAP", label: "\u2699\uFE0F Stage 1 + DPF/FAP" },
      { value: "Stage 1 + EGR", label: "\u2699\uFE0F Stage 1 + EGR" },
      { value: "Stage 1 + DPF/FAP + EGR", label: "\u2699\uFE0F Stage 1 + DPF/FAP + EGR" },
      { value: "Stage 1 + SCR/AdBlue", label: "\u2699\uFE0F Stage 1 + SCR/AdBlue" },
      { value: "Stage 1 + DPF/FAP + EGR + SCR/AdBlue", label: "\u2699\uFE0F Stage 1 + DPF/FAP + EGR + SCR/AdBlue" },
      { value: "Stage 2 + DPF/FAP", label: "\uD83D\uDD25 Stage 2 + DPF/FAP" },
      { value: "Stage 2 + EGR", label: "\uD83D\uDD25 Stage 2 + EGR" },
      { value: "Stage 2 + DPF/FAP + EGR", label: "\uD83D\uDD25 Stage 2 + DPF/FAP + EGR" },
      { value: "Stage 2 + SCR/AdBlue", label: "\uD83D\uDD25 Stage 2 + SCR/AdBlue" },
      { value: "Stage 2 + DPF/FAP + EGR + SCR/AdBlue", label: "\uD83D\uDD25 Stage 2 + DPF/FAP + EGR + SCR/AdBlue" },
    ],
  },
  {
    grupo: "Electr\u00F3nica / m\u00F3dulos",
    opciones: [
      { value: "Clonaci\u00F3n ECU", label: "\uD83E\uDDEC Clonaci\u00F3n ECU" },
      { value: "Clonaci\u00F3n TCU", label: "\uD83E\uDDEC Clonaci\u00F3n TCU" },
      { value: "IMMO / Inmovilizador", label: "\uD83D\uDD10 IMMO / Inmovilizador" },
      { value: "Airbag / Crash Data", label: "\uD83E\uDDEF Airbag / Crash Data" },
      { value: "Adaptaci\u00F3n ECU usada", label: "\uD83E\uDDE9 Adaptaci\u00F3n ECU usada" },
      { value: "SW Update / Downgrade", label: "\uD83D\uDD01 SW Update / Downgrade" },
      { value: "Correcci\u00F3n de archivo", label: "\uD83D\uDEE0\uFE0F Correcci\u00F3n de archivo" },
      { value: "Archivo de prueba / revisi\u00F3n", label: "\uD83E\uDDEA Archivo de prueba / revisi\u00F3n" },
      { value: "File Service personalizado", label: "\uD83E\uDDE9 File Service personalizado" },
      { value: SERVICIO_PERSONALIZADO, label: "\u270D\uFE0F Otro / personalizado" },
    ],
  },
];

const RUTA_DIAGNOSTICO = "/diagnostico";

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

const badgeClass = (estado) => {
  switch (estado) {
    case "ORIGINAL_CARGADO":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    case "NOTIFICADO_MASTER":
      return "bg-purple-500/15 text-purple-300 border-purple-500/30";
    case "MODIFICADO_LISTO":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "NOTIFICADO_SLAVE":
      return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
    case "POST_ESCRITURA_PENDIENTE":
      return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
    case "POST_ESCRITURA_OK":
      return "bg-green-500/15 text-green-300 border-green-500/30";
    case "REQUIERE_CORRECCION":
      return "bg-red-500/15 text-red-300 border-red-500/30";
    case "FINALIZADO":
    case "FINALIZADO_TECNICO":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    case "ARCHIVADO":
      return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
    default:
      return "bg-slate-700 text-slate-200 border-slate-600";
  }
};

const estadoLabel = (estado) => {
  return ESTADOS[estado] || estado || "Sin estado";
};

const obtenerResponsablePrincipal = (archivo) => {
  return (
    archivo.tuner_asignado_a ||
    archivo.operador_ecu_asignado_a ||
    archivo.slave_asignado_a ||
    "Sin responsable"
  );
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
  if (archivo.post_escritura_estado === "OK") return "Finalizar técnico";
  if (archivo.archivo_modificado && archivo.estado === "MODIFICADO_LISTO") {
    return "Notificar operador ECU";
  }
  if (["NOTIFICADO_SLAVE", "POST_ESCRITURA_PENDIENTE"].includes(archivo.estado)) {
    return "Registrar post escritura";
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
  const [archivos, setArchivos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [bloqueoDiagnostico, setBloqueoDiagnostico] = useState(null);

  const [filtro, setFiltro] = useState("PENDIENTES");
  const [busqueda, setBusqueda] = useState("");

  const [nuevo, setNuevo] = useState({
    ordenId: "",
    prioridad: "MEDIA",
    tipo_servicio: "",
    tipo_servicio_personalizado: "",
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
    archivo: null,
  });

  const [modForms, setModForms] = useState({});
  const [procesamientoForms, setProcesamientoForms] = useState({});
  const [postForms, setPostForms] = useState({});
  const [correccionForms, setCorreccionForms] = useState({});
  const [archivarForms, setArchivarForms] = useState({});

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

  const mostrarError = (err, fallback = "Error inesperado") => {
    console.error(err);

    const data = err.response?.data;

    if (data?.bloqueo === "DIAGNOSTICO_OBLIGATORIO") {
      setBloqueoDiagnostico(data);
      setError(data.error || fallback);
      return;
    }

    setError(data?.error || err.message || fallback);
  };

  const limpiarMensajes = () => {
    setMensaje("");
    setError("");
    setBloqueoDiagnostico(null);
  };

  const crearArchivo = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!nuevo.ordenId) {
      setError("Debes seleccionar una orden");
      return;
    }

    const tipoServicio =
      nuevo.tipo_servicio === SERVICIO_PERSONALIZADO
        ? limpiar(nuevo.tipo_servicio_personalizado)
        : limpiar(nuevo.tipo_servicio);

    if (!tipoServicio) {
      setError("Debes seleccionar un tipo de servicio para File Service.");
      return;
    }

    if (
      nuevo.tipo_servicio === SERVICIO_PERSONALIZADO &&
      !limpiar(nuevo.tipo_servicio_personalizado)
    ) {
      setError("Debes escribir el servicio personalizado para File Service.");
      return;
    }

    if (!nuevo.archivo) {
      setError("Debes cargar el archivo original");
      return;
    }

    try {
      setGuardando(true);

      const fd = new FormData();

      Object.entries(nuevo).forEach(([key, value]) => {
        if (key === "archivo") return;
        if (key === "tipo_servicio_personalizado") return;
        if (key === "tipo_servicio") {
          fd.append(key, tipoServicio);
          return;
        }
        fd.append(key, value ?? "");
      });

      fd.append("archivo", nuevo.archivo);

      await api.post("/archivos-ecu", fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMensaje("Archivo original enviado correctamente a File Service");

      setNuevo({
        ordenId: "",
        prioridad: "MEDIA",
        tipo_servicio: "",
        tipo_servicio_personalizado: "",
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
        archivo: null,
      });

      e.target.reset();

      await cargarDatos();
    } catch (err) {
      mostrarError(err, "Error creando File Service");
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
      setError("Este File Service no tiene orden asociada para postventa.");
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

  const asignarResponsableFileService = async (archivoId, campo, valor) => {
    limpiarMensajes();

    try {
      await api.patch(`/archivos-ecu/${archivoId}`, {
        [campo]: valor,
      });

      setMensaje("Responsable File Service actualizado");
      await cargarDatos();
    } catch (err) {
      mostrarError(err, "Error asignando responsable File Service");
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

    if (!form.scanner_post_escritura) {
      setError("La foto/captura del scanner post escritura es obligatoria");
      return;
    }

    if (!form.post_escritura_estado) {
      setError("Debes seleccionar resultado post escritura");
      return;
    }

    if (!form.post_escritura_sin_dtc && !limpiar(form.post_escritura_dtc)) {
      setError(
        "Debes ingresar DTC post escritura o marcar SIN DTC POST ESCRITURA"
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
      fd.append("scanner_post_escritura", form.scanner_post_escritura);

      await api.post(`/archivos-ecu/${archivoId}/post-escritura`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMensaje("Post escritura registrado correctamente");

      setPostForms((prev) => ({
        ...prev,
        [archivoId]: {},
      }));

      await cargarDatos();
    } catch (err) {
      mostrarError(err, "Error registrando post escritura");
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

    if (archivo.post_escritura_estado !== "OK") {
      setError(
        "No puedes finalizar sin post escritura OK, scanner post escritura y DTC registrados"
      );
      return;
    }

    const confirmar = window.confirm(
      "¿Confirmas finalizar técnicamente este File Service? Esto NO cierra el cobro ni la entrega comercial."
    );

    if (!confirmar) return;

    try {
      await api.patch(`/archivos-ecu/${archivo.id}`, {
        estado: "FINALIZADO_TECNICO",
        correccion_pendiente: false,
      });

      setMensaje("File Service finalizado técnicamente");
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
      "¿Seguro que quieres archivar este File Service? No se eliminará, pero saldrá del listado activo."
    );

    if (!confirmar) return;

    try {
      await api.post(`/archivos-ecu/${archivoId}/archivar`, {
        archivado_motivo: form.archivado_motivo,
        archivado_comentario: form.archivado_comentario || "",
      });

      setMensaje("File Service archivado correctamente");
      await cargarDatos();
    } catch (err) {
      mostrarError(err, "Error archivando File Service");
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
            <h1 className="text-3xl font-bold">File Service ECU</h1>
            <p className="text-slate-400 mt-1">
              Control de original, MOD, correcciones, post escritura y cierre técnico.
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
            Regla operativa File Service
          </p>
          <p className="mt-2 text-sm md:text-base font-semibold text-amber-50">
            Todo archivo recibido por WhatsApp debe quedar registrado aquí. Si no está en File Service, no existe oficialmente.
          </p>
        </section>

        {mensaje && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 p-4 rounded-2xl">
            {mensaje}
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
          <h2 className="text-xl font-semibold mb-4">Nueva solicitud File Service</h2>

          <form onSubmit={crearArchivo} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="text-xs text-slate-400 ml-1">Orden de trabajo</label>
              <select
                value={nuevo.ordenId}
                onChange={(e) =>
                  setNuevo((prev) => ({ ...prev, ordenId: e.target.value }))
                }
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
              >
                <option value="">-- Selecciona una orden --</option>
                {ordenes.map((orden) => (
                  <option key={orden.id} value={orden.id}>
                    {ordenLabel(orden)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 ml-1">Prioridad</label>
              <select
                value={nuevo.prioridad}
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

            <div>
              <label className="text-xs text-slate-400 ml-1">Tipo servicio</label>
              <select
                value={nuevo.tipo_servicio}
                onChange={(e) =>
                  setNuevo((prev) => ({
                    ...prev,
                    tipo_servicio: e.target.value,
                    tipo_servicio_personalizado:
                      e.target.value === SERVICIO_PERSONALIZADO
                        ? prev.tipo_servicio_personalizado
                        : "",
                  }))
                }
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
              >
                <option value="">-- Selecciona servicio --</option>
                {SERVICIOS_FILE_SERVICE.map((grupo) => (
                  <optgroup key={grupo.grupo} label={grupo.grupo}>
                    {grupo.opciones.map((servicio) => (
                      <option key={servicio.value} value={servicio.value}>
                        {servicio.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-2">
                Los servicios relacionados con sistemas de emisiones deben
                {"gestionarse seg\u00FAn normativa aplicable y uso autorizado."}
              </p>
            </div>

            {nuevo.tipo_servicio === SERVICIO_PERSONALIZADO && (
              <div>
                <label className="text-xs text-slate-400 ml-1">
                  Servicio personalizado
                </label>
                <input
                  value={nuevo.tipo_servicio_personalizado}
                  onChange={(e) =>
                    setNuevo((prev) => ({
                      ...prev,
                      tipo_servicio_personalizado: e.target.value,
                    }))
                  }
                  placeholder="Describe el servicio requerido"
                  className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                />
              </div>
            )}

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
                Archivo original
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
                {guardando ? "Guardando..." : "Enviar a File Service"}
              </button>

              <p className="text-xs text-slate-500 mt-3">
                Regla estricta: antes de enviar a File Service debe existir
                diagnóstico obligatorio con scanner y DTC o SIN DTC.
              </p>
            </div>
          </form>
        </section>

        <section className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold">Trabajos File Service</h2>
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
              No hay archivos ECU activos con este filtro.
            </div>
          )}

          <div className="space-y-5">
            {archivosFiltrados.map((archivo) => {
              const { textoCliente, textoVehiculo } =
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

              const puedeFinalizar = archivo.post_escritura_estado === "OK";
              const responsablePrincipal = obtenerResponsablePrincipal(archivo);
              const proximaAccion = obtenerProximaAccion(archivo);

              return (
                <article
                  key={archivo.id}
                  className="border border-slate-800 bg-slate-950/70 rounded-3xl p-5 space-y-5"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2 items-center mb-2">
                        <span className="text-lg font-bold">
                          File #{archivo.id}
                        </span>

                        <span
                          className={`text-xs px-3 py-1 rounded-full border ${badgeClass(
                            archivo.estado
                          )}`}
                        >
                          {estadoLabel(archivo.estado)}
                        </span>

                        {archivo.correccion_pendiente && (
                          <span className="text-xs px-3 py-1 rounded-full border bg-red-500/15 text-red-300 border-red-500/30">
                            Corrección pendiente
                          </span>
                        )}
                      </div>

                      <p className="text-slate-200">{textoCliente}</p>
                      <p className="text-slate-400 text-sm">{textoVehiculo}</p>
                      <p className="text-slate-500 text-sm">
                        Orden #{archivo.ordenId} · Servicio:{" "}
                        {archivo.tipo_servicio || "-"}
                      </p>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
                          <p className="text-xs uppercase text-slate-500">
                            Responsable principal
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
                      <div className="mt-3 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3 text-left md:text-right">
                        <p className="font-semibold text-purple-200">
                          Master notificado internamente
                        </p>
                        <p>Sí / No: {archivo.notificado_master_at ? "Sí" : "No"}</p>
                        <p>
                          Fecha:{" "}
                          {archivo.notificado_master_at
                            ? formatearFecha(archivo.notificado_master_at)
                            : "No registrado"}
                        </p>
                        <p>
                          Por:{" "}
                          {archivo.notificado_master_por || "No registrado"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <details className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-300">
                      Responsables File Service
                    </summary>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      {RESPONSABLES_FILE_SERVICE.map((responsable) => {
                        const opciones = usuariosPorRoles(responsable.roles);
                        const valorActual = archivo[responsable.campo] || "";
                        const existeActual = opciones.some((usuario) => {
                          const username =
                            usuario.username || usuario.nombre || usuario.email;
                          return username === valorActual;
                        });

                        return (
                          <label
                            key={`${archivo.id}-${responsable.campo}`}
                            className="text-sm text-slate-300"
                          >
                            <span className="block text-xs text-slate-500 mb-1">
                              {responsable.label}
                            </span>
                            <select
                              value={valorActual}
                              onChange={(e) =>
                                asignarResponsableFileService(
                                  archivo.id,
                                  responsable.campo,
                                  e.target.value
                                )
                              }
                              className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500"
                            >
                              <option value="">Sin asignar</option>
                              {valorActual && !existeActual && (
                                <option value={valorActual}>{valorActual}</option>
                              )}
                              {opciones.map((usuario) => {
                                const username =
                                  usuario.username ||
                                  usuario.nombre ||
                                  usuario.email ||
                                  "";

                                if (!username) return null;

                                return (
                                  <option
                                    key={`${responsable.campo}-${usuario.id || username}`}
                                    value={username}
                                  >
                                    {usuario.nombre || username}
                                    {usuario.rol ? ` (${usuario.rol})` : ""}
                                  </option>
                                );
                              })}
                            </select>
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

                    {archivo.post_escritura_scanner && (
                      <a
                        href={fileUrl(archivo.post_escritura_scanner)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-sm"
                      >
                        Ver scanner post escritura
                      </a>
                    )}
                  </div>

                  {versiones.length > 0 && (
                    <details className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                      <summary className="cursor-pointer font-semibold">
                        Historial de MOD cargados
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

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h3 className="font-semibold">Subir MOD / nueva versión</h3>

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
                        Notificaciones / WhatsApp
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
                        La notificacion interna se registra al crear el File Service.
                        WhatsApp es un aviso manual opcional.
                      </p>
                      </div>
                    </details>
                  </div>

                  <details className="bg-red-950/30 border border-red-500/30 rounded-2xl p-4">
                    <summary className="cursor-pointer font-semibold text-red-100">
                      Solicitar corrección / postventa técnica interna
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
                      Procesamiento externo
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

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">
                          Post escritura obligatorio
                        </h3>
                        <p className="text-xs text-slate-500">
                          Sin scanner post escritura y DTC/SIN DTC no se permite
                          finalizar.
                        </p>
                        <p className="text-xs font-semibold text-yellow-300 mt-2">
                          Un archivo sin post escritura registrada es un trabajo inconcluso.
                        </p>
                      </div>

                      {archivo.post_escritura_estado && (
                        <span
                          className={`text-xs px-3 py-1 rounded-full border ${badgeClass(
                            archivo.estado
                          )}`}
                        >
                          {archivo.post_escritura_estado}
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
                          <strong>DTC post escritura:</strong>{" "}
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
                          Resultado post escritura
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
                          Foto/captura scanner post escritura
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
                      SIN DTC POST ESCRITURA
                    </label>

                    {!postForm.post_escritura_sin_dtc && (
                      <textarea
                        placeholder="DTC post escritura. Ej: P0401, P2002, U0100..."
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

                    <div className="flex flex-col md:flex-row gap-2">
                      <button
                        onClick={() => registrarPostEscritura(archivo.id)}
                        disabled={!archivo.archivo_modificado}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40"
                      >
                        Registrar post escritura
                      </button>

                      <button
                        onClick={() => solicitarCorreccion(archivo.id)}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500"
                      >
                        Solicitar corrección / V2
                      </button>

                      <button
                        onClick={() => finalizarTecnico(archivo)}
                        disabled={!puedeFinalizar}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Finalizar técnico
                      </button>
                    </div>

                    {!puedeFinalizar && (
                      <p className="text-xs text-yellow-300">
                        Finalizar técnico está bloqueado hasta registrar post
                        escritura OK.
                      </p>
                    )}
                  </div>

                  <details className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <summary className="cursor-pointer font-semibold text-slate-200">
                      Archivar File Service
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
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
