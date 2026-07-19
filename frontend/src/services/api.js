import axios from "axios";

const API_URL = (
  import.meta.env.VITE_API_URL || "https://api.gmtchtune.com/api"
).replace(/\/$/, "");

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
      localStorage.removeItem("empresa");
      localStorage.removeItem("empresaId");
      localStorage.removeItem("empresaSlug");
      localStorage.removeItem("empresaNombre");

      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export const getConversaciones = (params = {}) =>
  api
    .get("/mensajes/conversaciones", { params })
    .then((response) => response.data);

export const getConversacion = (id) =>
  api
    .get(`/mensajes/conversaciones/${id}`)
    .then((response) => response.data);

export const responderConversacion = (id, texto) =>
  api
    .post(`/mensajes/conversaciones/${id}/responder`, { texto })
    .then((response) => response.data);

export const asignarConversacion = (id, asignado_a_id) =>
  api
    .patch(`/mensajes/conversaciones/${id}/asignar`, { asignado_a_id })
    .then((response) => response.data);

export const cambiarEstadoConversacion = (id, estado) =>
  api
    .patch(`/mensajes/conversaciones/${id}/estado`, { estado })
    .then((response) => response.data);

export const cerrarConversacion = (id) =>
  api
    .patch(`/mensajes/conversaciones/${id}/cerrar`)
    .then((response) => response.data);

export default api;
