import { useState, useEffect } from 'react';
import api from '../services/api';

function DiagnosticoPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [formData, setFormData] = useState({ ordenId: '', fallas_detectadas: '', codigos_dtc: '', observaciones: '' });

  useEffect(() => {
    const cargar = async () => { const res = await api.get('/ordenes'); setOrdenes(res.data); };
    cargar();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await api.post('/diagnosticos', formData); alert("Informe Técnico Guardado"); } 
    catch (err) { console.error(err); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-black text-slate-800 uppercase mb-8 border-b-2 border-slate-200 pb-4 italic">🔬 Informe de Diagnóstico y Scanner</h1>
      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-xl shadow-2xl border border-slate-200 space-y-6">
        <div className="bg-slate-50 p-4 rounded-lg border-l-4 border-red-500">
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Orden de Trabajo Asociada</label>
          <select className="w-full border-2 p-3 rounded-lg font-bold" value={formData.ordenId} onChange={(e) => setFormData({...formData, ordenId: e.target.value})} required>
            <option value="">Seleccionar Orden...</option>
            {ordenes.map(o => <option key={o.id} value={o.id}>ID #{o.id} - {o.Vehiculo?.patente}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Síntomas / Fallas</label>
            <textarea className="w-full border-2 p-3 rounded-lg h-32" value={formData.fallas_detectadas} onChange={(e) => setFormData({...formData, fallas_detectadas: e.target.value})} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Códigos DTC</label>
            <textarea className="w-full border-2 p-3 rounded-lg h-32 font-mono text-red-600" value={formData.codigos_dtc} onChange={(e) => setFormData({...formData, codigos_dtc: e.target.value})} placeholder="P0001, P0401..." />
          </div>
        </div>
        <button type="submit" className="w-full bg-red-600 text-white py-5 rounded-xl font-black text-sm uppercase shadow-xl">Certificar Diagnóstico</button>
      </form>
    </div>
  );
}

export default DiagnosticoPage;
