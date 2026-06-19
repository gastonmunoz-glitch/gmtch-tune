import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { LogOut, LayoutDashboard, FileUp, Coins } from 'lucide-react';

// Importamos la nueva página que creaste
import FileService from './FileService';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('inicio'); // Estado para saber qué ver
  const navigate = useNavigate();
  const { user } = useUser();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      {/* Sidebar Lateral */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 p-6 flex flex-col fixed h-full">
        <h1 className="text-xl font-bold text-blue-500 mb-10 flex items-center gap-2">
          GMTCH TUNE
        </h1>
        
        <nav className="flex-1 space-y-4">
          <button 
            onClick={() => setActiveTab('inicio')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${activeTab === 'inicio' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
          >
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('fileservice')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${activeTab === 'fileservice' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
          >
            <FileUp size={20} /> File Service
          </button>
        </nav>

        <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 rounded-lg text-red-400 hover:bg-red-500/10 mt-auto">
          <LogOut size={20} /> Cerrar Sesión
        </button>
      </div>

      {/* Contenido Principal (con margen a la izquierda por el Sidebar fixed) */}
      <div className="flex-1 ml-64 p-10">
        
        {activeTab === 'inicio' && (
          <>
            <header className="mb-10">
              <h2 className="text-3xl font-bold">Bienvenido, {user.nombre}</h2>
              <p className="text-slate-400">Panel de Control Principal</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800 p-6 rounded-2xl border border-blue-500/30 shadow-lg">
                <h3 className="text-slate-400 mb-2 flex items-center gap-2"><Coins size={18}/> Mis Créditos</h3>
                <p className="text-4xl font-bold text-blue-500">{user.file_credits || 0}</p>
              </div>
              {/* Aquí puedes poner más tarjetas de resumen */}
            </div>
          </>
        )}

        {activeTab === 'fileservice' && <FileService />}

      </div>
    </div>
  );
};

export default Dashboard;
