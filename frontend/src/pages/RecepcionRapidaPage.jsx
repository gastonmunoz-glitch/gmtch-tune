import { useEffect, useRef, useState } from "react";
import api from "../services/api";

const ESTADO_ORDEN_INICIAL = "RECEPCIONADO";
const ESTADO_ORDEN_FINAL_RECEPCION = "PARA_DIAGNOSTICO";

const ESTADO_INICIAL_CLIENTE = {
  nombre: "",
  telefono: "",
  categoria_cliente: "NORMAL",
};

const ESTADO_INICIAL_VEHICULO = {
  patente: "",
  marca: "",
  modelo: "",
  anio: "",
  vin: "",
};

const ESTADO_INICIAL_ORDEN = {
  kilometraje: "",
  servicio_solicitado: "",
  sintomas_cliente: "",
  observaciones_visuales: "",
  prioridad: "MEDIA",
  responsable_tecnico_id: "",
  responsable_tecnico_texto: "",
  requiere_scanner: true,
  requiere_lectura_ecu: true,
  requiere_mecanica: false,
  monto_total: "",
};

const leerStorage = (clave) => {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
};

const escribirStorage = (clave, valor) => {
  try {
    localStorage.setItem(clave, String(valor));
  } catch {
    // Evita errores si el navegador bloquea localStorage.
  }
};

const borrarStorage = (clave) => {
  try {
    localStorage.removeItem(clave);
  } catch {
    // Evita errores si el navegador bloquea localStorage.
  }
};

const limpiarStorageFlujo = () => {
  borrarStorage("gmtch_clienteId");
  borrarStorage("gmtch_vehiculoId");
  borrarStorage("gmtch_ordenId");
  borrarStorage("gmtch_paso_recepcion");
};

const calcularPasoInicial = () => {
  const pasoGuardado = Number(leerStorage("gmtch_paso_recepcion") || "1");

  if (!pasoGuardado || pasoGuardado < 1 || pasoGuardado > 6) return 1;

  return pasoGuardado;
};

const normalizarPatente = (valor) => {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/[\s.-]/g, "");
};

const formatearFecha = (fecha) => {
  if (!fecha) return "No registrada";

  try {
    return new Date(fecha).toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return fecha;
  }
};

const texto = (valor, fallback = "No registrado") => {
  const limpio = String(valor ?? "").trim();
  return limpio || fallback;
};

const snapshotUsuario = (usuario) =>
  usuario?.username || usuario?.nombre || usuario?.email || "";

const usuarioLocalActual = () => ({
  id: leerStorage("userId") || "",
  username: leerStorage("username") || "",
  nombre: leerStorage("nombre") || "",
  email: "",
});

const obtenerCampoResponsablePorServicio = (servicio, requiereMecanica = false) => {
  const valor = String(servicio || "").toUpperCase();

  if (
    requiereMecanica ||
    valor.includes("MECAN") ||
    valor.includes("MANTEN") ||
    valor.includes("ACEITE") ||
    valor.includes("CAMBIO") ||
    valor.includes("LIMPIEZA DPF") ||
    valor.includes("REGENER") ||
    valor.includes("REVISION MECANICA") ||
    valor.includes("REVISIÓN MECÁNICA")
  ) {
    return {
      campoId: "mecanico_asignado_a_id",
      campoTexto: "mecanico_asignado_a",
    };
  }

  if (
    valor.includes("ECU") ||
    valor.includes("TCU") ||
    valor.includes("FILE SERVICE") ||
    valor.includes("STAGE") ||
    valor.includes("DPF") ||
    valor.includes("EGR") ||
    valor.includes("SCR") ||
    valor.includes("ADBLUE") ||
    valor.includes("NOX") ||
    valor.includes("LAMBDA") ||
    valor.includes("IMMO") ||
    valor.includes("VMAX") ||
    valor.includes("POPS") ||
    valor.includes("LAUNCH") ||
    valor.includes("HARDCUT")
  ) {
    return {
      campoId: "operador_ecu_asignado_a_id",
      campoTexto: "operador_ecu_asignado_a",
    };
  }

  if (valor === "OTRO" || valor.includes("OTRO")) {
    return {
      campoId: "supervisor_asignado_a_id",
      campoTexto: "supervisor_asignado_a",
    };
  }

  return {
    campoId: "diagnostico_asignado_a_id",
    campoTexto: "diagnostico_asignado_a",
  };
};

const obtenerCategoriaServicioPorCampo = (campoId) => {
  if (campoId === "diagnostico_asignado_a_id") return "DIAGNOSTICO";
  if (campoId === "operador_ecu_asignado_a_id") return "ECU_TCU_FILE_SERVICE";
  if (campoId === "mecanico_asignado_a_id") return "MECANICA";
  return "OTRO";
};

const obtenerOrdenesVehiculo = (vehiculo) => {
  const ordenes =
    vehiculo?.OrdenTrabajos ||
    vehiculo?.Ordenes ||
    vehiculo?.ordenes ||
    vehiculo?.ordenTrabajos ||
    [];

  return Array.isArray(ordenes) ? ordenes : [];
};

const obtenerClienteVehiculo = (vehiculo) => {
  return vehiculo?.Cliente || vehiculo?.cliente || vehiculo?.ClienteAsociado || null;
};

const CATEGORIAS_CLIENTE = [
  { value: "NORMAL", label: "Normal" },
  { value: "VIP", label: "VIP" },
  { value: "FLOTA", label: "Flota" },
  { value: "TALLER_ALIADO", label: "Taller aliado" },
  { value: "GARANTIA_RECLAMO", label: "Garantía / reclamo" },
  { value: "INTERNO", label: "Interno" },
];

const GUIA_RECEPCION_LUNES = [
  "Paso 1 Cliente",
  "Paso 2 Vehículo",
  "Paso 3 Motivo / Servicio",
  "Paso 4 Prioridad / Responsable",
  "Paso 5 Crear orden",
];

const SERVICIOS_ORDEN_SUGERIDOS = [
  "Diagnóstico profesional",
  "Revisión DTC",
  "Stage 1",
  "Stage 2",
  "Stage 3 / proyecto especial",
  "Reprogramación ECU",
  "Reprogramación TCU",
  "File Service",
  "DPF/FAP",
  "EGR",
  "SCR/AdBlue/DEF",
  "NOx",
  "Lambda/O2",
  "TVA",
  "IMMO",
  "Vmax",
  "Pops & Bangs",
  "Launch Control",
  "Hardcut",
  "Mecánica asociada al servicio técnico",
  "Mecánica independiente / mantención",
  "Postventa técnica / corrección",
];

