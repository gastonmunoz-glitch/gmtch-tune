import { useState, useEffect } from "react";
import api from "../services/api";

function ArchivosECUPage() {
  const [archivos, setArchivos] = useState([]);
  const [fileMod, setFileMod] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const fetchArchivosMatriz = async () => {
      try {
        const res = await api.get("/archivos-ecu");
        setArchivos(res.data);
      } catch (err) {
        console.error("ERROR SISTEMA: Fallo en sincronización de archivos", err);
      }
    };

    fetchArchivosMatriz();
  }, []);

  const recargarMatriz = async () => {
    try {
      const res = await api.get("/archivos-ecu");
      setArchivos(res.data);
    } catch (err) {
      console.error("Error al refrescar matriz:", err);
    }
  };

  const handleInyectarModificado = async (id) => {
    if (!fileMod) {
      return alert("SISTEMA: SELECCIONE EL BINARIO REPROGRAMADO");
    }

    const fd = new FormData();
    fd.append("archivo", fileMod);

    try {
      setCargando(true);

      await api.post(`/archivos-ecu/${id}/modificado`, fd);

      alert("✅ SOFTWARE REPROGRAMADO ENVIADO AL TALLER");
      setFileMod(null);
      await recargarMatriz();
    } catch (err) {
      console.error("Fallo en inyección de binario:", err);
      alert("ERROR EN LA INYECCIÓN");
    } finally {
      setCargando(false);
    }
  };

  const notificarWhatsApp = (id, patente) => {
    // Sin el "+", solo el código de país y número
    const telefono = "56962267642";

    const texto = `*SISTEMA GMTCH TUNE*%0A---------------------------%0A✅ *NUEVO ARCHIVO CARGADO*%0A*ID ORDEN:* #${id}%0A*PATENTE:* ${patente}%0A*ESTADO:* ESPERANDO REPROGRAMACIÓN%0A---------------------------%0A_Favor procesar en WinOLS_`;

    const url = `https://api.whatsapp.com/send?phone=${telefono}&text=${texto}`;
    window.open(url, "_blank");
  };

  return (
    <div className="max-w-full mx-auto p-2">
      <div className="bg-black text-white p-8 border-b-8 border-blue-600 mb-10 flex justify-between items-center shadow-2xl">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase">
            Estación de Ingeniería: File Service
          </h1>
          <p className="text-blue-400 font-bold text-xs uppercase tracking-[.3em] mt-2">
            Central de Gestión de Binarios Gmtch Tune
          </p>
        </div>

        <div className="text-right border-l-4 border-gray-800 pl-10">
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
            Registros Totales
          </p>
          <p className="text-5xl font-black text-white">{archivos.length}</p>
        </div>
      </div>

      <div className="space-y-12">
        {archivos.map((arq) => (
          <div
            key={arq.id}
            className="bg-white border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
          >
            <div className="bg-gray-100 border-b-4 border-black p-4 flex justify-between items-center">
              <div>
                <span className="bg-black text-white px-3 py-1 text-[10px] font-black uppercase">
                  REF-ID #{arq.id}
                </span>

                <h2 className="text-2xl font-black text-black uppercase mt-1">
                  HW: {arq.marca_ecu} {arq.modelo_ecu}
                </h2>
              </div>

              <button
                onClick={() =>
                  notificarWhatsApp(
                    arq.id,
                    arq.patente || arq.orden?.patente || arq.ordenId || "SIN PATENTE"
                  )
                }
                className="bg-green-500 text-black px-4 py-2 border-2 border-black font-black text-[10px] uppercase hover:bg-black hover:text-white transition"
              >
                📲 Notificar al Máster
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 divide-x-4 divide-black">
              <div className="p-8 space-y-6">
                <h3 className="bg-blue-600 text-white px-4 py-1 font-black text-xs uppercase inline-block shadow-md">
                  ENTRADA: SOFTWARE ORIGINAL (SLAVE)
                </h3>

                <div className="bg-slate-50 p-10 border-4 border-dashed border-gray-300 text-center">
                  <p className="text-[10px] font-black text-gray-400 mb-6 uppercase tracking-widest italic">
                    Archivo leído de la unidad física
                  </p>

                  <a
                    href={arq.archivo_original}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-black text-white px-12 py-5 font-black text-lg uppercase hover:bg-blue-600 transition-all shadow-xl inline-block"
                  >
                    Descargar Binario Original
                  </a>
                </div>
              </div>

              <div className="p-8 bg-slate-50 space-y-6">
                <h3 className="bg-green-600 text-white px-4 py-1 font-black text-xs uppercase inline-block shadow-md">
                  SALIDA: SOFTWARE REPROGRAMADO (MÁSTER)
                </h3>

                {arq.archivo_modificado ? (
                  <div className="space-y-6">
                    <div className="bg-green-100 p-8 border-4 border-green-600 text-center">
                      <p className="text-green-800 font-black text-2xl mb-6 uppercase italic tracking-tighter">
                        ✅ PROCESADO Y LISTO PARA CARGA
                      </p>

                      <a
                        href={arq.archivo_modificado}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-green-600 text-white px-10 py-4 font-black text-sm uppercase hover:bg-black transition-all shadow-lg inline-block"
                      >
                        Descargar Archivo Modificado
                      </a>
                    </div>

                    <div className="bg-white p-6 border-4 border-black shadow-inner">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-2">
                        Instrucciones Técnicas:
                      </p>

                      <p className="text-lg font-black text-black uppercase leading-tight">
                        {arq.observaciones || "Cargar sin notas adicionales."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 bg-white p-6 border-4 border-black shadow-inner">
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-black uppercase tracking-tighter italic">
                        Seleccionar Software Reprogramado:
                      </label>

                      <input
                        type="file"
                        className="w-full border-2 border-black p-4 text-xs font-black bg-gray-50"
                        onChange={(e) => setFileMod(e.target.files?.[0] || null)}
                      />
                    </div>

                    <button
                      onClick={() => handleInyectarModificado(arq.id)}
                      disabled={cargando}
                      className={`w-full py-6 font-black uppercase text-xl shadow-2xl transition-all ${
                        cargando
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-black text-white hover:bg-green-600"
                      }`}
                    >
                      {cargando ? "PROCESANDO BINARIO..." : "INYECTAR REPROGRAMACIÓN"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ArchivosECUPage;