import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const ESTADO_INICIAL_FORM = {
  ordenId: "",
  tipo_servicio: "",
  prioridad: "MEDIA",
  metodo_lectura: "OBD",
  herramienta_lectura: "",
  marca_ecu: "",
  modelo_ecu: "",
  hw: "",
  sw: "",
  version_software: "",
  observaciones: "",
  notas_operador: "",
};

const SERVICIOS = [
  "🚫 DPF / FAP OFF",
  "🚫 EGR OFF",
  "🚫 ADBLUE / SCR / DEF OFF",
  "🚫 NOX OFF",
  "🚫 LAMBDA OFF",
  "🚫 TVA / MARIPOSA OFF",
  "🚫 DTC OFF ESPECÍFICO",

  "⚡ STAGE 1",
  "⚡ STAGE 2",
  "🏁 STAGE 3",
  "🧬 STAGE CUSTOM",
  "⛽ ECO TUNE / OPTIMIZACIÓN CONSUMO",
  "🚚 FLEET TUNE / FLOTA",

  "🔥 POPS & BANGS",
  "🔥 BURBLE",
  "🔥 HARDCUT BENCINA",
  "🔥 POPCORN / HARDCUT DIÉSEL",
  "🚀 LAUNCH CONTROL",
  "💥 ANTILAG",
  "🏎️ VMAX OFF / LIMITADOR VELOCIDAD",
  "🔧 LIMITADOR RPM",

  "🧠 DIAGNÓSTICO ARCHIVO",
  "🧠 REVISIÓN MAPA",
  "🧠 CORRECCIÓN ARCHIVO",
  "🧠 SEGUNDA VERSIÓN / AJUSTE",

  "🔐 IMMO OFF",
  "🔐 CLONACIÓN ECU",
  "🔐 VIRGINIZACIÓN ECU",
  "💥 AIRBAG CRASH DATA",
  "🧩 BCM / BSI / FRM / CAS / MÓDULO",

  "🚚 CAMIÓN / MAQUINARIA DPF-EGR-ADBLUE",
  "🚜 AGRÍCOLA / INDUSTRIAL",
  "🚤 MARÍTIMO / JETSKI",
  "🏍️ MOTO / ATV",

  "📂 OTRO FILE SERVICE",
];

const METODOS_LECTURA = [
  "OBD",
  "BENCH",
  "BOOT",
  "ECU RETIRADA",
  "BDM",
  "JTAG",
  "SERVICE MODE",
];

const HERRAMIENTAS = [
  "",
  "KESS3",
  "FLEX",
  "PCMFlash",
  "KTAG",
  "Autotuner",
  "CMD",
  "BitBox",
  "Trasdata",
  "MPPS",
  "Galletto",
  "Xhorse / VVDI",
  "CG100X",
  "UPA",
  "OTRA",
];

const normalizarTexto = (valor) => String(valor ?? "").trim();

const textoEstado = (estado) => {
  return String(estado || "PENDIENTE_TUNER").replace(/_/g, " ");
};

const obtenerVehiculoOrden = (orden) => {
  return orden?.Vehiculo || orden?.vehiculo || orden?.VehiculoOrden || null;
};

const obtenerClienteOrden = (orden) => {
  const vehiculo = obtenerVehiculoOrden(orden);
  return vehiculo?.Cliente || vehiculo?.cliente || orden?.Cliente || orden?.cliente || null;
};

const obtenerPatenteOrden = (orden) => {
  const vehiculo = obtenerVehiculoOrden(orden);
  return vehiculo?.patente || orden?.patente || "SIN PATENTE";
};

const obtenerTituloOrden = (orden) => {
  const vehiculo = obtenerVehiculoOrden(orden);
  const cliente = obtenerClienteOrden(orden);

  const patente = obtenerPatenteOrden(orden);
  const marca = vehiculo?.marca || "";
  const modelo = vehiculo?.modelo || "";
  const anio = vehiculo?.anio || "";
  const clienteNombre = cliente?.nombre || "Cliente no informado";

  return `${patente} | ${marca} ${modelo} ${anio} | ${clienteNombre} | Orden #${orden.id}`;
};

