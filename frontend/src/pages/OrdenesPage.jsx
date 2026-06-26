import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const DATOS_CUENTA = {
  titular: "Gastón Muñoz",
  rut: "19995085-1",
  banco: "Banco Santander",
  tipo: "Cuenta vista",
  numero: "001100329316",
};

const PRIORIDAD_PESO = {
  URGENTE: 1,
  ALTA: 2,
  MEDIA: 3,
  BAJA: 4,
};

const FILTROS_ORDENES = [
  { value: "ACTIVAS", label: "ACTIVAS" },
  { value: "LISTO_ENTREGA", label: "LISTO ENTREGA" },
  { value: "PAGO_PENDIENTE", label: "PAGO PENDIENTE" },
  { value: "ENTREGADAS", label: "ENTREGADAS" },
  { value: "TODAS", label: "TODAS" },
];

const RESPONSABLES_ETAPAS = [
  {
    campo: "diagnostico_asignado_a",
    label: "Diagnóstico / scanner",
    roles: ["OPERADOR_SCANNER", "OPERADOR_ECU", "SUPERVISOR", "OWNER"],
  },
  {
    campo: "operador_ecu_asignado_a",
    label: "Operador ECU",
    roles: ["OPERADOR_ECU", "TUNER", "SUPERVISOR", "OWNER"],
  },
  {
    campo: "mecanico_asignado_a",
    label: "Mecánico",
    roles: ["MECANICO", "SUPERVISOR", "OWNER"],
  },
  {
    campo: "supervisor_asignado_a",
    label: "Supervisor",
    roles: ["SUPERVISOR", "ADMIN", "OWNER"],
  },
];

const ESTADOS_CORRECCION_TECNICA = [
  "CORRECCION_SOLICITADA",
  "EN_REVISION_CORRECCION",
  "MOD_CORRECCION_LISTO",
  "CORRECCION_APLICADA",
  "CERRADA",
];

const PRIORIDADES_CORRECCION = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

const RESPONSABLES_CORRECCION = [
  { value: "", label: "Sin sugerencia" },
  { value: "OPERADOR_ECU", label: "Operador ECU" },
  { value: "TUNER", label: "Tuner / Master" },
  { value: "SUPERVISOR", label: "Supervisor" },
];

const TIPOS_BITACORA = [
  "MEJORA",
  "ERROR_PROCESO",
  "CLIENTE_VOLVIO",
  "RECORDATORIO",
  "OTRO",
];

const TIPOS_INTERVENCION_FISICA = [
  {
    value: "SIN_INTERVENCION",
    label: "Sin intervención física",
  },
  {
    value: "ASOCIADA_SERVICIO_TECNICO",
    label: "Mecánica asociada al servicio técnico",
  },
  {
    value: "MECANICA_INDEPENDIENTE",
    label: "Mecánica independiente / mantención",
  },
];

const CHECKLIST_INTERVENCION_FISICA = [
  {
    campo: "intervencion_desmontaje_requerido",
    label: "Desmontaje requerido",
  },
  {
    campo: "intervencion_vaciado_revision_realizada",
    label: "Vaciado/revisión física realizada",
  },
  {
    campo: "intervencion_montaje_realizado",
    label: "Montaje realizado",
  },
  {
    campo: "intervencion_inspeccion_visual",
    label: "Inspección visual",
  },
  {
    campo: "intervencion_listo_programacion",
    label: "Listo para programación/post escritura",
  },
];

const normalizarCategoriaCliente = (categoria) => {
  const valor = String(categoria || "NORMAL").trim().toUpperCase();
  if (["MAYORISTA", "PROVEEDOR"].includes(valor)) return "TALLER_ALIADO";

  return [
    "NORMAL",
    "VIP",
    "FLOTA",
    "TALLER_ALIADO",
    "GARANTIA_RECLAMO",
    "INTERNO",
  ].includes(valor)
    ? valor
    : "NORMAL";
};

const prioridadSugeridaPorCategoria = (categoria) => {
  const mapa = {
    NORMAL: "MEDIA",
    VIP: "ALTA",
    FLOTA: "ALTA",
    TALLER_ALIADO: "ALTA",
    GARANTIA_RECLAMO: "URGENTE",
    INTERNO: "BAJA",
  };

  return mapa[normalizarCategoriaCliente(categoria)] || "MEDIA";
};

