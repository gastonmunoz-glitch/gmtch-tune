import axios from "axios";

// ESTA URL ES LA QUE TE DIO RAILWAY
const API_URL = "https://abundant-emotion-production-830a.up.railway.app/api";

const api = axios.create({
  baseURL: API_URL,
});

export default api;