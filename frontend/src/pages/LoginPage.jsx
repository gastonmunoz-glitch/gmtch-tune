import { useState } from 'react';
import api from '../services/api';

function LoginPage({ setAuth }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const res = await api.post('/auth/login', { username: user, password: pass });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('rol', res.data.rol);
      setAuth(true);
      window.location.href = "/";
    } catch (err) { 
      console.error(err);
      alert("SISTEMA: ERROR DE AUTENTICACIÓN. CREDENCIALES NO VÁLIDAS."); 
    } finally { setCargando(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Fondo decorativo de ingeniería */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      </div>

      <form onSubmit={handleLogin} className="relative z-10 bg-[#141414] p-12 border-t-4 border-blue-600 shadow-[0_20px_50px_rgba(0,0,0,1)] w-full max-w-md space-y-8 rounded-b-xl">
        <div className="text-center">
          <h1 className="text-5xl font-black italic tracking-tighter text-white">
            GMTCH<span className="text-blue-600">TUNE</span>
          </h1>
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em] mt-2">Industrial Performance Software</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Master ID</label>
            <input 
              type="text" 
              className="w-full bg-[#1a1a1a] border-2 border-[#333] p-4 text-white font-bold rounded-lg outline-none focus:border-blue-600 transition-all placeholder-gray-700" 
              placeholder="USUARIO"
              value={user}
              onChange={e => setUser(e.target.value)} 
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Access Key</label>
            <input 
              type="password" 
              className="w-full bg-[#1a1a1a] border-2 border-[#333] p-4 text-white font-bold rounded-lg outline-none focus:border-blue-600 transition-all placeholder-gray-700" 
              placeholder="CONTRASEÑA"
              value={pass}
              onChange={e => setPass(e.target.value)} 
              required
            />
          </div>
        </div>
        
        <button 
          type="submit" 
          disabled={cargando}
          className="w-full bg-blue-600 text-white py-5 font-black uppercase text-sm tracking-widest hover:bg-white hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95"
        >
          {cargando ? 'VALIDANDO...' : 'EJECUTAR LOGIN'}
        </button>

        <div className="pt-6 border-t border-[#222] text-center">
          <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Gmtch Tune File Service Portal v1.0</p>
        </div>
      </form>

      {/* Marca de agua */}
      <div className="absolute bottom-[-50px] right-[-20px] text-white opacity-[0.02] text-[200px] font-black italic select-none">
        GMTCH
      </div>
    </div>
  );
}

export default LoginPage;
