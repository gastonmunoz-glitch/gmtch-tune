import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import api, { descargarArchivoAutenticado } from "../services/api";

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

const normalizarLista = (...valores) => {
  for (const valor of valores) {
    if (Array.isArray(valor)) return valor;
    if (valor && typeof valor === "object") return [valor];
  }

  return [];
};

const normalizarJsonLista = (valor) => {
  if (Array.isArray(valor)) return valor;
  if (!valor) return [];
  if (typeof valor === "string") {
    try {
      const parsed = JSON.parse(valor);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const serviciosLabels = {
  STAGE_1: "Stage 1",
  STAGE_2: "Stage 2",
  STAGE_3: "Stage 3",
  ECO_TUNE: "Eco Tune",
  CUSTOM_TUNE: "Custom Tune",
  TCU_STAGE: "TCU Stage",
  TORQUE_LIMITER: "Torque limiter",
  VMAX_OFF: "Vmax off",
  LAUNCH_CONTROL: "Launch Control",
  ANTILAG: "Antilag",
  POPS_BANGS: "Pops & Bangs",
  HARDCUT: "Hardcut",
  POPCORN_DIESEL: "Popcorn diesel",
  DPF_OFF: "DPF off",
  FAP_OFF: "FAP off",
  EGR_OFF: "EGR off",
  ADBLUE_SCR_OFF: "AdBlue / SCR off",
  DEF_OFF: "DEF off",
  NOX_OFF: "NOx off",
  LAMBDA_OFF: "Lambda / O2 off",
  TVA_OFF: "TVA off",
  SWIRL_FLAPS_OFF: "Swirl flaps off",
  DTC_OFF: "DTC off",
  IMMO_OFF: "IMMO off",
  START_STOP_OFF: "Start/Stop off",
  READINESS_CHECK: "Readiness check",
  CHECKSUM: "Checksum",
  CLONACION_ECU: "Clonacion ECU",
  VIRGINIZAR_ECU: "Virginizar ECU",
  BACKUP_ORIGINAL: "Backup original",
  RESTAURAR_ORIGINAL: "Restaurar original",
  OTRO: "Otro",
  CUSTOM: "Custom",
};

const servicioLabel = (codigo) => serviciosLabels[codigo] || codigo;

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

const montoFinalOrden = (orden) => Number(orden?.monto_final ?? orden?.monto_total ?? 0);

const materialCumpleRegistro = (material) => {
  const peso = Number(material?.peso_kg ?? material?.kilos ?? 0);
  const excepcion = String(material?.motivo_excepcion_material || "").trim();
  return peso > 0 || Boolean(excepcion);
};

const itemsMaterialPendiente = (items = [], materiales = []) => {
  return items.filter((item) => {
    if (item.estado === "ANULADO" || item.material_recuperado_obligatorio !== true) {
      return false;
    }

    const materialItem = materiales.find(
      (material) => String(material.itemId || "") === String(item.id)
    );
    const materialOrden = materiales.find(
      (material) => !material.itemId || String(material.itemId) === "0"
    );

    return !materialCumpleRegistro(materialItem) && !materialCumpleRegistro(materialOrden);
  });
};

const texto = (valor, fallback = "No registrado") => {
  const limpio = String(valor ?? "").trim();
  return limpio || fallback;
};

function VehiculoDetallePage() {
  const { id } = useParams();
  const location = useLocation();

  const [vehiculo, setVehiculo] = useState(null);
  const [materialesRecuperados, setMaterialesRecuperados] = useState([]);
  const [materialesError, setMaterialesError] = useState("");
  const [comprobantesPago, setComprobantesPago] = useState([]);
  const [comprobantesError, setComprobantesError] = useState("");
  const [archivoError, setArchivoError] = useState("");
  const [eventosOrdenes, setEventosOrdenes] = useState({});
  const [cargando, setCargando] = useState(true);

  const descargarProtegido = async (ruta, nombreFallback) => {
    try {
      setArchivoError("");
      await descargarArchivoAutenticado(ruta, nombreFallback);
    } catch (err) {
      setArchivoError(
        err.mensajeDescarga ||
          err.response?.data?.message ||
          err.response?.data?.error ||
          "No se pudo descargar el archivo. Revisa tus permisos y vuelve a intentar."
      );
    }
  };

  useEffect(() => {
    let activo = true;
    setEventosOrdenes({});

    const cargar = async () => {
      try {
        const [vehiculoRes, materialesRes, comprobantesRes] = await Promise.allSettled([
          api.get(`/vehiculos/${id}`),
          api.get("/finanzas/material-recuperado", {
            params: {
              vehiculoId: id,
              limit: 80,
            },
          }),
          api.get("/finanzas/comprobantes", {
            params: {
              limit: 250,
            },
          }),
        ]);

        if (!activo) return;

        if (vehiculoRes.status === "fulfilled") {
          setVehiculo(vehiculoRes.value.data);
        } else {
          throw vehiculoRes.reason;
        }

        if (materialesRes.status === "fulfilled") {
          setMaterialesRecuperados(
            Array.isArray(materialesRes.value.data?.registros)
              ? materialesRes.value.data.registros
              : []
          );
          setMaterialesError("");
        } else {
          setMaterialesError("No se pudo cargar material recuperado");
        }

        if (comprobantesRes.status === "fulfilled") {
          setComprobantesPago(
            Array.isArray(comprobantesRes.value.data?.comprobantes)
              ? comprobantesRes.value.data.comprobantes
              : []
          );
          setComprobantesError("");
        } else {
          setComprobantesError("No se pudieron cargar comprobantes de pago");
        }
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

  const cargarEventosOrden = async (ordenId) => {
    const key = String(ordenId || "");
    if (!key) return;

    const estadoActual = eventosOrdenes[key];
    if (estadoActual?.cargando || estadoActual?.cargado) return;

    setEventosOrdenes((actual) => ({
      ...actual,
      [key]: {
        eventos: [],
        cargando: true,
        cargado: false,
        error: "",
      },
    }));

    try {
      const respuesta = await api.get(`/ordenes/${ordenId}/eventos`);
      const eventos = Array.isArray(respuesta.data?.eventos)
        ? respuesta.data.eventos
        : [];

      setEventosOrdenes((actual) => ({
        ...actual,
        [key]: {
          eventos,
          cargando: false,
          cargado: true,
          error: "",
        },
      }));
    } catch (error) {
      setEventosOrdenes((actual) => ({
        ...actual,
        [key]: {
          eventos: [],
          cargando: false,
          cargado: true,
          error: "No se pudo cargar la bitacora operativa.",
        },
      }));
    }
  };

  useEffect(() => {
    if (cargando || !location.hash) return;

    const objetivo = document.querySelector(location.hash);
    if (objetivo) {
      window.setTimeout(() => {
        objetivo.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 120);
    }
  }, [cargando, location.hash]);

  const ordenes = useMemo(() => {
    if (!vehiculo?.OrdenTrabajos) return [];

    return [...vehiculo.OrdenTrabajos].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [vehiculo]);

  const metricas = useMemo(() => {
    const totalFacturado = ordenes.reduce(
      (acc, orden) => acc + montoFinalOrden(orden),
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

  const comprobantesVehiculo = useMemo(() => {
    const ordenIds = new Set(ordenes.map((orden) => String(orden.id)));
    const clienteId = vehiculo?.clienteId || vehiculo?.Cliente?.id || vehiculo?.cliente?.id;

    return comprobantesPago.filter((comprobante) => {
      const coincideOrden =
        comprobante.ordenId && ordenIds.has(String(comprobante.ordenId));
      const coincideCliente =
        clienteId && String(comprobante.clienteId || "") === String(clienteId);
      return coincideOrden || coincideCliente;
    });
  }, [comprobantesPago, ordenes, vehiculo]);

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
      {archivoError && (
        <div className="border-2 border-red-700 bg-red-50 p-4 text-sm font-black uppercase text-red-900">
          {archivoError}
        </div>
      )}
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
          <QuickLink to={`/ordenes?vehiculoId=${id}`} label="Nueva orden" />
          <QuickLink to={`/diagnosticos?vehiculoId=${id}`} label="Ver / ir a diagnostico" />
          <QuickLink to={`/archivos-ecu?vehiculoId=${id}`} label="Ver / ir a File Service" />
          <QuickLink to={`/fotos?vehiculoId=${id}`} label="Subir fotos" />
          <QuickLink to={`/finanzas?vehiculoId=${id}`} label="Material recuperado" />
          <QuickLink to={`/finanzas?tab=comprobantes&vehiculoId=${id}`} label="Comprobantes pago" />
        </div>
      </section>

      <section
        id="comprobantes-pago"
        className="scroll-mt-24 bg-white border-4 border-black p-5 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-gray-500">
              Finanzas / Evidencia de pago
            </p>
            <h2 className="text-2xl font-black uppercase">
              Comprobantes asociados
            </h2>
          </div>
          <Link
            to={`/finanzas?tab=comprobantes&vehiculoId=${id}`}
            className="bg-black text-white px-4 py-3 font-black uppercase text-xs hover:bg-blue-600 transition"
          >
            Subir / revisar comprobantes
          </Link>
        </div>

        {comprobantesError && (
          <div className="mt-4 border-2 border-yellow-500 bg-yellow-50 p-3 text-xs font-black uppercase text-yellow-800">
            {comprobantesError}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {comprobantesVehiculo.map((item) => (
            <div key={item.id} className="border-2 border-black bg-slate-50 p-4">
              <div className="flex flex-wrap gap-2">
                <span className="bg-black px-2 py-1 text-[10px] font-black uppercase text-white">
                  Comprobante #{item.id}
                </span>
                <span className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase">
                  {item.estado || "PENDIENTE_REVISION"}
                </span>
                {item.ordenId && (
                  <span className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase">
                    Orden #{item.ordenId}
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs font-bold uppercase md:grid-cols-2">
                <Info label="Monto" value={formatearMonto(item.monto)} />
                <Info label="Fecha pago" value={formatearFecha(item.fecha_pago)} />
                <Info label="Metodo" value={item.metodo_pago} />
                <Info label="Banco origen" value={item.banco_origen} />
                <Info label="Folio" value={item.folio_referencia} />
                <Info label="Subido por" value={item.subido_por} />
                <Info label="Validado por" value={item.validado_por} />
                <Info label="Observacion" value={item.observacion} />
              </div>
            </div>
          ))}

          {comprobantesVehiculo.length === 0 && (
            <div className="border-2 border-black bg-slate-50 p-5 text-sm font-black uppercase text-gray-500">
              Sin comprobantes asociados a las ordenes de este vehiculo.
            </div>
          )}
        </div>
      </section>

      <section
        id="material-recuperado"
        className="scroll-mt-24 bg-white border-4 border-black p-5 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-gray-500">
              Finanzas / Control operativo
            </p>
            <h2 className="text-2xl font-black uppercase">
              Historial material recuperado
            </h2>
          </div>
          <Link
            to={`/finanzas?vehiculoId=${id}`}
            className="bg-black text-white px-4 py-3 font-black uppercase text-xs hover:bg-blue-600 transition"
          >
            Registrar / ver en Finanzas
          </Link>
        </div>

        {materialesError && (
          <div className="mt-4 border-2 border-yellow-500 bg-yellow-50 p-3 text-xs font-black uppercase text-yellow-800">
            {materialesError}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {materialesRecuperados.map((item) => (
            <div key={item.id} className="border-2 border-black bg-slate-50 p-4">
              <div className="flex flex-wrap gap-2">
                <span className="bg-black px-2 py-1 text-[10px] font-black uppercase text-white">
                  Material #{item.id}
                </span>
                <span className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase">
                  {item.estado || "ACUMULADO"}
                </span>
                <span className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase">
                  {item.alerta_rango || "OK"}
                </span>
              </div>
              <p className="mt-2 text-sm font-black uppercase">
                {item.tipo_material || "LOZA_DPF"} / {item.kilos || 0} kg
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs font-bold uppercase md:grid-cols-2">
                <Info label="Fecha" value={formatearFecha(item.fecha)} />
                <Info label="Lote" value={item.lote_mes} />
                <Info
                  label="Promedio historico"
                  value={
                    item.promedio_historico_kg
                      ? `${item.promedio_historico_kg} kg`
                      : "Sin historico"
                  }
                />
                <Info
                  label="Diferencia"
                  value={
                    item.diferencia_porcentaje !== null &&
                    item.diferencia_porcentaje !== undefined
                      ? `${item.diferencia_porcentaje}%`
                      : "Sin comparacion"
                  }
                />
                <Info label="Confianza" value={item.confianza_estadistica} />
                <Info label="Observacion" value={item.observacion} />
              </div>
            </div>
          ))}

          {materialesRecuperados.length === 0 && (
            <div className="border-2 border-black bg-slate-50 p-5 text-sm font-black uppercase text-gray-500">
              Sin registros de material recuperado para este vehiculo.
            </div>
          )}
        </div>
      </section>

      <section
        id="historial"
        className="scroll-mt-24 bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
      >
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
            const itemsServicio = normalizarLista(
              orden.OrdenServicioItems,
              orden.ItemsServicio
            );
            const materialesOrden = [
              ...normalizarLista(orden.MaterialRecuperados, orden.MaterialRecuperado),
              ...materialesRecuperados.filter(
                (item) => String(item.ordenId || "") === String(orden.id)
              ),
            ];
            const historialAjustes = Array.isArray(orden.historial_ajustes)
              ? orden.historial_ajustes
              : [];
            const pendientesMaterial = itemsMaterialPendiente(
              itemsServicio,
              materialesOrden
            );
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
            const tipoIntervencionFisica =
              orden.intervencion_fisica_tipo || "SIN_INTERVENCION";
            const tieneIntervencionFisica =
              tipoIntervencionFisica !== "SIN_INTERVENCION" ||
              Boolean(String(orden.intervencion_fisica_descripcion || "").trim()) ||
              orden.intervencion_desmontaje_requerido === true ||
              orden.intervencion_vaciado_revision_realizada === true ||
              orden.intervencion_montaje_realizado === true ||
              orden.intervencion_inspeccion_visual === true ||
              orden.intervencion_listo_programacion === true;
            const comprobantesOrden = comprobantesVehiculo.filter(
              (item) => String(item.ordenId || "") === String(orden.id)
            );
            const eventosOrden = eventosOrdenes[String(orden.id)] || {
              eventos: [],
              cargando: false,
              cargado: false,
              error: "",
            };

            return (
              <article
                id={`orden-${orden.id}`}
                key={orden.id}
                className="scroll-mt-24 p-6 space-y-5"
              >
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
                      Presupuesto / monto final
                    </p>
                    <p className="text-2xl font-black">
                      {formatearMonto(montoFinalOrden(orden))}
                    </p>
                  </div>
                </div>

                <div id="ordenes" className="scroll-mt-24 grid grid-cols-1 md:grid-cols-5 gap-4">
                  <MiniBox title="Diagnosticos" value={`${diagnosticos.length} registro(s)`} />
                  <MiniBox title="Fotos" value={`${fotos.length} archivo(s)`} />
                  <MiniBox title="Archivos ECU" value={`${archivos.length} archivo(s)`} />
                  <MiniBox title="Items servicio" value={`${itemsServicio.length} item(s)`} />
                  <MiniBox title="Material" value={`${materialesOrden.length} registro(s)`} />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <Panel title="Resumen comercial">
                    <Info
                      label="Monto original"
                      value={formatearMonto(orden.monto_original || orden.monto_total)}
                    />
                    <Info
                      label="Presupuesto / monto final"
                      value={formatearMonto(montoFinalOrden(orden))}
                    />
                    <Info
                      label="Monto pagado"
                      value={formatearMonto(orden.monto_pagado)}
                    />
                    <Info
                      label="Estado comercial"
                      value={
                        orden.estado_pago === "PAGADO"
                          ? "Pagado / venta real"
                          : "Trabajo ingresado / pendiente de pago"
                      }
                    />
                    <Info label="Ajustado por" value={orden.ajustado_por} />
                    <Info
                      label="Fecha ajuste"
                      value={formatearFecha(orden.ajustado_at)}
                    />
                    <Info label="Motivo ajuste" value={orden.motivo_ajuste} />

                    {historialAjustes.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-black uppercase text-gray-500">
                          Historial ajustes
                        </p>
                        {historialAjustes.slice(-5).map((evento, index) => (
                          <div
                            key={`${evento.fecha || index}-${index}`}
                            className="border-2 border-black bg-white p-3 text-xs font-bold uppercase"
                          >
                            <p>
                              {formatearFecha(evento.fecha)} |{" "}
                              {evento.ajustado_por || "No registrado"}
                            </p>
                            <p>
                              {formatearMonto(evento.monto_anterior)} a{" "}
                              {formatearMonto(evento.monto_final)}
                            </p>
                            <p>{evento.motivo_ajuste || "Sin motivo"}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>

                  <Panel title="Pago y entrega">
                    <Info label="Estado pago" value={orden.estado_pago || "Pendiente"} />
                    <Info label="Medio pago" value={orden.medio_pago || "Pendiente"} />
                    <Info label="Monto pagado" value={formatearMonto(orden.monto_pagado)} />
                    <Info label="Cobrado por" value={orden.cobrado_por} />
                    <Info label="Fecha pago" value={formatearFecha(orden.fecha_pago)} />
                    <Info label="Entregado por" value={orden.entregado_por} />
                    <Info label="Fecha entrega" value={formatearFecha(orden.entregado_at)} />
                    <Info label="Observacion cierre" value={orden.observacion_cierre} />
                    {comprobantesOrden.length > 0 && (
                      <div className="mt-3 border-t-2 border-black pt-3">
                        <p className="text-[10px] font-black uppercase text-gray-500">
                          Comprobantes asociados
                        </p>
                        <div className="mt-2 space-y-2">
                          {comprobantesOrden.map((item) => (
                            <div
                              key={item.id}
                              className="border-2 border-black bg-white p-2 text-[10px] font-black uppercase"
                            >
                              #{item.id} / {item.estado || "PENDIENTE"} /{" "}
                              {formatearMonto(item.monto)} /{" "}
                              {formatearFecha(item.fecha_pago)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

                {(itemsServicio.length > 0 || pendientesMaterial.length > 0) && (
                  <Panel title="Items de servicio">
                    {pendientesMaterial.length > 0 && (
                      <div className="border-2 border-red-700 bg-red-50 p-3 text-xs font-black uppercase text-red-900">
                        Material pendiente: registra peso o motivo de excepción
                        antes de cierre técnico.
                      </div>
                    )}

                    <div className="space-y-3">
                      {itemsServicio.map((item) => (
                        <div
                          key={item.id}
                          className="border-2 border-black bg-white p-3 text-xs font-bold uppercase"
                        >
                          <div className="flex flex-wrap justify-between gap-2">
                            <p className="font-black">
                              #{item.id} {item.tipo_servicio || "Servicio"}
                            </p>
                            <p>{formatearMonto(item.subtotal)}</p>
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                            <Info label="Categoria" value={item.categoria} />
                            <Info label="Estado" value={item.estado} />
                            <Info label="Responsable" value={item.responsable} />
                            <Info label="Cantidad" value={item.cantidad} />
                            <Info
                              label="Precio unitario"
                              value={formatearMonto(item.precio_unitario)}
                            />
                            <Info
                              label="Material obligatorio"
                              value={
                                item.material_recuperado_obligatorio ? "Si" : "No"
                              }
                            />
                          </div>
                          <p className="mt-2">{texto(item.descripcion)}</p>
                        </div>
                      ))}
                    </div>
                  </Panel>
                )}

                {materialesOrden.length > 0 && (
                  <Panel title="Material recuperado de la orden">
                    <div className="space-y-3">
                      {materialesOrden.map((material, index) => (
                        <div
                          key={material.id || `${material.ordenId}-${index}`}
                          className="border-2 border-black bg-white p-3 text-xs font-bold uppercase"
                        >
                          <div className="flex flex-wrap justify-between gap-2">
                            <p className="font-black">
                              {material.tipo_material || "Material"} /{" "}
                              {material.peso_kg ?? material.kilos ?? 0} kg
                            </p>
                            <p>{formatearMonto(material.valor_estimado)}</p>
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                            <Info label="Item" value={material.itemId || "Orden general"} />
                            <Info label="Responsable" value={material.responsable} />
                            <Info label="Destino" value={material.destino} />
                            <Info
                              label="Registrado por"
                              value={material.registrado_por || material.creado_por}
                            />
                            <Info
                              label="Fecha"
                              value={formatearFecha(
                                material.registrado_at || material.createdAt
                              )}
                            />
                            <Info
                              label="Excepcion"
                              value={material.motivo_excepcion_material}
                            />
                          </div>
                          <p className="mt-2">{texto(material.observacion)}</p>
                        </div>
                      ))}
                    </div>
                  </Panel>
                )}

                {tieneIntervencionFisica && (
                  <Panel title="Intervencion fisica / mecanica">
                    <Info
                      label="Tipo"
                      value={
                        tipoIntervencionFisica === "ASOCIADA_SERVICIO_TECNICO"
                          ? "Mecanica asociada al servicio tecnico"
                          : tipoIntervencionFisica === "MECANICA_INDEPENDIENTE"
                          ? "Mecanica independiente / mantencion"
                          : "Sin intervencion fisica"
                      }
                    />
                    <Info
                      label="Detalle"
                      value={orden.intervencion_fisica_descripcion}
                    />
                    <Info
                      label="Desmontaje requerido"
                      value={orden.intervencion_desmontaje_requerido ? "Si" : "No"}
                    />
                    <Info
                      label="Vaciado/revision fisica"
                      value={
                        orden.intervencion_vaciado_revision_realizada ? "Si" : "No"
                      }
                    />
                    <Info
                      label="Montaje realizado"
                      value={orden.intervencion_montaje_realizado ? "Si" : "No"}
                    />
                    <Info
                      label="Inspeccion visual"
                      value={orden.intervencion_inspeccion_visual ? "Si" : "No"}
                    />
                    <Info
                      label="Listo programacion/post escritura"
                      value={orden.intervencion_listo_programacion ? "Si" : "No"}
                    />
                    <Info label="Actualizado por" value={orden.intervencion_fisica_por} />
                    <Info
                      label="Fecha"
                      value={formatearFecha(orden.intervencion_fisica_at)}
                    />
                  </Panel>
                )}

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

                <details
                  className="border-4 border-black bg-slate-950 text-white"
                  onToggle={(event) => {
                    if (event.currentTarget.open) {
                      cargarEventosOrden(orden.id);
                    }
                  }}
                >
                  <summary className="cursor-pointer bg-slate-900 p-4 text-sm font-black uppercase tracking-wide">
                    Bitacora operativa
                  </summary>

                  <BitacoraEventosOrden estado={eventosOrden} />
                </details>

                {diagnosticos.length > 0 && (
                  <Panel id="diagnosticos" title="Diagnosticos asociados">
                    <div className="space-y-3">
                      {diagnosticos.map((diagnostico, index) => {
                        const tieneScanner = Boolean(
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
                            {tieneScanner && (
                              <button
                                type="button"
                                onClick={() =>
                                  descargarProtegido(
                                    `/diagnosticos/${diagnostico.id}/scanner`,
                                    `scanner-diagnostico-${diagnostico.id}`
                                  )
                                }
                                className="inline-block mt-2 text-xs font-black uppercase underline"
                              >
                                Descargar foto scanner
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                )}

                {fotos.length > 0 && (
                  <Panel id="fotos" title="Fotos del vehiculo">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {fotos.map((foto, index) => {
                        const tieneArchivo = Boolean(
                          foto.url_foto || foto.url || foto.path
                        );

                        return (
                          <div key={foto.id || index} className="border-2 border-black p-3 bg-white">
                            <p className="text-xs font-black uppercase">
                              {foto.tipo_foto || foto.descripcion || `Foto ${index + 1}`}
                            </p>
                            <p className="text-xs font-bold uppercase text-gray-500">
                              {formatearFecha(foto.createdAt)}
                            </p>
                            {tieneArchivo && (
                              <button
                                type="button"
                                onClick={() =>
                                  descargarProtegido(
                                    `/fotos/${foto.id}/archivo`,
                                    `foto-vehiculo-${foto.id}`
                                  )
                                }
                                className="inline-block mt-2 text-xs font-black uppercase underline"
                              >
                                Descargar foto
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                )}

                {archivos.length > 0 && (
                  <Panel id="archivos" title="File Service / archivos ECU">
                    <div className="space-y-3">
                      {archivos.map((archivo, index) => {
                        const servicios = normalizarJsonLista(
                          archivo.servicios_solicitados
                        );
                        const dtcsSnapshot = normalizarJsonLista(archivo.dtc_snapshot);
                        const responsableFile =
                          archivo.operador_ecu_asignado_a ||
                          archivo.tuner_asignado_a ||
                          archivo.slave_asignado_a ||
                          "Sin responsable";

                        return (
                          <div key={archivo.id || index} className="border-2 border-black p-3 bg-white">
                            <div className="flex flex-wrap gap-2 mb-2">
                              <span className="bg-black text-white px-2 py-1 text-[10px] font-black uppercase">
                                {archivo.estado || "Sin estado"}
                              </span>
                              <span className="bg-blue-600 text-white px-2 py-1 text-[10px] font-black uppercase">
                                {servicios.length
                                  ? `${servicios.length} servicio(s)`
                                  : archivo.tipo_servicio || "Servicio no registrado"}
                              </span>
                            </div>

                            <div className="mb-3 space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {(servicios.length
                                  ? servicios
                                  : [archivo.tipo_servicio || "Servicio no registrado"]
                                ).map((servicio) => (
                                  <span
                                    key={`${archivo.id || index}-svc-${servicio}`}
                                    className="bg-blue-50 border border-blue-700 px-2 py-1 text-[10px] font-black uppercase text-blue-900"
                                  >
                                    {servicioLabel(servicio)}
                                  </span>
                                ))}
                              </div>

                              {dtcsSnapshot.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-black uppercase text-gray-500">
                                    DTC importados
                                  </p>
                                  <div className="mt-1 flex flex-wrap gap-2">
                                    {dtcsSnapshot.map((dtc) => (
                                      <span
                                        key={`${archivo.id || index}-dtc-${dtc.codigo || dtc}`}
                                        className="bg-cyan-50 border border-cyan-700 px-2 py-1 text-[10px] font-black uppercase text-cyan-900"
                                      >
                                        {dtc.codigo || dtc}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-bold uppercase">
                              <Info label="Post escritura" value={archivo.post_escritura_estado || "Pendiente"} />
                              <Info label="DTC post" value={archivo.post_escritura_dtc || "Pendiente"} />
                              <Info label="Post por" value={archivo.post_escritura_por} />
                              <Info label="Fecha post" value={formatearFecha(archivo.post_escritura_at)} />
                              <Info label="Responsable File" value={responsableFile} />
                              <Info label="Tuner / Master" value={archivo.tuner_asignado_a || "-"} />
                              <Info label="Operador ECU" value={archivo.operador_ecu_asignado_a || "-"} />
                              <Info label="Process Guard" value={archivo.proceso_guard_estado || "Sin riesgo"} />
                              <Info label="Cierre tecnico" value={archivo.cierre_tecnico_at ? formatearFecha(archivo.cierre_tecnico_at) : "Pendiente"} />
                              <Info label="Cierre por" value={archivo.cierre_tecnico_por || "-"} />
                              <Info label="Resultado tecnico" value={archivo.resultado_tecnico || "Pendiente"} />
                            </div>

                            {archivo.observacion_cierre_tecnico && (
                              <div className="mt-3 border border-gray-300 bg-gray-50 p-3 text-xs">
                                <p className="font-black uppercase text-gray-500">
                                  Observacion cierre tecnico
                                </p>
                                <p className="mt-1 font-semibold text-gray-900">
                                  {archivo.observacion_cierre_tecnico}
                                </p>
                              </div>
                            )}

                            {archivo.archivo_modificado &&
                              !archivo.cierre_tecnico_at &&
                              !["FINALIZADO_TECNICO", "FINALIZADO", "ARCHIVADO"].includes(
                                String(archivo.estado || "").toUpperCase()
                              ) && (
                                <div className="mt-3 border-2 border-red-700 bg-red-50 p-3 text-xs font-black uppercase text-red-900">
                                  File Service sin cierre tecnico. Revisar post
                                  escritura, resultado tecnico o correccion antes de
                                  considerar la orden lista.
                                </div>
                              )}

                            <div className="flex flex-wrap gap-3 mt-3">
                              {archivo.archivo_original && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    descargarProtegido(
                                      `/archivos-ecu/${archivo.id}/descargar/original`,
                                      `archivo-original-${archivo.id}`
                                    )
                                  }
                                  className="text-xs font-black uppercase underline"
                                >
                                  Archivo original
                                </button>
                              )}
                              {archivo.archivo_modificado && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    descargarProtegido(
                                      `/archivos-ecu/${archivo.id}/descargar/mod`,
                                      `archivo-mod-${archivo.id}`
                                    )
                                  }
                                  className="text-xs font-black uppercase underline"
                                >
                                  Ultimo MOD
                                </button>
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
                Este vehículo aún no tiene historial. Crea una orden real para iniciar trazabilidad.
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

const Panel = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24 border-2 border-black p-4 bg-slate-50">
    <h4 className="text-sm font-black uppercase mb-3">{title}</h4>
    <div className="space-y-2">{children}</div>
  </section>
);

const categoriaEventoClase = (categoria) => {
  const valor = String(categoria || "").toUpperCase();
  if (valor === "COMERCIAL") return "bg-emerald-500 text-black";
  if (valor === "SERVICIO") return "bg-blue-500 text-white";
  return "bg-yellow-400 text-black";
};

const formatearValorMetadata = (valor) => {
  if (valor === true) return "Si";
  if (valor === false) return "No";
  if (valor === null || valor === undefined || valor === "") return "No registrado";
  return String(valor);
};

const MetadataPublicaEvento = ({ metadata }) => {
  const entradas = Object.entries(metadata || {}).filter(([, valor]) => valor !== undefined);
  if (!entradas.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {entradas.map(([clave, valor]) => (
        <span
          key={clave}
          className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase text-slate-200"
        >
          {clave.replace(/_/g, " ")}: {formatearValorMetadata(valor)}
        </span>
      ))}
    </div>
  );
};

const BitacoraEventosOrden = ({ estado }) => {
  const eventos = Array.isArray(estado?.eventos) ? estado.eventos : [];

  if (estado?.cargando) {
    return (
      <div className="p-4 text-xs font-black uppercase text-slate-300">
        Cargando bitacora operativa...
      </div>
    );
  }

  if (estado?.error) {
    return (
      <div className="m-4 border-2 border-red-500 bg-red-950 p-3 text-xs font-black uppercase text-red-100">
        {estado.error}
      </div>
    );
  }

  if (!estado?.cargado) {
    return (
      <div className="p-4 text-xs font-bold uppercase text-slate-400">
        Abre este bloque para cargar el historial automatico de eventos.
      </div>
    );
  }

  if (!eventos.length) {
    return (
      <div className="p-4 text-xs font-black uppercase text-slate-300">
        Sin eventos registrados todavia.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {eventos.map((evento) => (
        <div
          key={evento.id}
          className="border-l-4 border-blue-400 bg-white/10 p-4 text-white"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 text-[10px] font-black uppercase ${categoriaEventoClase(
                evento.categoria
              )}`}
            >
              {evento.categoria || "OPERACION"}
            </span>
            <span className="text-[10px] font-black uppercase text-slate-400">
              {evento.tipo_evento || "EVENTO"}
            </span>
          </div>

          <p className="mt-2 text-sm font-black uppercase">
            {evento.titulo || "Evento operativo"}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-300">
            {evento.descripcion || "Sin descripcion registrada."}
          </p>
          <p className="mt-2 text-[10px] font-black uppercase text-slate-400">
            {formatearFecha(evento.createdAt)} / {evento.usuario || "Sistema"} /{" "}
            {evento.usuario_rol || "Sin rol"}
          </p>

          {(evento.estado_anterior || evento.estado_nuevo) && (
            <p className="mt-2 text-[10px] font-black uppercase text-blue-200">
              Estado: {evento.estado_anterior || "-"} {"->"}{" "}
              {evento.estado_nuevo || "-"}
            </p>
          )}

          <MetadataPublicaEvento metadata={evento.metadata_publica} />
        </div>
      ))}
    </div>
  );
};

const QuickLink = ({ to, label }) => (
  <Link
    to={to}
    className="bg-black text-white px-4 py-3 font-black uppercase text-xs hover:bg-blue-600 transition"
  >
    {label}
  </Link>
);

export default VehiculoDetallePage;
