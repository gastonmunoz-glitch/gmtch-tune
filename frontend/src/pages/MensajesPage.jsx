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
const canales = ["PORTAL", "WHATSAPP", "INSTAGRAM", "FACEBOOK", "MANUAL"];
const canalesExternos = ["WHATSAPP", "INSTAGRAM", "FACEBOOK"];

const estadoLabel = {
  NUEVA: "Nueva",
  EN_ATENCION: "En atención",
  ESPERANDO_CLIENTE: "Esperando cliente",
  CERRADA: "Cerrada",
};

const canalLabel = {
  PORTAL: "Portal Master",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  MANUAL: "Manual",
};

const canalClass = {
  PORTAL: "border-blue-600 bg-blue-50 text-blue-700",
  WHATSAPP: "border-green-600 bg-green-50 text-green-700",
  INSTAGRAM: "border-fuchsia-600 bg-fuchsia-50 text-fuchsia-700",
  FACEBOOK: "border-indigo-600 bg-indigo-50 text-indigo-700",
  MANUAL: "border-slate-500 bg-slate-100 text-slate-700",
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

const canalConversacion = (conversacion) =>
  String(conversacion?.canal || "PORTAL").toUpperCase();

const nombreConversacion = (conversacion) =>
  conversacion?.nombre_contacto ||
  conversacion?.username_externo ||
  conversacion?.wa_id ||
  conversacion?.telefono ||
  conversacion?.PortalUsuario?.nombre ||
  conversacion?.Cuenta?.nombre_taller ||
  conversacion?.email ||
  "Contacto externo";

const origenConversacion = (conversacion) => {
  const canal = canalConversacion(conversacion);

  if (canal === "WHATSAPP") {
    return `WhatsApp: ${conversacion.wa_id || conversacion.telefono || "sin teléfono"}`;
  }

  if (canal === "INSTAGRAM") {
    const base = conversacion.username_externo || conversacion.external_user_id || "usuario externo";
    const cuenta = conversacion.instagram_account_id
      ? ` / IG ${conversacion.instagram_account_id}`
      : "";
    return `Instagram: ${base}${cuenta}`;
  }

  if (canal === "FACEBOOK") {
    const base = conversacion.username_externo || conversacion.external_user_id || "usuario externo";
    const page = conversacion.page_id ? ` / Page ${conversacion.page_id}` : "";
    return `Facebook: ${base}${page}`;
  }

  if (canal === "PORTAL") {
    return `${conversacion.Cuenta?.nombre_taller || "Cuenta portal"} / ${
      conversacion.PortalUsuario?.email || conversacion.email || "sin email"
    }`;
  }

  return conversacion.email || conversacion.telefono || "Origen manual";
};

const origenPublicacion = (conversacion) => {
  const partes = [];
  if (conversacion.post_id) partes.push(`Post: ${conversacion.post_id}`);
  if (conversacion.comment_id) partes.push(`Comentario: ${conversacion.comment_id}`);
  if (conversacion.ad_id) partes.push(`Anuncio: ${conversacion.ad_id}`);
  return partes.join(" / ");
};

const estadoVentanaWhatsapp = (conversacion) => {
  if (canalConversacion(conversacion) !== "WHATSAPP") return null;

  if (conversacion.requiere_template) {
    return "Fuera de ventana 24h · requiere plantilla";
  }

  if (conversacion.service_window_expires_at) {
    return `Puedes responder libremente hasta: ${formatearFecha(
      conversacion.service_window_expires_at
    )}`;
  }

  return "Ventana WhatsApp no calculada";
};

function MensajesPage() {
  const [searchParams] = useSearchParams();
  const [conversaciones, setConversaciones] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [responsables, setResponsables] = useState([]);
  const [filtros, setFiltros] = useState({
    estado: "",
    canal: "",
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
  const detalleCanal = canalConversacion(detalle);
  const detalleEsExterno = canalesExternos.includes(detalleCanal);
  const ventanaWhatsapp = estadoVentanaWhatsapp(detalle);

  const cargarConversaciones = async (params = filtros) => {
    try {
      setError("");
      setCargando(true);
      const data = await getConversaciones({
        estado: params.estado || undefined,
        canal: params.canal || undefined,
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

    if (detalleEsExterno) {
      setError("Canal externo conectado en modo recepción. Respuesta desde OS se habilitará en Fase 2.");
      return;
    }

    if (!detalle?.id || !texto) {
      setError("Escribe una respuesta antes de enviar.");
      return;
    }

    try {
      setError("");
      setMensaje("");
      await responderConversacion(detalle.id, texto);
      setRespuesta("");
      setMensaje(
        detalleCanal === "PORTAL"
          ? "Respuesta enviada al portal del Master."
          : "Respuesta guardada en la conversación."
      );
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
              Centro de atención omnicanal
            </p>
            <h1 className="mt-2 text-4xl font-black uppercase text-black">
              Bandeja de mensajes
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-bold text-gray-600">
              Portal Master, WhatsApp, Instagram y Facebook en una sola bandeja.
              Fase 1 recibe y registra mensajes externos; las respuestas Meta se habilitarán en Fase 2.
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

        <form
          onSubmit={aplicarFiltros}
          className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[170px_180px_1fr_150px]"
        >
          <select
            value={filtros.estado}
            onChange={(event) =>
              setFiltros((actual) => ({ ...actual, estado: event.target.value }))
            }
            className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase"
          >
            <option value="">Todos los estados</option>
            {estados.map((estado) => (
              <option key={estado} value={estado}>
                {estadoLabel[estado] || estado}
              </option>
            ))}
          </select>
          <select
            value={filtros.canal}
            onChange={(event) =>
              setFiltros((actual) => ({ ...actual, canal: event.target.value }))
            }
            className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase"
          >
            <option value="">Todos los canales</option>
            {canales.map((canal) => (
              <option key={canal} value={canal}>
                {canalLabel[canal] || canal}
              </option>
            ))}
          </select>
          <input
            value={filtros.search}
            onChange={(event) =>
              setFiltros((actual) => ({ ...actual, search: event.target.value }))
            }
            placeholder="Buscar por asunto, email, contacto, teléfono, usuario externo o wa_id"
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
          {conversaciones.map((conversacion) => {
            const canal = canalConversacion(conversacion);
            return (
              <button
                type="button"
                key={conversacion.id}
                onClick={() => abrirConversacion(conversacion.id)}
                className={`w-full border-2 bg-white p-4 text-left shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:border-blue-600 ${
                  detalle?.id === conversacion.id ? "border-blue-600" : "border-black"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`border px-2 py-1 text-[10px] font-black uppercase ${canalClass[canal] || canalClass.MANUAL}`}>
                    {canalLabel[canal] || canal}
                  </span>
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
                  {conversacion.asunto || `${canalLabel[canal] || canal} / mensaje`}
                </p>
                <p className="mt-1 text-xs font-bold text-gray-600">
                  {nombreConversacion(conversacion)}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase text-gray-500">
                  {origenConversacion(conversacion)} /{" "}
                  {formatearFecha(conversacion.ultimo_mensaje_at || conversacion.updatedAt)}
                </p>
                {origenPublicacion(conversacion) && (
                  <p className="mt-1 text-[10px] font-bold uppercase text-gray-500">
                    {origenPublicacion(conversacion)}
                  </p>
                )}
                {estadoVentanaWhatsapp(conversacion) && (
                  <p className="mt-2 inline-block border border-green-600 bg-green-50 px-2 py-1 text-[10px] font-black uppercase text-green-700">
                    {estadoVentanaWhatsapp(conversacion)}
                  </p>
                )}
                {conversacion.ultimo_mensaje?.texto && (
                  <p className="mt-2 max-h-10 overflow-hidden text-xs font-semibold text-gray-600">
                    {conversacion.ultimo_mensaje.texto}
                  </p>
                )}
              </button>
            );
          })}

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
                  Aquí verás mensajes, canal, origen, responsable y estado.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`border px-2 py-1 text-[10px] font-black uppercase ${canalClass[detalleCanal] || canalClass.MANUAL}`}>
                      {canalLabel[detalleCanal] || detalleCanal}
                    </span>
                    {detalle.proveedor && (
                      <span className="border border-slate-500 bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-700">
                        {detalle.proveedor}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-2xl font-black uppercase text-black">
                    {detalle.asunto || `${canalLabel[detalleCanal] || detalleCanal} / mensaje`}
                  </h2>
                  <p className="mt-1 text-xs font-bold text-gray-600">
                    {nombreConversacion(detalle)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-gray-500">
                    {origenConversacion(detalle)}
                  </p>
                  {origenPublicacion(detalle) && (
                    <p className="mt-1 text-xs font-bold text-gray-500">
                      {origenPublicacion(detalle)}
                    </p>
                  )}
                  {ventanaWhatsapp && (
                    <p className="mt-2 inline-block border border-green-600 bg-green-50 px-2 py-1 text-[10px] font-black uppercase text-green-700">
                      {ventanaWhatsapp}
                    </p>
                  )}
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

              {detalleEsExterno && (
                <div className="border-2 border-amber-500 bg-amber-50 p-4 text-sm font-black uppercase text-amber-800">
                  Canal externo conectado en modo recepción. Respuesta desde OS se habilitará en Fase 2.
                </div>
              )}

              <div className="max-h-[420px] space-y-3 overflow-y-auto border-2 border-black bg-slate-100 p-4">
                {mensajes.map((item) => {
                  const interno = item.direccion !== "ENTRANTE";
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
                        {interno ? "GMTCH" : item.enviado_por_nombre || nombreConversacion(detalle)} /{" "}
                        {formatearFecha(item.enviado_at || item.createdAt)}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap leading-6">{item.texto}</p>
                      {item.estado_envio && (
                        <p className="mt-2 text-[10px] font-black uppercase opacity-80">
                          Estado: {item.estado_envio}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div>
                <textarea
                  value={respuesta}
                  onChange={(event) => setRespuesta(event.target.value)}
                  placeholder={
                    detalleEsExterno
                      ? "Respuesta externa no habilitada en Fase 1"
                      : "Escribe respuesta para esta conversación"
                  }
                  disabled={detalleEsExterno}
                  className="min-h-[120px] w-full border-2 border-black bg-white p-3 text-sm font-bold outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
                />
                <button
                  type="button"
                  onClick={enviarRespuesta}
                  disabled={detalleEsExterno}
                  className="mt-3 bg-black px-5 py-3 text-xs font-black uppercase text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {detalleEsExterno ? "Respuesta externa Fase 2" : "Responder"}
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
