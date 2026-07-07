import api from "./api";

const API_BASE = api.defaults.baseURL || "https://api.gmtchtune.com/api";

const getPortalToken = () => localStorage.getItem("portalToken");
const getInternalToken = () => localStorage.getItem("token");

const extraerNombreArchivo = (response) => {
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  if (!match) return "gmtch-mod.bin";
  return decodeURIComponent(match[1].replace(/"/g, ""));
};

const leerError = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return data?.error || data?.mensaje || `Error HTTP ${response.status}`;
    }

    const texto = await response.text();
    return texto || `Error HTTP ${response.status}`;
  } catch {
    return `Error HTTP ${response.status}`;
  }
};

const requestPortal = async (
  path,
  {
    method = "GET",
    body,
    tokenType = "portal",
    expectBlob = false,
  } = {}
) => {
  const headers = {};
  const token =
    tokenType === "none"
      ? null
      : tokenType === "internal"
        ? getInternalToken()
        : getPortalToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const esFormData = body instanceof FormData;

  if (body && !esFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (esFormData ? body : JSON.stringify(body)) : undefined,
  });

  if (!response.ok) {
    const mensaje = await leerError(response);

    if (response.status === 401 && tokenType === "portal") {
      localStorage.removeItem("portalToken");
      localStorage.removeItem("portalUsuario");
      localStorage.removeItem("portalCuenta");
    }

    const error = new Error(mensaje);
    error.status = response.status;
    throw error;
  }

  if (expectBlob) {
    return {
      blob: await response.blob(),
      filename: extraerNombreArchivo(response),
    };
  }

  if (response.status === 204) return null;
  return response.json();
};

export const portalLogin = (identificador, password) =>
  requestPortal("/portal/auth/login", {
    method: "POST",
    body: { identificador, password },
    tokenType: "none",
  });

export const portalMe = () => requestPortal("/portal/auth/me");

export const portalListFiles = () => requestPortal("/portal/files");

export const portalGetFile = (id) => requestPortal(`/portal/files/${id}`);

export const portalCreateFile = (formData) =>
  requestPortal("/portal/files", {
    method: "POST",
    body: formData,
  });

export const portalSolicitarCorreccion = (id, payload) =>
  requestPortal(`/portal/files/${id}/correccion`, {
    method: "POST",
    body: payload,
  });

export const portalSubirNuevaLectura = (id, formData) =>
  requestPortal(`/portal/files/${id}/nueva-lectura`, {
    method: "POST",
    body: formData,
  });

export const portalDownloadMod = (id) =>
  requestPortal(`/portal/files/${id}/descargar-mod`, {
    expectBlob: true,
  });

export const portalGetCreditos = () => requestPortal("/portal/creditos");

export const portalAdminListCuentas = () =>
  requestPortal("/portal/admin/cuentas", { tokenType: "internal" });

export const portalAdminCrearCuenta = (payload) =>
  requestPortal("/portal/admin/cuentas", {
    method: "POST",
    body: payload,
    tokenType: "internal",
  });

export const portalAdminListFiles = () =>
  requestPortal("/portal/admin/files", { tokenType: "internal" });

export const portalAdminGetFile = (id) =>
  requestPortal(`/portal/admin/files/${id}`, { tokenType: "internal" });

export const portalAdminUpdateFile = (id, payload) =>
  requestPortal(`/portal/admin/files/${id}`, {
    method: "PATCH",
    body: payload,
    tokenType: "internal",
  });

export const portalAdminUploadMod = (id, formData) =>
  requestPortal(`/portal/admin/files/${id}/mod`, {
    method: "POST",
    body: formData,
    tokenType: "internal",
  });

export const portalAdminDownloadOriginal = (id) =>
  requestPortal(`/portal/admin/files/${id}/download-original`, {
    tokenType: "internal",
    expectBlob: true,
  });

export const portalAdminDownloadNuevaLectura = (id) =>
  requestPortal(`/portal/admin/files/${id}/download-nueva-lectura`, {
    tokenType: "internal",
    expectBlob: true,
  });

export const portalAdminSolicitarNuevaLectura = (id, payload) =>
  requestPortal(`/portal/admin/files/${id}/solicitar-nueva-lectura`, {
    method: "POST",
    body: payload,
    tokenType: "internal",
  });

export const portalAdminCargarCreditos = (cuentaId, payload) =>
  requestPortal(`/portal/admin/cuentas/${cuentaId}/creditos`, {
    method: "POST",
    body: payload,
    tokenType: "internal",
  });

export const portalAdminMovimientos = (cuentaId) =>
  requestPortal(`/portal/admin/cuentas/${cuentaId}/movimientos`, {
    tokenType: "internal",
  });
