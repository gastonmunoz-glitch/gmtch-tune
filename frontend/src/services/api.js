import axios from 'axios';

// Esto detectará automáticamente si estás en tu PC o en internet
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

export default api;
