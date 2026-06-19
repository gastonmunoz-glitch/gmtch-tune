import axios from "axios";

const API_URL = "https://URL-REAL-DE-TU-BACKEND.up.railway.app/api";

const api = axios.create({
  baseURL: API_URL,
});

export default api;