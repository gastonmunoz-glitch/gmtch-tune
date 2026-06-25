import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { portalGetCreditos } from "../services/portalApi";

const formatearFecha = (valor) => {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  return fecha.toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

function PortalCreditosPage() {
  const [saldo, setSaldo] = useState(0);
  const [movimientos, setMovimientos] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    try {
      setError("");
      setCargando(true);
      const data = await portalGetCreditos();
      setSaldo(Number(data?.saldo_creditos || 0));
      setMovimientos(Array.isArray(data?.movimientos) ? data.movimientos : []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los créditos.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

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
          Cuenta y consumo
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase">Créditos</h1>

        {error && (
          <div className="mt-6 border border-red-500 bg-red-950/40 p-4 text-sm font-bold text-red-200">
            {error}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <aside className="border border-blue-500 bg-blue-950/20 p-6">
            <p className="text-xs font-black uppercase text-blue-300">
              Saldo actual
            </p>
            <p className="mt-3 text-6xl font-black">{saldo}</p>
            <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
              Los créditos se consumen al descargar un MOD disponible. Para cargar créditos, contacta a GMTCH.
            </p>
            <button
              type="button"
              onClick={cargar}
              disabled={cargando}
              className="mt-6 border border-slate-600 px-5 py-3 text-xs font-black uppercase hover:border-blue-500 disabled:opacity-50"
            >
              {cargando ? "Actualizando..." : "Actualizar créditos"}
            </button>
          </aside>

          <section className="border border-slate-700 bg-slate-950 p-6">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">
              Historial de movimientos
            </h2>

            <div className="mt-5 space-y-3">
              {movimientos.map((movimiento) => (
                <div
                  key={movimiento.id}
                  className="grid grid-cols-1 gap-2 border border-slate-800 bg-black p-4 text-sm font-bold text-slate-300 md:grid-cols-4"
                >
                  <p>{formatearFecha(movimiento.createdAt)}</p>
                  <p>{movimiento.tipo || "Movimiento"}</p>
                  <p>Monto: {movimiento.monto}</p>
                  <p>Saldo: {movimiento.saldo_nuevo}</p>
                  {movimiento.observacion && (
                    <p className="md:col-span-4 text-slate-400">
                      {movimiento.observacion}
                    </p>
                  )}
                </div>
              ))}

              {!movimientos.length && !cargando && (
                <p className="text-sm font-bold text-slate-500">
                  Sin movimientos registrados.
                </p>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default PortalCreditosPage;

