import { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

function VehiculosPage() {
  const navigate = useNavigate();
  const [vehiculos, setVehiculos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [formData, setFormData] = useState({ clienteId: '', patente: '', marca: '', modelo: '' });

  useEffect(() => {
    const cargar = async () => {
      try {
        const [vRes, cRes] = await Promise.all([api.get('/vehiculos'), api.get('/clientes')]);
        setVehiculos(vRes.data);
        setClientes(cRes.data);
      } catch (err) { console.error(err); }
    };
    cargar();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vehiculos', formData);
      const res = await api.get('/vehiculos');
      setVehiculos(res.data);
    } catch (err) { console.error(err); }
  };

  const filtrados = vehiculos.filter(v => v.patente.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div style={{ padding: '20px' }}>
      <h1>Gestión de Vehículos</h1>
      
      {/* BUSCADOR */}
      <div style={{ background: '#0055ff', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ color: 'white' }}>🔍 BUSCADOR DE PATENTE</h2>
        <input 
          type="text" 
          placeholder="Escriba patente..." 
          value={busqueda} 
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: '100%', padding: '10px', fontSize: '20px' }}
        />
      </div>

      {/* FORMULARIO */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px', background: 'white', padding: '10px' }}>
        <select value={formData.clienteId} onChange={(e) => setFormData({...formData, clienteId: e.target.value})} required>
          <option value="">Seleccionar Cliente</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <input type="text" placeholder="Patente" value={formData.patente} onChange={(e) => setFormData({...formData, patente: e.target.value.toUpperCase()})} required />
        <button type="submit">Guardar</button>
      </form>

      {/* TABLA */}
      <table border="1" width="100%" style={{ background: 'white' }}>
        <thead>
          <tr>
            <th>Patente</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map(v => (
            <tr key={v.id}>
              <td>{v.patente}</td>
              <td><button onClick={() => navigate(`/vehiculos/${v.id}`)}>Ver Historial</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default VehiculosPage;
