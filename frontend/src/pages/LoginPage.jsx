import { useState } from 'react';
import api from '../services/api';

function LoginPage({ setAuth }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { username: user, password: pass });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('rol', res.data.rol);
      setAuth(true);
      window.location.href = "/";
    } catch (err) { 
      // Usamos la variable para que el linter no de error
      console.error("ERROR DE ACCESO:", err);
      alert("ACCESO DENEGADO: Verifique sus credenciales de ingeniería."); 
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-white p-10 border-t-8 border-blue-600 shadow-[20px_20px_0px_0px_rgba(59,130,246,0.3)] w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black italic text-black tracking-tighter">
            GMTCH<span className="text-blue-600">TUNE</span>
          </h1>
          <div className="mt-2 bg-black text-white text-[10px] font-bold py-1 px-3 inline-block uppercase tracking-widest">
            Central Master System
          </div>
        </div>

        <p className="text-center text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-4">
          Acceso Restringido: Personal Autorizado
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-black uppercase mb-1">Identificador de Usuario</label>
            <input 
              type="text" 
              placeholder="USUARIO" 
              className="w-full border-4 border-black p-4 font-black outline-none focus:bg-yellow-50 transition-all uppercase" 
              value={user}
              onChange={e => setUser(e.target.value)} 
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-black uppercase mb-1">Clave de Seguridad</label>
            <input 
              type="password" 
              placeholder="CONTRASEÑA" 
              className="w-full border-4 border-black p-4 font-black outline-none focus:bg-yellow-50 transition-all uppercase" 
              value={pass}
              onChange={e => setPass(e.target.value)} 
              required
            />
          </div>
        </div>
        
        <button 
          type="submit" 
          className="w-full bg-black text-white py-6 font-black uppercase text-lg shadow-xl hover:bg-blue-600 transition-all active:translate-y-1"
        >
          EJECUTAR INICIO DE SESIÓN
        </button>

        <div className="text-center">
          <p className="text-[9px] font-bold text-gray-300 uppercase">GMTCH TUNE PERFORMANCE & SOFTWARE Engine © 2026</p>
        </div>
      </form>
    </div>
  );
}

export default LoginPage;
