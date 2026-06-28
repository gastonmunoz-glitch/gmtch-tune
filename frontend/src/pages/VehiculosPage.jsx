import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

const CATEGORIAS = ["NORMAL", "VIP", "FLOTA", "MAYORISTA", "PROVEEDOR", "INTERNO"];

const TIPOS_UNIDAD = [
  "AUTO",
  "CAMIONETA",
  "CAMIÓN",
  "MAQUINARIA",
  "MOTO",
  "LANCHA",
  "JETSKI",
  "BUS",
  "INDUSTRIAL",
];

const rolActual = () => localStorage.getItem("rol") || "";
const esOwner = () => rolActual() === "OWNER";

function VehiculosPage() {
  const navigate = useNavigate();

  const [vehiculos, setVehiculos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);

  const [formData, setFormData] = useState({
    clienteId: "",
    patente: "",
    marca: "",
    modelo: "",
    anio: "",
    vin: "",
    tipo_unidad: "AUTO",
  });

  useEffect(() => {
    let activo = true;

    const cargarInicial = async () => {
      try {
        const [vRes, cRes] = await Promise.all([
          api.get("/vehiculos"),
          api.get("/clientes"),
        ]);

        if (!activo) return;

        setVehiculos(Array.isArray(vRes.data) ? vRes.data : []);
        setClientes(Array.isArray(cRes.data) ? cRes.data : []);
      } catch (err) {
        console.error("ERROR CARGANDO GARAGE:", err.response?.data || err.message);
      }
    };

    cargarInicial();

    return () => {
      activo = false;
    };
  }, []);

  const recargar = async () => {
    try {
      setCargando(true);

      const [vRes, cRes] = await Promise.all([
        api.get("/vehiculos"),
        api.get("/clientes"),
      ]);

      setVehiculos(Array.isArray(vRes.data) ? vRes.data : []);
      setClientes(Array.isArray(cRes.data) ? cRes.data : []);
    } catch (err) {
      console.error("ERROR RECARGANDO GARAGE:", err.response?.data || err.message);
      alert("No se pudo recargar el garage.");
    } finally {
      setCargando(false);
    }
  };

  const vehiculosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return vehiculos.filter((v) => {
      const cliente = v.Cliente || v.cliente || {};

      const texto = [
        v.patente,
        v.marca,
        v.modelo,
        v.anio,
        v.vin,
        v.tipo_unidad,
        cliente.nombre,
        cliente.telefono,
        cliente.categoria_cliente,
      ]
        .join(" ")
        .toLowerCase();

      if (!q) return true;

      return texto.includes(q);
    });
  }, [vehiculos, busqueda]);

  const gruposPorCliente = useMemo(() => {
    const grupos = {};

    vehiculosFiltrados.forEach((v) => {
      const cliente = v.Cliente || v.cliente || {};
      const key = cliente.id || "SIN_CLIENTE";

      if (!grupos[key]) {
        grupos[key] = {
          cliente,
          vehiculos: [],
        };
      }

      grupos[key].vehiculos.push(v);
    });

    return Object.values(grupos).sort((a, b) =>
      String(a.cliente?.nombre || "Sin cliente").localeCompare(
        String(b.cliente?.nombre || "Sin cliente")
      )
    );
  }, [vehiculosFiltrados]);

  const actualizarForm = (campo, valor) => {
    setFormData((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setCargando(true);

      await api.post("/vehiculos", formData);

      setFormData({
        clienteId: "",
        patente: "",
        marca: "",
        modelo: "",
        anio: "",
        vin: "",
        tipo_unidad: "AUTO",
      });

      await recargar();

      alert("Vehículo guardado correctamente.");
    } catch (err) {
      console.error("ERROR GUARDANDO VEHÍCULO:", err.response?.data || err.message);
      alert(err.response?.data?.error || "No se pudo guardar el vehículo.");
    } finally {
      setCargando(false);
    }
  };

  const cambiarCategoriaCliente = async (clienteId, categoria) => {
    if (!clienteId) return;

    try {
      await api.patch(`/clientes/${clienteId}`, {
        categoria_cliente: categoria,
      });

      await recargar();
    } catch (err) {
      console.error("ERROR CAMBIANDO CATEGORÍA:", err.response?.data || err.message);
      alert("No se pudo cambiar la categoría del cliente.");
    }
  };

  const eliminarVehiculo = async (vehiculo) => {
    const confirmar = window.confirm(
      `¿Eliminar vehículo ${vehiculo.patente}? Solo se permite si no tiene historial.`
    );

    if (!confirmar) return;

    try {
      await api.delete(`/vehiculos/${vehiculo.id}`);
      await recargar();
      alert("Vehículo eliminado.");
    } catch (err) {
      console.error("ERROR ELIMINANDO VEHÍCULO:", err.response?.data || err.message);
      alert(err.response?.data?.error || "No se pudo eliminar el vehículo.");
    }
  };

  const totalOrdenesVehiculo = (v) => {
    if (Array.isArray(v.OrdenTrabajos)) return v.OrdenTrabajos.length;
    return 0;
  };

  const ultimaOrdenVehiculo = (v) => {
    if (!Array.isArray(v.OrdenTrabajos) || v.OrdenTrabajos.length === 0) return null;

    return [...v.OrdenTrabajos].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  };

  return (
    <div className="space-y-10">
      <div className="bg-black text-white p-8 border-b-8 border-blue-600 shadow-2xl">
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase">
          Garage GMTCH
        </h1>

        <p className="text-blue-400 font-bold text-xs uppercase tracking-[.3em] mt-2">
          Vehículos agrupados por cliente · historial real por patente
        </p>
      </div>

      <div className="bg-white border-4 border-black p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-2xl font-black uppercase mb-5">Registrar vehículo</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          <select
            className="border-2 border-black p-3 font-bold bg-white lg:col-span-2"
            value={formData.clienteId}
            onChange={(e) => actualizarForm("clienteId", e.target.value)}
            required
          >
            <option value="">Seleccionar cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.categoria_cliente === "VIP" ? "⭐ VIP" : ""}
              </option>
            ))}
          </select>

          <input
            className="border-2 border-black p-3 font-black uppercase"
            placeholder="Patente"
            value={formData.patente}
            onChange={(e) => actualizarForm("patente", e.target.value.toUpperCase())}
            required
          />

          <input
            className="border-2 border-black p-3 font-bold"
            placeholder="Marca"
            value={formData.marca}
            onChange={(e) => actualizarForm("marca", e.target.value)}
            required
          />

          <input
            className="border-2 border-black p-3 font-bold"
            placeholder="Modelo"
            value={formData.modelo}
            onChange={(e) => actualizarForm("modelo", e.target.value)}
            required
          />

          <input
            className="border-2 border-black p-3 font-bold"
            placeholder="Año"
            type="number"
            value={formData.anio}
            onChange={(e) => actualizarForm("anio", e.target.value)}
          />

          <select
            className="border-2 border-black p-3 font-bold bg-white"
            value={formData.tipo_unidad}
            onChange={(e) => actualizarForm("tipo_unidad", e.target.value)}
          >
            {TIPOS_UNIDAD.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>

          <input
            className="border-2 border-black p-3 font-bold lg:col-span-4"
            placeholder="VIN / Chasis"
            value={formData.vin}
            onChange={(e) => actualizarForm("vin", e.target.value)}
          />

          <button
            type="submit"
            disabled={cargando}
            className="bg-black text-white px-6 py-4 font-black uppercase text-xs lg:col-span-2 disabled:bg-gray-400"
          >
            {cargando ? "Guardando..." : "Guardar vehículo"}
          </button>
        </form>
      </div>

      <div className="bg-blue-600 p-6 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-white text-xl font-black uppercase mb-3">
          Buscar por patente, cliente, marca, modelo o VIN
        </h2>

        <input
          type="text"
          placeholder="Ej: ABCD12, Juan, BMW, Volvo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full p-4 border-4 border-black font-black uppercase text-xl"
        />
      </div>

      <div className="space-y-8">
        {gruposPorCliente.map((grupo) => {
          const cliente = grupo.cliente || {};
          const categoria = cliente.categoria_cliente || "NORMAL";

          return (
            <div
              key={cliente.id || "SIN_CLIENTE"}
              className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
            >
              <div className="bg-black text-white p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-blue-400">
                    Cliente
                  </p>

                  <h2 className="text-2xl font-black uppercase">
                    {cliente.nombre || "Sin cliente"}{" "}
                    {categoria === "VIP" && <span className="text-yellow-400">⭐ VIP</span>}
                  </h2>

                  <p className="text-xs font-bold uppercase text-gray-400">
                    Vehículos registrados: {grupo.vehiculos.length}
                  </p>
                </div>

                {cliente.id && (
                  <select
                    className="bg-white text-black border-2 border-blue-600 p-3 font-black uppercase text-xs"
                    value={categoria}
                    onChange={(e) => cambiarCategoriaCliente(cliente.id, e.target.value)}
                  >
                    {CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-5">
                {grupo.vehiculos.map((v) => {
                  const ultima = ultimaOrdenVehiculo(v);

                  return (
                    <div
                      key={v.id}
                      className="border-4 border-black p-5 bg-slate-50 hover:bg-yellow-50 transition"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                          <p className="text-4xl font-black uppercase font-mono">
                            {v.patente}
                          </p>

                          <p className="text-sm font-black uppercase">
                            {v.tipo_unidad || "AUTO"} · {v.marca} {v.modelo}{" "}
                            {v.anio || ""}
                          </p>

                          <p className="text-xs font-bold uppercase text-gray-500 mt-1">
                            VIN: {v.vin || "No informado"}
                          </p>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-[10px] font-black uppercase text-gray-500">
                            Visitas
                          </p>
                          <p className="text-3xl font-black">{totalOrdenesVehiculo(v)}</p>
                        </div>
                      </div>

                      <div className="bg-white border-2 border-black p-3 mt-4">
                        <p className="text-[10px] font-black uppercase text-gray-500">
                          Último estado
                        </p>
                        <p className="text-sm font-black uppercase">
                          {ultima?.estado || "Sin órdenes todavía"}
                        </p>
                      </div>

                      <div className="flex flex-col md:flex-row gap-3 mt-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/vehiculos/${v.id}`)}
                          className="bg-black text-white px-4 py-3 font-black uppercase text-xs flex-1"
                        >
                          Ver historial
                        </button>

                        {esOwner() && (
                          <button
                            type="button"
                            onClick={() => eliminarVehiculo(v)}
                            className="bg-red-600 text-white px-4 py-3 font-black uppercase text-xs"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {gruposPorCliente.length === 0 && (
          <div className="bg-white border-4 border-black p-10 text-center">
            <p className="text-xl font-black uppercase">
              Registra el primer vehículo para iniciar operación.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VehiculosPage;
