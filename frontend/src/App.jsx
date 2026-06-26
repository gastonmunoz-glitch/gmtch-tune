import { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import api from "./services/api";

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
import LandingPage from "./pages/LandingPage";
import PortalLoginPage from "./pages/PortalLoginPage";
import PortalDashboardPage from "./pages/PortalDashboardPage";
import PortalNuevoArchivoPage from "./pages/PortalNuevoArchivoPage";
import PortalMisArchivosPage from "./pages/PortalMisArchivosPage";
import PortalCreditosPage from "./pages/PortalCreditosPage";
import PortalAdminPage from "./pages/PortalAdminPage";

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

const limpiarSesion = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("rol");
  localStorage.removeItem("username");
  localStorage.removeItem("nombre");
  localStorage.removeItem("userId");
};

const SOUND_ALERTS_KEY = "gmtch_sound_alerts_enabled";

const obtenerIdNotificacion = (notificacion) =>
  String(
    notificacion?.id ||
      `${notificacion?.createdAt || ""}-${notificacion?.titulo || ""}-${notificacion?.mensaje || ""}`
  );

const esNotificacionNoLeida = (notificacion) => notificacion && !notificacion.leida;

const reproducirSonidoNotificacion = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const contexto = new AudioContext();
    const oscilador = contexto.createOscillator();
    const ganancia = contexto.createGain();

    oscilador.type = "sine";
    oscilador.frequency.setValueAtTime(880, contexto.currentTime);
    oscilador.frequency.setValueAtTime(660, contexto.currentTime + 0.12);
    ganancia.gain.setValueAtTime(0.0001, contexto.currentTime);
    ganancia.gain.exponentialRampToValueAtTime(0.16, contexto.currentTime + 0.02);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, contexto.currentTime + 0.32);

    oscilador.connect(ganancia);
    ganancia.connect(contexto.destination);
    oscilador.start();
    oscilador.stop(contexto.currentTime + 0.34);
  } catch {
    // El navegador puede bloquear audio sin gesto del usuario. No debe romper la app.
  }
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
            reproducirSonidoNotificacion();
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

  const alternarSonidoNotificaciones = () => {
    const siguiente = !sonidoNotificacionesActivo;
    setSonidoNotificacionesActivo(siguiente);
    localStorage.setItem(SOUND_ALERTS_KEY, String(siguiente));

    if (siguiente) {
      reproducirSonidoNotificacion();
    }
  };

  useEffect(() => {
    if (!auth) return undefined;

    cargarNotificaciones();

    const intervaloNotificaciones = window.setInterval(cargarNotificaciones, 30000);
    return () => window.clearInterval(intervaloNotificaciones);
  }, [auth, usuario?.rol, usuario?.username, sonidoNotificacionesActivo]);

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
                onActualizar={cargarNotificaciones}
                onMarcarLeida={marcarNotificacionLeida}
                onMarcarTodas={marcarTodasNotificacionesLeidas}
                onAlternarSonido={alternarSonidoNotificaciones}
                onProbarSonido={reproducirSonidoNotificacion}
              />

              <AlertaNotificacionFlotante
                notificacion={alertaNotificacion}
                onCerrar={() => setAlertaNotificacion(null)}
                onVer={() => {
                  setNotificacionesOpen(true);
                  setAlertaNotificacion(null);
                }}
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

