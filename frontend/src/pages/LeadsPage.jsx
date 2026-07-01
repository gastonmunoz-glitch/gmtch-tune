import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { getPriorityColor, getStatusColor } from "../utils/statusStyles";

const CANALES = [
  "WHATSAPP",
  "INSTAGRAM",
  "INSTAGRAM_ADS",
  "FACEBOOK_ADS",
  "GRUPO_FACEBOOK",
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

const CANALES_CAMPANIA = [
  "FACEBOOK_ADS",
  "INSTAGRAM_ADS",
  "WHATSAPP",
  "WEB",
  "GRUPO_FACEBOOK",
  "REFERIDO",
  "PRESENCIAL",
  "OTRO",
];

const OBJETIVOS_CAMPANIA = [
  "MENSAJES_WHATSAPP",
  "LEADS",
  "AGENDA",
  "VENTAS",
  "FILE_SERVICE",
  "FLOTA",
  "OTRO",
];

const ESTADOS_CAMPANIA = ["BORRADOR", "ACTIVA", "PAUSADA", "FINALIZADA"];

const SERVICIOS = [
  ["DIAGNOSTICO", "Diagnóstico profesional"],
  ["REVISION_DTC", "Revisión DTC"],
  ["STAGE_1", "Stage 1"],
  ["STAGE_2", "Stage 2"],
  ["STAGE_3", "Stage 3 / proyecto especial"],
  ["ECU", "Reprogramación ECU"],
  ["TCU", "Reprogramación TCU"],
  ["FILE_SERVICE", "File Service"],
  ["DPF_FAP", "DPF / FAP"],
  ["EGR", "EGR"],
  ["SCR_ADBLUE", "SCR / AdBlue / DEF"],
  ["NOX", "NOx"],
  ["LAMBDA_O2", "Lambda / O2"],
  ["TVA", "TVA"],
  ["IMMO", "IMMO"],
  ["VMAX", "Vmax"],
  ["POPS_BANGS", "Pops & Bangs"],
  ["LAUNCH_CONTROL", "Launch Control"],
  ["HARDCUT", "Hardcut"],
  ["FLOTA", "Flotas / proyectos técnicos"],
  ["SOPORTE_TALLERES", "Soporte a talleres"],
  ["OTRO", "Otro"],
];

const CATEGORIAS_TARIFA = [
  "PERFORMANCE",
  "DIAGNOSTICO",
  "FILE_SERVICE",
  "SOLUCION_TECNICA",
  "FLOTA",
  "TALLER",
  "OTRO",
];

const servicioLabel = (valor) =>
  SERVICIOS.find(([id]) => id === valor)?.[1] || valor || "Servicio";

const normalizarClave = (valor) =>
  String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const tarifaParaServicio = (tarifas, servicio) => {
  const etiqueta = servicioLabel(servicio);
  const claveEtiqueta = normalizarClave(etiqueta);
  const claveServicio = normalizarClave(servicio);
  return (
    tarifas.find((tarifa) => normalizarClave(tarifa.servicio) === claveEtiqueta) ||
    tarifas.find((tarifa) => normalizarClave(tarifa.servicio) === claveServicio) ||
    null
  );
};

const formatoCLP = (valor) => {
  const numero = Number(valor || 0);
  if (!numero) return "Sin tarifa";
  return numero.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });
};

const datosFaltantesLead = (lead) => {
  const faltantes = [];
  if (!String(lead?.vehiculo_marca || "").trim()) faltantes.push("marca");
  if (!String(lead?.vehiculo_modelo || "").trim()) faltantes.push("modelo");
  if (!String(lead?.vehiculo_anio || "").trim()) faltantes.push("año");
  if (!String(lead?.vehiculo_motor || "").trim()) faltantes.push("motor/cilindrada");
  if (!lead?.servicio_interes || lead.servicio_interes === "OTRO") {
    faltantes.push("servicio requerido");
  }
  return faltantes;
};

const campaniaNombre = (campanias, campaniaId) => {
  if (!campaniaId) return "Sin campaña / orgánico";
  return (
    campanias.find((campania) => String(campania.id) === String(campaniaId))
      ?.nombre || `Campaña #${campaniaId}`
  );
};

const TARIFA_FORM_INICIAL = {
  servicio: "",
  categoria: "OTRO",
  precio_desde: "",
  precio_minimo: "",
  precio_referencia: "",
  moneda: "CLP",
  requiere_evaluacion: true,
  requiere_diagnostico: false,
  activo: true,
  descripcion: "",
  notas_internas: "",
};

const CAMPANIA_FORM_INICIAL = {
  nombre: "",
  canal: "WHATSAPP",
  objetivo: "MENSAJES_WHATSAPP",
  presupuesto: "",
  fecha_inicio: "",
  fecha_fin: "",
  estado: "ACTIVA",
  descripcion: "",
  utm_source: "",
  utm_campaign: "",
  utm_content: "",
};

const FORM_INICIAL = {
  nombre: "",
  telefono: "",
  email: "",
  canal: "WHATSAPP",
  campaniaId: "",
  origen_detalle: "",
  utm_source: "",
  utm_campaign: "",
  utm_content: "",
  vehiculo_marca: "",
  vehiculo_modelo: "",
  vehiculo_anio: "",
  vehiculo_motor: "",
  patente: "",
  servicio_interes: "OTRO",
  presupuesto_estimado: "",
  mensaje_inicial: "",
  asignado_a: "",
  proxima_accion: "",
  proximo_contacto_at: "",
};

const FILTROS_INICIALES = {
  canal: "",
  estado: "",
  prioridad: "",
  servicio_interes: "",
  asignado_a: "",
  campaniaId: "",
  es_lead_caliente: "",
};

const texto = (valor, fallback = "No registrado") => {
  const limpio = String(valor ?? "").trim();
  return limpio || fallback;
};

const fecha = (valor, fallback = "Pendiente") => {
  if (!valor) return fallback;
  try {
    return new Date(valor).toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return fallback;
  }
};

const obtenerInteracciones = (lead) => {
  const posibles = [
    lead?.LeadInteraccions,
    lead?.LeadInteracciones,
    lead?.lead_interacciones,
    lead?.Interacciones,
    lead?.interacciones,
  ];
  const lista = posibles.find(Array.isArray);
  return lista || [];
};

