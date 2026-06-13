import { useState, useEffect } from 'react';
import api from '../services/api';

function FotosPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [ordenId, setOrdenId] = useState('');
  const [archivo, setArchivo] = useState(null);

  // CARGA DE DATOS SIN ERRORES DE LINTER
  useEffect(() => {
    const cargarOrdenesActivas = async () => {
      try {
        const res = await api.get('/ordenes');
        setOrdenes(res.data);
      } catch (err) {
        console.error("ERROR DE COMUNICACIÓN:", err);
      }
    };
    cargarOrdenesActivas();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!archivo || !ordenId) return alert("SISTEMA: Entrada de datos incompleta.");

    const fd = new FormData();
    fd.append('foto', archivo);
    fd.append('ordenId', ordenId);

    try {
      await api.post('/fotos', fd, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      alert("SISTEMA: Evidencia fotográfica inyectada correctamente.");
      setArchivo(null);
      setOrdenId('');
      e.target.reset();
    } catch (err) {
      console.error("ERROR DE CARGA:", err);
      alert("ERROR: Fallo en el servidor de archivos.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-2">
      <h1 className="text-4xl font-black text-black uppercase mb-8 border-b-8 border-black pb-4">📸 PANEL DE INYECCIÓN FOTOGRÁFICA</h1>
      
      <div className="bg-yellow-400 p-4 border-4 border-black mb-8 font-black text-black text-xs uppercase tracking-widest">
        MODO DE CARGA DE EVIDENCIA TÉCNICA - GMTCH TUNE
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-10 border-4 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] space-y-10">
        
        {/* SELECCIÓN DE ORDEN */}
        <div>
          <label className="block text-xs font-black text-black uppercase mb-3 tracking-tighter">1. Vincular a Orden de Trabajo</label>
          <select 
            className="w-full border-4 border-black p-5 text-xl font-black text-black bg-gray-50 outline-none focus:bg-yellow-50 appearance-none" 
            value={ordenId} 
            onChange={(e) => setOrdenId(e.target.value)} 
            required
          >
            <option value="">-- SELECCIONAR ORDEN ACTIVA --</option>
            {ordenes.map(o => (
              <option key={o.id} value={o.id}>ORDEN #{o.id.toString().padStart(4, '0')} - {o.Vehiculo?.patente || 'S/P'}</option>
            ))}
          </select>
        </div>
        
        {/* CARGA DE ARCHIVO */}
        <div className="bg-gray-50 p-12 border-4 border-dashed border-black text-center relative hover:bg-gray-100 transition">
          <label className="block text-xs font-black text-black uppercase mb-6 tracking-tighter">2. Captura de Cámara o Selector de Archivos</label>
          <input 
            type="file" 
            accept="image/*" 
            className="font-black text-black text-sm file:mr-4 file:py-2 file:px-4 file:border-2 file:border-black file:text-xs file:font-black file:bg-white hover:file:bg-black hover:file:text-white file:transition" 
            onChange={(e) => setArchivo(e.target.files[0])} 
            required 
          />
        </div>

        {/* BOTÓN DE ACCIÓN */}
        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white py-8 font-black uppercase text-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:shadow-none transition-all active:translate-y-1"
        >
          SUBIR AL EXPEDIENTE
        </button>

        <p className="text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
          Las imágenes se indexan automáticamente en el historial del vehículo.
        </p>
      </form>
    </div>
  );
}

export default FotosPage;
