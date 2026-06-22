import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import api from "./services/api";

import ClientesPage from "./pages/ClientesPage";
import VehiculosPage from "./pages/VehiculosPage";
import OrdenesPage from "./pages/OrdenesPage";
import ArchivosECUPage from "./pages/ArchivosECUPage";
import FotosPage from "./pages/FotosPage";
import VehiculoDetallePage from "./pages/VehiculoDetallePage";
import DiagnosticoPage from "./pages/DiagnosticoPage";
import RecepcionRapidaPage from "./pages/RecepcionRapidaPage";
import LoginPage from "./pages/LoginPage";

function App() {
  const [auth, setAuth] = useState(localStorage.getItem("token") ? true : false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    setAuth(false);
    setSidebarOpen(false);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <Router>
      {!auth ? (
        <LoginPage setAuth={setAuth} />
      ) : (
        <div className="min-h-screen bg-slate-200">
          {/* BOTÓN MÓVIL */}
          <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black text-white h-16 px-4 flex items-center justify-between shadow-xl">
            <div>
              <h1 className="text-lg font-black italic tracking-tighter text-blue-500">
                GMTCH TUNE
              </h1>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                Industrial Master
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-black text-xl"
            >
              ☰
            </button>
          </div>

          {/* OVERLAY MÓVIL */}
          {sidebarOpen && (
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={closeSidebar}
              className="md:hidden fixed inset-0 bg-black/60 z-40"
            />
          )}

          <div className="flex min-h-screen">
            {/* SIDEBAR */}
            <nav
              className={`fixed md:static top-0 left-0 z-50 w-64 min-h-screen bg-black text-white flex flex-col shrink-0 transform transition-transform duration-300 ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              } md:translate-x-0`}
            >
              <div className="p-8 border-b border-gray-800 flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-black italic tracking-tighter text-blue-500">
                    GMTCH TUNE
                  </h1>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                    Industrial Master
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeSidebar}
                  className="md:hidden text-white text-2xl font-black"
                >
                  ×
                </button>
              </div>

              <ul className="flex-1 p-4 space-y-2">
                <li>
                  <Link to="/" onClick={closeSidebar} className={linkStyle}>
                    📊 Dashboard
                  </Link>
                </li>

                <li>
                  <Link
                    to="/flujo"
                    onClick={closeSidebar}
                    className="block p-3 bg-blue-600 text-white font-black uppercase text-xs rounded-lg hover:bg-white hover:text-black transition"
                  >
                    🚦 Nueva Recepción
                  </Link>
                </li>

                <li>
                  <Link to="/ordenes" onClick={closeSidebar} className={linkStyle}>
                    🧾 Cola de Trabajo
                  </Link>
                </li>

                <li>
                  <Link to="/diagnosticos" onClick={closeSidebar} className={linkStyle}>
                    🧠 Diagnóstico / Scanner
                  </Link>
                </li>

                <li>
                  <Link to="/archivos-ecu" onClick={closeSidebar} className={linkStyle}>
                    📂 File Service / Tuner
                  </Link>
                </li>

                <li>
                  <Link to="/clientes" onClick={closeSidebar} className={linkStyle}>
                    👥 Clientes
                  </Link>
                </li>

                <li>
                  <Link to="/vehiculos" onClick={closeSidebar} className={linkStyle}>
                    🚗 Garage
                  </Link>
                </li>

                <li>
                  <Link to="/fotos" onClick={closeSidebar} className={linkStyle}>
                    📸 Fotos
                  </Link>
                </li>
              </ul>

              <div className="p-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full bg-red-600 text-white py-2 rounded font-black text-[10px] uppercase hover:bg-red-700 transition"
                >
                  Cerrar Sesión
                </button>
              </div>
            </nav>

            {/* CONTENIDO */}
            <main className="flex-1 p-4 pt-24 md:p-10 md:pt-10 overflow-auto w-full">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/flujo" element={<RecepcionRapidaPage />} />
                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/vehiculos" element={<VehiculosPage />} />
                <Route path="/vehiculos/:id" element={<VehiculoDetallePage />} />
                <Route path="/ordenes" element={<OrdenesPage />} />
                <Route path="/archivos-ecu" element={<ArchivosECUPage />} />
                <Route path="/fotos" element={<FotosPage />} />
                <Route path="/diagnosticos" element={<DiagnosticoPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </div>
      )}
    </Router>
  );
}

const linkStyle =
  "block p-3 text-gray-400 font-bold uppercase text-xs hover:bg-gray-900 hover:text-white rounded-lg transition";

function Dashboard() {
  const [stats, setStats] = useState({
    clientes: 0,
    vehiculos: 0,
    ordenes: 0,
    ingresos: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [c, v, o] = await Promise.all([
          api.get("/clientes"),
          api.get("/vehiculos"),
          api.get("/ordenes"),
        ]);

        const total = o.data.reduce(
          (acc, curr) => acc + parseFloat(curr.monto_total || 0),
          0
        );

        setStats({
          clientes: c.data.length,
          vehiculos: v.data.length,
          ordenes: o.data.length,
          ingresos: total,
        });
      } catch (e) {
        console.error(e);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl md:text-5xl font-black text-black uppercase tracking-tighter">
          Panel de Operaciones
        </h1>
        <p className="text-xs font-black uppercase text-gray-500 mt-2">
          Recepción, diagnóstico, mecánica, lectura ECU y File Service
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard label="Clientes" val={stats.clientes} color="border-blue-500" />
        <StatCard label="Vehículos" val={stats.vehiculos} color="border-green-500" />
        <StatCard label="Órdenes" val={stats.ordenes} color="border-yellow-500" />
        <StatCard
          label="Ventas"
          val={`$${stats.ingresos.toLocaleString("es-CL")}`}
          color="border-black bg-black text-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickLink
          to="/flujo"
          title="Nueva Recepción"
          text="Ingreso de cliente, vehículo, síntomas y fotos."
          icon="🚦"
        />

        <QuickLink
          to="/ordenes"
          title="Cola de Trabajo"
          text="Ver órdenes activas y estados del proceso."
          icon="🧾"
        />

        <QuickLink
          to="/archivos-ecu"
          title="File Service"
          text="Archivos ECU originales y modificados por tuner."
          icon="📂"
        />
      </div>
    </div>
  );
}

const StatCard = ({ label, val, color }) => (
  <div
    className={`bg-white p-8 rounded-2xl border-4 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] ${color}`}
  >
    <p className="text-[10px] font-black uppercase opacity-50">{label}</p>
    <p className="text-4xl font-black mt-2">{val}</p>
  </div>
);

const QuickLink = ({ to, title, text, icon }) => (
  <Link
    to={to}
    className="bg-white border-4 border-black p-6 rounded-2xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition"
  >
    <p className="text-4xl mb-4">{icon}</p>
    <h2 className="text-xl font-black uppercase">{title}</h2>
    <p className="text-xs font-bold uppercase opacity-60 mt-2">{text}</p>
  </Link>
);

export default App;