const NotificacionesInternas = ({
  abiertas,
  setAbiertas,
  notificaciones,
  noLeidas,
  error,
  sonidoActivo,
  onActualizar,
  onMarcarLeida,
  onMarcarTodas,
  onAlternarSonido,
  onProbarSonido,
}) => {
  const ultimas = notificaciones.slice(0, 5);

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
            onClick={onProbarSonido}
            className="border-2 border-black bg-white px-3 py-2 rounded-lg text-[10px] font-black uppercase text-black hover:bg-gray-100 transition"
          >
            Probar sonido
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

        <p className="mt-2 text-right text-[10px] font-black uppercase text-gray-500">
          Activa las alertas sonoras para no perder tareas asignadas.
        </p>

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

            {ultimas.length === 0 ? (
              <div className="p-5 text-sm font-black uppercase text-gray-400">
                Sin notificaciones internas
              </div>
            ) : (
              <div className="max-h-[420px] overflow-auto divide-y-2 divide-black">
                {ultimas.map((notificacion) => (
                  <div
                    key={notificacion.id}
                    className={`p-4 ${notificacion.leida ? "bg-white" : "bg-blue-50"}`}
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
                        className={`shrink-0 border-2 border-black rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                          notificacion.leida
                            ? "bg-gray-100 text-gray-600"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {notificacion.leida ? "Leida" : "No leida"}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-gray-600 mt-2">
                      {notificacion.mensaje || "Sin mensaje"}
                    </p>

                    <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <p className="text-[10px] font-black uppercase text-gray-400">
                        {formatearFechaNotificacion(notificacion.createdAt)}
                      </p>

                      {!notificacion.leida && (
                        <button
                          type="button"
                          onClick={() => onMarcarLeida(notificacion.id)}
                          className="bg-black text-white px-3 py-2 rounded text-[10px] font-black uppercase hover:bg-blue-700 transition"
                        >
                          Marcar como leida
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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
    <div className="fixed bottom-5 right-5 z-[60] w-[calc(100%-2.5rem)] max-w-md border-4 border-red-700 bg-white rounded-2xl shadow-[10px_10px_0px_0px_rgba(127,29,29,0.85)] overflow-hidden">
      <div className="bg-red-700 px-4 py-3 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100">
              Centro de atención
            </p>
            <h2 className="text-lg font-black uppercase leading-tight">
              Nueva alerta operativa
            </h2>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full border-2 border-white px-2 py-1 text-[10px] font-black uppercase text-white hover:bg-white hover:text-red-700 transition"
          >
            Cerrar
          </button>
        </div>
      </div>

      <div className="p-4">
        <p className="text-[10px] font-black uppercase text-blue-700">
          {notificacion.tipo || "GENERAL"}
        </p>
        <h3 className="mt-1 text-sm font-black uppercase text-black">
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
            className="flex-1 bg-black px-4 py-3 text-xs font-black uppercase text-white rounded-lg hover:bg-blue-700 transition"
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

  const [stats, setStats] = useState({
    cajaHoy: 0,
    cajaSemana: 0,
    cajaMes: 0,
    trabajosIngresadosHoy: 0,
    totalPagadoMes: 0,
    ticketPromedioMes: 0,
    ordenesActivas: 0,
    listasEntrega: 0,
    pendientesPago: 0,
    entregadasHoy: 0,
    fileServiceActivos: 0,
    fileServicePostPendiente: 0,
    fileServiceCorrecciones: 0,
    alertasOperativas: [],
    checklistOperativo: [],
    clientes: puedeVerBase ? 0 : "Sin acceso",
    vehiculos: puedeVerBase ? 0 : "Sin acceso",
    ordenes: 0,
    ultimaActualizacion: null,
  });
  const [cargandoDashboard, setCargandoDashboard] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastKeysRef = useRef(new Set());

  const normalizarArray = (respuesta) => {
    const data = respuesta?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.ordenes)) return data.ordenes;
    if (Array.isArray(data?.clientes)) return data.clientes;
    if (Array.isArray(data?.vehiculos)) return data.vehiculos;
    if (Array.isArray(data?.archivos)) return data.archivos;
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

  const calcularDashboard = (ordenes, clientes, vehiculos, archivos) => {
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

        if (dentroDelDiaLocal(fechaCreacion, hoy)) {
          acc.trabajosIngresadosHoy += numero(orden.monto_total);
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
        totalPagadoMes: 0,
      }
    );

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

    const correccionesPendientes = archivos.filter(
      (archivo) =>
        archivo.correccion_pendiente === true ||
        String(archivo.estado || "").toUpperCase() === "REQUIERE_CORRECCION"
    ).length;

    const listasEntrega = ordenesReales.filter(
      (orden) =>
        String(orden.estado || "").toUpperCase() === "LISTO_PARA_ENTREGA"
    ).length;

    const pagosPendientes = ordenesReales.filter(
      (orden) => String(orden.estado_pago || "").toUpperCase() !== "PAGADO"
    ).length;

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
      alertasOperativas: alertasOrdenadas,
      checklistOperativo: [
        crearItemChecklist("Órdenes sin diagnóstico", ordenesSinDiagnostico),
        crearItemChecklist("File Service sin post escritura OK", fileServiceSinPostOk),
        crearItemChecklist("File Service con corrección pendiente", correccionesPendientes),
        crearItemChecklist("Órdenes listas para entrega", listasEntrega),
        crearItemChecklist("Pagos pendientes", pagosPendientes),
        crearItemChecklist("Entregadas hoy", entregadasHoy),
      ],
      clientes: puedeVerBase ? clientesReales.length : "Sin acceso",
      vehiculos: puedeVerBase ? vehiculosReales.length : "Sin acceso",
      ordenes: ordenesReales.length,
      ultimaActualizacion: new Date().toLocaleString("es-CL", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    };
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
      ]);

      const [ordenesRes, clientesRes, vehiculosRes, archivosRes] = respuestas;

      const ordenes =
        ordenesRes.status === "fulfilled" ? normalizarArray(ordenesRes.value) : [];
      const clientes =
        clientesRes.status === "fulfilled" ? normalizarArray(clientesRes.value) : [];
      const vehiculos =
        vehiculosRes.status === "fulfilled" ? normalizarArray(vehiculosRes.value) : [];
      const archivos =
        archivosRes.status === "fulfilled" ? normalizarArray(archivosRes.value) : [];

      const dashboardCalculado = calcularDashboard(
        ordenes,
        clientes,
        vehiculos,
        archivos
      );

      setStats(dashboardCalculado);
      crearToastsDesdeAlertas(dashboardCalculado.alertasOperativas);
      if (actualizarNotificaciones) {
        await actualizarNotificaciones();
      }
    } catch (err) {
      console.error("Error cargando estadisticas:", err.response?.data || err.message);
    } finally {
      setCargandoDashboard(false);
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

      {mostrarComercial ? (
        <DashboardSection title="Comercial">
          <StatCard label="Caja hoy" val={formatoCLP(stats.cajaHoy)} color="border-black bg-black text-white" />
          <StatCard label="Caja semana" val={formatoCLP(stats.cajaSemana)} color="border-blue-500" />
          <StatCard label="Caja mes" val={formatoCLP(stats.cajaMes)} color="border-blue-500" />
          <StatCard label="Trabajos ingresados hoy" val={formatoCLP(stats.trabajosIngresadosHoy)} color="border-yellow-500" />
          <StatCard label="Total pagado mes" val={formatoCLP(stats.totalPagadoMes)} color="border-green-500" />
          <StatCard label="Ticket promedio mes" val={formatoCLP(stats.ticketPromedioMes)} color="border-green-500" />
        </DashboardSection>
      ) : (
        <section className="border-4 border-black bg-white p-4 rounded-2xl text-xs font-black uppercase text-gray-500">
          Métricas comerciales ocultas para este rol.
        </section>
      )}

      {mostrarOperacion && (
        <DashboardSection title="Operación">
          <StatCard label="Órdenes activas" val={stats.ordenesActivas} color="border-yellow-500" />
          <StatCard label="Listas para entrega" val={stats.listasEntrega} color="border-emerald-500" />
          <StatCard label="Pendientes de pago" val={stats.pendientesPago} color="border-red-500" />
          <StatCard label="Entregadas hoy" val={stats.entregadasHoy} color="border-blue-500" />
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tieneRol(usuario, PERMISOS_RUTAS["/flujo"]) && (
          <QuickLink
            to="/flujo"
            title="Nueva Recepcion"
            text="Ingreso de cliente, vehiculo, sintomas y fotos."
            icon="Recepcion"
          />
        )}

        {tieneRol(usuario, PERMISOS_RUTAS["/ordenes"]) && (
          <QuickLink
            to="/ordenes"
            title="Cola de Trabajo"
            text="Ver ordenes activas y estados del proceso."
            icon="Ordenes"
          />
        )}

        {tieneRol(usuario, PERMISOS_RUTAS["/archivos-ecu"]) && (
          <QuickLink
            to="/archivos-ecu"
            title="File Service"
            text="Archivos ECU originales y modificados por tuner."
            icon="ECU"
          />
        )}

        {tieneRol(usuario, PERMISOS_RUTAS["/usuarios"]) && (
          <QuickLink
            to="/usuarios"
            title="Usuarios / Roles"
            text="Crear usuarios y administrar permisos."
            icon="Roles"
          />
        )}
      </div>
    </div>
  );
}

const ToastStack = ({ toasts = [], onCerrar }) => {
  if (!toasts.length) return null;

  const clasesPorTipo = {
    critico: "border-red-600 bg-red-50 text-red-900",
    atencion: "border-yellow-500 bg-yellow-50 text-yellow-900",
    exito: "border-green-500 bg-green-50 text-green-900",
    informacion: "border-blue-500 bg-blue-50 text-blue-900",
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
    critica: "bg-red-100 border-red-600 text-red-900",
    atencion: "bg-yellow-100 border-yellow-500 text-yellow-900",
    seguimiento: "bg-blue-50 border-blue-500 text-blue-800",
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
    "La plataforma es la fuente oficial. Lo que no se registra, no se puede controlar.",
    "WhatsApp puede recibir información, pero Gmtch Tune OS ordena el trabajo.",
    "Sin orden no hay trabajo. Sin evidencia no hay respaldo. Sin cierre no hay entrega.",
    "La pelota siempre debe tener responsable.",
    "Cierre técnico no es cierre comercial.",
  ];

  return (
    <section className="border-4 border-black bg-yellow-50 p-5 rounded-2xl">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-yellow-700">
        Regla operativa GMTCH
      </p>
      <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
        {frases.slice(0, 3).map((frase) => (
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
