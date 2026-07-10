import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  portalCrearMensaje,
  portalGetMensaje,
  portalListMensajes,
  portalResponderMensaje,
} from "../services/portalApi";

const estados = {
  NUEVA: "Nueva",
  EN_ATENCION: "En atención",
  ESPERANDO_CLIENTE: "Esperando respuesta",
  CERRADA: "Cerrada",
};

const prioridades = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

const prioridadClass = {
  URGENTE: "border-red-500 bg-red-950/40 text-red-200",
  ALTA: "border-orange-500 bg-orange-950/40 text-orange-200",
  MEDIA: "border-blue-500 bg-blue-950/40 text-blue-200",
  BAJA: "border-slate-500 bg-slate-900 text-slate-200",
};

const formatearFecha = (valor) => {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";
  return fecha.toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

function PortalMensajesPage() {
  const [searchParams] = useSearchParams();
  const [conversaciones, setConversaciones] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [nuevo, setNuevo] = useState({
    asunto: "",
    prioridad: "MEDIA",
    texto: "",
  });
  const [respuesta, setRespuesta] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    try {
      setError("");
      setCargando(true);
      const data = await portalListMensajes();
      setConversaciones(Array.isArray(data?.conversaciones) ? data.conversaciones : []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los mensajes.");
    } finally {
      setCargando(false);
    }
  };

  const abrir = async (id) => {
    try {
      setError("");
      setMensaje("");
      const data = await portalGetMensaje(id);
      setDetalle(data?.conversacion || null);
      await cargar();
    } catch (err) {
      setError(err.message || "No se pudo abrir la conversación.");
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    const id = searchParams.get("conversacionId");
    if (id) abrir(id);
  }, [searchParams]);

  const crearConsulta = async (event) => {
    event.preventDefault();

    if (!nuevo.texto.trim()) {
      setError("Debes escribir un mensaje para GMTCH.");
      return;
    }

    try {
      setError("");
      setMensaje("");
      const data = await portalCrearMensaje({
        asunto: nuevo.asunto || "Soporte Portal Master",
        prioridad: nuevo.prioridad,
        texto: nuevo.texto,
      });
      setNuevo({ asunto: "", prioridad: "MEDIA", texto: "" });
      setMensaje("Mensaje enviado a GMTCH.");
      await cargar();
      if (data?.conversacion?.id) {
        setDetalle(data.conversacion);
      }
    } catch (err) {
      setError(err.message || "No se pudo enviar el mensaje.");
    }
  };

  const responder = async () => {
    if (!detalle?.id || !respuesta.trim()) {
      setError("Escribe una respuesta antes de enviar.");
      return;
    }

    try {
      setError("");
      setMensaje("");
      const data = await portalResponderMensaje(detalle.id, respuesta.trim());
      setRespuesta("");
      setMensaje("Respuesta enviada a GMTCH.");
      await cargar();
      setDetalle(data?.conversacion || detalle);
    } catch (err) {
      setError(err.message || "No se pudo responder.");
    }
  };

  const mensajes = Array.isArray(detalle?.mensajes) ? detalle.mensajes : [];

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-slate-800 px-5 py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link to="/portal" className="flex items-center gap-3">
            <img
              src="/brand/gmtch-logo.png"
              alt="GMTCH Tune"
              className="h-10 w-auto max-w-[180px] object-contain"
            />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
              Soporte Portal Master
            </span>
          </Link>
          <nav className="flex flex-wrap gap-2">
            <Link className="border border-slate-700 px-4 py-2 text-xs font-black uppercase text-slate-200 hover:border-blue-500" to="/portal">
              Dashboard
            </Link>
            <Link className="border border-slate-700 px-4 py-2 text-xs font-black uppercase text-slate-200 hover:border-blue-500" to="/portal/mis-archivos">
              Mis archivos
            </Link>
            <Link className="border border-slate-700 px-4 py-2 text-xs font-black uppercase text-slate-200 hover:border-blue-500" to="/portal/nuevo-archivo">
              Nuevo archivo
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-400">
              Centro de soporte
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase md:text-5xl">
              Mensajes GMTCH
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
              Usa esta bandeja para consultas técnicas, soporte y seguimiento de
              archivos. Todo queda trazado en el portal.
            </p>
          </div>
          <button
            type="button"
            onClick={cargar}
            disabled={cargando}
            className="border border-slate-600 px-5 py-3 text-xs font-black uppercase hover:border-blue-500 disabled:opacity-50"
          >
            {cargando ? "Cargando..." : "Actualizar"}
          </button>
        </div>

        {error && (
          <div className="mt-6 border border-red-500 bg-red-950/40 p-4 text-sm font-bold text-red-200">
            {error}
          </div>
        )}
        {mensaje && (
          <div className="mt-6 border border-green-500 bg-green-950/40 p-4 text-sm font-bold text-green-200">
            {mensaje}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <aside className="space-y-5">
            <form onSubmit={crearConsulta} className="border border-blue-500 bg-slate-950 p-5">
              <h2 className="text-sm font-black uppercase text-white">
                Nueva consulta
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <input
                  value={nuevo.asunto}
                  onChange={(event) => setNuevo((actual) => ({ ...actual, asunto: event.target.value }))}
                  placeholder="Asunto"
                  className="border border-slate-700 bg-black px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
                />
                <select
                  value={nuevo.prioridad}
                  onChange={(event) => setNuevo((actual) => ({ ...actual, prioridad: event.target.value }))}
                  className="border border-slate-700 bg-black px-3 py-2 text-xs font-black uppercase text-white outline-none focus:border-blue-500"
                >
                  {prioridades.map((prioridad) => (
                    <option key={prioridad} value={prioridad}>
                      {prioridad}
                    </option>
                  ))}
                </select>
                <textarea
                  value={nuevo.texto}
                  onChange={(event) => setNuevo((actual) => ({ ...actual, texto: event.target.value }))}
                  placeholder="Describe tu consulta o problema técnico"
                  className="min-h-[120px] border border-slate-700 bg-black px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                className="mt-3 bg-blue-600 px-4 py-2 text-xs font-black uppercase text-white hover:bg-white hover:text-black"
              >
                Enviar a GMTCH
              </button>
            </form>

            <div className="space-y-3">
              {conversaciones.map((conversacion) => (
                <button
                  type="button"
                  key={conversacion.id}
                  onClick={() => abrir(conversacion.id)}
                  className={`w-full border bg-slate-950 p-4 text-left hover:border-blue-500 ${
                    detalle?.id === conversacion.id ? "border-blue-500" : "border-slate-700"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`border px-2 py-1 text-[10px] font-black uppercase ${prioridadClass[conversacion.prioridad] || prioridadClass.MEDIA}`}>
                      {conversacion.prioridad || "MEDIA"}
                    </span>
                    <span className="border border-slate-600 px-2 py-1 text-[10px] font-black uppercase text-slate-300">
                      {estados[conversacion.estado] || conversacion.estado}
                    </span>
                    {conversacion.no_leidos_portal > 0 && (
                      <span className="bg-red-600 px-2 py-1 text-[10px] font-black uppercase text-white">
                        {conversacion.no_leidos_portal} nuevo
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-black uppercase text-white">
                    {conversacion.asunto || "Soporte Portal Master"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {formatearFecha(conversacion.ultimo_mensaje_at || conversacion.updatedAt)}
                  </p>
                  {conversacion.ultimo_mensaje?.texto && (
                    <p className="mt-2 max-h-10 overflow-hidden text-xs font-semibold text-slate-400">
                      {conversacion.ultimo_mensaje.texto}
                    </p>
                  )}
                </button>
              ))}

              {!conversaciones.length && !cargando && (
                <div className="border border-slate-700 bg-slate-950 p-5 text-sm font-bold text-slate-400">
                  Aún no tienes mensajes de soporte.
                </div>
              )}
            </div>
          </aside>

          <article className="min-h-[540px] border border-slate-700 bg-slate-950 p-5">
            {!detalle ? (
              <div className="flex h-full min-h-[420px] items-center justify-center text-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                    Selecciona una conversación
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-400">
                    Verás la respuesta de GMTCH y podrás continuar el hilo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">
                    {estados[detalle.estado] || detalle.estado}
                  </p>
                  <h2 className="mt-2 text-2xl font-black uppercase text-white">
                    {detalle.asunto || "Soporte Portal Master"}
                  </h2>
                  <p className="mt-2 text-xs font-bold text-slate-400">
                    Último movimiento: {formatearFecha(detalle.ultimo_mensaje_at || detalle.updatedAt)}
                  </p>
                </div>

                <div className="max-h-[440px] space-y-3 overflow-y-auto border border-slate-800 bg-black p-4">
                  {mensajes.map((item) => {
                    const externo = item.direccion === "ENTRANTE";
                    return (
                      <div
                        key={item.id}
                        className={`max-w-[92%] border p-3 text-sm font-semibold ${
                          externo
                            ? "ml-auto border-blue-500 bg-blue-600 text-white"
                            : "mr-auto border-slate-700 bg-slate-900 text-slate-100"
                        }`}
                      >
                        <p className="text-[10px] font-black uppercase opacity-80">
                          {externo ? "Tú" : "GMTCH"} / {formatearFecha(item.createdAt)}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap leading-6">{item.texto}</p>
                      </div>
                    );
                  })}
                </div>

                {detalle.estado === "CERRADA" ? (
                  <div className="border border-slate-700 bg-black p-4 text-sm font-bold text-slate-300">
                    Esta conversación está cerrada. Si necesitas continuar, crea una nueva consulta.
                  </div>
                ) : (
                  <div>
                    <textarea
                      value={respuesta}
                      onChange={(event) => setRespuesta(event.target.value)}
                      placeholder="Responder a GMTCH"
                      className="min-h-[120px] w-full border border-slate-700 bg-black p-3 text-sm font-bold text-white outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={responder}
                      className="mt-3 bg-blue-600 px-5 py-3 text-xs font-black uppercase text-white hover:bg-white hover:text-black"
                    >
                      Enviar respuesta
                    </button>
                  </div>
                )}
              </div>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}

export default PortalMensajesPage;
