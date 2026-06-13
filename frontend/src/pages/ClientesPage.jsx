import { useState, useEffect } from 'react';
import api from '../services/api';

function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', telefono: '' });

  // SOLUCIÓN AL ERROR DE LINTER: Carga asíncrona dentro del efecto
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await api.get('/clientes');
        setClientes(res.data);
      } catch (err) {
        console.error("ERROR SISTEMA: Fallo de conexión", err);
      }
    };
    fetchClientes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/clientes/${editingId}`, formData);
        alert("SISTEMA: Datos de cliente actualizados.");
        setEditingId(null);
      } else {
        await api.post('/clientes', formData);
        alert("SISTEMA: Cliente registrado correctamente.");
      }
      // Refrescar lista de la matriz
      const res = await api.get('/clientes');
      setClientes(res.data);
      setFormData({ nombre: '', telefono: '' });
    } catch (err) {
      console.error("ERROR SISTEMA:", err);
      alert("ERROR: Fallo en el procesamiento de datos.");
    }
  };

  const prepararEdicion = (c) => {
    setEditingId(c.id);
    setFormData({ nombre: c.nombre, telefono: c.telefono });
  };

  const eliminar = async (id) => {
    if (window.confirm("⚠️ ADVERTENCIA: ¿ELIMINAR ESTE REGISTRO PERMANENTEMENTE?")) {
      try {
        await api.delete(`/clientes/${id}`);
        setClientes(clientes.filter(c => c.id !== id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="max-w-full mx-auto p-2">
      <div className="flex justify-between items-center mb-10 border-b-8 border-black pb-4">
        <h1 className="text-4xl font-black text-black uppercase tracking-tighter italic">SISTEMA CENTRAL: DIRECTORIO DE CLIENTES</h1>
        <div className="bg-black text-white px-6 py-3 font-black text-xl shadow-[8px_8px_0px_0px_rgba(59,130,246,1)]">
          DB-REGISTROS: {clientes.length}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10">
        {/* PANEL DE CONTROL DE ENTRADA */}
        <form onSubmit={handleSubmit} className="col-span-12 lg:col-span-4 bg-white p-10 border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] space-y-8">
          <h2 className="text-xl font-black text-black uppercase border-b-4 border-black pb-2 tracking-tighter">
            {editingId ? '🛠️ MODIFICAR REGISTRO' : '📥 NUEVO INGRESO'}
          </h2>
          
          <div>
            <label className="block text-sm font-black text-black uppercase mb-3 tracking-widest">Nombre y Apellido del Cliente</label>
            <input 
              type="text" 
              className="w-full border-4 border-black p-5 text-2xl font-black text-black outline-none focus:bg-yellow-50 placeholder-gray-300" 
              value={formData.nombre} 
              onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
              placeholder="EJ: GASTON MUÑOZ"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-black text-black uppercase mb-3 tracking-widest">Terminal Telefónico de Contacto</label>
            <input 
              type="text" 
              className="w-full border-4 border-black p-5 text-2xl font-black text-black outline-none focus:bg-yellow-50 placeholder-gray-300" 
              value={formData.telefono} 
              onChange={(e) => setFormData({...formData, telefono: e.target.value})} 
              placeholder="EJ: +569..."
            />
          </div>

          <div className="flex gap-4">
            <button type="submit" className="flex-1 bg-black text-white py-6 font-black uppercase text-xl hover:bg-blue-600 transition shadow-xl active:translate-y-2">
              {editingId ? 'ACTUALIZAR' : 'REGISTRAR'}
            </button>
            {editingId && (
              <button 
                type="button"
                onClick={() => {setEditingId(null); setFormData({nombre:'', telefono:''})}} 
                className="bg-gray-200 px-6 font-black text-black text-2xl uppercase border-4 border-black hover:bg-red-500 transition"
              >
                X
              </button>
            )}
          </div>
        </form>

        {/* MATRIZ DE DATOS DE INGENIERÍA */}
        <div className="col-span-12 lg:col-span-8 bg-white border-4 border-black overflow-hidden shadow-[15px_15px_0px_0px_rgba(0,0,0,0.05)]">
          <table className="w-full text-left">
            <thead className="bg-black text-white text-xs font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="p-6 border-r border-gray-800">REF-ID</th>
                <th className="p-6 border-r border-gray-800">NOMBRE Y APELLIDO</th>
                <th className="p-6 border-r border-gray-800">CONTACTO</th>
                <th className="p-6 text-center">GESTIÓN</th>
              </tr>
            </thead>
            <tbody className="text-black font-black">
              {clientes.map(c => (
                <tr key={c.id} className="border-b-4 border-black hover:bg-blue-50 transition">
                  <td className="p-6 font-mono text-blue-700 text-2xl border-r-4 border-black bg-gray-50">#{c.id.toString().padStart(4, '0')}</td>
                  <td className="p-6 text-2xl uppercase border-r-4 border-black leading-none">{c.nombre}</td>
                  <td className="p-6 text-2xl border-r-4 border-black">{c.telefono || '---'}</td>
                  <td className="p-6 flex flex-col gap-2 justify-center">
                    <button onClick={() => prepararEdicion(c)} className="w-full bg-white text-black py-2 border-2 border-black font-black uppercase text-xs hover:bg-black hover:text-white transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Editar</button>
                    <button onClick={() => eliminar(c.id)} className="w-full bg-red-600 text-white py-2 border-2 border-black font-black uppercase text-xs hover:bg-black transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {clientes.length === 0 && (
            <div className="p-24 text-center text-gray-400 font-black text-2xl uppercase tracking-[0.3em]">
              ⚠️ SIN DATOS INYECTADOS
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientesPage;
