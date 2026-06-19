import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Car } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Llamada al backend que creamos en el puerto 3000
      const res = await axios.post('http://localhost:3000/api/auth/login', { email, password });
      
      // Guardamos la sesión
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      // Redirigimos al dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Error: ' + (err.response?.data?.message || 'No se pudo conectar con el servidor'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-3 rounded-full shadow-lg shadow-blue-500/20">
            <Car size={32} className="text-white" />
          </div>
        </div>
        
        <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-tight">GMTCH TUNE</h2>
        <p className="text-slate-400 text-center mb-8">Gestión Profesional de Archivos</p>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <User className="absolute left-3 top-3.5 text-slate-500" size={18} />
            <input 
              type="email" 
              placeholder="Correo Electrónico"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-10 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
            <input 
              type="password" 
              placeholder="Contraseña"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-10 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-blue-600/20"
          >
            Entrar al Portal
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
          <p className="text-slate-500 text-sm">
            ¿Necesitas una cuenta? <span className="text-blue-400 cursor-help">Contacta al administrador</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
