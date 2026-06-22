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

function OrdenesPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
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
        const [oRes, vRes] = await Promise.all([
          api.get("/ordenes"),
          api.get("/vehiculos"),
        ]);

        if (!activo) return;

        setOrdenes(Array.isArray(oRes.data) ? oRes.data : []);
        setVehiculos(Array.isArray(vRes.data) ? vRes.data : []);
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

      const [oRes, vRes] = await Promise.all([
        api.get("/ordenes"),
        api.get("/vehiculos"),
      ]);

      setOrdenes(Array.isArray(oRes.data) ? oRes.data : []);
      setVehiculos(Array.isArray(vRes.data) ? vRes.data : []);
    } catch (err) {
      console.error("ERROR RECARGANDO FILA:", err.response?.data || err.message);
      alert("No se pudo recargar la fila de trabajo.");
    } finally {
      setCargando(false);
    }
  };

  const ordenesFiltradas = useMemo(() => {
    const base =
      filtro === "ACTIVAS"
        ? ordenes.filter((o) => o.estado !== "ENTREGADO")
        : filtro === "ENTREGADAS"
        ? ordenes.filter((o) => o.estado === "ENTREGADO")
        : ordenes;

    return [...base].sort((a, b) => {
      const pa = PRIORIDAD_PESO[a.prioridad] || 99;
      const pb = PRIORIDAD_PESO[b.prioridad] || 99;

      if (pa !== pb) return pa - pb;

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [ordenes, filtro]);

  const actualizarForm = (campo, valor) => {
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

  const marcarPagado = async (orden, medioPago = "TRANSFERENCIA") => {
    const confirmar = window.confirm(
      `¿Confirmar pago de la orden #${orden.id} por $${Number(
        orden.monto_total || 0
      ).toLocaleString("es-CL")}?`
    );

    if (!confirmar) return;

    try {
      await api.patch(`/ordenes/${orden.id}`, {
        estado_pago: "PAGADO",
        medio_pago: medioPago,
        monto_pagado: Number(orden.monto_total || 0),
        observacion_pago: `Pago confirmado por ${localStorage.getItem("username")}`,
      });

      await recargar();

      alert("Pago confirmado.");
    } catch (err) {
      console.error("ERROR CONFIRMANDO PAGO:", err.response?.data || err.message);
      alert(err.response?.data?.error || "No se pudo confirmar el pago.");
    }
  };

  const finalizarEntrega = async (orden) => {
    const confirmar = window.confirm(
      `¿Finalizar y entregar la orden #${orden.id}?`
    );

    if (!confirmar) return;

    try {
      await api.patch(`/ordenes/${orden.id}`, {
        estado: "ENTREGADO",
      });

      await recargar();

      alert("Orden entregada.");
    } catch (err) {
      console.error("ERROR ENTREGANDO ORDEN:", err.response?.data || err.message);
      alert(err.response?.data?.error || "No se pudo entregar la orden.");
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
                {["ACTIVAS", "TODAS", "ENTREGADAS"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFiltro(item)}
                    className={`px-4 py-2 border-2 border-black font-black uppercase text-[10px] ${
                      filtro === item ? "bg-black text-white" : "bg-white text-black"
                    }`}
                  >
                    {item}
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
                    </div>
                  </div>

                  <div className="xl:text-right">
                    <p className="text-[10px] font-black uppercase text-gray-500">
                      Pago
                    </p>

                    <p
                      className={`inline-block px-3 py-1 text-[10px] font-black uppercase ${
                        o.estado_pago === "PAGADO"
                          ? "bg-green-600 text-white"
                          : "bg-yellow-400 text-black"
                      }`}
                    >
                      {o.estado_pago || "PENDIENTE"}
                    </p>

                    <p className="text-xl font-black mt-2">
                      ${Number(o.monto_total || 0).toLocaleString("es-CL")}
                    </p>
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
                      onClick={() => cambiarEstado(o, "PARA_MECANICA")}
                      className="bg-orange-500 text-black px-4 py-2 font-black uppercase text-[10px]"
                    >
                      Para mecánica
                    </button>

                    <button
                      type="button"
                      onClick={() => cambiarEstado(o, "LISTO_PARA_ENTREGA")}
                      className="bg-green-600 text-white px-4 py-2 font-black uppercase text-[10px]"
                    >
                      Listo entrega
                    </button>

                    {puedeCobrarFrontend() && (
                      <>
                        <button
                          type="button"
                          onClick={() => marcarPagado(o, "TRANSFERENCIA")}
                          className="bg-black text-white px-4 py-2 font-black uppercase text-[10px]"
                        >
                          Confirmar pago
                        </button>

                        <button
                          type="button"
                          onClick={() => finalizarEntrega(o)}
                          className="bg-green-700 text-white px-4 py-2 font-black uppercase text-[10px]"
                        >
                          Entregar
                        </button>
                      </>
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