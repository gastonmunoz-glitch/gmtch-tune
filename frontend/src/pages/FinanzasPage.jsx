import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

const inputClass =
  "w-full border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase text-black outline-none focus:border-blue-600";

const loteActual = () => new Date().toISOString().slice(0, 7);

const fechaActual = () => new Date().toISOString().slice(0, 10);

const loteDesdeFecha = (valor) => {
  const fecha = valor ? new Date(valor) : new Date();
  if (Number.isNaN(fecha.getTime())) return loteActual();
  return fecha.toISOString().slice(0, 7);
};

const formatearMonto = (valor) => {
  if (valor === null || valor === undefined || valor === "") return "Oculto";
  const numero = Number(valor || 0);
  return `$${numero.toLocaleString("es-CL")}`;
};

const formatearKg = (valor) => {
  const numero = Number(valor || 0);
  return `${numero.toLocaleString("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })} kg`;
};

const formatearFecha = (valor) => {
  if (!valor) return "No registrado";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "No registrado";
  return fecha.toLocaleDateString("es-CL");
};

const alertaClase = (alerta) => {
  const valor = String(alerta || "OK").toUpperCase();
  if (valor === "ALERTA") return "bg-red-700 text-white border-red-950";
  if (valor === "REVISAR") return "bg-yellow-300 text-black border-yellow-800";
  return "bg-green-600 text-white border-green-900";
};

const confianzaClase = (confianza) => {
  const valor = String(confianza || "BAJA").toUpperCase();
  if (valor === "ALTA") return "bg-green-100 text-green-800";
  if (valor === "MEDIA") return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
};

const texto = (valor, fallback = "No registrado") => {
  const limpio = String(valor ?? "").trim();
  return limpio || fallback;
};

