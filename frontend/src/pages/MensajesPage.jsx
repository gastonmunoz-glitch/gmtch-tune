import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, {
  asignarConversacion,
  cambiarEstadoConversacion,
  cerrarConversacion,
  getConversacion,
  getConversaciones,
  responderConversacion,
} from "../services/api";

const estados = ["NUEVA", "EN_ATENCION", "ESPERANDO_CLIENTE", "CERRADA"];

const estadoLabel = {
  NUEVA: "Nueva",
  EN_ATENCION: "En atención",
  ESPERANDO_CLIENTE: "Esperando cliente",
  CERRADA: "Cerrada",
};

const prioridadClass = {
  URGENTE: "border-red-500 bg-red-50 text-red-700",
  ALTA: "border-orange-500 bg-orange-50 text-orange-700",
  MEDIA: "border-blue-500 bg-blue-50 text-blue-700",
  BAJA: "border-slate-400 bg-slate-100 text-slate-700",
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

const obtenerUsuarioLocal = () => ({
  id: localStorage.getItem("userId"),
  rol: localStorage.getItem("rol"),
  username: localStorage.getItem("username"),
  nombre: localStorage.getItem("nombre"),
});

const nombreResponsable = (usuario) =>
  [usuario?.nombre, usuario?.username, usuario?.rol].filter(Boolean).join(" / ");

const nombreConversacion = (conversacion) =>
  conversacion?.nombre_contacto ||
  conversacion?.PortalUsuario?.nombre ||
  conversacion?.Cuenta?.nombre_taller ||
  conversacion?.email ||
  "Contacto portal";

function MensajesPage() {
  const [searchParams] = useSearchParams();
  const [conversaciones, setConversaciones] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [responsables, setResponsables] = useState([]);
  const [filtros, setFiltros] = useState({
    estado: "",
    search: "",
  });
  const [respuesta, setRespuesta] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const usuario = useMemo(obtenerUsuarioLocal, []);
  const puedeAsignar = ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"].includes(
    usuario.rol
  );

  const cargarConversaciones = async (params = filtros) => {
    try {
      setError("");
      setCargando(true);
      const data = await getConversaciones({
        estado: params.estado || undefined,
        search: params.search || undefined,
      });
      setConversaciones(Array.isArray(data?.conversaciones) ? data.conversaciones : []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "No se pudo cargar la bandeja.");
    } finally {
      setCargando(false);
    }
  };

  const cargarResponsables = async () => {
    try {
      const res = await api.get("/usuarios/responsables");
      const data = Array.isArray(res.data) ? res.data : res.data?.usuarios;
      setResponsables(Array.isArray(data) ? data : []);
    } catch {
      setResponsables([]);
    }
  };

  const abrirConversacion = async (id) => {
    try {
      setError("");
      setMensaje("");
      const data = await getConversacion(id);
      setDetalle(data?.conversacion || null);
      await cargarConversaciones();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "No se pudo abrir la conversación.");
    }
  };

  useEffect(() => {
    cargarConversaciones();
    cargarResponsables();
  }, []);

  useEffect(() => {
    const id = searchParams.get("conversacionId");
    if (id) abrirConversacion(id);
  }, [searchParams]);

  const aplicarFiltros = (event) => {
    event.preventDefault();
    cargarConversaciones(filtros);
  };

  const enviarRespuesta = async () => {
    const texto = respuesta.trim();

    if (!detalle?.id || !texto) {
      setError("Escribe una respuesta antes de enviar.");
      return;
    }

    try {
      setError("");
      setMensaje("");
      await responderConversacion(detalle.id, texto);
      setRespuesta("");
      setMensaje("Respuesta enviada al portal del Master.");
      await abrirConversacion(detalle.id);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "No se pudo responder.");
    }
  };

  const asignar = async (asignadoAId) => {
    if (!detalle?.id) return;

    try {
      setError("");
      setMensaje("");
      await asignarConversacion(detalle.id, asignadoAId);
      setMensaje("Conversación asignada.");
      await abrirConversacion(detalle.id);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "No se pudo asignar.");
    }
  };

  const cambiarEstado = async (estado) => {
    if (!detalle?.id) return;

    try {
      setError("");
      setMensaje("");
      await cambiarEstadoConversacion(detalle.id, estado);
      setMensaje("Estado actualizado.");
      await abrirConversacion(detalle.id);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "No se pudo actualizar estado.");
    }
  };

  const cerrar = async () => {
    if (!detalle?.id) return;

    try {
      setError("");
      setMensaje("");
      await cerrarConversacion(detalle.id);
      setMensaje("Conversación cerrada.");
      await abrirConversacion(detalle.id);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "No se pudo cerrar.");
    }
  };

  const mensajes = Array.isArray(detalle?.mensajes) ? detalle.mensajes : [];

  return (
    <main className="space-y-6">
      <section className="border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              Centro de atención
            </p>
            <h1 className="mt-2 text-4xl font-black uppercase text-black">
              Bandeja de mensajes
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-bold text-gray-600">
              Soporte interno para consultas del Portal Master. WhatsApp puede avisar,
              pero la trazabilidad debe quedar en GMTCH Tune OS.
            </p>
          </div>

          <button
            type="button"
            onClick={() => cargarConversaciones()}
            disabled={cargando}
            className="border-2 border-black bg-black px-5 py-3 text-xs font-black uppercase text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {cargando ? "Actualizando..." : "Actualizar bandeja"}
          </button>
        </div>

        <form onSubmit={aplicarFiltros} className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr_160px]">
          <select
            value={filtros.estado}
            onChange={(event) => setFiltros((actual) => ({ ...actual, estado: event.target.value }))}
            className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase"
          >
            <option value="">Todos</option>
            {estados.map((estado) => (
              <option key={estado} value={estado}>
                {estadoLabel[estado] || estado}
              </option>
            ))}
          </select>
          <input
            value={filtros.search}
            onChange={(event) => setFiltros((actual) => ({ ...actual, search: event.target.value }))}
            placeholder="Buscar por asunto, email, contacto o teléfono"
            className="border-2 border-black bg-white px-3 py-2 text-xs font-bold"
          />
          <button
            type="submit"
            className="bg-blue-600 px-4 py-2 text-xs font-black uppercase text-white hover:bg-black"
          >
            Filtrar
          </button>
        </form>
      </section>

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

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-3">
          {conversaciones.map((conversacion) => (
            <button
              type="button"
              key={conversacion.id}
              onClick={() => abrirConversacion(conversacion.id)}
              className={`w-full border-2 bg-white p-4 text-left shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:border-blue-600 ${
                detalle?.id === conversacion.id ? "border-blue-600" : "border-black"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`border px-2 py-1 text-[10px] font-black uppercase ${prioridadClass[conversacion.prioridad] || prioridadClass.MEDIA}`}>
                  {conversacion.prioridad || "MEDIA"}
                </span>
                <span className="border border-black px-2 py-1 text-[10px] font-black uppercase">
                  {estadoLabel[conversacion.estado] || conversacion.estado}
                </span>
                {conversacion.no_leidos_internos > 0 && (
                  <span className="bg-red-600 px-2 py-1 text-[10px] font-black uppercase text-white">
                    {conversacion.no_leidos_internos} sin leer
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm font-black uppercase text-black">
                {conversacion.asunto || "Soporte Portal Master"}
              </p>
              <p className="mt-1 text-xs font-bold text-gray-600">
                {nombreConversacion(conversacion)}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase text-gray-500">
                {conversacion.Cuenta?.nombre_taller || "Cuenta portal"} /{" "}
                {formatearFecha(conversacion.ultimo_mensaje_at || conversacion.updatedAt)}
              </p>
              {conversacion.ultimo_mensaje?.texto && (
                <p className="mt-2 max-h-10 overflow-hidden text-xs font-semibold text-gray-600">
                  {conversacion.ultimo_mensaje.texto}
                </p>
              )}
            </button>
          ))}

          {!conversaciones.length && !cargando && (
            <div className="border-2 border-black bg-white p-5 text-sm font-bold text-gray-500">
              Sin mensajes pendientes.
            </div>
          )}
        </div>

        <article className="min-h-[520px] border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          {!detalle ? (
            <div className="flex h-full min-h-[420px] items-center justify-center text-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  Selecciona una conversación
                </p>
                <p className="mt-2 text-sm font-bold text-gray-600">
                  Aquí verás mensajes, responsable, estado y respuesta al Master.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-blue-700">
                    {detalle.Cuenta?.nombre_taller || "Cuenta portal"}
                  </p>
                  <h2 className="mt-1 text-2xl font-black uppercase text-black">
                    {detalle.asunto || "Soporte Portal Master"}
                  </h2>
                  <p className="mt-1 text-xs font-bold text-gray-600">
                    {nombreConversacion(detalle)} / {detalle.email || "Sin email"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={detalle.estado || "NUEVA"}
                    onChange={(event) => cambiarEstado(event.target.value)}
                    className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase"
                  >
                    {estados.map((estado) => (
                      <option key={estado} value={estado}>
                        {estadoLabel[estado] || estado}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={cerrar}
                    className="border-2 border-black px-3 py-2 text-xs font-black uppercase hover:bg-black hover:text-white"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              {puedeAsignar && (
                <div className="grid grid-cols-1 gap-3 border-2 border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_140px]">
                  <select
                    value={detalle.asignado_a_id || ""}
                    onChange={(event) => asignar(event.target.value)}
                    className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase"
                  >
                    <option value="">Sin responsable</option>
                    {responsables.map((responsable) => (
                      <option key={responsable.id} value={responsable.id}>
                        {nombreResponsable(responsable)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => asignar(usuario.id)}
                    disabled={!usuario.id}
                    className="bg-blue-600 px-3 py-2 text-xs font-black uppercase text-white hover:bg-black disabled:opacity-50"
                  >
                    Asignarme
                  </button>
                </div>
              )}

              <div className="max-h-[420px] space-y-3 overflow-y-auto border-2 border-black bg-slate-100 p-4">
                {mensajes.map((item) => {
                  const interno = item.direccion === "SALIENTE";
                  return (
                    <div
                      key={item.id}
                      className={`max-w-[92%] border-2 p-3 text-sm font-semibold ${
                        interno
                          ? "ml-auto border-blue-700 bg-blue-600 text-white"
                          : "mr-auto border-black bg-white text-black"
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase opacity-80">
                        {interno ? "GMTCH" : item.enviado_por_nombre || "Master"} /{" "}
                        {formatearFecha(item.createdAt)}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap leading-6">{item.texto}</p>
                    </div>
                  );
                })}
              </div>

              <div>
                <textarea
                  value={respuesta}
                  onChange={(event) => setRespuesta(event.target.value)}
                  placeholder="Escribe respuesta para el portal del Master"
                  className="min-h-[120px] w-full border-2 border-black bg-white p-3 text-sm font-bold outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={enviarRespuesta}
                  className="mt-3 bg-black px-5 py-3 text-xs font-black uppercase text-white hover:bg-blue-700"
                >
                  Responder por portal
                </button>
              </div>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

export default MensajesPage;
