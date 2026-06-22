import axios from "axios";

// URL REAL DEL BACKEND EN RAILWAY
const API_URL = "https://gmtch-tune-production.up.railway.app/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

export default api;