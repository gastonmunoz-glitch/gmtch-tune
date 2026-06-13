import { useState, useEffect } from 'react';
import api from '../services/api';

function ArchivosECUPage() {
  const [archivos, setArchivos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [archivoMod, setArchivoMod] = useState(null);
  const [notas, setNotas] = useState('');
  
  const [nuevoArchivo, setNuevoArchivo] = useState({ ordenId: '', marca_ecu: '', modelo_ecu: '', version_software: '' });
  const [fileOriginal, setFileOriginal] = useState(null);

  useEffect(() => {
    const sincronizarServidor = async () => {
      try {
        const [aRes, oRes] = await Promise.all([
          api.get('/archivos-ecu'),
          api.get('/ordenes')
        ]);
        setArchivos(aRes.data);
        setOrdenes(oRes.data);
      } catch (err) { 
        console.error("ERROR DE CONEXIÓN CON MATRIZ:", err); 
      }
    };
    sincronizarServidor();
  }, []);

  const handleSubirOriginal = async (e) => {
    e.preventDefault();
    if (!fileOriginal) return alert("SISTEMA: SELECCIONE ARCHIVO BINARIO");
    
    const fd = new FormData();
    fd.append('archivo', fileOriginal);
    // CORRECCIÓN AQUÍ: k en lugar de key
    Object.keys(nuevoArchivo).forEach(k => fd.append(k, nuevoArchivo[k]));

    try {
      await api.post('/archivos-ecu', fd);
      alert("✅ ARCHIVO ORIGINAL CARGADO EXITOSAMENTE");
      window.location.reload();
    } catch (err) { 
      console.error(err);
      alert("ERROR EN LA CARGA");
    }
  };

  const handleSubirModificado = async (id) => {
    const fd = new FormData();
    if (archivoMod) fd.append('archivo', archivoMod);
    fd.append('observaciones', notas);

    try {
      await api.post(`/archivos-ecu/${id}/modificado`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("✅ SOFTWARE REPROGRAMADO ENVIADO AL TALLER");
      setArchivoMod(null);
      setNotas('');
      const res = await api.get('/archivos-ecu');
      setArchivos(res.data);
    } catch (err) { 
      console.error(err);
      alert("ERROR EN LA INYECCIÓN"); 
    }
  };

  return (
    <div className="max-w-full mx-auto p-2">
      <div className="bg-black text-white p-8 border-b-8 border-blue-600 mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Estación de Ingeniería: File Service</h1>
          <p className="text-blue-400 font-bold text-xs uppercase tracking-[.3em] mt-2">Master & Slave Management System</p>
        </div>
        <div className="text-right border-l-4 border-gray-800 pl-10">
          <p className="text-xs font-black text-gray-500 uppercase">Registros en Matriz</p>
          <p className="text-4xl font-black text-white">{archivos.length}</p>
        </div>
      </div>

      {/* CARGA DE ORIGINALES (NIVEL TALLER) */}
      <div className="bg-white border-4 border-black p-8 mb-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="font-black text-black uppercase text-lg mb-6 border-b-4 border-black pb-2 tracking-tighter">📥 Inyectar Nueva Lectura (Original)</h2>
        <form onSubmit={handleSubirOriginal} className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
          <div>
            <label className="block text-[10px] font-black text-black uppercase mb-2">Orden Relacionada</label>
            <select className="w-full border-2 border-black p-3 text-sm font-bold bg-gray-50" onChange={e => setNuevoArchivo({...nuevoArchivo, ordenId: e.target.value})} required>
              <option value="">Seleccionar...</option>
              {ordenes.map(o => <option key={o.id} value={o.id}>OT#{o.id} - {o.Vehiculo?.patente}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-black uppercase mb-2">Marca ECU</label>
            <input type="text" className="w-full border-2 border-black p-3 text-sm font-bold bg-gray-50" onChange={e => setNuevoArchivo({...nuevoArchivo, marca_ecu: e.target.value})} placeholder="EJ: BOSCH" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-black uppercase mb-2">Modelo ECU</label>
            <input type="text" className="w-full border-2 border-black p-3 text-sm font-bold bg-gray-50" onChange={e => setNuevoArchivo({...nuevoArchivo, modelo_ecu: e.target.value})} placeholder="EJ: EDC17C60" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-black uppercase mb-2">Archivo Binario</label>
            <input type="file" className="w-full text-[10px] font-black" onChange={e => setFileOriginal(e.target.files[0])} required />
          </div>
          <button type="submit" className="bg-black text-white py-4 font-black uppercase text-xs hover:bg-blue-600 transition shadow-lg">Enviar al Máster</button>
        </form>
      </div>

      {/* MATRIZ DE PROCESAMIENTO */}
      <div className="space-y-10">
        <h2 className="font-black text-black uppercase text-sm tracking-[0.2em] mb-4 ml-2">Monitor de Archivos en Nube</h2>
        {archivos.map(arq => (
          <div key={arq.id} className="bg-white border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="bg-black text-white p-4 flex justify-between items-center">
              <span className="font-black text-2xl uppercase tracking-tighter italic">HARDWARE: {arq.marca_ecu} {arq.modelo_ecu}</span>
              <span className="bg-blue-600 text-white px-6 py-1 text-xs font-black uppercase">Expediente #{arq.id}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 divide-x-4 divide-black">
              {/* ORIGINAL */}
              <div className="p-10 space-y-6">
                <h3 className="bg-blue-600 text-white px-4 py-1 font-black text-xs uppercase inline-block">Entrada (Slave File)</h3>
                <div className="bg-gray-100 p-10 border-4 border-dashed border-gray-300 text-center">
                  <p className="text-xs font-black text-gray-400 mb-6 uppercase tracking-widest">Archivo leído de la unidad</p>
                  <a href={arq.archivo_original} target="_blank" rel="noreferrer" className="bg-black text-white px-12 py-5 font-black text-base uppercase hover:bg-blue-600 transition-all shadow-2xl">Descargar Original</a>
                </div>
              </div>

              {/* MODIFICADO */}
              <div className="p-10 bg-slate-50 space-y-6">
                <h3 className="bg-green-600 text-white px-4 py-1 font-black text-xs uppercase inline-block">Salida (Master Repro)</h3>
                {arq.archivo_modificado ? (
                  <div className="space-y-6">
                    <div className="bg-green-100 p-8 border-4 border-green-600 text-center">
                       <p className="text-green-800 font-black text-xl mb-6 uppercase italic">✅ Software Procesado con Éxito</p>
                       <a href={arq.archivo_modificado} target="_blank" rel="noreferrer" className="bg-green-600 text-white px-10 py-4 font-black text-sm uppercase hover:bg-black transition-all">Descargar Modificado</a>
                    </div>
                    <div className="bg-white p-6 border-4 border-black shadow-inner">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Instrucciones de Carga:</p>
                      <p className="text-lg font-black text-black uppercase leading-tight">{arq.observaciones || 'Sin instrucciones adicionales del ingeniero.'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-white p-6 border-2 border-black">
                      <label className="block text-[10px] font-black text-black uppercase mb-2">1. Seleccionar Mapa Modificado</label>
                      <input type="file" className="w-full text-xs font-black" onChange={(e) => setArchivoMod(e.target.files[0])} />
                    </div>
                    <div className="bg-white p-6 border-2 border-black">
                      <label className="block text-[10px] font-black text-black uppercase mb-2">2. Instrucciones para el Taller</label>
                      <textarea className="w-full text-base font-black text-black uppercase outline-none focus:bg-yellow-50" rows="3" placeholder="ESCRIBA NOTAS TÉCNICAS AQUÍ..." onChange={(e) => setNotas(e.target.value)} />
                    </div>
                    <button onClick={() => handleSubirModificado(arq.id)} className="w-full bg-black text-white py-6 font-black uppercase text-lg shadow-2xl hover:bg-green-600 transition-all">Inyectar Modificado</button>
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
