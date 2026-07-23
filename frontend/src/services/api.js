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

export const getContextoPatente = (patente, opciones = {}) =>
  api
    .get(`/vehiculos/contexto-patente/${encodeURIComponent(String(patente || ""))}`, {
      signal: opciones.signal,
    })
    .then((response) => response.data);

const nombreDesdeContentDisposition = (valor) => {
  const header = String(valor || "");
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  const simple = header.match(/filename="([^"]+)"/i);

  try {
    if (utf8?.[1]) return decodeURIComponent(utf8[1]);
  } catch {
    // El backend ya entrega un fallback ASCII en el mismo header.
  }

  return simple?.[1] || "";
};

export const descargarArchivoAutenticado = async (ruta, nombreFallback = "archivo") => {
  let response;
  try {
    response = await api.get(ruta, { responseType: "blob" });
  } catch (error) {
    const data = error.response?.data;
    if (data instanceof Blob) {
      try {
        const payload = JSON.parse(await data.text());
        error.mensajeDescarga = payload.message || payload.error || "";
      } catch {
        // La respuesta no contiene un error JSON legible.
      }
    }
    throw error;
  }

  const nombre =
    nombreDesdeContentDisposition(response.headers?.["content-disposition"]) ||
    nombreFallback;
  const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
  const urlTemporal = window.URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  try {
    enlace.href = urlTemporal;
    enlace.download = nombre;
    enlace.rel = "noopener";
    document.body.appendChild(enlace);
    enlace.click();
  } finally {
    enlace.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(urlTemporal), 0);
  }

  return nombre;
};

export default api;