const sugerenciaRespuesta = (lead, tarifa = null) => {
  if (lead?.resumen_ai) return lead.resumen_ai;

  const faltantes = datosFaltantesLead(lead);
  const partes = ["Hola, gracias por contactar a GMTCH Tune."];

  if (faltantes.length) {
    partes.push(`Para orientarte bien necesito: ${faltantes.join(", ")}.`);
  }

  if (Number(tarifa?.precio_desde || 0) > 0) {
    partes.push(`Como referencia, este servicio parte desde ${formatoCLP(tarifa.precio_desde)}.`);
  } else if (Number(tarifa?.precio_referencia || 0) > 0) {
    partes.push(`Como referencia, el valor estimado es ${formatoCLP(tarifa.precio_referencia)}.`);
  }

  if (["DIAGNOSTICO", "REVISION_DTC"].includes(lead.servicio_interes)) {
    partes.push("Podemos partir con diagnóstico profesional y revisión DTC antes de cotizar trabajos mayores.");
  } else if (["STAGE_1", "STAGE_2", "STAGE_3", "ECU", "TCU"].includes(lead.servicio_interes)) {
    partes.push("Para calibración ECU/TCU revisamos vehículo, motor, estado técnico y objetivo del proyecto.");
  } else if (lead.servicio_interes === "FILE_SERVICE") {
    partes.push("Para File Service necesitamos archivo original, método de lectura, herramienta usada y objetivo técnico.");
  } else {
    partes.push("Podemos revisar tu caso y orientarte con una evaluación técnica.");
  }

  partes.push("El valor final depende de evaluación técnica, normativa aplicable, uso autorizado y condición real del vehículo.");
  partes.push("Estamos en La Florida, Santiago, cerca de Metro Vicente Valdés. WhatsApp oficial: +56 9 6226 7642.");
  return partes.join(" ");
};

const badgeEstado = (estado) => {
  return getStatusColor(estado || "NUEVO", "soft");
};

const badgePrioridad = (prioridad) => {
  return getPriorityColor(prioridad || "MEDIA", "soft");
};

