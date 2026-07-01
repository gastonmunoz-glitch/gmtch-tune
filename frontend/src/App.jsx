import { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import api from "./services/api";
import {
  getPriorityColor,
  getStatusColor,
} from "./utils/statusStyles";

import ClientesPage from "./pages/ClientesPage";
import VehiculosPage from "./pages/VehiculosPage";
import OrdenesPage from "./pages/OrdenesPage";
import ArchivosECUPage from "./pages/ArchivosECUPage";
import FotosPage from "./pages/FotosPage";
import VehiculoDetallePage from "./pages/VehiculoDetallePage";
import DiagnosticoPage from "./pages/DiagnosticoPage";
import RecepcionRapidaPage from "./pages/RecepcionRapidaPage";
import LoginPage from "./pages/LoginPage";
import UsuariosPage from "./pages/UsuariosPage";
import FinanzasPage from "./pages/FinanzasPage";
import LandingPage from "./pages/LandingPage";
import PortalLoginPage from "./pages/PortalLoginPage";
import PortalDashboardPage from "./pages/PortalDashboardPage";
import PortalNuevoArchivoPage from "./pages/PortalNuevoArchivoPage";
import PortalMisArchivosPage from "./pages/PortalMisArchivosPage";
import PortalCreditosPage from "./pages/PortalCreditosPage";
import PortalAdminPage from "./pages/PortalAdminPage";
import LeadsPage from "./pages/LeadsPage";

const PERMISOS_RUTAS = {
  "/": [
    "OWNER",
    "ADMIN",
    "SUPERVISOR",
    "RECEPCION",
    "OPERADOR_SCANNER",
    "OPERADOR_ECU",
    "MECANICO",
    "TUNER",
  ],
  "/flujo": ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
  "/clientes": ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
  "/leads": [
    "OWNER",
    "ADMIN",
    "SUPERVISOR",
    "RECEPCION",
    "OPERADOR_ECU",
    "TUNER",
  ],
  "/vehiculos": [
    "OWNER",
    "ADMIN",
    "SUPERVISOR",
    "RECEPCION",
    "OPERADOR_SCANNER",
    "OPERADOR_ECU",
    "MECANICO",
  ],
  "/ordenes": [
    "OWNER",
    "ADMIN",
    "SUPERVISOR",
    "RECEPCION",
    "OPERADOR_SCANNER",
    "OPERADOR_ECU",
    "MECANICO",
    "TUNER",
  ],
  "/diagnosticos": [
    "OWNER",
    "ADMIN",
    "SUPERVISOR",
    "OPERADOR_SCANNER",
    "OPERADOR_ECU",
    "MECANICO",
  ],
  "/archivos-ecu": ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_ECU", "TUNER"],
  "/fotos": [
    "OWNER",
    "ADMIN",
    "SUPERVISOR",
    "RECEPCION",
    "OPERADOR_SCANNER",
    "OPERADOR_ECU",
    "MECANICO",
  ],
  "/usuarios": ["OWNER"],
  "/portal-admin": ["OWNER"],
  "/finanzas": [
    "OWNER",
    "ADMIN",
    "SUPERVISOR",
    "RECEPCION",
    "OPERADOR_ECU",
    "MECANICO",
    "TUNER",
  ],
};

const MENU = [
  {
    to: "/",
    label: "Dashboard",
    roles: PERMISOS_RUTAS["/"],
  },
  {
    to: "/flujo",
    label: "Nueva Recepcion",
    destacado: true,
    roles: PERMISOS_RUTAS["/flujo"],
  },
  {
    to: "/ordenes",
    label: "Fila de Trabajo",
    roles: PERMISOS_RUTAS["/ordenes"],
  },
  {
    to: "/diagnosticos",
    label: "Diagnostico / Scanner",
    roles: PERMISOS_RUTAS["/diagnosticos"],
  },
  {
    to: "/archivos-ecu",
    label: "File Service / Tuner",
    roles: PERMISOS_RUTAS["/archivos-ecu"],
  },
  {
    to: "/clientes",
    label: "Clientes",
    roles: PERMISOS_RUTAS["/clientes"],
  },
  {
    to: "/leads",
    label: "Leads / CRM",
    roles: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
  },
  {
    to: "/vehiculos",
    label: "Garage",
    roles: PERMISOS_RUTAS["/vehiculos"],
  },
  {
    to: "/fotos",
    label: "Fotos",
    roles: PERMISOS_RUTAS["/fotos"],
  },
  {
    to: "/usuarios",
    label: "Usuarios / Roles",
    roles: PERMISOS_RUTAS["/usuarios"],
  },
  {
    to: "/finanzas",
    label: "Finanzas / Material",
    roles: ["OWNER", "ADMIN"],
  },
  {
    to: "/portal-admin",
    label: "Portal Masters",
    roles: PERMISOS_RUTAS["/portal-admin"],
  },
];

const leerUsuarioLocal = () => {
  const token = localStorage.getItem("token");

  if (!token) return null;

  return {
    id: localStorage.getItem("userId"),
    nombre: localStorage.getItem("nombre"),
    username: localStorage.getItem("username"),
    rol: localStorage.getItem("rol"),
  };
};

const tieneRol = (usuario, roles = []) => {
  if (!usuario?.rol) return false;
  if (usuario.rol === "OWNER") return true;
  return roles.includes(usuario.rol);
};

const puedeVerMetricasComerciales = (usuario) =>
  ["OWNER", "ADMIN"].includes(String(usuario?.rol || "").toUpperCase());

const puedeVerOperacion = (usuario) =>
  [
    "OWNER",
    "ADMIN",
    "SUPERVISOR",
    "RECEPCION",
    "OPERADOR_SCANNER",
    "OPERADOR_ECU",
    "MECANICO",
    "TUNER",
  ].includes(String(usuario?.rol || "").toUpperCase());

const puedeVerAgentesIA = (usuario) =>
  ["OWNER", "ADMIN"].includes(String(usuario?.rol || "").toUpperCase());

const puedeVerAutomatizaciones = (usuario) =>
  [
    "OWNER",
    "ADMIN",
    "SUPERVISOR",
    "RECEPCION",
    "OPERADOR_ECU",
    "MECANICO",
    "TUNER",
  ].includes(String(usuario?.rol || "").toUpperCase());

const puedeVerSchedulerInterno = (usuario) =>
  ["OWNER", "ADMIN"].includes(String(usuario?.rol || "").toUpperCase());

const limpiarSesion = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("rol");
  localStorage.removeItem("username");
  localStorage.removeItem("nombre");
  localStorage.removeItem("userId");
};

const SOUND_ALERTS_KEY = "gmtch_sound_alerts_enabled";
const SOUND_ALERTS_MODE_KEY = "gmtch_sound_alerts_mode";

const obtenerIdNotificacion = (notificacion) =>
  String(
    notificacion?.id ||
      `${notificacion?.createdAt || ""}-${notificacion?.titulo || ""}-${notificacion?.mensaje || ""}`
  );

const esNotificacionNoLeida = (notificacion) => notificacion && !notificacion.leida;

const esRecordatorioFuerte = (notificacion) => {
  const metadata = notificacion?.metadata || {};
  return (
    String(notificacion?.recordatorio_nivel || metadata.recordatorio_nivel || "")
      .toUpperCase() === "FUERTE"
  );
};

const reproducirSonidoNotificacion = async ({ modo = "normal" } = {}) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;

    const contexto = new AudioContext();

    if (contexto.state === "suspended") {
      await contexto.resume();
    }

    if (contexto.state !== "running") {
      return false;
    }

    const secuencia =
      modo === "tsunami"
        ? [
            { frecuencia: 740, inicio: 0, duracion: 0.16 },
            { frecuencia: 1120, inicio: 0.22, duracion: 0.16 },
            { frecuencia: 860, inicio: 0.44, duracion: 0.16 },
            { frecuencia: 1280, inicio: 0.66, duracion: 0.16 },
            { frecuencia: 920, inicio: 0.92, duracion: 0.2 },
            { frecuencia: 1180, inicio: 1.22, duracion: 0.28 },
          ]
        : modo === "fuerte"
        ? [
            { frecuencia: 880, inicio: 0, duracion: 0.18 },
            { frecuencia: 1040, inicio: 0.3, duracion: 0.18 },
            { frecuencia: 880, inicio: 0.6, duracion: 0.22 },
          ]
        : [{ frecuencia: 880, inicio: 0, duracion: 0.32 }];

    const volumen = modo === "tsunami" ? 0.52 : modo === "fuerte" ? 0.34 : 0.16;
    const tipoOnda = modo === "normal" ? "sine" : "square";
    const masterGain = contexto.createGain();

    masterGain.gain.setValueAtTime(0.95, contexto.currentTime);
    masterGain.connect(contexto.destination);

    secuencia.forEach(({ frecuencia, inicio, duracion }) => {
      const oscilador = contexto.createOscillator();
      const ganancia = contexto.createGain();
      const t0 = contexto.currentTime + inicio;
      const t1 = t0 + duracion;

      oscilador.type = tipoOnda;
      oscilador.frequency.setValueAtTime(frecuencia, t0);
      ganancia.gain.setValueAtTime(0.0001, t0);
      ganancia.gain.exponentialRampToValueAtTime(volumen, t0 + 0.025);
      ganancia.gain.exponentialRampToValueAtTime(0.0001, t1);

      oscilador.connect(ganancia);
      ganancia.connect(masterGain);
      oscilador.start(t0);
      oscilador.stop(t1 + 0.03);
    });

    window.setTimeout(() => {
      contexto.close().catch(() => {});
    }, modo === "tsunami" ? 2200 : modo === "fuerte" ? 1200 : 600);

    return true;
  } catch {
    // El navegador puede bloquear audio sin gesto del usuario. No debe romper la app.
    return false;
  }
};

