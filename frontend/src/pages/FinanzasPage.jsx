import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { descargarArchivoAutenticado } from "../services/api";
import {
  getPaymentStatusColor,
  getStatusColor,
} from "../utils/statusStyles";

const TABS = [
  ["resumen", "Resumen"],
  ["ingresos", "Ingresos"],
  ["gastos", "Gastos"],
  ["sueldos", "Sueldos"],
  ["fondo", "Fondo reserva"],
  ["cierre", "Cierre semanal"],
  ["material", "Material recuperado"],
  ["comprobantes", "Comprobantes"],
];

const TRABAJADORES = [
  "Gaston Munoz",
  "Camila Quemell",
  "Felipe Pozo",
  "Alejandro Cea",
  "Gerson Urdaneta",
];

const PARTICIPANTES_CIERRE = ["Gaston Munoz", "Felipe Pozo", "Alejandro Cea"];

const inputClass =
  "w-full border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase text-black outline-none focus:border-blue-600";

const hoy = () => new Date().toISOString().slice(0, 10);
const loteActual = () => new Date().toISOString().slice(0, 7);

const inicioSemana = () => {
  const ahora = new Date();
  const dia = ahora.getDay() || 7;
  ahora.setDate(ahora.getDate() - dia + 1);
  return ahora.toISOString().slice(0, 10);
};

const finSemana = (inicio) => {
  const fecha = new Date(`${inicio || inicioSemana()}T00:00:00`);
  fecha.setDate(fecha.getDate() + 6);
  return fecha.toISOString().slice(0, 10);
};

const loteDesdeFecha = (valor) => {
  const fecha = valor ? new Date(valor) : new Date();
  if (Number.isNaN(fecha.getTime())) return loteActual();
  return fecha.toISOString().slice(0, 7);
};

const formatearMonto = (valor) => {
  if (valor === null || valor === undefined || valor === "") return "Oculto";
  return `$${Number(valor || 0).toLocaleString("es-CL")}`;
};

const formatearKg = (valor) =>
  `${Number(valor || 0).toLocaleString("es-CL", {
    maximumFractionDigits: 3,
  })} kg`;

const formatearFecha = (valor) => {
  if (!valor) return "No registrado";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "No registrado";
  return fecha.toLocaleDateString("es-CL");
};

const texto = (valor, fallback = "No registrado") =>
  String(valor ?? "").trim() || fallback;

const alertaClase = (alerta) => {
  const valor = String(alerta || "OK").toUpperCase();
  if (valor === "ALERTA") return getStatusColor("ALERTA", "solid");
  if (valor === "REVISAR") return getStatusColor("REVISAR", "solid");
  return getStatusColor("OK", "solid");
};

const porcentajeSeguro = (valor, total) => {
  const base = Number(total || 0);
  if (!base || base <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(valor || 0) / base) * 100)));
};

const periodoSemanaTexto = (inicio, fin) => `${inicio || inicioSemana()} / ${fin || finSemana(inicio)}`;

const estadoFinanciero = (resumen) => {
  const pendiente = Number(resumen?.pagos_pendientes || 0);
  const utilidad = Number(resumen?.utilidad_distribuible || 0);

  if (utilidad < 0) {
    return {
      label: "Atencion financiera",
      detalle: "La utilidad distribuible semanal esta negativa. Revisar gastos y sueldos.",
      className: getStatusColor("ALERTA", "soft"),
    };
  }

  if (pendiente > 0) {
    return {
      label: "Cobranza pendiente",
      detalle: "Hay comprobantes o pagos por revisar antes de considerar caja cerrada.",
      className: getPaymentStatusColor("PENDIENTE", "soft"),
    };
  }

  return {
    label: "Finanzas en orden",
    detalle: "Caja pagada, gastos y fondo reserva sin alertas visibles.",
    className: getStatusColor("OK", "soft"),
  };
};

function FinanzasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabQuery = searchParams.get("tab") || "resumen";
  const ordenIdQuery = searchParams.get("ordenId") || "";
  const vehiculoIdQuery = searchParams.get("vehiculoId") || "";
  const materialIdQuery = searchParams.get("materialId") || "";
  const [tab, setTab] = useState(TABS.some(([key]) => key === tabQuery) ? tabQuery : "resumen");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [comprobantes, setComprobantes] = useState([]);
  const [fondo, setFondo] = useState({ saldo_actual: 0, movimientos: [] });
  const [cierres, setCierres] = useState([]);
  const [previewCierre, setPreviewCierre] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [estadisticas, setEstadisticas] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [resumenLote, setResumenLote] = useState(null);
  const [puedeVerValores, setPuedeVerValores] = useState(false);
  const [puedeCerrarLote, setPuedeCerrarLote] = useState(false);
  const [loteMes, setLoteMes] = useState(loteActual());
  const [ventaMaterial, setVentaMaterial] = useState({});
  const [semanaInicio, setSemanaInicio] = useState(inicioSemana());
  const [semanaFin, setSemanaFin] = useState(finSemana(inicioSemana()));

  const [movimientoForm, setMovimientoForm] = useState({
    tipo: "INGRESO",
    categoria: "SERVICIO",
    monto: "",
    descripcion: "",
    fecha: hoy(),
    metodo_pago: "TRANSFERENCIA",
    proveedor: "",
  });
  const [sueldoForm, setSueldoForm] = useState({
    trabajador_nombre: TRABAJADORES[0],
    semana_inicio: inicioSemana(),
    semana_fin: finSemana(inicioSemana()),
    periodo: periodoSemanaTexto(inicioSemana(), finSemana(inicioSemana())),
    monto: "",
    tipo_pago: "SUELDO",
    estado: "PENDIENTE",
    fecha: hoy(),
    descripcion: "",
  });
  const [fondoForm, setFondoForm] = useState({
    tipo: "APORTE",
    monto: "",
    motivo: "",
    fecha: hoy(),
  });
  const [comprobanteForm, setComprobanteForm] = useState({
    ordenId: ordenIdQuery,
    clienteId: "",
    monto: "",
    fecha_pago: hoy(),
    metodo_pago: "TRANSFERENCIA",
    banco_origen: "",
    folio_referencia: "",
    observacion: "",
    archivo: null,
  });
  const [materialForm, setMaterialForm] = useState({
    ordenId: ordenIdQuery,
    fecha: hoy(),
    marca: "",
    modelo: "",
    motor: "",
    anio: "",
    patente: "",
    tipo_material: "LOZA_DPF",
    kilos: "",
    precio_estimado_kg: "11000",
    observacion: "",
  });

  const ordenSeleccionada = useMemo(
    () => ordenes.find((orden) => String(orden.id) === String(materialForm.ordenId)),
    [ordenes, materialForm.ordenId]
  );

  const registrosVisibles = useMemo(() => {
    if (!vehiculoIdQuery) return registros;
    return registros.filter((item) => String(item.vehiculoId) === String(vehiculoIdQuery));
  }, [registros, vehiculoIdQuery]);

  const cambiarTab = (siguiente) => {
    setTab(siguiente);
    const params = new URLSearchParams(searchParams);
    params.set("tab", siguiente);
    setSearchParams(params);
  };

  const cargarTodo = async () => {
    try {
      setCargando(true);
      setError("");
      const [
        resumenRes,
        movimientosRes,
        comprobantesRes,
        fondoRes,
        cierresRes,
        previewRes,
        materialRes,
        statsRes,
        loteRes,
        ordenesRes,
      ] = await Promise.allSettled([
        api.get("/finanzas/resumen", {
          params: { semana_inicio: semanaInicio, semana_fin: semanaFin },
        }),
        api.get("/finanzas/movimientos", { params: { limit: 200 } }),
        api.get("/finanzas/comprobantes", { params: { limit: 160 } }),
        api.get("/finanzas/fondo-reserva"),
        api.get("/finanzas/cierres-semanales"),
        api.get("/finanzas/cierres-semanales/previsualizar", {
          params: { semana_inicio: semanaInicio, semana_fin: semanaFin },
        }),
        api.get("/finanzas/material-recuperado", {
          params: { limit: 180, vehiculoId: vehiculoIdQuery || undefined },
        }),
        api.get("/finanzas/material-recuperado/estadisticas-modelo"),
        api.get(`/finanzas/material-recuperado/lotes/${loteMes}`),
        api.get("/finanzas/material-recuperado/ordenes"),
      ]);

      if (resumenRes.status === "fulfilled") setResumen(resumenRes.value.data);
      if (movimientosRes.status === "fulfilled") {
        setMovimientos(movimientosRes.value.data?.movimientos || []);
        setPuedeVerValores(Boolean(movimientosRes.value.data?.puedeVerValores));
      }
      if (comprobantesRes.status === "fulfilled") {
        setComprobantes(comprobantesRes.value.data?.comprobantes || []);
      }
      if (fondoRes.status === "fulfilled") setFondo(fondoRes.value.data || {});
      if (cierresRes.status === "fulfilled") setCierres(cierresRes.value.data?.cierres || []);
      if (previewRes.status === "fulfilled") setPreviewCierre(previewRes.value.data);
      if (materialRes.status === "fulfilled") {
        setRegistros(materialRes.value.data?.registros || []);
        setPuedeVerValores(Boolean(materialRes.value.data?.puedeVerValores));
        setPuedeCerrarLote(Boolean(materialRes.value.data?.puedeCerrarLote));
      }
      if (statsRes.status === "fulfilled") {
        setEstadisticas(statsRes.value.data?.estadisticas || []);
      }
      if (loteRes.status === "fulfilled") setResumenLote(loteRes.value.data?.resumen || null);
      if (ordenesRes.status === "fulfilled") setOrdenes(ordenesRes.value.data || []);

      if (
        resumenRes.status === "rejected" &&
        movimientosRes.status === "rejected" &&
        materialRes.status === "rejected"
      ) {
        setError("No se pudo cargar Finanzas. Revisa permisos o conexion.");
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, [semanaInicio, semanaFin, loteMes, vehiculoIdQuery]);

  useEffect(() => {
    setTab(TABS.some(([key]) => key === tabQuery) ? tabQuery : "resumen");
  }, [tabQuery]);

  useEffect(() => {
    if (!ordenIdQuery || !ordenes.length) return;
    const orden = ordenes.find((item) => String(item.id) === String(ordenIdQuery));
    seleccionarOrden(ordenIdQuery);
    setComprobanteForm((actual) => ({
      ...actual,
      ordenId: ordenIdQuery,
      clienteId: orden?.clienteId || actual.clienteId,
    }));
  }, [ordenIdQuery, ordenes.length]);

  useEffect(() => {
    if (!materialIdQuery || !registros.length) return;
    window.setTimeout(() => {
      document.getElementById(`material-${materialIdQuery}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
  }, [materialIdQuery, registros.length]);

  const seleccionarOrden = (ordenId) => {
    const orden = ordenes.find((item) => String(item.id) === String(ordenId));
    setMaterialForm((actual) => ({
      ...actual,
      ordenId,
      marca: orden?.marca || actual.marca,
      modelo: orden?.modelo || actual.modelo,
      anio: orden?.anio || actual.anio,
      patente: orden?.patente || actual.patente,
    }));
    setComprobanteForm((actual) => ({
      ...actual,
      ordenId,
      clienteId: orden?.clienteId || "",
    }));
  };

  const crearMovimiento = async (event, tipoForzado = null) => {
    event.preventDefault();
    try {
      setError("");
      setMensaje("");
      const payload = {
        ...movimientoForm,
        tipo: tipoForzado || movimientoForm.tipo,
      };
      await api.post("/finanzas/movimientos", payload);
      setMensaje("Movimiento financiero registrado.");
      setMovimientoForm((actual) => ({
        ...actual,
        monto: "",
        descripcion: "",
        proveedor: "",
      }));
      await cargarTodo();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo registrar movimiento.");
    }
  };

  const crearSueldo = async (event) => {
    event.preventDefault();
    try {
      setError("");
      setMensaje("");
      const periodoSemana = periodoSemanaTexto(sueldoForm.semana_inicio, sueldoForm.semana_fin);
      await api.post("/finanzas/movimientos", {
        tipo: "EGRESO",
        categoria: "SUELDO",
        monto: sueldoForm.monto,
        descripcion: `${sueldoForm.tipo_pago} semana ${periodoSemana}: ${sueldoForm.descripcion || sueldoForm.trabajador_nombre}`,
        fecha: sueldoForm.fecha,
        metodo_pago: "TRANSFERENCIA",
        trabajador_nombre: sueldoForm.trabajador_nombre,
        periodo: periodoSemana,
        estado: sueldoForm.estado,
      });
      setMensaje("Pago semanal trabajador registrado.");
      setSueldoForm((actual) => ({
        ...actual,
        periodo: periodoSemana,
        monto: "",
        descripcion: "",
      }));
      await cargarTodo();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo registrar sueldo/pago.");
    }
  };

  const crearFondo = async (event) => {
    event.preventDefault();
    try {
      setError("");
      setMensaje("");
      await api.post("/finanzas/fondo-reserva", fondoForm);
      setMensaje("Movimiento de fondo registrado.");
      setFondoForm((actual) => ({ ...actual, monto: "", motivo: "" }));
      await cargarTodo();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo registrar fondo.");
    }
  };

  const crearComprobante = async (event) => {
    event.preventDefault();
    try {
      setError("");
      setMensaje("");
      const fd = new FormData();
      const orden = ordenes.find(
        (item) => String(item.id) === String(comprobanteForm.ordenId)
      );
      const payload = {
        ...comprobanteForm,
        clienteId: comprobanteForm.clienteId || orden?.clienteId || "",
      };
      Object.entries(payload).forEach(([key, value]) => {
        if (key === "archivo") {
          if (value) fd.append("comprobante", value);
        } else if (value !== null && value !== undefined) {
          fd.append(key, value);
        }
      });
      await api.post("/finanzas/comprobantes", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMensaje("Comprobante subido para revision.");
      setComprobanteForm((actual) => ({
        ...actual,
        monto: "",
        banco_origen: "",
        folio_referencia: "",
        observacion: "",
        archivo: null,
      }));
      await cargarTodo();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo subir comprobante.");
    }
  };

  const validarComprobante = async (id, accion) => {
    try {
      setError("");
      setMensaje("");
      await api.patch(`/finanzas/comprobantes/${id}/${accion}`);
      setMensaje(accion === "validar" ? "Comprobante validado." : "Comprobante rechazado.");
      await cargarTodo();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo cambiar comprobante.");
    }
  };

  const descargarComprobante = async (item) => {
    try {
      setError("");
      setMensaje("");
      await descargarArchivoAutenticado(
        `/finanzas/comprobantes/${item.id}/descargar`,
        item.archivo_comprobante_nombre || `comprobante-${item.id}.pdf`
      );
    } catch (err) {
      setError(
        err.mensajeDescarga ||
          err.response?.data?.error ||
          "No se pudo descargar comprobante."
      );
    }
  };

  const registrarMaterial = async (event) => {
    event.preventDefault();
    try {
      setError("");
      setMensaje("");
      await api.post("/finanzas/material-recuperado", materialForm);
      setMensaje("Material recuperado registrado.");
      setMaterialForm((actual) => ({ ...actual, kilos: "", observacion: "" }));
      await cargarTodo();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo registrar material.");
    }
  };

  const venderMaterial = async (registro) => {
    const venta = ventaMaterial[registro.id] || {};
    try {
      setError("");
      setMensaje("");
      await api.patch(`/finanzas/material-recuperado/${registro.id}/vender`, venta);
      setMensaje("Material marcado como vendido.");
      setVentaMaterial((actual) => ({ ...actual, [registro.id]: {} }));
      await cargarTodo();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo marcar material vendido.");
    }
  };

  const registrarIngresoMaterial = async (registro) => {
    try {
      setError("");
      setMensaje("");
      await api.post(`/finanzas/material-recuperado/${registro.id}/registrar-ingreso`, {
        monto: registro.valor_real || registro.valor_estimado,
        metodo_pago: "TRANSFERENCIA",
      });
      setMensaje("Ingreso por venta de material registrado.");
      await cargarTodo();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo registrar ingreso material.");
    }
  };

  const cerrarLote = async () => {
    if (!window.confirm(`Cerrar lote mensual ${loteMes}?`)) return;
    try {
      setError("");
      setMensaje("");
      await api.patch(`/finanzas/material-recuperado/lotes/${loteMes}/cerrar`, {
        observacion: "Cierre desde Finanzas",
      });
      setMensaje("Lote mensual cerrado.");
      await cargarTodo();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo cerrar lote.");
    }
  };

  const guardarCierre = async (estado) => {
    try {
      setError("");
      setMensaje("");
      if (estado === "CERRADO" && Number(previewCierre?.utilidad_distribuible || 0) < 0) {
        const ok = window.confirm("La utilidad distribuible es negativa. Confirmas cerrar de todos modos?");
        if (!ok) return;
      }
      await api.post("/finanzas/cierres-semanales", {
        semana_inicio: semanaInicio,
        semana_fin: semanaFin,
        estado,
        participantes: previewCierre?.participantes || PARTICIPANTES_CIERRE,
      });
      setMensaje(estado === "CERRADO" ? "Cierre semanal cerrado." : "Borrador guardado.");
      await cargarTodo();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar cierre.");
    }
  };

  const semaforo = estadoFinanciero(resumen);
  const totalSemana = Number(resumen?.ingresos_total || 0) + Number(resumen?.egresos_total || 0) + Number(resumen?.sueldos_total || 0);
  const totalCaja = Number(resumen?.ingresos_total || 0) + Number(resumen?.pagos_pendientes || 0);
  const materialMes = resumen?.material_mes || {};

  return (
    <div className="space-y-6">
      <div className="bg-black p-6 text-white border-b-8 border-blue-600">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
          Finanzas y Control Operativo V1
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase">Finanzas GMTCH</h1>
        <p className="mt-2 max-w-4xl text-xs font-bold uppercase text-slate-300">
          Control interno de comprobantes, ingresos, gastos, sueldos, fondo de reserva, cierre semanal y material recuperado.
        </p>
      </div>

      {error && <Alert tipo="error">{error}</Alert>}
      {mensaje && <Alert tipo="ok">{mensaje}</Alert>}

      <nav className="flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => cambiarTab(key)}
            className={`border-2 border-black px-3 py-2 text-[10px] font-black uppercase ${
              tab === key ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "resumen" && (
        <section className="space-y-5">
          <section className={`border-4 p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${semaforo.className}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-70">
                  Semaforo financiero
                </p>
                <h2 className="mt-2 text-3xl font-black uppercase">{semaforo.label}</h2>
                <p className="mt-2 max-w-3xl text-xs font-bold uppercase leading-relaxed">
                  {semaforo.detalle}
                </p>
              </div>
              <div className="border-2 border-current bg-white/60 px-4 py-3 text-xs font-black uppercase">
                Semana {formatearFecha(semanaInicio)} - {formatearFecha(semanaFin)}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
            <ExecutiveMetric label="Dinero recibido semana" value={formatearMonto(resumen?.ingresos_total)} help="Pagado: dinero realmente recibido." tone="black" />
            <ExecutiveMetric label="Pendiente de pago" value={resumen?.pagos_pendientes ?? 0} help="Pendiente: trabajos con monto registrado, pero sin pago confirmado." tone="yellow" />
            <ExecutiveMetric label="Gastos semana" value={formatearMonto(resumen?.egresos_total)} help="Salidas operativas registradas en la semana." tone="slate" />
            <ExecutiveMetric label="Sueldos semana" value={formatearMonto(resumen?.sueldos_total)} help="Pagos internos controlados semanalmente." tone="blue" />
            <ExecutiveMetric label="Fondo reserva" value={formatearMonto(resumen?.fondo_reserva_saldo)} help="Fondo reserva: dinero separado antes de repartir utilidad." tone="emerald" />
            <ExecutiveMetric label="Utilidad estimada" value={formatearMonto(resumen?.utilidad_distribuible)} help="Estimacion operativa, no contabilidad formal." tone="emerald" />
            <ExecutiveMetric label="Reparto estimado en 3" value={formatearMonto(resumen?.reparto_estimado_3)} help="Base sugerida para cierre semanal." tone="blue" />
            <ExecutiveMetric label="Material recuperado mes" value={formatearKg(materialMes?.kg_reales)} help="Control administrativo de kg acumulados por lote." tone="slate" />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
            <MicroChart title="Ingresos vs gastos" items={[
              ["Ingresos", resumen?.ingresos_total || 0, "bg-emerald-500"],
              ["Gastos", resumen?.egresos_total || 0, "bg-red-500"],
              ["Sueldos", resumen?.sueldos_total || 0, "bg-blue-500"],
            ]} total={totalSemana} format={formatearMonto} />
            <MicroChart title="Pagado vs pendiente" items={[
              ["Pagado", resumen?.ingresos_total || 0, "bg-emerald-500"],
              ["Pendiente", resumen?.pagos_pendientes || 0, "bg-yellow-500"],
            ]} total={totalCaja} />
            <MicroChart title="Fondo reserva" items={[
              ["Reserva", resumen?.fondo_reserva_saldo || 0, "bg-blue-600"],
              ["Aporte sugerido", resumen?.aporte_fondo_reserva || 0, "bg-sky-300"],
            ]} total={Number(resumen?.fondo_reserva_saldo || 0) + Number(resumen?.aporte_fondo_reserva || 0)} format={formatearMonto} />
            <MicroChart title="Material mes" items={[
              ["Kg real", materialMes?.kg_reales || 0, "bg-slate-800"],
              ["Kg esperado", materialMes?.kg_esperados || 0, "bg-blue-500"],
            ]} total={Number(materialMes?.kg_reales || 0) + Number(materialMes?.kg_esperados || 0)} format={formatearKg} />
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <QuickFinanceButton label="Crear ingreso" onClick={() => cambiarTab("ingresos")} />
            <QuickFinanceButton label="Registrar gasto" onClick={() => cambiarTab("gastos")} />
            <QuickFinanceButton label="Registrar sueldo semanal" onClick={() => cambiarTab("sueldos")} />
            <QuickFinanceButton label="Material recuperado" onClick={() => cambiarTab("material")} />
            <QuickFinanceButton label="Subir comprobante" onClick={() => cambiarTab("comprobantes")} />
          </section>

          <div className="border-2 border-yellow-500 bg-yellow-50 p-3 text-[11px] font-black uppercase text-yellow-900">
            Datos actuales pueden incluir pruebas hasta ejecutar reset operativo.
          </div>

          <Panel title="Rango semanal">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input label="Semana inicio" type="date" value={semanaInicio} onChange={(v) => {
                setSemanaInicio(v);
                setSemanaFin(finSemana(v));
              }} />
              <Input label="Semana fin" type="date" value={semanaFin} onChange={setSemanaFin} />
              <button type="button" onClick={cargarTodo} className="self-end bg-black px-4 py-3 text-xs font-black uppercase text-white">
                Actualizar resumen
              </button>
            </div>
          </Panel>
        </section>
      )}

      {tab === "ingresos" && (
        <MovimientoTab
          titulo="Registrar ingreso"
          tipo="INGRESO"
          form={movimientoForm}
          setForm={setMovimientoForm}
          onSubmit={crearMovimiento}
          movimientos={movimientos.filter((m) => m.tipo === "INGRESO")}
        />
      )}

      {tab === "gastos" && (
        <MovimientoTab
          titulo="Registrar gasto"
          tipo="EGRESO"
          form={movimientoForm}
          setForm={setMovimientoForm}
          onSubmit={crearMovimiento}
          movimientos={movimientos.filter((m) => m.tipo === "EGRESO" && m.categoria !== "SUELDO")}
        />
      )}

      {tab === "sueldos" && (
        <Panel title="Sueldos / pagos trabajadores">
          <p className="mb-4 border-2 border-yellow-500 bg-yellow-50 p-3 text-xs font-black uppercase text-yellow-900">
            Los pagos internos se controlan semanalmente. Validar formalizacion con contador si corresponde.
          </p>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Metric label="Semana seleccionada" value={`${formatearFecha(semanaInicio)} - ${formatearFecha(semanaFin)}`} />
            <Metric label="Sueldos semana" value={formatearMonto(resumen?.sueldos_total)} />
            <Metric label="Pagos registrados" value={movimientos.filter((m) => m.categoria === "SUELDO").length} />
          </div>
          <details className="mb-4 border-2 border-black bg-slate-50 p-3">
            <summary className="cursor-pointer text-xs font-black uppercase">
              Registrar sueldo semanal
            </summary>
            <form onSubmit={crearSueldo} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Select label="Trabajador" value={sueldoForm.trabajador_nombre} onChange={(v) => setSueldoForm((a) => ({ ...a, trabajador_nombre: v }))} options={TRABAJADORES.map((v) => [v, v])} />
              <Select label="Tipo" value={sueldoForm.tipo_pago} onChange={(v) => setSueldoForm((a) => ({ ...a, tipo_pago: v }))} options={["SUELDO", "ADELANTO", "BONO", "COMISION", "OTRO"].map((v) => [v, v])} />
              <Select label="Estado" value={sueldoForm.estado} onChange={(v) => setSueldoForm((a) => ({ ...a, estado: v }))} options={["PENDIENTE", "PAGADO"].map((v) => [v, v])} />
              <Input label="Semana inicio" type="date" value={sueldoForm.semana_inicio} onChange={(v) => setSueldoForm((a) => ({ ...a, semana_inicio: v, semana_fin: finSemana(v), periodo: periodoSemanaTexto(v, finSemana(v)) }))} />
              <Input label="Semana fin" type="date" value={sueldoForm.semana_fin} onChange={(v) => setSueldoForm((a) => ({ ...a, semana_fin: v, periodo: periodoSemanaTexto(a.semana_inicio, v) }))} />
              <Input label="Fecha pago/control" type="date" value={sueldoForm.fecha} onChange={(v) => setSueldoForm((a) => ({ ...a, fecha: v }))} />
              <Input label="Monto" type="number" value={sueldoForm.monto} onChange={(v) => setSueldoForm((a) => ({ ...a, monto: v }))} />
              <Input label="Observacion" value={sueldoForm.descripcion} onChange={(v) => setSueldoForm((a) => ({ ...a, descripcion: v }))} className="md:col-span-2" />
              <div className="border-2 border-blue-600 bg-blue-50 p-3 text-[10px] font-black uppercase text-blue-900">
                Periodo guardado: {periodoSemanaTexto(sueldoForm.semana_inicio, sueldoForm.semana_fin)}
              </div>
              <button className="self-end bg-black px-4 py-3 text-xs font-black uppercase text-white" type="submit">Registrar pago semanal</button>
            </form>
          </details>
          <ListaMovimientos movimientos={movimientos.filter((m) => m.categoria === "SUELDO")} />
        </Panel>
      )}

      {tab === "fondo" && (
        <Panel title="Fondo de reserva">
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Metric label="Saldo actual" value={formatearMonto(fondo?.saldo_actual)} />
            <Metric label="Porcentaje sugerido" value={`${fondo?.porcentaje_sugerido ?? 15}%`} />
            <Metric label="Movimientos" value={fondo?.movimientos?.length || 0} />
          </div>
          <details className="border-2 border-black bg-slate-50 p-3">
            <summary className="cursor-pointer text-xs font-black uppercase">
              Crear movimiento fondo
            </summary>
            <form onSubmit={crearFondo} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <Select label="Tipo" value={fondoForm.tipo} onChange={(v) => setFondoForm((a) => ({ ...a, tipo: v }))} options={["APORTE", "RETIRO", "AJUSTE"].map((v) => [v, v])} />
              <Input label="Fecha" type="date" value={fondoForm.fecha} onChange={(v) => setFondoForm((a) => ({ ...a, fecha: v }))} />
              <Input label="Monto" type="number" value={fondoForm.monto} onChange={(v) => setFondoForm((a) => ({ ...a, monto: v }))} />
              <Input label="Motivo" value={fondoForm.motivo} onChange={(v) => setFondoForm((a) => ({ ...a, motivo: v }))} />
              <button className="bg-black px-4 py-3 text-xs font-black uppercase text-white md:col-span-4" type="submit">Registrar fondo</button>
            </form>
          </details>
          <div className="mt-4 space-y-2">
            {(fondo?.movimientos || []).map((item) => (
              <MiniRow key={item.id} title={`${item.tipo} ${formatearMonto(item.monto)}`} detail={`${formatearFecha(item.fecha)} - ${item.motivo || "Sin motivo"}`} />
            ))}
          </div>
        </Panel>
      )}

      {tab === "cierre" && (
        <Panel title="Cierre semanal / reparto utilidad en 3">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input label="Semana inicio" type="date" value={semanaInicio} onChange={(v) => {
              setSemanaInicio(v);
              setSemanaFin(finSemana(v));
            }} />
            <Input label="Semana fin" type="date" value={semanaFin} onChange={setSemanaFin} />
            <button type="button" onClick={cargarTodo} className="self-end border-2 border-black px-4 py-3 text-xs font-black uppercase">Recalcular</button>
            <button type="button" onClick={() => guardarCierre("BORRADOR")} className="self-end border-2 border-black px-4 py-3 text-xs font-black uppercase">Guardar borrador</button>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <Metric label="Ingresos" value={formatearMonto(previewCierre?.ingresos_total)} />
            <Metric label="Egresos" value={formatearMonto(previewCierre?.egresos_total)} />
            <Metric label="Sueldos" value={formatearMonto(previewCierre?.sueldos_total)} />
            <Metric label="Aporte reserva" value={formatearMonto(previewCierre?.aporte_fondo_reserva)} />
            <Metric label="Distribuible" value={formatearMonto(previewCierre?.utilidad_distribuible)} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {(previewCierre?.participantes || PARTICIPANTES_CIERRE.map((n) => ({ nombre: n, monto: 0 }))).map((p) => (
              <MiniRow key={p.nombre} title={p.nombre} detail={formatearMonto(p.monto)} />
            ))}
          </div>
          <button type="button" onClick={() => guardarCierre("CERRADO")} className="mt-4 bg-blue-700 px-4 py-3 text-xs font-black uppercase text-white">
            Cerrar semana
          </button>
          <ListaCierres cierres={cierres} />
        </Panel>
      )}

      {tab === "material" && (
        <MaterialTab
          ordenes={ordenes}
          ordenSeleccionada={ordenSeleccionada}
          form={materialForm}
          setForm={setMaterialForm}
          seleccionarOrden={seleccionarOrden}
          onSubmit={registrarMaterial}
          puedeVerValores={puedeVerValores}
          puedeCerrarLote={puedeCerrarLote}
          registros={registrosVisibles}
          estadisticas={estadisticas}
          resumenLote={resumenLote}
          loteMes={loteMes}
          setLoteMes={setLoteMes}
          materialIdQuery={materialIdQuery}
          ventaMaterial={ventaMaterial}
          setVentaMaterial={setVentaMaterial}
          venderMaterial={venderMaterial}
          registrarIngresoMaterial={registrarIngresoMaterial}
          cerrarLote={cerrarLote}
        />
      )}

      {tab === "comprobantes" && (
        <ComprobantesTab
          form={comprobanteForm}
          setForm={setComprobanteForm}
          ordenes={ordenes}
          comprobantes={comprobantes}
          onSubmit={crearComprobante}
          validarComprobante={validarComprobante}
          descargarComprobante={descargarComprobante}
          puedeVerValores={puedeVerValores}
        />
      )}

      {cargando && (
        <p className="text-xs font-black uppercase text-gray-500">Cargando finanzas...</p>
      )}
    </div>
  );
}

const Alert = ({ tipo, children }) => (
  <div className={`border-4 p-4 text-sm font-black uppercase ${
    tipo === "error"
      ? "border-red-600 bg-red-50 text-red-800"
      : "border-green-600 bg-green-50 text-green-800"
  }`}>
    {children}
  </div>
);

const Panel = ({ title, children }) => (
  <section className="border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
    <h2 className="mb-4 text-lg font-black uppercase">{title}</h2>
    {children}
  </section>
);

const Metric = ({ label, value }) => (
  <div className="border-4 border-black bg-white p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
    <p className="text-[10px] font-black uppercase text-gray-500">{label}</p>
    <p className="mt-2 text-xl font-black uppercase">{value}</p>
  </div>
);

const ExecutiveMetric = ({ label, value, help, tone = "slate" }) => {
  const tones = {
    black: "border-black bg-black text-white",
    yellow: "border-yellow-500 bg-yellow-50 text-yellow-900",
    slate: "border-slate-700 bg-slate-50 text-slate-950",
    blue: "border-blue-600 bg-blue-50 text-blue-950",
    emerald: "border-emerald-600 bg-emerald-50 text-emerald-950",
  };

  return (
    <div className={`border-4 p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] ${tones[tone] || tones.slate}`}>
      <p className="text-[10px] font-black uppercase opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-black uppercase">{value}</p>
      <p className="mt-2 text-[10px] font-bold uppercase leading-relaxed opacity-75">
        {help}
      </p>
    </div>
  );
};

const MicroChart = ({ title, items, total, format = (v) => Number(v || 0).toLocaleString("es-CL") }) => (
  <div className="border-4 border-black bg-white p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
    <p className="text-[10px] font-black uppercase text-gray-500">{title}</p>
    <div className="mt-3 space-y-3">
      {items.map(([label, value, color]) => (
        <div key={label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-[10px] font-black uppercase text-gray-500">
            <span>{label}</span>
            <span>{format(value)}</span>
          </div>
          <div className="h-3 overflow-hidden border-2 border-black bg-slate-100">
            <div
              className={`h-full ${color}`}
              style={{ width: `${porcentajeSeguro(value, total)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const QuickFinanceButton = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="border-2 border-black bg-slate-950 px-4 py-3 text-xs font-black uppercase text-white transition hover:bg-blue-700"
  >
    {label}
  </button>
);

const Input = ({ label, value, onChange, type = "text", className = "" }) => (
  <label className={`text-[10px] font-black uppercase text-gray-500 ${className}`}>
    {label}
    <input className={inputClass} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
  </label>
);

const Select = ({ label, value, onChange, options, className = "" }) => (
  <label className={`text-[10px] font-black uppercase text-gray-500 ${className}`}>
    {label}
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  </label>
);

const MiniRow = ({ title, detail }) => (
  <div className="border-2 border-black bg-slate-50 p-3">
    <p className="text-xs font-black uppercase">{title}</p>
    <p className="mt-1 text-[10px] font-bold uppercase text-gray-500">{detail}</p>
  </div>
);

const EmptyDetail = () => (
  <div className="border-2 border-dashed border-gray-400 bg-gray-50 p-6 text-center text-xs font-black uppercase text-gray-500">
    Selecciona un registro para ver el detalle.
  </div>
);

const MovimientoTab = ({ titulo, tipo, form, setForm, onSubmit, movimientos }) => {
  const [seleccionId, setSeleccionId] = useState("");
  const seleccionado =
    movimientos.find((item) => String(item.id) === String(seleccionId)) || null;
  const categorias =
    tipo === "EGRESO"
      ? ["GASTO_OPERATIVO", "COMPRA", "HERRAMIENTA", "ARRIENDO", "TRANSPORTE", "MARKETING", "IMPUESTO_PROVISION", "OTRO"]
      : ["SERVICIO", "FILE_SERVICE", "VENTA_MATERIAL", "OTRO"];
  const total = movimientos.reduce((acc, item) => acc + Number(item.monto || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric label="Registros" value={movimientos.length} />
        <Metric label="Total visible" value={formatearMonto(total)} />
        <Metric label="Ultimo registro" value={movimientos[0] ? formatearFecha(movimientos[0].fecha) : "Sin registros"} />
      </div>

      <details className="border-4 border-black bg-white p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <summary className="cursor-pointer text-xs font-black uppercase">
          Crear nuevo
        </summary>
        <form onSubmit={(e) => onSubmit(e, tipo)} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Select label="Categoria" value={form.categoria} onChange={(v) => setForm((a) => ({ ...a, tipo, categoria: v }))} options={categorias.map((v) => [v, v])} />
          <Input label="Monto" type="number" value={form.monto} onChange={(v) => setForm((a) => ({ ...a, tipo, monto: v }))} />
          <Input label="Fecha" type="date" value={form.fecha} onChange={(v) => setForm((a) => ({ ...a, tipo, fecha: v }))} />
          <Select label="Metodo" value={form.metodo_pago} onChange={(v) => setForm((a) => ({ ...a, tipo, metodo_pago: v }))} options={["TRANSFERENCIA", "EFECTIVO", "TARJETA", "OTRO"].map((v) => [v, v])} />
          {tipo === "EGRESO" && (
            <Input label="Proveedor opcional" value={form.proveedor} onChange={(v) => setForm((a) => ({ ...a, tipo, proveedor: v }))} />
          )}
          <Input label="Descripcion" value={form.descripcion} onChange={(v) => setForm((a) => ({ ...a, tipo, descripcion: v }))} className={tipo === "EGRESO" ? "md:col-span-2" : "md:col-span-3"} />
          <button className="self-end bg-black px-4 py-3 text-xs font-black uppercase text-white" type="submit">
            Registrar
          </button>
        </form>
      </details>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Lista compacta">
          <div className="space-y-2">
            {movimientos.slice(0, 50).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSeleccionId(String(m.id))}
                className={`w-full border-2 p-3 text-left ${String(m.id) === String(seleccionId) ? "border-blue-700 bg-blue-50" : "border-black bg-slate-50"}`}
              >
                <p className="text-xs font-black uppercase">
                  #{m.id} / {m.categoria} / {formatearMonto(m.monto)}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase text-gray-500">
                  {formatearFecha(m.fecha)} - {m.trabajador_nombre || m.proveedor || m.descripcion || "Sin detalle"}
                </p>
              </button>
            ))}
            {!movimientos.length && (
              <MiniRow
                title="Sin movimientos registrados después del reset."
                detail="Registra movimientos reales cuando comience la operación."
              />
            )}
          </div>
        </Panel>

        <Panel title="Detalle">
          {seleccionado ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <MiniRow title="Tipo / categoria" detail={`${seleccionado.tipo} / ${seleccionado.categoria}`} />
              <MiniRow title="Monto" detail={formatearMonto(seleccionado.monto)} />
              <MiniRow title="Fecha" detail={formatearFecha(seleccionado.fecha)} />
              <MiniRow title="Metodo" detail={seleccionado.metodo_pago || "No registrado"} />
              <MiniRow title="Proveedor / trabajador" detail={seleccionado.proveedor || seleccionado.trabajador_nombre || "No registrado"} />
              <MiniRow title="Creado por" detail={seleccionado.creado_por || "No registrado"} />
              <MiniRow title="Descripcion" detail={seleccionado.descripcion || "No registrado"} />
            </div>
          ) : (
            <EmptyDetail />
          )}
        </Panel>
      </section>
    </div>
  );
};

const ListaMovimientos = ({ movimientos }) => (
  <div className="mt-5 space-y-2">
    {movimientos.slice(0, 30).map((m) => (
      <MiniRow
        key={m.id}
        title={`${m.tipo} / ${m.categoria} / ${formatearMonto(m.monto)}`}
        detail={`${m.periodo ? `Semana ${m.periodo} - ` : ""}${formatearFecha(m.fecha)} - ${m.trabajador_nombre || m.proveedor || m.descripcion || "Sin detalle"} - ${m.estado || "REGISTRADO"}`}
      />
    ))}
    {!movimientos.length && (
      <div className="border-2 border-black bg-gray-50 p-4 text-xs font-black uppercase text-gray-500">
        Sin movimientos registrados después del reset.
      </div>
    )}
  </div>
);

const ListaCierres = ({ cierres }) => (
  <div className="mt-5 space-y-2">
    {cierres.slice(0, 10).map((cierre) => (
      <MiniRow
        key={cierre.id}
        title={`Semana ${formatearFecha(cierre.semana_inicio)} - ${formatearFecha(cierre.semana_fin)} / ${cierre.estado}`}
        detail={`Distribuible ${formatearMonto(cierre.utilidad_distribuible)} / Reserva ${formatearMonto(cierre.aporte_fondo_reserva)}`}
      />
    ))}
  </div>
);

const MaterialTab = ({
  ordenes,
  ordenSeleccionada,
  form,
  setForm,
  seleccionarOrden,
  onSubmit,
  puedeVerValores,
  puedeCerrarLote,
  registros,
  estadisticas,
  resumenLote,
  loteMes,
  setLoteMes,
  materialIdQuery,
  ventaMaterial,
  setVentaMaterial,
  venderMaterial,
  registrarIngresoMaterial,
  cerrarLote,
}) => {
  const [seleccionId, setSeleccionId] = useState(materialIdQuery || "");
  const seleccionado =
    registros.find((registro) => String(registro.id) === String(seleccionId)) || null;
  const venta = seleccionado ? ventaMaterial[seleccionado.id] || {} : {};
  const fueraRango = registros.filter((registro) =>
    ["ALERTA", "REVISAR"].includes(String(registro.alerta_rango || "").toUpperCase())
  );

  useEffect(() => {
    if (materialIdQuery) setSeleccionId(materialIdQuery);
  }, [materialIdQuery]);

  return (
    <div className="space-y-5">
      <section className="border-4 border-black bg-slate-950 p-5 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-300">
              Lote mensual {loteMes}
            </p>
            <h2 className="mt-2 text-3xl font-black uppercase">
              Material recuperado
            </h2>
            <p className="mt-2 max-w-3xl text-xs font-bold uppercase text-slate-300">
              Control administrativo de kg acumulados por lote, estadisticas por modelo y alertas de diferencia.
            </p>
          </div>
          <div className={`border-2 px-4 py-3 text-xs font-black uppercase ${alertaClase(resumenLote?.alerta_rango || "OK")}`}>
            Alerta lote: {resumenLote?.alerta_rango || "OK"}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ExecutiveMetric label="Kg acumulados" value={formatearKg(resumenLote?.kg_reales)} help="Total administrativo del lote actual." tone="black" />
          <ExecutiveMetric label="Kg esperados" value={formatearKg(resumenLote?.kg_esperados)} help="Referencia historica por modelo." tone="blue" />
          <ExecutiveMetric label="Diferencia kg" value={formatearKg(resumenLote?.diferencia_kg)} help={`Diferencia ${resumenLote?.diferencia_porcentaje ?? 0}% vs esperado.`} tone={Math.abs(Number(resumenLote?.diferencia_porcentaje || 0)) > 20 ? "yellow" : "emerald"} />
          <ExecutiveMetric label="Valor vendido" value={puedeVerValores ? formatearMonto(resumenLote?.valor_real_vendido) : "Oculto"} help="Visible solo para OWNER/ADMIN." tone="slate" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <QuickFinanceButton label="Registrar material" onClick={() => document.getElementById("form-material-recuperado")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
        <QuickFinanceButton label="Marcar vendido" onClick={() => seleccionado && document.getElementById("detalle-material-seleccionado")?.scrollIntoView({ behavior: "smooth", block: "center" })} />
        <QuickFinanceButton label="Registrar ingreso por venta" onClick={() => seleccionado && registrarIngresoMaterial(seleccionado)} />
        <QuickFinanceButton label="Ver estadisticas por modelo" onClick={() => document.getElementById("ranking-material-modelo")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
      </section>

      <details id="form-material-recuperado" className="border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <summary className="cursor-pointer text-xs font-black uppercase">
          Registrar material / cierre mensual
        </summary>
        <section className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Registrar material recuperado">
            <p className="mb-3 text-xs font-bold uppercase text-gray-500">
              Registro administrativo. No contiene instrucciones tecnicas de intervencion.
            </p>
            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-[10px] font-black uppercase text-gray-500 md:col-span-2">
                Orden asociada
                <select className={inputClass} value={form.ordenId} onChange={(e) => seleccionarOrden(e.target.value)}>
                  <option value="">Sin orden asociada</option>
                  {ordenes.map((orden) => (
                    <option key={orden.id} value={orden.id}>
                      Orden #{orden.id} - {orden.patente || "S/P"} - {orden.marca} {orden.modelo}
                    </option>
                  ))}
                </select>
              </label>
              {ordenSeleccionada && (
                <div className="border-2 border-blue-600 bg-blue-50 p-3 text-[10px] font-bold uppercase text-blue-900 md:col-span-2">
                  Cliente: {ordenSeleccionada.cliente_nombre || "No registrado"} / Estado: {ordenSeleccionada.estado || "Pendiente"}
                </div>
              )}
              <Input label="Fecha" type="date" value={form.fecha} onChange={(v) => setForm((a) => ({ ...a, fecha: v }))} />
              <Input label="Lote automatico" value={loteDesdeFecha(form.fecha)} onChange={() => {}} />
              <Input label="Marca" value={form.marca} onChange={(v) => setForm((a) => ({ ...a, marca: v }))} />
              <Input label="Modelo" value={form.modelo} onChange={(v) => setForm((a) => ({ ...a, modelo: v }))} />
              <Input label="Motor opcional" value={form.motor} onChange={(v) => setForm((a) => ({ ...a, motor: v }))} />
              <Input label="Ano" value={form.anio} onChange={(v) => setForm((a) => ({ ...a, anio: v }))} />
              <Input label="Patente" value={form.patente} onChange={(v) => setForm((a) => ({ ...a, patente: v }))} />
              <Select label="Tipo material" value={form.tipo_material} onChange={(v) => setForm((a) => ({ ...a, tipo_material: v }))} options={[["LOZA_DPF", "LOZA_DPF"], ["OTRO", "OTRO"]]} />
              <Input label="Kilos" type="number" value={form.kilos} onChange={(v) => setForm((a) => ({ ...a, kilos: v }))} />
              {puedeVerValores && (
                <Input label="Precio estimado kg" type="number" value={form.precio_estimado_kg} onChange={(v) => setForm((a) => ({ ...a, precio_estimado_kg: v }))} />
              )}
              <Input label="Observacion" value={form.observacion} onChange={(v) => setForm((a) => ({ ...a, observacion: v }))} className="md:col-span-2" />
              <button className="bg-black px-4 py-3 text-xs font-black uppercase text-white md:col-span-2" type="submit">Registrar material</button>
            </form>
          </Panel>

          <Panel title="Cierre mensual material">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="Lote" type="month" value={loteMes} onChange={setLoteMes} />
              <Metric label="Estado lote" value={resumenLote?.estado_lote || "ABIERTO"} />
              <Metric label="Kg esperados" value={formatearKg(resumenLote?.kg_esperados)} />
              <Metric label="Kg reales" value={formatearKg(resumenLote?.kg_reales)} />
            </div>
            {puedeCerrarLote && (
              <button type="button" onClick={cerrarLote} className="mt-4 bg-blue-700 px-4 py-3 text-xs font-black uppercase text-white">
                Cerrar lote mensual
              </button>
            )}
          </Panel>
        </section>
      </details>

      {fueraRango.length > 0 && (
        <section className="border-4 border-yellow-500 bg-yellow-50 p-4">
          <h3 className="text-sm font-black uppercase text-yellow-900">
            Registros fuera de rango
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {fueraRango.slice(0, 6).map((registro) => (
              <button
                key={registro.id}
                type="button"
                onClick={() => setSeleccionId(String(registro.id))}
                className="border-2 border-yellow-700 bg-white p-3 text-left text-xs font-black uppercase text-yellow-900"
              >
                #{registro.id} {registro.marca} {registro.modelo} / {formatearKg(registro.kilos)} / {registro.diferencia_porcentaje ?? 0}%
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Lista compacta de registros">
          <div className="space-y-2">
            {registros.map((registro) => (
              <button
                key={registro.id}
                id={`material-${registro.id}`}
                type="button"
                onClick={() => setSeleccionId(String(registro.id))}
                className={`w-full border-2 p-3 text-left ${String(registro.id) === String(seleccionId) ? "border-blue-700 bg-blue-50" : "border-black bg-slate-50"}`}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase">
                      Material #{registro.id} / {registro.marca} {registro.modelo}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-gray-500">
                      {registro.patente || "Sin patente"} / {formatearFecha(registro.fecha)} / {registro.estado}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`border-2 px-2 py-1 text-[10px] font-black uppercase ${alertaClase(registro.alerta_rango)}`}>{registro.alerta_rango || "OK"}</span>
                    <span className="border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase">{formatearKg(registro.kilos)}</span>
                  </div>
                </div>
              </button>
            ))}
            {!registros.length && <MiniRow title="Sin registros" detail="Aun no hay material recuperado." />}
          </div>
        </Panel>

        <Panel title="Detalle seleccionado">
          <div id="detalle-material-seleccionado">
            {seleccionado ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <MiniRow title="Modelo" detail={`${seleccionado.marca} ${seleccionado.modelo} ${seleccionado.anio || ""}`} />
                  <MiniRow title="Patente / fecha" detail={`${seleccionado.patente || "Sin patente"} / ${formatearFecha(seleccionado.fecha)}`} />
                  <MiniRow title="Kg reales" detail={formatearKg(seleccionado.kilos)} />
                  <MiniRow title="Promedio historico" detail={seleccionado.promedio_historico_kg ? formatearKg(seleccionado.promedio_historico_kg) : "Sin historico"} />
                  <MiniRow title="Diferencia" detail={`${formatearKg(seleccionado.diferencia_kg)} / ${seleccionado.diferencia_porcentaje ?? 0}%`} />
                  <MiniRow title="Confianza" detail={seleccionado.confianza_estadistica || "BAJA"} />
                  <MiniRow title="Estado" detail={`${seleccionado.estado} / ${seleccionado.lote_estado}`} />
                  <MiniRow title="Observacion" detail={seleccionado.observacion || "No registrado"} />
                  {puedeVerValores && (
                    <>
                      <MiniRow title="Valor estimado" detail={formatearMonto(seleccionado.valor_estimado)} />
                      <MiniRow title="Valor real" detail={formatearMonto(seleccionado.valor_real)} />
                    </>
                  )}
                </div>
                {seleccionado.ordenId && (
                  <Link to={`/ordenes?ordenId=${seleccionado.ordenId}`} className="inline-block border-2 border-blue-700 px-3 py-2 text-xs font-black uppercase text-blue-700">
                    Ver orden #{seleccionado.ordenId}
                  </Link>
                )}
                {puedeCerrarLote && seleccionado.estado !== "VENDIDO" && (
                  <div className="grid grid-cols-1 gap-2 border-t-2 border-black pt-3 md:grid-cols-[1fr_1fr_auto]">
                    <input className={inputClass} placeholder="Comprador" value={venta.comprador || ""} onChange={(e) => setVentaMaterial((a) => ({ ...a, [seleccionado.id]: { ...venta, comprador: e.target.value } }))} />
                    <input className={inputClass} type="number" placeholder="Precio real kg" value={venta.precio_real_kg || ""} onChange={(e) => setVentaMaterial((a) => ({ ...a, [seleccionado.id]: { ...venta, precio_real_kg: e.target.value } }))} />
                    <button type="button" onClick={() => venderMaterial(seleccionado)} className="bg-black px-4 py-2 text-xs font-black uppercase text-white">Marcar vendido</button>
                  </div>
                )}
                {puedeCerrarLote && seleccionado.estado === "VENDIDO" && (
                  <button type="button" onClick={() => registrarIngresoMaterial(seleccionado)} className="border-2 border-blue-700 px-3 py-2 text-[10px] font-black uppercase text-blue-700">
                    Registrar ingreso por venta de material
                  </button>
                )}
              </div>
            ) : (
              <EmptyDetail />
            )}
          </div>
        </Panel>
      </section>

      <Panel title="Ranking por modelo">
        <div id="ranking-material-modelo" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {estadisticas.slice(0, 12).map((item) => (
            <div key={item.clave} className="border-2 border-black bg-slate-50 p-3">
              <p className="text-xs font-black uppercase">{item.marca} {item.modelo}</p>
              <p className="mt-1 text-[10px] font-bold uppercase text-gray-500">
                Promedio {formatearKg(item.promedio)} / Registros {item.cantidad}
              </p>
              <span className="mt-2 inline-block border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase">
                Confianza {item.confianza}
              </span>
            </div>
          ))}
          {!estadisticas.length && <MiniRow title="Sin estadistica" detail="Faltan registros historicos." />}
        </div>
      </Panel>
    </div>
  );
};

const ComprobantesTab = ({ form, setForm, ordenes, comprobantes, onSubmit, validarComprobante, descargarComprobante, puedeVerValores }) => (
  <Panel title="Comprobantes de transferencia / pago">
    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
      <Metric label="Comprobantes" value={comprobantes.length} />
      <Metric label="Pendientes revision" value={comprobantes.filter((item) => item.estado === "PENDIENTE_REVISION").length} />
      <Metric label="Validados" value={comprobantes.filter((item) => item.estado === "VALIDADO").length} />
    </div>
    <details className="border-2 border-black bg-slate-50 p-3">
      <summary className="cursor-pointer text-xs font-black uppercase">
        Subir comprobante
      </summary>
    <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
      <label className="text-[10px] font-black uppercase text-gray-500">
        Orden asociada
        <select
          className={inputClass}
          value={form.ordenId}
          onChange={(e) => {
            const orden = ordenes.find((item) => String(item.id) === String(e.target.value));
            setForm((a) => ({
              ...a,
              ordenId: e.target.value,
              clienteId: orden?.clienteId || "",
            }));
          }}
        >
          <option value="">Sin orden</option>
          {ordenes.map((orden) => (
            <option key={orden.id} value={orden.id}>Orden #{orden.id} - {orden.patente || "S/P"}</option>
          ))}
        </select>
      </label>
      <Input label="Monto" type="number" value={form.monto} onChange={(v) => setForm((a) => ({ ...a, monto: v }))} />
      <Input label="Fecha pago" type="date" value={form.fecha_pago} onChange={(v) => setForm((a) => ({ ...a, fecha_pago: v }))} />
      <Select label="Metodo" value={form.metodo_pago} onChange={(v) => setForm((a) => ({ ...a, metodo_pago: v }))} options={["TRANSFERENCIA", "EFECTIVO", "TARJETA", "OTRO"].map((v) => [v, v])} />
      <Input label="Banco origen" value={form.banco_origen} onChange={(v) => setForm((a) => ({ ...a, banco_origen: v }))} />
      <Input label="Folio referencia" value={form.folio_referencia} onChange={(v) => setForm((a) => ({ ...a, folio_referencia: v }))} />
      <label className="text-[10px] font-black uppercase text-gray-500">
        Archivo comprobante
        <input className={inputClass} type="file" onChange={(e) => setForm((a) => ({ ...a, archivo: e.target.files?.[0] || null }))} />
      </label>
      <Input label="Observacion" value={form.observacion} onChange={(v) => setForm((a) => ({ ...a, observacion: v }))} className="md:col-span-2" />
      <button className="bg-black px-4 py-3 text-xs font-black uppercase text-white md:col-span-3" type="submit">Subir comprobante</button>
    </form>
    </details>
    <div className="mt-5 space-y-2">
      {comprobantes.map((item) => (
        <details
          key={item.id}
          className={`border-2 p-3 ${getStatusColor(item.estado, "soft")}`}
        >
          <summary className="cursor-pointer list-none">
          <p className="text-xs font-black uppercase">Comprobante #{item.id} / {item.estado} / {formatearMonto(item.monto)}</p>
          <p className="text-[10px] font-bold uppercase text-gray-500">Orden #{item.ordenId || "S/O"} / {formatearFecha(item.fecha_pago)} / {item.metodo_pago}</p>
          <p className="mt-1 text-[10px] font-black uppercase text-blue-700">
            Ver detalle
          </p>
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {item.archivo_comprobante_disponible && (
              <button
                type="button"
                onClick={() => descargarComprobante(item)}
                className="text-[10px] font-black uppercase text-blue-700 underline"
              >
                Descargar protegido
              </button>
            )}
            {puedeVerValores && item.estado === "PENDIENTE_REVISION" && (
              <>
                <button type="button" onClick={() => validarComprobante(item.id, "validar")} className="border-2 border-green-700 px-2 py-1 text-[10px] font-black uppercase text-green-700">Validar</button>
                <button type="button" onClick={() => validarComprobante(item.id, "rechazar")} className="border-2 border-red-700 px-2 py-1 text-[10px] font-black uppercase text-red-700">Rechazar</button>
              </>
            )}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <MiniRow title="Banco origen" detail={item.banco_origen || "No registrado"} />
            <MiniRow title="Folio referencia" detail={item.folio_referencia || "No registrado"} />
            <MiniRow title="Subido por" detail={item.subido_por || "No registrado"} />
            <MiniRow title="Validado por" detail={item.validado_por || "No registrado"} />
            <MiniRow title="Observacion" detail={item.observacion || "No registrado"} />
          </div>
        </details>
      ))}
      {!comprobantes.length && <MiniRow title="Sin comprobantes" detail="No hay comprobantes cargados." />}
    </div>
  </Panel>
);

export default FinanzasPage;
