import { useEffect, useState } from "react";
import api from "../services/api";

const TIPOS_FOTO = [
  { value: "FRONTAL", label: "Frente del vehículo" },
  { value: "TRASERA", label: "Parte trasera" },
  { value: "LATERAL_IZQUIERDO", label: "Lateral izquierdo" },
  { value: "LATERAL_DERECHO", label: "Lateral derecho" },
  { value: "INTERIOR", label: "Interior" },
  { value: "TABLERO_KM", label: "Tablero / kilometraje" },
  { value: "MOTOR", label: "Motor" },
  { value: "DANO", label: "Daño o detalle previo" },
  { value: "VIN", label: "VIN / número de chasis" },
  { value: "SCANNER", label: "Lectura del scanner" },
  { value: "ECU", label: "ECU" },
  { value: "ENTREGA", label: "Estado al entregar" },
  { value: "OTRO", label: "Otro" },
];

function FotosPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [ordenId, setOrdenId] = useState("");
  const [archivos, setArchivos] = useState([]);
  const [tipoFoto, setTipoFoto] = useState("FRONTAL");
  const [descripcion, setDescripcion] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    const cargarOrdenesActivas = async () => {
      try {
        const res = await api.get("/ordenes");
        setOrdenes(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("ERROR DE COMUNICACION:", err);
        setAviso({
          tipo: "error",
          mensaje: "No se pudieron cargar las órdenes. Actualiza la página o avisa a soporte.",
        });
      }
    };

    cargarOrdenesActivas();
  }, []);

  const limpiarFormulario = (form) => {
    setArchivoState([]);
    setOrdenId("");
    setTipoFoto("FRONTAL");
    setDescripcion("");
    form.reset();
  };

  const setArchivoState = (lista) => {
    setArchivos(Array.from(lista || []));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!ordenId) {
      setAviso({ tipo: "error", mensaje: "Falta elegir la orden a la que pertenecen las fotos." });
      return;
    }

    if (!archivos.length) {
      setAviso({ tipo: "error", mensaje: "Falta seleccionar una o más fotos para guardar." });
      return;
    }

    const fd = new FormData();
    fd.append("ordenId", ordenId);
    fd.append("tipo_foto", tipoFoto);
    fd.append("descripcion", descripcion);

    archivos.forEach((archivo) => {
      fd.append("fotos", archivo);
    });

    try {
      setSubiendo(true);

      const res = await api.post("/fotos", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setAviso({
        tipo: "ok",
        mensaje: res.data?.cantidad
          ? `Fotos guardadas correctamente: ${res.data.cantidad}.`
          : "Fotos guardadas correctamente.",
      });

      limpiarFormulario(e.target);
    } catch (err) {
      console.error("ERROR DE CARGA:", err.response?.data || err.message);
      setAviso({
        tipo: "error",
        mensaje:
          err.response?.data?.message ||
          err.response?.data?.error ||
          "No se pudieron guardar las fotos. Revisa el formato y vuelve a intentarlo.",
      });
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-2">
      <h1 className="text-4xl font-black text-black uppercase mb-8 border-b-8 border-black pb-4">
        Subir fotos de la orden
      </h1>

      <div className="bg-yellow-400 p-4 border-4 border-black mb-8 font-black text-black text-xs uppercase tracking-widest">
        Una orden sin fotos queda incompleta
      </div>

      {aviso && (
        <div
          className={`mb-6 border-4 p-4 text-sm font-black ${
            aviso.tipo === "ok"
              ? "border-green-600 bg-green-50 text-green-900"
              : "border-red-600 bg-red-50 text-red-900"
          }`}
        >
          {aviso.mensaje}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-10 border-4 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] space-y-8"
      >
        <div>
          <label className="block text-xs font-black text-black uppercase mb-3 tracking-tighter">
            1. ¿A qué orden pertenecen?
          </label>
          <select
            className="w-full border-4 border-black p-5 text-xl font-black text-black bg-gray-50 outline-none focus:bg-yellow-50 appearance-none"
            value={ordenId}
            onChange={(e) => setOrdenId(e.target.value)}
            required
          >
            <option value="">-- SELECCIONAR ORDEN --</option>
            {ordenes.map((o) => (
              <option key={o.id} value={o.id}>
                ORDEN #{String(o.id).padStart(4, "0")} - {o.Vehiculo?.patente || "S/P"}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-black text-black uppercase mb-3 tracking-tighter">
              2. ¿Qué muestran las fotos?
            </label>
            <select
              className="w-full border-4 border-black p-4 font-black bg-white"
              value={tipoFoto}
              onChange={(e) => setTipoFoto(e.target.value)}
            >
              {TIPOS_FOTO.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs font-bold text-slate-600">
              Todas las fotos seleccionadas recibirán esta clasificación.
            </p>
          </div>

          <div>
            <label className="block text-xs font-black text-black uppercase mb-3 tracking-tighter">
              3. Descripción opcional
            </label>
            <input
              className="w-full border-4 border-black p-4 font-bold"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: rayón paragolpes, scanner inicial..."
            />
          </div>
        </div>

        <div className="bg-gray-50 p-12 border-4 border-dashed border-black text-center relative hover:bg-gray-100 transition">
          <label className="block text-xs font-black text-black uppercase mb-6 tracking-tighter">
            4. Seleccionar una o más fotos
          </label>
          <input
            name="fotos"
            type="file"
            accept="image/*"
            multiple
            className="font-black text-black text-sm file:mr-4 file:py-2 file:px-4 file:border-2 file:border-black file:text-xs file:font-black file:bg-white hover:file:bg-black hover:file:text-white file:transition"
            onChange={(e) => setArchivoState(Array.from(e.target.files || []))}
            required
          />

          <div className="mt-5 text-left bg-white border-2 border-black p-4">
            <p className="text-xs font-black uppercase mb-2">
              Fotos seleccionadas: {archivos.length}
            </p>
            {archivos.length > 0 && (
              <ul className="text-xs font-bold uppercase space-y-1">
                {archivos.map((archivo) => (
                  <li key={`${archivo.name}-${archivo.size}`}>{archivo.name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={subiendo}
          className="w-full bg-blue-600 text-white py-8 font-black uppercase text-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:shadow-none transition-all active:translate-y-1 disabled:bg-gray-400"
        >
          {subiendo ? "Guardando..." : "Guardar fotos"}
        </button>

        <p className="text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
          Las fotos quedarán guardadas en el historial del vehículo.
        </p>
      </form>
    </div>
  );
}

export default FotosPage;
