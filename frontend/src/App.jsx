import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Importamos con la extensión explícita para evitar errores de Vite
import Login from './pages/Login.jsx'; 
import Dashboard from './pages/Dashboard.jsx';

function App() {
  const isAuthenticated = () => !!localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated() ? <Navigate to="/dashboard" /> : <Login />} 
        />
        <Route 
          path="/dashboard/*" 
          element={isAuthenticated() ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to={isAuthenticated() ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
