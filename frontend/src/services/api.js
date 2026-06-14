import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const esFormData =
      typeof FormData !== "undefined" && config.data instanceof FormData;

    if (!config.headers) {
      config.headers = {};
    }

    if (esFormData) {
      // IMPORTANTE:
      // Para FormData NO se debe forzar Content-Type.
      // El navegador/Axios debe poner multipart/form-data con boundary automático.
      if (typeof config.headers.delete === "function") {
        config.headers.delete("Content-Type");
        config.headers.delete("content-type");
      } else {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    } else {
      if (typeof config.headers.set === "function") {
        config.headers.set("Content-Type", "application/json");
      } else {
        config.headers["Content-Type"] = "application/json";
      }
    }

    console.log("API REQUEST:", {
      metodo: config.method?.toUpperCase(),
      url: `${config.baseURL || ""}${config.url || ""}`,
      esFormData,
      contentType:
        typeof config.headers.get === "function"
          ? config.headers.get("Content-Type")
          : config.headers["Content-Type"],
    });

    return config;
  },
  (error) => {
    console.error("ERROR REQUEST API:", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.group("ERROR API");

    if (error.code === "ECONNABORTED") {
      console.error("Tipo:", "Tiempo de espera agotado");
    } else if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Respuesta backend:", error.response.data);
    } else if (error.request) {
      console.error("Tipo:", "No hay conexión con el servidor backend");
    } else {
      console.error("Mensaje:", error.message);
    }

    console.error("URL:", `${error.config?.baseURL || ""}${error.config?.url || ""}`);
    console.error("Método:", error.config?.method?.toUpperCase());
    console.groupEnd();

    return Promise.reject(error);
  }
);

export default api;