const soportaWebPush = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const permissionNotificaciones = () => {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

function App() {
  const [usuario, setUsuario] = useState(() => leerUsuarioLocal());
  const [auth, setAuth] = useState(localStorage.getItem("token") ? true : false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificacionesOpen, setNotificacionesOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0);
  const [notificacionesError, setNotificacionesError] = useState("");
  const [alertaNotificacion, setAlertaNotificacion] = useState(null);
  const [sonidoNotificacionesActivo, setSonidoNotificacionesActivo] = useState(
    () => localStorage.getItem(SOUND_ALERTS_KEY) === "true"
  );
  const [sonidoNotificacionesModo, setSonidoNotificacionesModo] = useState(() => {
    const guardado = localStorage.getItem(SOUND_ALERTS_MODE_KEY);
    return ["normal", "fuerte", "tsunami"].includes(guardado) ? guardado : "normal";
  });
  const [sonidoNotificacionesError, setSonidoNotificacionesError] = useState("");
  const [pushDevice, setPushDevice] = useState({
    supported: soportaWebPush(),
    permission: permissionNotificaciones(),
    backendEnabled: false,
    configured: false,
    registered: false,
    misDispositivos: 0,
    totalActivas: null,
    loading: "",
    message: "",
    error: "",
  });
  const [logoOk, setLogoOk] = useState(true);
  const notificacionesInicializadasRef = useRef(false);
  const notificacionesNoLeidasRef = useRef(new Set());
  const alertaNotificacionTimerRef = useRef(null);
  const rutaActual = window.location.pathname;
  const rutaLandingPublica = rutaActual === "/web" || rutaActual === "/inicio";
  const rutaLoginPublica = rutaActual === "/login";
  const rutaPortalLogin = rutaActual === "/portal/login";
  const rutaPortalExterno =
    rutaActual === "/portal" ||
    (rutaActual.startsWith("/portal/") && rutaActual !== "/portal/login");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    const host = window.location.hostname;
    const contextoSeguro =
      window.location.protocol === "https:" ||
      host === "localhost" ||
      host === "127.0.0.1";

    if (!contextoSeguro) return undefined;

    const registrarServiceWorker = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };

    if (document.readyState === "complete") {
      registrarServiceWorker();
      return undefined;
    }

    window.addEventListener("load", registrarServiceWorker, { once: true });
    return () => window.removeEventListener("load", registrarServiceWorker);
  }, []);

  const obtenerServiceWorkerPush = async () => {
    if (!soportaWebPush()) {
      throw new Error("Web Push no soportado en este navegador");
    }

    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch {
      // Si ya esta registrado o el navegador demora, navigator.serviceWorker.ready decide.
    }

    return navigator.serviceWorker.ready;
  };

  const cargarPushStatus = async () => {
    if (!auth || !localStorage.getItem("token")) return;

    const supported = soportaWebPush();
    const permission = permissionNotificaciones();
    let registered = false;

    try {
      if (supported) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        registered = Boolean(subscription);
      }
    } catch {
      registered = false;
    }

    try {
      const respuesta = await api.get("/push/status");
      const data = respuesta.data || {};
      setPushDevice((actual) => ({
        ...actual,
        supported,
        permission,
        registered,
        backendEnabled: Boolean(data.enabled),
        configured: Boolean(data.configured),
        misDispositivos: Number(data.misDispositivos || 0),
        totalActivas:
          data.totalActivas === undefined || data.totalActivas === null
            ? null
            : Number(data.totalActivas || 0),
        error: "",
      }));
    } catch (error) {
      setPushDevice((actual) => ({
        ...actual,
        supported,
        permission,
        registered,
        error: "No se pudo cargar estado Web Push.",
      }));
    }
  };

  const activarPushDispositivo = async () => {
    setPushDevice((actual) => ({ ...actual, loading: "activar", error: "", message: "" }));

    try {
      if (!soportaWebPush()) {
        throw new Error("Este navegador no soporta notificaciones push.");
      }

      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setPushDevice((actual) => ({
          ...actual,
          permission: permiso,
          loading: "",
          error:
            permiso === "denied"
              ? "Permiso denegado. Activalo desde ajustes del navegador o sistema."
              : "Permiso pendiente. Debes permitir notificaciones para este sitio.",
        }));
        return;
      }

      const clave = await api.get("/push/vapid-public-key");
      const { publicKey, enabled } = clave.data || {};
      if (!enabled || !publicKey) {
        throw new Error("Web Push esta desactivado en backend.");
      }

      const registration = await obtenerServiceWorkerPush();
      const existente = await registration.pushManager.getSubscription();
      const subscription =
        existente ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      await api.post("/push/subscribe", {
        subscription: subscription.toJSON(),
        deviceLabel: navigator.userAgent?.includes("iPhone")
          ? "iPhone / PWA"
          : navigator.platform || "Dispositivo",
        platform: navigator.platform || "web",
      });

      setPushDevice((actual) => ({
        ...actual,
        permission: "granted",
        registered: true,
        loading: "",
        message: "Dispositivo registrado para Web Push.",
        error: "",
      }));
      await cargarPushStatus();
    } catch (error) {
      setPushDevice((actual) => ({
        ...actual,
        loading: "",
        error:
          error.response?.data?.error ||
          error.message ||
          "No se pudo activar Web Push en este dispositivo.",
      }));
    }
  };

  const desactivarPushDispositivo = async () => {
    setPushDevice((actual) => ({ ...actual, loading: "desactivar", error: "", message: "" }));

    try {
      const registration = await obtenerServiceWorkerPush();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.post("/push/unsubscribe", {
          subscription: subscription.toJSON(),
        });
        await subscription.unsubscribe();
      } else {
        await api.post("/push/unsubscribe", {});
      }

      setPushDevice((actual) => ({
        ...actual,
        registered: false,
        loading: "",
        message: "Dispositivo desregistrado.",
      }));
      await cargarPushStatus();
    } catch (error) {
      setPushDevice((actual) => ({
        ...actual,
        loading: "",
        error:
          error.response?.data?.error ||
          error.message ||
          "No se pudo desactivar Web Push.",
      }));
    }
  };

  const probarPushDispositivo = async () => {
    setPushDevice((actual) => ({ ...actual, loading: "test", error: "", message: "" }));

    try {
      const respuesta = await api.post("/push/test");
      setPushDevice((actual) => ({
        ...actual,
        loading: "",
        message: respuesta.data?.mensaje || "Prueba Web Push enviada.",
      }));
      await cargarPushStatus();
    } catch (error) {
      setPushDevice((actual) => ({
        ...actual,
        loading: "",
        error: error.response?.data?.error || "No se pudo enviar prueba Web Push.",
      }));
    }
  };

  const probarPushCritico = async () => {
    setPushDevice((actual) => ({
      ...actual,
      loading: "test-critical",
      error: "",
      message: "",
    }));

    try {
      const respuesta = await api.post("/push/test-critical");
      setPushDevice((actual) => ({
        ...actual,
        loading: "",
        message: respuesta.data?.mensaje || "Prueba critica Web Push enviada.",
      }));
      await cargarPushStatus();
    } catch (error) {
      setPushDevice((actual) => ({
        ...actual,
        loading: "",
        error:
          error.response?.data?.error ||
          "No se pudo enviar prueba critica Web Push.",
      }));
    }
  };

  const mostrarAlertaNotificacion = (notificacion) => {
    if (!notificacion) return;

    setAlertaNotificacion(notificacion);

    if (alertaNotificacionTimerRef.current) {
      window.clearTimeout(alertaNotificacionTimerRef.current);
    }

    alertaNotificacionTimerRef.current = window.setTimeout(() => {
      setAlertaNotificacion(null);
    }, 8000);
  };

  const cargarNotificaciones = async () => {
    if (!localStorage.getItem("token")) return;

    try {
      setNotificacionesError("");
      const res = await api.get("/notificaciones");
      const data = res.data || {};
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data.notificaciones)
          ? data.notificaciones
          : [];

      const noLeidas = items.filter(esNotificacionNoLeida);
      const idsNoLeidas = new Set(noLeidas.map(obtenerIdNotificacion));

      if (notificacionesInicializadasRef.current) {
        const nuevas = noLeidas.filter(
          (notificacion) =>
            !notificacionesNoLeidasRef.current.has(obtenerIdNotificacion(notificacion))
        );

        if (nuevas.length > 0) {
          const masReciente = nuevas[0];
          mostrarAlertaNotificacion(masReciente);

          if (sonidoNotificacionesActivo) {
            const modoAudio =
              esRecordatorioFuerte(masReciente) &&
              ["fuerte", "tsunami"].includes(sonidoNotificacionesModo)
                ? sonidoNotificacionesModo
                : esRecordatorioFuerte(masReciente)
                  ? "fuerte"
                  : sonidoNotificacionesModo;
            const audioOk = await reproducirSonidoNotificacion({
              modo: modoAudio,
            });

            if (!audioOk) {
              setSonidoNotificacionesError(
                "El navegador bloqueó el audio. Presiona Activar sonido o Probar alerta."
              );
            }
          }
        }
      } else {
        notificacionesInicializadasRef.current = true;
      }

      notificacionesNoLeidasRef.current = idsNoLeidas;
      setNotificaciones(items);
      setNotificacionesNoLeidas(Number(data.noLeidas ?? noLeidas.length));
    } catch (err) {
      console.error("Error cargando notificaciones:", err.response?.data || err.message);
      setNotificaciones([]);
      setNotificacionesNoLeidas(0);
      setNotificacionesError("No se pudieron cargar notificaciones");
    }
  };

  useEffect(() => {
    let activo = true;

    const validarSesion = async () => {
      const token = localStorage.getItem("token");

      if (!token) return;

      try {
        const res = await api.get("/auth/me");

        if (!activo) return;

        const u = {
          id: res.data.id,
          nombre: res.data.nombre || res.data.username,
          username: res.data.username,
          rol: res.data.rol,
        };

        localStorage.setItem("userId", u.id);
        localStorage.setItem("nombre", u.nombre);
        localStorage.setItem("username", u.username);
        localStorage.setItem("rol", u.rol);

        setUsuario(u);
        setAuth(true);
      } catch (err) {
        console.error("Sesion invalida o expirada:", err.response?.data || err.message);

        if (!activo) return;

        limpiarSesion();
        setUsuario(null);
        setAuth(false);
      }
    };

    validarSesion();

    return () => {
      activo = false;
    };
  }, []);

  const handleLogout = () => {
    limpiarSesion();
    setUsuario(null);
    setAuth(false);
    setSidebarOpen(false);
    setNotificacionesOpen(false);
    setNotificaciones([]);
    setNotificacionesNoLeidas(0);
    setAlertaNotificacion(null);
    setPushDevice((actual) => ({
      ...actual,
      permission: permissionNotificaciones(),
      registered: false,
      misDispositivos: 0,
      totalActivas: null,
      message: "",
      error: "",
    }));
    notificacionesInicializadasRef.current = false;
    notificacionesNoLeidasRef.current = new Set();
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const marcarNotificacionLeida = async (id) => {
    try {
      await api.patch(`/notificaciones/${id}/leida`);
      if (String(alertaNotificacion?.id) === String(id)) {
        setAlertaNotificacion(null);
      }
      await cargarNotificaciones();
    } catch (err) {
      console.error("Error marcando notificacion:", err.response?.data || err.message);
      setNotificacionesError("No se pudo marcar la notificacion");
    }
  };

  const marcarTodasNotificacionesLeidas = async () => {
    try {
      await api.patch("/notificaciones/marcar-todas-leidas");
      setAlertaNotificacion(null);
      await cargarNotificaciones();
    } catch (err) {
      console.error("Error marcando notificaciones:", err.response?.data || err.message);
      setNotificacionesError("No se pudieron marcar las notificaciones");
    }
  };

  const navegarAAccionInterna = (url) => {
    const destino = String(url || "").trim();
    if (!destino) return false;

    if (/^https?:\/\//i.test(destino)) {
      window.location.assign(destino);
      return true;
    }

    const destinoInterno = destino.startsWith("/") ? destino : `/${destino}`;
    window.history.pushState({}, "", destinoInterno);
    const evento =
      typeof PopStateEvent === "function"
        ? new PopStateEvent("popstate")
        : new Event("popstate");
    window.dispatchEvent(evento);
    setSidebarOpen(false);
    return true;
  };

  const abrirAccionNotificacion = async (notificacion) => {
    const url = obtenerUrlAccionNotificacion(notificacion);

    if (!url) {
      setNotificacionesError("Sin accion directa disponible");
      setNotificacionesOpen(true);
      return;
    }

    if (notificacion?.id && esNotificacionNoLeida(notificacion)) {
      try {
        await api.patch(`/notificaciones/${notificacion.id}/leida`);
        setNotificaciones((actuales) =>
          actuales.map((item) =>
            String(item.id) === String(notificacion.id)
              ? { ...item, leida: true, leida_at: new Date().toISOString() }
              : item
          )
        );
        setNotificacionesNoLeidas((actual) => Math.max(0, Number(actual) - 1));
        notificacionesNoLeidasRef.current.delete(obtenerIdNotificacion(notificacion));
      } catch (err) {
        console.error("Error marcando notificacion:", err.response?.data || err.message);
        setNotificacionesError("No se pudo marcar la notificacion");
      }
    }

    if (String(alertaNotificacion?.id) === String(notificacion?.id)) {
      setAlertaNotificacion(null);
    }

    setNotificacionesOpen(false);
    navegarAAccionInterna(url);
  };

  const alternarSonidoNotificaciones = async () => {
    const siguiente = !sonidoNotificacionesActivo;
    setSonidoNotificacionesActivo(siguiente);
    localStorage.setItem(SOUND_ALERTS_KEY, String(siguiente));

    if (siguiente) {
      const audioOk = await reproducirSonidoNotificacion({
        modo: sonidoNotificacionesModo,
      });

      setSonidoNotificacionesError(
        audioOk
          ? ""
          : "El navegador bloqueó el audio. Presiona Activar sonido o Probar alerta."
      );
    } else {
      setSonidoNotificacionesError("");
    }
  };

  const cambiarModoSonidoNotificaciones = (modo) => {
    const siguiente = ["normal", "fuerte", "tsunami"].includes(modo)
      ? modo
      : "normal";
    setSonidoNotificacionesModo(siguiente);
    localStorage.setItem(SOUND_ALERTS_MODE_KEY, siguiente);
  };

  const probarSonidoNotificaciones = async (modo = sonidoNotificacionesModo) => {
    const modoSeguro = ["normal", "fuerte", "tsunami"].includes(modo)
      ? modo
      : "normal";
    const audioOk = await reproducirSonidoNotificacion({ modo: modoSeguro });

    setSonidoNotificacionesError(
      audioOk
        ? ""
        : "El navegador bloqueó el audio. Presiona Activar sonido o Probar alerta."
    );
  };

  useEffect(() => {
    if (!auth) return undefined;

    let cancelado = false;
    let timeoutId = null;

    const programarSiguienteCarga = () => {
      if (cancelado) return;
      const demora = document.hidden ? 30000 : 10000;
      timeoutId = window.setTimeout(async () => {
        await cargarNotificaciones();
        programarSiguienteCarga();
      }, demora);
    };

    cargarNotificaciones();
    programarSiguienteCarga();

    const alCambiarVisibilidad = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      programarSiguienteCarga();
    };

    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    return () => {
      cancelado = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [
    auth,
    usuario?.rol,
    usuario?.username,
    sonidoNotificacionesActivo,
    sonidoNotificacionesModo,
  ]);

  useEffect(() => {
    if (!auth || !usuario?.id) return undefined;

    let cancelado = false;
    const cargar = async () => {
      if (cancelado) return;
      await cargarPushStatus();
    };

    cargar();

    return () => {
      cancelado = true;
    };
  }, [auth, usuario?.id, usuario?.rol]);

  useEffect(
    () => () => {
      if (alertaNotificacionTimerRef.current) {
        window.clearTimeout(alertaNotificacionTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!auth || !usuario?.id) return undefined;

    let cancelado = false;

    const enviarPresencia = async () => {
      const token = localStorage.getItem("token");
      const baseURL = api.defaults.baseURL;

      if (!token || !baseURL || cancelado) return;

      try {
        await fetch(`${baseURL}/usuarios/me/presencia`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {
        // Presencia aproximada: no debe romper sesion ni operacion.
      }
    };

    enviarPresencia();
    const intervalo = window.setInterval(enviarPresencia, 60000);

    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
    };
  }, [auth, usuario?.id]);

  return (
    <Router>
      {rutaLandingPublica ? (
        <Routes>
          <Route path="/web" element={<LandingPage />} />
          <Route path="/inicio" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/web" />} />
        </Routes>
      ) : rutaPortalLogin ? (
        <Routes>
          <Route path="/portal/login" element={<PortalLoginPage />} />
          <Route path="*" element={<Navigate to="/portal/login" />} />
        </Routes>
      ) : rutaPortalExterno ? (
        <Routes>
          <Route
            path="/portal"
            element={
              <PortalProtegido>
                <PortalDashboardPage />
              </PortalProtegido>
            }
          />
          <Route
            path="/portal/nuevo-archivo"
            element={
              <PortalProtegido>
                <PortalNuevoArchivoPage />
              </PortalProtegido>
            }
          />
          <Route
            path="/portal/mis-archivos"
            element={
              <PortalProtegido>
                <PortalMisArchivosPage />
              </PortalProtegido>
            }
          />
          <Route
            path="/portal/creditos"
            element={
              <PortalProtegido>
                <PortalCreditosPage />
              </PortalProtegido>
            }
          />
          <Route path="*" element={<Navigate to="/portal" />} />
        </Routes>
      ) : rutaLoginPublica && !auth ? (
        <Routes>
          <Route
            path="/login"
            element={<LoginPage setAuth={setAuth} setUsuario={setUsuario} />}
          />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      ) : !auth ? (
        <LoginPage setAuth={setAuth} setUsuario={setUsuario} />
      ) : (
        <div className="min-h-screen bg-slate-200">
          <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black text-white h-16 px-4 flex items-center justify-between shadow-xl">
            <div>
              {logoOk ? (
                <img
                  src="/brand/gmtch-logo.png"
                  alt="GMTCH Tune"
                  className="h-8 w-auto max-w-[150px] object-contain"
                  onError={() => setLogoOk(false)}
                />
              ) : (
                <h1 className="text-lg font-black italic tracking-tighter text-blue-500">
                  GMTCH TUNE
                </h1>
              )}

              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                {usuario?.rol || "ROLE ACCESS"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-black text-xs uppercase"
            >
              Menu
            </button>
          </div>

          {sidebarOpen && (
            <button
              type="button"
              aria-label="Cerrar menu"
              onClick={closeSidebar}
              className="md:hidden fixed inset-0 bg-black/60 z-40"
            />
          )}

          <div className="flex min-h-screen">
            <nav
              className={`fixed md:static top-0 left-0 z-50 w-64 min-h-screen bg-black text-white flex flex-col shrink-0 transform transition-transform duration-300 ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              } md:translate-x-0`}
            >
              <div className="p-8 border-b border-gray-800 flex items-start justify-between">
                <div>
                  {logoOk ? (
                    <img
                      src="/brand/gmtch-logo.png"
                      alt="GMTCH Tune"
                      className="h-12 w-auto max-w-[180px] object-contain"
                      onError={() => setLogoOk(false)}
                    />
                  ) : (
                    <h1 className="text-2xl font-black italic tracking-tighter text-blue-500">
                      GMTCH TUNE
                    </h1>
                  )}

                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                    Role Access System
                  </p>

                  <p className="text-[10px] font-black text-white uppercase mt-3">
                    {usuario?.nombre || usuario?.username}
                  </p>

                  <p className="text-[9px] font-black text-blue-400 uppercase">
                    {usuario?.rol}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeSidebar}
                  className="md:hidden text-white text-xs font-black uppercase"
                >
                  Cerrar
                </button>
              </div>

              <ul className="flex-1 p-4 space-y-2">
                {MENU.filter((item) => tieneRol(usuario, item.roles)).map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={closeSidebar}
                      className={item.destacado ? destacadoStyle : linkStyle}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="p-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full bg-red-600 text-white py-2 rounded font-black text-[10px] uppercase hover:bg-red-700 transition"
                >
                  Cerrar sesion
                </button>
              </div>
            </nav>

            <main className="flex-1 p-4 pt-24 md:p-10 md:pt-10 overflow-auto w-full">
              <NotificacionesInternas
                abiertas={notificacionesOpen}
                setAbiertas={setNotificacionesOpen}
                notificaciones={notificaciones}
                noLeidas={notificacionesNoLeidas}
                error={notificacionesError}
                sonidoActivo={sonidoNotificacionesActivo}
                sonidoModo={sonidoNotificacionesModo}
                sonidoError={sonidoNotificacionesError}
                usuario={usuario}
                pushDevice={pushDevice}
                onActualizar={cargarNotificaciones}
                onMarcarLeida={marcarNotificacionLeida}
                onMarcarTodas={marcarTodasNotificacionesLeidas}
                onAbrirAccion={abrirAccionNotificacion}
                onAlternarSonido={alternarSonidoNotificaciones}
                onCambiarModoSonido={cambiarModoSonidoNotificaciones}
                onProbarSonido={probarSonidoNotificaciones}
                onActualizarPush={cargarPushStatus}
                onActivarPush={activarPushDispositivo}
                onDesactivarPush={desactivarPushDispositivo}
                onProbarPush={probarPushDispositivo}
                onProbarPushCritico={probarPushCritico}
              />

              <AlertaNotificacionFlotante
                notificacion={alertaNotificacion}
                onCerrar={() => setAlertaNotificacion(null)}
                onVer={() => abrirAccionNotificacion(alertaNotificacion)}
                onMarcarLeida={marcarNotificacionLeida}
              />

              <Routes>
                <Route
                  path="/"
                  element={
                    <Protegido usuario={usuario} roles={PERMISOS_RUTAS["/"]}>
                      <Dashboard
                        usuario={usuario}
                        actualizarNotificaciones={cargarNotificaciones}
                      />
                    </Protegido>
                  }
                />

                <Route
                  path="/flujo"
                  element={
                    <Protegido usuario={usuario} roles={PERMISOS_RUTAS["/flujo"]}>
                      <RecepcionRapidaPage />
                    </Protegido>
                  }
                />

                <Route
                  path="/clientes"
                  element={
                    <Protegido usuario={usuario} roles={PERMISOS_RUTAS["/clientes"]}>
                      <ClientesPage />
                    </Protegido>
                  }
                />

                <Route
                  path="/leads"
                  element={
                    <Protegido usuario={usuario} roles={PERMISOS_RUTAS["/leads"]}>
                      <LeadsPage />
                    </Protegido>
                  }
                />

                <Route
                  path="/vehiculos"
                  element={
                    <Protegido usuario={usuario} roles={PERMISOS_RUTAS["/vehiculos"]}>
                      <VehiculosPage />
                    </Protegido>
                  }
                />

                <Route
                  path="/vehiculos/:id"
                  element={
                    <Protegido usuario={usuario} roles={PERMISOS_RUTAS["/vehiculos"]}>
                      <VehiculoDetallePage />
                    </Protegido>
                  }
                />

                <Route
                  path="/ordenes"
                  element={
                    <Protegido usuario={usuario} roles={PERMISOS_RUTAS["/ordenes"]}>
                      <OrdenesPage />
                    </Protegido>
                  }
                />

                <Route
                  path="/archivos-ecu"
                  element={
                    <Protegido usuario={usuario} roles={PERMISOS_RUTAS["/archivos-ecu"]}>
                      <ArchivosECUPage />
                    </Protegido>
                  }
                />

                <Route
                  path="/fotos"
                  element={
                    <Protegido usuario={usuario} roles={PERMISOS_RUTAS["/fotos"]}>
                      <FotosPage />
                    </Protegido>
                  }
                />

                <Route
                  path="/diagnosticos"
                  element={
                    <Protegido usuario={usuario} roles={PERMISOS_RUTAS["/diagnosticos"]}>
                      <DiagnosticoPage />
                    </Protegido>
                  }
                />

                <Route
                  path="/usuarios"
                  element={
                    <Protegido usuario={usuario} roles={PERMISOS_RUTAS["/usuarios"]}>
                      <UsuariosPage />
                    </Protegido>
                  }
                />

                <Route
                  path="/finanzas"
                  element={
                    <Protegido usuario={usuario} roles={PERMISOS_RUTAS["/finanzas"]}>
                      <FinanzasPage />
                    </Protegido>
                  }
                />

                <Route
                  path="/portal-admin"
                  element={
                    <Protegido usuario={usuario} roles={PERMISOS_RUTAS["/portal-admin"]}>
                      <PortalAdminPage />
                    </Protegido>
                  }
                />

                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </div>
      )}
    </Router>
  );
}

const linkStyle =
  "block p-3 text-gray-400 font-bold uppercase text-xs hover:bg-gray-900 hover:text-white rounded-lg transition";

const destacadoStyle =
  "block p-3 bg-blue-600 text-white font-black uppercase text-xs rounded-lg hover:bg-white hover:text-black transition";

const Protegido = ({ usuario, roles, children }) => {
  if (!tieneRol(usuario, roles)) {
    return <AccesoDenegado usuario={usuario} />;
  }

  return children;
};

const PortalProtegido = ({ children }) => {
  const portalToken = localStorage.getItem("portalToken");

  if (!portalToken) {
    return <Navigate to="/portal/login" />;
  }

  return children;
};

const AccesoDenegado = ({ usuario }) => (
  <div className="bg-white border-4 border-black p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
    <h1 className="text-4xl font-black uppercase">Acceso restringido</h1>

    <p className="text-xs font-bold uppercase text-gray-500 mt-3">
      Tu perfil actual no tiene permisos para esta seccion.
    </p>

    <div className="mt-6 bg-black text-white p-5 inline-block">
      <p className="text-xs font-black uppercase">
        Usuario: {usuario?.username}
      </p>

      <p className="text-xs font-black uppercase">Rol: {usuario?.rol}</p>
    </div>
  </div>
);

const formatearFechaNotificacion = (valor) => {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Sin fecha";

  return fecha.toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const leerMetadataNotificacion = (notificacion) => {
  const metadata = notificacion?.metadata;

  if (!metadata) return {};
  if (typeof metadata === "object" && !Array.isArray(metadata)) return metadata;

  if (typeof metadata === "string" && metadata.trim()) {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }

  return {};
};

const obtenerUrlAccionNotificacion = (notificacion) => {
  if (!notificacion) return "";

  const accionUrl = String(notificacion.accion_url || "").trim();
  if (accionUrl) return accionUrl;

  const tipo = String(notificacion.tipo || "").toUpperCase();
  const metadata = leerMetadataNotificacion(notificacion);
  const portalFileId =
    metadata.portalFileId ||
    metadata.fileId ||
    (String(notificacion.entidad_tipo || "").toUpperCase() === "PORTAL_FILE"
      ? notificacion.entidad_id
      : null);

  if (tipo.startsWith("PORTAL_FILE_") && portalFileId) {
    if (tipo === "PORTAL_FILE_NUEVA_LECTURA") {
      return `/portal-admin?fileId=${portalFileId}#nueva-lectura`;
    }

    if (tipo === "PORTAL_FILE_CORRECCION") {
      return `/portal-admin?fileId=${portalFileId}#correccion`;
    }

    return `/portal-admin?fileId=${portalFileId}`;
  }

  if (tipo === "BITACORA_OPERATIVA_PRIORITARIA") {
    return "/#bitacora";
  }

  if (notificacion.ordenId) {
    if (tipo === "CORRECCION_TECNICA_SOLICITADA") {
      return `/ordenes?ordenId=${notificacion.ordenId}#postventa`;
    }

    if (tipo === "ORDEN_LISTA_ENTREGA") {
      return `/ordenes?ordenId=${notificacion.ordenId}#entrega`;
    }

    return `/ordenes?ordenId=${notificacion.ordenId}`;
  }

  if (notificacion.archivoECUId) {
    const hash = tipo === "POST_ESCRITURA_PENDIENTE" ? "#post-escritura" : "";
    return `/archivos-ecu?archivoId=${notificacion.archivoECUId}${hash}`;
  }

  return "";
};

const NotificacionesInternas = ({
  abiertas,
  setAbiertas,
  notificaciones,
  noLeidas,
  error,
  sonidoActivo,
  sonidoModo,
  sonidoError,
  usuario,
  pushDevice,
  onActualizar,
  onMarcarLeida,
  onMarcarTodas,
  onAbrirAccion,
  onAlternarSonido,
  onCambiarModoSonido,
  onProbarSonido,
  onActualizarPush,
  onActivarPush,
  onDesactivarPush,
  onProbarPush,
  onProbarPushCritico,
}) => {
  const ultimas = notificaciones.slice(0, 5);
  const puedeProbarCritico = ["OWNER", "ADMIN"].includes(
    String(usuario?.rol || "").toUpperCase()
  );

  return (
    <section className="mb-6 flex justify-end">
      <div className="relative w-full max-w-xl">
        <div className="flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onActualizar}
            className="bg-white border-2 border-black px-3 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-gray-100 transition"
          >
            Actualizar notificaciones
          </button>

          <button
            type="button"
            onClick={onAlternarSonido}
            className={`border-2 border-black px-3 py-2 rounded-lg text-[10px] font-black uppercase transition ${
              sonidoActivo
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-yellow-100 text-black hover:bg-yellow-200"
            }`}
          >
            {sonidoActivo ? "Sonido activo" : "Activar sonido"}
          </button>

          <button
            type="button"
            onClick={() => onProbarSonido("normal")}
            className="border-2 border-black bg-white px-3 py-2 rounded-lg text-[10px] font-black uppercase text-black hover:bg-gray-100 transition"
          >
            Probar sonido
          </button>

          <button
            type="button"
            onClick={() => onProbarSonido("fuerte")}
            className="border-2 border-red-700 bg-red-600 px-3 py-2 rounded-lg text-[10px] font-black uppercase text-white hover:bg-red-700 transition"
          >
            Probar sonido fuerte
          </button>

          <button
            type="button"
            onClick={() => onProbarSonido("tsunami")}
            className="border-2 border-red-900 bg-red-800 px-3 py-2 rounded-lg text-[10px] font-black uppercase text-white hover:bg-red-950 transition shadow-[0_0_18px_rgba(220,38,38,0.45)]"
          >
            Probar alerta tsunami
          </button>

          <button
            type="button"
            onClick={() => setAbiertas((actual) => !actual)}
            className="relative bg-black text-white border-2 border-black px-4 py-2 rounded-lg font-black uppercase text-xs hover:bg-blue-700 transition"
          >
            Campana
            {noLeidas > 0 && (
              <span className="absolute -top-3 -right-3 bg-red-700 text-white border-2 border-white rounded-full min-w-[30px] h-[30px] px-2 flex items-center justify-center text-[11px] font-black shadow-lg ring-4 ring-red-200 animate-pulse">
                {noLeidas}
              </span>
            )}
          </button>
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <label className="flex items-center justify-end gap-2 text-[10px] font-black uppercase text-gray-500">
            Modo sonido
            <select
              value={sonidoModo}
              onChange={(event) => onCambiarModoSonido(event.target.value)}
              className="border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase text-black"
            >
              <option value="normal">Normal</option>
              <option value="fuerte">Fuerte</option>
              <option value="tsunami">Critico / Tsunami</option>
            </select>
          </label>
          <p className="text-right text-[10px] font-black uppercase text-gray-500">
            Usar modo tsunami solo en recepción/taller cuando se necesite máxima atención.
          </p>
        </div>

        {sonidoError && (
          <div className="mt-2 border-2 border-yellow-500 bg-yellow-50 px-3 py-2 text-[10px] font-black uppercase text-yellow-800">
            {sonidoError}
          </div>
        )}

        {abiertas && (
          <div className="absolute right-0 mt-3 z-30 w-full bg-white border-4 border-black rounded-2xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="bg-black text-white p-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase">
                  Notificaciones internas
                </h2>
                <p className="text-[10px] font-bold uppercase text-gray-400">
                  No leidas: {noLeidas}
                </p>
              </div>

              <button
                type="button"
                onClick={onMarcarTodas}
                disabled={noLeidas === 0}
                className="bg-white text-black px-3 py-2 rounded text-[10px] font-black uppercase disabled:opacity-40"
              >
                Marcar todas como leidas
              </button>
            </div>

            {error && (
              <div className="px-4 py-3 bg-yellow-50 border-b-2 border-black text-xs font-black uppercase text-yellow-800">
                {error}
              </div>
            )}

            <div className="border-b-4 border-black bg-slate-950 p-4 text-white">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">
                    Notificaciones del dispositivo
                  </p>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-slate-300">
                    Activa Web Push para recibir alertas criticas fuera de pantalla. En
                    iPhone usa la app instalada desde Safari en pantalla de inicio.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase sm:grid-cols-4 lg:min-w-[420px]">
                  <div className="rounded-lg border border-white/10 bg-white/10 p-2">
                    <p className="text-slate-400">Soporte</p>
                    <p className={pushDevice?.supported ? "text-emerald-300" : "text-red-300"}>
                      {pushDevice?.supported ? "Disponible" : "No disponible"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/10 p-2">
                    <p className="text-slate-400">Permiso</p>
                    <p>{pushDevice?.permission || "default"}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/10 p-2">
                    <p className="text-slate-400">Backend</p>
                    <p
                      className={
                        pushDevice?.backendEnabled ? "text-emerald-300" : "text-amber-300"
                      }
                    >
                      {pushDevice?.backendEnabled ? "Activo" : "Inactivo"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/10 p-2">
                    <p className="text-slate-400">Dispositivo</p>
                    <p className={pushDevice?.registered ? "text-emerald-300" : "text-amber-300"}>
                      {pushDevice?.registered ? "Registrado" : "Sin registrar"}
                    </p>
                  </div>
                </div>
              </div>

              {pushDevice?.error && (
                <div className="mt-3 rounded-lg border border-red-400 bg-red-950/50 p-2 text-[10px] font-black uppercase text-red-100">
                  {pushDevice.error}
                </div>
              )}

              {pushDevice?.message && (
                <div className="mt-3 rounded-lg border border-emerald-400 bg-emerald-950/40 p-2 text-[10px] font-black uppercase text-emerald-100">
                  {pushDevice.message}
                </div>
              )}

              {pushDevice?.permission === "denied" && (
                <p className="mt-3 text-[10px] font-bold uppercase text-amber-200">
                  Permiso denegado: debes habilitar notificaciones desde ajustes del
                  navegador o del sistema.
                </p>
              )}

              {puedeProbarCritico && pushDevice?.totalActivas !== null && (
                <p className="mt-3 text-[10px] font-bold uppercase text-slate-400">
                  Suscripciones activas globales: {pushDevice.totalActivas}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onActualizarPush}
                  className="rounded-lg border-2 border-white bg-white px-3 py-2 text-[10px] font-black uppercase text-black hover:bg-blue-100 transition"
                >
                  Actualizar estado
                </button>

                {!pushDevice?.registered ? (
                  <button
                    type="button"
                    onClick={onActivarPush}
                    disabled={pushDevice?.loading === "activar"}
                    className="rounded-lg border-2 border-emerald-300 bg-emerald-600 px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-emerald-500 disabled:opacity-50 transition"
                  >
                    {pushDevice?.loading === "activar"
                      ? "Activando..."
                      : "Activar notificaciones en este dispositivo"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onDesactivarPush}
                    disabled={pushDevice?.loading === "desactivar"}
                    className="rounded-lg border-2 border-amber-300 bg-amber-500 px-3 py-2 text-[10px] font-black uppercase text-black hover:bg-amber-400 disabled:opacity-50 transition"
                  >
                    {pushDevice?.loading === "desactivar"
                      ? "Desactivando..."
                      : "Desactivar este dispositivo"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={onProbarPush}
                  disabled={pushDevice?.loading === "test"}
                  className="rounded-lg border-2 border-blue-300 bg-blue-600 px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-blue-500 disabled:opacity-50 transition"
                >
                  {pushDevice?.loading === "test" ? "Enviando..." : "Enviar prueba"}
                </button>

                {puedeProbarCritico && (
                  <button
                    type="button"
                    onClick={onProbarPushCritico}
                    disabled={pushDevice?.loading === "test-critical"}
                    className="rounded-lg border-2 border-red-300 bg-red-700 px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-red-800 disabled:opacity-50 transition"
                  >
                    {pushDevice?.loading === "test-critical"
                      ? "Enviando..."
                      : "Enviar prueba critica"}
                  </button>
                )}
              </div>
            </div>

            {ultimas.length === 0 ? (
              <div className="p-5 text-sm font-black uppercase text-gray-400">
                Sin notificaciones internas
              </div>
            ) : (
              <div className="max-h-[420px] overflow-auto divide-y-2 divide-black">
                {ultimas.map((notificacion) => {
                  const urlAccion = obtenerUrlAccionNotificacion(notificacion);

                  return (
                    <div
                      key={notificacion.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onAbrirAccion(notificacion)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onAbrirAccion(notificacion);
                        }
                      }}
                      className={`p-4 text-left transition hover:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-300 ${
                        notificacion.leida ? "bg-white" : "bg-blue-50"
                      }`}
                    >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase text-blue-700">
                          {notificacion.tipo || "GENERAL"}
                        </p>
                        <h3 className="text-sm font-black uppercase text-black">
                          {notificacion.titulo || "Sin titulo"}
                        </h3>
                      </div>

                      <span
                        className={`shrink-0 border-2 rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                          notificacion.leida
                            ? getStatusColor("ARCHIVADO", "soft")
                            : getStatusColor("PENDIENTE", "soft")
                        }`}
                      >
                        {notificacion.leida ? "Leida" : "No leida"}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-gray-600 mt-2">
                      {notificacion.mensaje || "Sin mensaje"}
                    </p>

                    <p
                      className={`mt-2 text-[10px] font-black uppercase ${
                        urlAccion ? "text-blue-700" : "text-gray-400"
                      }`}
                    >
                      {urlAccion
                        ? "Click para ir a la accion exacta"
                        : "Sin accion directa disponible"}
                    </p>

                    <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <p className="text-[10px] font-black uppercase text-gray-400">
                        {formatearFechaNotificacion(notificacion.createdAt)}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {urlAccion && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onAbrirAccion(notificacion);
                            }}
                            className="bg-blue-700 text-white px-3 py-2 rounded text-[10px] font-black uppercase hover:bg-black transition"
                          >
                            Ver accion
                          </button>
                        )}

                        {!notificacion.leida && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onMarcarLeida(notificacion.id);
                          }}
                          className="bg-black text-white px-3 py-2 rounded text-[10px] font-black uppercase hover:bg-blue-700 transition"
                        >
                          Marcar como leida
                        </button>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

const AlertaNotificacionFlotante = ({
  notificacion,
  onCerrar,
  onVer,
  onMarcarLeida,
}) => {
  if (!notificacion) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[60] w-[calc(100%-2.5rem)] max-w-lg border-4 border-red-900 bg-white rounded-2xl shadow-[0_0_0_6px_rgba(239,68,68,0.28),12px_12px_0px_0px_rgba(127,29,29,0.9)] overflow-hidden animate-pulse">
      <div className="bg-red-800 px-4 py-3 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100">
              Centro de atención
            </p>
            <h2 className="text-xl font-black uppercase leading-tight">
              Nueva alerta operativa
            </h2>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full border-2 border-white px-2 py-1 text-[10px] font-black uppercase text-white hover:bg-white hover:text-red-800 transition"
          >
            Cerrar
          </button>
        </div>
      </div>

      <div className="p-4">
        <p className="text-[10px] font-black uppercase text-blue-700">
          {notificacion.tipo || "GENERAL"}
        </p>
        <h3 className="mt-1 text-base font-black uppercase text-black">
          {notificacion.titulo || "Notificación interna"}
        </h3>
        <p className="mt-2 text-sm font-bold leading-relaxed text-gray-700">
          {notificacion.mensaje || "Tienes una nueva tarea o alerta operativa."}
        </p>
        <p className="mt-3 text-[10px] font-black uppercase text-gray-400">
          {formatearFechaNotificacion(notificacion.createdAt)}
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onVer}
            className="flex-1 bg-red-800 px-4 py-3 text-xs font-black uppercase text-white rounded-lg hover:bg-red-900 transition"
          >
            Ver
          </button>
          <button
            type="button"
            onClick={() => onMarcarLeida(notificacion.id)}
            className="flex-1 border-2 border-black bg-white px-4 py-3 text-xs font-black uppercase text-black rounded-lg hover:bg-gray-100 transition"
          >
            Marcar leída
          </button>
        </div>
      </div>
    </div>
  );
};

function Dashboard({ usuario, actualizarNotificaciones }) {
  const puedeVerBase = ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"].includes(
    usuario?.rol
  );
  const puedeVerFileService = tieneRol(usuario, PERMISOS_RUTAS["/archivos-ecu"]);
  const mostrarComercial = puedeVerMetricasComerciales(usuario);
  const mostrarOperacion = puedeVerOperacion(usuario);
  const mostrarAgentesIA = puedeVerAgentesIA(usuario);
  const mostrarAutomatizaciones = puedeVerAutomatizaciones(usuario);
  const mostrarScheduler = puedeVerSchedulerInterno(usuario);
  const mostrarCRM = ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"].includes(
    String(usuario?.rol || "").toUpperCase()
  );
  const mostrarChecklistLunes = ["OWNER", "ADMIN", "SUPERVISOR"].includes(
    String(usuario?.rol || "").toUpperCase()
  );
  const puedeGenerarReportesAutomatizacion = ["OWNER", "ADMIN"].includes(
    String(usuario?.rol || "").toUpperCase()
  );
  const puedeVerFinanzasAutomatizacion = puedeGenerarReportesAutomatizacion;
  const puedeVerMaterialAutomatizacion = ["OWNER", "ADMIN", "SUPERVISOR"].includes(
    String(usuario?.rol || "").toUpperCase()
  );

  const [stats, setStats] = useState({
    cajaHoy: 0,
    cajaSemana: 0,
    cajaMes: 0,
    trabajosIngresadosHoy: 0,
    pendientePagoMonto: 0,
    montoTotalRegistrado: 0,
    presupuestadoNoPagado: 0,
    totalPagadoMes: 0,
    ticketPromedioMes: 0,
    ordenesActivas: 0,
    listasEntrega: 0,
    pendientesPago: 0,
    entregadasHoy: 0,
    mecanicaAsociadaCurso: 0,
    mecanicaIndependiente: 0,
    fileServiceActivos: 0,
    fileServicePostPendiente: 0,
    fileServiceCorrecciones: 0,
    processGuard: {
      total: 0,
      criticos: 0,
      porResponsable: {},
    },
    correccionesTecnicasPendientes: 0,
    atencionInmediata: [],
    semaforoOperativo: {
      estado: "Operacion normal",
      color: "verde",
      detalle: "Sin bloqueos operativos relevantes",
    },
    colaTrabajo: [],
    fileServiceResumen: [],
    postventaPendientesDetalle: [],
    alertasOperativas: [],
    checklistOperativo: [],
    leads: {
      total: 0,
      nuevos: 0,
      potenciales_reales: 0,
      sin_responder_30m: 0,
      cotizados_pendientes: 0,
      sin_datos_minimos: 0,
      presupuesto_bajo: 0,
      leads_calientes: 0,
      leads_por_campania: 0,
      campania_top_potenciales: null,
      ganados_semana: 0,
      perdidos_semana: 0,
      tasa_conversion: 0,
    },
    finanzas: null,
    graficos: {
      ventas: [],
      ordenesEstado: [],
      materialMes: [],
      ingresosGastos: [],
    },
    clientes: puedeVerBase ? 0 : "Sin acceso",
    vehiculos: puedeVerBase ? 0 : "Sin acceso",
    ordenes: 0,
    ultimaActualizacion: null,
  });
  const [cargandoDashboard, setCargandoDashboard] = useState(false);
  const [bitacoraOperativa, setBitacoraOperativa] = useState({
    items: [],
    puedeResolver: false,
    error: "",
  });
  const [agentesIA, setAgentesIA] = useState({
    items: [],
    error: "",
    cargando: false,
    ultimaActualizacion: null,
  });
  const [automatizaciones, setAutomatizaciones] = useState({
    resultado: null,
    ultimoReporte: null,
    error: "",
    cargando: "",
    ultimaEjecucion: null,
    scheduler: {
      enabled: false,
      intervalMinutes: 10,
      startDelaySeconds: 30,
      startedAt: null,
      lastRunAt: null,
      lastRunSummary: null,
      nextRunEstimate: null,
      running: false,
      error: "",
    },
  });
  const [bitacoraForm, setBitacoraForm] = useState({
    tipo: "OPERACION",
    prioridad: "MEDIA",
    titulo: "",
    descripcion: "",
    modulo_relacionado: "",
  });
  const [guardandoBitacora, setGuardandoBitacora] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastKeysRef = useRef(new Set());

  const normalizarArray = (respuesta) => {
    const data = respuesta?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.ordenes)) return data.ordenes;
    if (Array.isArray(data?.clientes)) return data.clientes;
    if (Array.isArray(data?.vehiculos)) return data.vehiculos;
    if (Array.isArray(data?.archivos)) return data.archivos;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  };

  const numero = (valor) => {
    const parsed = Number(valor || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const montoPagadoOrden = (orden) => {
    if (String(orden.estado_pago || "").toUpperCase() !== "PAGADO") {
      return 0;
    }

    const pagado = numero(orden.monto_pagado);
    if (pagado > 0) return pagado;
    return numero(orden.monto_total);
  };

  const parseFecha = (valor) => {
    if (!valor) return null;
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  };

  const inicioDiaLocal = (base) => {
    const fecha = new Date(base);
    fecha.setHours(0, 0, 0, 0);
    return fecha;
  };

  const finDiaLocal = (base) => {
    const fecha = new Date(base);
    fecha.setHours(23, 59, 59, 999);
    return fecha;
  };

  const dentroDelDiaLocal = (fecha, base) => {
    if (!fecha) return false;
    return fecha >= inicioDiaLocal(base) && fecha <= finDiaLocal(base);
  };

  const inicioSemana = (base) => {
    const fecha = new Date(base);
    const dia = fecha.getDay() || 7;
    fecha.setDate(fecha.getDate() - dia + 1);
    fecha.setHours(0, 0, 0, 0);
    return fecha;
  };

  const formatoCLP = (valor) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(numero(valor));

  const horasDesde = (fecha, base) => {
    if (!fecha) return 0;
    return Math.max(0, (base.getTime() - fecha.getTime()) / 36e5);
  };

  const formatoTiempo = (horas) => {
    if (horas < 1) return "menos de 1h";
    if (horas < 24) return `${Math.floor(horas)}h`;
    return `${Math.floor(horas / 24)}d ${Math.floor(horas % 24)}h`;
  };

  const prioridadAlerta = {
    critica: 3,
    atencion: 2,
    seguimiento: 1,
  };

  const crearItemChecklist = (label, contador) => ({
    label,
    contador,
    estado: contador > 0 ? "Atención" : "OK",
  });

  const textoClienteVehiculoOrden = (orden) => {
    const cliente =
      orden?.Vehiculo?.Cliente?.nombre ||
      orden?.Cliente?.nombre ||
      orden?.cliente_nombre ||
      "Cliente no registrado";
    const vehiculo = [
      orden?.Vehiculo?.patente || orden?.vehiculo_patente,
      orden?.Vehiculo?.marca || orden?.vehiculo_marca,
      orden?.Vehiculo?.modelo || orden?.vehiculo_modelo,
    ]
      .filter(Boolean)
      .join(" ");

    return `${cliente} - ${vehiculo || "Vehiculo no registrado"}`;
  };

  const responsablePrincipalOrden = (orden) =>
    orden?.diagnostico_asignado_a ||
    orden?.operador_ecu_asignado_a ||
    orden?.mecanico_asignado_a ||
    orden?.supervisor_asignado_a ||
    orden?.recepcionado_por ||
    "Sin asignar";

  const proximaAccionOrden = (orden) => {
    const estado = String(orden?.estado || "").toUpperCase();
    const estadoPago = String(orden?.estado_pago || "").toUpperCase();
    const correccion = String(orden?.correccion_estado || "").toUpperCase();
    const intervencion = String(orden?.intervencion_fisica_tipo || "").toUpperCase();

    if (correccion && !["CORRECCION_APLICADA", "CERRADA"].includes(correccion)) {
      return "Revisar postventa tecnica";
    }
    if (estado === "RECEPCIONADO") return "Enviar a diagnostico";
    if (estado === "PARA_DIAGNOSTICO") return "Realizar diagnostico";
    if (estado === "EN_PROGRAMACION") return "Continuar ECU/File Service";
    if (intervencion === "ASOCIADA_SERVICIO_TECNICO") {
      return "Completar intervencion fisica asociada";
    }
    if (["PARA_MECANICA", "EN_MECANICA"].includes(estado)) {
      return "Resolver mecanica independiente";
    }
    if (estado === "LISTO_PARA_ENTREGA" && estadoPago !== "PAGADO") {
      return "Confirmar pago antes de entrega";
    }
    if (estado === "LISTO_PARA_ENTREGA") return "Entregar";
    return "Mantener seguimiento";
  };

  const colorAtencion = (nivel) => {
    if (nivel === "rojo") return getStatusColor("ALERTA", "soft");
    if (nivel === "ambar") return getStatusColor("PENDIENTE", "soft");
    if (nivel === "azul") return getStatusColor("EN_PROCESO", "soft");
    if (nivel === "morado") return getStatusColor("REQUIERE_NUEVA_LECTURA", "soft");
    return getStatusColor("OK", "soft");
  };

  const cerrarToast = (id) => {
    setToasts((actuales) => actuales.filter((toast) => toast.id !== id));
  };

  const agregarToast = (toast) => {
    if (!toast?.id || toastKeysRef.current.has(toast.id)) return;

    toastKeysRef.current.add(toast.id);

    setToasts((actuales) => {
      const siguiente = [
        {
          ...toast,
          creadoEn: Date.now(),
        },
        ...actuales.filter((item) => item.id !== toast.id),
      ];

      return siguiente.slice(0, 3);
    });

    window.setTimeout(() => {
      cerrarToast(toast.id);
    }, 7000);
  };

  const crearToastsDesdeAlertas = (alertas = []) => {
    alertas.slice(0, 8).forEach((alerta) => {
      const tipoTexto = String(alerta.tipo || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const debeAvisar =
        alerta.severidad === "critica" ||
        tipoTexto.includes("cliente prioritario") ||
        tipoTexto.includes("correccion pendiente") ||
        tipoTexto.includes("pago pendiente");

      if (!debeAvisar) return;

      agregarToast({
        id: `toast-${alerta.id}`,
        tipo: alerta.severidad === "critica" ? "critico" : "atencion",
        titulo: alerta.tipo,
        mensaje: `${alerta.referencia} - ${alerta.estado} - ${alerta.tiempo}`,
      });
    });
  };

  const calcularDashboard = (
    ordenes,
    clientes,
    vehiculos,
    archivos,
    finanzas = null,
    leadsResumen = null
  ) => {
    const hoy = new Date();
    const desdeSemana = inicioSemana(hoy);
    const pagadasMes = [];
    const alertasOperativas = [];
    const agregarAlerta = (alerta) => {
      if (!alerta?.id) return;
      if (alertasOperativas.some((item) => item.id === alerta.id)) return;
      alertasOperativas.push(alerta);
    };
    const esVerdadero = (valor) =>
      valor === true || String(valor || "").toLowerCase() === "true";
    const clientesExcluidosIds = new Set(
      clientes
        .filter((cliente) => esVerdadero(cliente?.excluir_estadisticas))
        .map((cliente) => String(cliente.id))
    );
    const clienteExcluidoEnOrden = (orden) => {
      const cliente = orden?.Vehiculo?.Cliente || orden?.Cliente;
      const clienteId =
        cliente?.id ||
        orden?.clienteId ||
        orden?.cliente_id ||
        orden?.Vehiculo?.clienteId ||
        orden?.Vehiculo?.cliente_id;

      return (
        esVerdadero(cliente?.excluir_estadisticas) ||
        (clienteId && clientesExcluidosIds.has(String(clienteId)))
      );
    };
    const ordenExcluida = (orden) =>
      esVerdadero(orden?.excluir_estadisticas) || clienteExcluidoEnOrden(orden);
    const ordenesReales = ordenes.filter((orden) => !ordenExcluida(orden));
    const clientesReales = clientes.filter(
      (cliente) => !esVerdadero(cliente?.excluir_estadisticas)
    );
    const vehiculosReales = vehiculos.filter((vehiculo) => {
      const cliente = vehiculo?.Cliente || vehiculo?.cliente;
      const clienteId = cliente?.id || vehiculo?.clienteId || vehiculo?.cliente_id;

      return (
        !esVerdadero(cliente?.excluir_estadisticas) &&
        (!clienteId || !clientesExcluidosIds.has(String(clienteId)))
      );
    });

    const comercial = ordenesReales.reduce(
      (acc, orden) => {
        const fechaPago = parseFecha(orden.fecha_pago);
        const fechaCreacion = parseFecha(orden.createdAt);
        const pagado = montoPagadoOrden(orden);
        const montoTotal = numero(orden.monto_total);
        const estadoPago = String(orden.estado_pago || "").toUpperCase();

        if (dentroDelDiaLocal(fechaCreacion, hoy)) {
          acc.trabajosIngresadosHoy += montoTotal;
        }

        acc.montoTotalRegistrado += montoTotal;

        if (estadoPago !== "PAGADO" && montoTotal > 0) {
          acc.pendientePagoMonto += montoTotal;
          acc.presupuestadoNoPagado += montoTotal;
        }

        if (!fechaPago || pagado <= 0) return acc;

        if (dentroDelDiaLocal(fechaPago, hoy)) acc.cajaHoy += pagado;
        if (fechaPago >= desdeSemana) acc.cajaSemana += pagado;

        if (
          fechaPago.getFullYear() === hoy.getFullYear() &&
          fechaPago.getMonth() === hoy.getMonth()
        ) {
          acc.cajaMes += pagado;
          acc.totalPagadoMes += pagado;
          pagadasMes.push(pagado);
        }

        return acc;
      },
      {
        cajaHoy: 0,
        cajaSemana: 0,
        cajaMes: 0,
        trabajosIngresadosHoy: 0,
        pendientePagoMonto: 0,
        montoTotalRegistrado: 0,
        presupuestadoNoPagado: 0,
        totalPagadoMes: 0,
      }
    );

    const ordenesPorEstadoMap = ordenesReales.reduce((acc, orden) => {
      const estado = String(orden.estado || "SIN_ESTADO").toUpperCase();
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    const ordenesEstadoGrafico = Object.entries(ordenesPorEstadoMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }));

    const entregadasHoy = ordenesReales.filter((orden) => {
      const estado = String(orden.estado || "").toUpperCase();
      const fechaEntrega =
        parseFecha(orden.entregado_at) ||
        (estado === "ENTREGADO" ? parseFecha(orden.updatedAt) : null);
      return estado === "ENTREGADO" && dentroDelDiaLocal(fechaEntrega, hoy);
    }).length;

    const fileServiceActivos = archivos.filter((archivo) => {
      const estado = String(archivo.estado || "").toUpperCase();
      return (
        !archivo.archivado &&
        !["FINALIZADO_TECNICO", "FINALIZADO", "ARCHIVADO"].includes(estado)
      );
    }).length;

    const archivoActivo = (archivo) => {
      const estado = String(archivo.estado || "").toUpperCase();
      return (
        !archivo.archivado &&
        !["FINALIZADO_TECNICO", "FINALIZADO", "ARCHIVADO"].includes(estado)
      );
    };

    const ordenesSinDiagnostico = ordenesReales.filter((orden) => {
      const estado = String(orden.estado || "").toUpperCase();
      return ["RECEPCIONADO", "PARA_DIAGNOSTICO"].includes(estado);
    }).length;

    const fileServiceSinPostOk = archivos.filter(
      (archivo) =>
        archivoActivo(archivo) &&
        String(archivo.post_escritura_estado || "").toUpperCase() !== "OK"
    ).length;

    const archivosSinCierreTecnico = archivos.filter((archivo) => {
      const estado = String(archivo.estado || "").toUpperCase();
      const guard = String(archivo.proceso_guard_estado || "").toUpperCase();
      const cerrado =
        archivo.cierre_tecnico_at ||
        ["FINALIZADO_TECNICO", "FINALIZADO", "ARCHIVADO"].includes(estado) ||
        guard === "CERRADO";

      return (
        archivo.archivo_modificado &&
        !archivo.archivado &&
        !cerrado &&
        archivo.cierre_tecnico_obligatorio !== false
      );
    });

    const processGuardCriticos = archivosSinCierreTecnico.filter((archivo) =>
      ["CRITICO", "ESCALADO"].includes(
        String(archivo.proceso_guard_estado || "").toUpperCase()
      )
    );

    const processGuardPorResponsable = archivosSinCierreTecnico.reduce(
      (acc, archivo) => {
        const responsable =
          archivo.proceso_guard_responsable_id ||
          archivo.operador_ecu_asignado_a ||
          archivo.tuner_asignado_a ||
          archivo.slave_asignado_a ||
          "Sin responsable";
        acc[responsable] = (acc[responsable] || 0) + 1;
        return acc;
      },
      {}
    );

    const correccionesPendientes = archivos.filter(
      (archivo) =>
        archivo.correccion_pendiente === true ||
        String(archivo.estado || "").toUpperCase() === "REQUIERE_CORRECCION"
    ).length;

    const correccionesTecnicasPendientes = ordenesReales.filter((orden) => {
      const estadoCorreccion = String(orden.correccion_estado || "").toUpperCase();
      return (
        estadoCorreccion &&
        !["CORRECCION_APLICADA", "CERRADA"].includes(estadoCorreccion)
      );
    }).length;

    const listasEntrega = ordenesReales.filter(
      (orden) =>
        String(orden.estado || "").toUpperCase() === "LISTO_PARA_ENTREGA"
    ).length;

    const pagosPendientes = ordenesReales.filter(
      (orden) => String(orden.estado_pago || "").toUpperCase() !== "PAGADO"
    ).length;

    const mecanicaAsociadaCurso = ordenesReales.filter((orden) => {
      const estado = String(orden.estado || "").toUpperCase();
      const tipoIntervencion = String(
        orden.intervencion_fisica_tipo || ""
      ).toUpperCase();

      return (
        estado !== "ENTREGADO" &&
        tipoIntervencion === "ASOCIADA_SERVICIO_TECNICO"
      );
    }).length;

    const mecanicaIndependiente = ordenesReales.filter((orden) => {
      const estado = String(orden.estado || "").toUpperCase();
      const tipoIntervencion = String(
        orden.intervencion_fisica_tipo || ""
      ).toUpperCase();

      return (
        estado !== "ENTREGADO" &&
        (tipoIntervencion === "MECANICA_INDEPENDIENTE" ||
          ["PARA_MECANICA", "EN_MECANICA"].includes(estado))
      );
    }).length;

    const postventaPendientesDetalle = ordenesReales
      .filter((orden) => {
        const estadoCorreccion = String(orden.correccion_estado || "").toUpperCase();
        return (
          estadoCorreccion &&
          !["CORRECCION_APLICADA", "CERRADA"].includes(estadoCorreccion)
        );
      })
      .slice(0, 6)
      .map((orden) => ({
        id: orden.id,
        clienteVehiculo: textoClienteVehiculoOrden(orden),
        dtc: orden.correccion_dtc || "Sin DTC registrado",
        clienteVolvio: orden.correccion_cliente_volvio === true,
        responsable: orden.correccion_responsable_sugerido || responsablePrincipalOrden(orden),
        estado: orden.correccion_estado || "CORRECCION_SOLICITADA",
        prioridad: orden.correccion_prioridad || "MEDIA",
      }));

    const archivosPendienteRevision = archivos.filter((archivo) =>
      ["ORIGINAL_CARGADO", "NOTIFICADO_MASTER"].includes(
        String(archivo.estado || "").toUpperCase()
      )
    ).length;
    const archivosModListo = archivos.filter((archivo) =>
      ["MODIFICADO_LISTO", "NOTIFICADO_SLAVE"].includes(
        String(archivo.estado || "").toUpperCase()
      )
    ).length;
    const archivosNuevaLectura = archivos.filter((archivo) => {
      const estado = String(archivo.estado || "").toUpperCase();
      return (
        estado === "REQUIERE_NUEVA_LECTURA" ||
        archivo.requiere_nueva_lectura === true ||
        archivo.nueva_lectura_requerida === true
      );
    }).length;
    const archivosEnProceso = archivos.filter((archivo) => {
      const estado = String(archivo.estado || "").toUpperCase();
      return (
        archivoActivo(archivo) &&
        ![
          "ORIGINAL_CARGADO",
          "NOTIFICADO_MASTER",
          "MODIFICADO_LISTO",
          "NOTIFICADO_SLAVE",
          "POST_ESCRITURA_PENDIENTE",
          "REQUIERE_CORRECCION",
          "REQUIERE_NUEVA_LECTURA",
        ].includes(estado)
      );
    }).length;
    const pagosBloqueandoEntrega = ordenesReales.filter((orden) => {
      const estado = String(orden.estado || "").toUpperCase();
      const estadoPago = String(orden.estado_pago || "").toUpperCase();
      return estado === "LISTO_PARA_ENTREGA" && estadoPago !== "PAGADO";
    }).length;
    const clientesVolvieronPostventa = ordenesReales.filter((orden) => {
      const estadoCorreccion = String(orden.correccion_estado || "").toUpperCase();
      return (
        orden.correccion_cliente_volvio === true &&
        estadoCorreccion &&
        !["CORRECCION_APLICADA", "CERRADA"].includes(estadoCorreccion)
      );
    }).length;
    const correccionesUrgentes = ordenesReales.filter((orden) => {
      const estadoCorreccion = String(orden.correccion_estado || "").toUpperCase();
      return (
        estadoCorreccion &&
        !["CORRECCION_APLICADA", "CERRADA"].includes(estadoCorreccion) &&
        String(orden.correccion_prioridad || "").toUpperCase() === "URGENTE"
      );
    }).length;

    const semaforoOperativo =
      correccionesUrgentes > 0 ||
      clientesVolvieronPostventa > 0 ||
      pagosBloqueandoEntrega > 0 ||
      processGuardCriticos.length > 0
        ? {
            estado: "Bloqueo operativo",
            color: "rojo",
            detalle:
              "Hay postventa urgente, Process Guard critico, cliente que volvio o pago bloqueando entrega.",
          }
        : archivosPendienteRevision > 0 ||
          archivosNuevaLectura > 0 ||
          fileServiceSinPostOk > 0 ||
          archivosSinCierreTecnico.length > 0 ||
          mecanicaAsociadaCurso > 0 ||
          mecanicaIndependiente > 0
        ? {
            estado: "Atencion requerida",
            color: "ambar",
            detalle: "Hay trabajos acumulados o etapas pendientes de cierre tecnico.",
          }
        : {
            estado: "Operacion normal",
            color: "verde",
            detalle: "Sin bloqueos operativos relevantes.",
          };

    const atencionInmediata = [
      {
        label: "Correcciones tecnicas pendientes",
        valor: correccionesTecnicasPendientes,
        nivel: correccionesUrgentes > 0 ? "rojo" : "ambar",
        to: "/ordenes",
        detalle: "Postventa tecnica activa",
      },
      {
        label: "Clientes que volvieron por DTC/postventa",
        valor: clientesVolvieronPostventa,
        nivel: clientesVolvieronPostventa > 0 ? "rojo" : "verde",
        to: "/ordenes",
        detalle: "Debe quedar trazado",
      },
      {
        label: "Archivos ECU pendientes",
        valor: archivosPendienteRevision,
        nivel: archivosPendienteRevision > 0 ? "ambar" : "verde",
        to: "/archivos-ecu",
        detalle: "Originales por revisar",
      },
      {
        label: "Post escritura pendiente",
        valor: fileServiceSinPostOk,
        nivel: fileServiceSinPostOk > 0 ? "rojo" : "verde",
        to: "/archivos-ecu",
        detalle: "Trabajo tecnico inconcluso",
      },
      {
        label: "Procesos sin cierre",
        valor: archivosSinCierreTecnico.length,
        nivel:
          processGuardCriticos.length > 0
            ? "rojo"
            : archivosSinCierreTecnico.length > 0
            ? "ambar"
            : "verde",
        to: "/archivos-ecu#post-escritura",
        detalle: "Process Guard activo",
      },
      {
        label: "Nueva lectura requerida",
        valor: archivosNuevaLectura,
        nivel: archivosNuevaLectura > 0 ? "rojo" : "verde",
        to: "/archivos-ecu",
        detalle: "Lectura debe repetirse",
      },
      {
        label: "MOD listo",
        valor: archivosModListo,
        nivel: archivosModListo > 0 ? "azul" : "verde",
        to: "/archivos-ecu",
        detalle: "Esperando escritura/notificacion",
      },
      {
        label: "Vehiculos listos para entrega",
        valor: listasEntrega,
        nivel: listasEntrega > 0 ? "azul" : "verde",
        to: "/ordenes",
        detalle: "Cerrar comercialmente",
      },
      {
        label: "Pagos pendientes antes de entrega",
        valor: pagosBloqueandoEntrega,
        nivel: pagosBloqueandoEntrega > 0 ? "rojo" : "verde",
        to: "/ordenes",
        detalle: "Bloquea entrega",
      },
      {
        label: "Mecanica asociada al servicio en curso",
        valor: mecanicaAsociadaCurso,
        nivel: mecanicaAsociadaCurso > 0 ? "ambar" : "verde",
        to: "/ordenes",
        detalle: "No separa flujo ECU/File Service",
      },
      {
        label: "Mecanica independiente / mantencion",
        valor: mecanicaIndependiente,
        nivel: mecanicaIndependiente > 0 ? "azul" : "verde",
        to: "/ordenes",
        detalle: "Rama mecanica separada",
      },
    ];

    const fileServiceResumen = [
      { label: "Pendiente revision", valor: archivosPendienteRevision, nivel: "ambar" },
      { label: "En proceso", valor: archivosEnProceso, nivel: "azul" },
      { label: "MOD listo", valor: archivosModListo, nivel: "azul" },
      { label: "Correccion pendiente", valor: correccionesPendientes, nivel: "rojo" },
      { label: "Nueva lectura requerida", valor: archivosNuevaLectura, nivel: "rojo" },
      { label: "Post escritura pendiente", valor: fileServiceSinPostOk, nivel: "ambar" },
      {
        label: "Procesos sin cierre",
        valor: archivosSinCierreTecnico.length,
        nivel: processGuardCriticos.length > 0 ? "rojo" : "ambar",
      },
    ];

    const pesoPrioridad = {
      URGENTE: 1,
      ALTA: 2,
      MEDIA: 3,
      BAJA: 4,
    };
    const colaTrabajo = ordenesReales
      .filter((orden) => String(orden.estado || "").toUpperCase() !== "ENTREGADO")
      .sort((a, b) => {
        const pa = pesoPrioridad[String(a.prioridad || "").toUpperCase()] || 9;
        const pb = pesoPrioridad[String(b.prioridad || "").toUpperCase()] || 9;
        if (pa !== pb) return pa - pb;
        return (
          (parseFecha(a.createdAt)?.getTime() || 0) -
          (parseFecha(b.createdAt)?.getTime() || 0)
        );
      })
      .slice(0, 8)
      .map((orden) => ({
        id: orden.id,
        clienteVehiculo: textoClienteVehiculoOrden(orden),
        estado: orden.estado || "PENDIENTE",
        prioridad: orden.prioridad || "MEDIA",
        responsable: responsablePrincipalOrden(orden),
        proximaAccion: proximaAccionOrden(orden),
        intervencion:
          orden.intervencion_fisica_tipo === "ASOCIADA_SERVICIO_TECNICO"
            ? "Mecanica asociada"
            : orden.intervencion_fisica_tipo === "MECANICA_INDEPENDIENTE"
            ? "Mecanica independiente"
            : "Sin intervencion fisica",
        correccion: orden.correccion_estado || "",
      }));

    ordenesReales.forEach((orden) => {
      const estado = String(orden.estado || "").toUpperCase();
      const estadoPago = String(orden.estado_pago || "").toUpperCase();
      const referenciaFecha = parseFecha(orden.updatedAt);
      const horas = horasDesde(referenciaFecha, hoy);
      const categoriaCliente = String(
        orden?.Vehiculo?.Cliente?.categoria_cliente ||
          orden?.Cliente?.categoria_cliente ||
          orden?.cliente_categoria_cliente ||
          ""
      ).toUpperCase();
      const estadoCorreccion = String(orden.correccion_estado || "").toUpperCase();

      if (
        estadoCorreccion &&
        !["CORRECCION_APLICADA", "CERRADA"].includes(estadoCorreccion)
      ) {
        agregarAlerta({
          id: `orden-${orden.id}-correccion-tecnica`,
          severidad:
            estadoCorreccion === "CORRECCION_SOLICITADA" ? "critica" : "atencion",
          tipo: "Corrección técnica pendiente",
          referencia: `Orden #${orden.id}`,
          tiempo: formatoTiempo(horas),
          estado: estadoCorreccion,
          horas,
        });
      }

      if (
        estado !== "ENTREGADO" &&
        ["VIP", "FLOTA", "TALLER_ALIADO", "GARANTIA_RECLAMO"].includes(
          categoriaCliente
        )
      ) {
        agregarAlerta({
          id: `orden-${orden.id}-cliente-prioritario-${categoriaCliente}`,
          severidad:
            categoriaCliente === "GARANTIA_RECLAMO" ? "critica" : "atencion",
          tipo: `Cliente prioritario: ${categoriaCliente}`,
          referencia: `Orden #${orden.id}`,
          tiempo: formatoTiempo(horas),
          estado: orden.estado || "ACTIVA",
          horas,
        });
      }

      if (estado === "RECEPCIONADO" && horas > 2) {
        agregarAlerta({
          id: `orden-${orden.id}-recepcionado`,
          severidad: "atencion",
          tipo: "Recepcionado más de 2h",
          referencia: `Orden #${orden.id}`,
          tiempo: formatoTiempo(horas),
          estado: orden.estado || "RECEPCIONADO",
          horas,
        });
      }

      if (estado === "PARA_DIAGNOSTICO" && horas > 4) {
        agregarAlerta({
          id: `orden-${orden.id}-diagnostico`,
          severidad: "atencion",
          tipo: "Diagnóstico pendiente más de 4h",
          referencia: `Orden #${orden.id}`,
          tiempo: formatoTiempo(horas),
          estado: orden.estado || "PARA_DIAGNOSTICO",
          horas,
        });
      }

      if (estado === "EN_PROGRAMACION" && horas > 24) {
        agregarAlerta({
          id: `orden-${orden.id}-programacion`,
          severidad: "critica",
          tipo: "Programación detenida más de 24h",
          referencia: `Orden #${orden.id}`,
          tiempo: formatoTiempo(horas),
          estado: orden.estado || "EN_PROGRAMACION",
          horas,
        });
      }

      if (estado === "LISTO_PARA_ENTREGA" && estadoPago !== "PAGADO") {
        agregarAlerta({
          id: `orden-${orden.id}-pago-pendiente`,
          severidad: "atencion",
          tipo: "Lista para entrega con pago pendiente",
          referencia: `Orden #${orden.id}`,
          tiempo: formatoTiempo(horas),
          estado: orden.estado || "LISTO_PARA_ENTREGA",
          horas,
        });
      }
    });

    archivos.forEach((archivo) => {
      const estado = String(archivo.estado || "").toUpperCase();
      const fechaCreacion = parseFecha(archivo.createdAt);
      const horas = horasDesde(fechaCreacion, hoy);
      const activo =
        !archivo.archivado &&
        !["FINALIZADO_TECNICO", "FINALIZADO", "ARCHIVADO"].includes(estado);

      if (
        ["MODIFICADO_LISTO", "NOTIFICADO_SLAVE", "POST_ESCRITURA_PENDIENTE"].includes(
          estado
        ) &&
        String(archivo.post_escritura_estado || "").toUpperCase() !== "OK"
      ) {
        agregarAlerta({
          id: `file-${archivo.id}-post`,
          severidad: "atencion",
          tipo: "File Service sin post escritura OK",
          referencia: `File #${archivo.id}`,
          tiempo: formatoTiempo(horas),
          estado: archivo.estado || "PENDIENTE_POST",
          horas,
        });
      }

      if (
        archivo.archivo_modificado &&
        !archivo.cierre_tecnico_at &&
        archivo.cierre_tecnico_obligatorio !== false
      ) {
        const guard = String(archivo.proceso_guard_estado || "").toUpperCase();
        agregarAlerta({
          id: `file-${archivo.id}-process-guard`,
          severidad: ["CRITICO", "ESCALADO"].includes(guard)
            ? "critica"
            : "atencion",
          tipo: "Process Guard sin cierre tecnico",
          referencia: `File #${archivo.id}`,
          tiempo: formatoTiempo(horas),
          estado: guard || "PENDIENTE",
          horas,
        });
      }

      if (estado === "REQUIERE_CORRECCION" || archivo.correccion_pendiente === true) {
        agregarAlerta({
          id: `file-${archivo.id}-correccion`,
          severidad: "critica",
          tipo: "File Service con corrección pendiente",
          referencia: `File #${archivo.id}`,
          tiempo: formatoTiempo(horas),
          estado: archivo.estado || "REQUIERE_CORRECCION",
          horas,
        });
      }

      if (activo && horas > 24) {
        agregarAlerta({
          id: `file-${archivo.id}-activo-24`,
          severidad: horas > 48 ? "critica" : "atencion",
          tipo: "File Service activo más de 24h",
          referencia: `File #${archivo.id}`,
          tiempo: formatoTiempo(horas),
          estado: archivo.estado || "ACTIVO",
          horas,
        });
      }
    });

    const alertasOrdenadas = alertasOperativas.sort((a, b) => {
      const prioridad = prioridadAlerta[b.severidad] - prioridadAlerta[a.severidad];
      if (prioridad !== 0) return prioridad;
      return b.horas - a.horas;
    });

    const graficos = {
      ventas: [
        { label: "Pagado mes", value: comercial.totalPagadoMes, color: "bg-green-600" },
        { label: "Pendiente", value: comercial.pendientePagoMonto, color: "bg-yellow-500" },
      ],
      ordenesEstado: ordenesEstadoGrafico.map((item) => ({
        ...item,
        color: "bg-blue-600",
      })),
      materialMes: [
        {
          label: "Kg reales",
          value: Number(finanzas?.material_mes?.kg_reales || 0),
          color: "bg-slate-700",
        },
        {
          label: "Kg esperados",
          value: Number(finanzas?.material_mes?.kg_esperados || 0),
          color: "bg-blue-500",
        },
      ],
      ingresosGastos: [
        {
          label: "Ingresos semana",
          value: Number(finanzas?.ingresos_total || 0),
          color: "bg-green-600",
        },
        {
          label: "Egresos semana",
          value: Number(finanzas?.egresos_total || 0) + Number(finanzas?.sueldos_total || 0),
          color: "bg-red-600",
        },
      ],
    };

    return {
      ...comercial,
      ticketPromedioMes: pagadasMes.length
        ? comercial.totalPagadoMes / pagadasMes.length
        : 0,
      ordenesActivas: ordenesReales.filter(
        (orden) => String(orden.estado || "").toUpperCase() !== "ENTREGADO"
      ).length,
      listasEntrega,
      pendientesPago: ordenesReales.filter(
        (orden) =>
          String(orden.estado_pago || "").toUpperCase() !== "PAGADO" &&
          String(orden.estado || "").toUpperCase() !== "ENTREGADO"
      ).length,
      entregadasHoy,
      mecanicaAsociadaCurso,
      mecanicaIndependiente,
      fileServiceActivos,
      fileServicePostPendiente: archivos.filter((archivo) =>
        ["MODIFICADO_LISTO", "NOTIFICADO_SLAVE", "POST_ESCRITURA_PENDIENTE"].includes(
          String(archivo.estado || "").toUpperCase()
        )
      ).length,
      fileServiceCorrecciones: archivos.filter(
        (archivo) =>
          archivo.correccion_pendiente === true ||
          String(archivo.estado || "").toUpperCase() === "REQUIERE_CORRECCION"
      ).length,
      processGuard: {
        total: archivosSinCierreTecnico.length,
        criticos: processGuardCriticos.length,
        porResponsable: processGuardPorResponsable,
      },
      correccionesTecnicasPendientes,
      atencionInmediata,
      semaforoOperativo,
      colaTrabajo,
      fileServiceResumen,
      postventaPendientesDetalle,
      alertasOperativas: alertasOrdenadas,
      checklistOperativo: [
        crearItemChecklist("Órdenes sin diagnóstico", ordenesSinDiagnostico),
        crearItemChecklist("File Service sin post escritura OK", fileServiceSinPostOk),
        crearItemChecklist("Procesos tecnicos sin cierre", archivosSinCierreTecnico.length),
        crearItemChecklist("File Service con corrección pendiente", correccionesPendientes),
        crearItemChecklist("Órdenes listas para entrega", listasEntrega),
        crearItemChecklist("Correcciones técnicas pendientes", correccionesTecnicasPendientes),
        crearItemChecklist("Mecánica asociada en curso", mecanicaAsociadaCurso),
        crearItemChecklist("Mecánica independiente", mecanicaIndependiente),
        crearItemChecklist("Pagos pendientes", pagosPendientes),
        crearItemChecklist("Entregadas hoy", entregadasHoy),
      ],
      leads: {
        total: Number(leadsResumen?.total || 0),
        nuevos: Number(leadsResumen?.nuevos || 0),
        potenciales_reales: Number(leadsResumen?.potenciales_reales || 0),
        sin_responder_30m: Number(leadsResumen?.sin_responder_30m || 0),
        cotizados_pendientes: Number(leadsResumen?.cotizados_pendientes || 0),
        sin_datos_minimos: Number(leadsResumen?.sin_datos_minimos || 0),
        presupuesto_bajo: Number(leadsResumen?.presupuesto_bajo || 0),
        leads_calientes: Number(leadsResumen?.leads_calientes || 0),
        leads_por_campania: Number(leadsResumen?.leads_por_campania || 0),
        campania_top_potenciales: leadsResumen?.campania_top_potenciales || null,
        ganados_semana: Number(leadsResumen?.ganados_semana || 0),
        perdidos_semana: Number(leadsResumen?.perdidos_semana || 0),
        tasa_conversion: Number(leadsResumen?.tasa_conversion || 0),
      },
      finanzas,
      graficos,
      clientes: puedeVerBase ? clientesReales.length : "Sin acceso",
      vehiculos: puedeVerBase ? vehiculosReales.length : "Sin acceso",
      ordenes: ordenesReales.length,
      ultimaActualizacion: new Date().toLocaleString("es-CL", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    };
  };

  const normalizarAgenteIA = (definicion, respuesta) => {
    const data = respuesta?.data || {};

    return {
      id: definicion.id,
      titulo: data.agente || definicion.titulo,
      resumen: data.resumen || "Sin resumen disponible.",
      alertas: Array.isArray(data.alertas) ? data.alertas : [],
      sugerencias: Array.isArray(data.sugerencias) ? data.sugerencias : [],
      accionRecomendada:
        data.accionRecomendada ||
        data.accion_recomendada ||
        "Revisar modulo relacionado.",
      links: Array.isArray(data.links) ? data.links : [],
      metricas: data.metricas || {},
      modo: data.modo || "deterministico_v1",
    };
  };

  const cargarAgentesIA = async () => {
    if (!mostrarAgentesIA) {
      setAgentesIA({
        items: [],
        error: "",
        cargando: false,
        ultimaActualizacion: null,
      });
      return;
    }

    const definiciones = [
      {
        id: "gerente-diario",
        titulo: "Gerente Diario",
        endpoint: "/ai-agents/gerente-diario",
      },
      {
        id: "auditoria-dia",
        titulo: "Auditor Operativo",
        endpoint: "/ai-agents/auditoria-dia",
      },
      {
        id: "file-service-alertas",
        titulo: "File Service",
        endpoint: "/ai-agents/file-service-alertas",
      },
      {
        id: "finanzas-resumen",
        titulo: "Finanzas",
        endpoint: "/ai-agents/finanzas-resumen",
      },
      {
        id: "resumen-operativo",
        titulo: "Recepcion",
        endpoint: "/ai-agents/resumen-operativo",
      },
    ];

    setAgentesIA((actual) => ({ ...actual, cargando: true }));

    try {
      const respuestas = await Promise.allSettled(
        definiciones.map((definicion) => api.get(definicion.endpoint))
      );

      const items = respuestas
        .map((respuesta, index) =>
          respuesta.status === "fulfilled"
            ? normalizarAgenteIA(definiciones[index], respuesta.value)
            : null
        )
        .filter(Boolean);

      const fallas = respuestas.filter((respuesta) => respuesta.status === "rejected")
        .length;

      setAgentesIA({
        items,
        error:
          fallas > 0
            ? "Algunos agentes IA no respondieron. El panel sigue en modo seguro."
            : "",
        cargando: false,
        ultimaActualizacion: new Date().toLocaleString("es-CL", {
          dateStyle: "short",
          timeStyle: "short",
        }),
      });
    } catch (error) {
      setAgentesIA({
        items: [],
        error: "No se pudo cargar Agentes IA GMTCH.",
        cargando: false,
        ultimaActualizacion: null,
      });
    }
  };

  const cargarSchedulerStatus = async () => {
    if (!mostrarScheduler) return;

    try {
      const respuesta = await api.get("/automatizaciones/scheduler/status");
      setAutomatizaciones((actual) => ({
        ...actual,
        scheduler: {
          ...actual.scheduler,
          ...(respuesta.data || {}),
          error: "",
        },
      }));
    } catch (error) {
      setAutomatizaciones((actual) => ({
        ...actual,
        scheduler: {
          ...actual.scheduler,
          error: "No se pudo cargar el estado del scheduler interno.",
        },
      }));
    }
  };

  const ejecutarAutomatizacion = async (tipo) => {
    const acciones = {
      revision: {
        label: "Revision operativa",
        request: () => api.get("/automatizaciones/revision-operativa"),
      },
      apertura: {
        label: "Reporte apertura",
        request: () => api.post("/automatizaciones/reporte-apertura"),
      },
      cierre: {
        label: "Reporte cierre",
        request: () => api.post("/automatizaciones/reporte-cierre"),
      },
      fileService: {
        label: "Revision File Service",
        request: () => api.get("/automatizaciones/file-service"),
      },
      processGuard: {
        label: "Revisar Process Guard",
        request: () => api.post("/automatizaciones/process-guard/revisar"),
      },
      finanzas: {
        label: "Revision Finanzas",
        request: () => api.get("/automatizaciones/finanzas"),
      },
      material: {
        label: "Revision Material",
        request: () => api.get("/automatizaciones/material-recuperado"),
      },
      ultimoReporte: {
        label: "Ultimo reporte",
        request: () => api.get("/automatizaciones/reportes/ultimo"),
      },
    };

    const accion = acciones[tipo];
    if (!accion) return;

    setAutomatizaciones((actual) => ({
      ...actual,
      cargando: tipo,
      error: "",
    }));

    try {
      const respuesta = await accion.request();
      const data = respuesta.data || {};

      setAutomatizaciones((actual) => ({
        ...actual,
        resultado:
          tipo === "ultimoReporte"
            ? actual.resultado
            : {
                ...data,
                nombre: accion.label,
              },
        ultimoReporte:
          tipo === "ultimoReporte"
            ? data.reporte || null
            : data.reporte || actual.ultimoReporte,
        error: "",
        cargando: "",
        ultimaEjecucion: new Date().toLocaleString("es-CL", {
          dateStyle: "short",
          timeStyle: "short",
        }),
      }));

      if (actualizarNotificaciones) {
        await actualizarNotificaciones();
      }
      if (tipo === "processGuard") {
        await fetchStats();
      }
    } catch (error) {
      setAutomatizaciones((actual) => ({
        ...actual,
        error:
          error.response?.data?.error ||
          "No se pudo ejecutar la automatizacion seleccionada.",
        cargando: "",
      }));
    }
  };

  const ejecutarSchedulerAhora = async () => {
    if (!mostrarScheduler) return;

    setAutomatizaciones((actual) => ({
      ...actual,
      cargando: "scheduler",
      error: "",
      scheduler: {
        ...actual.scheduler,
        error: "",
      },
    }));

    try {
      const respuesta = await api.post("/automatizaciones/scheduler/run-once");
      const data = respuesta.data || {};
      const summary = data.summary || data.status?.lastRunSummary || null;

      setAutomatizaciones((actual) => ({
        ...actual,
        resultado: summary
          ? {
              ...summary,
              titulo: "Scheduler interno GMTCH",
              alertas: [],
              sugerencias: [
                "Revisar notificaciones accionables creadas por el scheduler.",
                "Toda accion operativa requiere validacion humana.",
              ],
            }
          : actual.resultado,
        scheduler: {
          ...actual.scheduler,
          ...(data.status || {}),
          lastRunSummary: summary || data.status?.lastRunSummary || null,
          error: "",
        },
        cargando: "",
        ultimaEjecucion: new Date().toLocaleString("es-CL", {
          dateStyle: "short",
          timeStyle: "short",
        }),
      }));

      await fetchStats();
      if (actualizarNotificaciones) {
        await actualizarNotificaciones();
      }
    } catch (error) {
      setAutomatizaciones((actual) => ({
        ...actual,
        error:
          error.response?.data?.error ||
          "No se pudo ejecutar el scheduler interno.",
        scheduler: {
          ...actual.scheduler,
          error:
            error.response?.data?.error ||
            "No se pudo ejecutar el scheduler interno.",
        },
        cargando: "",
      }));
    }
  };

  const fetchStats = async () => {
    try {
      setCargandoDashboard(true);

      const respuestas = await Promise.allSettled([
        api.get("/ordenes"),
        puedeVerBase ? api.get("/clientes") : Promise.resolve({ data: [] }),
        puedeVerBase ? api.get("/vehiculos") : Promise.resolve({ data: [] }),
        puedeVerFileService
          ? api.get("/archivos-ecu")
          : Promise.resolve({ data: [] }),
        api.get("/bitacora-operativa", {
          params: {
            resuelto: false,
            limit: 20,
          },
        }),
        mostrarComercial
          ? api.get("/finanzas/resumen")
          : Promise.resolve({ data: null }),
        mostrarCRM
          ? api.get("/leads/resumen")
          : Promise.resolve({ data: null }),
      ]);

      const [
        ordenesRes,
        clientesRes,
        vehiculosRes,
        archivosRes,
        bitacoraRes,
        finanzasRes,
        leadsRes,
      ] =
        respuestas;

      const ordenes =
        ordenesRes.status === "fulfilled" ? normalizarArray(ordenesRes.value) : [];
      const clientes =
        clientesRes.status === "fulfilled" ? normalizarArray(clientesRes.value) : [];
      const vehiculos =
        vehiculosRes.status === "fulfilled" ? normalizarArray(vehiculosRes.value) : [];
      const archivos =
        archivosRes.status === "fulfilled" ? normalizarArray(archivosRes.value) : [];
      const bitacoraItems =
        bitacoraRes.status === "fulfilled" ? normalizarArray(bitacoraRes.value) : [];
      const finanzasResumen =
        finanzasRes.status === "fulfilled" ? finanzasRes.value?.data || null : null;
      const leadsResumen =
        leadsRes.status === "fulfilled" ? leadsRes.value?.data || null : null;

      setBitacoraOperativa({
        items: bitacoraItems,
        puedeResolver:
          bitacoraRes.status === "fulfilled"
            ? Boolean(bitacoraRes.value?.data?.puedeResolver)
            : false,
        error:
          bitacoraRes.status === "fulfilled"
            ? ""
            : "No se pudo cargar la bitacora operativa",
      });

      const dashboardCalculado = calcularDashboard(
        ordenes,
        clientes,
        vehiculos,
        archivos,
        finanzasResumen,
        leadsResumen
      );

      setStats(dashboardCalculado);
      crearToastsDesdeAlertas(dashboardCalculado.alertasOperativas);
      if (actualizarNotificaciones) {
        await actualizarNotificaciones();
      }
      if (mostrarAgentesIA) {
        await cargarAgentesIA();
      }
      if (mostrarScheduler) {
        await cargarSchedulerStatus();
      }
    } catch (err) {
      console.error("Error cargando estadisticas:", err.response?.data || err.message);
    } finally {
      setCargandoDashboard(false);
    }
  };

  const actualizarCampoBitacora = (campo, valor) => {
    setBitacoraForm((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  };

  const crearObservacionBitacora = async (event) => {
    event.preventDefault();

    const titulo = bitacoraForm.titulo.trim();
    if (!titulo) {
      setBitacoraOperativa((actual) => ({
        ...actual,
        error: "Debes ingresar un titulo para la observacion.",
      }));
      return;
    }

    try {
      setGuardandoBitacora(true);
      await api.post("/bitacora-operativa", {
        tipo: bitacoraForm.tipo,
        prioridad: bitacoraForm.prioridad,
        titulo,
        descripcion: bitacoraForm.descripcion.trim(),
        modulo_relacionado: bitacoraForm.modulo_relacionado.trim(),
      });

      setBitacoraForm({
        tipo: "OPERACION",
        prioridad: "MEDIA",
        titulo: "",
        descripcion: "",
        modulo_relacionado: "",
      });
      setBitacoraOperativa((actual) => ({ ...actual, error: "" }));
      await fetchStats();
      if (actualizarNotificaciones) {
        await actualizarNotificaciones();
      }
    } catch (error) {
      setBitacoraOperativa((actual) => ({
        ...actual,
        error:
          error.response?.data?.error ||
          "No se pudo guardar la observacion operativa.",
      }));
    } finally {
      setGuardandoBitacora(false);
    }
  };

  const resolverObservacionBitacora = async (id) => {
    try {
      await api.patch(`/bitacora-operativa/${id}/resolver`);
      await fetchStats();
    } catch (error) {
      setBitacoraOperativa((actual) => ({
        ...actual,
        error:
          error.response?.data?.error ||
          "No se pudo resolver la observacion operativa.",
      }));
    }
  };

  useEffect(() => {
    fetchStats();

    const intervaloDashboard = window.setInterval(fetchStats, 60000);
    return () => window.clearInterval(intervaloDashboard);
  }, [usuario?.rol]);

  return (
    <div className="space-y-10">
      <ToastStack toasts={toasts} onCerrar={cerrarToast} />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-black uppercase tracking-tighter">
            Panel de Operaciones
          </h1>

          <p className="text-xs font-black uppercase text-gray-500 mt-2">
            Sesion activa: {usuario?.username} - Rol: {usuario?.rol}
          </p>

          <p className="text-xs font-bold uppercase text-gray-400 mt-1">
            Última actualización: {stats.ultimaActualizacion || "Pendiente"}
          </p>

          <p className="text-[11px] font-bold uppercase text-gray-400 mt-1">
            Auto actualización cada 60s
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStats}
          disabled={cargandoDashboard}
          className="bg-black text-white px-6 py-3 rounded-lg font-black uppercase text-xs hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {cargandoDashboard ? "Actualizando..." : "Actualizar dashboard"}
        </button>
      </div>

      <ReglaOperativaGMTCH />

      <PwaIOSInstallSection />

      {mostrarChecklistLunes && <PuestaMarchaLunesSection stats={stats} />}

      <SemaforoOperativo semaforo={stats.semaforoOperativo} />

      {mostrarCRM && <CRMComercialDashboardSection leads={stats.leads} />}

      {mostrarAgentesIA && (
        <AgentesIAGMTCHSection
          estado={agentesIA}
          onActualizar={cargarAgentesIA}
        />
      )}

      {mostrarAutomatizaciones && (
        <AutomatizacionesGMTCHSection
          estado={automatizaciones}
          puedeGenerarReportes={puedeGenerarReportesAutomatizacion}
          puedeVerFinanzas={puedeVerFinanzasAutomatizacion}
          puedeVerMaterial={puedeVerMaterialAutomatizacion}
          puedeVerScheduler={mostrarScheduler}
          onEjecutar={ejecutarAutomatizacion}
          onSchedulerRunOnce={ejecutarSchedulerAhora}
        />
      )}

      <AtencionInmediataSection items={stats.atencionInmediata} />

      <ColaTrabajoDiaSection items={stats.colaTrabajo} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {puedeVerFileService && (
          <FileServiceCentroMandoSection items={stats.fileServiceResumen} />
        )}
        {puedeVerFileService && (
          <ProcessGuardDashboardSection
            resumen={stats.processGuard}
            cargando={automatizaciones.cargando === "processGuard"}
            onRevisar={() => ejecutarAutomatizacion("processGuard")}
          />
        )}
        <PostventaCentroMandoSection items={stats.postventaPendientesDetalle} />
      </div>

      <IntervencionFisicaCentroMando
        asociada={stats.mecanicaAsociadaCurso}
        independiente={stats.mecanicaIndependiente}
      />

      <BitacoraRapidaSection
        form={bitacoraForm}
        items={bitacoraOperativa.items}
        puedeResolver={bitacoraOperativa.puedeResolver}
        error={bitacoraOperativa.error}
        guardando={guardandoBitacora}
        onChange={actualizarCampoBitacora}
        onSubmit={crearObservacionBitacora}
        onResolver={resolverObservacionBitacora}
      />

      <AccionesRapidasCentroMando usuario={usuario} />

      {mostrarComercial ? (
        <FinanzasDashboardV2 stats={stats} formatoCLP={formatoCLP} />
      ) : (
        <section className="border-4 border-black bg-white p-4 rounded-2xl text-xs font-black uppercase text-gray-500">
          Métricas comerciales ocultas para este rol.
        </section>
      )}

      <DashboardGraficos
        mostrarComercial={mostrarComercial}
        graficos={stats.graficos}
        formatoCLP={formatoCLP}
      />

      {mostrarOperacion && (
        <DashboardSection title="Operación">
          <StatCard label="Órdenes activas" val={stats.ordenesActivas} color="border-yellow-500" />
          <StatCard label="Listas para entrega" val={stats.listasEntrega} color="border-emerald-500" />
          <StatCard label="Pendientes de pago" val={stats.pendientesPago} color="border-red-500" />
          <StatCard label="Entregadas hoy" val={stats.entregadasHoy} color="border-blue-500" />
          <StatCard label="Correcciones pendientes" val={stats.correccionesTecnicasPendientes} color="border-red-500" />
          <StatCard label="Mecánica asociada" val={stats.mecanicaAsociadaCurso} color="border-orange-400" />
          <StatCard label="Mecánica independiente" val={stats.mecanicaIndependiente} color="border-orange-600" />
        </DashboardSection>
      )}

      {puedeVerFileService && (
        <DashboardSection title="File Service">
          <StatCard label="Activos" val={stats.fileServiceActivos} color="border-purple-500" />
          <StatCard label="Pendientes post escritura" val={stats.fileServicePostPendiente} color="border-yellow-500" />
          <StatCard label="Correcciones pendientes" val={stats.fileServiceCorrecciones} color="border-red-500" />
        </DashboardSection>
      )}

      <AlertasOperativasSection alertas={stats.alertasOperativas} />

      <ChecklistOperativoSection items={stats.checklistOperativo} />

      {puedeVerBase && (
        <DashboardSection title="Base de datos">
          <StatCard label="Clientes" val={stats.clientes} color="border-blue-500" />
          <StatCard label="Vehículos" val={stats.vehiculos} color="border-green-500" />
          <StatCard label="Órdenes" val={stats.ordenes} color="border-yellow-500" />
        </DashboardSection>
      )}

    </div>
  );
}

const nivelClassCentro = (nivel) => {
  if (nivel === "rojo") return getStatusColor("ALERTA", "soft");
  if (nivel === "ambar") return getStatusColor("PENDIENTE", "soft");
  if (nivel === "azul") return getStatusColor("EN_PROCESO", "soft");
  if (nivel === "morado") return getStatusColor("REQUIERE_NUEVA_LECTURA", "soft");
  return getStatusColor("OK", "soft");
};

const semaforoClass = (color) => {
  if (color === "rojo") return "border-red-700 bg-red-700 text-white";
  if (color === "ambar") return "border-yellow-500 bg-yellow-400 text-black";
  return "border-green-600 bg-green-600 text-white";
};

const SemaforoOperativo = ({ semaforo }) => (
  <section
    className={`border-4 rounded-3xl p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${semaforoClass(
      semaforo?.color
    )}`}
  >
    <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-80">
      Semaforo operativo
    </p>
    <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="text-3xl font-black uppercase tracking-tight">
          {semaforo?.estado || "Operacion normal"}
        </h2>
        <p className="mt-2 text-sm font-bold uppercase opacity-90">
          {semaforo?.detalle || "Sin bloqueos operativos relevantes"}
        </p>
      </div>
      <span className="inline-block border-2 border-current px-4 py-2 text-xs font-black uppercase">
        Centro de Mando V2
      </span>
    </div>
  </section>
);

const CRMComercialDashboardSection = ({ leads = {} }) => {
  const cards = [
    {
      label: "Leads nuevos",
      value: leads.nuevos,
      nivel: leads.nuevos > 0 ? "ambar" : "verde",
      to: "/leads?estado=NUEVO",
    },
    {
      label: "Potenciales reales",
      value: leads.potenciales_reales,
      nivel: leads.potenciales_reales > 0 ? "azul" : "verde",
      to: "/leads?estado=POTENCIAL_REAL",
    },
    {
      label: "Sin responder +30m",
      value: leads.sin_responder_30m,
      nivel: leads.sin_responder_30m > 0 ? "rojo" : "verde",
      to: "/leads",
    },
    {
      label: "Sin datos mínimos",
      value: leads.sin_datos_minimos,
      nivel: leads.sin_datos_minimos > 0 ? "ambar" : "verde",
      to: "/leads",
    },
    {
      label: "Presupuesto bajo",
      value: leads.presupuesto_bajo,
      nivel: leads.presupuesto_bajo > 0 ? "ambar" : "verde",
      to: "/leads",
    },
    {
      label: "Leads calientes",
      value: leads.leads_calientes,
      nivel: leads.leads_calientes > 0 ? "rojo" : "verde",
      to: "/leads?es_lead_caliente=true",
    },
    {
      label: "Leads por campaña",
      value: leads.leads_por_campania,
      nivel: leads.leads_por_campania > 0 ? "azul" : "verde",
      to: "/leads",
    },
    {
      label: "Cotizados sin seguimiento",
      value: leads.cotizados_pendientes,
      nivel: leads.cotizados_pendientes > 0 ? "ambar" : "verde",
      to: "/leads?estado=COTIZADO",
    },
    {
      label: "Ganados semana",
      value: leads.ganados_semana,
      nivel: "verde",
      to: "/leads?estado=GANADO",
    },
    {
      label: "Perdidos semana",
      value: leads.perdidos_semana,
      nivel: leads.perdidos_semana > 0 ? "ambar" : "verde",
      to: "/leads?estado=PERDIDO",
    },
  ];

  return (
    <section className="rounded-3xl border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
            CRM comercial
          </p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-black">
            Leads y oportunidades
          </h2>
          <p className="mt-2 max-w-3xl text-xs font-bold uppercase leading-relaxed text-gray-500">
            Registro manual y seguimiento de conversaciones comerciales. WhatsApp e
            Instagram siguen siendo canales de entrada; el lead debe quedar trazado aqui.
          </p>
        </div>
        <Link
          to="/leads"
          className="rounded-xl border-2 border-black bg-black px-5 py-3 text-xs font-black uppercase text-white transition hover:bg-blue-700"
        >
          Abrir CRM
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className={`rounded-2xl border-4 p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 ${nivelClassCentro(
              card.nivel
            )}`}
          >
            <p className="text-[10px] font-black uppercase opacity-70">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-black">{Number(card.value || 0)}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border-2 border-black bg-slate-950 p-4 text-white">
          <p className="text-[10px] font-black uppercase text-slate-400">
            Total leads
          </p>
          <p className="mt-1 text-2xl font-black">{Number(leads.total || 0)}</p>
        </div>
        <div className="rounded-2xl border-2 border-black bg-blue-50 p-4 text-blue-950">
          <p className="text-[10px] font-black uppercase text-blue-800">
            Tasa conversion semanal
          </p>
          <p className="mt-1 text-2xl font-black">
            {Number(leads.tasa_conversion || 0)}%
          </p>
        </div>
      </div>
      {leads.campania_top_potenciales && (
        <div className="mt-4 rounded-2xl border-2 border-black bg-emerald-50 p-4 text-emerald-950">
          <p className="text-[10px] font-black uppercase text-emerald-800">
            Campaña con más potenciales reales
          </p>
          <p className="mt-1 text-lg font-black uppercase">
            {leads.campania_top_potenciales.nombre}
          </p>
          <p className="mt-1 text-xs font-bold uppercase text-emerald-800">
            {Number(leads.campania_top_potenciales.potenciales_reales || 0)} potenciales reales
          </p>
        </div>
      )}
    </section>
  );
};

const PwaIOSInstallSection = () => (
  <section className="rounded-3xl border-4 border-blue-600 bg-slate-950 p-5 text-white shadow-[8px_8px_0px_0px_rgba(37,99,235,0.35)]">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-3xl">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-300">
          App instalable iPhone / iPad
        </p>
        <h2 className="mt-2 text-2xl font-black uppercase tracking-tight">
          Instalar GMTCH Tune OS
        </h2>
        <p className="mt-2 text-sm font-bold text-slate-200">
          Instala GMTCH Tune OS en tu iPhone para acceso rapido y mejor experiencia
          de alertas. Web Push V1 permite registrar el dispositivo cuando el backend
          este activo con VAPID.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 text-[11px] font-black uppercase text-slate-100 sm:grid-cols-2 lg:min-w-[420px]">
        <span className="rounded-2xl border border-blue-400/40 bg-white/10 px-3 py-2">
          1. Abrir en Safari
        </span>
        <span className="rounded-2xl border border-blue-400/40 bg-white/10 px-3 py-2">
          2. Tocar Compartir
        </span>
        <span className="rounded-2xl border border-blue-400/40 bg-white/10 px-3 py-2">
          3. Agregar a pantalla de inicio
        </span>
        <span className="rounded-2xl border border-blue-400/40 bg-white/10 px-3 py-2">
          4. Abrir desde el icono GMTCH
        </span>
      </div>
    </div>

    <p className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3 text-xs font-bold text-slate-300">
      Dentro de la app, activa sonido fuerte o normal desde Notificaciones para no
      perder tareas asignadas. En iOS, los permisos dependen de Safari y de la version
      instalada en el dispositivo.
    </p>
  </section>
);

const PuestaMarchaLunesSection = ({ stats }) => {
  const tieneClientes = numeroDashboard(stats.clientes) > 0;
  const tieneVehiculos = numeroDashboard(stats.vehiculos) > 0;
  const tieneOrdenes = numeroDashboard(stats.ordenes) > 0;
  const fileServiceProbado = numeroDashboard(stats.fileServiceActivos) > 0;
  const finanzasProbadas =
    numeroDashboard(stats.cajaMes) > 0 ||
    numeroDashboard(stats.finanzas?.egresos_total) > 0 ||
    numeroDashboard(stats.finanzas?.fondo_reserva_saldo) > 0;

  const items = [
    ["Crear primer cliente real", tieneClientes],
    ["Crear primer vehiculo real", tieneVehiculos],
    ["Crear primera orden real", tieneOrdenes],
    ["Validar usuarios y roles", null],
    ["Probar notificaciones", null],
    ["Probar PWA en iPhone", null],
    ["Probar File Service", fileServiceProbado],
    ["Probar Finanzas", finanzasProbadas],
    ["Confirmar que datos demo fueron eliminados", null],
  ];

  return (
    <section className="rounded-3xl border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
            Puesta en marcha lunes
          </p>
          <h2 className="mt-1 text-2xl font-black uppercase text-black">
            Operacion con base limpia
          </h2>
          <p className="mt-2 text-xs font-bold uppercase text-gray-500">
            Checklist visible para OWNER, ADMIN y SUPERVISOR antes de atender datos reales.
          </p>
        </div>
        <span className="rounded-full border-2 border-blue-700 bg-blue-50 px-3 py-2 text-[10px] font-black uppercase text-blue-900">
          Sin demo / sin basura operativa
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {items.map(([label, completado]) => {
          const manual = completado === null;
          const ok = completado === true;
          return (
            <div
              key={label}
              className={`rounded-2xl border-2 p-4 ${
                ok
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : manual
                  ? "border-blue-500 bg-blue-50 text-blue-900"
                  : "border-yellow-500 bg-yellow-50 text-yellow-900"
              }`}
            >
              <p className="text-xs font-black uppercase">{label}</p>
              <p className="mt-2 text-[10px] font-black uppercase">
                {ok ? "OK" : manual ? "Validacion manual" : "Pendiente"}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs font-black uppercase text-gray-500">
        Instala GMTCH Tune OS en iPhone desde Safari para acceso rapido y alertas.
      </p>
    </section>
  );
};

const textoAlertaAgente = (alerta) => {
  if (typeof alerta === "string") return alerta;
  return alerta?.texto || alerta?.mensaje || alerta?.titulo || "Alerta operativa";
};

const nivelAlertaAgente = (alerta) => {
  const nivel = String(alerta?.nivel || alerta?.severidad || "").toLowerCase();
  if (nivel.includes("critic")) return "critica";
  if (nivel.includes("atencion") || nivel.includes("atención")) return "atencion";
  return "seguimiento";
};

const claseAlertaAgente = (alerta) => {
  const nivel = nivelAlertaAgente(alerta);
  if (nivel === "critica") return "border-red-500 bg-red-950/40 text-red-100";
  if (nivel === "atencion")
    return "border-yellow-400 bg-yellow-950/30 text-yellow-100";
  return "border-blue-400 bg-blue-950/30 text-blue-100";
};

const AgentesIAGMTCHSection = ({ estado, onActualizar }) => {
  const items = estado?.items || [];

  return (
    <section className="rounded-3xl border-4 border-slate-900 bg-slate-950 p-5 text-white shadow-[8px_8px_0px_0px_rgba(37,99,235,0.35)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-300">
            Agentes IA GMTCH
          </p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight">
            Lectura operativa y sugerencias
          </h2>
          <p className="mt-2 text-xs font-bold uppercase leading-relaxed text-slate-300">
            V1 solo lectura: analiza datos del sistema, entrega alertas y recomienda
            acciones. No crea ordenes, no cambia estados, no marca pagos y no borra datos.
          </p>
          {estado?.ultimaActualizacion && (
            <p className="mt-2 text-[11px] font-bold uppercase text-slate-400">
              Ultima lectura IA: {estado.ultimaActualizacion}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onActualizar}
          disabled={estado?.cargando}
          className="rounded-xl border-2 border-blue-400 bg-blue-500 px-4 py-3 text-xs font-black uppercase text-white transition hover:bg-blue-400 disabled:opacity-50"
        >
          {estado?.cargando ? "Analizando..." : "Actualizar agentes"}
        </button>
      </div>

      {estado?.error && (
        <div className="mt-4 rounded-xl border-2 border-yellow-400 bg-yellow-950/30 p-3 text-xs font-black uppercase text-yellow-100">
          {estado.error}
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-5">
        {items.length === 0 ? (
          <div className="xl:col-span-5 rounded-2xl border-2 border-slate-700 bg-slate-900 p-4 text-xs font-black uppercase text-slate-400">
            Sin lectura de agentes IA disponible para este rol.
          </div>
        ) : (
          items.map((agente) => (
            <article
              key={agente.id || agente.titulo}
              className="flex min-h-[320px] flex-col rounded-2xl border-2 border-slate-700 bg-slate-900 p-4"
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-300">
                  {agente.modo || "deterministico_v1"}
                </p>
                <h3 className="mt-2 text-lg font-black uppercase text-white">
                  {agente.titulo}
                </h3>
                <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-200">
                  {agente.resumen}
                </p>
              </div>

              <div className="mt-4 space-y-2">
                {(agente.alertas || []).slice(0, 2).map((alerta, index) => (
                  <div
                    key={`${agente.id}-alerta-${index}`}
                    className={`rounded-xl border px-3 py-2 text-[11px] font-bold leading-relaxed ${claseAlertaAgente(
                      alerta
                    )}`}
                  >
                    {textoAlertaAgente(alerta)}
                  </div>
                ))}
                {(agente.alertas || []).length === 0 && (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-[11px] font-bold uppercase text-emerald-100">
                    Sin alertas criticas
                  </div>
                )}
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-black uppercase text-slate-400">
                  Sugerencias
                </p>
                <ul className="mt-2 space-y-1 text-[11px] font-semibold leading-relaxed text-slate-300">
                  {(agente.sugerencias || []).slice(0, 2).map((sugerencia) => (
                    <li key={sugerencia}>- {sugerencia}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 rounded-xl border border-blue-400/30 bg-black/30 p-3">
                <p className="text-[10px] font-black uppercase text-blue-300">
                  Accion recomendada
                </p>
                <p className="mt-1 text-[11px] font-bold leading-relaxed text-white">
                  {agente.accionRecomendada}
                </p>
              </div>

              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {(agente.links || []).slice(0, 3).map((item) => (
                  <Link
                    key={`${agente.id}-${item.label}-${item.url}`}
                    to={String(item.url || "/").startsWith("/") ? item.url : "/"}
                    className="rounded-lg border border-blue-400 px-3 py-2 text-[10px] font-black uppercase text-blue-100 transition hover:bg-blue-500 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
};

const normalizarResultadoAutomatizacion = (estado = {}) => {
  const resultado = estado.resultado?.reporte || estado.resultado || null;
  if (!resultado) return null;

  return {
    titulo:
      resultado.titulo ||
      estado.resultado?.nombre ||
      "Resultado de automatizacion",
    resumen: resultado.resumen || "Sin resumen disponible.",
    prioridad: resultado.prioridad || "MEDIA",
    alertas: Array.isArray(resultado.alertas) ? resultado.alertas : [],
    sugerencias: Array.isArray(resultado.sugerencias) ? resultado.sugerencias : [],
    accion:
      resultado.accion_recomendada ||
      resultado.accionRecomendada ||
      "Revisar modulo relacionado.",
    metricas: resultado.metricas || {},
  };
};

const clasePrioridadAutomatizacion = (prioridad) => {
  const valor = String(prioridad || "").toUpperCase();
  if (valor === "URGENTE") return getPriorityColor("URGENTE", "dark");
  if (valor === "ALTA") return getPriorityColor("ALTA", "dark");
  if (valor === "MEDIA") return getPriorityColor("MEDIA", "dark");
  return getPriorityColor("BAJA", "dark");
};

const AutomatizacionesGMTCHSection = ({
  estado,
  puedeGenerarReportes,
  puedeVerFinanzas,
  puedeVerMaterial,
  puedeVerScheduler,
  onEjecutar,
  onSchedulerRunOnce,
}) => {
  const resultado = normalizarResultadoAutomatizacion(estado);
  const scheduler = estado?.scheduler || {};
  const acciones = [
    ["revision", "Ejecutar revision", true],
    ["apertura", "Generar reporte apertura", puedeGenerarReportes],
    ["cierre", "Generar reporte cierre", puedeGenerarReportes],
    ["fileService", "File Service", true],
    ["processGuard", "Process Guard", true],
    ["finanzas", "Finanzas", puedeVerFinanzas],
    ["material", "Material recuperado", puedeVerMaterial],
    ["ultimoReporte", "Ver ultimo reporte", puedeGenerarReportes || puedeVerMaterial],
  ];

  return (
    <section className="rounded-3xl border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
            Automatizaciones GMTCH
          </p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-black">
            Revisiones manuales y reportes operativos
          </h2>
          <p className="mt-2 text-xs font-bold uppercase leading-relaxed text-gray-500">
            V1 manual, auditable y no destructiva. Genera reportes, sugerencias y
            notificaciones internas accionables; no cambia estados, no marca pagos y no
            cierra ordenes.
          </p>
          {estado?.ultimaEjecucion && (
            <p className="mt-2 text-[11px] font-black uppercase text-gray-400">
              Ultima ejecucion: {estado.ultimaEjecucion}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:max-w-xl xl:grid-cols-3">
          {acciones
            .filter(([, , visible]) => visible)
            .map(([tipo, label]) => (
              <button
                key={tipo}
                type="button"
                onClick={() => onEjecutar(tipo)}
                disabled={estado?.cargando === tipo}
                className="rounded-xl border-2 border-black bg-slate-950 px-3 py-2 text-[10px] font-black uppercase text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {estado?.cargando === tipo ? "Ejecutando..." : label}
              </button>
            ))}
        </div>
      </div>

      {puedeVerScheduler && (
        <div className="mt-5 rounded-2xl border-4 border-black bg-slate-950 p-4 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
                Scheduler interno V1
              </p>
              <h3 className="mt-1 text-xl font-black uppercase">
                Automatizacion periodica segura
              </h3>
              <p className="mt-2 text-xs font-bold leading-relaxed text-slate-300">
                Solo revisa datos y crea notificaciones accionables. No cambia estados,
                no marca pagos y no cierra procesos tecnicos.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase sm:grid-cols-4 lg:min-w-[520px]">
              <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                <p className="text-slate-400">Estado</p>
                <p className={scheduler.enabled ? "text-emerald-300" : "text-amber-300"}>
                  {scheduler.enabled ? "Activo" : "Desactivado"}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                <p className="text-slate-400">Intervalo</p>
                <p>{scheduler.intervalMinutes || 10} min</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                <p className="text-slate-400">Ultima</p>
                <p>{formatoFechaCorta(scheduler.lastRunAt)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                <p className="text-slate-400">Proxima</p>
                <p>{formatoFechaCorta(scheduler.nextRunEstimate)}</p>
              </div>
            </div>
          </div>

          {!scheduler.enabled && (
            <div className="mt-4 rounded-xl border border-amber-400/60 bg-amber-500/10 p-3 text-xs font-black uppercase text-amber-100">
              Scheduler interno desactivado. Activa ENABLE_INTERNAL_AUTOMATIONS=true
              en Railway cuando este probado.
            </div>
          )}

          {scheduler.error && (
            <div className="mt-4 rounded-xl border border-red-400/60 bg-red-500/10 p-3 text-xs font-black uppercase text-red-100">
              {scheduler.error}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-[11px] font-bold uppercase text-slate-400">
              Run-once ejecuta una revision completa con anti-spam y notificaciones
              accionables, sin modificar datos operativos.
            </p>
            <button
              type="button"
              onClick={onSchedulerRunOnce}
              disabled={estado?.cargando === "scheduler" || scheduler.running}
              className="rounded-xl border-2 border-blue-300 bg-blue-600 px-4 py-3 text-xs font-black uppercase text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {estado?.cargando === "scheduler" || scheduler.running
                ? "Revisando..."
                : "Ejecutar revision ahora"}
            </button>
          </div>

          {scheduler.lastRunSummary && (
            <div className="mt-4 rounded-xl border border-blue-400/40 bg-black/30 p-3">
              <p className="text-[10px] font-black uppercase text-blue-300">
                Ultimo resumen scheduler
              </p>
              <p className="mt-1 text-xs font-bold leading-relaxed text-white">
                {scheduler.lastRunSummary.resumen || "Sin resumen disponible."}
              </p>
            </div>
          )}
        </div>
      )}

      {estado?.error && (
        <div className="mt-4 rounded-xl border-2 border-red-500 bg-red-50 p-3 text-xs font-black uppercase text-red-800">
          {estado.error}
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border-4 border-slate-900 bg-slate-950 p-4 text-white">
          {!resultado ? (
            <div>
              <p className="text-sm font-black uppercase text-slate-300">
                Sin automatizacion ejecutada en esta sesion
              </p>
              <p className="mt-2 text-xs font-bold text-slate-400">
                Usa Ejecutar revision para levantar pendientes operativos del momento.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase">{resultado.titulo}</h3>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-200">
                    {resultado.resumen}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase ${clasePrioridadAutomatizacion(
                    resultado.prioridad
                  )}`}
                >
                  {resultado.prioridad}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {(resultado.alertas || []).slice(0, 6).map((alerta) => (
                  <div
                    key={alerta.id || alerta.titulo}
                    className={`rounded-xl border p-3 ${clasePrioridadAutomatizacion(
                      alerta.prioridad
                    )}`}
                  >
                    <p className="text-xs font-black uppercase">{alerta.titulo}</p>
                    <p className="mt-1 text-[11px] font-semibold leading-relaxed">
                      {alerta.detalle}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {alerta.accion_url && (
                        <Link
                          to={alerta.accion_url}
                          className="rounded-lg border border-current px-2 py-1 text-[10px] font-black uppercase"
                        >
                          Abrir
                        </Link>
                      )}
                    </div>
                  </div>
                ))}

                {(resultado.alertas || []).length === 0 && (
                  <div className="rounded-xl border border-emerald-400 bg-emerald-950/30 p-3 text-xs font-black uppercase text-emerald-100">
                    Sin alertas relevantes en esta revision.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-blue-400/40 bg-black/30 p-3">
                <p className="text-[10px] font-black uppercase text-blue-300">
                  Accion recomendada
                </p>
                <p className="mt-1 text-xs font-bold leading-relaxed text-white">
                  {resultado.accion}
                </p>
              </div>
            </div>
          )}
        </div>

        <aside className="rounded-2xl border-4 border-black bg-blue-50 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-800">
            Ultimo reporte guardado
          </p>
          {estado?.ultimoReporte ? (
            <div className="mt-3">
              <h3 className="text-lg font-black uppercase text-black">
                {estado.ultimoReporte.titulo}
              </h3>
              <p className="mt-2 text-xs font-bold leading-relaxed text-gray-700">
                {estado.ultimoReporte.resumen}
              </p>
              <p className="mt-3 text-[10px] font-black uppercase text-gray-500">
                Por {estado.ultimoReporte.generado_por || "sistema"} -{" "}
                {formatoFechaCorta(estado.ultimoReporte.createdAt)}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-xs font-bold uppercase text-gray-500">
              Presiona Ver ultimo reporte o genera apertura/cierre.
            </p>
          )}

          {resultado?.sugerencias?.length > 0 && (
            <div className="mt-4 border-t-2 border-blue-200 pt-4">
              <p className="text-[10px] font-black uppercase text-blue-800">
                Sugerencias
              </p>
              <ul className="mt-2 space-y-1 text-[11px] font-bold leading-relaxed text-gray-700">
                {resultado.sugerencias.slice(0, 4).map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};

const AtencionInmediataSection = ({ items = [] }) => (
  <section className="space-y-4">
    <div>
      <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
        Atencion inmediata
      </h2>
      <p className="mt-1 text-[11px] font-bold uppercase text-gray-400">
        Tarjetas accionables para abrir el dia y destrabar operacion
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      {items.map((item) => {
        const contenido = (
          <div
            className={`h-full border-4 rounded-2xl p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 ${nivelClassCentro(
              item.nivel
            )}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] font-black uppercase leading-tight">
                {item.label}
              </p>
              <span className="text-4xl font-black leading-none">
                {item.valor}
              </span>
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase opacity-75">
              {item.detalle}
            </p>
          </div>
        );

        return item.to ? (
          <Link key={item.label} to={item.to} className="block">
            {contenido}
          </Link>
        ) : (
          <div key={item.label}>{contenido}</div>
        );
      })}
    </div>
  </section>
);

const ColaTrabajoDiaSection = ({ items = [] }) => (
  <section className="space-y-4">
    <div>
      <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
        Cola de trabajo del dia
      </h2>
      <p className="mt-1 text-[11px] font-bold uppercase text-gray-400">
        Orden, cliente/vehiculo, estado, responsable y proxima accion
      </p>
    </div>

    <div className="overflow-hidden rounded-2xl border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      {items.length === 0 ? (
        <div className="p-5 text-sm font-black uppercase text-gray-400">
          Sin ordenes activas en cola
        </div>
      ) : (
        <div className="divide-y-4 divide-black">
          {items.map((orden) => (
            <Link
              key={orden.id}
              to="/ordenes"
              className="grid grid-cols-1 gap-3 p-4 text-sm transition hover:bg-blue-50 md:grid-cols-12 md:items-center"
            >
              <div className="md:col-span-1 font-black uppercase">#{orden.id}</div>
              <div className="md:col-span-3">
                <p className="font-black uppercase text-black">{orden.clienteVehiculo}</p>
                <p className="text-[10px] font-bold uppercase text-gray-500">
                  {orden.intervencion}
                </p>
              </div>
              <div className="md:col-span-2 text-xs font-black uppercase">
                {orden.estado}
              </div>
              <div className="md:col-span-1 text-xs font-black uppercase text-blue-700">
                {orden.prioridad}
              </div>
              <div className="md:col-span-2 text-xs font-bold uppercase text-gray-600">
                {orden.responsable}
              </div>
              <div className="md:col-span-3 text-xs font-black uppercase text-black">
                {orden.proximaAccion}
                {orden.correccion && (
                  <span className="ml-2 inline-block rounded-full bg-red-100 px-2 py-1 text-[9px] text-red-800">
                    {orden.correccion}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  </section>
);

const FileServiceCentroMandoSection = ({ items = [] }) => (
  <section className="space-y-4">
    <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
      File Service
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((item) => (
        <Link
          key={item.label}
          to="/archivos-ecu"
          className={`border-4 rounded-2xl p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] ${nivelClassCentro(
            item.nivel
          )}`}
        >
          <p className="text-[10px] font-black uppercase">{item.label}</p>
          <p className="mt-2 text-3xl font-black">{item.valor}</p>
        </Link>
      ))}
    </div>
  </section>
);

const ProcessGuardDashboardSection = ({ resumen = {}, cargando, onRevisar }) => {
  const total = numeroDashboard(resumen?.total);
  const criticos = numeroDashboard(resumen?.criticos);
  const responsables = Object.entries(resumen?.porResponsable || {}).slice(0, 5);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
            Procesos sin cierre
          </h2>
          <p className="mt-1 text-[11px] font-bold uppercase text-gray-400">
            Cierre tecnico obligatorio despues de MOD listo/descargado
          </p>
        </div>
        <button
          type="button"
          onClick={onRevisar}
          disabled={cargando}
          className="rounded-xl border-4 border-black bg-red-700 px-4 py-3 text-[10px] font-black uppercase text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:bg-red-600 disabled:opacity-50"
        >
          {cargando ? "Revisando..." : "Revisar Process Guard"}
        </button>
      </div>

      <div className="rounded-2xl border-4 border-black bg-white p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="grid grid-cols-2 gap-3">
          <div className={nivelClassCentro(total > 0 ? "ambar" : "verde") + " border-4 rounded-xl p-4"}>
            <p className="text-[10px] font-black uppercase">Total abiertos</p>
            <p className="mt-2 text-4xl font-black">{total}</p>
          </div>
          <div className={nivelClassCentro(criticos > 0 ? "rojo" : "verde") + " border-4 rounded-xl p-4"}>
            <p className="text-[10px] font-black uppercase">Criticos</p>
            <p className="mt-2 text-4xl font-black">{criticos}</p>
          </div>
        </div>

        <div className="mt-4 border-t-4 border-black pt-3">
          <p className="text-[10px] font-black uppercase text-gray-500">
            Por responsable
          </p>
          {responsables.length === 0 ? (
            <p className="mt-2 text-xs font-black uppercase text-gray-400">
              Sin procesos abiertos
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {responsables.map(([responsable, cantidad]) => (
                <Link
                  key={responsable}
                  to="/archivos-ecu#post-escritura"
                  className="flex items-center justify-between border-2 border-black px-3 py-2 text-xs font-black uppercase hover:bg-blue-50"
                >
                  <span>{responsable}</span>
                  <span>{cantidad}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const PostventaCentroMandoSection = ({ items = [] }) => (
  <section className="space-y-4">
    <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
      Postventa / Correcciones
    </h2>
    <div className="rounded-2xl border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      {items.length === 0 ? (
        <div className="p-5 text-xs font-black uppercase text-gray-400">
          Sin postventa tecnica pendiente
        </div>
      ) : (
        <div className="divide-y-4 divide-black">
          {items.map((item) => (
            <Link key={item.id} to="/ordenes" className="block p-4 hover:bg-red-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase">Orden #{item.id}</p>
                  <p className="text-xs font-bold uppercase text-gray-500">
                    {item.clienteVehiculo}
                  </p>
                </div>
                <span className="rounded-full bg-red-100 px-3 py-1 text-[10px] font-black uppercase text-red-800">
                  {item.prioridad}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-[10px] font-bold uppercase text-gray-600 sm:grid-cols-2">
                <p>DTC: {item.dtc}</p>
                <p>Cliente volvio: {item.clienteVolvio ? "Si" : "No"}</p>
                <p>Responsable: {item.responsable}</p>
                <p>Estado: {item.estado}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  </section>
);

const IntervencionFisicaCentroMando = ({ asociada = 0, independiente = 0 }) => (
  <section className="rounded-2xl border-4 border-black bg-orange-50 p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-800">
          Intervencion fisica
        </p>
        <h2 className="mt-2 text-2xl font-black uppercase text-black">
          Mecanica asociada vs mecanica independiente
        </h2>
        <p className="mt-2 text-xs font-bold uppercase text-orange-900">
          La intervencion fisica asociada al servicio tecnico no separa la orden
          del flujo ECU/File Service.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/ordenes" className="border-2 border-black bg-white p-4 text-center">
          <p className="text-[10px] font-black uppercase text-gray-500">Asociada</p>
          <p className="text-3xl font-black text-black">{asociada}</p>
        </Link>
        <Link to="/ordenes" className="border-2 border-black bg-white p-4 text-center">
          <p className="text-[10px] font-black uppercase text-gray-500">Independiente</p>
          <p className="text-3xl font-black text-black">{independiente}</p>
        </Link>
      </div>
    </div>
  </section>
);

const tiposBitacora = [
  ["MEJORA", "Mejora"],
  ["ERROR_PROCESO", "Error de proceso"],
  ["CLIENTE_VOLVIO", "Cliente volvio"],
  ["RECORDATORIO", "Recordatorio"],
  ["OPERACION", "Operacion"],
  ["OTRO", "Otro"],
];

const prioridadesBitacora = [
  ["BAJA", "Baja"],
  ["MEDIA", "Media"],
  ["ALTA", "Alta"],
  ["URGENTE", "Urgente"],
];

const prioridadBitacoraClass = (prioridad) => {
  return getPriorityColor(prioridad || "MEDIA", "solid");
};

const formatoFechaCorta = (valor) => {
  if (!valor) return "Pendiente";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Pendiente";
  return fecha.toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const BitacoraRapidaSection = ({
  form,
  items = [],
  puedeResolver,
  error,
  guardando,
  onChange,
  onSubmit,
  onResolver,
}) => (
  <section
    id="bitacora"
    className="rounded-2xl border-4 border-black bg-slate-950 p-5 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
  >
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="max-w-2xl">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-300">
          Bitacora rapida
        </p>
        <h2 className="mt-2 text-2xl font-black uppercase">
          Anotar observacion
        </h2>
        <p className="mt-2 text-xs font-bold uppercase text-slate-300">
          Si lo viste en operacion, dejalo registrado. Lo que no se anota, se pierde.
        </p>
        <p className="mt-2 text-[11px] font-bold uppercase text-yellow-200">
          Si es cliente volvio por DTC y ya tienes orden, usa postventa tecnica cuando corresponda.
        </p>
      </div>
      <div className="rounded-full border-2 border-blue-400 px-4 py-2 text-[10px] font-black uppercase text-blue-200">
        Observaciones abiertas: {items.length}
      </div>
    </div>

    <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-12">
      <label className="lg:col-span-2 text-[10px] font-black uppercase text-slate-300">
        Tipo
        <select
          value={form.tipo}
          onChange={(event) => onChange("tipo", event.target.value)}
          className="mt-1 w-full rounded-lg border-2 border-slate-600 bg-slate-900 px-3 py-2 text-xs font-bold text-white"
        >
          {tiposBitacora.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="lg:col-span-2 text-[10px] font-black uppercase text-slate-300">
        Prioridad
        <select
          value={form.prioridad}
          onChange={(event) => onChange("prioridad", event.target.value)}
          className="mt-1 w-full rounded-lg border-2 border-slate-600 bg-slate-900 px-3 py-2 text-xs font-bold text-white"
        >
          {prioridadesBitacora.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="lg:col-span-3 text-[10px] font-black uppercase text-slate-300">
        Modulo
        <input
          value={form.modulo_relacionado}
          onChange={(event) => onChange("modulo_relacionado", event.target.value)}
          placeholder="Ordenes, File Service, recepcion..."
          className="mt-1 w-full rounded-lg border-2 border-slate-600 bg-slate-900 px-3 py-2 text-xs font-bold text-white placeholder:text-slate-500"
        />
      </label>

      <label className="lg:col-span-5 text-[10px] font-black uppercase text-slate-300">
        Titulo
        <input
          value={form.titulo}
          onChange={(event) => onChange("titulo", event.target.value)}
          placeholder="Ej: revisar flujo de entrega"
          className="mt-1 w-full rounded-lg border-2 border-slate-600 bg-slate-900 px-3 py-2 text-xs font-bold text-white placeholder:text-slate-500"
        />
      </label>

      <label className="lg:col-span-9 text-[10px] font-black uppercase text-slate-300">
        Descripcion
        <textarea
          value={form.descripcion}
          onChange={(event) => onChange("descripcion", event.target.value)}
          rows={3}
          placeholder="Detalle breve de lo que paso, que mejorar o que recordar."
          className="mt-1 w-full rounded-lg border-2 border-slate-600 bg-slate-900 px-3 py-2 text-xs font-bold text-white placeholder:text-slate-500"
        />
      </label>

      <div className="lg:col-span-3 flex items-end">
        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-lg bg-blue-500 px-4 py-3 text-xs font-black uppercase text-white transition hover:bg-blue-400 disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Anotar observacion"}
        </button>
      </div>
    </form>

    {error && (
      <div className="mt-4 rounded-lg border-2 border-red-500 bg-red-950 px-4 py-3 text-xs font-black uppercase text-red-100">
        {error}
      </div>
    )}

    <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
      {items.length === 0 ? (
        <div className="rounded-xl border-2 border-slate-700 bg-slate-900 p-4 text-xs font-black uppercase text-slate-400">
          Sin observaciones abiertas.
        </div>
      ) : (
        items.slice(0, 6).map((item) => (
          <div
            key={item.id}
            className="rounded-xl border-2 border-slate-700 bg-slate-900 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase text-white">
                  {item.titulo}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">
                  {item.tipo} - {item.modulo_relacionado || "Sin modulo"} - Por{" "}
                  {item.creado_por || "sistema"}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${prioridadBitacoraClass(
                  item.prioridad
                )}`}
              >
                {item.prioridad}
              </span>
            </div>

            {item.descripcion && (
              <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-200">
                {item.descripcion}
              </p>
            )}

            <div className="mt-3 flex flex-col gap-2 text-[10px] font-bold uppercase text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>{formatoFechaCorta(item.createdAt)}</span>
              {puedeResolver && (
                <button
                  type="button"
                  onClick={() => onResolver(item.id)}
                  className="rounded-lg border-2 border-emerald-400 px-3 py-2 text-emerald-200 transition hover:bg-emerald-500 hover:text-white"
                >
                  Marcar resuelta
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  </section>
);

const AccionesRapidasCentroMando = ({ usuario }) => (
  <section className="space-y-4">
    <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
      Acciones rapidas
    </h2>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {tieneRol(usuario, PERMISOS_RUTAS["/flujo"]) && (
        <QuickAction to="/flujo" label="Nueva recepcion" />
      )}
      {tieneRol(usuario, PERMISOS_RUTAS["/ordenes"]) && (
        <QuickAction to="/ordenes" label="Ver ordenes" />
      )}
      {tieneRol(usuario, PERMISOS_RUTAS["/archivos-ecu"]) && (
        <QuickAction to="/archivos-ecu" label="Ver File Service" />
      )}
      {tieneRol(usuario, PERMISOS_RUTAS["/portal-admin"]) && (
        <QuickAction to="/portal-admin" label="Portal admin" />
      )}
      {tieneRol(usuario, PERMISOS_RUTAS["/usuarios"]) && (
        <QuickAction to="/usuarios" label="Usuarios / responsables" />
      )}
      {tieneRol(usuario, PERMISOS_RUTAS["/ordenes"]) && (
        <QuickAction to="/ordenes" label="Correcciones pendientes" />
      )}
    </div>
  </section>
);

const QuickAction = ({ to, label }) => (
  <Link
    to={to}
    className="rounded-2xl border-4 border-black bg-white px-4 py-3 text-center text-[10px] font-black uppercase text-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-blue-50"
  >
    {label}
  </Link>
);

const numeroDashboard = (valor) => {
  const parsed = Number(valor || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const porcentajeDashboard = (valor, total) => {
  const base = numeroDashboard(total);
  if (!base || base <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((numeroDashboard(valor) / base) * 100)));
};

const FinanzasMiniBar = ({ label, value, total, color, formatValue }) => (
  <div>
    <div className="mb-1 flex items-center justify-between gap-3 text-[10px] font-black uppercase text-slate-500">
      <span>{label}</span>
      <span>{formatValue ? formatValue(value) : value}</span>
    </div>
    <div className="h-3 overflow-hidden rounded-full border-2 border-black bg-slate-100">
      <div
        className={`h-full ${color}`}
        style={{ width: `${porcentajeDashboard(value, total)}%` }}
      />
    </div>
  </div>
);

const FinanzasDashboardV2 = ({ stats, formatoCLP }) => {
  const finanzas = stats.finanzas || {};
  const material = finanzas.material_mes || {};
  const totalSemana =
    numeroDashboard(stats.cajaSemana) +
    numeroDashboard(finanzas.egresos_total) +
    numeroDashboard(finanzas.sueldos_total);
  const totalPagadoPendiente =
    numeroDashboard(stats.cajaMes) + numeroDashboard(stats.pendientePagoMonto);
  const utilidad = numeroDashboard(finanzas.utilidad_distribuible);
  const semaforoClass =
    utilidad < 0
      ? "border-red-600 bg-red-50 text-red-900"
      : numeroDashboard(stats.pendientePagoMonto) > 0
      ? "border-yellow-500 bg-yellow-50 text-yellow-900"
      : "border-emerald-600 bg-emerald-50 text-emerald-900";
  const semaforoTexto =
    utilidad < 0
      ? "Atencion financiera"
      : numeroDashboard(stats.pendientePagoMonto) > 0
      ? "Cobranza pendiente"
      : "Finanzas en orden";

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
            Finanzas OWNER/ADMIN
          </h2>
          <p className="mt-1 text-[11px] font-bold uppercase text-gray-400">
            Pagado separado de pendiente, gastos, reserva y material del mes
          </p>
        </div>
        <span className="rounded-full border-2 border-yellow-500 bg-yellow-50 px-3 py-2 text-[10px] font-black uppercase text-yellow-900">
          Datos actuales pueden incluir pruebas hasta ejecutar reset operativo.
        </span>
      </div>

      <div className={`rounded-2xl border-4 p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${semaforoClass}`}>
        <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-70">
          Semaforo financiero
        </p>
        <h3 className="mt-2 text-2xl font-black uppercase">{semaforoTexto}</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ingresos pagados hoy" val={formatoCLP(stats.cajaHoy)} color="border-black bg-black text-white" />
        <StatCard label="Ingresos pagados semana" val={formatoCLP(stats.cajaSemana)} color="border-emerald-500" />
        <StatCard label="Ingresos pagados mes" val={formatoCLP(stats.cajaMes)} color="border-blue-500" />
        <StatCard label="Pendiente de pago" val={formatoCLP(stats.pendientePagoMonto)} color="border-yellow-500" />
        <StatCard label="Gastos semana" val={formatoCLP(finanzas.egresos_total)} color="border-red-500" />
        <StatCard label="Sueldos semana" val={formatoCLP(finanzas.sueldos_total)} color="border-blue-500" />
        <StatCard label="Utilidad estimada" val={formatoCLP(finanzas.utilidad_distribuible)} color="border-emerald-500" />
        <StatCard label="Fondo reserva" val={formatoCLP(finanzas.fondo_reserva_saldo)} color="border-slate-500" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border-4 border-black bg-white p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black uppercase text-slate-500">Ingresos vs gastos</p>
          <div className="mt-3 space-y-3">
            <FinanzasMiniBar label="Pagado semana" value={stats.cajaSemana} total={totalSemana} color="bg-emerald-500" formatValue={formatoCLP} />
            <FinanzasMiniBar label="Gastos" value={finanzas.egresos_total} total={totalSemana} color="bg-red-500" formatValue={formatoCLP} />
            <FinanzasMiniBar label="Sueldos" value={finanzas.sueldos_total} total={totalSemana} color="bg-blue-500" formatValue={formatoCLP} />
          </div>
        </div>
        <div className="rounded-2xl border-4 border-black bg-white p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black uppercase text-slate-500">Pagado vs pendiente</p>
          <div className="mt-3 space-y-3">
            <FinanzasMiniBar label="Pagado mes" value={stats.cajaMes} total={totalPagadoPendiente} color="bg-emerald-500" formatValue={formatoCLP} />
            <FinanzasMiniBar label="Pendiente" value={stats.pendientePagoMonto} total={totalPagadoPendiente} color="bg-yellow-500" formatValue={formatoCLP} />
          </div>
        </div>
        <div className="rounded-2xl border-4 border-black bg-white p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black uppercase text-slate-500">Material recuperado mes</p>
          <p className="mt-2 text-xl font-black uppercase">
            {Number(material.kg_reales || 0).toLocaleString("es-CL")} kg
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">
            Esperado {Number(material.kg_esperados || 0).toLocaleString("es-CL")} kg / Diferencia {Number(material.diferencia_kg || 0).toLocaleString("es-CL")} kg
          </p>
        </div>
        <div className="rounded-2xl border-4 border-black bg-white p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black uppercase text-slate-500">Valor material</p>
          <p className="mt-2 text-xl font-black uppercase">
            {formatoCLP(material.valor_real_vendido)}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">
            Estimado {formatoCLP(material.valor_estimado)}
          </p>
        </div>
      </div>
    </section>
  );
};

const ToastStack = ({ toasts = [], onCerrar }) => {
  if (!toasts.length) return null;

  const clasesPorTipo = {
    critico: getStatusColor("ALERTA", "soft"),
    atencion: getStatusColor("PENDIENTE", "soft"),
    exito: getStatusColor("OK", "soft"),
    informacion: getStatusColor("EN_PROCESO", "soft"),
  };

  const labelPorTipo = {
    critico: "Crítico",
    atencion: "Atención",
    exito: "Éxito",
    informacion: "Información",
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={
            "pointer-events-auto border-4 rounded-2xl p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] " +
            (clasesPorTipo[toast.tipo] || clasesPorTipo.informacion)
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide">
                {labelPorTipo[toast.tipo] || labelPorTipo.informacion}
              </p>
              <p className="mt-1 text-sm font-black uppercase leading-tight">
                {toast.titulo}
              </p>
              {toast.mensaje && (
                <p className="mt-2 text-xs font-bold leading-relaxed">
                  {toast.mensaje}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onCerrar(toast.id)}
              className="rounded-full border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase text-black"
            >
              Cerrar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const AlertasOperativasSection = ({ alertas = [] }) => {
  const resumen = alertas.reduce(
    (acc, alerta) => {
      acc[alerta.severidad] += 1;
      return acc;
    },
    {
      critica: 0,
      atencion: 0,
      seguimiento: 0,
    }
  );

  const visibles = alertas.slice(0, 5);

  const severidadClass = {
    critica: getStatusColor("ALERTA", "soft"),
    atencion: getStatusColor("PENDIENTE", "soft"),
    seguimiento: getStatusColor("EN_PROCESO", "soft"),
  };

  const severidadLabel = {
    critica: "Críticas",
    atencion: "Atención",
    seguimiento: "Seguimiento",
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
          Alertas operativas
        </h2>

        <p className="text-[11px] font-bold uppercase text-gray-400">
          updatedAt es una aproximación del tiempo por etapa
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MiniAlertCard label="Críticas" value={resumen.critica} color="border-red-500" />
        <MiniAlertCard label="Atención" value={resumen.atencion} color="border-yellow-500" />
        <MiniAlertCard label="Seguimiento" value={resumen.seguimiento} color="border-blue-500" />
      </div>

      <div className="bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        {visibles.length === 0 ? (
          <div className="p-5 text-sm font-black uppercase text-gray-400">
            Sin alertas operativas
          </div>
        ) : (
          <div className="divide-y-4 divide-black">
            {visibles.map((alerta) => (
              <div
                key={alerta.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 md:p-5 items-center"
              >
                <div className="md:col-span-3">
                  <span
                    className={
                      "inline-block border-2 rounded-full px-3 py-1 text-[10px] font-black uppercase " +
                      severidadClass[alerta.severidad]
                    }
                  >
                    {severidadLabel[alerta.severidad]}
                  </span>
                </div>

                <div className="md:col-span-4">
                  <p className="text-sm font-black uppercase text-black">
                    {alerta.tipo}
                  </p>
                  <p className="text-xs font-bold text-gray-500">
                    {alerta.referencia}
                  </p>
                </div>

                <div className="md:col-span-2 text-sm font-black">
                  {alerta.tiempo}
                </div>

                <div className="md:col-span-3 text-xs font-bold uppercase text-gray-500 break-words">
                  {alerta.estado}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const MiniAlertCard = ({ label, value, color }) => (
  <div className={"bg-white border-4 rounded-2xl p-4 " + color}>
    <p className="text-[10px] font-black uppercase text-gray-500">{label}</p>
    <p className="text-2xl font-black text-black">{value}</p>
  </div>
);

const ChecklistOperativoSection = ({ items = [] }) => (
  <section className="space-y-4">
    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
      <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
        Checklist operativo
      </h2>

      <p className="text-[11px] font-bold uppercase text-gray-400">
        Resumen rapido para apertura de taller
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((item) => {
        const tienePendientes = Number(item.contador || 0) > 0;

        return (
          <div
            key={item.label}
            className={`border-4 p-4 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
              tienePendientes
                ? "border-yellow-500 bg-yellow-50 text-yellow-900"
                : "border-green-500 bg-green-50 text-green-900"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide">
                  {item.label}
                </p>
                <p className="mt-1 text-[10px] font-black uppercase opacity-70">
                  {item.estado}
                </p>
              </div>

              <span className="text-3xl font-black leading-none">
                {item.contador}
              </span>
            </div>
          </div>
        );
      })}

      {items.length === 0 && (
        <div className="border-4 border-black bg-white p-4 rounded-2xl text-xs font-black uppercase text-gray-500">
          Checklist sin datos disponibles
        </div>
      )}
    </div>
  </section>
);

const ReglaOperativaGMTCH = () => {
  const frases = [
    "Si no esta registrado, no existe.",
    "Todo trabajo debe tener cliente, vehiculo y motivo claro.",
    "Cliente que vuelve por DTC debe quedar como postventa tecnica.",
    "Un archivo sin post escritura registrada es un trabajo inconcluso.",
    "La mecanica asociada al servicio se traza, no se separa como mantencion.",
    "Todo archivo recibido fuera del portal debe registrarse.",
  ];

  return (
    <section className="border-4 border-black bg-yellow-50 p-5 rounded-2xl">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-yellow-700">
        Regla operativa GMTCH
      </p>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {frases.map((frase) => (
          <div
            key={frase}
            className="border-2 border-black bg-white p-3 text-xs font-black uppercase leading-relaxed text-black"
          >
            {frase}
          </div>
        ))}
      </div>
    </section>
  );
};

const DashboardSection = ({ title, children }) => (
  <section className="space-y-4">
    <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
      {title}
    </h2>

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {children}
    </div>
  </section>
);

const DashboardGraficos = ({ mostrarComercial, graficos = {}, formatoCLP }) => (
  <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
    {mostrarComercial && (
      <>
        <BarChartCard
          title="Ingresos pagados vs pendientes"
          items={graficos.ventas || []}
          formatValue={formatoCLP}
        />
        <BarChartCard
          title="Ingresos vs egresos semana"
          items={graficos.ingresosGastos || []}
          formatValue={formatoCLP}
        />
        <BarChartCard
          title="Material recuperado mes"
          items={graficos.materialMes || []}
          formatValue={(valor) =>
            `${Number(valor || 0).toLocaleString("es-CL", {
              maximumFractionDigits: 3,
            })} kg`
          }
        />
      </>
    )}
    <BarChartCard
      title="Ordenes por estado"
      items={graficos.ordenesEstado || []}
      formatValue={(valor) => Number(valor || 0).toLocaleString("es-CL")}
    />
  </section>
);

const BarChartCard = ({ title, items = [], formatValue }) => {
  const max = Math.max(...items.map((item) => Number(item.value || 0)), 1);

  return (
    <section className="rounded-2xl border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <h3 className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">
        {title}
      </h3>
      <div className="mt-4 space-y-3">
        {items.filter((item) => item.value !== undefined).map((item) => {
          const width = Math.max(6, (Number(item.value || 0) / max) * 100);
          return (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-[10px] font-black uppercase">
                <span className="truncate">{item.label}</span>
                <span>{formatValue ? formatValue(item.value) : item.value}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full border-2 border-black bg-slate-100">
                <div
                  className={`h-full ${item.color || "bg-blue-600"}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
        {!items.length && (
          <p className="text-xs font-black uppercase text-gray-400">
            Sin datos suficientes para graficar.
          </p>
        )}
      </div>
    </section>
  );
};

const StatCard = ({ label, val, color }) => (
  <div
    className={
      "bg-white p-5 rounded-2xl border-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] min-h-[120px] " +
      color
    }
  >
    <p className="text-[10px] font-black uppercase opacity-50">{label}</p>
    <p className="text-2xl md:text-3xl font-black mt-2 break-words">{val}</p>
  </div>
);

const QuickLink = ({ to, title, text, icon }) => (
  <Link
    to={to}
    className="bg-white border-4 border-black p-6 rounded-2xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition"
  >
    <p className="text-4xl mb-4">{icon}</p>
    <h2 className="text-xl font-black uppercase">{title}</h2>
    <p className="text-xs font-bold uppercase opacity-60 mt-2">{text}</p>
  </Link>
);

export default App;
