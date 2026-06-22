import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

const prioridadClase = (prioridad) => {
  const p = String(prioridad || "MEDIA").toUpperCase();

  if (p === "URGENTE") return "bg-red-600 text-white";
  if (p === "ALTA") return "bg-orange-500 text-black";
  if (p === "MEDIA") return "bg-blue-600 text-white";
  return "bg-gray-300 text-black";
};

const estadoClase = (estado) => {
  const e = String(estado || "").toUpperCase();

  if (e === "ENTREGADO") return "bg-black text-white";
  if (e === "LISTO_PARA_ENTREGA") return "bg-green-600 text-white";
  if (e === "EN_MECANICA" || e === "PARA_MECANICA") return "bg-orange-500 text-black";
  if (e === "EN_PROGRAMACION") return "bg-purple-600 text-white";
  if (e === "PARA_DIAGNOSTICO") return "bg-blue-600 text-white";
  return "bg-gray-300 text-black";
};

function VehiculoDetallePage() {
  const { id } = useParams();

  const [vehiculo, setVehiculo] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      try {
        const res = await api.get(`/vehiculos/${id}`);

        if (!activo) return;

        setVehiculo(res.data);
      } catch (err) {
        console.error("ERROR HISTORIAL VEHÍCULO:", err.response?.data || err.message);
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargar();

    return () => {
      activo = false;
    };
  }, [id]);

  const ordenes = useMemo(() => {
    if (!vehiculo?.OrdenTrabajos) return [];

    return [...vehiculo.OrdenTrabajos].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [vehiculo]);

  if (cargando) {
    return (
      <div className="bg-white border-4 border-black p-10">
        <p className="text-xl font-black uppercase">Cargando historial...</p>
      </div>
    );
  }

  if (!vehiculo) {
    return (
      <div className="bg-white border-4 border-black p-10">
        <p className="text-xl font-black uppercase">Vehículo no encontrado</p>
        <Link to="/vehiculos" className="underline font-black">
          Volver al garage
        </Link>
      </div>
    );
  }

  const cliente = vehiculo.Cliente || vehiculo.cliente || {};
  const categoria = cliente.categoria_cliente || "NORMAL";

  return (
    <div className="space-y-8">
      <div className="bg-black text-white p-8 border-b-8 border-blue-600 shadow-2xl">
        <Link to="/vehiculos" className="text-xs font-black uppercase text-blue-400">
          ← Volver al garage
        </Link>

        <h1 className="text-5xl font-black uppercase font-mono mt-4">
          {vehiculo.patente}
        </h1>

        <p className="text-xl font-black uppercase">
          {vehiculo.tipo_unidad || "AUTO"} · {vehiculo.marca} {vehiculo.modelo}{" "}
          {vehiculo.anio || ""}
        </p>

        <p className="text-xs font-bold uppercase text-gray-400 mt-2">
          Cliente: {cliente.nombre || "No informado"} · Categoría: {categoria}{" "}
          {categoria === "VIP" ? "⭐" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Stat label="Total visitas" value={ordenes.length} />
        <Stat label="VIN" value={vehiculo.vin || "—"} />
        <Stat label="Cliente" value={cliente.nombre || "—"} />
        <Stat label="Categoría" value={categoria} />
      </div>

      <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <div className="bg-slate-100 border-b-4 border-black p-5">
          <h2 className="text-2xl font-black uppercase">
            Historial real del vehículo
          </h2>
          <p className="text-xs font-bold uppercase text-gray-500">
            Solo trabajos asociados a esta patente / vehículo.
          </p>
        </div>

        <div className="divide-y-4 divide-black">
          {ordenes.map((orden) => (
            <div key={orden.id} className="p-6">
              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                <div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="bg-black text-white px-3 py-1 text-[10px] font-black uppercase">
                      Orden #{orden.id}
                    </span>

                    <span
                      className={`px-3 py-1 text-[10px] font-black uppercase ${prioridadClase(
                        orden.prioridad
                      )}`}
                    >
                      {orden.prioridad || "MEDIA"}
                    </span>

                    <span
                      className={`px-3 py-1 text-[10px] font-black uppercase ${estadoClase(
                        orden.estado
                      )}`}
                    >
                      {orden.estado}
                    </span>

                    <span
                      className={`px-3 py-1 text-[10px] font-black uppercase ${
                        orden.estado_pago === "PAGADO"
                          ? "bg-green-600 text-white"
                          : "bg-yellow-400 text-black"
                      }`}
                    >
                      Pago: {orden.estado_pago || "PENDIENTE"}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black uppercase leading-tight">
                    {orden.motivo_ingreso || "Sin detalle"}
                  </h3>

                  <p className="text-xs font-bold uppercase text-gray-500 mt-2">
                    Fecha: {new Date(orden.createdAt).toLocaleString("es-CL")} · KM:{" "}
                    {orden.kilometraje || "—"}
                  </p>
                </div>

                <div className="text-left xl:text-right">
                  <p className="text-[10px] font-black uppercase text-gray-500">
                    Monto
                  </p>
                  <p className="text-2xl font-black">
                    ${Number(orden.monto_total || 0).toLocaleString("es-CL")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
                <MiniBox
                  title="Diagnóstico"
                  value={
                    orden.Diagnostico?.observaciones ||
                    orden.Diagnostico?.resultado ||
                    "Sin diagnóstico asociado"
                  }
                />

                <MiniBox
                  title="Archivos ECU"
                  value={
                    Array.isArray(orden.ArchivoECUs)
                      ? `${orden.ArchivoECUs.length} archivo(s)`
                      : "0 archivo(s)"
                  }
                />

                <MiniBox
                  title="Fotos"
                  value={
                    Array.isArray(orden.FotoVehiculos)
                      ? `${orden.FotoVehiculos.length} foto(s)`
                      : "0 foto(s)"
                  }
                />
              </div>
            </div>
          ))}

          {ordenes.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-xl font-black uppercase">
                Este vehículo aún no tiene historial
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="bg-white border-4 border-black p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
    <p className="text-[10px] font-black uppercase text-gray-500">{label}</p>
    <p className="text-xl font-black uppercase mt-2">{value}</p>
  </div>
);

const MiniBox = ({ title, value }) => (
  <div className="border-2 border-black p-4 bg-slate-50">
    <p className="text-[10px] font-black uppercase text-gray-500">{title}</p>
    <p className="text-sm font-bold uppercase whitespace-pre-wrap mt-2">{value}</p>
  </div>
);

export default VehiculoDetallePage;