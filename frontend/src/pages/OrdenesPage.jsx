import { useState, useEffect } from 'react';
import api from '../services/api';

function OrdenesPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [formData, setFormData] = useState({ vehiculoId: '', kilometraje: '', motivo_ingreso: '', monto_total: '' });

  useEffect(() => {
    const cargar = async () => {
      try {
        const [oRes, vRes] = await Promise.all([api.get('/ordenes'), api.get('/vehiculos')]);
        setOrdenes(oRes.data); 
        setVehiculos(vRes.data);
      } catch (err) { 
        console.error("Error cargando datos de matriz:", err); 
      }
    };
    cargar();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/ordenes', formData);
      setFormData({ vehiculoId: '', kilometraje: '', motivo_ingreso: '', monto_total: '' });
      const res = await api.get('/ordenes'); 
      setOrdenes(res.data);
      alert("ORDEN TÉCNICA GENERADA");
    } catch (err) { 
      console.error("Fallo al emitir orden:", err);
      alert("Error en servidor"); 
    }
  };

  return (
    <div className="p-8">
      {/* HEADER INDUSTRIAL */}
      <div className="flex justify-between items-center mb-10 bg-slate-900 p-6 rounded-lg text-white shadow-xl border-b-4 border-blue-600">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">Terminal de Recepción v1.0</h1>
          <p className="text-blue-400 font-mono text-xs uppercase tracking-widest">Gmtch Tune Management System</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Master Admin</div>
          <div className="font-black text-blue-500 text-xl">GASTON</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* PANEL LATERAL DE CARGA */}
        <div className="lg:col-span-4">
          <form onSubmit={handleSubmit} className="bg-white border-2 border-black p-8 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
            <h2 className="text-sm font-black text-black uppercase border-b-2 border-black pb-2">Nueva Entrada</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Unidad (Patente)</label>
                <select className="w-full border-2 border-black p-3 rounded-lg font-bold text-black outline-none focus:bg-yellow-50" value={formData.vehiculoId} onChange={e => setFormData({...formData, vehiculoId: e.target.value})} required>
                  <option value="">Seleccione...</option>
                  {vehiculos.map(v => <option key={v.id} value={v.id}>{v.patente} - {v.marca}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">KM</label>
                  <input type="number" className="w-full border-2 border-black p-3 rounded-lg font-bold text-black" value={formData.kilometraje} onChange={e => setFormData({...formData, kilometraje: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Monto $</label>
                  <input type="number" className="w-full border-2 border-black p-3 rounded-lg font-black text-blue-600 bg-blue-50" value={formData.monto_total} onChange={e => setFormData({...formData, monto_total: e.target.value})} required />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Servicio Técnico</label>
                <textarea className="w-full border-2 border-black p-3 rounded-lg font-bold h-24 uppercase" value={formData.motivo_ingreso} onChange={e => setFormData({...formData, motivo_ingreso: e.target.value})} required />
              </div>
            </div>

            <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-600 transition-all">Emitir Registro</button>
          </form>
        </div>

        {/* MONITOR DE ÓRDENES (TABLA) */}
        <div className="lg:col-span-8">
          <div className="bg-white border-2 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-black text-white text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="p-4">Ref.</th>
                  <th className="p-4">Unidad</th>
                  <th className="p-4">Diagnóstico / Trabajo</th>
                  <th className="p-4 text-right">Monto</th>
                  <th className="p-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold text-black">
                {ordenes.slice(0, 10).reverse().map(o => (
                  <tr key={o.id} className="border-b border-gray-100 hover:bg-yellow-50 transition">
                    <td className="p-4 text-slate-400 font-mono text-xs">#{o.id}</td>
                    <td className="p-4 text-blue-700 font-black uppercase">{o.Vehiculo?.patente || 'S/P'}</td>
                    <td className="p-4 text-xs uppercase">{o.motivo_ingreso}</td>
                    <td className="p-4 text-right font-black text-lg">${parseInt(o.monto_total).toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-[9px] font-black uppercase">{o.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrdenesPage;