const ROLES_RESPONSABLE_TECNICO = [
  "OPERADOR_SCANNER",
  "OPERADOR_ECU",
  "TUNER",
  "MECANICO",
  "SUPERVISOR",
  "OWNER",
];

const normalizarCategoriaCliente = (categoria) => {
  const valor = String(categoria || "NORMAL").trim().toUpperCase();
  if (["MAYORISTA", "PROVEEDOR"].includes(valor)) return "TALLER_ALIADO";

  return CATEGORIAS_CLIENTE.some((item) => item.value === valor) ? valor : "NORMAL";
};

const prioridadSugeridaPorCategoria = (categoria) => {
  const mapa = {
    NORMAL: "MEDIA",
    VIP: "ALTA",
    FLOTA: "ALTA",
    TALLER_ALIADO: "ALTA",
    GARANTIA_RECLAMO: "URGENTE",
    INTERNO: "BAJA",
  };

  return mapa[normalizarCategoriaCliente(categoria)] || "MEDIA";
};

const normalizarListaResponsables = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.usuarios)) return data.usuarios;
  if (Array.isArray(data?.responsables)) return data.responsables;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

function RecepcionRapidaPage() {
  const fotosInputRef = useRef(null);
  const rolUsuario = String(leerStorage("rol") || "").toUpperCase();
  const esRecepcionEmergenciaOperador = rolUsuario === "OPERADOR_ECU";

  const [paso, setPaso] = useState(() => calcularPasoInicial());
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [usuariosResponsables, setUsuariosResponsables] = useState([]);
  const [errorResponsables, setErrorResponsables] = useState("");
  const [cargandoResponsables, setCargandoResponsables] = useState(true);

  const [patenteBusqueda, setPatenteBusqueda] = useState("");
  const [vehiculoEncontrado, setVehiculoEncontrado] = useState(null);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  const [cliente, setCliente] = useState({ ...ESTADO_INICIAL_CLIENTE });
  const [clienteId, setClienteId] = useState(() => leerStorage("gmtch_clienteId"));

  const [vehiculo, setVehiculo] = useState({ ...ESTADO_INICIAL_VEHICULO });
  const [vehiculoId, setVehiculoId] = useState(() => leerStorage("gmtch_vehiculoId"));

  const [orden, setOrden] = useState({ ...ESTADO_INICIAL_ORDEN });
  const [ordenId, setOrdenId] = useState(() => leerStorage("gmtch_ordenId"));
  const [origenRecepcion, setOrigenRecepcion] = useState("");

  const [fotosArchivos, setFotosArchivos] = useState([]);

  const etiquetas = ["Buscar patente", "Cliente", "Vehículo", "Servicio", "Fotos", "Cierre"];

  useEffect(() => {
    escribirStorage("gmtch_paso_recepcion", paso);
  }, [paso]);

  useEffect(() => {
    let activo = true;

    setCargandoResponsables(true);
    api
      .get("/usuarios/responsables")
      .then((res) => {
        if (!activo) return;
        setUsuariosResponsables(normalizarListaResponsables(res.data));
        setErrorResponsables("");
        setCargandoResponsables(false);
      })
      .catch(() => {
        if (!activo) return;
        setUsuariosResponsables([]);
        setErrorResponsables(
          "No se pudieron cargar responsables activos. Revisa usuarios activos antes de crear la orden."
        );
        setCargandoResponsables(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  const mostrarAviso = (tipo, mensaje) => {
    setAviso({ tipo, mensaje });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const limpiarAviso = () => {
    setAviso(null);
  };

  const siguiente = () => {
    limpiarAviso();
    setPaso((p) => Math.min(6, p + 1));
  };

  const anterior = () => {
    limpiarAviso();
    setPaso((p) => Math.max(1, p - 1));
  };

  const limpiarNumero = (valor) => {
    return String(valor ?? "")
      .replace(/\./g, "")
      .replace(/,/g, "")
      .trim();
  };

  const idParaBackend = (id) => {
    if (id === null || id === undefined || id === "") return null;

    const textoId = String(id);

    if (/^\d+$/.test(textoId)) {
      return Number(textoId);
    }

    return textoId;
  };

  const usuariosTecnicosActivos = usuariosResponsables.filter(
    (usuario) =>
      usuario.activo !== false &&
      ROLES_RESPONSABLE_TECNICO.includes(String(usuario.rol || "").toUpperCase())
  );

  const usuarioResponsableSeleccionado = () =>
    usuariosTecnicosActivos.find(
      (usuario) => String(usuario.id) === String(orden.responsable_tecnico_id)
    );

  const mensajeErrorResponsable = (err, fallback) => {
    const data = err.response?.data || {};
    const codigo = String(data.error || data.codigo || "").toUpperCase();

    if (codigo === "RESPONSABLE_BLOQUEADO") {
      const pendientes = Array.isArray(data.pendientes_criticos)
        ? data.pendientes_criticos.slice(0, 3)
        : [];
      const detalle = pendientes
        .map((item) => `- ${item.titulo || item.tipo}: ${item.accion_url || ""}`)
        .join("\n");

      return [
        data.message ||
          "No puedes asignar más trabajo a este responsable porque tiene pendientes críticos sin resolver.",
        detalle,
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (codigo === "RESPONSABLE_REQUERIDO") {
      return "Debes seleccionar un responsable técnico para continuar.";
    }

    if (codigo === "RESPONSABLE_INVALIDO") {
      return "El responsable seleccionado no está activo o no existe.";
    }

    if (
      codigo === "RESPONSABLE_REQUERIDO" ||
      codigo === "RESPONSABLE_INVALIDO" ||
      String(data.message || data.error || "")
        .toLowerCase()
        .includes("responsable")
    ) {
      return "Selecciona responsable técnico en el paso de servicio.";
    }

    return data.message || data.error || fallback;
  };

  const obtenerClienteId = (data) => {
    return (
      data?.id ??
      data?._id ??
      data?.clienteId ??
      data?.cliente_id ??
      data?.cliente?.id ??
      data?.Cliente?.id ??
      data?.data?.id ??
      data?.data?._id ??
      null
    );
  };

  const obtenerVehiculoId = (data) => {
    return (
      data?.id ??
      data?._id ??
      data?.vehiculoId ??
      data?.vehiculo_id ??
      data?.vehiculo?.id ??
      data?.data?.id ??
      data?.data?._id ??
      null
    );
  };

  const obtenerOrdenId = (data) => {
    return (
      data?.id ??
      data?._id ??
      data?.ordenId ??
      data?.orden_id ??
      data?.orden?.id ??
      data?.data?.id ??
      data?.data?._id ??
      null
    );
  };

  const obtenerOrdenActual = () => {
    return ordenId || leerStorage("gmtch_ordenId") || null;
  };

  const limpiarContextoTrabajo = () => {
    setCliente({ ...ESTADO_INICIAL_CLIENTE });
    setClienteId(null);

    setVehiculo({ ...ESTADO_INICIAL_VEHICULO });
    setVehiculoId(null);

    setOrden({ ...ESTADO_INICIAL_ORDEN });
    setOrdenId(null);

    setFotosArchivos([]);
    setVehiculoEncontrado(null);
    limpiarStorageFlujo();
  };

  const mensajeErrorAmigable = (err, entidad) => {
    const status = err.response?.status;
    const data = err.response?.data;
    const mensaje = String(
      data?.error || data?.message || err.message || "Error desconocido"
    );

    const mensajeNormalizado = mensaje.toLowerCase();

    if (
      (entidad === "Vehiculo" || entidad === "Vehículo") &&
      (status === 409 ||
        mensajeNormalizado.includes("duplicate") ||
        mensajeNormalizado.includes("unique") ||
        mensajeNormalizado.includes("ya existe") ||
        mensajeNormalizado.includes("registrad"))
    ) {
      return "Esta patente ya está registrada. Busca la patente para reutilizar el vehículo.";
    }

    if (
      status === 409 ||
      mensajeNormalizado.includes("duplicate") ||
      mensajeNormalizado.includes("unique") ||
      mensajeNormalizado.includes("ya existe") ||
      mensajeNormalizado.includes("registrado") ||
      mensajeNormalizado.includes("validation error")
    ) {
      return `${entidad} ya existe o hay un dato duplicado en la base. Revisa si ya fue registrado antes.`;
    }

    return mensaje;
  };

  const buscarPatente = async () => {
    const patente = normalizarPatente(patenteBusqueda);

    if (!patente) {
      mostrarAviso("error", "Debes ingresar una patente para buscar.");
      return;
    }

    try {
      setCargando(true);
      setBusquedaRealizada(true);
      limpiarAviso();
      limpiarContextoTrabajo();
      setPatenteBusqueda(patente);

      const res = await api.get(`/vehiculos/patente/${patente}`);
      const encontrado = res.data;
      const clienteAsociado = obtenerClienteVehiculo(encontrado);
      const nuevoVehiculoId = obtenerVehiculoId(encontrado);
      const nuevoClienteId = obtenerClienteId(clienteAsociado || encontrado);

      setVehiculoEncontrado(encontrado);
      setVehiculo({
        patente: encontrado?.patente || patente,
        marca: encontrado?.marca || "",
        modelo: encontrado?.modelo || "",
        anio: encontrado?.anio || "",
        vin: encontrado?.vin || "",
      });
      setCliente({
        nombre: clienteAsociado?.nombre || "",
        telefono: clienteAsociado?.telefono || "",
        categoria_cliente: normalizarCategoriaCliente(
          clienteAsociado?.categoria_cliente
        ),
      });
      setOrden((prev) => ({
        ...prev,
        prioridad: prioridadSugeridaPorCategoria(clienteAsociado?.categoria_cliente),
      }));

      if (nuevoVehiculoId) {
        setVehiculoId(nuevoVehiculoId);
        escribirStorage("gmtch_vehiculoId", nuevoVehiculoId);
      }

      if (nuevoClienteId) {
        setClienteId(nuevoClienteId);
        escribirStorage("gmtch_clienteId", nuevoClienteId);
      }

      mostrarAviso("ok", "Patente encontrada. Puedes crear una nueva orden para este vehículo.");
    } catch (err) {
      if (err.response?.status === 404) {
        setVehiculoEncontrado(null);
        setVehiculo({ ...ESTADO_INICIAL_VEHICULO, patente });
        mostrarAviso("ok", "Patente no registrada. Crear cliente y vehículo nuevo.");
        setPaso(2);
        return;
      }

      console.error("ERROR BUSCANDO PATENTE:", err.response?.data || err.message);
      mostrarAviso("error", mensajeErrorAmigable(err, "Búsqueda de patente"));
    } finally {
      setCargando(false);
    }
  };

  const crearOrdenParaVehiculoExistente = () => {
    if (!vehiculoId) {
      mostrarAviso("error", "No se detectó el vehículo encontrado.");
      return;
    }

    setOrden({
      ...ESTADO_INICIAL_ORDEN,
      prioridad: prioridadSugeridaPorCategoria(cliente.categoria_cliente),
    });
    setOrdenId(null);
    setFotosArchivos([]);
    borrarStorage("gmtch_ordenId");
    mostrarAviso("ok", "Vehículo seleccionado. Completa los datos de la nueva orden.");
    setPaso(4);
  };

  const guardarCliente = async () => {
    const nombre = String(cliente.nombre ?? "").trim();
    const telefono = String(cliente.telefono ?? "").trim();

    if (!nombre) {
      mostrarAviso("error", "Debe ingresar nombre del cliente.");
      return;
    }

    try {
      setCargando(true);
      limpiarAviso();

      const payload = {
        nombre,
        telefono,
        categoria_cliente: normalizarCategoriaCliente(cliente.categoria_cliente),
      };

      const res = await api.post("/clientes", payload);
      const nuevoClienteId = obtenerClienteId(res.data);

      if (!nuevoClienteId) {
        mostrarAviso("error", "Cliente guardado, pero el backend no devolvio el ID.");
        console.error("Respuesta sin ID de cliente:", res.data);
        return;
      }

      setClienteId(nuevoClienteId);
      escribirStorage("gmtch_clienteId", nuevoClienteId);

      mostrarAviso("ok", "Cliente guardado correctamente. Continúa con el vehículo.");
      setPaso(3);
    } catch (err) {
      console.error("ERROR AL GUARDAR CLIENTE:", err.response?.data || err.message);
      mostrarAviso("error", mensajeErrorAmigable(err, "Cliente"));
    } finally {
      setCargando(false);
    }
  };

  const guardarVehiculo = async () => {
    const idClienteActual = clienteId || leerStorage("gmtch_clienteId");

    const patente = normalizarPatente(vehiculo.patente || patenteBusqueda);
    const marca = String(vehiculo.marca ?? "").trim();
    const modelo = String(vehiculo.modelo ?? "").trim();
    const anio = String(vehiculo.anio ?? "").trim();
    const vin = String(vehiculo.vin ?? "").trim();

    if (!idClienteActual) {
      mostrarAviso("error", "Falta cliente del paso 2.");
      return;
    }

    if (!patente || !marca || !modelo) {
      mostrarAviso("error", "Debe completar Patente, Marca y Modelo.");
      return;
    }

    try {
      setCargando(true);
      limpiarAviso();

      const payload = {
        patente,
        marca,
        modelo,
        anio: anio ? Number(anio) : null,
        vin: vin || null,
        clienteId: idParaBackend(idClienteActual),
        cliente_id: idParaBackend(idClienteActual),
      };

      const res = await api.post("/vehiculos", payload);
      const nuevoVehiculoId = obtenerVehiculoId(res.data);

      if (!nuevoVehiculoId) {
        mostrarAviso("error", "Vehículo guardado, pero el backend no devolvió el ID.");
        console.error("Respuesta sin ID de vehículo:", res.data);
        return;
      }

      setVehiculoId(nuevoVehiculoId);
      escribirStorage("gmtch_vehiculoId", nuevoVehiculoId);

      mostrarAviso("ok", "Vehículo guardado correctamente. Continúa con servicio y síntomas.");
      setPaso(4);
    } catch (err) {
      console.error("ERROR AL GUARDAR VEHICULO:", err.response?.data || err.message);
      mostrarAviso("error", mensajeErrorAmigable(err, "Vehículo"));
    } finally {
      setCargando(false);
    }
  };

  const construirMotivoIngreso = () => {
    const servicioSolicitado = String(orden.servicio_solicitado ?? "").trim();
    const sintomasCliente = String(orden.sintomas_cliente ?? "").trim();
    const observacionesVisuales = String(orden.observaciones_visuales ?? "").trim();

    return [
      "=== RECEPCIÓN GMTCH TUNE ===",
      `Servicio solicitado: ${servicioSolicitado || "No informado"}`,
      "",
      "Síntomas indicados por cliente:",
      sintomasCliente || "No informado",
      "",
      "Observaciones visibles de recepción:",
      observacionesVisuales || "Sin observaciones visibles registradas",
      "",
      "Requerimientos iniciales marcados por recepción:",
      `- Requiere scanner/diagnóstico: ${orden.requiere_scanner ? "SI" : "NO"}`,
      `- Requiere lectura ECU: ${orden.requiere_lectura_ecu ? "SI" : "NO"}`,
      `- Requiere mecánica: ${orden.requiere_mecanica ? "SI" : "NO"}`,
      "",
      "Nota de flujo:",
      "Recepción no decide método de lectura ECU. El técnico ECU define si corresponde OBD, BENCH, BOOT o retiro de ECU. El mecánico solo ejecuta instrucciones asignadas por plataforma.",
    ].join("\n");
  };

  const guardarOrden = async () => {
    const idVehiculoActual = vehiculoId || leerStorage("gmtch_vehiculoId");

    const kilometraje = limpiarNumero(orden.kilometraje);
    const servicioSolicitado = String(orden.servicio_solicitado ?? "").trim();
    const sintomasCliente = String(orden.sintomas_cliente ?? "").trim();
    const montoTotal = limpiarNumero(orden.monto_total);

    if (!idVehiculoActual) {
      mostrarAviso("error", "Falta vehículo.");
      return;
    }

    if (!kilometraje || !servicioSolicitado || !sintomasCliente || !montoTotal) {
      mostrarAviso("error", "Complete kilometraje, servicio solicitado, síntomas y monto.");
      return;
    }

    if (cargandoResponsables) {
      mostrarAviso("error", "Espera a que carguen los responsables activos.");
      return;
    }

    if (errorResponsables || usuariosTecnicosActivos.length === 0) {
      mostrarAviso(
        "error",
        errorResponsables ||
          "No se pudieron cargar responsables activos. Revisa usuarios activos antes de crear la orden."
      );
      return;
    }

    const responsableTecnico = usuarioResponsableSeleccionado();

    if (!responsableTecnico) {
      mostrarAviso("error", "Debes seleccionar un responsable técnico para continuar.");
      return;
    }

    try {
      setCargando(true);
      limpiarAviso();
      const campoResponsable = obtenerCampoResponsablePorServicio(
        servicioSolicitado,
        orden.requiere_mecanica
      );
      const categoriaServicio = obtenerCategoriaServicioPorCampo(
        campoResponsable.campoId
      );
      const responsableTexto = snapshotUsuario(responsableTecnico);
      const usuarioRecepcion = usuarioLocalActual();
      const recepcionadoPorTexto = snapshotUsuario(usuarioRecepcion);

      const payload = {
        vehiculoId: idParaBackend(idVehiculoActual),
        vehiculo_id: idParaBackend(idVehiculoActual),
        prioridad: orden.prioridad || "MEDIA",
        kilometraje: Number(kilometraje),
        motivo_ingreso: construirMotivoIngreso(),
        monto_total: Number(montoTotal),
        estado: ESTADO_ORDEN_INICIAL,
        origen_recepcion: esRecepcionEmergenciaOperador
          ? "RECEPCION_EMERGENCIA_OPERADOR"
          : undefined,
        categoria_servicio: categoriaServicio,
        tipo_servicio: servicioSolicitado,
        servicio: servicioSolicitado,
        responsable_tecnico_id: responsableTecnico.id,
        responsable_tecnico: responsableTexto,
        responsable_tecnico_texto: responsableTexto,
        recepcionado_por_id: usuarioRecepcion.id || undefined,
        recepcionado_por: recepcionadoPorTexto || undefined,
        [campoResponsable.campoId]: responsableTecnico.id,
        [campoResponsable.campoTexto]: responsableTexto,
      };

      const res = await api.post("/ordenes", payload);
      const nuevaOrdenId = obtenerOrdenId(res.data);
      const origenBackend =
        res.data?.orden?.origen_recepcion || res.data?.origen_recepcion || "";

      if (!nuevaOrdenId) {
        mostrarAviso("error", "La orden se guardo, pero no se recibio el ID.");
        console.error("Respuesta sin ID de orden:", res.data);
        return;
      }

      setOrdenId(nuevaOrdenId);
      setOrigenRecepcion(origenBackend);
      escribirStorage("gmtch_ordenId", nuevaOrdenId);

      mostrarAviso("ok", "Orden creada correctamente. Continúa con las fotos de respaldo.");
      setPaso(5);
    } catch (err) {
      console.error("ERROR AL GUARDAR ORDEN:", err.response?.data || err.message);
      mostrarAviso(
        "error",
        mensajeErrorResponsable(err, mensajeErrorAmigable(err, "Orden"))
      );
    } finally {
      setCargando(false);
    }
  };

  const subirFotosSeleccionadas = async () => {
    const idOrdenActual = obtenerOrdenActual();

    if (!idOrdenActual) {
      mostrarAviso("error", "Falta orden. Vuelve al paso 4 y guarda la orden nuevamente.");
      return false;
    }

    if (!fotosArchivos.length) {
      return true;
    }

    for (const foto of fotosArchivos) {
      const fd = new FormData();
      fd.append("foto", foto);
      fd.append("ordenId", String(idOrdenActual));
      fd.append("orden_id", String(idOrdenActual));

      await api.post("/fotos", fd);
    }

    return true;
  };

  const actualizarOrdenAParaDiagnostico = async () => {
    const idOrdenActual = obtenerOrdenActual();

    if (!idOrdenActual) {
      return false;
    }

    const payload = {
      estado: ESTADO_ORDEN_FINAL_RECEPCION,
    };

    try {
      await api.put(`/ordenes/${idOrdenActual}`, payload);
      return true;
    } catch (errorPut) {
      console.warn(
        "No se pudo actualizar por PUT, intentando PATCH:",
        errorPut.response?.data || errorPut.message
      );

      try {
        await api.patch(`/ordenes/${idOrdenActual}`, payload);
        return true;
      } catch (errorPatch) {
        console.warn(
          "No se pudo actualizar estado por PATCH:",
          errorPatch.response?.data || errorPatch.message
        );
        return false;
      }
    }
  };

  const finalizarRecepcion = async () => {
    const idOrdenActual = obtenerOrdenActual();

    if (!idOrdenActual) {
      mostrarAviso("error", "No hay orden activa para finalizar.");
      return;
    }

    if (!fotosArchivos.length) {
      const continuar = window.confirm(
        "No hay fotos seleccionadas. Lo recomendado es subir respaldo exterior e interior. Deseas finalizar sin fotos?"
      );

      if (!continuar) {
        return;
      }
    }

    try {
      setCargando(true);
      limpiarAviso();

      await subirFotosSeleccionadas();

      const estadoActualizado = await actualizarOrdenAParaDiagnostico();

      if (estadoActualizado) {
        alert("Recepción finalizada. La orden quedó lista para diagnóstico.");
      } else {
        alert(
          "Recepción guardada. No se pudo mover automáticamente a diagnóstico, pero la orden quedó registrada."
        );
      }

      limpiarFlujo();
    } catch (err) {
      console.error("ERROR AL FINALIZAR RECEPCION:", err.response?.data || err.message);
      mostrarAviso("error", mensajeErrorAmigable(err, "Recepción"));
    } finally {
      setCargando(false);
    }
  };

  const limpiarFlujo = () => {
    setPaso(1);
    setAviso(null);
    setOrigenRecepcion("");
    setPatenteBusqueda("");
    setBusquedaRealizada(false);
    limpiarContextoTrabajo();
  };

  const abrirSelectorFotos = () => {
    fotosInputRef.current?.click();
  };

  const renderAviso = () => {
    if (!aviso) return null;

    const estilos =
      aviso.tipo === "ok"
        ? "bg-green-100 border-green-600 text-green-900"
        : "bg-red-100 border-red-600 text-red-900";

    return (
      <div className={`mb-6 border-4 p-4 font-black uppercase text-xs ${estilos}`}>
        {aviso.mensaje}
      </div>
    );
  };

  const renderResumenVehiculoEncontrado = () => {
    if (!vehiculoEncontrado) return null;

    const clienteAsociado = obtenerClienteVehiculo(vehiculoEncontrado);
    const ordenes = obtenerOrdenesVehiculo(vehiculoEncontrado);
    const ordenesActivas = ordenes.filter(
      (item) => String(item.estado || "").toUpperCase() !== "ENTREGADO"
    );
    const ultimaVisita =
      vehiculoEncontrado.ultimaVisita ||
      ordenes
        .map((item) => item.createdAt || item.updatedAt)
        .filter(Boolean)
        .sort()
        .at(-1);

    return (
      <div className="border-4 border-black bg-slate-50 p-5 space-y-4">
        <div>
          <h3 className="font-black uppercase text-lg">
            Vehículo encontrado: {texto(vehiculoEncontrado.patente)}
          </h3>
          <p className="text-xs font-bold uppercase text-gray-500">
            {texto(vehiculoEncontrado.marca)} {texto(vehiculoEncontrado.modelo)}{" "}
            {vehiculoEncontrado.anio || ""}
          </p>
          <p className="text-xs font-bold uppercase text-gray-500">
            VIN: {texto(vehiculoEncontrado.vin)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold uppercase">
          <div className="bg-white border border-black p-3">
            Cliente: {texto(clienteAsociado?.nombre)}
          </div>
          <div className="bg-white border border-black p-3">
            Telefono: {texto(clienteAsociado?.telefono)}
          </div>
          <div className="bg-white border border-black p-3">
            Email: {texto(clienteAsociado?.email)}
          </div>
          <div className="bg-white border border-black p-3">
            Ultima visita: {formatearFecha(ultimaVisita)}
          </div>
          <div className="bg-white border border-black p-3">
            Ordenes activas: {ordenesActivas.length}
          </div>
        </div>

        {ordenesActivas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-black uppercase">Ordenes activas</p>
            {ordenesActivas.map((item) => (
              <div key={item.id} className="border border-black bg-white p-3 text-xs font-bold uppercase">
                Orden #{item.id} - {texto(item.estado, "Sin estado")} -{" "}
                {texto(item.motivo_ingreso, "Sin motivo")}
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={crearOrdenParaVehiculoExistente}
          className="bg-black text-white px-6 py-3 font-black uppercase text-xs"
        >
          Crear nueva orden para este vehículo
        </button>
      </div>
    );
  };

  const renderPaso = () => {
    switch (paso) {
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="font-black text-lg uppercase">1. Buscar patente</h2>
              <p className="text-xs font-bold text-gray-500 uppercase">
                Busca primero para reutilizar cliente y vehículo si ya existen.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <input
                className="border border-black p-3 w-full font-black uppercase"
                placeholder="Patente"
                value={patenteBusqueda}
                onChange={(e) => setPatenteBusqueda(normalizarPatente(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    buscarPatente();
                  }
                }}
              />

              <button
                type="button"
                onClick={buscarPatente}
                disabled={cargando}
                className="bg-black text-white px-6 py-3 font-black uppercase text-xs disabled:bg-gray-400"
              >
                {cargando ? "Buscando..." : "Buscar"}
              </button>
            </div>

            {renderResumenVehiculoEncontrado()}

            {busquedaRealizada && !vehiculoEncontrado && (
              <button
                type="button"
                onClick={() => setPaso(2)}
                className="bg-blue-600 text-white px-6 py-3 font-black uppercase text-xs"
              >
                Crear cliente y vehículo nuevo
              </button>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="font-black text-lg uppercase">2. Cliente</h2>
              <p className="text-xs font-bold text-gray-500 uppercase">
                Datos minimos para iniciar la orden.
              </p>
            </div>

            <input
              className="border border-black p-3 w-full"
              placeholder="Nombre cliente"
              value={cliente.nombre ?? ""}
              onChange={(e) =>
                setCliente((prev) => ({
                  ...prev,
                  nombre: e.target.value ?? "",
                }))
              }
            />

            <input
              className="border border-black p-3 w-full"
              placeholder="Telefono / WhatsApp"
              value={cliente.telefono ?? ""}
              onChange={(e) =>
                setCliente((prev) => ({
                  ...prev,
                  telefono: e.target.value ?? "",
                }))
              }
            />

            <select
              className="border border-black p-3 w-full bg-white font-bold"
              value={normalizarCategoriaCliente(cliente.categoria_cliente)}
              onChange={(e) => {
                const categoria = normalizarCategoriaCliente(e.target.value);
                setCliente((prev) => ({
                  ...prev,
                  categoria_cliente: categoria,
                }));
                setOrden((prev) => ({
                  ...prev,
                  prioridad: prioridadSugeridaPorCategoria(categoria),
                }));
              }}
            >
              {CATEGORIAS_CLIENTE.map((categoria) => (
                <option key={categoria.value} value={categoria.value}>
                  {categoria.label}
                </option>
              ))}
            </select>

            <div className="flex justify-between gap-4">
              <button
                type="button"
                onClick={anterior}
                className="text-xs uppercase font-bold"
              >
                Volver
              </button>

              <button
                type="button"
                onClick={guardarCliente}
                disabled={cargando}
                className="bg-black text-white px-6 py-3 font-black uppercase text-xs disabled:bg-gray-400"
              >
                {cargando ? "Guardando..." : "Guardar Cliente y Continuar"}
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="font-black text-lg uppercase">3. Vehículo</h2>
              <p className="text-xs font-bold text-gray-500 uppercase">
                Identificación de la unidad ingresada.
              </p>
            </div>

            <input
              className="border border-black p-3 w-full"
              placeholder="Patente"
              value={vehiculo.patente ?? ""}
              onChange={(e) =>
                setVehiculo((prev) => ({
                  ...prev,
                  patente: normalizarPatente(e.target.value),
                }))
              }
            />

            <input
              className="border border-black p-3 w-full"
              placeholder="Marca"
              value={vehiculo.marca ?? ""}
              onChange={(e) =>
                setVehiculo((prev) => ({
                  ...prev,
                  marca: e.target.value ?? "",
                }))
              }
            />

            <input
              className="border border-black p-3 w-full"
              placeholder="Modelo"
              value={vehiculo.modelo ?? ""}
              onChange={(e) =>
                setVehiculo((prev) => ({
                  ...prev,
                  modelo: e.target.value ?? "",
                }))
              }
            />

            <input
              className="border border-black p-3 w-full"
              placeholder="Anio"
              value={vehiculo.anio ?? ""}
              onChange={(e) =>
                setVehiculo((prev) => ({
                  ...prev,
                  anio: e.target.value ?? "",
                }))
              }
            />

            <input
              className="border border-black p-3 w-full"
              placeholder="VIN"
              value={vehiculo.vin ?? ""}
              onChange={(e) =>
                setVehiculo((prev) => ({
                  ...prev,
                  vin: e.target.value ?? "",
                }))
              }
            />

            <div className="flex justify-between gap-4">
              <button
                type="button"
                onClick={anterior}
                className="text-xs uppercase font-bold"
              >
                Volver
              </button>

              <button
                type="button"
                onClick={guardarVehiculo}
                disabled={cargando}
                className="bg-black text-white px-6 py-3 font-black uppercase text-xs disabled:bg-gray-400"
              >
                {cargando ? "Guardando..." : "Guardar Vehículo y Continuar"}
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="font-black text-lg uppercase">4. Servicio / Síntomas</h2>
              <p className="text-xs font-bold text-gray-500 uppercase">
                Recepción registra lo que informa el cliente y lo visible. No diagnostica ECU.
              </p>
            </div>

            <input
              className="border border-black p-3 w-full"
              placeholder="Kilometraje"
              type="number"
              value={orden.kilometraje ?? ""}
              onChange={(e) =>
                setOrden((prev) => ({
                  ...prev,
                  kilometraje: e.target.value ?? "",
                }))
              }
            />

            <select
              className="border border-black p-3 w-full bg-white font-bold"
              value={orden.prioridad ?? "MEDIA"}
              onChange={(e) =>
                setOrden((prev) => ({
                  ...prev,
                  prioridad: e.target.value,
                }))
              }
            >
              <option value="BAJA">Prioridad baja</option>
              <option value="MEDIA">Prioridad media</option>
              <option value="ALTA">Prioridad alta</option>
              <option value="URGENTE">Urgente</option>
            </select>

            <p className="text-[10px] font-black uppercase text-gray-500">
              Prioridad sugerida por categoría:{" "}
              {prioridadSugeridaPorCategoria(cliente.categoria_cliente)}
            </p>

            <select
              className="border border-black p-3 w-full bg-white font-bold"
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                setOrden((prev) => ({
                  ...prev,
                  servicio_solicitado: e.target.value,
                }));
              }}
            >
              <option value="">Seleccionar servicio sugerido</option>
              {SERVICIOS_ORDEN_SUGERIDOS.map((servicio) => (
                <option key={servicio} value={servicio}>
                  {servicio}
                </option>
              ))}
            </select>

            <textarea
              className="border border-black p-3 w-full"
              placeholder="Servicio solicitado por el cliente. Ej: DPF Off, diagnóstico, EGR, AdBlue, Stage 1, lectura ECU, etc."
              value={orden.servicio_solicitado ?? ""}
              onChange={(e) =>
                setOrden((prev) => ({
                  ...prev,
                  servicio_solicitado: e.target.value ?? "",
                }))
              }
            />

            <div className="border-4 border-black bg-blue-50 p-4 space-y-2">
              <label className="block text-xs font-black uppercase text-black">
                Responsable técnico *
              </label>
              <p className="text-[10px] font-bold uppercase text-gray-600">
                Obligatorio para crear la orden. Se asignará al área técnica según el servicio seleccionado.
              </p>

            <select
              className="border border-black p-3 w-full bg-white font-bold"
              value={orden.responsable_tecnico_id ?? ""}
                disabled={
                  cargandoResponsables ||
                  Boolean(errorResponsables) ||
                  usuariosTecnicosActivos.length === 0
                }
              onChange={(e) => {
                const responsable = usuariosTecnicosActivos.find(
                  (usuario) => String(usuario.id) === String(e.target.value)
                );

                setOrden((prev) => ({
                  ...prev,
                  responsable_tecnico_id: e.target.value,
                  responsable_tecnico_texto: snapshotUsuario(responsable),
                }));
              }}
            >
              <option value="">Seleccionar responsable técnico</option>
              {usuariosTecnicosActivos.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombre || "Sin nombre"} / {usuario.username || "sin username"} / {usuario.rol}
                </option>
              ))}
            </select>

            {orden.responsable_tecnico_id && (
              <p className="text-[10px] font-black uppercase text-blue-800">
                Responsable seleccionado: {orden.responsable_tecnico_texto || "Registrado"}
              </p>
            )}

              {cargandoResponsables && (
                <p className="border-2 border-blue-600 bg-white p-2 text-[10px] font-black uppercase text-blue-900">
                  Cargando responsables activos...
                </p>
              )}

              {!cargandoResponsables && !errorResponsables && usuariosTecnicosActivos.length === 0 && (
                <p className="border-2 border-red-600 bg-red-50 p-2 text-[10px] font-black uppercase text-red-900">
                  No se pudieron cargar responsables activos. Revisa usuarios activos antes de crear la orden.
                </p>
            )}

            {errorResponsables && (
              <p className="border-2 border-red-600 bg-red-50 p-2 text-[10px] font-black uppercase text-red-900">
                {errorResponsables}
              </p>
            )}

            </div>

            <textarea
              className="border border-black p-3 w-full"
              placeholder="Síntomas indicados por el cliente. Ej: pierde fuerza, humo, testigo motor, regeneraciones constantes, no parte, etc."
              value={orden.sintomas_cliente ?? ""}
              onChange={(e) =>
                setOrden((prev) => ({
                  ...prev,
                  sintomas_cliente: e.target.value ?? "",
                }))
              }
            />

            <textarea
              className="border border-black p-3 w-full"
              placeholder="Observaciones visibles de recepción. Ej: golpes, rayas, testigos encendidos, nivel combustible, accesorios, estado interior."
              value={orden.observaciones_visuales ?? ""}
              onChange={(e) =>
                setOrden((prev) => ({
                  ...prev,
                  observaciones_visuales: e.target.value ?? "",
                }))
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-xs font-black uppercase border border-black p-3">
                <input
                  type="checkbox"
                  checked={Boolean(orden.requiere_scanner)}
                  onChange={(e) =>
                    setOrden((prev) => ({
                      ...prev,
                      requiere_scanner: e.target.checked,
                    }))
                  }
                />
                Requiere Scanner
              </label>

              <label className="flex items-center gap-2 text-xs font-black uppercase border border-black p-3">
                <input
                  type="checkbox"
                  checked={Boolean(orden.requiere_lectura_ecu)}
                  onChange={(e) =>
                    setOrden((prev) => ({
                      ...prev,
                      requiere_lectura_ecu: e.target.checked,
                    }))
                  }
                />
                Requiere Lectura ECU
              </label>

              <label className="flex items-center gap-2 text-xs font-black uppercase border border-black p-3">
                <input
                  type="checkbox"
                  checked={Boolean(orden.requiere_mecanica)}
                  onChange={(e) =>
                    setOrden((prev) => ({
                      ...prev,
                      requiere_mecanica: e.target.checked,
                    }))
                  }
                />
                Requiere Mecánica
              </label>
            </div>

            <input
              className="border border-black p-3 w-full"
              placeholder="Monto estimado o total ($)"
              value={orden.monto_total ?? ""}
              onChange={(e) =>
                setOrden((prev) => ({
                  ...prev,
                  monto_total: e.target.value ?? "",
                }))
              }
            />

            <div className="bg-yellow-50 border-2 border-yellow-500 p-4 text-xs font-bold uppercase leading-relaxed">
              El mecánico no decide si se retira la ECU. Esa decisión queda para el técnico ECU /
              operador de lectura según método OBD, BENCH, BOOT o retiro.
            </div>

            <div className="flex justify-between gap-4">
              <button
                type="button"
                onClick={anterior}
                className="text-xs uppercase font-bold"
              >
                Volver
              </button>

              <button
                type="button"
                onClick={guardarOrden}
                disabled={cargando}
                className="bg-black text-white px-6 py-3 font-black uppercase text-xs disabled:bg-gray-400"
              >
                {cargando ? "Guardando..." : "Guardar Orden y Continuar"}
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="font-black text-lg uppercase">5. Fotos de Ingreso</h2>
              <p className="text-xs font-bold text-gray-500 uppercase">
                Respaldo visual del estado del vehículo al momento de recepción.
              </p>
            </div>

            <div className="border border-black p-3 text-xs font-bold uppercase bg-gray-50">
              Orden actual: {obtenerOrdenActual() || "No detectada"}
            </div>

            <div className="bg-blue-50 border-4 border-blue-600 p-5">
              <h3 className="text-sm font-black uppercase mb-3">
                Guia rapida de fotos recomendadas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold uppercase">
                <div className="bg-white border border-black p-3">Frente completo</div>
                <div className="bg-white border border-black p-3">Parte trasera completa</div>
                <div className="bg-white border border-black p-3">Lateral izquierdo</div>
                <div className="bg-white border border-black p-3">Lateral derecho</div>
                <div className="bg-white border border-black p-3">Tablero con KM</div>
                <div className="bg-white border border-black p-3">Testigos encendidos</div>
                <div className="bg-white border border-black p-3">Rayones, golpes o detalles</div>
                <div className="bg-white border border-black p-3">Motor / zona ECU si aplica</div>
              </div>

              <p className="text-[11px] font-bold uppercase mt-4 leading-relaxed">
                Estas fotos sirven como respaldo si el cliente reclama golpes, rayones,
                danos previos o diferencias al momento de entrega.
              </p>
            </div>

            <input
              ref={fotosInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => setFotosArchivos(Array.from(e.target.files || []))}
            />

            <button
              type="button"
              onClick={abrirSelectorFotos}
              className="w-full bg-black text-white border-4 border-black py-5 px-6 font-black uppercase text-sm hover:bg-blue-600 transition"
            >
              Seleccionar Fotos de Recepción
            </button>

            <div className="bg-slate-50 border-4 border-black p-4">
              <p className="text-xs font-black uppercase">
                Fotos seleccionadas: {fotosArchivos.length}
              </p>

              {fotosArchivos.length > 0 && (
                <ul className="mt-3 space-y-1 text-[11px] font-bold text-gray-600">
                  {fotosArchivos.map((foto, index) => (
                    <li key={`${foto.name}-${index}`}>{foto.name}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-between gap-4">
              <button
                type="button"
                onClick={anterior}
                className="text-xs uppercase font-bold"
              >
                Volver
              </button>

              <button
                type="button"
                onClick={siguiente}
                className="bg-black text-white px-6 py-3 font-black uppercase text-xs"
              >
                Continuar a Cierre
              </button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="font-black text-lg uppercase">6. Cierre de Recepción</h2>
              <p className="text-xs font-bold text-gray-500 uppercase">
                Al finalizar, la orden queda en cola para diagnóstico.
              </p>
            </div>

            <div className="bg-slate-50 border-4 border-black p-5 space-y-3 text-xs font-bold uppercase">
              <p>Cliente ID: {clienteId || "No registrado"}</p>
              <p>Vehículo ID: {vehiculoId || "No registrado"}</p>
              <p>Orden ID: {ordenId || leerStorage("gmtch_ordenId") || "No registrado"}</p>
              <p>Estado actual: {ESTADO_ORDEN_INICIAL}</p>
              <p>Estado siguiente: {ESTADO_ORDEN_FINAL_RECEPCION}</p>
              <p>Fotos pendientes de subir: {fotosArchivos.length}</p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-600 p-4 text-xs font-bold uppercase leading-relaxed">
              Siguiente etapa: operador de diagnóstico/scanner. Luego el técnico ECU define el
              método de lectura y si corresponde desmontaje. Mecánica solo ejecuta trabajos
              asignados por plataforma.
            </div>

            <div className="flex justify-between gap-4">
              <button
                type="button"
                onClick={anterior}
                className="text-xs uppercase font-bold"
              >
                Volver
              </button>

              <button
                type="button"
                onClick={finalizarRecepcion}
                disabled={cargando}
                className="bg-green-600 text-white px-6 py-3 font-black uppercase text-xs disabled:bg-gray-400"
              >
                {cargando ? "Finalizando..." : "Finalizar Recepción"}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] p-6">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">
          Recepción Operativa
        </h1>
        <p className="text-xs font-black uppercase text-gray-500 mt-2">
          Ingreso inicial por patente. Scanner, lectura ECU y mecánica se asignan después.
        </p>
      </div>

      {esRecepcionEmergenciaOperador && (
        <div className="mb-6 border-4 border-amber-500 bg-amber-50 p-4">
          <p className="text-[11px] font-black uppercase text-amber-900">
            Recepcion de emergencia operador: registra solo datos minimos. No puedes cobrar ni entregar desde este flujo.
          </p>
        </div>
      )}

      <div className="mb-6 border-4 border-blue-700 bg-blue-50 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-900">
          Guía visual de recepción rápida
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-5">
          {GUIA_RECEPCION_LUNES.map((item) => (
            <div
              key={item}
              className="border-2 border-blue-700 bg-white p-3 text-[10px] font-black uppercase text-blue-950"
            >
              {item}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] font-black uppercase text-blue-900">
          Todo trabajo debe tener cliente, vehículo y motivo claro.
        </p>
      </div>

      {renderAviso()}

      <div className="flex justify-between mb-8 gap-2">
        {etiquetas.map((label, idx) => {
          const numero = idx + 1;
          const activo = numero === paso;
          const completo = numero < paso;

          return (
            <div key={label} className="flex-1 flex flex-col items-center text-center">
              <div
                className={`w-8 h-8 flex items-center justify-center rounded-full border-2 font-black text-xs
                  ${
                    activo
                      ? "bg-black text-white border-black"
                      : completo
                        ? "bg-green-500 text-white border-black"
                        : "bg-white text-black border-gray-400"
                  }
                `}
              >
                {numero}
              </div>

              <p className="mt-1 text-[9px] md:text-[10px] font-black uppercase">
                {label}
              </p>
            </div>
          );
        })}
      </div>

      {renderPaso()}

      <div className="mt-8 pt-4 border-t border-black flex flex-col md:flex-row justify-between gap-4 md:items-center">
        <div className="text-[10px] uppercase font-bold text-gray-500">
          Cliente ID: {clienteId || "No registrado"} | Vehículo ID:{" "}
          {vehiculoId || "No registrado"} | Orden ID:{" "}
          {ordenId || leerStorage("gmtch_ordenId") || "No registrado"}
          {origenRecepcion && <> | Origen: {origenRecepcion}</>}
        </div>

        <button
          type="button"
          onClick={limpiarFlujo}
          className="text-[10px] uppercase font-black border border-black px-3 py-2"
        >
          Limpiar flujo
        </button>
      </div>
    </div>
  );
}

export default RecepcionRapidaPage;
