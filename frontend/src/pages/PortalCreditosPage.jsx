import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  portalComprarCreditos,
  portalGetCreditos,
  portalGetPaquetesCreditos,
  portalListComprasCreditos,
} from "../services/portalApi";

const formatearFecha = (valor) => {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  return fecha.toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const formatoCLP = (valor) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(valor || 0));

function PortalCreditosPage() {
  const [saldo, setSaldo] = useState(0);
  const [movimientos, setMovimientos] = useState([]);
  const [paquetes, setPaquetes] = useState([]);
  const [compras, setCompras] = useState([]);
  const [comprando, setComprando] = useState("");
  const [estadoCompra, setEstadoCompra] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    try {
      setError("");
      setCargando(true);
      const [creditosData, paquetesData, comprasData] = await Promise.all([
        portalGetCreditos(),
        portalGetPaquetesCreditos(),
        portalListComprasCreditos(),
      ]);

      setSaldo(Number(creditosData?.saldo_creditos || 0));
      setMovimientos(
        Array.isArray(creditosData?.movimientos) ? creditosData.movimientos : []
      );
      setPaquetes(
        Array.isArray(paquetesData)
          ? paquetesData
          : Array.isArray(creditosData?.paquetes)
            ? creditosData.paquetes
            : []
      );
      setCompras(
        Array.isArray(comprasData?.compras)
          ? comprasData.compras
          : Array.isArray(creditosData?.compras)
            ? creditosData.compras
            : []
      );
    } catch (err) {
      setError(err.message || "No se pudieron cargar los créditos.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("compra")) {
      setEstadoCompra(
        "Retorno recibido desde Flow. Los créditos se cargan automáticamente cuando Flow confirma el pago."
      );
    }
    cargar();
  }, []);

  const comprar = async (paqueteId) => {
    try {
      setError("");
      setEstadoCompra("");
      setComprando(paqueteId);

      const data = await portalComprarCreditos(paqueteId);
      const urlPago =
        data?.url_pago ||
        (data?.url && data?.token
          ? `${data.url}${data.url.includes("?") ? "&" : "?"}token=${encodeURIComponent(data.token)}`
          : data?.url);

      if (!urlPago) {
        setError("Flow no devolvió URL de pago. Contacta a GMTCH.");
        return;
      }

      window.location.href = urlPago;
    } catch (err) {
      setError(err.message || "No se pudo iniciar la compra de créditos.");
    } finally {
      setComprando("");
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

      <section className="mx-auto max-w-6xl px-5 py-10">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-400">
          Cuenta y consumo
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase">Créditos</h1>

        {error && (
          <div className="mt-6 border border-red-500 bg-red-950/40 p-4 text-sm font-bold text-red-200">
            {error}
          </div>
        )}

        {estadoCompra && (
          <div className="mt-6 border border-blue-500 bg-blue-950/40 p-4 text-sm font-bold text-blue-100">
            {estadoCompra}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <aside className="border border-blue-500 bg-blue-950/20 p-6">
            <p className="text-xs font-black uppercase text-blue-300">
              Saldo actual
            </p>
            <p className="mt-3 text-6xl font-black">{saldo}</p>
            <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
              Los créditos se consumen al descargar un MOD disponible. Los créditos se cargan automáticamente cuando Flow confirma el pago.
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
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-blue-300">
              Comprar créditos
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {paquetes.map((paquete) => (
                <div key={paquete.id} className="border border-slate-700 bg-black p-4">
                  <p className="text-xs font-black uppercase text-blue-300">
                    {paquete.nombre}
                  </p>
                  <p className="mt-2 text-4xl font-black">{paquete.creditos}</p>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    créditos
                  </p>
                  <p className="mt-3 text-lg font-black text-white">
                    {formatoCLP(paquete.precio_clp)}
                  </p>
                  <p className="mt-2 min-h-10 text-xs font-semibold leading-5 text-slate-400">
                    {paquete.descripcion}
                  </p>
                  <button
                    type="button"
                    onClick={() => comprar(paquete.id)}
                    disabled={Boolean(comprando)}
                    className="mt-4 w-full bg-blue-600 px-4 py-3 text-xs font-black uppercase text-white hover:bg-white hover:text-black disabled:opacity-50"
                  >
                    {comprando === paquete.id ? "Creando pago..." : "Comprar"}
                  </button>
                </div>
              ))}

              {!paquetes.length && !cargando && (
                <p className="text-sm font-bold text-slate-500">
                  No hay paquetes disponibles.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="border border-slate-700 bg-slate-950 p-6">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">
              Compras recientes
            </h2>

            <div className="mt-5 space-y-3">
              {compras.map((compra) => (
                <div
                  key={compra.id}
                  className="grid grid-cols-1 gap-2 border border-slate-800 bg-black p-4 text-sm font-bold text-slate-300 md:grid-cols-4"
                >
                  <p>{formatearFecha(compra.createdAt)}</p>
                  <p>{compra.estado || "PENDIENTE"}</p>
                  <p>{compra.creditos} créditos</p>
                  <p>{formatoCLP(compra.monto_clp)}</p>
                </div>
              ))}

              {!compras.length && !cargando && (
                <p className="text-sm font-bold text-slate-500">
                  Sin compras registradas.
                </p>
              )}
            </div>
          </section>

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
                    <p className="text-slate-400 md:col-span-4">
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
