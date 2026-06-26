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

const apiRoot = () => String(api.defaults.baseURL || "").replace(/\/api\/?$/, "");

const fileUrl = (ruta) => {
  if (!ruta) return null;
  if (/^https?:\/\//i.test(ruta)) return ruta;
  return ruta.startsWith("/") ? `${apiRoot()}${ruta}` : `${apiRoot()}/${ruta}`;
};

const normalizarLista = (...valores) => {
  for (const valor of valores) {
    if (Array.isArray(valor)) return valor;
    if (valor && typeof valor === "object") return [valor];
  }

  return [];
};

const formatearFecha = (valor) => {
  if (!valor) return "No registrado";

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "No registrado";

  return fecha.toLocaleString("es-CL");
};

const formatearMonto = (valor) => {
  const numero = Number(valor || 0);
  return numero > 0 ? `$${numero.toLocaleString("es-CL")}` : "Pendiente";
};

const texto = (valor, fallback = "No registrado") => {
  const limpio = String(valor ?? "").trim();
  return limpio || fallback;
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
        console.error("ERROR HISTORIAL VEHICULO:", err.response?.data || err.message);
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
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [vehiculo]);

  const metricas = useMemo(() => {
    const totalFacturado = ordenes.reduce(
      (acc, orden) => acc + Number(orden.monto_total || 0),
      0
    );
    const totalPagado = ordenes.reduce(
      (acc, orden) => acc + Number(orden.monto_pagado || 0),
      0
    );

    const totalDiagnosticos = ordenes.reduce(
      (acc, orden) =>
        acc + normalizarLista(orden.Diagnosticos, orden.Diagnostico).length,
      0
    );
    const totalFotos = ordenes.reduce(
      (acc, orden) =>
        acc + normalizarLista(orden.FotoVehiculos, orden.FotosVehiculo).length,
      0
    );
    const totalArchivosECU = ordenes.reduce(
      (acc, orden) =>
        acc + normalizarLista(orden.ArchivoECUs, orden.ArchivosECU).length,
      0
    );

    return {
      totalOrdenes: vehiculo?.metricas?.totalOrdenes ?? vehiculo?.totalOrdenes ?? ordenes.length,
      totalDiagnosticos:
        vehiculo?.metricas?.totalDiagnosticos ??
        vehiculo?.totalDiagnosticos ??
        totalDiagnosticos,
      totalFotos: vehiculo?.metricas?.totalFotos ?? vehiculo?.totalFotos ?? totalFotos,
      totalArchivosECU:
        vehiculo?.metricas?.totalArchivosECU ??
        vehiculo?.totalArchivosECU ??
        totalArchivosECU,
      totalFacturado:
        vehiculo?.metricas?.totalFacturado ?? vehiculo?.totalFacturado ?? totalFacturado,
      totalPagado: vehiculo?.metricas?.totalPagado ?? vehiculo?.totalPagado ?? totalPagado,
      ultimaVisita:
        vehiculo?.metricas?.ultimaVisita ??
        vehiculo?.ultimaVisita ??
        ordenes[0]?.createdAt ??
        null,
      ultimaEntrega: vehiculo?.metricas?.ultimaEntrega ?? vehiculo?.ultimaEntrega ?? null,
    };
  }, [vehiculo, ordenes]);

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
        <p className="text-xl font-black uppercase">Vehiculo no encontrado</p>
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
          Volver al garage
        </Link>

        <div className="mt-5 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div>
            <h1 className="text-5xl md:text-7xl font-black uppercase font-mono">
              {vehiculo.patente}
            </h1>

            <p className="text-xl font-black uppercase mt-3">
              {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio || ""}
            </p>

            <p className="text-xs font-bold uppercase text-gray-400 mt-2">
              Tipo: {vehiculo.tipo_unidad || "AUTO"} | VIN:{" "}
              {vehiculo.vin || "No registrado"}
            </p>
          </div>

          <span
            className={`inline-block px-5 py-3 border-2 border-white font-black uppercase text-xs ${
              vehiculo.activo === false ? "bg-red-600" : "bg-green-600"
            }`}
          >
            {vehiculo.activo === false ? "Inactivo" : "Activo"}
          </span>
        </div>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border-4 border-black p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black uppercase text-gray-500">
            Cliente asociado
          </p>
          <h2 className="text-3xl font-black uppercase mt-2">
            {texto(cliente.nombre)}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 text-sm font-bold uppercase">
            <Info label="Telefono" value={cliente.telefono} />
            <Info label="Email" value={cliente.email} />
            <Info label="Direccion" value={cliente.direccion} />
            <Info label="Categoria" value={categoria} />
          </div>

          <div className="mt-5 bg-slate-50 border-2 border-black p-4">
            <p className="text-[10px] font-black uppercase text-gray-500">
              Nota interna
            </p>
            <p className="text-sm font-bold uppercase mt-1">
              {texto(cliente.nota_cliente)}
            </p>
          </div>
        </div>

        <div className="bg-white border-4 border-black p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black uppercase text-gray-500">
            Datos vehiculo
          </p>
          <div className="mt-4 space-y-3 text-sm font-bold uppercase">
            <Info label="ID vehiculo" value={vehiculo.id} />
            <Info label="Cliente ID" value={vehiculo.clienteId} />
            <Info label="Creado" value={formatearFecha(vehiculo.createdAt)} />
            <Info label="Actualizado" value={formatearFecha(vehiculo.updatedAt)} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <Stat label="Total ordenes" value={metricas.totalOrdenes} />
        <Stat label="Diagnosticos" value={metricas.totalDiagnosticos} />
        <Stat label="Fotos" value={metricas.totalFotos} />
        <Stat label="File Service" value={metricas.totalArchivosECU} />
        <Stat label="Total facturado" value={formatearMonto(metricas.totalFacturado)} />
        <Stat label="Total pagado" value={formatearMonto(metricas.totalPagado)} />
        <Stat label="Ultima visita" value={formatearFecha(metricas.ultimaVisita)} />
        <Stat label="Ultima entrega" value={formatearFecha(metricas.ultimaEntrega)} />
      </section>

      <section className="bg-white border-4 border-black p-5 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-[10px] font-black uppercase text-gray-500 mb-4">
          Acciones rapidas
        </p>
        <div className="flex flex-wrap gap-3">
          <QuickLink to="/ordenes" label="Nueva orden" />
          <QuickLink to="/diagnosticos" label="Ver / ir a diagnostico" />
          <QuickLink to="/archivos-ecu" label="Ver / ir a File Service" />
          <QuickLink to="/fotos" label="Subir fotos" />
        </div>
      </section>

      <section className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <div className="bg-slate-100 border-b-4 border-black p-5">
          <h2 className="text-2xl font-black uppercase">
            Historial 360 del vehiculo
          </h2>
          <p className="text-xs font-bold uppercase text-gray-500">
            Ordenes, diagnosticos, evidencias, File Service, pagos y entregas.
          </p>
        </div>

        <div className="divide-y-4 divide-black">
          {ordenes.map((orden) => {
            const diagnosticos = normalizarLista(orden.Diagnosticos, orden.Diagnostico);
            const fotos = normalizarLista(orden.FotoVehiculos, orden.FotosVehiculo);
            const archivos = normalizarLista(orden.ArchivoECUs, orden.ArchivosECU);
            const historialCorreccion = Array.isArray(orden.correccion_historial)
              ? orden.correccion_historial
              : [];
            const bitacoraOperativa = Array.isArray(orden.bitacora_operativa)
              ? orden.bitacora_operativa
              : [];
            const tieneFeedback =
              Boolean(String(orden.feedback_operario || "").trim()) ||
              Boolean(String(orden.detalle_pendiente || "").trim()) ||
              Boolean(String(orden.recomendacion_futura || "").trim()) ||
              orden.requiere_seguimiento === true ||
              Boolean(orden.feedback_por) ||
              Boolean(orden.feedback_at);
            const tieneCorreccion =
              Boolean(orden.correccion_estado) || historialCorreccion.length > 0;

            return (
              <article key={orden.id} className="p-6 space-y-5">
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
                        {orden.estado || "Pendiente"}
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
                      Fecha: {formatearFecha(orden.createdAt)} | KM:{" "}
                      {orden.kilometraje || "No registrado"}
                    </p>
                  </div>

                  <div className="text-left xl:text-right">
                    <p className="text-[10px] font-black uppercase text-gray-500">
                      Monto total
                    </p>
                    <p className="text-2xl font-black">
                      {formatearMonto(orden.monto_total)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MiniBox title="Diagnosticos" value={`${diagnosticos.length} registro(s)`} />
                  <MiniBox title="Fotos" value={`${fotos.length} archivo(s)`} />
                  <MiniBox title="Archivos ECU" value={`${archivos.length} archivo(s)`} />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <Panel title="Pago y entrega">
                    <Info label="Estado pago" value={orden.estado_pago || "Pendiente"} />
                    <Info label="Medio pago" value={orden.medio_pago || "Pendiente"} />
                    <Info label="Monto pagado" value={formatearMonto(orden.monto_pagado)} />
                    <Info label="Cobrado por" value={orden.cobrado_por} />
                    <Info label="Fecha pago" value={formatearFecha(orden.fecha_pago)} />
                    <Info label="Entregado por" value={orden.entregado_por} />
                    <Info label="Fecha entrega" value={formatearFecha(orden.entregado_at)} />
                    <Info label="Observacion cierre" value={orden.observacion_cierre} />
                  </Panel>

                  <Panel title="Cierre tecnico">
                    <Info label="Finalizado por" value={orden.tecnico_finalizado_por} />
                    <Info
                      label="Fecha finalizacion"
                      value={formatearFecha(orden.tecnico_finalizado_at)}
                    />
                    <Info label="Observacion pago" value={orden.observacion_pago} />
                  </Panel>
                </div>

                {tieneFeedback && (
                  <Panel title="Feedback operativo">
                    <Info label="Observacion operario" value={orden.feedback_operario} />
                    <Info label="Detalle pendiente" value={orden.detalle_pendiente} />
                    <Info
                      label="Recomendacion futura"
                      value={orden.recomendacion_futura}
                    />
                    <Info
                      label="Requiere seguimiento"
                      value={orden.requiere_seguimiento ? "Si" : "No"}
                    />
                    <Info label="Feedback por" value={orden.feedback_por} />
                    <Info label="Fecha feedback" value={formatearFecha(orden.feedback_at)} />
                  </Panel>
                )}

                {tieneCorreccion && (
                  <Panel title="Correccion / postventa tecnica">
                    <Info label="Estado" value={orden.correccion_estado} />
                    <Info label="Prioridad" value={orden.correccion_prioridad} />
                    <Info label="Motivo" value={orden.correccion_motivo} />
                    <Info label="Descripcion" value={orden.correccion_descripcion} />
                    <Info label="DTC" value={orden.correccion_dtc} />
                    <Info
                      label="Sintoma cliente"
                      value={orden.correccion_sintoma_cliente}
                    />
                    <Info
                      label="Archivo ECU relacionado"
                      value={
                        orden.correccion_archivo_ecu_id
                          ? `File #${orden.correccion_archivo_ecu_id}`
                          : "No registrado"
                      }
                    />
                    <Info
                      label="Responsable sugerido"
                      value={orden.correccion_responsable_sugerido}
                    />
                    <Info
                      label="Cliente volvio"
                      value={orden.correccion_cliente_volvio ? "Si" : "No"}
                    />
                    <Info label="Creada por" value={orden.correccion_creada_por} />
                    <Info
                      label="Fecha creacion"
                      value={formatearFecha(orden.correccion_creada_at)}
                    />

                    {historialCorreccion.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-black uppercase text-gray-500">
                          Historial correccion
                        </p>
                        {historialCorreccion.slice(-5).map((evento, index) => (
                          <div
                            key={`${evento.fecha || index}-${index}`}
                            className="border-2 border-black bg-white p-3 text-xs font-bold uppercase"
                          >
                            <p>
                              {evento.estado || evento.tipo || "Evento"} |{" "}
                              {formatearFecha(evento.fecha)}
                            </p>
                            <p>{evento.motivo || evento.comentario_tecnico}</p>
                            <p>
                              Por:{" "}
                              {evento.creado_por ||
                                evento.actualizado_por ||
                                "No registrado"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {bitacoraOperativa.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-black uppercase text-gray-500">
                          Bitacora operativa
                        </p>
                        {bitacoraOperativa.slice(-5).map((evento, index) => (
                          <div
                            key={`${evento.fecha || index}-${index}`}
                            className="border-2 border-black bg-white p-3 text-xs font-bold uppercase"
                          >
                            <p>
                              {evento.tipo || "OTRO"} |{" "}
                              {evento.prioridad || "MEDIA"} |{" "}
                              {formatearFecha(evento.fecha)}
                            </p>
                            <p>{evento.texto}</p>
                            <p>Por: {evento.creado_por || "No registrado"}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>
                )}

                {diagnosticos.length > 0 && (
                  <Panel title="Diagnosticos asociados">
                    <div className="space-y-3">
                      {diagnosticos.map((diagnostico, index) => {
                        const scanner = fileUrl(
                          diagnostico.foto_scanner || diagnostico.informe_scanner
                        );

                        return (
                          <div key={diagnostico.id || index} className="border-2 border-black p-3 bg-white">
                            <p className="text-xs font-black uppercase">
                              Fase: {diagnostico.fase || "No registrado"}
                            </p>
                            <p className="text-xs font-bold uppercase mt-1">
                              DTC:{" "}
                              {diagnostico.sin_dtc
                                ? "SIN DTC"
                                : diagnostico.codigos_dtc || "No registrado"}
                            </p>
                            <p className="text-xs font-bold uppercase mt-1">
                              Observaciones: {texto(diagnostico.observaciones)}
                            </p>
                            {scanner && (
                              <a
                                href={scanner}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block mt-2 text-xs font-black uppercase underline"
                              >
                                Ver foto scanner
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                )}

                {fotos.length > 0 && (
                  <Panel title="Fotos del vehiculo">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {fotos.map((foto, index) => {
                        const url = fileUrl(foto.url_foto || foto.url || foto.path);

                        return (
                          <div key={foto.id || index} className="border-2 border-black p-3 bg-white">
                            <p className="text-xs font-black uppercase">
                              {foto.tipo_foto || foto.descripcion || `Foto ${index + 1}`}
                            </p>
                            <p className="text-xs font-bold uppercase text-gray-500">
                              {formatearFecha(foto.createdAt)}
                            </p>
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block mt-2 text-xs font-black uppercase underline"
                              >
                                Ver foto
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                )}

                {archivos.length > 0 && (
                  <Panel title="File Service / archivos ECU">
                    <div className="space-y-3">
                      {archivos.map((archivo, index) => {
                        const original = fileUrl(archivo.archivo_original);
                        const mod = fileUrl(archivo.archivo_modificado);

                        return (
                          <div key={archivo.id || index} className="border-2 border-black p-3 bg-white">
                            <div className="flex flex-wrap gap-2 mb-2">
                              <span className="bg-black text-white px-2 py-1 text-[10px] font-black uppercase">
                                {archivo.estado || "Sin estado"}
                              </span>
                              <span className="bg-blue-600 text-white px-2 py-1 text-[10px] font-black uppercase">
                                {archivo.tipo_servicio || "Servicio no registrado"}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-bold uppercase">
                              <Info label="Post escritura" value={archivo.post_escritura_estado || "Pendiente"} />
                              <Info label="DTC post" value={archivo.post_escritura_dtc || "Pendiente"} />
                              <Info label="Post por" value={archivo.post_escritura_por} />
                              <Info label="Fecha post" value={formatearFecha(archivo.post_escritura_at)} />
                            </div>

                            <div className="flex flex-wrap gap-3 mt-3">
                              {original && (
                                <a href={original} target="_blank" rel="noreferrer" className="text-xs font-black uppercase underline">
                                  Archivo original
                                </a>
                              )}
                              {mod && (
                                <a href={mod} target="_blank" rel="noreferrer" className="text-xs font-black uppercase underline">
                                  Ultimo MOD
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                )}
              </article>
            );
          })}

          {ordenes.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-xl font-black uppercase">
                Este vehiculo aun no tiene historial
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const Info = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-black uppercase text-gray-500">{label}</p>
    <p className="font-black uppercase break-words">{texto(value)}</p>
  </div>
);

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

const Panel = ({ title, children }) => (
  <section className="border-2 border-black p-4 bg-slate-50">
    <h4 className="text-sm font-black uppercase mb-3">{title}</h4>
    <div className="space-y-2">{children}</div>
  </section>
);

const QuickLink = ({ to, label }) => (
  <Link
    to={to}
    className="bg-black text-white px-4 py-3 font-black uppercase text-xs hover:bg-blue-600 transition"
  >
    {label}
  </Link>
);

export default VehiculoDetallePage;
