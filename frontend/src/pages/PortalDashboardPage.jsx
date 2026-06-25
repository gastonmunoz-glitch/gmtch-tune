import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { portalGetCreditos, portalListFiles, portalMe } from "../services/portalApi";

const estadosActivos = [
  "RECIBIDO",
  "EN_REVISION",
  "EN_PROCESO",
  "CORRECCION_SOLICITADA",
  "REQUIERE_NUEVA_LECTURA",
];

const numero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const cerrarPortal = (navigate) => {
  localStorage.removeItem("portalToken");
  localStorage.removeItem("portalUsuario");
  localStorage.removeItem("portalCuenta");
  navigate("/portal/login");
};

const PortalHeader = ({ cuenta, onCerrar }) => (
  <header className="border-b border-slate-800 bg-black">
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
      <Link to="/portal" className="flex items-center gap-3">
        <img
          src="/brand/gmtch-logo.png"
          alt="GMTCH Tune"
          className="h-10 w-auto max-w-[180px] object-contain"
        />
        <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
          Portal File Service
        </span>
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold uppercase text-slate-400">
          {cuenta?.nombre_taller || "Cuenta portal"}
        </span>
        <Link className="border border-slate-700 px-4 py-2 text-xs font-black uppercase text-slate-200 hover:border-blue-500 hover:text-blue-300" to="/portal/nuevo-archivo">
          Nuevo archivo
        </Link>
        <Link className="border border-slate-700 px-4 py-2 text-xs font-black uppercase text-slate-200 hover:border-blue-500 hover:text-blue-300" to="/portal/mis-archivos">
          Mis archivos
        </Link>
        <Link className="border border-slate-700 px-4 py-2 text-xs font-black uppercase text-slate-200 hover:border-blue-500 hover:text-blue-300" to="/portal/creditos">
          Créditos
        </Link>
        <button
          type="button"
          onClick={onCerrar}
          className="border border-red-500 px-4 py-2 text-xs font-black uppercase text-red-200 hover:bg-red-600 hover:text-white"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  </header>
);

const StatPortal = ({ label, value, color = "border-blue-500" }) => (
  <div className={`border ${color} bg-slate-950 p-5`}>
    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
      {label}
    </p>
    <p className="mt-2 text-3xl font-black text-white">{value}</p>
  </div>
);

function PortalDashboardPage() {
  const navigate = useNavigate();
  const [cuenta, setCuenta] = useState(null);
  const [archivos, setArchivos] = useState([]);
  const [saldo, setSaldo] = useState(0);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    try {
      setError("");
      setCargando(true);
      const [me, creditos, files] = await Promise.all([
        portalMe(),
        portalGetCreditos(),
        portalListFiles(),
      ]);

      setCuenta(me.cuenta || null);
      setSaldo(numero(creditos?.saldo_creditos));
      setArchivos(Array.isArray(files) ? files : []);
      localStorage.setItem("portalCuenta", JSON.stringify(me.cuenta || {}));
      localStorage.setItem("portalUsuario", JSON.stringify(me.usuario || {}));
    } catch (err) {
      setError(err.message || "No se pudo cargar el portal.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const stats = useMemo(() => {
    const activos = archivos.filter((archivo) =>
      estadosActivos.includes(String(archivo.estado || "").toUpperCase())
    ).length;
    const modListos = archivos.filter((archivo) => archivo.mod_listo).length;
    const correcciones = archivos.filter(
      (archivo) =>
        archivo.correccion_solicitada ||
        String(archivo.estado || "").toUpperCase() === "CORRECCION_SOLICITADA"
    ).length;
    const nuevasLecturas = archivos.filter(
      (archivo) =>
        archivo.requiere_nueva_lectura ||
        String(archivo.estado || "").toUpperCase() === "REQUIERE_NUEVA_LECTURA"
    ).length;

    return { activos, modListos, correcciones, nuevasLecturas };
  }, [archivos]);

  return (
    <main className="min-h-screen bg-black text-white">
      <PortalHeader cuenta={cuenta} onCerrar={() => cerrarPortal(navigate)} />

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-400">
              Dashboard externo
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase md:text-5xl">
              Portal File Service
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
              WhatsApp puede ser canal de entrada, pero el portal es la fuente oficial del File Service.
            </p>
          </div>

          <button
            type="button"
            onClick={cargar}
            disabled={cargando}
            className="bg-blue-600 px-5 py-3 text-xs font-black uppercase text-white hover:bg-white hover:text-black disabled:opacity-50"
          >
            {cargando ? "Actualizando..." : "Actualizar portal"}
          </button>
        </div>

        {error && (
          <div className="mt-6 border border-red-500 bg-red-950/40 p-4 text-sm font-bold text-red-200">
            {error}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatPortal label="Saldo de créditos" value={saldo} color="border-blue-500" />
          <StatPortal label="Archivos activos" value={stats.activos} color="border-yellow-500" />
          <StatPortal label="MOD listos" value={stats.modListos} color="border-green-500" />
          <StatPortal label="Correcciones pendientes" value={stats.correcciones} color="border-red-500" />
          <StatPortal label="Nueva lectura requerida" value={stats.nuevasLecturas} color="border-yellow-500" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link className="border border-slate-700 bg-slate-950 p-6 hover:border-blue-500 hover:bg-blue-950/30" to="/portal/nuevo-archivo">
            <span>Nuevo archivo</span>
            <small>Subir original y solicitar servicio.</small>
          </Link>
          <Link className="border border-slate-700 bg-slate-950 p-6 hover:border-blue-500 hover:bg-blue-950/30" to="/portal/mis-archivos">
            <span>Mis archivos</span>
            <small>Ver estados, MODs y correcciones.</small>
          </Link>
          <Link className="border border-slate-700 bg-slate-950 p-6 hover:border-blue-500 hover:bg-blue-950/30" to="/portal/creditos">
            <span>Créditos</span>
            <small>Revisar saldo y movimientos.</small>
          </Link>
        </div>
      </section>
    </main>
  );
}

export default PortalDashboardPage;
