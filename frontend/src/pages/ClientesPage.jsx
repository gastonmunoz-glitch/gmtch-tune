import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const CATEGORIAS = ["NORMAL", "VIP", "FLOTA", "MAYORISTA", "PROVEEDOR", "INTERNO"];

const FORM_INICIAL = {
  nombre: "",
  telefono: "",
  email: "",
  direccion: "",
  categoria_cliente: "NORMAL",
  excluir_estadisticas: false,
  nota_cliente: "",
};

const texto = (valor, fallback = "No registrado") => {
  const limpio = String(valor ?? "").trim();
  return limpio || fallback;
};

const fecha = (valor, fallback = "No registrado") => {
  if (!valor) return fallback;
  const date = new Date(valor);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const monto = (valor, fallback = "Pendiente") => {
  const numero = Number(valor || 0);
  if (!Number.isFinite(numero) || numero <= 0) return fallback;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(numero);
};

const getOrdenesVehiculo = (vehiculo) =>
  vehiculo?.OrdenTrabajos || vehiculo?.Ordenes || vehiculo?.ordenes || [];

const obtenerOrdenesCliente = (cliente) => {
  const vehiculos = cliente?.Vehiculos || [];

  if (Array.isArray(cliente?.Ordenes) && cliente.Ordenes.length > 0) {
    return cliente.Ordenes.map((orden) => {
      const vehiculo = vehiculos.find((item) => item.id === orden.vehiculoId);
      return { ...orden, Vehiculo: orden.Vehiculo || vehiculo };
    });
  }

  return vehiculos.flatMap((vehiculo) =>
    getOrdenesVehiculo(vehiculo).map((orden) => ({ ...orden, Vehiculo: vehiculo }))
  );
};

const calcularMetricas = (cliente) => {
  const metricas = cliente?.metricas || {};
  const vehiculos = cliente?.Vehiculos || [];
  const ordenes = obtenerOrdenesCliente(cliente);

  const ordenesActivas = ordenes.filter(
    (orden) => String(orden.estado || "").toUpperCase() !== "ENTREGADO"
  ).length;
  const pagosPendientes = ordenes.filter(
    (orden) => String(orden.estado_pago || "").toUpperCase() !== "PAGADO"
  ).length;
  const totalFacturado = ordenes.reduce(
    (total, orden) => total + Number(orden.monto_total || 0),
    0
  );
  const totalPagado = ordenes.reduce(
    (total, orden) => total + Number(orden.monto_pagado || 0),
    0
  );

  return {
    totalVehiculos:
      cliente?.totalVehiculos ?? metricas.totalVehiculos ?? vehiculos.length,
    totalOrdenes: cliente?.totalOrdenes ?? metricas.totalOrdenes ?? ordenes.length,
    ordenesActivas:
      cliente?.ordenesActivas ?? metricas.ordenesActivas ?? ordenesActivas,
    totalFacturado:
      cliente?.totalFacturado ?? metricas.totalFacturado ?? totalFacturado,
    totalPagado: cliente?.totalPagado ?? metricas.totalPagado ?? totalPagado,
    pagosPendientes:
      cliente?.pagosPendientes ?? metricas.pagosPendientes ?? pagosPendientes,
    ultimaVisita: cliente?.ultimaVisita ?? metricas.ultimaVisita,
    ultimaEntrega: cliente?.ultimaEntrega ?? metricas.ultimaEntrega,
  };
};

function ClientesPage() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(FORM_INICIAL);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargarClientes = async () => {
    try {
      const res = await api.get("/clientes");
      setClientes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("ERROR CARGANDO CLIENTES:", err);
      setError("No se pudo cargar el listado de clientes.");
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarFicha = async (id) => {
    setCargandoFicha(true);
    setError("");
    try {
      const res = await api.get(`/clientes/${id}`);
      setClienteSeleccionado(res.data);
    } catch (err) {
      console.error("ERROR CARGANDO FICHA CLIENTE:", err);
      setError("No se pudo cargar la ficha CRM del cliente.");
    } finally {
      setCargandoFicha(false);
    }
  };

  const limpiarFormulario = () => {
    setEditingId(null);
    setFormData(FORM_INICIAL);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    try {
      if (editingId) {
        await api.put(`/clientes/${editingId}`, formData);
        setMensaje("Cliente actualizado correctamente.");
        if (clienteSeleccionado?.id === editingId) {
          await cargarFicha(editingId);
        }
      } else {
        await api.post("/clientes", formData);
        setMensaje("Cliente registrado correctamente.");
      }

      await cargarClientes();
      limpiarFormulario();
    } catch (err) {
      console.error("ERROR GUARDANDO CLIENTE:", err);
      setError(err.response?.data?.error || "No se pudo guardar el cliente.");
    }
  };

  const prepararEdicion = (cliente) => {
    setEditingId(cliente.id);
    setFormData({
      nombre: cliente.nombre || "",
      telefono: cliente.telefono || "",
      email: cliente.email || "",
      direccion: cliente.direccion || "",
      categoria_cliente: cliente.categoria_cliente || "NORMAL",
      excluir_estadisticas: cliente.excluir_estadisticas === true,
      nota_cliente: cliente.nota_cliente || "",
    });
  };

  const eliminar = async (cliente) => {
    const confirmado = window.confirm(
      `Eliminar cliente ${texto(cliente.nombre)}? Esta accion no se permite si tiene historial.`
    );

    if (!confirmado) return;

    setError("");
    setMensaje("");

    try {
      await api.delete(`/clientes/${cliente.id}`);
      setClientes((actuales) => actuales.filter((item) => item.id !== cliente.id));
      if (clienteSeleccionado?.id === cliente.id) setClienteSeleccionado(null);
      setMensaje("Cliente eliminado correctamente.");
    } catch (err) {
      console.error("ERROR ELIMINANDO CLIENTE:", err);
      setError(
        err.response?.data?.error ||
          "No se pudo eliminar el cliente. Revise si tiene historial asociado."
      );
    }
  };

  const ordenesFicha = useMemo(() => {
    return obtenerOrdenesCliente(clienteSeleccionado).sort((a, b) => {
      const fechaA = new Date(a.createdAt || 0).getTime();
      const fechaB = new Date(b.createdAt || 0).getTime();
      return fechaB - fechaA;
    });
  }, [clienteSeleccionado]);

  const metricasFicha = useMemo(
    () => calcularMetricas(clienteSeleccionado),
    [clienteSeleccionado]
  );

  return (
    <div className="max-w-full mx-auto p-2 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b-8 border-black pb-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-black uppercase tracking-tighter italic">
            CRM Clientes
          </h1>
          <p className="text-sm font-black uppercase text-gray-500">
            Taller, vehiculos, ordenes y pagos en una sola vista
          </p>
        </div>
        <div className="bg-black text-white px-6 py-3 font-black text-xl shadow-[8px_8px_0px_0px_rgba(59,130,246,1)]">
          Clientes: {clientes.length}
        </div>
      </div>

      {(mensaje || error) && (
        <div
          className={`border-4 border-black p-4 font-black uppercase ${
            error ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
          }`}
        >
          {error || mensaje}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        <form
          onSubmit={handleSubmit}
          className="col-span-12 xl:col-span-4 bg-white p-6 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] space-y-5"
        >
          <h2 className="text-xl font-black text-black uppercase border-b-4 border-black pb-2">
            {editingId ? "Editar cliente" : "Nuevo cliente"}
          </h2>

          <div>
            <label className="block text-xs font-black text-black uppercase mb-2">
              Nombre
            </label>
            <input
              type="text"
              className="w-full border-4 border-black p-4 font-black text-black outline-none focus:bg-yellow-50"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Nombre del cliente"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-black uppercase mb-2">
                Telefono
              </label>
              <input
                type="text"
                className="w-full border-4 border-black p-4 font-black text-black outline-none focus:bg-yellow-50"
                value={formData.telefono}
                onChange={(e) =>
                  setFormData({ ...formData, telefono: e.target.value })
                }
                placeholder="+569..."
              />
            </div>
            <div>
              <label className="block text-xs font-black text-black uppercase mb-2">
                Email
              </label>
              <input
                type="email"
                className="w-full border-4 border-black p-4 font-black text-black outline-none focus:bg-yellow-50"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="correo@dominio.cl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-black uppercase mb-2">
              Direccion
            </label>
            <input
              type="text"
              className="w-full border-4 border-black p-4 font-black text-black outline-none focus:bg-yellow-50"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              placeholder="Direccion comercial o particular"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-black uppercase mb-2">
              Categoria
            </label>
            <select
              className="w-full border-4 border-black p-4 font-black text-black outline-none focus:bg-yellow-50 bg-white"
              value={formData.categoria_cliente}
              onChange={(e) =>
                setFormData({ ...formData, categoria_cliente: e.target.value })
              }
            >
              {CATEGORIAS.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-black uppercase mb-2">
              Nota interna
            </label>
            <textarea
              className="w-full border-4 border-black p-4 font-black text-black outline-none focus:bg-yellow-50 min-h-[110px]"
              value={formData.nota_cliente}
              onChange={(e) =>
                setFormData({ ...formData, nota_cliente: e.target.value })
              }
              placeholder="Condiciones, preferencias, alertas o acuerdos."
            />
          </div>

          <label className="flex items-center gap-3 border-4 border-black bg-yellow-50 p-4 font-black uppercase text-xs text-black">
            <input
              type="checkbox"
              checked={formData.excluir_estadisticas === true}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  excluir_estadisticas: e.target.checked,
                })
              }
            />
            Excluir de estadísticas / Demo
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-black text-white py-5 font-black uppercase hover:bg-blue-700 transition"
            >
              {editingId ? "Actualizar" : "Registrar"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="bg-gray-200 px-5 font-black text-black uppercase border-4 border-black hover:bg-red-100 transition"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="col-span-12 xl:col-span-8 bg-white border-4 border-black overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,0.05)]">
          <div className="bg-black text-white grid grid-cols-12 gap-2 p-4 text-xs font-black uppercase tracking-widest">
            <div className="col-span-4">Cliente</div>
            <div className="col-span-2">Contacto</div>
            <div className="col-span-2">Categoria</div>
            <div className="col-span-2 text-center">Vehiculos</div>
            <div className="col-span-2 text-center">Acciones</div>
          </div>

          {clientes.map((cliente) => {
            const resumen = calcularMetricas(cliente);
            const seleccionado = clienteSeleccionado?.id === cliente.id;

            return (
              <div
                key={cliente.id}
                className={`grid grid-cols-12 gap-2 p-4 border-b-4 border-black items-center ${
                  seleccionado ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => cargarFicha(cliente.id)}
                  className="col-span-4 text-left"
                >
                  <div className="font-black text-lg uppercase text-black">
                    {texto(cliente.nombre)}
                  </div>
                  <div className="font-mono text-xs text-blue-700">
                    #{String(cliente.id).padStart(4, "0")}
                  </div>
                  {cliente.excluir_estadisticas === true && (
                    <div className="mt-2 inline-block bg-yellow-300 border-2 border-black px-2 py-1 text-[10px] font-black uppercase">
                      Demo / no cuenta en estadísticas
                    </div>
                  )}
                </button>
                <div className="col-span-2 text-sm font-bold">
                  <div>{texto(cliente.telefono, "Pendiente")}</div>
                  <div className="text-gray-500 break-all">{texto(cliente.email)}</div>
                </div>
                <div className="col-span-2 font-black text-sm">
                  {texto(cliente.categoria_cliente, "NORMAL")}
                  <div className="text-xs text-gray-500">
                    Activas: {resumen.ordenesActivas}
                  </div>
                </div>
                <div className="col-span-2 text-center font-black text-2xl">
                  {resumen.totalVehiculos}
                </div>
                <div className="col-span-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => cargarFicha(cliente.id)}
                    className="bg-black text-white py-2 px-3 border-2 border-black font-black uppercase text-xs hover:bg-blue-700 transition"
                  >
                    Ver ficha
                  </button>
                  <button
                    type="button"
                    onClick={() => prepararEdicion(cliente)}
                    className="bg-white text-black py-2 px-3 border-2 border-black font-black uppercase text-xs hover:bg-yellow-100 transition"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminar(cliente)}
                    className="bg-red-600 text-white py-2 px-3 border-2 border-black font-black uppercase text-xs hover:bg-black transition"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}

          {clientes.length === 0 && (
            <div className="p-16 text-center text-gray-400 font-black text-xl uppercase tracking-widest">
              Sin clientes registrados
            </div>
          )}
        </div>
      </div>

      <section className="bg-white border-4 border-black p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.08)]">
        {!clienteSeleccionado && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-black uppercase text-black">
              Selecciona un cliente para ver su ficha CRM
            </h2>
            <p className="font-bold text-gray-500 mt-2">
              Aqui apareceran vehiculos, ordenes, pagos y ultimas visitas.
            </p>
          </div>
        )}

        {cargandoFicha && (
          <div className="text-center py-12 font-black uppercase text-blue-700">
            Cargando ficha...
          </div>
        )}

        {clienteSeleccionado && !cargandoFicha && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between border-b-4 border-black pb-5">
              <div>
                <h2 className="text-3xl font-black uppercase text-black">
                  {texto(clienteSeleccionado.nombre)}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm font-bold">
                  <div>Telefono: {texto(clienteSeleccionado.telefono, "Pendiente")}</div>
                  <div>Email: {texto(clienteSeleccionado.email)}</div>
                  <div>Direccion: {texto(clienteSeleccionado.direccion)}</div>
                  <div>Categoria: {texto(clienteSeleccionado.categoria_cliente, "NORMAL")}</div>
                  <div>
                    Estadísticas:{" "}
                    {clienteSeleccionado.excluir_estadisticas === true
                      ? "Demo / no cuenta"
                      : "Cuenta como real"}
                  </div>
                </div>
                <div className="mt-3 bg-gray-100 border-2 border-black p-3 font-bold">
                  Nota interna: {texto(clienteSeleccionado.nota_cliente)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => prepararEdicion(clienteSeleccionado)}
                className="bg-yellow-300 border-4 border-black px-5 py-3 font-black uppercase hover:bg-yellow-200 transition"
              >
                Editar datos
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
              <MetricCard label="Vehiculos" value={metricasFicha.totalVehiculos} />
              <MetricCard label="Ordenes" value={metricasFicha.totalOrdenes} />
              <MetricCard label="Activas" value={metricasFicha.ordenesActivas} />
              <MetricCard label="Pagos pend." value={metricasFicha.pagosPendientes} />
              <MetricCard label="Facturado" value={monto(metricasFicha.totalFacturado, "$0")} />
              <MetricCard label="Pagado" value={monto(metricasFicha.totalPagado, "$0")} />
              <MetricCard label="Ult. visita" value={fecha(metricasFicha.ultimaVisita, "Pendiente")} />
              <MetricCard label="Ult. entrega" value={fecha(metricasFicha.ultimaEntrega, "Pendiente")} />
            </div>

            <div>
              <h3 className="text-xl font-black uppercase border-b-4 border-black pb-2 mb-4">
                Vehiculos del cliente
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(clienteSeleccionado.Vehiculos || []).map((vehiculo) => (
                  <div key={vehiculo.id} className="border-4 border-black p-4 bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-2xl font-black uppercase">
                          {texto(vehiculo.patente)}
                        </div>
                        <div className="font-bold">
                          {texto(vehiculo.marca)} / {texto(vehiculo.modelo)} /{" "}
                          {texto(vehiculo.anio)}
                        </div>
                        <div className="text-sm font-bold text-gray-600">
                          VIN: {texto(vehiculo.vin)}
                        </div>
                        <div className="text-sm font-black uppercase text-blue-700">
                          Ordenes: {getOrdenesVehiculo(vehiculo).length}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/vehiculos/${vehiculo.id}`)}
                        className="bg-black text-white px-4 py-3 border-2 border-black font-black uppercase text-xs hover:bg-blue-700 transition"
                      >
                        Ir a ficha
                      </button>
                    </div>
                  </div>
                ))}

                {(clienteSeleccionado.Vehiculos || []).length === 0 && (
                  <div className="border-4 border-dashed border-gray-300 p-6 font-black uppercase text-gray-400">
                    Sin vehiculos registrados
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black uppercase border-b-4 border-black pb-2 mb-4">
                Historial de ordenes
              </h3>
              <div className="space-y-3">
                {ordenesFicha.map((orden) => (
                  <div key={orden.id} className="border-4 border-black p-4">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div>
                        <div className="font-black text-xl uppercase">
                          Orden #{orden.id} - {texto(orden.Vehiculo?.patente)}
                        </div>
                        <div className="text-sm font-bold text-gray-600">
                          {texto(orden.Vehiculo?.marca)} {texto(orden.Vehiculo?.modelo)} -{" "}
                          {fecha(orden.createdAt)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="border-2 border-black px-3 py-1 font-black uppercase text-xs">
                          {texto(orden.estado, "Pendiente")}
                        </span>
                        <span
                          className={`border-2 border-black px-3 py-1 font-black uppercase text-xs ${
                            String(orden.estado_pago || "").toUpperCase() === "PAGADO"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          Pago: {texto(orden.estado_pago, "Pendiente")}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4 text-sm font-bold">
                      <Info label="Monto total" value={monto(orden.monto_total)} />
                      <Info label="Monto pagado" value={monto(orden.monto_pagado)} />
                      <Info label="Fecha pago" value={fecha(orden.fecha_pago, "Pendiente")} />
                      <Info label="Cobrado por" value={texto(orden.cobrado_por)} />
                      <Info label="Entregado" value={fecha(orden.entregado_at, "Pendiente")} />
                      <Info label="Medio pago" value={texto(orden.medio_pago, "Pendiente")} />
                      <Info label="Prioridad" value={texto(orden.prioridad, "Pendiente")} />
                      <Info label="Km" value={texto(orden.kilometraje)} />
                    </div>
                  </div>
                ))}

                {ordenesFicha.length === 0 && (
                  <div className="border-4 border-dashed border-gray-300 p-6 font-black uppercase text-gray-400">
                    Sin ordenes registradas
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="border-4 border-black p-3 bg-gray-50 min-h-[96px] flex flex-col justify-between">
      <div className="text-xs font-black uppercase text-gray-500">{label}</div>
      <div className="text-lg font-black text-black break-words">{value}</div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-gray-50 border-2 border-black p-3">
      <div className="text-[11px] font-black uppercase text-gray-500">{label}</div>
      <div className="font-black text-black break-words">{value}</div>
    </div>
  );
}

export default ClientesPage;
