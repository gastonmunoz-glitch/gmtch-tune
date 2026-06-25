import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { portalCreateFile } from "../services/portalApi";

const servicios = [
  "Stage 1",
  "Stage 2",
  "Stage 3",
  "DPF/FAP",
  "EGR",
  "SCR/AdBlue",
  "DTC",
  "IMMO",
  "Clonación ECU",
  "Clonación TCU",
  "Otro",
];

const inputClass =
  "mt-2 w-full border border-slate-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500";

function PortalNuevoArchivoPage() {
  const navigate = useNavigate();
  const [archivo, setArchivo] = useState(null);
  const [form, setForm] = useState({
    tipo_servicio: "",
    marca_vehiculo: "",
    modelo_vehiculo: "",
    anio_vehiculo: "",
    ecu_info: "",
    observaciones_cliente: "",
  });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const actualizar = (campo, valor) => {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!archivo) {
      setError("Debes adjuntar el archivo original.");
      return;
    }

    if (!form.tipo_servicio) {
      setError("Debes seleccionar un tipo de servicio.");
      return;
    }

    const formData = new FormData();
    formData.append("archivo", archivo);
    Object.entries(form).forEach(([clave, valor]) => {
      formData.append(clave, valor || "");
    });

    try {
      setCargando(true);
      await portalCreateFile(formData);
      navigate("/portal/mis-archivos");
    } catch (err) {
      setError(err.message || "No se pudo crear la solicitud.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-slate-800 px-5 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link to="/portal" className="text-xs font-black uppercase tracking-[0.24em] text-blue-400">
            Portal File Service
          </Link>
          <Link to="/portal/mis-archivos" className="text-xs font-black uppercase text-slate-300 hover:text-blue-300">
            Mis archivos
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-10">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-400">
          Nueva solicitud
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase">
          Subir archivo original
        </h1>
        <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
          Los servicios deben solicitarse según normativa aplicable y uso autorizado.
        </p>

        {error && (
          <div className="mt-6 border border-red-500 bg-red-950/40 p-4 text-sm font-bold text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 gap-5 border border-slate-700 bg-slate-950 p-6 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="text-xs font-black uppercase text-slate-400">
              Archivo original
            </span>
            <input
              type="file"
              onChange={(event) => setArchivo(event.target.files?.[0] || null)}
              className={inputClass}
            />
          </label>

          <label>
            <span className="text-xs font-black uppercase text-slate-400">
              Tipo de servicio
            </span>
            <select
              value={form.tipo_servicio}
              onChange={(event) => actualizar("tipo_servicio", event.target.value)}
              className={inputClass}
            >
              <option value="">Seleccionar servicio</option>
              {servicios.map((servicio) => (
                <option key={servicio} value={servicio}>
                  {servicio}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-xs font-black uppercase text-slate-400">
              Marca vehículo
            </span>
            <input
              value={form.marca_vehiculo}
              onChange={(event) => actualizar("marca_vehiculo", event.target.value)}
              className={inputClass}
            />
          </label>

          <label>
            <span className="text-xs font-black uppercase text-slate-400">
              Modelo vehículo
            </span>
            <input
              value={form.modelo_vehiculo}
              onChange={(event) => actualizar("modelo_vehiculo", event.target.value)}
              className={inputClass}
            />
          </label>

          <label>
            <span className="text-xs font-black uppercase text-slate-400">
              Año vehículo
            </span>
            <input
              value={form.anio_vehiculo}
              onChange={(event) => actualizar("anio_vehiculo", event.target.value)}
              className={inputClass}
            />
          </label>

          <label className="md:col-span-2">
            <span className="text-xs font-black uppercase text-slate-400">
              ECU / HW / SW
            </span>
            <input
              value={form.ecu_info}
              onChange={(event) => actualizar("ecu_info", event.target.value)}
              className={inputClass}
              placeholder="Ej: Bosch EDC17, HW/SW si aplica"
            />
          </label>

          <label className="md:col-span-2">
            <span className="text-xs font-black uppercase text-slate-400">
              Observaciones
            </span>
            <textarea
              value={form.observaciones_cliente}
              onChange={(event) => actualizar("observaciones_cliente", event.target.value)}
              className={`${inputClass} min-h-[120px]`}
            />
          </label>

          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={cargando}
              className="bg-blue-600 px-6 py-4 text-xs font-black uppercase text-white hover:bg-white hover:text-black disabled:opacity-50"
            >
              {cargando ? "Enviando..." : "Crear solicitud"}
            </button>
            <Link
              to="/portal"
              className="border border-slate-600 px-6 py-4 text-center text-xs font-black uppercase text-slate-200 hover:border-blue-500"
            >
              Volver al portal
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default PortalNuevoArchivoPage;