function FinanzasPage() {
  const [searchParams] = useSearchParams();
  const ordenIdQuery = searchParams.get("ordenId");
  const vehiculoIdQuery = searchParams.get("vehiculoId");
  const materialIdQuery = searchParams.get("materialId");
  const [registros, setRegistros] = useState([]);
  const [estadisticas, setEstadisticas] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [resumenLote, setResumenLote] = useState(null);
  const [loteMes, setLoteMes] = useState(loteActual());
  const [puedeVerValores, setPuedeVerValores] = useState(false);
  const [puedeCerrarLote, setPuedeCerrarLote] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [ventas, setVentas] = useState({});
  const [form, setForm] = useState({
    ordenId: "",
    fecha: fechaActual(),
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

  const registrosVisibles = useMemo(() => {
    if (!vehiculoIdQuery) return registros;
    return registros.filter((registro) => String(registro.vehiculoId) === String(vehiculoIdQuery));
  }, [registros, vehiculoIdQuery]);

  const ordenSeleccionada = useMemo(
    () => ordenes.find((orden) => String(orden.id) === String(form.ordenId)),
    [ordenes, form.ordenId]
  );

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError("");

      const [materialRes, statsRes, loteRes, ordenesRes] = await Promise.all([
        api.get("/finanzas/material-recuperado", {
          params: {
            limit: 180,
            vehiculoId: vehiculoIdQuery || undefined,
          },
        }),
        api.get("/finanzas/material-recuperado/estadisticas-modelo"),
        api.get(`/finanzas/material-recuperado/lotes/${loteMes}`),
        api.get("/finanzas/material-recuperado/ordenes"),
      ]);

      setRegistros(Array.isArray(materialRes.data?.registros) ? materialRes.data.registros : []);
      setPuedeVerValores(Boolean(materialRes.data?.puedeVerValores));
      setPuedeCerrarLote(Boolean(materialRes.data?.puedeCerrarLote));
      setEstadisticas(
        Array.isArray(statsRes.data?.estadisticas) ? statsRes.data.estadisticas : []
      );
      setResumenLote(loteRes.data?.resumen || null);
      setOrdenes(Array.isArray(ordenesRes.data) ? ordenesRes.data : []);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo cargar Finanzas.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [loteMes, vehiculoIdQuery]);

  useEffect(() => {
    if (!ordenIdQuery || !ordenes.length) return;
    seleccionarOrden(ordenIdQuery);
  }, [ordenIdQuery, ordenes.length]);

  useEffect(() => {
    if (!materialIdQuery || !registros.length) return;

    const timeout = window.setTimeout(() => {
      document
        .getElementById(`material-${materialIdQuery}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [materialIdQuery, registros.length]);

  const actualizarForm = (campo, valor) => {
    setForm((actual) => ({
      ...actual,
      [campo]: valor,
      lote_mes: campo === "fecha" ? loteDesdeFecha(valor) : actual.lote_mes,
    }));
  };

  const seleccionarOrden = (ordenId) => {
    const orden = ordenes.find((item) => String(item.id) === String(ordenId));

    if (!orden) {
      setForm((actual) => ({ ...actual, ordenId }));
      return;
    }

    setForm((actual) => ({
      ...actual,
      ordenId: String(orden.id),
      marca: orden.marca || "",
      modelo: orden.modelo || "",
      anio: orden.anio || "",
      patente: orden.patente || "",
    }));
  };

  const registrarMaterial = async (event) => {
    event.preventDefault();
    setError("");
    setMensaje("");

    if (!form.marca || !form.modelo || Number(form.kilos) <= 0) {
      setError("Debes completar marca, modelo y kilos mayores a 0.");
      return;
    }

    try {
      const payload = {
        ...form,
        ordenId: form.ordenId || null,
        precio_estimado_kg: puedeVerValores ? form.precio_estimado_kg : undefined,
      };
      const res = await api.post("/finanzas/material-recuperado", payload);
      setMensaje(res.data?.mensaje || "Material recuperado registrado.");
      setForm((actual) => ({
        ...actual,
        kilos: "",
        observacion: "",
      }));
      await cargarDatos();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo registrar material.");
    }
  };

  const venderRegistro = async (registro) => {
    const venta = ventas[registro.id] || {};

    if (!venta.precio_real_kg || Number(venta.precio_real_kg) <= 0) {
      setError("Debes ingresar precio real por kg para marcar venta.");
      return;
    }

    try {
      setError("");
      setMensaje("");
      const res = await api.patch(`/finanzas/material-recuperado/${registro.id}/vender`, {
        comprador: venta.comprador || "",
        precio_real_kg: venta.precio_real_kg,
      });
      setMensaje(res.data?.mensaje || "Material marcado como vendido.");
      setVentas((actual) => ({ ...actual, [registro.id]: {} }));
      await cargarDatos();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo marcar venta.");
    }
  };

  const cerrarLote = async () => {
    if (!window.confirm(`Cerrar lote mensual ${loteMes}?`)) return;

    try {
      setError("");
      setMensaje("");
      const res = await api.patch(`/finanzas/material-recuperado/lotes/${loteMes}/cerrar`, {
        observacion: "Cierre desde FinanzasPage",
      });
      setMensaje(res.data?.mensaje || "Lote cerrado.");
      await cargarDatos();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo cerrar lote.");
    }
  };

  const valorEstimadoFormulario =
    Number(form.kilos || 0) * Number(form.precio_estimado_kg || 11000);

  return (
    <div className="space-y-6">
      <div className="bg-black p-6 text-white border-b-8 border-blue-600">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
          Finanzas y Control Operativo V1
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase">
          Material recuperado
        </h1>
        <p className="mt-2 max-w-4xl text-xs font-bold uppercase text-slate-300">
          Registro administrativo de kg recuperados en trabajos autorizados. No contiene instrucciones tecnicas de extraccion ni intervencion.
        </p>
      </div>

      {error && (
        <div className="border-4 border-red-600 bg-red-50 p-4 text-sm font-black uppercase text-red-800">
          {error}
        </div>
      )}
      {mensaje && (
        <div className="border-4 border-green-600 bg-green-50 p-4 text-sm font-black uppercase text-green-800">
          {mensaje}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <Metric label="Kg acumulados mes" value={formatearKg(resumenLote?.kg_reales)} />
        <Metric
          label="Valor estimado mes"
          value={puedeVerValores ? formatearMonto(resumenLote?.valor_estimado) : "Oculto"}
        />
        <Metric
          label="Valor real vendido"
          value={puedeVerValores ? formatearMonto(resumenLote?.valor_real_vendido) : "Oculto"}
        />
        <Metric
          label="Diferencia esperado vs real"
          value={`${formatearKg(resumenLote?.diferencia_kg)} / ${resumenLote?.diferencia_porcentaje ?? 0}%`}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={registrarMaterial}
          className="border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        >
          <h2 className="text-lg font-black uppercase">Registrar material recuperado</h2>
          <p className="mt-2 text-xs font-bold uppercase text-gray-500">
            La orden es opcional, pero si existe autocompleta vehiculo y cliente.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-[10px] font-black uppercase text-gray-500 md:col-span-2">
              Orden asociada
              <select
                className={inputClass}
                value={form.ordenId}
                onChange={(event) => seleccionarOrden(event.target.value)}
              >
                <option value="">Sin orden asociada</option>
                {ordenes.map((orden) => (
                  <option key={orden.id} value={orden.id}>
                    Orden #{orden.id} - {orden.patente || "S/P"} - {orden.marca} {orden.modelo}
                  </option>
                ))}
              </select>
            </label>

            {ordenSeleccionada && (
              <div className="md:col-span-2 border-2 border-blue-600 bg-blue-50 p-3 text-[10px] font-bold uppercase text-blue-900">
                Cliente: {ordenSeleccionada.cliente_nombre || "No registrado"} / Estado: {ordenSeleccionada.estado || "Pendiente"} / Intervencion: {ordenSeleccionada.intervencion_fisica_tipo || "Sin dato"}
              </div>
            )}

            <label className="text-[10px] font-black uppercase text-gray-500">
              Fecha
              <input
                type="date"
                className={inputClass}
                value={form.fecha}
                onChange={(event) => actualizarForm("fecha", event.target.value)}
              />
            </label>

            <label className="text-[10px] font-black uppercase text-gray-500">
              Lote automatico
              <input className={inputClass} value={loteDesdeFecha(form.fecha)} readOnly />
            </label>

            <label className="text-[10px] font-black uppercase text-gray-500">
              Marca
              <input
                className={inputClass}
                value={form.marca}
                onChange={(event) => actualizarForm("marca", event.target.value)}
              />
            </label>

            <label className="text-[10px] font-black uppercase text-gray-500">
              Modelo
              <input
                className={inputClass}
                value={form.modelo}
                onChange={(event) => actualizarForm("modelo", event.target.value)}
              />
            </label>

            <label className="text-[10px] font-black uppercase text-gray-500">
              Motor opcional
              <input
                className={inputClass}
                value={form.motor}
                onChange={(event) => actualizarForm("motor", event.target.value)}
                placeholder="Ej: 2.0 TDI"
              />
            </label>

            <label className="text-[10px] font-black uppercase text-gray-500">
              Ano
              <input
                className={inputClass}
                value={form.anio}
                onChange={(event) => actualizarForm("anio", event.target.value)}
              />
            </label>

            <label className="text-[10px] font-black uppercase text-gray-500">
              Patente
              <input
                className={inputClass}
                value={form.patente}
                onChange={(event) => actualizarForm("patente", event.target.value)}
              />
            </label>

            <label className="text-[10px] font-black uppercase text-gray-500">
              Tipo material
              <select
                className={inputClass}
                value={form.tipo_material}
                onChange={(event) => actualizarForm("tipo_material", event.target.value)}
              >
                <option value="LOZA_DPF">LOZA_DPF</option>
                <option value="OTRO">OTRO</option>
              </select>
            </label>

            <label className="text-[10px] font-black uppercase text-gray-500">
              Kilos recuperados
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.001"
                value={form.kilos}
                onChange={(event) => actualizarForm("kilos", event.target.value)}
              />
            </label>

            {puedeVerValores ? (
              <label className="text-[10px] font-black uppercase text-gray-500">
                Precio estimado kg
                <input
                  className={inputClass}
                  type="number"
                  min="1"
                  step="1"
                  value={form.precio_estimado_kg}
                  onChange={(event) =>
                    actualizarForm("precio_estimado_kg", event.target.value)
                  }
                />
              </label>
            ) : (
              <div className="border-2 border-black bg-gray-100 p-3 text-[10px] font-black uppercase text-gray-500">
                Valores financieros ocultos para tu rol.
              </div>
            )}

            <label className="text-[10px] font-black uppercase text-gray-500 md:col-span-2">
              Observacion administrativa
              <textarea
                className={`${inputClass} min-h-[80px]`}
                value={form.observacion}
                onChange={(event) => actualizarForm("observacion", event.target.value)}
              />
            </label>
          </div>

          {puedeVerValores && (
            <div className="mt-4 border-2 border-black bg-slate-100 p-3 text-xs font-black uppercase">
              Valor estimado formulario: {formatearMonto(valorEstimadoFormulario)}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="mt-4 bg-black px-5 py-3 text-xs font-black uppercase text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Registrar material
          </button>
        </form>

        <section className="border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-black uppercase">Cierre mensual</h2>
              <p className="mt-1 text-xs font-bold uppercase text-gray-500">
                Comparacion esperada vs real del lote.
              </p>
            </div>
            <label className="text-[10px] font-black uppercase text-gray-500">
              Lote
              <input
                className={inputClass}
                type="month"
                value={loteMes}
                onChange={(event) => setLoteMes(event.target.value || loteActual())}
              />
            </label>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Mini label="Estado lote" value={resumenLote?.estado_lote || "ABIERTO"} />
            <Mini label="Registros" value={resumenLote?.total_registros || 0} />
            <Mini label="Kg esperados" value={formatearKg(resumenLote?.kg_esperados)} />
            <Mini label="Kg reales" value={formatearKg(resumenLote?.kg_reales)} />
            <Mini label="Kg vendidos" value={formatearKg(resumenLote?.kg_vendidos)} />
            <Mini label="Alerta lote" value={resumenLote?.alerta || "OK"} />
          </div>

          {puedeCerrarLote && (
            <button
              type="button"
              onClick={cerrarLote}
              className="mt-4 border-2 border-black bg-blue-600 px-4 py-3 text-xs font-black uppercase text-white hover:bg-black"
            >
              Cerrar lote mensual
            </button>
          )}
        </section>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-black uppercase">Registros historicos</h2>
            <button
              type="button"
              onClick={cargarDatos}
              className="border-2 border-black px-4 py-2 text-xs font-black uppercase"
            >
              Actualizar
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {registrosVisibles.map((registro) => {
              const destacado = String(registro.id) === String(materialIdQuery);
              const venta = ventas[registro.id] || {};

              return (
                <article
                  key={registro.id}
                  id={`material-${registro.id}`}
                  className={`border-2 p-4 ${
                    destacado
                      ? "border-blue-600 bg-blue-50 shadow-[0_0_0_4px_rgba(37,99,235,0.18)]"
                      : "border-black bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-black px-2 py-1 text-[10px] font-black uppercase text-white">
                          Material #{registro.id}
                        </span>
                        <span className={`border-2 px-2 py-1 text-[10px] font-black uppercase ${alertaClase(registro.alerta_rango)}`}>
                          {registro.alerta_rango || "OK"}
                        </span>
                        <span className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase">
                          {registro.estado}
                        </span>
                      </div>
                      <h3 className="mt-2 text-xl font-black uppercase">
                        {registro.marca} {registro.modelo} {registro.anio || ""}
                      </h3>
                      <p className="text-xs font-bold uppercase text-gray-500">
                        {registro.patente || "Sin patente"} / {registro.tipo_material} / {formatearFecha(registro.fecha)}
                      </p>
                      <p className="mt-2 text-sm font-black uppercase">
                        Kg reales: {formatearKg(registro.kilos)}
                      </p>
                      <p className="text-xs font-bold uppercase text-gray-500">
                        Promedio historico: {registro.promedio_historico_kg ? formatearKg(registro.promedio_historico_kg) : "Sin historico"} / Diferencia: {registro.diferencia_porcentaje ?? "0"}%
                      </p>
                      <p className="text-xs font-bold uppercase text-gray-500">
                        Confianza: {registro.confianza_estadistica || "BAJA"} / Lote: {registro.lote_mes}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      {registro.ordenId && (
                        <Link
                          to={`/ordenes?ordenId=${registro.ordenId}`}
                          className="text-xs font-black uppercase text-blue-700 underline"
                        >
                          Ver orden #{registro.ordenId}
                        </Link>
                      )}
                      {registro.vehiculoId && (
                        <Link
                          to={`/vehiculos/${registro.vehiculoId}#material-recuperado`}
                          className="mt-2 block text-xs font-black uppercase text-blue-700 underline"
                        >
                          Ver ficha vehiculo
                        </Link>
                      )}
                      {puedeVerValores && (
                        <div className="mt-3 text-xs font-black uppercase">
                          <p>Estimado: {formatearMonto(registro.valor_estimado)}</p>
                          <p>Real: {formatearMonto(registro.valor_real)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {registro.observacion && (
                    <p className="mt-3 border-2 border-gray-200 bg-gray-50 p-3 text-xs font-bold uppercase text-gray-600">
                      {registro.observacion}
                    </p>
                  )}

                  {puedeCerrarLote && registro.estado !== "VENDIDO" && (
                    <div className="mt-3 grid grid-cols-1 gap-2 border-t-2 border-black pt-3 md:grid-cols-[1fr_1fr_auto]">
                      <input
                        className={inputClass}
                        placeholder="Comprador"
                        value={venta.comprador || ""}
                        onChange={(event) =>
                          setVentas((actual) => ({
                            ...actual,
                            [registro.id]: {
                              ...venta,
                              comprador: event.target.value,
                            },
                          }))
                        }
                      />
                      <input
                        className={inputClass}
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Precio real kg"
                        value={venta.precio_real_kg || ""}
                        onChange={(event) =>
                          setVentas((actual) => ({
                            ...actual,
                            [registro.id]: {
                              ...venta,
                              precio_real_kg: event.target.value,
                            },
                          }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => venderRegistro(registro)}
                        className="bg-black px-4 py-2 text-xs font-black uppercase text-white hover:bg-blue-700"
                      >
                        Marcar vendido
                      </button>
                    </div>
                  )}
                </article>
              );
            })}

            {registrosVisibles.length === 0 && (
              <div className="border-2 border-black bg-gray-50 p-5 text-sm font-black uppercase text-gray-500">
                Sin registros de material recuperado.
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <section className="border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-lg font-black uppercase">Ranking por modelo</h2>
            <div className="mt-4 space-y-3">
              {estadisticas.slice(0, 8).map((item) => (
                <div key={item.clave} className="border-2 border-black p-3">
                  <p className="text-sm font-black uppercase">
                    {item.marca} {item.modelo}
                  </p>
                  <p className="text-xs font-bold uppercase text-gray-500">
                    Motor: {item.motor || "Sin motor"} / Registros: {item.cantidad}
                  </p>
                  <p className="mt-2 text-xs font-black uppercase">
                    Promedio: {formatearKg(item.promedio)} / Min: {formatearKg(item.minimo)} / Max: {formatearKg(item.maximo)}
                  </p>
                  <span className={`mt-2 inline-block px-2 py-1 text-[10px] font-black uppercase ${confianzaClase(item.confianza)}`}>
                    Confianza {item.confianza}
                  </span>
                </div>
              ))}
              {!estadisticas.length && (
                <p className="text-xs font-bold uppercase text-gray-500">
                  Aun no hay estadistica historica suficiente.
                </p>
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

const Metric = ({ label, value }) => (
  <div className="border-4 border-black bg-white p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
    <p className="text-[10px] font-black uppercase text-gray-500">{label}</p>
    <p className="mt-2 text-xl font-black uppercase">{value}</p>
  </div>
);

const Mini = ({ label, value }) => (
  <div className="border-2 border-black bg-slate-50 p-3">
    <p className="text-[10px] font-black uppercase text-gray-500">{label}</p>
    <p className="mt-1 text-sm font-black uppercase">{texto(value)}</p>
  </div>
);

export default FinanzasPage;
