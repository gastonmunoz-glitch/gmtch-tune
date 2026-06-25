import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  portalDownloadMod,
  portalGetFile,
  portalListFiles,
  portalSolicitarCorreccion,
  portalSubirNuevaLectura,
} from "../services/portalApi";

const estadoLabels = {
  REQUIERE_NUEVA_LECTURA: "Requiere nueva lectura",
  RECIBIDO: "Recibido",
  EN_REVISION: "En revisión",
  EN_PROCESO: "En proceso",
  MOD_LISTO: "MOD listo",
  CORRECCION_SOLICITADA: "Corrección solicitada",
  CORREGIDO: "Corregido",
  ENTREGADO: "Entregado",
  RECHAZADO: "Rechazado",
};

const formatearFecha = (valor) => {
  if (!valor) return "Pendiente";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Pendiente";
  return fecha.toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const vehiculoTexto = (archivo) =>
  [archivo.marca_vehiculo, archivo.modelo_vehiculo, archivo.anio_vehiculo]
    .filter(Boolean)
    .join(" ") || "No registrado";

function PortalMisArchivosPage() {
  const [archivos, setArchivos] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [correcciones, setCorrecciones] = useState({});
  const [nuevasLecturas, setNuevasLecturas] = useState({});
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    try {
      setError("");
      setCargando(true);
      const data = await portalListFiles();
      setArchivos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los archivos.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const verDetalle = async (id) => {
    try {
      setError("");
      const data = await portalGetFile(id);
      setDetalle(data);
    } catch (err) {
      setError(err.message || "No se pudo cargar el detalle.");
    }
  };

  const descargar = async (archivo) => {
    try {
      setError("");
      const { blob, filename } = await portalDownloadMod(archivo.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || archivo.nombre_modificado || `mod-${archivo.id}.bin`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      await cargar();
    } catch (err) {
      setError(err.message || "No se pudo descargar el MOD.");
    }
  };

  const solicitarCorreccion = async (archivo) => {
    const observacion = (correcciones[archivo.id] || "").trim();

    if (!observacion) {
      setError("Debes escribir una observación para solicitar corrección.");
      return;
    }

    try {
      setError("");
      setMensaje("");
      await portalSolicitarCorreccion(archivo.id, {
        observacion_correccion: observacion,
      });
      setCorrecciones((actual) => ({ ...actual, [archivo.id]: "" }));
      setMensaje("Corrección solicitada correctamente.");
      await cargar();
    } catch (err) {
      setError(err.message || "No se pudo solicitar la corrección.");
    }
  };

  const subirNuevaLectura = async (archivo) => {
    const file = nuevasLecturas[archivo.id];

    if (!file) {
      setError("Debes adjuntar el archivo de nueva lectura solicitado por GMTCH.");
      return;
    }

    const formData = new FormData();
    formData.append("archivo", file);

    try {
      setError("");
      setMensaje("");
      await portalSubirNuevaLectura(archivo.id, formData);
      setNuevasLecturas((actual) => ({ ...actual, [archivo.id]: null }));
      setMensaje("Nueva lectura enviada correctamente. GMTCH la revisara antes de continuar.");
      await cargar();
    } catch (err) {
      setError(err.message || "No se pudo subir la nueva lectura.");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-slate-800 px-5 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link to="/portal" className="text-xs font-black uppercase tracking-[0.24em] text-blue-400">
            Portal File Service
          </Link>
          <Link to="/portal/nuevo-archivo" className="bg-blue-600 px-4 py-2 text-xs font-black uppercase text-white hover:bg-white hover:text-black">
            Nuevo archivo
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-400">
              Historial externo
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase">Mis archivos</h1>
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

        <div className="mt-8 space-y-4">
          {archivos.map((archivo) => {
            const estado = String(archivo.estado || "").toUpperCase();
            const requiereNuevaLectura =
              archivo.requiere_nueva_lectura || estado === "REQUIERE_NUEVA_LECTURA";
            const puedeDescargar =
              !requiereNuevaLectura && (archivo.puede_descargar || archivo.mod_listo);

            return (
              <article key={archivo.id} className="border border-slate-700 bg-slate-950 p-5">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.85fr]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="border border-blue-500 px-3 py-1 text-[10px] font-black uppercase text-blue-300">
                        File #{archivo.id}
                      </span>
                      <span className="border border-slate-600 px-3 py-1 text-[10px] font-black uppercase text-slate-300">
                        {estadoLabels[estado] || estado || "Sin estado"}
                      </span>
                      {requiereNuevaLectura && (
                        <span className="border border-yellow-500 bg-yellow-500/10 px-3 py-1 text-[10px] font-black uppercase text-yellow-200">
                          GMTCH solicita nueva lectura
                        </span>
                      )}
                      {archivo.correccion_solicitada && (
                        <span className="border border-red-500 px-3 py-1 text-[10px] font-black uppercase text-red-300">
                          Corrección solicitada
                        </span>
                      )}
                    </div>

                    <h2 className="mt-4 text-xl font-black uppercase">
                      {archivo.tipo_servicio || "Servicio no registrado"}
                    </h2>
                    <p className="mt-2 text-sm font-bold text-slate-400">
                      {vehiculoTexto(archivo)}
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-3 text-xs font-bold text-slate-300 md:grid-cols-3">
                      <p>Fecha: {formatearFecha(archivo.fecha_subida || archivo.createdAt)}</p>
                      <p>Créditos: {archivo.creditos_requeridos ?? "Pendiente"}</p>
                      <p>MOD: {archivo.mod_listo ? "Disponible" : "Pendiente"}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {requiereNuevaLectura && (
                      <div className="border border-yellow-500 bg-yellow-950/30 p-4">
                        <p className="text-sm font-black uppercase text-yellow-200">
                          GMTCH solicita nueva lectura
                        </p>
                        <p className="mt-2 text-sm font-bold text-yellow-100">
                          Tu archivo requiere una nueva lectura antes de continuar.
                        </p>
                        <p className="mt-3 text-xs font-bold text-slate-200">
                          Motivo tecnico: {archivo.nueva_lectura_motivo || "No registrado"}
                        </p>
                        <p className="mt-2 text-xs font-bold text-slate-200">
                          Instrucciones: {archivo.nueva_lectura_instrucciones || "No registradas"}
                        </p>
                        <div className="mt-4 flex flex-col gap-2">
                          <input
                            type="file"
                            className="w-full border border-slate-700 bg-black px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
                            onChange={(event) =>
                              setNuevasLecturas((actual) => ({
                                ...actual,
                                [archivo.id]: event.target.files?.[0] || null,
                              }))
                            }
                          />
                          <button
                            type="button"
                            onClick={() => subirNuevaLectura(archivo)}
                            className="bg-yellow-500 px-4 py-2 text-xs font-black uppercase text-black hover:bg-white"
                          >
                            Subir nueva lectura
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => verDetalle(archivo.id)}
                        className="border border-slate-600 px-4 py-2 text-xs font-black uppercase hover:border-blue-500"
                      >
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        onClick={() => descargar(archivo)}
                        disabled={!puedeDescargar}
                        className="bg-blue-600 px-4 py-2 text-xs font-black uppercase text-white hover:bg-white hover:text-black disabled:opacity-40"
                      >
                        Descargar MOD
                      </button>
                    </div>

                    {archivo.mod_listo && (
                      <div>
                        <textarea
                          value={correcciones[archivo.id] || ""}
                          onChange={(event) =>
                            setCorrecciones((actual) => ({
                              ...actual,
                              [archivo.id]: event.target.value,
                            }))
                          }
                          placeholder="Observación de corrección"
                          className="w-full border border-slate-700 bg-black px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => solicitarCorreccion(archivo)}
                          className="mt-2 border border-yellow-500 px-4 py-2 text-xs font-black uppercase text-yellow-200 hover:bg-yellow-500 hover:text-black"
                        >
                          Solicitar corrección
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {!archivos.length && !cargando && (
            <div className="border border-slate-700 bg-slate-950 p-6 text-sm font-bold text-slate-400">
              No hay archivos cargados todavía.
            </div>
          )}
        </div>

        {detalle && (
          <aside className="mt-8 border border-blue-500 bg-blue-950/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                  Detalle File #{detalle.id}
                </p>
                <h2 className="mt-2 text-xl font-black uppercase">
                  {detalle.tipo_servicio}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetalle(null)}
                className="text-xs font-black uppercase text-slate-300"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm font-bold text-slate-300 md:grid-cols-2">
              <p>Vehículo: {vehiculoTexto(detalle)}</p>
              <p>Estado: {estadoLabels[String(detalle.estado || "").toUpperCase()] || detalle.estado}</p>
              <p>Original: {detalle.nombre_original || "No registrado"}</p>
              <p>MOD: {detalle.nombre_modificado || "Pendiente"}</p>
              <p>Fecha MOD: {formatearFecha(detalle.fecha_mod_listo)}</p>
              <p>Descargas: {detalle.descargas_count || 0}</p>
            </div>
            {detalle.observaciones_cliente && (
              <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
                {detalle.observaciones_cliente}
              </p>
            )}
            {(detalle.requiere_nueva_lectura ||
              String(detalle.estado || "").toUpperCase() === "REQUIERE_NUEVA_LECTURA") && (
              <div className="mt-5 border border-yellow-500 bg-yellow-950/30 p-4 text-sm font-bold text-yellow-100">
                <p className="font-black uppercase text-yellow-200">
                  GMTCH solicita nueva lectura
                </p>
                <p className="mt-2">
                  Motivo tecnico: {detalle.nueva_lectura_motivo || "No registrado"}
                </p>
                <p className="mt-2">
                  Instrucciones: {detalle.nueva_lectura_instrucciones || "No registradas"}
                </p>
              </div>
            )}
          </aside>
        )}
      </section>
    </main>
  );
}

export default PortalMisArchivosPage;