const prioridadClase = (prioridad) => {
  const p = String(prioridad || "MEDIA").toUpperCase();

  if (p === "URGENTE") return "bg-red-600 text-white border-red-900";
  if (p === "ALTA") return "bg-orange-500 text-black border-orange-900";
  if (p === "MEDIA") return "bg-blue-600 text-white border-blue-900";
  return "bg-gray-300 text-black border-gray-700";
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

const puedeCobrarFrontend = () => {
  const rol = localStorage.getItem("rol");
  const username = String(localStorage.getItem("username") || "").toLowerCase();

  return rol === "OWNER" || rol === "ADMIN" || username === "camila" || username === "gaston";
};

const textoQR = (orden) => {
  const patente = orden?.Vehiculo?.patente || "SIN PATENTE";

  return [
    "DATOS TRANSFERENCIA GMTCH TUNE",
    `Titular: ${DATOS_CUENTA.titular}`,
    `RUT: ${DATOS_CUENTA.rut}`,
    `Banco: ${DATOS_CUENTA.banco}`,
    `Tipo: ${DATOS_CUENTA.tipo}`,
    `Cuenta: ${DATOS_CUENTA.numero}`,
    `Monto: $${Number(orden?.monto_total || 0).toLocaleString("es-CL")}`,
    `Glosa: Orden ${orden?.id || ""} ${patente}`,
  ].join("\n");
};

const formatearMonto = (valor) => {
  const monto = Number(valor || 0);
  return monto > 0 ? `$${monto.toLocaleString("es-CL")}` : "Pendiente";
};

const formatearFecha = (valor) => {
  if (!valor) return "No registrado";

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "No registrado";

  return fecha.toLocaleString("es-CL");
};

const obtenerTiempo = (valor) => {
  const fecha = new Date(valor || 0);
  const tiempo = fecha.getTime();
  return Number.isNaN(tiempo) ? 0 : tiempo;
};

const ordenarActivas = (a, b) => {
  const pa = PRIORIDAD_PESO[a.prioridad] || 99;
  const pb = PRIORIDAD_PESO[b.prioridad] || 99;

  if (pa !== pb) return pa - pb;

  return obtenerTiempo(a.createdAt) - obtenerTiempo(b.createdAt);
};

const ordenarEntregadas = (a, b) => {
  const fechaA = a.entregado_at || a.updatedAt;
  const fechaB = b.entregado_at || b.updatedAt;

  return obtenerTiempo(fechaB) - obtenerTiempo(fechaA);
};

function OrdenesPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [feedbackOrdenes, setFeedbackOrdenes] = useState({});
  const [correccionOrdenes, setCorreccionOrdenes] = useState({});
  const [bitacoraOrdenes, setBitacoraOrdenes] = useState({});
  const [filtro, setFiltro] = useState("ACTIVAS");
  const [cargando, setCargando] = useState(false);

  const [formData, setFormData] = useState({
    vehiculoId: "",
    kilometraje: "",
    motivo_ingreso: "",
    monto_total: "",
    prioridad: "MEDIA",
  });

  useEffect(() => {
    let activo = true;

    const cargarInicial = async () => {
      try {
        const [oRes, vRes, uRes] = await Promise.allSettled([
          api.get("/ordenes"),
          api.get("/vehiculos"),
          api.get("/usuarios/responsables"),
        ]);

        if (!activo) return;

        setOrdenes(
          oRes.status === "fulfilled" && Array.isArray(oRes.value.data)
            ? oRes.value.data
            : []
        );
        setVehiculos(
          vRes.status === "fulfilled" && Array.isArray(vRes.value.data)
            ? vRes.value.data
            : []
        );
        setUsuarios(
          uRes.status === "fulfilled" && Array.isArray(uRes.value.data)
            ? uRes.value.data
            : []
        );
      } catch (err) {
        console.error("ERROR CARGANDO FILA:", err.response?.data || err.message);
      }
    };

    cargarInicial();

    return () => {
      activo = false;
    };
  }, []);

  const recargar = async () => {
    try {
      setCargando(true);

      const [oRes, vRes, uRes] = await Promise.allSettled([
        api.get("/ordenes"),
        api.get("/vehiculos"),
        api.get("/usuarios/responsables"),
      ]);

      setOrdenes(
        oRes.status === "fulfilled" && Array.isArray(oRes.value.data)
          ? oRes.value.data
          : []
      );
      setVehiculos(
        vRes.status === "fulfilled" && Array.isArray(vRes.value.data)
          ? vRes.value.data
          : []
      );
      if (uRes.status === "fulfilled" && Array.isArray(uRes.value.data)) {
        setUsuarios(uRes.value.data);
      }
    } catch (err) {
      console.error("ERROR RECARGANDO FILA:", err.response?.data || err.message);
      alert("No se pudo recargar la fila de trabajo.");
    } finally {
      setCargando(false);
    }
  };

  const ordenesFiltradas = useMemo(() => {
    const activas = ordenes.filter((o) => o.estado !== "ENTREGADO");
    const entregadas = ordenes.filter((o) => o.estado === "ENTREGADO");

    if (filtro === "LISTO_ENTREGA") {
      return activas
        .filter((o) => o.estado === "LISTO_PARA_ENTREGA")
        .sort(ordenarActivas);
    }

    if (filtro === "PAGO_PENDIENTE") {
      return activas
        .filter((o) => o.estado_pago !== "PAGADO")
        .sort(ordenarActivas);
    }

    if (filtro === "ENTREGADAS") {
      return entregadas.sort(ordenarEntregadas);
    }

    if (filtro === "TODAS") {
      return [
        ...activas.sort(ordenarActivas),
        ...entregadas.sort(ordenarEntregadas),
      ];
    }

    return activas.sort(ordenarActivas);
  }, [ordenes, filtro]);

  const actualizarForm = (campo, valor) => {
    if (campo === "vehiculoId") {
      const vehiculoSeleccionado = vehiculos.find(
        (item) => String(item.id) === String(valor)
      );
      const prioridadSugerida = prioridadSugeridaPorCategoria(
        vehiculoSeleccionado?.Cliente?.categoria_cliente
      );

      setFormData((prev) => ({
        ...prev,
        vehiculoId: valor,
        prioridad: prioridadSugerida,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setCargando(true);

      await api.post("/ordenes", {
        ...formData,
        estado: "RECEPCIONADO",
      });

      setFormData({
        vehiculoId: "",
        kilometraje: "",
        motivo_ingreso: "",
        monto_total: "",
        prioridad: "MEDIA",
      });

      await recargar();

      alert("Orden técnica generada.");
    } catch (err) {
      console.error("ERROR EMITIENDO ORDEN:", err.response?.data || err.message);
      alert(err.response?.data?.error || "Error creando orden.");
    } finally {
      setCargando(false);
    }
  };

  const cambiarEstado = async (orden, estado) => {
    try {
      await api.patch(`/ordenes/${orden.id}`, {
        estado,
      });

      await recargar();
    } catch (err) {
      console.error("ERROR CAMBIANDO ESTADO:", err.response?.data || err.message);
      alert(err.response?.data?.error || "No se pudo cambiar el estado.");
    }
  };

  const actualizarIntervencionFisica = async (orden, campo, valor) => {
    try {
      await api.patch(`/ordenes/${orden.id}`, {
        [campo]: valor,
      });

      await recargar();
    } catch (err) {
      console.error(
        "ERROR ACTUALIZANDO INTERVENCION FISICA:",
        err.response?.data || err.message
      );
      alert(err.response?.data?.error || "No se pudo actualizar la intervención física.");
    }
  };

  const enviarAMecanicaIndependiente = async (orden) => {
    try {
      await api.patch(`/ordenes/${orden.id}`, {
        estado: "PARA_MECANICA",
        intervencion_fisica_tipo: "MECANICA_INDEPENDIENTE",
      });

      await recargar();
    } catch (err) {
      console.error(
        "ERROR ENVIANDO A MECANICA INDEPENDIENTE:",
        err.response?.data || err.message
      );
      alert(err.response?.data?.error || "No se pudo enviar a mecánica independiente.");
    }
  };

  const usuariosPorRoles = (roles = []) => {
    return usuarios.filter(
      (usuario) => usuario.activo !== false && roles.includes(usuario.rol)
    );
  };

  const feedbackActual = (orden) =>
    feedbackOrdenes[orden.id] || {
      feedback_operario: orden.feedback_operario || "",
      detalle_pendiente: orden.detalle_pendiente || "",
      recomendacion_futura: orden.recomendacion_futura || "",
      requiere_seguimiento: orden.requiere_seguimiento === true,
    };

  const actualizarFeedbackLocal = (orden, campo, valor) => {
    setFeedbackOrdenes((prev) => ({
      ...prev,
      [orden.id]: {
        ...feedbackActual(orden),
        [campo]: valor,
      },
    }));
  };

  const guardarFeedback = async (orden) => {
    const feedback = feedbackActual(orden);

    try {
      await api.patch(`/ordenes/${orden.id}`, {
        feedback_operario: feedback.feedback_operario,
        detalle_pendiente: feedback.detalle_pendiente,
        recomendacion_futura: feedback.recomendacion_futura,
        requiere_seguimiento: feedback.requiere_seguimiento,
      });

      await recargar();
      setFeedbackOrdenes((prev) => {
        const siguiente = { ...prev };
        delete siguiente[orden.id];
        return siguiente;
      });
    } catch (err) {
      console.error("ERROR GUARDANDO FEEDBACK:", err.response?.data || err.message);
      alert(err.response?.data?.error || "No se pudo guardar el feedback.");
    }
  };

  const correccionActual = (orden) =>
    correccionOrdenes[orden.id] || {
      motivo: orden.correccion_motivo || "",
      descripcion: "",
      dtc: orden.correccion_dtc || "",
      sintoma_cliente: "",
      prioridad: orden.correccion_prioridad || "MEDIA",
      responsable_sugerido: orden.correccion_responsable_sugerido || "",
      comentario_tecnico: "",
      cliente_volvio: orden.correccion_cliente_volvio === true,
      archivo_ecu_id: orden.correccion_archivo_ecu_id || "",
    };

  const actualizarCorreccionLocal = (orden, campo, valor) => {
    setCorreccionOrdenes((prev) => ({
      ...prev,
      [orden.id]: {
        ...correccionActual(orden),
        [campo]: valor,
      },
    }));
  };

  const registrarCorreccionTecnica = async (orden) => {
    const correccion = correccionActual(orden);

    if (
      !String(correccion.motivo || "").trim() &&
      !String(correccion.descripcion || "").trim() &&
      !String(correccion.sintoma_cliente || "").trim() &&
      !String(correccion.comentario_tecnico || "").trim()
    ) {
      alert("Debes indicar motivo, descripción, síntoma o comentario técnico.");
      return;
    }

    try {
      await api.post(`/ordenes/${orden.id}/correccion-tecnica`, correccion);

      await recargar();
      setCorreccionOrdenes((prev) => {
        const siguiente = { ...prev };
        delete siguiente[orden.id];
        return siguiente;
      });
      alert("Corrección técnica / postventa registrada.");
    } catch (err) {
      console.error(
        "ERROR REGISTRANDO CORRECCION TECNICA:",
        err.response?.data || err.message
      );
      alert(
        err.response?.data?.error ||
          "No se pudo registrar la corrección técnica."
      );
    }
  };

  const bitacoraActual = (orden) =>
    bitacoraOrdenes[orden.id] || {
      tipo: "CLIENTE_VOLVIO",
      texto: "",
      prioridad: "MEDIA",
      modulo_relacionado: "ORDEN",
    };

  const actualizarBitacoraLocal = (orden, campo, valor) => {
    setBitacoraOrdenes((prev) => ({
      ...prev,
      [orden.id]: {
        ...bitacoraActual(orden),
        [campo]: valor,
      },
    }));
  };

  const agregarBitacora = async (orden) => {
    const bitacora = bitacoraActual(orden);

    if (!String(bitacora.texto || "").trim()) {
      alert("Debes escribir una observación para la bitácora.");
      return;
    }

    try {
      await api.post(`/ordenes/${orden.id}/bitacora`, bitacora);

      await recargar();
      setBitacoraOrdenes((prev) => {
        const siguiente = { ...prev };
        delete siguiente[orden.id];
        return siguiente;
      });
      alert("Observación agregada a la bitácora.");
    } catch (err) {
      console.error("ERROR AGREGANDO BITACORA:", err.response?.data || err.message);
      alert(err.response?.data?.error || "No se pudo agregar la observación.");
    }
  };

  const asignarResponsable = async (orden, campo, valor) => {
    try {
      await api.patch(`/ordenes/${orden.id}`, {
        [campo]: valor,
      });

      await recargar();
    } catch (err) {
      console.error("ERROR ASIGNANDO RESPONSABLE:", err.response?.data || err.message);
      alert(err.response?.data?.error || "No se pudo asignar responsable.");
    }
  };

  const cambiarExcluirEstadisticas = async (orden, valor) => {
    try {
      await api.patch(`/ordenes/${orden.id}`, {
        excluir_estadisticas: valor,
      });

      await recargar();
    } catch (err) {
      console.error(
        "ERROR CAMBIANDO EXCLUSION ESTADISTICAS:",
        err.response?.data || err.message
      );
      alert(err.response?.data?.error || "No se pudo actualizar estadísticas.");
    }
  };

  const cobrarYEntregar = async (orden, medioPago = "TRANSFERENCIA") => {
    const montoTotal = Number(orden.monto_total || 0);
    const montoPagado = Number(orden.monto_pagado || montoTotal);
    const usuario = localStorage.getItem("username") || "sistema";

    if (!Number.isFinite(montoTotal) || montoTotal <= 0) {
      alert("No se puede entregar una orden sin monto total.");
      return;
    }

    const confirmar = window.confirm(
      `¿Confirmar pago y entregar la orden #${orden.id} por $${montoPagado.toLocaleString(
        "es-CL"
      )}?`
    );

    if (!confirmar) return;

    try {
      await api.post(`/ordenes/${orden.id}/cobrar-entregar`, {
        medio_pago: medioPago,
        monto_pagado: montoPagado,
        observacion_pago: `Pago confirmado por ${usuario}`,
        observacion_cierre: `Orden entregada por ${usuario}`,
      });

      await recargar();

      alert("Pago confirmado y orden entregada.");
    } catch (err) {
      console.error("ERROR COBRANDO Y ENTREGANDO:", err.response?.data || err.message);
      alert(err.response?.data?.error || "No se pudo confirmar el pago y entregar.");
    }
  };

  const copiarDatosTransferencia = async (orden) => {
    try {
      await navigator.clipboard.writeText(textoQR(orden));
      alert("Datos de transferencia copiados.");
    } catch {
      alert("No se pudo copiar automáticamente.");
    }
  };

  return (
    <div className="max-w-full mx-auto p-2 space-y-10">
      <div className="bg-black text-white p-8 border-b-8 border-blue-600 shadow-2xl">
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase">
          Fila de Trabajo
        </h1>

        <p className="text-blue-400 font-bold text-xs uppercase tracking-[.3em] mt-2">
          Prioridad operativa · estados · cobro controlado por Gastón / Camila
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-4 bg-white p-6 border-4 border-black space-y-5 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
        >
          <h2 className="text-2xl font-black uppercase">Nueva orden</h2>

          <select
            className="w-full border-4 border-black p-4 font-black bg-white"
            value={formData.vehiculoId}
            onChange={(e) => actualizarForm("vehiculoId", e.target.value)}
            required
          >
            <option value="">Seleccionar vehículo</option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.patente} | {v.marca} {v.modelo} |{" "}
                {v.Cliente?.nombre || "Sin cliente"}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              className="w-full border-4 border-black p-4 font-black"
              placeholder="KM"
              value={formData.kilometraje}
              onChange={(e) => actualizarForm("kilometraje", e.target.value)}
              required
            />

            <select
              className="w-full border-4 border-black p-4 font-black bg-white"
              value={formData.prioridad}
              onChange={(e) => actualizarForm("prioridad", e.target.value)}
            >
              <option value="BAJA">BAJA</option>
              <option value="MEDIA">MEDIA</option>
              <option value="ALTA">ALTA</option>
              <option value="URGENTE">URGENTE</option>
            </select>
          </div>

          {formData.vehiculoId && (
            <p className="text-[10px] font-black uppercase text-gray-500">
              Sugerida por categoría de cliente. Puedes cambiarla manualmente.
            </p>
          )}

          <textarea
            className="w-full border-4 border-black p-4 font-black uppercase"
            rows="4"
            placeholder="Servicio / trabajo requerido"
            value={formData.motivo_ingreso}
            onChange={(e) => actualizarForm("motivo_ingreso", e.target.value)}
            required
          />

          <input
            type="number"
            className="w-full border-4 border-black p-4 font-black text-3xl text-blue-700 bg-blue-50"
            placeholder="Monto"
            value={formData.monto_total}
            onChange={(e) => actualizarForm("monto_total", e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-black text-white py-5 font-black uppercase text-sm disabled:bg-gray-400"
          >
            {cargando ? "Guardando..." : "Emitir orden"}
          </button>
        </form>

        <div className="xl:col-span-8 space-y-5">
          <div className="bg-white border-4 border-black p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black uppercase">
                  Monitor operativo
                </h2>
                <p className="text-xs font-bold uppercase text-gray-500">
                  Ordenado por prioridad y antigüedad.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {FILTROS_ORDENES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFiltro(item.value)}
                    className={`px-4 py-2 border-2 border-black font-black uppercase text-[10px] ${
                      filtro === item.value ? "bg-black text-white" : "bg-white text-black"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={recargar}
                  className="px-4 py-2 border-2 border-blue-600 bg-blue-600 text-white font-black uppercase text-[10px]"
                >
                  Refrescar
                </button>
              </div>
            </div>
          </div>

          {ordenesFiltradas.map((o) => {
            const vip = o.Vehiculo?.Cliente?.categoria_cliente === "VIP";
            const clienteExcluido =
              o.Vehiculo?.Cliente?.excluir_estadisticas === true;
            const ordenExcluida = o.excluir_estadisticas === true;
            const noCuentaEstadisticas = clienteExcluido || ordenExcluida;
            const feedback = feedbackActual(o);
            const correccion = correccionActual(o);
            const bitacora = bitacoraActual(o);
            const archivosOrden = Array.isArray(o.ArchivoECUs)
              ? o.ArchivoECUs
              : Array.isArray(o.ArchivosECU)
              ? o.ArchivosECU
              : [];
            const historialCorreccion = Array.isArray(o.correccion_historial)
              ? o.correccion_historial
              : [];
            const bitacoraOperativa = Array.isArray(o.bitacora_operativa)
              ? o.bitacora_operativa
              : [];
            const tieneCorreccionTecnica =
              Boolean(o.correccion_estado) || historialCorreccion.length > 0;
            const tipoIntervencionFisica =
              o.intervencion_fisica_tipo || "SIN_INTERVENCION";
            const intervencionAsociada =
              tipoIntervencionFisica === "ASOCIADA_SERVICIO_TECNICO";
            const mecanicaIndependiente =
              tipoIntervencionFisica === "MECANICA_INDEPENDIENTE";
            const pagoConfirmado = o.estado_pago === "PAGADO";
            const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
              textoQR(o)
            )}`;

            return (
              <div
                key={o.id}
                className={`bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,0.15)] overflow-hidden ${
                  o.prioridad === "URGENTE" ? "ring-4 ring-red-600" : ""
                }`}
              >
                <div className="p-5 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                  <div className="flex gap-5">
                    <button
                      type="button"
                      onClick={() => (window.location.href = `/vehiculos/${o.vehiculoId}`)}
                      className="text-4xl font-black font-mono text-black bg-gray-100 p-5 border-4 border-black min-w-[170px] text-center"
                    >
                      {o.Vehiculo?.patente || "S/P"}
                    </button>

                    <div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="bg-black text-white px-3 py-1 text-[10px] font-black uppercase">
                          Orden #{String(o.id).padStart(4, "0")}
                        </span>

                        <span
                          className={`px-3 py-1 text-[10px] font-black uppercase border-2 ${prioridadClase(
                            o.prioridad
                          )}`}
                        >
                          {o.prioridad || "MEDIA"}
                        </span>

                        <span
                          className={`px-3 py-1 text-[10px] font-black uppercase ${estadoClase(
                            o.estado
                          )}`}
                        >
                          {o.estado}
                        </span>

                        {vip && (
                          <span className="bg-yellow-400 text-black px-3 py-1 text-[10px] font-black uppercase">
                            ⭐ VIP
                          </span>
                        )}

                        {noCuentaEstadisticas && (
                          <span className="bg-yellow-200 text-black border-2 border-black px-3 py-1 text-[10px] font-black uppercase">
                            No cuenta en estadísticas
                          </span>
                        )}
                      </div>

                      <h3 className="text-2xl font-black uppercase leading-tight">
                        {o.motivo_ingreso}
                      </h3>

                      <p className="text-xs font-bold uppercase text-gray-500 mt-2">
                        Cliente: {o.Vehiculo?.Cliente?.nombre || "No informado"} ·{" "}
                        {o.Vehiculo?.marca} {o.Vehiculo?.modelo}
                      </p>

                      <p className="text-xs font-bold uppercase text-gray-400 mt-1">
                        Entrada: {new Date(o.createdAt).toLocaleString("es-CL")} · KM:{" "}
                        {o.kilometraje || "—"}
                      </p>

                      <div className="mt-4 border-2 border-black bg-white p-3">
                        <p className="text-[10px] font-black uppercase text-gray-500 mb-2">
                          Responsables
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {RESPONSABLES_ETAPAS.map((etapa) => {
                            const opciones = usuariosPorRoles(etapa.roles);
                            const valorActual = o[etapa.campo] || "";

                            return (
                              <label
                                key={etapa.campo}
                                className="text-[10px] font-black uppercase text-gray-500"
                              >
                                {etapa.label}
                                <select
                                  className="mt-1 w-full border-2 border-black p-2 text-[10px] font-bold uppercase bg-white text-black"
                                  value={valorActual}
                                  onChange={(event) =>
                                    asignarResponsable(
                                      o,
                                      etapa.campo,
                                      event.target.value
                                    )
                                  }
                                >
                                  <option value="">Sin asignar</option>
                                  {valorActual &&
                                    !opciones.some(
                                      (usuario) => usuario.username === valorActual
                                    ) && (
                                      <option value={valorActual}>
                                        {valorActual}
                                      </option>
                                    )}
                                  {opciones.map((usuario) => (
                                    <option
                                      key={`${etapa.campo}-${usuario.id}`}
                                      value={usuario.username}
                                    >
                                      {usuario.nombre || usuario.username} ({usuario.rol})
                                    </option>
                                  ))}
                                </select>
                              </label>
                            );
                          })}
                        </div>

                        <p className="text-[9px] font-bold uppercase text-gray-400 mt-2">
                          Recepción: {o.recepcionado_por || "No registrado"}
                        </p>
                        <label className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase text-gray-600">
                          <input
                            type="checkbox"
                            checked={ordenExcluida}
                            onChange={(event) =>
                              cambiarExcluirEstadisticas(o, event.target.checked)
                            }
                          />
                          Excluir estadísticas
                        </label>

                        {clienteExcluido && (
                          <p className="mt-1 text-[9px] font-bold uppercase text-yellow-700">
                            Cliente marcado como demo/test
                          </p>
                        )}
                      </div>

                      <details
                        open={intervencionAsociada || mecanicaIndependiente}
                        className="mt-4 border-2 border-black bg-slate-50 p-3"
                      >
                        <summary className="cursor-pointer text-[10px] font-black uppercase text-gray-700">
                          Intervención física / mecánica
                        </summary>

                        <div className="mt-3 space-y-3">
                          <p className="border-2 border-blue-700 bg-blue-50 p-2 text-[10px] font-bold uppercase text-blue-900">
                            La intervención física asociada a DPF/escape forma
                            parte del servicio técnico y no se gestiona como
                            mantención independiente. Servicio sujeto a
                            evaluación técnica, normativa aplicable y uso
                            autorizado según corresponda.
                          </p>

                          <label className="block text-[10px] font-black uppercase text-gray-500">
                            Tipo de intervención física
                            <select
                              className="mt-1 w-full border-2 border-black bg-white p-2 text-[10px] font-bold uppercase text-black"
                              value={tipoIntervencionFisica}
                              onChange={(event) =>
                                actualizarIntervencionFisica(
                                  o,
                                  "intervencion_fisica_tipo",
                                  event.target.value
                                )
                              }
                            >
                              {TIPOS_INTERVENCION_FISICA.map((tipo) => (
                                <option key={tipo.value} value={tipo.value}>
                                  {tipo.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <textarea
                            className="w-full border-2 border-black p-2 text-xs font-bold"
                            rows="2"
                            placeholder="Detalle físico asociado. Ej: DPF/FAP, EGR, SCR/AdBlue/DEF, línea de escape, desmontaje ECU..."
                            defaultValue={o.intervencion_fisica_descripcion || ""}
                            onBlur={(event) =>
                              actualizarIntervencionFisica(
                                o,
                                "intervencion_fisica_descripcion",
                                event.target.value
                              )
                            }
                          />

                          {intervencionAsociada && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {CHECKLIST_INTERVENCION_FISICA.map((item) => (
                                <label
                                  key={item.campo}
                                  className="flex items-center gap-2 border border-gray-300 bg-white p-2 text-[10px] font-black uppercase text-gray-600"
                                >
                                  <input
                                    type="checkbox"
                                    checked={o[item.campo] === true}
                                    onChange={(event) =>
                                      actualizarIntervencionFisica(
                                        o,
                                        item.campo,
                                        event.target.checked
                                      )
                                    }
                                  />
                                  {item.label}
                                </label>
                              ))}
                            </div>
                          )}

                          {mecanicaIndependiente && (
                            <p className="border-2 border-orange-700 bg-orange-50 p-2 text-[10px] font-bold uppercase text-orange-900">
                              Este trabajo se considera mecánica independiente /
                              mantención. Puede gestionarse en estado PARA_MECANICA
                              y debe tener responsable mecánico cuando aplique.
                            </p>
                          )}

                          {(o.intervencion_fisica_por || o.intervencion_fisica_at) && (
                            <p className="text-[9px] font-bold uppercase text-gray-500">
                              Actualizado por:{" "}
                              {o.intervencion_fisica_por || "No registrado"} ·{" "}
                              {formatearFecha(o.intervencion_fisica_at)}
                            </p>
                          )}
                        </div>
                      </details>

                      <details className="mt-4 border-2 border-black bg-slate-50 p-3">
                        <summary className="cursor-pointer text-[10px] font-black uppercase text-gray-700">
                          Feedback operativo
                        </summary>

                        <div className="mt-3 space-y-3">
                          <textarea
                            className="w-full border-2 border-black p-2 text-xs font-bold"
                            rows="2"
                            placeholder="Observación del operario"
                            value={feedback.feedback_operario}
                            onChange={(event) =>
                              actualizarFeedbackLocal(
                                o,
                                "feedback_operario",
                                event.target.value
                              )
                            }
                          />

                          <textarea
                            className="w-full border-2 border-black p-2 text-xs font-bold"
                            rows="2"
                            placeholder="Detalle pendiente"
                            value={feedback.detalle_pendiente}
                            onChange={(event) =>
                              actualizarFeedbackLocal(
                                o,
                                "detalle_pendiente",
                                event.target.value
                              )
                            }
                          />

                          <textarea
                            className="w-full border-2 border-black p-2 text-xs font-bold"
                            rows="2"
                            placeholder="Recomendación futura"
                            value={feedback.recomendacion_futura}
                            onChange={(event) =>
                              actualizarFeedbackLocal(
                                o,
                                "recomendacion_futura",
                                event.target.value
                              )
                            }
                          />

                          <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-600">
                            <input
                              type="checkbox"
                              checked={feedback.requiere_seguimiento}
                              onChange={(event) =>
                                actualizarFeedbackLocal(
                                  o,
                                  "requiere_seguimiento",
                                  event.target.checked
                                )
                              }
                            />
                            Requiere seguimiento
                          </label>

                          {(o.feedback_por || o.feedback_at) && (
                            <p className="text-[9px] font-bold uppercase text-gray-500">
                              Feedback por: {o.feedback_por || "No registrado"} ·{" "}
                              {formatearFecha(o.feedback_at)}
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={() => guardarFeedback(o)}
                            className="bg-black text-white px-4 py-2 font-black uppercase text-[10px]"
                          >
                            Guardar feedback
                          </button>
                        </div>
                      </details>

                      <details
                        className={`mt-4 border-2 p-3 ${
                          tieneCorreccionTecnica
                            ? "border-red-700 bg-red-50"
                            : "border-black bg-slate-50"
                        }`}
                      >
                        <summary className="cursor-pointer text-[10px] font-black uppercase text-gray-700">
                          Solicitud de corrección / postventa técnica
                        </summary>

                        {tieneCorreccionTecnica && (
                          <div className="mt-3 border-2 border-red-700 bg-white p-3 text-[10px] font-bold uppercase text-red-900">
                            <p>Estado: {o.correccion_estado || "Pendiente"}</p>
                            <p>
                              Prioridad: {o.correccion_prioridad || "MEDIA"}
                            </p>
                            <p>
                              Motivo: {o.correccion_motivo || "No registrado"}
                            </p>
                            <p>DTC: {o.correccion_dtc || "No registrado"}</p>
                            <p>
                              Responsable sugerido:{" "}
                              {o.correccion_responsable_sugerido ||
                                "No registrado"}
                            </p>
                            <p>
                              Cliente volvió:{" "}
                              {o.correccion_cliente_volvio ? "Sí" : "No"}
                            </p>
                            <p>
                              Creada por:{" "}
                              {o.correccion_creada_por || "No registrado"} ·{" "}
                              {formatearFecha(o.correccion_creada_at)}
                            </p>
                          </div>
                        )}

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            className="border-2 border-black p-2 text-xs font-bold"
                            placeholder="Motivo. Ej: DTC postventa"
                            value={correccion.motivo}
                            onChange={(event) =>
                              actualizarCorreccionLocal(
                                o,
                                "motivo",
                                event.target.value
                              )
                            }
                          />

                          <input
                            className="border-2 border-black p-2 text-xs font-bold"
                            placeholder="Código DTC si existe"
                            value={correccion.dtc}
                            onChange={(event) =>
                              actualizarCorreccionLocal(
                                o,
                                "dtc",
                                event.target.value
                              )
                            }
                          />

                          <textarea
                            className="md:col-span-2 border-2 border-black p-2 text-xs font-bold"
                            rows="2"
                            placeholder="Descripción de la corrección / postventa"
                            value={correccion.descripcion}
                            onChange={(event) =>
                              actualizarCorreccionLocal(
                                o,
                                "descripcion",
                                event.target.value
                              )
                            }
                          />

                          <textarea
                            className="md:col-span-2 border-2 border-black p-2 text-xs font-bold"
                            rows="2"
                            placeholder="Síntoma reportado por cliente"
                            value={correccion.sintoma_cliente}
                            onChange={(event) =>
                              actualizarCorreccionLocal(
                                o,
                                "sintoma_cliente",
                                event.target.value
                              )
                            }
                          />

                          <select
                            className="border-2 border-black p-2 text-xs font-bold uppercase bg-white text-black"
                            value={correccion.prioridad}
                            onChange={(event) =>
                              actualizarCorreccionLocal(
                                o,
                                "prioridad",
                                event.target.value
                              )
                            }
                          >
                            {PRIORIDADES_CORRECCION.map((prioridad) => (
                              <option key={prioridad} value={prioridad}>
                                {prioridad}
                              </option>
                            ))}
                          </select>

                          <select
                            className="border-2 border-black p-2 text-xs font-bold uppercase bg-white text-black"
                            value={correccion.responsable_sugerido}
                            onChange={(event) =>
                              actualizarCorreccionLocal(
                                o,
                                "responsable_sugerido",
                                event.target.value
                              )
                            }
                          >
                            {RESPONSABLES_CORRECCION.map((item) => (
                              <option key={item.value || "sin"} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>

                          <select
                            className="border-2 border-black p-2 text-xs font-bold uppercase bg-white text-black"
                            value={correccion.archivo_ecu_id}
                            onChange={(event) =>
                              actualizarCorreccionLocal(
                                o,
                                "archivo_ecu_id",
                                event.target.value
                              )
                            }
                          >
                            <option value="">Sin archivo ECU relacionado</option>
                            {archivosOrden.map((archivo) => (
                              <option key={archivo.id} value={archivo.id}>
                                File #{archivo.id} · {archivo.estado || "Sin estado"}
                              </option>
                            ))}
                          </select>

                          <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-600">
                            <input
                              type="checkbox"
                              checked={!!correccion.cliente_volvio}
                              onChange={(event) =>
                                actualizarCorreccionLocal(
                                  o,
                                  "cliente_volvio",
                                  event.target.checked
                                )
                              }
                            />
                            Cliente volvió al taller
                          </label>

                          <textarea
                            className="md:col-span-2 border-2 border-black p-2 text-xs font-bold"
                            rows="2"
                            placeholder="Comentario técnico interno"
                            value={correccion.comentario_tecnico}
                            onChange={(event) =>
                              actualizarCorreccionLocal(
                                o,
                                "comentario_tecnico",
                                event.target.value
                              )
                            }
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => registrarCorreccionTecnica(o)}
                          className="mt-3 bg-red-700 text-white px-4 py-2 font-black uppercase text-[10px]"
                        >
                          Registrar postventa técnica
                        </button>

                        {historialCorreccion.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-[10px] font-black uppercase text-gray-500">
                              Historial de corrección
                            </p>
                            {historialCorreccion.slice(-3).map((evento, index) => (
                              <div
                                key={`${evento.fecha || index}-${index}`}
                                className="border border-gray-300 bg-white p-2 text-[10px] font-bold uppercase text-gray-600"
                              >
                                <p>
                                  {evento.estado || evento.tipo || "Evento"} ·{" "}
                                  {formatearFecha(evento.fecha)}
                                </p>
                                <p>{evento.motivo || evento.comentario_tecnico}</p>
                                <p>Por: {evento.creado_por || evento.actualizado_por || "-"}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </details>

                      <details className="mt-4 border-2 border-black bg-slate-50 p-3">
                        <summary className="cursor-pointer text-[10px] font-black uppercase text-gray-700">
                          Bitácora rápida operativa
                        </summary>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <select
                            className="border-2 border-black p-2 text-xs font-bold uppercase bg-white text-black"
                            value={bitacora.tipo}
                            onChange={(event) =>
                              actualizarBitacoraLocal(o, "tipo", event.target.value)
                            }
                          >
                            {TIPOS_BITACORA.map((tipo) => (
                              <option key={tipo} value={tipo}>
                                {tipo}
                              </option>
                            ))}
                          </select>

                          <select
                            className="border-2 border-black p-2 text-xs font-bold uppercase bg-white text-black"
                            value={bitacora.prioridad}
                            onChange={(event) =>
                              actualizarBitacoraLocal(
                                o,
                                "prioridad",
                                event.target.value
                              )
                            }
                          >
                            {PRIORIDADES_CORRECCION.map((prioridad) => (
                              <option key={prioridad} value={prioridad}>
                                {prioridad}
                              </option>
                            ))}
                          </select>

                          <input
                            className="border-2 border-black p-2 text-xs font-bold"
                            placeholder="Módulo relacionado"
                            value={bitacora.modulo_relacionado}
                            onChange={(event) =>
                              actualizarBitacoraLocal(
                                o,
                                "modulo_relacionado",
                                event.target.value
                              )
                            }
                          />

                          <textarea
                            className="md:col-span-3 border-2 border-black p-2 text-xs font-bold"
                            rows="2"
                            placeholder="Anotar observación operativa"
                            value={bitacora.texto}
                            onChange={(event) =>
                              actualizarBitacoraLocal(o, "texto", event.target.value)
                            }
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => agregarBitacora(o)}
                          className="mt-3 bg-black text-white px-4 py-2 font-black uppercase text-[10px]"
                        >
                          Anotar observación
                        </button>

                        {bitacoraOperativa.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {bitacoraOperativa.slice(-3).map((evento, index) => (
                              <div
                                key={`${evento.fecha || index}-${index}`}
                                className="border border-gray-300 bg-white p-2 text-[10px] font-bold uppercase text-gray-600"
                              >
                                <p>
                                  {evento.tipo || "OTRO"} ·{" "}
                                  {evento.prioridad || "MEDIA"} ·{" "}
                                  {formatearFecha(evento.fecha)}
                                </p>
                                <p>{evento.texto}</p>
                                <p>Por: {evento.creado_por || "-"}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </details>
                    </div>
                  </div>

                  <div
                    className={`xl:text-right border-2 border-black p-4 ${
                      pagoConfirmado ? "bg-green-50" : "bg-yellow-50"
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase text-gray-500">
                      Operación / pago
                    </p>

                    <p
                      className={`inline-block px-3 py-1 text-[10px] font-black uppercase ${
                        pagoConfirmado
                          ? "bg-green-600 text-white"
                          : "bg-yellow-400 text-black"
                      }`}
                    >
                      {o.estado_pago || "PENDIENTE"}
                    </p>

                    <p className="text-xl font-black mt-2">
                      {formatearMonto(o.monto_total)}
                    </p>

                    <div className="mt-3 space-y-1 text-[10px] font-bold uppercase text-gray-700">
                      <p>Estado operativo: {o.estado || "Pendiente"}</p>
                      <p>Estado pago: {o.estado_pago || "Pendiente"}</p>
                      <p>Medio de pago: {o.medio_pago || "Pendiente"}</p>
                      <p>Monto total: {formatearMonto(o.monto_total)}</p>
                      <p>Monto pagado: {formatearMonto(o.monto_pagado)}</p>
                      <p>Fecha pago: {formatearFecha(o.fecha_pago)}</p>
                      <p>Cobrado por: {o.cobrado_por || "No registrado"}</p>
                      <p>Entregado por: {o.entregado_por || "No registrado"}</p>
                      <p>Fecha entrega: {formatearFecha(o.entregado_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t-4 border-black bg-slate-50 p-5 grid grid-cols-1 xl:grid-cols-3 gap-5">
                  <div className="xl:col-span-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => cambiarEstado(o, "PARA_DIAGNOSTICO")}
                      className="bg-blue-600 text-white px-4 py-2 font-black uppercase text-[10px]"
                    >
                      Para diagnóstico
                    </button>

                    <button
                      type="button"
                      onClick={() => cambiarEstado(o, "EN_PROGRAMACION")}
                      className="bg-purple-600 text-white px-4 py-2 font-black uppercase text-[10px]"
                    >
                      Programación
                    </button>

                    <button
                      type="button"
                      onClick={() => enviarAMecanicaIndependiente(o)}
                      className="bg-orange-500 text-black px-4 py-2 font-black uppercase text-[10px]"
                    >
                      Mecánica independiente
                    </button>

                    <button
                      type="button"
                      onClick={() => cambiarEstado(o, "LISTO_PARA_ENTREGA")}
                      className="bg-green-600 text-white px-4 py-2 font-black uppercase text-[10px]"
                    >
                      Listo entrega
                    </button>

                    {puedeCobrarFrontend() && (
                      <button
                        type="button"
                        onClick={() => cobrarYEntregar(o, "TRANSFERENCIA")}
                        className="bg-green-700 text-white px-4 py-2 font-black uppercase text-[10px]"
                      >
                        Confirmar pago y entregar
                      </button>
                    )}
                  </div>

                  <div className="bg-white border-2 border-black p-4 flex gap-4 items-center">
                    <img src={qrSrc} alt="QR transferencia" className="w-24 h-24" />

                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-500">
                        Transferencia
                      </p>
                      <p className="text-xs font-black uppercase">
                        Santander · Cuenta vista
                      </p>
                      <p className="text-xs font-bold">{DATOS_CUENTA.numero}</p>

                      <button
                        type="button"
                        onClick={() => copiarDatosTransferencia(o)}
                        className="mt-2 bg-blue-600 text-white px-3 py-1 font-black uppercase text-[9px]"
                      >
                        Copiar datos
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {ordenesFiltradas.length === 0 && (
            <div className="p-20 text-center border-4 border-dashed border-gray-300 rounded-3xl bg-white">
              <p className="text-gray-300 font-black text-3xl uppercase tracking-widest">
                Sin actividad en fila de trabajo
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrdenesPage;
