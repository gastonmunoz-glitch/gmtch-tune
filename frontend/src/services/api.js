import axios from "axios";

const API_URL = "https://abundant-emotion-production-830a.up.railway.app/api/auth/login";

const api = axios.create({
  baseURL: API_URL,
});

export default api;