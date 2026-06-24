import { useState, useEffect } from "react";
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
};

const MENU = [
  {
    to: "/",
    label: "📊 Dashboard",
    roles: PERMISOS_RUTAS["/"],
  },
  {
    to: "/flujo",
    label: "🚦 Nueva Recepción",
    destacado: true,
    roles: PERMISOS_RUTAS["/flujo"],
  },
  {
    to: "/ordenes",
    label: "🧾 Fila de Trabajo",
    roles: PERMISOS_RUTAS["/ordenes"],
  },
  {
    to: "/diagnosticos",
    label: "🧠 Diagnóstico / Scanner",
    roles: PERMISOS_RUTAS["/diagnosticos"],
  },
  {
    to: "/archivos-ecu",
    label: "📂 File Service / Tuner",
    roles: PERMISOS_RUTAS["/archivos-ecu"],
  },
  {
    to: "/clientes",
    label: "👥 Clientes",
    roles: PERMISOS_RUTAS["/clientes"],
  },
  {
    to: "/vehiculos",
    label: "🚗 Garage",
    roles: PERMISOS_RUTAS["/vehiculos"],
  },
  {
    to: "/fotos",
    label: "📸 Fotos",
    roles: PERMISOS_RUTAS["/fotos"],
  },
  {
    to: "/usuarios",
    label: "👑 Usuarios / Roles",
    roles: PERMISOS_RUTAS["/usuarios"],
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

const limpiarSesion = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("rol");
  localStorage.removeItem("username");
  localStorage.removeItem("nombre");
  localStorage.removeItem("userId");
};

function App() {
  const [usuario, setUsuario] = useState(() => leerUsuarioLocal());
  const [auth, setAuth] = useState(localStorage.getItem("token") ? true : false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        console.error("Sesión inválida o expirada:", err.response?.data || err.message);

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
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <Router>
      {!auth ? (
        <LoginPage setAuth={setAuth} setUsuario={setUsuario} />
      ) : (
        <div className="min-h-screen bg-slate-200">
          <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black text-white h-16 px-4 flex items-center justify-between shadow-xl">
            <div>
              <h1 className="text-lg font-black italic tracking-tighter text-blue-500">
                GMTCH TUNE
              </h1>

              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                {usuario?.rol || "ROLE ACCESS"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-black text-xl"
            >
              ☰
            </button>
          </div>

          {sidebarOpen && (
            <button
              type="button"
              aria-label="Cerrar menú"
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
                  <h1 className="text-2xl font-black italic tracking-tighter text-blue-500">
                    GMTCH TUNE
                  </h1>

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
                  className="md:hidden text-white text-2xl font-black"
                >
                  ×
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
                  Cerrar Sesión
                </button>
              </div>
            </nav>

            <main className="flex-1 p-4 pt-24 md:p-10 md:pt-10 overflow-auto w-full">
              <Routes>
                <Route
                  path="/"
                  element={
                    <Protegido usuario={usuario} roles={PERMISOS_RUTAS["/"]}>
                      <Dashboard usuario={usuario} />
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

const AccesoDenegado = ({ usuario }) => (
  <div className="bg-white border-4 border-black p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
    <h1 className="text-4xl font-black uppercase">Acceso restringido</h1>

    <p className="text-xs font-bold uppercase text-gray-500 mt-3">
      Tu perfil actual no tiene permisos para esta sección.
    </p>

    <div className="mt-6 bg-black text-white p-5 inline-block">
      <p className="text-xs font-black uppercase">
        Usuario: {usuario?.username}
      </p>

      <p className="text-xs font-black uppercase">Rol: {usuario?.rol}</p>
    </div>
  </div>
);

function Dashboard({ usuario }) {
  const puedeVerBase = ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"].includes(
    usuario?.rol
  );
  const puedeVerFileService = tieneRol(usuario, PERMISOS_RUTAS["/archivos-ecu"]);

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
    clientes: puedeVerBase ? 0 : "Sin acceso",
    vehiculos: puedeVerBase ? 0 : "Sin acceso",
    ordenes: 0,
    ultimaActualizacion: null,
  });
  const [cargandoDashboard, setCargandoDashboard] = useState(false);

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

  const mismoDia = (fecha, base) =>
    fecha &&
    fecha.getFullYear() === base.getFullYear() &&
    fecha.getMonth() === base.getMonth() &&
    fecha.getDate() === base.getDate();

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

  const calcularDashboard = (ordenes, clientes, vehiculos, archivos) => {
    const hoy = new Date();
    const desdeSemana = inicioSemana(hoy);
    const pagadasMes = [];
    const alertasOperativas = [];

    const comercial = ordenes.reduce(
      (acc, orden) => {
        const fechaPago = parseFecha(orden.fecha_pago);
        const fechaCreacion = parseFecha(orden.createdAt);
        const pagado = montoPagadoOrden(orden);

        if (mismoDia(fechaCreacion, hoy)) {
          acc.trabajosIngresadosHoy += numero(orden.monto_total);
        }

        if (!fechaPago || pagado <= 0) return acc;

        if (mismoDia(fechaPago, hoy)) acc.cajaHoy += pagado;
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

    const entregadasHoy = ordenes.filter((orden) => {
      const estado = String(orden.estado || "").toUpperCase();
      const fechaEntrega =
        parseFecha(orden.entregado_at) ||
        (estado === "ENTREGADO" ? parseFecha(orden.updatedAt) : null);
      return estado === "ENTREGADO" && mismoDia(fechaEntrega, hoy);
    }).length;

    const fileServiceActivos = archivos.filter((archivo) => {
      const estado = String(archivo.estado || "").toUpperCase();
      return (
        !archivo.archivado &&
        !["FINALIZADO_TECNICO", "FINALIZADO", "ARCHIVADO"].includes(estado)
      );
    }).length;

    ordenes.forEach((orden) => {
      const estado = String(orden.estado || "").toUpperCase();
      const estadoPago = String(orden.estado_pago || "").toUpperCase();
      const referenciaFecha = parseFecha(orden.updatedAt);
      const horas = horasDesde(referenciaFecha, hoy);

      if (estado === "RECEPCIONADO" && horas > 2) {
        alertasOperativas.push({
          id: `orden-${orden.id}-recepcionado`,
          severidad: "atencion",
          tipo: "Recepcion detenida",
          referencia: `Orden #${orden.id}`,
          tiempo: formatoTiempo(horas),
          estado: orden.estado || "RECEPCIONADO",
          horas,
        });
      }

      if (estado === "PARA_DIAGNOSTICO" && horas > 4) {
        alertasOperativas.push({
          id: `orden-${orden.id}-diagnostico`,
          severidad: "atencion",
          tipo: "Diagnostico pendiente",
          referencia: `Orden #${orden.id}`,
          tiempo: formatoTiempo(horas),
          estado: orden.estado || "PARA_DIAGNOSTICO",
          horas,
        });
      }

      if (estado === "EN_PROGRAMACION" && horas > 24) {
        alertasOperativas.push({
          id: `orden-${orden.id}-programacion`,
          severidad: "critica",
          tipo: "Programacion detenida",
          referencia: `Orden #${orden.id}`,
          tiempo: formatoTiempo(horas),
          estado: orden.estado || "EN_PROGRAMACION",
          horas,
        });
      }

      if (estado === "LISTO_PARA_ENTREGA" && estadoPago !== "PAGADO") {
        alertasOperativas.push({
          id: `orden-${orden.id}-pago-pendiente`,
          severidad: "critica",
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
        alertasOperativas.push({
          id: `file-${archivo.id}-post`,
          severidad: "atencion",
          tipo: "MOD listo sin post escritura",
          referencia: `File #${archivo.id}`,
          tiempo: formatoTiempo(horas),
          estado: archivo.estado || "PENDIENTE_POST",
          horas,
        });
      }

      if (estado === "REQUIERE_CORRECCION" || archivo.correccion_pendiente === true) {
        alertasOperativas.push({
          id: `file-${archivo.id}-correccion`,
          severidad: "critica",
          tipo: "File Service requiere correccion",
          referencia: `File #${archivo.id}`,
          tiempo: formatoTiempo(horas),
          estado: archivo.estado || "REQUIERE_CORRECCION",
          horas,
        });
      }

      if (activo && horas > 24) {
        alertasOperativas.push({
          id: `file-${archivo.id}-activo-24`,
          severidad: "seguimiento",
          tipo: "File Service activo mas de 24h",
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
      ordenesActivas: ordenes.filter(
        (orden) => String(orden.estado || "").toUpperCase() !== "ENTREGADO"
      ).length,
      listasEntrega: ordenes.filter(
        (orden) =>
          String(orden.estado || "").toUpperCase() === "LISTO_PARA_ENTREGA"
      ).length,
      pendientesPago: ordenes.filter(
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
      clientes: puedeVerBase ? clientes.length : "Sin acceso",
      vehiculos: puedeVerBase ? vehiculos.length : "Sin acceso",
      ordenes: ordenes.length,
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

      setStats(calcularDashboard(ordenes, clientes, vehiculos, archivos));
    } catch (err) {
      console.error("Error cargando estadisticas:", err.response?.data || err.message);
    } finally {
      setCargandoDashboard(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [usuario?.rol]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-black uppercase tracking-tighter">
            Panel de Operaciones
          </h1>

          <p className="text-xs font-black uppercase text-gray-500 mt-2">
            Sesion activa: {usuario?.username} - Rol: {usuario?.rol}
          </p>

          <p className="text-xs font-bold uppercase text-gray-400 mt-1">
            Ultima actualizacion: {stats.ultimaActualizacion || "Pendiente"}
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

      <DashboardSection title="Comercial">
        <StatCard label="Caja hoy" val={formatoCLP(stats.cajaHoy)} color="border-black bg-black text-white" />
        <StatCard label="Caja semana" val={formatoCLP(stats.cajaSemana)} color="border-blue-500" />
        <StatCard label="Caja mes" val={formatoCLP(stats.cajaMes)} color="border-blue-500" />
        <StatCard label="Trabajos ingresados hoy" val={formatoCLP(stats.trabajosIngresadosHoy)} color="border-yellow-500" />
        <StatCard label="Total pagado mes" val={formatoCLP(stats.totalPagadoMes)} color="border-green-500" />
        <StatCard label="Ticket promedio mes" val={formatoCLP(stats.ticketPromedioMes)} color="border-green-500" />
      </DashboardSection>

      <DashboardSection title="Operacion">
        <StatCard label="Ordenes activas" val={stats.ordenesActivas} color="border-yellow-500" />
        <StatCard label="Listas para entrega" val={stats.listasEntrega} color="border-emerald-500" />
        <StatCard label="Pendientes de pago" val={stats.pendientesPago} color="border-red-500" />
        <StatCard label="Entregadas hoy" val={stats.entregadasHoy} color="border-blue-500" />
      </DashboardSection>

      <DashboardSection title="File Service">
        <StatCard label="Activos" val={stats.fileServiceActivos} color="border-purple-500" />
        <StatCard label="Pendientes post escritura" val={stats.fileServicePostPendiente} color="border-yellow-500" />
        <StatCard label="Correcciones pendientes" val={stats.fileServiceCorrecciones} color="border-red-500" />
      </DashboardSection>

      <AlertasOperativasSection alertas={stats.alertasOperativas} />

      <DashboardSection title="Base de datos">
        <StatCard label="Clientes" val={stats.clientes} color="border-blue-500" />
        <StatCard label="Vehiculos" val={stats.vehiculos} color="border-green-500" />
        <StatCard label="Ordenes" val={stats.ordenes} color="border-yellow-500" />
      </DashboardSection>

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
    critica: "bg-red-50 border-red-500 text-red-800",
    atencion: "bg-yellow-50 border-yellow-500 text-yellow-800",
    seguimiento: "bg-blue-50 border-blue-500 text-blue-800",
  };

  const severidadLabel = {
    critica: "Criticas",
    atencion: "Atencion",
    seguimiento: "Seguimiento",
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
          Alertas operativas
        </h2>

        <p className="text-[11px] font-bold uppercase text-gray-400">
          updatedAt es una aproximacion del tiempo por etapa
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniAlertCard label="Criticas" value={resumen.critica} color="border-red-500" />
        <MiniAlertCard label="Atencion" value={resumen.atencion} color="border-yellow-500" />
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
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 items-center"
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
