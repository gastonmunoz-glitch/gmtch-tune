import { useState, useEffect } from 'react';
import api from '../services/api';

function OrdenesPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [formData, setFormData] = useState({ 
    vehiculoId: '', 
    kilometraje: '', 
    motivo_ingreso: '', 
    monto_total: '',
    prioridad: 'MEDIA',
    operador_asignado: 'GASTON'
  });

  // SOLUCIÓN AL ERROR DE LINTER: Carga de datos integrada
  useEffect(() => {
    const sincronizarMatriz = async () => {
      try {
        const [oRes, vRes] = await Promise.all([
          api.get('/ordenes'),
          api.get('/vehiculos')
        ]);
        setOrdenes(oRes.data);
        setVehiculos(vRes.data);
      } catch (err) {
        console.error("ERROR DE SINCRONIZACIÓN:", err);
      }
    };
    sincronizarMatriz();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/ordenes', formData);
      alert("SISTEMA: Orden de Trabajo emitida. Proceda a Fase de Fotos.");
      
      // Recarga de flujo
      const res = await api.get('/ordenes');
      setOrdenes(res.data);
      
      // Limpiar formulario manteniendo al operador
      setFormData({ 
        ...formData, 
        vehiculoId: '', 
        kilometraje: '', 
        motivo_ingreso: '', 
        monto_total: '' 
      });
    } catch (err) {
      console.error(err);
      alert("ERROR CRÍTICO: Fallo en la inyección de la orden.");
    }
  };

  return (
    <div className="max-w-full mx-auto p-2">
      <div className="flex justify-between items-end mb-10 border-b-8 border-black pb-4">
        <div>
          <h1 className="text-4xl font-black text-black uppercase tracking-tighter italic">TERMINAL TÉCNICA: RECEPCIÓN Y ÓRDENES</h1>
          <p className="text-xs font-black text-blue-600 uppercase tracking-[0.3em]">Gmtch Tune Engineering System</p>
        </div>
        <div className="bg-black text-white px-6 py-2 font-black text-sm uppercase italic">Modo Operativo</div>
      </div>
      
      <div className="grid grid-cols-12 gap-10">
        
        {/* PANEL DE INGRESO (IZQUIERDA) */}
        <form onSubmit={handleSubmit} className="col-span-12 lg:col-span-4 bg-white p-10 border-4 border-black space-y-6 shadow-[15px_15px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="font-black text-black uppercase text-lg border-b-4 border-black pb-2 mb-6">Nueva Orden de Servicio</h2>
          
          <div>
            <label className="block text-[10px] font-black text-black uppercase mb-2 tracking-widest">Identificar Vehículo (Patente)</label>
            <select 
              className="w-full border-4 border-black p-4 font-black text-black text-xl outline-none bg-gray-50 focus:bg-yellow-50" 
              value={formData.vehiculoId} 
              onChange={(e) => setFormData({...formData, vehiculoId: e.target.value})} 
              required
            >
              <option value="">-- BUSCAR EN GARAGE --</option>
              {vehiculos.map(v => (
                <option key={v.id} value={v.id}>{v.patente} | {v.marca} {v.modelo}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-black uppercase mb-2 tracking-widest">Kilometraje</label>
              <input type="number" className="w-full border-4 border-black p-4 font-black text-black text-xl" value={formData.kilometraje} onChange={(e) => setFormData({...formData, kilometraje: e.target.value})} placeholder="00000" required />
            </div>
            <div>
              <label className="block text-[10px] font-black text-black uppercase mb-2 tracking-widest">Prioridad</label>
              <select className="w-full border-4 border-black p-4 font-black text-black text-sm uppercase" value={formData.prioridad} onChange={(e) => setFormData({...formData, prioridad: e.target.value})}>
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">🚨 Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-black uppercase mb-2 tracking-widest">Servicio Requerido</label>
            <textarea className="w-full border-4 border-black p-4 font-black text-black text-lg leading-tight" rows="3" value={formData.motivo_ingreso} onChange={(e) => setFormData({...formData, motivo_ingreso: e.target.value})} placeholder="Ej: STAGE 1 + DPF OFF" required />
          </div>

          <div>
            <label className="block text-[10px] font-black text-black uppercase mb-2 tracking-widest">Presupuesto de Obra ($)</label>
            <input type="number" className="w-full border-4 border-black p-5 font-black text-4xl text-blue-700 bg-blue-50" value={formData.monto_total} onChange={(e) => setFormData({...formData, monto_total: e.target.value})} required />
          </div>

          <button type="submit" className="w-full bg-black text-white py-6 font-black uppercase text-xl shadow-xl hover:bg-blue-600 transition-all active:translate-y-1">Emitir Orden Técnica</button>
        </form>

        {/* LISTADO DE TRABAJOS (DERECHA) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <h2 className="text-xs font-black text-black uppercase tracking-[0.3em] mb-4 ml-2">Monitor de Órdenes en Tiempo Real</h2>
          
          <div className="grid grid-cols-1 gap-6">
            {ordenes.slice(0,10).reverse().map(o => (
              <div key={o.id} className="bg-white border-4 border-black p-6 flex justify-between items-center shadow-[10px_10px_0px_0px_rgba(0,0,0,0.05)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer" onClick={() => window.location.href=`/vehiculos/${o.vehiculoId}`}>
                <div className="flex items-center gap-10">
                  <div className="text-5xl font-black font-mono text-black bg-gray-100 p-6 border-4 border-black min-w-[200px] text-center shadow-inner">
                    {o.Vehiculo?.patente || 'S/P'}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-[10px] font-black text-blue-600 uppercase border-2 border-blue-600 px-2 py-0.5">Orden #{o.id.toString().padStart(4, '0')}</p>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 ${o.prioridad === 'URGENTE' ? 'bg-red-600 text-white animate-pulse' : 'bg-black text-white'}`}>{o.prioridad}</span>
                    </div>
                    <p className="text-3xl font-black text-black uppercase leading-none mb-2">{o.motivo_ingreso}</p>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Entrada: {new Date(o.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="text-right border-l-4 border-black pl-10">
                  <p className="text-xs font-black text-gray-400 uppercase mb-1">Costo Total</p>
                  <p className="text-4xl font-black text-black">${parseInt(o.monto_total).toLocaleString('es-CL')}</p>
                  <div className={`text-[10px] font-black uppercase inline-block mt-3 px-3 py-1 border-2 border-black ${o.estado === 'ENTREGADO' ? 'bg-green-500' : 'bg-yellow-400'}`}>
                    {o.estado}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {ordenes.length === 0 && (
            <div className="p-20 text-center border-4 border-dashed border-gray-300 rounded-3xl">
              <p className="text-gray-300 font-black text-3xl uppercase tracking-widest">Sin actividad en el flujo de trabajo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrdenesPage;
