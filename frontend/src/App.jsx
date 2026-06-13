import { useState, useEffect } from 'react'; 
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import api from './services/api'; 
import ClientesPage from './pages/ClientesPage';
import VehiculosPage from './pages/VehiculosPage';
import OrdenesPage from './pages/OrdenesPage';
import ArchivosECUPage from './pages/ArchivosECUPage';
import FotosPage from './pages/FotosPage';
import VehiculoDetallePage from './pages/VehiculoDetallePage';
import DiagnosticoPage from './pages/DiagnosticoPage';

function App() {
  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif", backgroundColor: '#f1f5f9' }}>
        
        {/* SIDEBAR REDISEÑADO (Tech Premium) */}
        <nav style={{ width: '280px', background: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 10px rgba(0,0,0,0.1)' }}>
          
          {/* Header del Logo */}
          <div style={{ padding: '40px 25px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderBottom: '1px solid #1e293b' }}>
            <h1 style={{ fontWeight: '900', fontSize: '24px', letterSpacing: '-1.5px', margin: 0, color: '#3b82f6', display: 'flex', alignItems: 'center' }}>
              GMTCH<span style={{ color: 'white' }}>TUNE</span>
            </h1>
            <p style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6, marginTop: '8px', fontWeight: '800', letterSpacing: '1px', color: '#94a3b8' }}>
              Performance & Software Engine
            </p>
          </div>
          
          {/* Links de Navegación */}
          <ul style={{ listStyle: 'none', padding: '25px 15px', margin: 0, flex: 1 }}>
            <li style={navItemStyle}><Link to="/" style={linkStyle}>📊 Panel Principal</Link></li>
            <li style={navItemStyle}><Link to="/clientes" style={linkStyle}>👥 Base de Clientes</Link></li>
            <li style={navItemStyle}><Link to="/vehiculos" style={linkStyle}>🚗 Garage de Vehículos</Link></li>
            <li style={navItemStyle}><Link to="/ordenes" style={linkStyle}>📝 Recepción / Órdenes</Link></li>
            <li style={navItemStyle}><Link to="/archivos-ecu" style={linkStyle}>📂 Archivos ECU</Link></li>
            <li style={navItemStyle}><Link to="/fotos" style={linkStyle}>📸 Fotos de Ingreso</Link></li>
            <li style={navItemStyle}><Link to="/diagnosticos" style={linkStyle}>🔬 Informe Scanner</Link></li>
          </ul>

          {/* Footer del Sidebar */}
          <div style={{ padding: '20px', fontSize: '11px', color: '#475569', borderTop: '1px solid #1e293b', textAlign: 'center' }}>
            <div style={{ color: '#3b82f6', fontWeight: 'bold', marginBottom: '4px' }}>MODO MARCHA BLANCA</div>
            PROYECTO GMTCH v1.0
          </div>
        </nav>

        {/* ÁREA DE CONTENIDO PRINCIPAL */}
        <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/vehiculos" element={<VehiculosPage />} />
            <Route path="/vehiculos/:id" element={<VehiculoDetallePage />} />
            <Route path="/ordenes" element={<OrdenesPage />} />
            <Route path="/archivos-ecu" element={<ArchivosECUPage />} />
            <Route path="/fotos" element={<FotosPage />} />
            <Route path="/diagnosticos" element={<DiagnosticoPage />} />
          </Routes>
        </main>
        
      </div>
    </Router>
  );
}

// ESTILOS PARA LOS LINKS
const navItemStyle = {
  marginBottom: '6px',
};

const linkStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '14px 18px',
  color: '#94a3b8',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '600',
  borderRadius: '12px',
  transition: 'all 0.3s ease',
  backgroundColor: 'transparent',
};

// COMPONENTE DASHBOARD (Diseño Mejorado)
function Dashboard() {
  const [stats, setStats] = useState({ clientes: 0, vehiculos: 0, ordenes: 0, ingresos: 0 });

  useEffect(() => {
    const cargarStats = async () => {
      try {
        const [resClientes, resVehiculos, resOrdenes] = await Promise.all([
          api.get('/clientes'),
          api.get('/vehiculos'),
          api.get('/ordenes')
        ]);
        const totalDinero = resOrdenes.data.reduce((acc, curr) => acc + parseFloat(curr.monto_total || 0), 0);
        setStats({
          clientes: resClientes.data.length,
          vehiculos: resVehiculos.data.length,
          ordenes: resOrdenes.data.length,
          ingresos: totalDinero
        });
      } catch (err) {
        console.error("Error al cargar estadísticas:", err);
      }
    };
    cargarStats();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-1px' }}>CONTROL DE MANDO</h1>
        <p style={{ color: '#64748b', marginTop: '5px', fontWeight: '500' }}>Resumen operativo de Gmtch Tune</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border-b-8 border-blue-500">
          <p style={{ color: '#94a3b8', fontWeight: '800', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Clientes</p>
          <p style={{ fontSize: '42px', fontWeight: '900', color: '#0f172a', margin: '10px 0' }}>{stats.clientes}</p>
        </div>
        
        <div className="bg-white p-8 rounded-3xl shadow-sm border-b-8 border-indigo-500">
          <p style={{ color: '#94a3b8', fontWeight: '800', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehículos</p>
          <p style={{ fontSize: '42px', fontWeight: '900', color: '#0f172a', margin: '10px 0' }}>{stats.vehiculos}</p>
        </div>
        
        <div className="bg-white p-8 rounded-3xl shadow-sm border-b-8 border-slate-800">
          <p style={{ color: '#94a3b8', fontWeight: '800', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Órdenes Activas</p>
          <p style={{ fontSize: '42px', fontWeight: '900', color: '#0f172a', margin: '10px 0' }}>{stats.ordenes}</p>
        </div>
        
        <div className="bg-slate-900 p-8 rounded-3xl shadow-xl border-b-8 border-blue-600">
          <p style={{ color: '#64748b', fontWeight: '800', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Ingresos Totales</p>
          <p style={{ fontSize: '36px', fontWeight: '900', color: '#3b82f6', margin: '10px 0' }}>
            ${stats.ingresos.toLocaleString('es-CL')}
          </p>
        </div>
      </div>

      <div style={{ marginTop: '50px', background: 'linear-gradient(90deg, #1e3a8a 0%, #1e40af 100%)', padding: '50px', borderRadius: '40px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(30, 58, 138, 0.2)' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h2 style={{ fontSize: '36px', fontWeight: '900', margin: 0 }}>Bienvenido, Gaston 👋</h2>
          <p style={{ fontSize: '18px', opacity: 0.8, marginTop: '10px', maxWidth: '500px' }}>
            El taller está configurado. Registra ingresos, sube fotos y gestiona archivos de ECU desde este panel o desde tu móvil.
          </p>
          <button style={{ marginTop: '25px', backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
            Ver Reportes del Día
          </button>
        </div>
        <div style={{ position: 'absolute', right: '-40px', bottom: '-60px', fontSize: '180px', fontWeight: '900', opacity: 0.05, fontStyle: 'italic' }}>
          GMTCH
        </div>
      </div>
    </div>
  );
}

export default App;