function ArchivosECUPage() {
  const [archivos, setArchivos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [busquedaOrden, setBusquedaOrden] = useState("");

  const [form, setForm] = useState({ ...ESTADO_INICIAL_FORM });
  const [archivoOriginal, setArchivoOriginal] = useState(null);
  const [archivosModificados, setArchivosModificados] = useState({});
  const [instruccionesTuner, setInstruccionesTuner] = useState({});
  const [filtro, setFiltro] = useState("TODOS");
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const backendBase = useMemo(() => {
    return String(api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  }, []);

  const ordenSeleccionada = useMemo(() => {
    if (!form.ordenId) return null;
    return ordenes.find((orden) => String(orden.id) === String(form.ordenId)) || null;
  }, [ordenes, form.ordenId]);

  const ordenesFiltradas = useMemo(() => {
    const q = normalizarTexto(busquedaOrden).toLowerCase();

    return ordenes
      .filter((orden) => {
        const vehiculo = obtenerVehiculoOrden(orden);
        const cliente = obtenerClienteOrden(orden);

        const texto = [
          orden.id,
          orden.estado,
          orden.motivo_ingreso,
          vehiculo?.patente,
          vehiculo?.marca,
          vehiculo?.modelo,
          vehiculo?.anio,
          vehiculo?.vin,
          cliente?.nombre,
          cliente?.telefono,
        ]
          .join(" ")
          .toLowerCase();

        if (!q) return true;
        return texto.includes(q);
      })
      .slice(0, 20);
  }, [ordenes, busquedaOrden]);

  useEffect(() => {
    let activo = true;

    const cargarInicial = async () => {
      try {
        const [archivosRes, ordenesRes] = await Promise.all([
          api.get("/archivos-ecu"),
          api.get("/ordenes"),
        ]);

        if (!activo) return;

        setArchivos(Array.isArray(archivosRes.data) ? archivosRes.data : []);
        setOrdenes(Array.isArray(ordenesRes.data) ? ordenesRes.data : []);
      } catch (err) {
        console.error("ERROR SISTEMA: Fallo en carga inicial File Service", err);

        if (!activo) return;

        setAviso({
          tipo: "error",
          mensaje: "No se pudo cargar File Service.",
        });
      }
    };

    cargarInicial();

    return () => {
      activo = false;
    };
  }, []);

  const mostrarAviso = (tipo, mensaje) => {
    setAviso({ tipo, mensaje });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const recargarTodo = async () => {
    try {
      setCargando(true);

      const [archivosRes, ordenesRes] = await Promise.all([
        api.get("/archivos-ecu"),
        api.get("/ordenes"),
      ]);

      setArchivos(Array.isArray(archivosRes.data) ? archivosRes.data : []);
      setOrdenes(Array.isArray(ordenesRes.data) ? ordenesRes.data : []);
    } catch (err) {
      console.error("ERROR SISTEMA: Fallo en sincronización File Service", err);
      mostrarAviso("error", "No se pudo refrescar File Service.");
    } finally {
      setCargando(false);
    }
  };

  const estadoArchivo = (arq) => {
    if (arq.estado) return arq.estado;
    if (arq.archivo_modificado) return "MODIFICADO_LISTO";
    return "PENDIENTE_TUNER";
  };

  const archivosFiltrados = archivos.filter((arq) => {
    if (filtro === "TODOS") return true;
    return estadoArchivo(arq) === filtro;
  });

  const totalPendientes = archivos.filter(
    (a) => estadoArchivo(a) === "PENDIENTE_TUNER"
  ).length;

  const totalListos = archivos.filter(
    (a) => estadoArchivo(a) === "MODIFICADO_LISTO"
  ).length;

  const urlArchivo = (url) => {
    if (!url) return "#";
    if (String(url).startsWith("http")) return url;
    if (String(url).startsWith("/")) return `${backendBase}${url}`;
    return `${backendBase}/${url}`;
  };

  const actualizarForm = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const seleccionarOrden = (orden) => {
    setForm((prev) => ({
      ...prev,
      ordenId: String(orden.id),
    }));

    setBusquedaOrden(obtenerTituloOrden(orden));
  };

  const limpiarForm = () => {
    setForm({ ...ESTADO_INICIAL_FORM });
    setArchivoOriginal(null);
    setBusquedaOrden("");
  };

  const crearSolicitudFileService = async () => {
    const ordenId = normalizarTexto(form.ordenId);
    const tipoServicio = normalizarTexto(form.tipo_servicio);

    if (!ordenId) {
      mostrarAviso("error", "Debes seleccionar una orden por patente o último ingreso.");
      return;
    }

    if (!tipoServicio) {
      mostrarAviso("error", "Debes seleccionar el tipo de servicio.");
      return;
    }

    if (!archivoOriginal) {
      mostrarAviso("error", "Debes seleccionar el archivo original leído de la ECU.");
      return;
    }

    try {
      setCargando(true);

      const fd = new FormData();

      fd.append("archivo", archivoOriginal);
      fd.append("ordenId", ordenId);
      fd.append("orden_id", ordenId);

      fd.append("tipo_servicio", form.tipo_servicio);
      fd.append("prioridad", form.prioridad);
      fd.append("metodo_lectura", form.metodo_lectura);
      fd.append("herramienta_lectura", form.herramienta_lectura);
      fd.append("marca_ecu", form.marca_ecu);
      fd.append("modelo_ecu", form.modelo_ecu);
      fd.append("hw", form.hw);
      fd.append("sw", form.sw);
      fd.append("version_software", form.version_software);
      fd.append("observaciones", form.observaciones);
      fd.append("notas_operador", form.notas_operador);
      fd.append("estado", "PENDIENTE_TUNER");

      await api.post("/archivos-ecu", fd);

      mostrarAviso("ok", "Solicitud enviada al File Service correctamente.");
      limpiarForm();
      await recargarTodo();
    } catch (err) {
      console.error("ERROR CREANDO FILE SERVICE:", err.response?.data || err.message);

      mostrarAviso(
        "error",
        err.response?.data?.error ||
          err.response?.data?.message ||
          "No se pudo crear la solicitud File Service."
      );
    } finally {
      setCargando(false);
    }
  };

  const handleArchivoModificado = (id, file) => {
    setArchivosModificados((prev) => ({
      ...prev,
      [id]: file || null,
    }));
  };

  const handleInstrucciones = (id, texto) => {
    setInstruccionesTuner((prev) => ({
      ...prev,
      [id]: texto,
    }));
  };

  const handleInyectarModificado = async (id) => {
    const fileMod = archivosModificados[id];

    if (!fileMod) {
      mostrarAviso("error", "Seleccione el archivo modificado para esta solicitud.");
      return;
    }

    try {
      setCargando(true);

      const fd = new FormData();

      fd.append("archivo", fileMod);
      fd.append("instrucciones_tuner", instruccionesTuner[id] || "");
      fd.append("observaciones", instruccionesTuner[id] || "");
      fd.append("estado", "MODIFICADO_LISTO");

      await api.post(`/archivos-ecu/${id}/modificado`, fd);

      mostrarAviso("ok", "Archivo modificado enviado al operador ECU.");

      setArchivosModificados((prev) => ({
        ...prev,
        [id]: null,
      }));

      setInstruccionesTuner((prev) => ({
        ...prev,
        [id]: "",
      }));

      await recargarTodo();
    } catch (err) {
      console.error("Fallo en carga de archivo modificado:", err.response?.data || err.message);
      mostrarAviso("error", "No se pudo subir el archivo modificado.");
    } finally {
      setCargando(false);
    }
  };

  const eliminarArchivoECU = async (id) => {
    const confirmar = window.confirm(
      `¿Eliminar el registro File Service #${id}? Esta acción eliminará el registro de la matriz.`
    );

    if (!confirmar) return;

    try {
      setCargando(true);
      await api.delete(`/archivos-ecu/${id}`);
      mostrarAviso("ok", `Registro File Service #${id} eliminado.`);
      await recargarTodo();
    } catch (err) {
      console.error("ERROR ELIMINANDO ARCHIVO ECU:", err.response?.data || err.message);
      mostrarAviso(
        "error",
        err.response?.data?.error || "No se pudo eliminar el registro File Service."
      );
    } finally {
      setCargando(false);
    }
  };

  const notificarWhatsApp = (arq) => {
    const telefono = "56962267642";

    const texto = [
      "*SISTEMA GMTCH TUNE*",
      "---------------------------",
      "✅ *NUEVO FILE SERVICE*",
      `*ID FILE:* #${arq.id}`,
      `*ID ORDEN:* #${arq.ordenId || arq.orden_id || "SIN ORDEN"}`,
      `*SERVICIO:* ${arq.tipo_servicio || "No informado"}`,
      `*ECU:* ${arq.marca_ecu || ""} ${arq.modelo_ecu || ""}`,
      `*MÉTODO:* ${arq.metodo_lectura || "No informado"}`,
      `*ESTADO:* ${estadoArchivo(arq)}`,
      "---------------------------",
      "_Favor procesar en estación master._",
    ].join("\n");

    const url = `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(
      texto
    )}`;

    window.open(url, "_blank");
  };

  const renderAviso = () => {
    if (!aviso) return null;

    const estilos =
      aviso.tipo === "ok"
        ? "bg-green-100 border-green-600 text-green-900"
        : "bg-red-100 border-red-600 text-red-900";

    return (
      <div className={`border-4 p-4 font-black uppercase text-xs mb-6 ${estilos}`}>
        {aviso.mensaje}
      </div>
    );
  };

  const badgeEstado = (estado) => {
    if (estado === "MODIFICADO_LISTO") {
      return "bg-green-600 text-white";
    }

    if (estado === "EN_PROCESO_TUNER") {
      return "bg-yellow-500 text-black";
    }

    if (estado === "ENTREGADO_OPERADOR") {
      return "bg-blue-600 text-white";
    }

    return "bg-black text-white";
  };

  const renderOrdenSeleccionada = () => {
    if (!ordenSeleccionada) return null;

    const vehiculo = obtenerVehiculoOrden(ordenSeleccionada);
    const cliente = obtenerClienteOrden(ordenSeleccionada);

    return (
      <div className="bg-black text-white border-4 border-blue-600 p-5 mt-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase text-blue-400">
              Orden seleccionada
            </p>

            <h3 className="text-2xl font-black uppercase">
              #{ordenSeleccionada.id} | {vehiculo?.patente || "SIN PATENTE"}
            </h3>

            <p className="text-xs font-bold uppercase text-gray-300 mt-1">
              {vehiculo?.marca || "Marca"} {vehiculo?.modelo || "Modelo"}{" "}
              {vehiculo?.anio || ""} | Cliente: {cliente?.nombre || "No informado"}
            </p>
          </div>

          <div className="text-left xl:text-right">
            <p className="text-[10px] font-black uppercase text-gray-500">
              Estado actual
            </p>
            <p className="text-sm font-black uppercase text-green-400">
              {ordenSeleccionada.estado || "SIN ESTADO"}
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 p-4 mt-4">
          <p className="text-[10px] font-black uppercase text-gray-500 mb-2">
            Trabajo / síntomas registrados
          </p>

          <p className="text-xs font-bold whitespace-pre-wrap">
            {ordenSeleccionada.motivo_ingreso || "Sin detalle registrado"}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-full mx-auto p-2 space-y-10">
      <div className="bg-black text-white p-8 border-b-8 border-blue-600 shadow-2xl">
        <div className="flex flex-col xl:flex-row justify-between gap-8 xl:items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase">
              File Service GMTCH
            </h1>

            <p className="text-blue-400 font-bold text-xs uppercase tracking-[.3em] mt-2">
              Engineering Matrix · Original ECU → Tuner → Modificado → Operador ECU
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="border-2 border-gray-700 p-4">
              <p className="text-[10px] font-black text-gray-500 uppercase">
                Total
              </p>
              <p className="text-4xl font-black">{archivos.length}</p>
            </div>

            <div className="border-2 border-yellow-500 p-4">
              <p className="text-[10px] font-black text-yellow-500 uppercase">
                Pendientes
              </p>
              <p className="text-4xl font-black">{totalPendientes}</p>
            </div>

            <div className="border-2 border-green-500 p-4">
              <p className="text-[10px] font-black text-green-500 uppercase">
                Listos
              </p>
              <p className="text-4xl font-black">{totalListos}</p>
            </div>
          </div>
        </div>
      </div>

      {renderAviso()}

      <section className="bg-white border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-black uppercase">
            Crear solicitud File Service
          </h2>

          <p className="text-xs font-bold uppercase text-gray-500 mt-1">
            El técnico ECU selecciona la orden por patente o último ingreso. No debe escribir el ID manualmente.
          </p>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-500 p-4 mb-6 text-xs font-bold uppercase leading-relaxed">
          Uso sujeto a normativa aplicable y alcance autorizado del servicio. El técnico ECU define el método de lectura:
          OBD, BENCH, BOOT o ECU retirada. El mecánico no toma esa decisión; solo ejecuta instrucciones asignadas.
        </div>

        <div className="border-4 border-black p-5 mb-6 bg-slate-50">
          <h3 className="text-sm font-black uppercase mb-3">
            Buscar orden por patente, cliente, vehículo o número
          </h3>

          <input
            className="border-2 border-black p-4 w-full font-black uppercase bg-white"
            placeholder="Ej: ABCD12, BMW, Volvo, Econorte, #15..."
            value={busquedaOrden}
            onChange={(e) => {
              setBusquedaOrden(e.target.value);
              setForm((prev) => ({ ...prev, ordenId: "" }));
            }}
          />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-4 max-h-96 overflow-auto">
            {ordenesFiltradas.map((orden) => {
              const vehiculo = obtenerVehiculoOrden(orden);
              const cliente = obtenerClienteOrden(orden);
              const activo = String(form.ordenId) === String(orden.id);

              return (
                <button
                  key={orden.id}
                  type="button"
                  onClick={() => seleccionarOrden(orden)}
                  className={`text-left border-2 p-4 transition ${
                    activo
                      ? "bg-black text-white border-blue-600"
                      : "bg-white text-black border-black hover:bg-blue-50"
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-xl font-black uppercase">
                        {vehiculo?.patente || "SIN PATENTE"}
                      </p>

                      <p className="text-xs font-bold uppercase opacity-70">
                        Orden #{orden.id} · {vehiculo?.marca || "Marca"}{" "}
                        {vehiculo?.modelo || "Modelo"} {vehiculo?.anio || ""}
                      </p>

                      <p className="text-xs font-bold uppercase mt-1 opacity-70">
                        Cliente: {cliente?.nombre || "No informado"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase opacity-60">
                        Estado
                      </p>
                      <p className="text-[10px] font-black uppercase">
                        {orden.estado || "—"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {ordenesFiltradas.length === 0 && (
            <p className="text-xs font-black uppercase text-red-600 mt-4">
              No se encontraron órdenes con esa búsqueda.
            </p>
          )}

          {renderOrdenSeleccionada()}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <select
            className="border border-black p-3 w-full font-bold bg-white lg:col-span-2"
            value={form.tipo_servicio}
            onChange={(e) => actualizarForm("tipo_servicio", e.target.value)}
          >
            <option value="">Seleccionar servicio GMTCH Tune</option>
            {SERVICIOS.map((servicio) => (
              <option key={servicio} value={servicio}>
                {servicio}
              </option>
            ))}
          </select>

          <select
            className="border border-black p-3 w-full font-bold bg-white"
            value={form.prioridad}
            onChange={(e) => actualizarForm("prioridad", e.target.value)}
          >
            <option value="BAJA">Prioridad baja</option>
            <option value="MEDIA">Prioridad media</option>
            <option value="ALTA">Prioridad alta</option>
            <option value="URGENTE">Urgente</option>
          </select>

          <select
            className="border border-black p-3 w-full font-bold bg-white"
            value={form.metodo_lectura}
            onChange={(e) => actualizarForm("metodo_lectura", e.target.value)}
          >
            {METODOS_LECTURA.map((metodo) => (
              <option key={metodo} value={metodo}>
                {metodo}
              </option>
            ))}
          </select>

          <select
            className="border border-black p-3 w-full font-bold bg-white"
            value={form.herramienta_lectura}
            onChange={(e) => actualizarForm("herramienta_lectura", e.target.value)}
          >
            {HERRAMIENTAS.map((herramienta) => (
              <option key={herramienta || "SIN"} value={herramienta}>
                {herramienta || "Seleccionar herramienta"}
              </option>
            ))}
          </select>

          <input
            className="border border-black p-3 w-full font-bold"
            placeholder="Marca ECU: Bosch, Delphi, Continental..."
            value={form.marca_ecu}
            onChange={(e) => actualizarForm("marca_ecu", e.target.value)}
          />

          <input
            className="border border-black p-3 w-full font-bold"
            placeholder="Modelo ECU: EDC17C60, MD1CS003..."
            value={form.modelo_ecu}
            onChange={(e) => actualizarForm("modelo_ecu", e.target.value)}
          />

          <input
            className="border border-black p-3 w-full font-bold"
            placeholder="HW"
            value={form.hw}
            onChange={(e) => actualizarForm("hw", e.target.value)}
          />

          <input
            className="border border-black p-3 w-full font-bold"
            placeholder="SW"
            value={form.sw}
            onChange={(e) => actualizarForm("sw", e.target.value)}
          />

          <input
            className="border border-black p-3 w-full font-bold lg:col-span-3"
            placeholder="Versión software / SW upg / ID lectura"
            value={form.version_software}
            onChange={(e) => actualizarForm("version_software", e.target.value)}
          />

          <textarea
            className="border border-black p-3 w-full font-bold lg:col-span-3"
            placeholder="Notas del operador ECU para el tuner. Ej: DTC presentes, DPF vaciado físicamente, lectura OBD ok, sin catalizador, requiere urgencia..."
            value={form.notas_operador}
            onChange={(e) => actualizarForm("notas_operador", e.target.value)}
          />

          <textarea
            className="border border-black p-3 w-full font-bold lg:col-span-3"
            placeholder="Observaciones generales"
            value={form.observaciones}
            onChange={(e) => actualizarForm("observaciones", e.target.value)}
          />

          <div className="lg:col-span-3 border-4 border-dashed border-gray-400 p-6 bg-slate-50">
            <label className="block text-xs font-black uppercase mb-3">
              Archivo original leído de ECU
            </label>

            <input
              type="file"
              className="w-full border-2 border-black p-4 text-xs font-black bg-white"
              onChange={(e) => setArchivoOriginal(e.target.files?.[0] || null)}
            />

            {archivoOriginal && (
              <p className="text-xs font-bold uppercase mt-3">
                Seleccionado: {archivoOriginal.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mt-6">
          <button
            type="button"
            onClick={crearSolicitudFileService}
            disabled={cargando}
            className="bg-black text-white px-8 py-4 font-black uppercase text-xs disabled:bg-gray-400"
          >
            {cargando ? "Guardando..." : "Enviar a Tuner"}
          </button>

          <button
            type="button"
            onClick={limpiarForm}
            className="border-2 border-black px-8 py-4 font-black uppercase text-xs"
          >
            Limpiar Formulario
          </button>
        </div>
      </section>

      <section className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase">Matriz de archivos</h2>
          <p className="text-xs font-bold uppercase text-gray-500">
            Seguimiento de solicitudes activas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {["TODOS", "PENDIENTE_TUNER", "EN_PROCESO_TUNER", "MODIFICADO_LISTO"].map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFiltro(item)}
                className={`px-4 py-2 border-2 border-black font-black text-[10px] uppercase ${
                  filtro === item ? "bg-black text-white" : "bg-white text-black"
                }`}
              >
                {textoEstado(item)}
              </button>
            )
          )}

          <button
            type="button"
            onClick={recargarTodo}
            className="px-4 py-2 border-2 border-blue-600 bg-blue-600 text-white font-black text-[10px] uppercase"
          >
            Refrescar
          </button>
        </div>
      </section>

      <div className="space-y-10">
        {archivosFiltrados.length === 0 ? (
          <div className="bg-white border-4 border-black p-10 text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xl font-black uppercase">
              No hay archivos para este filtro
            </p>
          </div>
        ) : (
          archivosFiltrados.map((arq) => {
            const estado = estadoArchivo(arq);
            const orden = arq.OrdenTrabajo || arq.orden || null;
            const vehiculo = orden ? obtenerVehiculoOrden(orden) : null;
            const cliente = orden ? obtenerClienteOrden(orden) : null;

            return (
              <div
                key={arq.id}
                className="bg-white border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
              >
                <div className="bg-gray-100 border-b-4 border-black p-4 flex flex-col xl:flex-row justify-between gap-4 xl:items-center">
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="bg-black text-white px-3 py-1 text-[10px] font-black uppercase">
                        File #{arq.id}
                      </span>

                      <span className="bg-blue-600 text-white px-3 py-1 text-[10px] font-black uppercase">
                        Orden #{arq.ordenId || arq.orden_id || "—"}
                      </span>

                      <span
                        className={`px-3 py-1 text-[10px] font-black uppercase ${badgeEstado(
                          estado
                        )}`}
                      >
                        {textoEstado(estado)}
                      </span>

                      {arq.prioridad && (
                        <span className="bg-yellow-400 text-black px-3 py-1 text-[10px] font-black uppercase">
                          {arq.prioridad}
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl font-black text-black uppercase">
                      {arq.tipo_servicio || "Servicio no informado"}
                    </h2>

                    <p className="text-xs font-bold uppercase text-gray-500 mt-1">
                      {vehiculo?.patente ? `${vehiculo.patente} | ` : ""}
                      {vehiculo?.marca || ""} {vehiculo?.modelo || ""}{" "}
                      {cliente?.nombre ? `| Cliente: ${cliente.nombre}` : ""}
                    </p>

                    <p className="text-xs font-bold uppercase text-gray-500 mt-1">
                      ECU: {arq.marca_ecu || "—"} {arq.modelo_ecu || "—"} | Método:{" "}
                      {arq.metodo_lectura || "—"} | Herramienta:{" "}
                      {arq.herramienta_lectura || "—"}
                    </p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => notificarWhatsApp(arq)}
                      className="bg-green-500 text-black px-4 py-3 border-2 border-black font-black text-[10px] uppercase hover:bg-black hover:text-white transition"
                    >
                      📲 Notificar Máster
                    </button>

                    <button
                      type="button"
                      onClick={() => eliminarArchivoECU(arq.id)}
                      className="bg-red-600 text-white px-4 py-3 border-2 border-black font-black text-[10px] uppercase hover:bg-black transition"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 divide-y-4 xl:divide-y-0 xl:divide-x-4 divide-black">
                  <div className="p-6 space-y-4">
                    <h3 className="bg-blue-600 text-white px-4 py-1 font-black text-xs uppercase inline-block">
                      Datos técnicos
                    </h3>

                    <Info label="Marca ECU" value={arq.marca_ecu} />
                    <Info label="Modelo ECU" value={arq.modelo_ecu} />
                    <Info label="HW" value={arq.hw} />
                    <Info label="SW" value={arq.sw || arq.version_software} />
                    <Info label="Método lectura" value={arq.metodo_lectura} />
                    <Info label="Herramienta" value={arq.herramienta_lectura} />

                    <div className="bg-slate-50 border-2 border-black p-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                        Notas operador ECU
                      </p>

                      <p className="text-sm font-bold whitespace-pre-wrap">
                        {arq.notas_operador ||
                          arq.observaciones ||
                          "Sin notas registradas."}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    <h3 className="bg-black text-white px-4 py-1 font-black text-xs uppercase inline-block">
                      Entrada: Original ECU
                    </h3>

                    <div className="bg-slate-50 p-8 border-4 border-dashed border-gray-300 text-center">
                      <p className="text-[10px] font-black text-gray-400 mb-6 uppercase tracking-widest italic">
                        Archivo leído por técnico ECU
                      </p>

                      {arq.archivo_original ? (
                        <a
                          href={urlArchivo(arq.archivo_original)}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-black text-white px-8 py-4 font-black text-sm uppercase hover:bg-blue-600 transition-all shadow-xl inline-block"
                        >
                          Descargar Original
                        </a>
                      ) : (
                        <p className="text-red-600 font-black uppercase">
                          Sin archivo original
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 space-y-5">
                    <h3 className="bg-green-600 text-white px-4 py-1 font-black text-xs uppercase inline-block">
                      Salida: Modificado Tuner
                    </h3>

                    {arq.archivo_modificado ? (
                      <div className="space-y-5">
                        <div className="bg-green-100 p-8 border-4 border-green-600 text-center">
                          <p className="text-green-800 font-black text-xl mb-6 uppercase italic tracking-tighter">
                            ✅ Listo para escritura ECU
                          </p>

                          <a
                            href={urlArchivo(arq.archivo_modificado)}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-green-600 text-white px-8 py-4 font-black text-sm uppercase hover:bg-black transition-all shadow-lg inline-block"
                          >
                            Descargar Modificado
                          </a>
                        </div>

                        <div className="bg-white p-5 border-4 border-black">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                            Instrucciones tuner
                          </p>

                          <p className="text-sm font-black text-black uppercase leading-tight whitespace-pre-wrap">
                            {arq.instrucciones_tuner ||
                              arq.observaciones ||
                              "Cargar sin notas adicionales."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5 bg-white p-5 border-4 border-black">
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-black uppercase tracking-tighter italic">
                            Seleccionar archivo modificado:
                          </label>

                          <input
                            type="file"
                            className="w-full border-2 border-black p-4 text-xs font-black bg-gray-50"
                            onChange={(e) =>
                              handleArchivoModificado(arq.id, e.target.files?.[0] || null)
                            }
                          />
                        </div>

                        <textarea
                          className="w-full border-2 border-black p-3 text-xs font-bold"
                          placeholder="Instrucciones para operador ECU. Ej: escribir por OBD, borrar DTC, contacto estable, no cortar corriente..."
                          value={instruccionesTuner[arq.id] || ""}
                          onChange={(e) => handleInstrucciones(arq.id, e.target.value)}
                        />

                        <button
                          type="button"
                          onClick={() => handleInyectarModificado(arq.id)}
                          disabled={cargando}
                          className={`w-full py-5 font-black uppercase text-sm shadow-2xl transition-all ${
                            cargando
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "bg-black text-white hover:bg-green-600"
                          }`}
                        >
                          {cargando ? "Procesando..." : "Subir Modificado"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const Info = ({ label, value }) => (
  <div className="border-b border-gray-200 pb-2">
    <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
    <p className="text-sm font-black uppercase">{value || "—"}</p>
  </div>
);

export default ArchivosECUPage;