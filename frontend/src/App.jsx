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
import RecepcionRapidaPage from './pages/RecepcionRapidaPage'; // <--- NUEVO FLUJO

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <Router>
      <div className="flex min-h-screen bg-slate-100">
        
        {/* SIDEBAR - VISIBLE EN PC, TOGGLE EN MÓVIL */}
        <aside
          className={`
            z-20
            fixed inset-y-0 left-0
            w-64
            bg-slate-900 text-white
            border-r border-slate-800
            transform transition-transform duration-200
            lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* HEADER LOGO */}
          <div className="px-6 py-6 border-b border-slate-800">
            <h1 className="text-xl font-black tracking-tight">
              <span className="text-blue-500">GMTCH</span>
              <span className="text-white"> TUNE</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
              Performance &amp; Software Engine
            </p>
          </div>

          {/* NAVEGACIÓN */}
          <nav className="px-3 py-4 text-sm font-medium">
            <SidebarLink to="/" onClick={closeSidebar}>📊 Panel Principal</SidebarLink>
            <SidebarLink to="/flujo" onClick={closeSidebar}>🚦 Flujo Completo</SidebarLink> {/* NUEVO */}
            <SidebarLink to="/clientes" onClick={closeSidebar}>👥 Clientes</SidebarLink>
            <SidebarLink to="/vehiculos" onClick={closeSidebar}>🚗 Garage Vehículos</SidebarLink>
            <SidebarLink to="/ordenes" onClick={closeSidebar}>📝 Recepción / Órdenes</SidebarLink>
            <SidebarLink to="/archivos-ecu" onClick={closeSidebar}>📂 Archivos ECU</SidebarLink>
            <SidebarLink to="/fotos" onClick={closeSidebar}>📸 Fotos Ingreso</SidebarLink>
            <SidebarLink to="/diagnosticos" onClick={closeSidebar}>🔬 Informe Scanner</SidebarLink>
          </nav>

          <div className="mt-auto px-4 py-3 text-[10px] text-slate-500 border-t border-slate-800">
            <p className="font-bold uppercase">Modo Marcha Blanca</p>
            <p>GMTCH Tune v1.0</p>
          </div>
        </aside>

        {/* OVERLAY OSCURO EN MÓVIL CUANDO SIDEBAR ABIERTO */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-10 lg:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 flex flex-col lg:ml-64">
          {/* TOPBAR SOLO EN MÓVIL */}
          <header className="lg:hidden sticky top-0 z-10 bg-slate-100/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-4 py-3">
            <button
              onClick={toggleSidebar}
              className="text-slate-800 border border-slate-400 rounded-md px-3 py-1 text-sm font-bold flex items-center gap-2"
            >
              ☰ Menú
            </button>
            <span className="text-xs font-bold text-slate-500 uppercase">
              GMTCH TUNE
            </span>
          </header>

          {/* ÁREA DE PÁGINAS */}
          <main className="flex-1 p-4 lg:p-8 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/flujo" element={<RecepcionRapidaPage />} /> {/* NUEVA RUTA */}
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

      </div>
    </Router>
  );
}

/* COMPONENTE PARA LINKS DEL SIDEBAR */
function SidebarLink({ to, children, onClick }) {
  return (
    <div className="mb-1">
      <Link
        to={to}
        onClick={onClick}
        className="block px-3 py-2 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-[13px]"
      >
        {children}
      </Link>
    </div>
  );
}

/* DASHBOARD SIMPLE (PUEDES AJUSTARLO) */
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Panel General</h1>
        <p className="text-sm text-slate-500 mt-1">Visión rápida del estado del taller y file service.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Clientes" value={stats.clientes} />
        <StatCard title="Vehículos" value={stats.vehiculos} />
        <StatCard title="Órdenes" value={stats.ordenes} />
        <StatCard title="Ingresos" value={`$${stats.ingresos.toLocaleString('es-CL')}`} />
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

export default App;