function LeadsPage() {
  const [searchParams] = useSearchParams();
  const leadIdQuery = searchParams.get("leadId");
  const estadoQuery = searchParams.get("estado");
  const leadCalienteQuery = searchParams.get("es_lead_caliente");

  const [leads, setLeads] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [tarifas, setTarifas] = useState([]);
  const [tarifaForm, setTarifaForm] = useState(TARIFA_FORM_INICIAL);
  const [tarifaEditando, setTarifaEditando] = useState({});
  const [campanias, setCampanias] = useState([]);
  const [resumenCampanias, setResumenCampanias] = useState([]);
  const [campaniaForm, setCampaniaForm] = useState(CAMPANIA_FORM_INICIAL);
  const [campaniaEditando, setCampaniaEditando] = useState({});
  const [seleccionadoId, setSeleccionadoId] = useState("");
  const [form, setForm] = useState(FORM_INICIAL);
  const [editForm, setEditForm] = useState({});
  const [interaccion, setInteraccion] = useState({
    canal: "WHATSAPP",
    direccion: "SALIENTE",
    mensaje: "",
  });
  const [ordenForm, setOrdenForm] = useState({
    vehiculoId: "",
    kilometraje: "",
    monto_total: "",
  });
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const rolUsuario = String(localStorage.getItem("rol") || "").toUpperCase();
  const puedeGestionarLead = ["OWNER", "ADMIN", "RECEPCION"].includes(rolUsuario);
  const puedeAsignarLead = ["OWNER", "ADMIN", "RECEPCION", "SUPERVISOR"].includes(
    rolUsuario
  );
  const puedeContactarLead =
    puedeGestionarLead || ["OPERADOR_ECU", "TUNER"].includes(rolUsuario);
  const puedeAdministrarTarifas = ["OWNER", "ADMIN"].includes(rolUsuario);
  const puedeVerTarifas = [
    "OWNER",
    "ADMIN",
    "SUPERVISOR",
    "RECEPCION",
    "OPERADOR_SCANNER",
    "OPERADOR_ECU",
    "MECANICO",
    "TUNER",
  ].includes(rolUsuario);
  const puedeVerCampanias = ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"].includes(
    rolUsuario
  );
  const puedeAdministrarCampanias = ["OWNER", "ADMIN"].includes(rolUsuario);
  const puedeVerCostosCampania = ["OWNER", "ADMIN", "SUPERVISOR"].includes(
    rolUsuario
  );

  const cargar = async () => {
    try {
      setLoading(true);
      setError("");

      const [leadsRes, usuariosRes, tarifasRes, campaniasRes, resumenCampaniasRes] =
        await Promise.allSettled([
        api.get("/leads"),
        api.get("/usuarios/responsables"),
        puedeVerTarifas ? api.get("/tarifas") : Promise.resolve({ data: [] }),
        puedeVerCampanias ? api.get("/campanias") : Promise.resolve({ data: [] }),
        puedeVerCampanias
          ? api.get("/leads/resumen-campanias")
          : Promise.resolve({ data: [] }),
      ]);

      if (leadsRes.status === "fulfilled") {
        const data = leadsRes.value.data;
        setLeads(Array.isArray(data) ? data : data.leads || []);
      } else {
        throw leadsRes.reason;
      }

      if (usuariosRes.status === "fulfilled") {
        const data = usuariosRes.value.data;
        setUsuarios(Array.isArray(data) ? data : data.usuarios || []);
      } else {
        setUsuarios([]);
      }

      if (tarifasRes.status === "fulfilled") {
        const data = tarifasRes.value.data;
        setTarifas(Array.isArray(data) ? data : data.tarifas || []);
      } else {
        setTarifas([]);
      }

      if (campaniasRes.status === "fulfilled") {
        const data = campaniasRes.value.data;
        setCampanias(Array.isArray(data) ? data : data.campanias || []);
      } else {
        setCampanias([]);
      }

      if (resumenCampaniasRes.status === "fulfilled") {
        const data = resumenCampaniasRes.value.data;
        setResumenCampanias(Array.isArray(data) ? data : data.campanias || []);
      } else {
        setResumenCampanias([]);
      }
    } catch (err) {
      console.error("ERROR CARGANDO LEADS:", err.response?.data || err.message);
      setError(err.response?.data?.error || "No se pudieron cargar los leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    if (!estadoQuery) return;
    const estado = estadoQuery.toUpperCase();
    if (!ESTADOS.includes(estado)) return;
    setFiltros((actual) => ({ ...actual, estado }));
  }, [estadoQuery]);

  useEffect(() => {
    if (!leadCalienteQuery) return;
    if (!["true", "false"].includes(leadCalienteQuery)) return;
    setFiltros((actual) => ({
      ...actual,
      es_lead_caliente: leadCalienteQuery,
    }));
  }, [leadCalienteQuery]);

  useEffect(() => {
    if (!leadIdQuery || !leads.length) return;
    const existe = leads.some((lead) => String(lead.id) === String(leadIdQuery));
    if (existe) setSeleccionadoId(String(leadIdQuery));
  }, [leadIdQuery, leads]);

  const leadsFiltrados = useMemo(() => {
    return leads.filter((lead) => {
      return Object.entries(filtros).every(([campo, valor]) => {
        if (!valor) return true;
        if (campo === "campaniaId") {
          return String(lead.campaniaId || "") === String(valor);
        }
        if (campo === "es_lead_caliente") {
          return Boolean(lead.es_lead_caliente) === (valor === "true");
        }
        return String(lead[campo] || "") === String(valor);
      });
    });
  }, [leads, filtros]);

  const seleccionado = useMemo(
    () => leads.find((lead) => String(lead.id) === String(seleccionadoId)) || null,
    [leads, seleccionadoId]
  );
  const tarifaFormSeleccionada = useMemo(
    () => tarifaParaServicio(tarifas, form.servicio_interes),
    [tarifas, form.servicio_interes]
  );
  const tarifaSeleccionada = useMemo(
    () => tarifaParaServicio(tarifas, seleccionado?.servicio_interes),
    [tarifas, seleccionado?.servicio_interes]
  );

  useEffect(() => {
    setEditForm(seleccionado || {});
    setInteraccion({
      canal: seleccionado?.canal || "WHATSAPP",
      direccion: "SALIENTE",
      mensaje: "",
    });
    setOrdenForm({ vehiculoId: "", kilometraje: "", monto_total: "" });
  }, [seleccionadoId, seleccionado?.updatedAt]);

  const pipeline = useMemo(() => {
    return ESTADOS.map((estado) => ({
      estado,
      total: leads.filter((lead) => lead.estado === estado).length,
    }));
  }, [leads]);

  const actualizarForm = (campo, valor) => {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  };

  const actualizarEdit = (campo, valor) => {
    setEditForm((actual) => ({ ...actual, [campo]: valor }));
  };

  const crearLead = async (event) => {
    event.preventDefault();
    setMensaje("");
    setError("");

    if (!form.nombre.trim()) {
      setError("Debes ingresar nombre del lead.");
      return;
    }

    if (!form.telefono.trim() && !form.email.trim() && !form.mensaje_inicial.trim()) {
      setError("Debes registrar teléfono, email o mensaje inicial.");
      return;
    }

    try {
      setGuardando(true);
      const res = await api.post("/leads", form);
      setMensaje("Lead creado y calificado en modo determinístico.");
      setForm(FORM_INICIAL);
      await cargar();
      if (res.data?.lead?.id) setSeleccionadoId(String(res.data.lead.id));
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear el lead.");
    } finally {
      setGuardando(false);
    }
  };

  const guardarLead = async () => {
    if (!seleccionado) return;
    try {
      setGuardando(true);
      const payload = puedeGestionarLead
        ? editForm
        : { asignado_a: editForm.asignado_a || "" };
      await api.patch(`/leads/${seleccionado.id}`, payload);
      setMensaje("Lead actualizado.");
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo actualizar el lead.");
    } finally {
      setGuardando(false);
    }
  };

  const calificarLead = async () => {
    if (!seleccionado) return;
    try {
      setGuardando(true);
      await api.post(`/leads/${seleccionado.id}/calificar`, editForm);
      setMensaje("Lead calificado.");
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo calificar el lead.");
    } finally {
      setGuardando(false);
    }
  };

  const agregarInteraccion = async () => {
    if (!seleccionado) return;
    if (!interaccion.mensaje.trim()) {
      setError("Debes escribir una interacción.");
      return;
    }

    try {
      setGuardando(true);
      await api.post(`/leads/${seleccionado.id}/interacciones`, interaccion);
      setMensaje("Interacción registrada.");
      setInteraccion((actual) => ({ ...actual, mensaje: "" }));
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo registrar la interacción.");
    } finally {
      setGuardando(false);
    }
  };

  const convertirCliente = async () => {
    if (!seleccionado) return;
    try {
      setGuardando(true);
      await api.post(`/leads/${seleccionado.id}/convertir-cliente`);
      setMensaje("Lead convertido a cliente.");
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo convertir a cliente.");
    } finally {
      setGuardando(false);
    }
  };

  const convertirOrden = async () => {
    if (!seleccionado) return;
    if (!ordenForm.vehiculoId) {
      setError("Debes indicar un vehiculoId existente para crear orden desde lead.");
      return;
    }

    try {
      setGuardando(true);
      await api.post(`/leads/${seleccionado.id}/convertir-orden`, ordenForm);
      setMensaje("Orden creada desde lead.");
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear orden desde lead.");
    } finally {
      setGuardando(false);
    }
  };

  const copiarSugerencia = async () => {
    if (!seleccionado) return;
    try {
      await navigator.clipboard.writeText(sugerenciaRespuesta(seleccionado, tarifaSeleccionada));
      setMensaje("Sugerencia copiada. Revísala antes de enviarla manualmente.");
    } catch {
      setError("No se pudo copiar la sugerencia.");
    }
  };

  const crearTarifa = async (event) => {
    event.preventDefault();
    if (!puedeAdministrarTarifas) return;
    if (!String(tarifaForm.servicio || "").trim()) {
      setError("Debes indicar el servicio de la tarifa.");
      return;
    }

    try {
      setGuardando(true);
      await api.post("/tarifas", tarifaForm);
      setMensaje("Tarifa comercial creada.");
      setTarifaForm(TARIFA_FORM_INICIAL);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear la tarifa.");
    } finally {
      setGuardando(false);
    }
  };

  const guardarTarifa = async (tarifa) => {
    if (!puedeAdministrarTarifas || !tarifa?.id) return;
    try {
      setGuardando(true);
      const payload = tarifaEditando[tarifa.id] || tarifa;
      await api.patch(`/tarifas/${tarifa.id}`, payload);
      setMensaje("Tarifa comercial actualizada.");
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo actualizar la tarifa.");
    } finally {
      setGuardando(false);
    }
  };

  const actualizarTarifaEditando = (id, campo, valor) => {
    setTarifaEditando((actual) => ({
      ...actual,
      [id]: {
        ...(actual[id] || tarifas.find((tarifa) => tarifa.id === id) || {}),
        [campo]: valor,
      },
    }));
  };

  const crearCampania = async (event) => {
    event.preventDefault();
    if (!puedeAdministrarCampanias) return;
    if (!String(campaniaForm.nombre || "").trim()) {
      setError("Debes indicar nombre de campaña.");
      return;
    }

    try {
      setGuardando(true);
      await api.post("/campanias", campaniaForm);
      setMensaje("Campaña comercial creada.");
      setCampaniaForm(CAMPANIA_FORM_INICIAL);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear la campaña.");
    } finally {
      setGuardando(false);
    }
  };

  const guardarCampania = async (campania) => {
    if (!puedeAdministrarCampanias || !campania?.id) return;
    try {
      setGuardando(true);
      const payload = campaniaEditando[campania.id] || campania;
      await api.patch(`/campanias/${campania.id}`, payload);
      setMensaje("Campaña comercial actualizada.");
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo actualizar la campaña.");
    } finally {
      setGuardando(false);
    }
  };

  const actualizarCampaniaEditando = (id, campo, valor) => {
    setCampaniaEditando((actual) => ({
      ...actual,
      [id]: {
        ...(actual[id] || campanias.find((campania) => campania.id === id) || {}),
        [campo]: valor,
      },
    }));
  };

  return (
    <div className="max-w-full mx-auto p-2 space-y-6">
      <header className="bg-black text-white p-6 border-b-8 border-blue-600 shadow-2xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-300">
              CRM Comercial GMTCH
            </p>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
              Leads / CRM
            </h1>
            <p className="mt-2 text-xs font-bold uppercase text-slate-300">
              WhatsApp, Instagram, web, referidos y contactos manuales en una sola cola.
            </p>
          </div>
          <button
            type="button"
            onClick={cargar}
            disabled={loading}
            className="bg-white text-black px-5 py-3 text-xs font-black uppercase disabled:opacity-50"
          >
            {loading ? "Actualizando..." : "Actualizar CRM"}
          </button>
        </div>
      </header>

      {mensaje && (
        <div className="border-4 border-emerald-600 bg-emerald-50 p-4 text-sm font-black uppercase text-emerald-900">
          {mensaje}
        </div>
      )}
      {error && (
        <div className="border-4 border-red-600 bg-red-50 p-4 text-sm font-black uppercase text-red-900">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5 xl:grid-cols-10">
        {pipeline.map((item) => (
          <button
            key={item.estado}
            type="button"
            onClick={() => setFiltros((actual) => ({ ...actual, estado: item.estado }))}
            className={`border-4 p-3 text-left ${
              filtros.estado === item.estado
                ? "border-blue-700 bg-blue-50"
                : "border-black bg-white"
            }`}
          >
            <p className="text-[10px] font-black uppercase text-gray-500">
              {item.estado}
            </p>
            <p className="text-3xl font-black">{item.total}</p>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          {puedeGestionarLead ? (
            <details open className="border-4 border-black bg-white p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <summary className="cursor-pointer text-sm font-black uppercase">
                Nuevo lead
              </summary>
              <form onSubmit={crearLead} className="mt-4 space-y-3">
                <Input label="Nombre" value={form.nombre} onChange={(v) => actualizarForm("nombre", v)} required />
                <Input label="Teléfono / WhatsApp" value={form.telefono} onChange={(v) => actualizarForm("telefono", v)} />
                <Input label="Email" value={form.email} onChange={(v) => actualizarForm("email", v)} />
                <Select label="Canal" value={form.canal} onChange={(v) => actualizarForm("canal", v)} options={CANALES.map((v) => [v, v])} />
                <Select
                  label="Campaña"
                  value={form.campaniaId}
                  onChange={(v) => actualizarForm("campaniaId", v)}
                  options={[
                    ["", "Sin campaña / orgánico"],
                    ...campanias
                      .filter((campania) => campania.estado === "ACTIVA")
                      .map((campania) => [String(campania.id), campania.nombre]),
                  ]}
                />
                <Select label="Servicio interés" value={form.servicio_interes} onChange={(v) => actualizarForm("servicio_interes", v)} options={SERVICIOS} />
                <TarifaRapida tarifa={tarifaFormSeleccionada} servicio={form.servicio_interes} />
                <Input label="Marca" value={form.vehiculo_marca} onChange={(v) => actualizarForm("vehiculo_marca", v)} />
                <Input label="Modelo" value={form.vehiculo_modelo} onChange={(v) => actualizarForm("vehiculo_modelo", v)} />
                <Input label="Año" value={form.vehiculo_anio} onChange={(v) => actualizarForm("vehiculo_anio", v)} />
                <Input label="Motor" value={form.vehiculo_motor} onChange={(v) => actualizarForm("vehiculo_motor", v)} />
                <Input label="Patente" value={form.patente} onChange={(v) => actualizarForm("patente", v.toUpperCase())} />
                <Input label="Presupuesto indicado" type="number" value={form.presupuesto_estimado} onChange={(v) => actualizarForm("presupuesto_estimado", v)} />
                <details className="border-2 border-black bg-slate-50 p-3">
                  <summary className="cursor-pointer text-[10px] font-black uppercase text-gray-500">
                    UTM / origen avanzado
                  </summary>
                  <div className="mt-3 space-y-2">
                    <Input label="utm_source" value={form.utm_source} onChange={(v) => actualizarForm("utm_source", v)} />
                    <Input label="utm_campaign" value={form.utm_campaign} onChange={(v) => actualizarForm("utm_campaign", v)} />
                    <Input label="utm_content" value={form.utm_content} onChange={(v) => actualizarForm("utm_content", v)} />
                  </div>
                </details>
                <Textarea label="Mensaje inicial" value={form.mensaje_inicial} onChange={(v) => actualizarForm("mensaje_inicial", v)} />
                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full bg-black px-4 py-3 text-xs font-black uppercase text-white disabled:opacity-50"
                >
                  Crear lead
                </button>
              </form>
            </details>
          ) : (
            <div className="border-4 border-black bg-white p-4 text-xs font-black uppercase text-gray-500">
              Este rol puede revisar o trabajar leads asignados. La creación y conversión
              comercial queda para recepción, administración u OWNER.
            </div>
          )}

          <div className="border-4 border-black bg-white p-4">
            <h2 className="text-sm font-black uppercase">Filtros</h2>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <Select label="Estado" value={filtros.estado} onChange={(v) => setFiltros((a) => ({ ...a, estado: v }))} options={[["", "Todos"], ...ESTADOS.map((v) => [v, v])]} />
              <Select label="Canal" value={filtros.canal} onChange={(v) => setFiltros((a) => ({ ...a, canal: v }))} options={[["", "Todos"], ...CANALES.map((v) => [v, v])]} />
              <Select label="Prioridad" value={filtros.prioridad} onChange={(v) => setFiltros((a) => ({ ...a, prioridad: v }))} options={[["", "Todas"], ...PRIORIDADES.map((v) => [v, v])]} />
              <Select label="Servicio" value={filtros.servicio_interes} onChange={(v) => setFiltros((a) => ({ ...a, servicio_interes: v }))} options={[["", "Todos"], ...SERVICIOS]} />
              <Select
                label="Campaña"
                value={filtros.campaniaId}
                onChange={(v) => setFiltros((a) => ({ ...a, campaniaId: v }))}
                options={[
                  ["", "Todas"],
                  ...campanias.map((campania) => [String(campania.id), campania.nombre]),
                ]}
              />
              <Select
                label="Lead caliente"
                value={filtros.es_lead_caliente}
                onChange={(v) => setFiltros((a) => ({ ...a, es_lead_caliente: v }))}
                options={[
                  ["", "Todos"],
                  ["true", "Sí"],
                  ["false", "No"],
                ]}
              />
              <button
                type="button"
                onClick={() => setFiltros(FILTROS_INICIALES)}
                className="border-2 border-black px-3 py-2 text-xs font-black uppercase"
              >
                Limpiar filtros
              </button>
            </div>
          </div>

          {puedeVerCampanias && (
            <CampaniasComerciales
              campanias={campanias}
              resumenCampanias={resumenCampanias}
              campaniaForm={campaniaForm}
              setCampaniaForm={setCampaniaForm}
              campaniaEditando={campaniaEditando}
              onEditarCampania={actualizarCampaniaEditando}
              onCrearCampania={crearCampania}
              onGuardarCampania={guardarCampania}
              puedeAdministrar={puedeAdministrarCampanias}
              puedeVerCostos={puedeVerCostosCampania}
              guardando={guardando}
            />
          )}

          {puedeVerTarifas && (
            <TarifarioComercial
              tarifas={tarifas}
              tarifaForm={tarifaForm}
              setTarifaForm={setTarifaForm}
              tarifaEditando={tarifaEditando}
              onEditarTarifa={actualizarTarifaEditando}
              onCrearTarifa={crearTarifa}
              onGuardarTarifa={guardarTarifa}
              puedeAdministrar={puedeAdministrarTarifas}
              guardando={guardando}
            />
          )}

          <div className="border-4 border-black bg-white">
            <div className="border-b-4 border-black p-4">
              <h2 className="text-sm font-black uppercase">
                Lista compacta ({leadsFiltrados.length})
              </h2>
            </div>
            <div className="max-h-[620px] overflow-auto">
              {leadsFiltrados.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => setSeleccionadoId(String(lead.id))}
                  className={`w-full border-b-2 border-black p-4 text-left ${
                    String(lead.id) === String(seleccionadoId)
                      ? "bg-blue-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black uppercase">#{lead.id} {lead.nombre}</p>
                      <p className="text-[10px] font-bold uppercase text-gray-500">
                        {lead.canal} / {lead.servicio_interes}
                      </p>
                    </div>
                    <span className={`border px-2 py-1 text-[10px] font-black ${badgePrioridad(lead.prioridad)}`}>
                      {lead.prioridad}
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] font-black uppercase text-gray-500">
                    Score {lead.score_interes || 0} / {lead.estado}
                  </p>
                </button>
              ))}

              {!leadsFiltrados.length && (
                <div className="p-8 text-center text-xs font-black uppercase text-gray-400">
                  Sin leads con este filtro.
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="min-h-[520px] border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)]">
          {!seleccionado ? (
            <div className="flex min-h-[420px] items-center justify-center text-center">
              <div>
                <p className="text-2xl font-black uppercase">
                  Selecciona o crea un lead comercial.
                </p>
                <p className="mt-2 text-xs font-bold uppercase text-gray-500">
                  El objetivo es no perder conversaciones reales en WhatsApp, Instagram o web.
                </p>
              </div>
            </div>
          ) : (
            <LeadDetalle
              lead={seleccionado}
              tarifa={tarifaSeleccionada}
              campanias={campanias}
              editForm={editForm}
              setEditForm={actualizarEdit}
              usuarios={usuarios}
              interaccion={interaccion}
              setInteraccion={setInteraccion}
              ordenForm={ordenForm}
              setOrdenForm={setOrdenForm}
              onGuardar={guardarLead}
              onCalificar={calificarLead}
              onInteraccion={agregarInteraccion}
              onConvertirCliente={convertirCliente}
              onConvertirOrden={convertirOrden}
              onCopiarSugerencia={copiarSugerencia}
              guardando={guardando}
              puedeGestionarLead={puedeGestionarLead}
              puedeAsignarLead={puedeAsignarLead}
              puedeContactarLead={puedeContactarLead}
            />
          )}
        </main>
      </section>
    </div>
  );
}

function LeadDetalle({
  lead,
  tarifa,
  campanias,
  editForm,
  setEditForm,
  usuarios,
  interaccion,
  setInteraccion,
  ordenForm,
  setOrdenForm,
  onGuardar,
  onCalificar,
  onInteraccion,
  onConvertirCliente,
  onConvertirOrden,
  onCopiarSugerencia,
  guardando,
  puedeGestionarLead,
  puedeAsignarLead,
  puedeContactarLead,
}) {
  const interacciones = obtenerInteracciones(lead).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  return (
    <div className="space-y-6">
      <section className="border-b-4 border-black pb-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
              Lead #{lead.id}
            </p>
            <h2 className="text-3xl font-black uppercase">{lead.nombre}</h2>
            <p className="mt-1 text-xs font-bold uppercase text-gray-500">
              {texto(lead.telefono, "Sin teléfono")} / {texto(lead.email)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`border-2 px-3 py-2 text-xs font-black uppercase ${badgeEstado(lead.estado)}`}>
              {lead.estado}
            </span>
            <span className={`border-2 px-3 py-2 text-xs font-black uppercase ${badgePrioridad(lead.prioridad)}`}>
              {lead.prioridad}
            </span>
            <span className="border-2 border-black bg-slate-50 px-3 py-2 text-xs font-black uppercase">
              Score {lead.score_interes || 0}
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Info label="Canal" value={lead.canal} />
        <Info label="Campaña" value={campaniaNombre(campanias, lead.campaniaId)} />
        <Info label="Lead caliente" value={lead.es_lead_caliente ? "Sí" : "No"} />
        <Info label="Servicio" value={lead.servicio_interes} />
        <Info label="Asignado" value={lead.asignado_a} />
        <Info label="Vehículo" value={`${texto(lead.vehiculo_marca, "")} ${texto(lead.vehiculo_modelo, "")} ${texto(lead.vehiculo_anio, "")}`.trim() || "No registrado"} />
        <Info label="Motor" value={lead.vehiculo_motor} />
        <Info label="Patente" value={lead.patente} />
        <Info label="Presupuesto cliente" value={lead.presupuesto_estimado ? formatoCLP(lead.presupuesto_estimado) : "No registrado"} />
        <Info label="Datos mínimos" value={lead.datos_minimos_completos ? "Completos" : `Faltan: ${datosFaltantesLead(lead).join(", ") || "No registrado"}`} />
        <Info label="Filtro comercial" value={lead.presupuesto_bajo ? "Presupuesto bajo" : "Sin alerta de presupuesto"} />
        <Info label="Próximo contacto" value={fecha(lead.proximo_contacto_at)} />
        <Info label="Primer contacto" value={fecha(lead.primer_contacto_at)} />
        <Info label="Respondido" value={fecha(lead.respondido_at)} />
        <Info label="Tiempo respuesta" value={lead.tiempo_respuesta_minutos ? `${lead.tiempo_respuesta_minutos} min` : "Pendiente"} />
        <Info label="Cliente convertido" value={lead.convertido_cliente_id ? `Cliente #${lead.convertido_cliente_id}` : "Pendiente"} />
        <Info label="Orden convertida" value={lead.convertido_orden_id ? `Orden #${lead.convertido_orden_id}` : "Pendiente"} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TarifaRapida tarifa={tarifa} servicio={lead.servicio_interes} grande />
        <AnalisisComercialLead lead={lead} tarifa={tarifa} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="border-4 border-black p-4">
          <h3 className="text-sm font-black uppercase">Editar lead</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {puedeGestionarLead && (
              <>
                <Select label="Estado" value={editForm.estado || "NUEVO"} onChange={(v) => setEditForm("estado", v)} options={ESTADOS.map((v) => [v, v])} />
                <Select label="Prioridad" value={editForm.prioridad || "MEDIA"} onChange={(v) => setEditForm("prioridad", v)} options={PRIORIDADES.map((v) => [v, v])} />
                <Select label="Servicio" value={editForm.servicio_interes || "OTRO"} onChange={(v) => setEditForm("servicio_interes", v)} options={SERVICIOS} />
                <Select
                  label="Campaña"
                  value={editForm.campaniaId || ""}
                  onChange={(v) => setEditForm("campaniaId", v)}
                  options={[
                    ["", "Sin campaña / orgánico"],
                    ...campanias
                      .filter((campania) => campania.estado === "ACTIVA")
                      .map((campania) => [String(campania.id), campania.nombre]),
                  ]}
                />
                <Input label="Presupuesto indicado" type="number" value={editForm.presupuesto_estimado || ""} onChange={(v) => setEditForm("presupuesto_estimado", v)} />
              </>
            )}
            {puedeAsignarLead && (
              <Select label="Asignado a" value={editForm.asignado_a || ""} onChange={(v) => setEditForm("asignado_a", v)} options={[["", "Sin asignar"], ...usuarios.map((u) => [u.username || u.nombre, `${u.nombre || u.username} (${u.rol})`])]} />
            )}
            {puedeGestionarLead && (
              <>
                <Input label="Próxima acción" value={editForm.proxima_accion || ""} onChange={(v) => setEditForm("proxima_accion", v)} className="md:col-span-2" />
                <Input label="Próximo contacto" type="datetime-local" value={String(editForm.proximo_contacto_at || "").slice(0, 16)} onChange={(v) => setEditForm("proximo_contacto_at", v)} />
                <Input label="Motivo perdido" value={editForm.perdido_motivo || ""} onChange={(v) => setEditForm("perdido_motivo", v)} />
                <Input label="utm_source" value={editForm.utm_source || ""} onChange={(v) => setEditForm("utm_source", v)} />
                <Input label="utm_campaign" value={editForm.utm_campaign || ""} onChange={(v) => setEditForm("utm_campaign", v)} />
                <Input label="utm_content" value={editForm.utm_content || ""} onChange={(v) => setEditForm("utm_content", v)} />
              </>
            )}
          </div>
          {(puedeGestionarLead || puedeAsignarLead) && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={onGuardar} disabled={guardando} className="bg-black px-4 py-3 text-xs font-black uppercase text-white disabled:opacity-50">
                {puedeGestionarLead ? "Guardar cambios" : "Guardar asignación"}
              </button>
              {puedeGestionarLead && (
                <button type="button" onClick={onCalificar} disabled={guardando} className="bg-blue-700 px-4 py-3 text-xs font-black uppercase text-white disabled:opacity-50">
                  Calificar lead
                </button>
              )}
            </div>
          )}
        </div>

        <div className="border-4 border-blue-700 bg-blue-50 p-4">
          <h3 className="text-sm font-black uppercase text-blue-950">
            Sugerencia de respuesta
          </h3>
          <p className="mt-3 whitespace-pre-wrap text-sm font-bold text-blue-950">
            {sugerenciaRespuesta(lead, tarifa)}
          </p>
          {puedeContactarLead && (
            <button
              type="button"
              onClick={onCopiarSugerencia}
              className="mt-4 bg-blue-700 px-4 py-3 text-xs font-black uppercase text-white"
            >
              Copiar respuesta sugerida
            </button>
          )}
          <p className="mt-3 text-[10px] font-black uppercase text-blue-900">
            No se envía automáticamente. Revisar antes de responder por WhatsApp o Instagram.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {puedeGestionarLead && (
        <div className="border-4 border-black p-4">
          <h3 className="text-sm font-black uppercase">Conversión</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onConvertirCliente}
              disabled={guardando}
              className="bg-emerald-700 px-4 py-3 text-xs font-black uppercase text-white disabled:opacity-50"
            >
              Convertir a cliente
            </button>
            {lead.convertido_cliente_id && (
              <Link
                to={`/clientes?clienteId=${lead.convertido_cliente_id}`}
                className="border-2 border-black px-4 py-3 text-xs font-black uppercase"
              >
                Ver cliente
              </Link>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input label="Vehiculo ID existente" value={ordenForm.vehiculoId} onChange={(v) => setOrdenForm((a) => ({ ...a, vehiculoId: v }))} />
            <Input label="KM" value={ordenForm.kilometraje} onChange={(v) => setOrdenForm((a) => ({ ...a, kilometraje: v }))} />
            <Input label="Monto total" value={ordenForm.monto_total} onChange={(v) => setOrdenForm((a) => ({ ...a, monto_total: v }))} />
          </div>
          <button
            type="button"
            onClick={onConvertirOrden}
            disabled={guardando}
            className="mt-3 bg-black px-4 py-3 text-xs font-black uppercase text-white disabled:opacity-50"
          >
            Crear orden desde lead
          </button>
          {lead.convertido_orden_id && (
            <Link
              to={`/ordenes?ordenId=${lead.convertido_orden_id}`}
              className="ml-2 inline-block border-2 border-black px-4 py-3 text-xs font-black uppercase"
            >
              Ver orden
            </Link>
          )}
        </div>
        )}

        {puedeContactarLead && (
        <div className="border-4 border-black p-4">
          <h3 className="text-sm font-black uppercase">Nueva interacción</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select label="Canal" value={interaccion.canal} onChange={(v) => setInteraccion((a) => ({ ...a, canal: v }))} options={CANALES.map((v) => [v, v])} />
            <Select label="Dirección" value={interaccion.direccion} onChange={(v) => setInteraccion((a) => ({ ...a, direccion: v }))} options={["ENTRANTE", "SALIENTE", "INTERNA"].map((v) => [v, v])} />
            <Textarea label="Mensaje" value={interaccion.mensaje} onChange={(v) => setInteraccion((a) => ({ ...a, mensaje: v }))} className="md:col-span-2" />
          </div>
          <button
            type="button"
            onClick={onInteraccion}
            disabled={guardando}
            className="mt-3 bg-black px-4 py-3 text-xs font-black uppercase text-white disabled:opacity-50"
          >
            Registrar interacción
          </button>
        </div>
        )}
      </section>

      <section className="border-4 border-black p-4">
        <h3 className="text-sm font-black uppercase">Historial de interacciones</h3>
        <div className="mt-4 space-y-2">
          {interacciones.map((item) => (
            <div key={item.id} className="border-2 border-black bg-slate-50 p-3">
              <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase text-gray-500">
                <span>{item.canal}</span>
                <span>{item.direccion}</span>
                <span>{item.autor || "Sistema"}</span>
                <span>{fecha(item.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm font-bold">{item.mensaje}</p>
            </div>
          ))}
          {!interacciones.length && (
            <div className="border-2 border-dashed border-gray-400 p-4 text-xs font-black uppercase text-gray-400">
              Sin interacciones registradas.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function TarifaRapida({ tarifa, servicio, grande = false }) {
  const sinTarifa = !tarifa;

  return (
    <div
      className={`border-4 ${
        sinTarifa ? "border-amber-500 bg-amber-50" : "border-blue-700 bg-blue-50"
      } p-4 ${grande ? "" : "md:col-span-2"}`}
    >
      <p className="text-[10px] font-black uppercase text-gray-500">
        Tarifario rápido
      </p>
      <h3 className="mt-1 text-lg font-black uppercase text-black">
        {tarifa?.servicio || servicioLabel(servicio)}
      </h3>
      {sinTarifa ? (
        <p className="mt-2 text-xs font-black uppercase text-amber-900">
          Sin tarifa cargada. Pedir datos mínimos y derivar evaluación comercial.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Info label="Desde" value={formatoCLP(tarifa.precio_desde)} />
          <Info label="Mínimo" value={formatoCLP(tarifa.precio_minimo)} />
          <Info label="Referencia" value={formatoCLP(tarifa.precio_referencia)} />
        </div>
      )}
      {tarifa?.descripcion && (
        <p className="mt-3 text-xs font-bold leading-relaxed text-gray-700">
          {tarifa.descripcion}
        </p>
      )}
      {tarifa && (
        <p className="mt-3 text-[10px] font-black uppercase text-blue-900">
          {tarifa.requiere_evaluacion ? "Requiere evaluación técnica" : "Tarifa directa"} /{" "}
          {tarifa.requiere_diagnostico ? "Requiere diagnóstico" : "Diagnóstico según caso"}
        </p>
      )}
    </div>
  );
}

function AnalisisComercialLead({ lead, tarifa }) {
  const faltantes = datosFaltantesLead(lead);
  const presupuesto = Number(lead.presupuesto_estimado || 0);
  const minimo = Number(tarifa?.precio_minimo || 0);
  const presupuestoBajo =
    Boolean(lead.presupuesto_bajo) || (presupuesto > 0 && minimo > 0 && presupuesto < minimo);
  const potencialReal =
    Boolean(lead.datos_minimos_completos) &&
    !presupuestoBajo &&
    Number(lead.score_interes || 0) >= 60;

  let accion = "Pedir datos mínimos antes de cotizar.";
  if (presupuestoBajo) {
    accion = "Responder de forma educativa y explicar rango mínimo del servicio.";
  } else if (potencialReal) {
    accion = "Confirmar agenda o evaluación técnica.";
  } else if (!faltantes.length) {
    accion = "Calificar y dar seguimiento comercial.";
  }

  return (
    <div className="border-4 border-black bg-white p-4">
      <p className="text-[10px] font-black uppercase text-gray-500">
        Agente comercial V1
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Info label="Score" value={`${Number(lead.score_interes || 0)}/100`} />
        <Info label="Datos faltantes" value={faltantes.length ? faltantes.join(", ") : "Completos"} />
        <Info label="Presupuesto" value={presupuestoBajo ? "Bajo mínimo" : "Sin alerta"} />
      </div>
      <div className="mt-3 border-2 border-black bg-slate-50 p-3">
        <p className="text-[10px] font-black uppercase text-gray-500">
          Próxima acción recomendada
        </p>
        <p className="mt-1 text-sm font-black text-black">{accion}</p>
      </div>
    </div>
  );
}

function CampaniasComerciales({
  campanias,
  resumenCampanias,
  campaniaForm,
  setCampaniaForm,
  campaniaEditando,
  onEditarCampania,
  onCrearCampania,
  onGuardarCampania,
  puedeAdministrar,
  puedeVerCostos,
  guardando,
}) {
  const resumenPorId = new Map(
    resumenCampanias.map((item) => [String(item.campaniaId || "SIN_CAMPANIA"), item])
  );

  return (
    <details className="border-4 border-black bg-white p-4">
      <summary className="cursor-pointer text-sm font-black uppercase">
        Campañas
      </summary>

      <p className="mt-3 text-[10px] font-black uppercase leading-relaxed text-gray-500">
        Mide de dónde vienen los leads y qué campaña genera potencial real. WhatsApp
        único público: +56 9 6226 7642.
      </p>

      {puedeAdministrar && (
        <form onSubmit={onCrearCampania} className="mt-4 space-y-3 border-2 border-black bg-slate-50 p-3">
          <Input label="Nombre campaña" value={campaniaForm.nombre} onChange={(v) => setCampaniaForm((a) => ({ ...a, nombre: v }))} />
          <Select label="Canal" value={campaniaForm.canal} onChange={(v) => setCampaniaForm((a) => ({ ...a, canal: v }))} options={CANALES_CAMPANIA.map((v) => [v, v])} />
          <Select label="Objetivo" value={campaniaForm.objetivo} onChange={(v) => setCampaniaForm((a) => ({ ...a, objetivo: v }))} options={OBJETIVOS_CAMPANIA.map((v) => [v, v])} />
          <Select label="Estado" value={campaniaForm.estado} onChange={(v) => setCampaniaForm((a) => ({ ...a, estado: v }))} options={ESTADOS_CAMPANIA.map((v) => [v, v])} />
          <Input label="Presupuesto" type="number" value={campaniaForm.presupuesto} onChange={(v) => setCampaniaForm((a) => ({ ...a, presupuesto: v }))} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input label="Inicio" type="date" value={campaniaForm.fecha_inicio} onChange={(v) => setCampaniaForm((a) => ({ ...a, fecha_inicio: v }))} />
            <Input label="Fin" type="date" value={campaniaForm.fecha_fin} onChange={(v) => setCampaniaForm((a) => ({ ...a, fecha_fin: v }))} />
          </div>
          <Input label="utm_source" value={campaniaForm.utm_source} onChange={(v) => setCampaniaForm((a) => ({ ...a, utm_source: v }))} />
          <Input label="utm_campaign" value={campaniaForm.utm_campaign} onChange={(v) => setCampaniaForm((a) => ({ ...a, utm_campaign: v }))} />
          <Input label="utm_content" value={campaniaForm.utm_content} onChange={(v) => setCampaniaForm((a) => ({ ...a, utm_content: v }))} />
          <Textarea label="Descripción" value={campaniaForm.descripcion} onChange={(v) => setCampaniaForm((a) => ({ ...a, descripcion: v }))} />
          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-black px-4 py-3 text-xs font-black uppercase text-white disabled:opacity-50"
          >
            Crear campaña
          </button>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {campanias.map((campania) => {
          const resumen = resumenPorId.get(String(campania.id)) || {};
          const edit = campaniaEditando[campania.id] || campania;

          return (
            <div key={campania.id} className="border-2 border-black bg-white p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase">{campania.nombre}</p>
                  <p className="text-[10px] font-black uppercase text-gray-500">
                    {campania.canal} / {campania.objetivo} / {campania.estado}
                  </p>
                </div>
                {puedeVerCostos && (
                  <span className="text-xs font-black text-blue-700">
                    {formatoCLP(campania.presupuesto)}
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Info label="Leads" value={resumen.leads_totales ?? 0} />
                <Info label="Potenciales" value={resumen.potenciales_reales ?? 0} />
                <Info label="Ganados" value={resumen.ganados ?? 0} />
                <Info label="Conversión" value={`${resumen.conversion_simple ?? 0}%`} />
                {puedeVerCostos && (
                  <>
                    <Info label="Costo lead" value={formatoCLP(resumen.costo_estimado_por_lead)} />
                    <Info label="Costo real" value={formatoCLP(resumen.costo_estimado_por_lead_real)} />
                  </>
                )}
              </div>

              {puedeAdministrar && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Select label="Estado" value={edit.estado || "ACTIVA"} onChange={(v) => onEditarCampania(campania.id, "estado", v)} options={ESTADOS_CAMPANIA.map((item) => [item, item])} />
                  <Input label="Presupuesto" type="number" value={edit.presupuesto || ""} onChange={(v) => onEditarCampania(campania.id, "presupuesto", v)} />
                  <button
                    type="button"
                    onClick={() => onGuardarCampania(campania)}
                    disabled={guardando}
                    className="bg-blue-700 px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-50 sm:col-span-2"
                  >
                    Guardar campaña
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <div className="border-2 border-dashed border-gray-400 bg-slate-50 p-3">
          <p className="text-xs font-black uppercase text-gray-500">
            Sin campaña / orgánico
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase text-gray-500">
            Usar cuando el origen real no se sabe. Medir potencial real, no solo cantidad
            de mensajes.
          </p>
        </div>
      </div>
    </details>
  );
}

function TarifarioComercial({
  tarifas,
  tarifaForm,
  setTarifaForm,
  tarifaEditando,
  onEditarTarifa,
  onCrearTarifa,
  onGuardarTarifa,
  puedeAdministrar,
  guardando,
}) {
  return (
    <details className="border-4 border-black bg-white p-4">
      <summary className="cursor-pointer text-sm font-black uppercase">
        Tarifas comerciales
      </summary>

      <p className="mt-3 text-[10px] font-black uppercase leading-relaxed text-gray-500">
        Base interna para cotizar sin inventar valores. Los montos en cero no se muestran
        como precio al cliente.
      </p>

      {puedeAdministrar && (
        <form onSubmit={onCrearTarifa} className="mt-4 space-y-3 border-2 border-black bg-slate-50 p-3">
          <Select
            label="Servicio"
            value={tarifaForm.servicio}
            onChange={(v) =>
              setTarifaForm((actual) => ({
                ...actual,
                servicio: v ? servicioLabel(v) : "",
              }))
            }
            options={[["", "Seleccionar"], ...SERVICIOS]}
          />
          <Select
            label="Categoría"
            value={tarifaForm.categoria}
            onChange={(v) => setTarifaForm((actual) => ({ ...actual, categoria: v }))}
            options={CATEGORIAS_TARIFA.map((item) => [item, item])}
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Input label="Desde" type="number" value={tarifaForm.precio_desde} onChange={(v) => setTarifaForm((a) => ({ ...a, precio_desde: v }))} />
            <Input label="Mínimo" type="number" value={tarifaForm.precio_minimo} onChange={(v) => setTarifaForm((a) => ({ ...a, precio_minimo: v }))} />
            <Input label="Referencia" type="number" value={tarifaForm.precio_referencia} onChange={(v) => setTarifaForm((a) => ({ ...a, precio_referencia: v }))} />
          </div>
          <Textarea label="Descripción" value={tarifaForm.descripcion} onChange={(v) => setTarifaForm((a) => ({ ...a, descripcion: v }))} />
          <Textarea label="Notas internas" value={tarifaForm.notas_internas} onChange={(v) => setTarifaForm((a) => ({ ...a, notas_internas: v }))} />
          <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-600">
            <input
              type="checkbox"
              checked={Boolean(tarifaForm.requiere_evaluacion)}
              onChange={(e) => setTarifaForm((a) => ({ ...a, requiere_evaluacion: e.target.checked }))}
            />
            Requiere evaluación
          </label>
          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-black px-4 py-3 text-xs font-black uppercase text-white disabled:opacity-50"
          >
            Crear tarifa
          </button>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {tarifas.map((tarifa) => {
          const edit = tarifaEditando[tarifa.id] || tarifa;
          return (
            <div key={tarifa.id} className="border-2 border-black bg-white p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase">{tarifa.servicio}</p>
                  <p className="text-[10px] font-black uppercase text-gray-500">
                    {tarifa.categoria} / {tarifa.activo ? "Activa" : "Inactiva"}
                  </p>
                </div>
                <span className="text-xs font-black text-blue-700">
                  {formatoCLP(tarifa.precio_desde)}
                </span>
              </div>

              {puedeAdministrar ? (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Input label="Desde" type="number" value={edit.precio_desde || ""} onChange={(v) => onEditarTarifa(tarifa.id, "precio_desde", v)} />
                  <Input label="Mínimo" type="number" value={edit.precio_minimo || ""} onChange={(v) => onEditarTarifa(tarifa.id, "precio_minimo", v)} />
                  <Input label="Referencia" type="number" value={edit.precio_referencia || ""} onChange={(v) => onEditarTarifa(tarifa.id, "precio_referencia", v)} />
                  <button
                    type="button"
                    onClick={() => onGuardarTarifa(tarifa)}
                    disabled={guardando}
                    className="bg-blue-700 px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-50 sm:col-span-3"
                  >
                    Guardar tarifa
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-[10px] font-bold uppercase text-gray-500">
                  Mínimo {formatoCLP(tarifa.precio_minimo)} / referencia{" "}
                  {formatoCLP(tarifa.precio_referencia)}
                </p>
              )}
            </div>
          );
        })}
        {!tarifas.length && (
          <div className="border-2 border-dashed border-gray-400 p-4 text-xs font-black uppercase text-gray-400">
            Sin tarifas disponibles.
          </div>
        )}
      </div>
    </details>
  );
}

function Input({ label, value, onChange, type = "text", required, className = "" }) {
  return (
    <label className={`block text-[10px] font-black uppercase text-gray-500 ${className}`}>
      {label}
      <input
        type={type}
        required={required}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border-2 border-black bg-white p-3 text-sm font-bold text-black"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, className = "" }) {
  return (
    <label className={`block text-[10px] font-black uppercase text-gray-500 ${className}`}>
      {label}
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-1 w-full border-2 border-black bg-white p-3 text-sm font-bold text-black"
      />
    </label>
  );
}

function Select({ label, value, onChange, options, className = "" }) {
  return (
    <label className={`block text-[10px] font-black uppercase text-gray-500 ${className}`}>
      {label}
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border-2 border-black bg-white p-3 text-sm font-bold text-black"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Info({ label, value }) {
  return (
    <div className="border-2 border-black bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-black">
        {texto(value)}
      </p>
    </div>
  );
}

export default LeadsPage;

