import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const FORM_INICIAL = {
  ordenId: "",
  fase: "PRE_FILE_SERVICE",
  fallas_detectadas: "",
  codigos_dtc: "",
  sin_dtc: false,
  observaciones: "",
};

const normalizarTexto = (valor) => String(valor ?? "").trim();

const obtenerVehiculoOrden = (orden) => {
  return orden?.Vehiculo || orden?.vehiculo || null;
};

const obtenerClienteOrden = (orden) => {
  const vehiculo = obtenerVehiculoOrden(orden);
  return vehiculo?.Cliente || vehiculo?.cliente || null;
};

function DiagnosticoPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [formData, setFormData] = useState({ ...FORM_INICIAL });
  const [scannerFile, setScannerFile] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      try {
        const res = await api.get("/ordenes");

        if (!activo) return;

        setOrdenes(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("ERROR CARGANDO ORDENES:", err);
        setAviso({
          tipo: "error",
          mensaje: "No se pudieron cargar las órdenes.",
        });
      }
    };

    cargar();

    return () => {
      activo = false;
    };
  }, []);

  const ordenSeleccionada = useMemo(() => {
    if (!formData.ordenId) return null;
    return ordenes.find((orden) => String(orden.id) === String(formData.ordenId));
  }, [ordenes, formData.ordenId]);

  const ordenesFiltradas = useMemo(() => {
    const q = normalizarTexto(busqueda).toLowerCase();

    return ordenes
      .filter((orden) => {
        const vehiculo = obtenerVehiculoOrden(orden);
        const cliente = obtenerClienteOrden(orden);

        const texto = [
          orden.id,
          orden.estado,
          orden.motivo_ingreso,
          vehiculo?.patente,
          vehiculo?.marca,
          vehiculo?.modelo,
          vehiculo?.anio,
          vehiculo?.vin,
          cliente?.nombre,
          cliente?.telefono,
        ]
          .join(" ")
          .toLowerCase();

        if (!q) return true;
        return texto.includes(q);
      })
      .slice(0, 25);
  }, [ordenes, busqueda]);

  const mostrarAviso = (tipo, mensaje) => {
    setAviso({ tipo, mensaje });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const actualizarForm = (campo, valor) => {
    setFormData((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const seleccionarOrden = (orden) => {
    const vehiculo = obtenerVehiculoOrden(orden);
    const cliente = obtenerClienteOrden(orden);

    setFormData((prev) => ({
      ...prev,
      ordenId: String(orden.id),
    }));

    setBusqueda(
      `${vehiculo?.patente || "SIN PATENTE"} | ${vehiculo?.marca || ""} ${
        vehiculo?.modelo || ""
      } | ${cliente?.nombre || ""} | Orden #${orden.id}`
    );
  };

  const limpiarForm = () => {
    setFormData({ ...FORM_INICIAL });
    setScannerFile(null);
    setBusqueda("");
  };

  const validar = () => {
    if (!formData.ordenId) {
      return "Debes seleccionar una orden.";
    }

    if (!scannerFile) {
      return "Debes subir foto o captura del scanner.";
    }

    if (!formData.sin_dtc && !normalizarTexto(formData.codigos_dtc)) {
      return "Debes escribir los DTC o marcar SIN DTC PRESENTES.";
    }

    if (
      !normalizarTexto(formData.fallas_detectadas) &&
      !normalizarTexto(formData.observaciones)
    ) {
      return "Debes registrar fallas detectadas u observación del diagnóstico.";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errorValidacion = validar();

    if (errorValidacion) {
      mostrarAviso("error", errorValidacion);
      return;
    }

    try {
      setCargando(true);

      const fd = new FormData();

      fd.append("ordenId", formData.ordenId);
      fd.append("fase", formData.fase);
      fd.append("fallas_detectadas", formData.fallas_detectadas);
      fd.append("codigos_dtc", formData.sin_dtc ? "SIN DTC PRESENTES" : formData.codigos_dtc);
      fd.append("sin_dtc", formData.sin_dtc ? "true" : "false");
      fd.append("observaciones", formData.observaciones);

      if (scannerFile) {
        fd.append("scanner", scannerFile);
      }

      await api.post("/diagnosticos", fd);

      mostrarAviso("ok", "Diagnóstico obligatorio guardado correctamente.");
      limpiarForm();
    } catch (err) {
      console.error("ERROR GUARDANDO DIAGNOSTICO:", err.response?.data || err.message);

      mostrarAviso(
        "error",
        err.response?.data?.error || "No se pudo guardar el diagnóstico."
      );
    } finally {
      setCargando(false);
    }
  };

  const renderAviso = () => {
    if (!aviso) return null;

    const clase =
      aviso.tipo === "ok"
        ? "bg-green-100 border-green-600 text-green-900"
        : "bg-red-100 border-red-600 text-red-900";

    return (
      <div className={`border-4 p-4 font-black uppercase text-xs mb-6 ${clase}`}>
        {aviso.mensaje}
      </div>
    );
  };

  const vehiculoSeleccionado = obtenerVehiculoOrden(ordenSeleccionada);
  const clienteSeleccionado = obtenerClienteOrden(ordenSeleccionada);

  return (
    <div className="max-w-6xl mx-auto p-2 space-y-8">
      <div className="bg-black text-white p-8 border-b-8 border-red-600 shadow-2xl">
        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase">
          Diagnóstico obligatorio
        </h1>

        <p className="text-red-400 font-bold text-xs uppercase tracking-[.25em] mt-2">
          Scanner · DTC · Evidencia previa a File Service
        </p>
      </div>

      {renderAviso()}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-2xl border-4 border-black space-y-6"
      >
        <section className="border-4 border-black p-5 bg-slate-50">
          <h2 className="text-lg font-black uppercase mb-3">
            Seleccionar orden por patente, cliente o número
          </h2>

          <input
            className="border-2 border-black p-4 w-full font-black uppercase bg-white"
            placeholder="Ej: ABCD12, BMW, Econorte, #15..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              actualizarForm("ordenId", "");
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 max-h-96 overflow-auto">
            {ordenesFiltradas.map((orden) => {
              const vehiculo = obtenerVehiculoOrden(orden);
              const cliente = obtenerClienteOrden(orden);
              const activo = String(formData.ordenId) === String(orden.id);

              return (
                <button
                  key={orden.id}
                  type="button"
                  onClick={() => seleccionarOrden(orden)}
                  className={`text-left border-2 p-4 transition ${
                    activo
                      ? "bg-black text-white border-red-600"
                      : "bg-white text-black border-black hover:bg-red-50"
                  }`}
                >
                  <p className="text-xl font-black uppercase">
                    {vehiculo?.patente || "SIN PATENTE"}
                  </p>

                  <p className="text-xs font-bold uppercase opacity-70">
                    Orden #{orden.id} · {vehiculo?.marca || "Marca"}{" "}
                    {vehiculo?.modelo || "Modelo"} {vehiculo?.anio || ""}
                  </p>

                  <p className="text-xs font-bold uppercase mt-1 opacity-70">
                    Cliente: {cliente?.nombre || "No informado"}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {ordenSeleccionada && (
          <section className="bg-black text-white border-4 border-red-600 p-5">
            <p className="text-[10px] font-black uppercase text-red-400">
              Orden seleccionada
            </p>

            <h3 className="text-2xl font-black uppercase">
              #{ordenSeleccionada.id} | {vehiculoSeleccionado?.patente || "SIN PATENTE"}
            </h3>

            <p className="text-xs font-bold uppercase text-gray-300 mt-1">
              {vehiculoSeleccionado?.marca || ""} {vehiculoSeleccionado?.modelo || ""}{" "}
              {vehiculoSeleccionado?.anio || ""} | Cliente:{" "}
              {clienteSeleccionado?.nombre || "No informado"}
            </p>
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">
              Fase del diagnóstico
            </label>

            <select
              className="w-full border-2 border-black p-3 rounded-lg font-bold bg-white"
              value={formData.fase}
              onChange={(e) => actualizarForm("fase", e.target.value)}
            >
              <option value="PRE_FILE_SERVICE">Antes de File Service</option>
              <option value="POST_ESCRITURA">Post escritura / prueba</option>
              <option value="CONTROL_FINAL">Control final</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">
              Foto / captura scanner obligatoria
            </label>

            <input
              type="file"
              accept="image/*,.pdf"
              className="w-full border-2 border-black p-3 rounded-lg font-bold bg-white"
              onChange={(e) => setScannerFile(e.target.files?.[0] || null)}
            />

            {scannerFile && (
              <p className="text-xs font-bold uppercase mt-2">
                Seleccionado: {scannerFile.name}
              </p>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">
              Síntomas / fallas detectadas
            </label>

            <textarea
              className="w-full border-2 border-black p-3 rounded-lg h-32 font-bold"
              value={formData.fallas_detectadas}
              onChange={(e) => actualizarForm("fallas_detectadas", e.target.value)}
              placeholder="Ej: pérdida de potencia, modo emergencia, testigo motor..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-4 mb-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase">
                Códigos DTC
              </label>

              <label className="flex items-center gap-2 text-[10px] font-black uppercase">
                <input
                  type="checkbox"
                  checked={formData.sin_dtc}
                  onChange={(e) => {
                    const marcado = e.target.checked;
                    actualizarForm("sin_dtc", marcado);
                    if (marcado) {
                      actualizarForm("codigos_dtc", "SIN DTC PRESENTES");
                    } else {
                      actualizarForm("codigos_dtc", "");
                    }
                  }}
                />
                Sin DTC presentes
              </label>
            </div>

            <textarea
              className="w-full border-2 border-black p-3 rounded-lg h-32 font-mono font-black text-red-600"
              value={formData.codigos_dtc}
              disabled={formData.sin_dtc}
              onChange={(e) => actualizarForm("codigos_dtc", e.target.value)}
              placeholder="P0401, P2002, P20E8..."
            />
          </div>
        </section>

        <section>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">
            Observaciones del diagnóstico
          </label>

          <textarea
            className="w-full border-2 border-black p-3 rounded-lg h-32 font-bold"
            value={formData.observaciones}
            onChange={(e) => actualizarForm("observaciones", e.target.value)}
            placeholder="Condiciones del vehículo, si se borraron DTC, si vuelven de inmediato, etc."
          />
        </section>

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-red-600 text-white py-5 rounded-xl font-black text-sm uppercase shadow-xl disabled:bg-gray-400"
        >
          {cargando ? "Guardando..." : "Certificar diagnóstico obligatorio"}
        </button>
      </form>
    </div>
  );
}

export default DiagnosticoPage;