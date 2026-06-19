import { useState } from "react";
import axios from "axios";
import { UploadCloud, Send } from "lucide-react";

const FileService = () => {
  const [tipoServicio, setTipoServicio] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [comentarios, setComentarios] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [motor, setMotor] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tipoServicio) {
      alert("Selecciona un tipo de servicio");
      return;
    }

    if (!archivo) {
      alert("Debes subir un archivo");
      return;
    }

    if (!marca || !modelo || !motor) {
      alert("Completa marca, modelo y motor");
      return;
    }

    try {
      setLoading(true);

      const formDataToSend = new FormData();
      formDataToSend.append("tipoServicio", tipoServicio);
      formDataToSend.append("archivo", archivo);
      formDataToSend.append("comentarios", comentarios);
      formDataToSend.append("marca", marca);
      formDataToSend.append("modelo", modelo);
      formDataToSend.append("motor", motor);
      formDataToSend.append("userId", "frontend_test");

      const res = await axios.post(
        "http://localhost:3000/api/files/upload-ecu",
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert(res.data.message || "Archivo cargado y equipo notificado");

      // Limpiar formulario
      setTipoServicio("");
      setArchivo(null);
      setComentarios("");
      setMarca("");
      setModelo("");
      setMotor("");
    } catch (error) {
      console.error("Error al enviar archivo:", error);
      alert("Error al enviar el archivo. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-10">
      <div className="max-w-3xl mx-auto bg-slate-800 border border-slate-700 rounded-2xl p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-500">
            File Service
          </h1>
          <p className="text-slate-400 mt-2">
            Sube tu archivo ECU, completa los datos del vehículo y selecciona el servicio requerido.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del vehículo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400 ml-1">
                Marca
              </label>
              <input
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white focus:border-blue-500 outline-none"
                placeholder="Ej: Toyota"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 ml-1">
                Modelo
              </label>
              <input
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white focus:border-blue-500 outline-none"
                placeholder="Ej: Hilux"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 ml-1">
                Motor / Cilindrada
              </label>
              <input
                value={motor}
                onChange={(e) => setMotor(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white focus:border-blue-500 outline-none"
                placeholder="Ej: 2.8 D4D"
              />
            </div>
          </div>

          {/* Tipo de servicio */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 ml-1">
              Tipo de Servicio
            </label>

            <select
              value={tipoServicio}
              onChange={(e) => setTipoServicio(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white focus:border-blue-500 outline-none"
            >
              <option value="">-- Selecciona un servicio --</option>

              <optgroup label="🔧 Reprogramaciones Stage">
                <option value="stage1">Stage 1 (+15-25% HP)</option>
                <option value="stage2">Stage 2 (+25-35% HP)</option>
                <option value="stage3">Stage 3 (Competición)</option>
              </optgroup>

              <optgroup label="🚫 Eliminaciones">
                <option value="dpf_off">DPF Off (Filtro Partículas)</option>
                <option value="egr_off">EGR Off (Válvula Recirculación)</option>
                <option value="adblue_off">AdBlue Off (Sistema Urea)</option>
                <option value="dtc_off">DTC Off (Códigos de Error)</option>
                <option value="swirl_off">Swirl Flaps Off</option>
                <option value="lambda_off">Lambda/O2 Off</option>
              </optgroup>

              <optgroup label="⚡ Especiales">
                <option value="custom_tune">Custom Tune (Personalizado)</option>
                <option value="eco_tune">Eco Tune (Ahorro Combustible)</option>
                <option value="vmax_off">V-Max Limiter Off</option>
                <option value="launch_control">Launch Control</option>
                <option value="pops_bangs">Pops & Bangs</option>
              </optgroup>

              <optgroup label="🔄 Servicios Combinados">
                <option value="full_delete">
                  Full Delete (DPF+EGR+AdBlue)
                </option>
                <option value="stage1_delete">
                  Stage 1 + Full Delete
                </option>
              </optgroup>
            </select>
          </div>

          {/* Archivo */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 ml-1">
              Archivo ECU
            </label>

            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer bg-slate-900 hover:border-blue-500 transition-all">
              <UploadCloud className="mb-3 text-blue-500" size={36} />

              <span className="text-slate-300">
                {archivo ? archivo.name : "Haz clic para subir archivo"}
              </span>

              <input
                type="file"
                className="hidden"
                onChange={(e) => setArchivo(e.target.files[0])}
              />
            </label>
          </div>

          {/* Comentarios */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 ml-1">
              Comentarios adicionales
            </label>

            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              rows="4"
              placeholder="Ej: síntomas, DTC, notas para el programador..."
              className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:bg-slate-700"
          >
            <Send size={20} />
            {loading ? "Enviando..." : "Enviar Solicitud"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FileService;
