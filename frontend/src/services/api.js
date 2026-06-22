import axios from "axios";

const API_URL = "https://gmtch-tune-production.up.railway.app/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("rol");
      localStorage.removeItem("username");
      localStorage.removeItem("nombre");
      localStorage.removeItem("userId");

      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default api;