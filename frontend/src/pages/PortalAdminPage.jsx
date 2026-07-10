import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  portalAdminCargarCreditos,
  portalAdminCrearCuenta,
  portalAdminDownloadNuevaLectura,
  portalAdminDownloadOriginal,
  portalAdminListComprasCreditos,
  portalAdminListCuentas,
  portalAdminListFiles,
  portalAdminMovimientos,
  portalAdminSolicitarNuevaLectura,
  portalAdminUpdateFile,
  portalAdminUploadMod,
} from "../services/portalApi";
import api from "../services/api";
import { getOperationalStatusLabel, getStatusColor } from "../utils/statusStyles";

const estados = [
  "RECIBIDO",
  "EN_REVISION",
  "EN_PROCESO",
  "MOD_LISTO",
  "CORRECCION_SOLICITADA",
  "REQUIERE_NUEVA_LECTURA",
  "CORREGIDO",
  "ENTREGADO",
  "RECHAZADO",
];

const inputClass =
  "w-full border border-slate-700 bg-black px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500";

const fecha = (valor) => {
  if (!valor) return "Sin fecha";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "Sin fecha";
  return d.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
};

const formatoCLP = (valor) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(valor || 0));

const mensajeError = (err, fallback) =>
  err.response?.data?.error || err.message || fallback;

const estadoPortalClass = (estado) => getStatusColor(estado || "RECIBIDO", "soft");
const estadoCuentaClass = (item) =>
  !item?.activo
    ? getStatusColor("ARCHIVADO", "soft")
    : item?.aprobado
      ? getStatusColor("VALIDADO", "soft")
      : getStatusColor("PENDIENTE", "soft");

const sugerirUsernameDesdeEmail = (email = "") => {
  const base = String(email || "").trim().toLowerCase().split("@")[0] || "";
  return base.replace(/[^a-z0-9._-]/g, "").slice(0, 40);
};

function PortalAdminPage() {
  const [searchParams] = useSearchParams();
  const [cuentas, setCuentas] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [comprasCreditos, setComprasCreditos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [ediciones, setEdiciones] = useState({});
  const [mods, setMods] = useState({});
  const [nuevasLecturas, setNuevasLecturas] = useState({});
  const [cuentaMovimiento, setCuentaMovimiento] = useState("");
  const [nuevoUsuarioPorCuenta, setNuevoUsuarioPorCuenta] = useState({});
  const [resetPasswordPorUsuario, setResetPasswordPorUsuario] = useState({});
  const [edicionCuenta, setEdicionCuenta] = useState({});
  const [edicionUsuario, setEdicionUsuario] = useState({});
  const [auditoria, setAuditoria] = useState([]);
  const [auditoriaTitulo, setAuditoriaTitulo] = useState("");
  const [nuevaCuenta, setNuevaCuenta] = useState({
    nombre_taller: "",
    contacto: "",
    email: "",
    telefono: "",
    observaciones: "",
    usuario_nombre: "",
    usuario_email: "",
    usuario_username: "",
    usuario_password: "",
  });
  const [credito, setCredito] = useState({
    cuentaId: "",
    monto: "",
    referencia: "",
    observacion: "",
  });
  const archivoDestacadoId = searchParams.get("fileId");

  const cargar = async () => {
    try {
      setError("");
      setCargando(true);
      const [cuentasData, filesData, comprasData] = await Promise.all([
        portalAdminListCuentas(),
        portalAdminListFiles(),
        portalAdminListComprasCreditos(),
      ]);
      setCuentas(Array.isArray(cuentasData) ? cuentasData : []);
      setArchivos(Array.isArray(filesData) ? filesData : []);
      setComprasCreditos(Array.isArray(comprasData?.compras) ? comprasData.compras : []);
    } catch (err) {
      setError(
        err.status === 401 || err.status === 403
          ? "Solo OWNER puede administrar portal externo."
          : err.message || "No se pudo cargar el admin portal."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    if (!archivoDestacadoId || !archivos.length) return;

    const timeout = window.setTimeout(() => {
      document
        .getElementById(`portal-file-${archivoDestacadoId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [archivoDestacadoId, archivos.length]);

  const actualizarNuevaCuenta = (campo, valor) => {
    setNuevaCuenta((actual) => ({ ...actual, [campo]: valor }));
  };

  const actualizarNuevoUsuario = (cuentaId, campo, valor) => {
    setNuevoUsuarioPorCuenta((actual) => ({
      ...actual,
      [cuentaId]: {
        ...(actual[cuentaId] || {}),
        [campo]: valor,
      },
    }));
  };

  const actualizarEdicionCuenta = (cuentaId, campo, valor) => {
    setEdicionCuenta((actual) => ({
      ...actual,
      [cuentaId]: {
        ...(actual[cuentaId] || {}),
        [campo]: valor,
      },
    }));
  };

  const actualizarEdicionUsuario = (usuarioId, campo, valor) => {
    setEdicionUsuario((actual) => ({
      ...actual,
      [usuarioId]: {
        ...(actual[usuarioId] || {}),
        [campo]: valor,
      },
    }));
  };

  const crearCuenta = async (event) => {
    event.preventDefault();
    setError("");
    setMensaje("");

    if (
      !nuevaCuenta.nombre_taller ||
      !nuevaCuenta.usuario_nombre ||
      !nuevaCuenta.usuario_password ||
      (!nuevaCuenta.usuario_email && !nuevaCuenta.email)
    ) {
      setError("Debes completar taller, correo empresa o email de acceso, usuario y password inicial.");
      return;
    }

    try {
      const emailAcceso = (nuevaCuenta.usuario_email || nuevaCuenta.email || "").trim();
      await portalAdminCrearCuenta(nuevaCuenta);
      setMensaje(
        `Cuenta creada. Email de acceso: ${emailAcceso}${
          nuevaCuenta.usuario_username
            ? ` / Usuario: ${nuevaCuenta.usuario_username.trim()}`
            : ""
        }`
      );
      setNuevaCuenta({
        nombre_taller: "",
        contacto: "",
        email: "",
        telefono: "",
        observaciones: "",
        usuario_nombre: "",
        usuario_email: "",
        usuario_username: "",
        usuario_password: "",
      });
      await cargar();
    } catch (err) {
      setError(err.message || "No se pudo crear la cuenta.");
    }
  };

  const crearUsuarioPortal = async (event, cuenta) => {
    event.preventDefault();
    setError("");
    setMensaje("");

    const form = nuevoUsuarioPorCuenta[cuenta.id] || {};

    if (!form.nombre || !form.email || !form.password) {
      setError("Debes completar nombre, email y password del usuario portal.");
      return;
    }

    try {
      const res = await api.post(`/portal/admin/cuentas/${cuenta.id}/usuarios`, {
        nombre: form.nombre,
        email: form.email,
        username: form.username || "",
        password: form.password,
      });

      setMensaje(
        res.data?.mensaje || `Usuario portal creado: ${form.email.trim()}`
      );
      setNuevoUsuarioPorCuenta((actual) => ({
        ...actual,
        [cuenta.id]: { nombre: "", email: "", username: "", password: "" },
      }));
      await cargar();
    } catch (err) {
      setError(mensajeError(err, "No se pudo crear usuario portal."));
    }
  };

  const guardarCuentaPortal = async (cuenta) => {
    const edit = edicionCuenta[cuenta.id] || {};

    try {
      setError("");
      setMensaje("");
      const res = await api.patch(`/portal/admin/cuentas/${cuenta.id}`, {
        nombre_taller: edit.nombre_taller ?? cuenta.nombre_taller,
        contacto: edit.contacto ?? cuenta.contacto ?? "",
        email: edit.email ?? cuenta.email ?? "",
        telefono: edit.telefono ?? cuenta.telefono ?? "",
        pais: edit.pais ?? cuenta.pais ?? "",
        ciudad: edit.ciudad ?? cuenta.ciudad ?? "",
        observaciones: edit.observaciones ?? cuenta.observaciones ?? "",
        activo: cuenta.activo,
        aprobado: cuenta.aprobado,
      });
      setMensaje(res.data?.mensaje || "Cuenta portal actualizada.");
      await cargar();
    } catch (err) {
      setError(mensajeError(err, "No se pudo guardar la cuenta."));
    }
  };

  const guardarUsuarioPortal = async (usuario) => {
    const edit = edicionUsuario[usuario.id] || {};

    try {
      setError("");
      setMensaje("");
      const res = await api.patch(`/portal/admin/usuarios/${usuario.id}`, {
        nombre: edit.nombre ?? usuario.nombre,
        email: edit.email ?? usuario.email,
        username: edit.username ?? usuario.username ?? "",
        activo: usuario.activo,
        aprobado: usuario.aprobado,
      });
      setMensaje(res.data?.mensaje || "Usuario portal actualizado.");
      await cargar();
    } catch (err) {
      setError(mensajeError(err, "No se pudo guardar el usuario portal."));
    }
  };

  const actualizarEstadoCuenta = async (cuenta, cambios) => {
    try {
      setError("");
      setMensaje("");
      const res = await api.patch(`/portal/admin/cuentas/${cuenta.id}/estado`, {
        activo: cuenta.activo,
        aprobado: cuenta.aprobado,
        ...cambios,
      });
      setMensaje(res.data?.mensaje || "Estado de cuenta actualizado.");
      await cargar();
    } catch (err) {
      setError(mensajeError(err, "No se pudo actualizar la cuenta."));
    }
  };

  const actualizarEstadoUsuario = async (usuario, cambios) => {
    try {
      setError("");
      setMensaje("");
      const res = await api.patch(`/portal/admin/usuarios/${usuario.id}/estado`, {
        activo: usuario.activo,
        aprobado: usuario.aprobado,
        ...cambios,
      });
      setMensaje(res.data?.mensaje || "Estado de usuario actualizado.");
      await cargar();
    } catch (err) {
      setError(mensajeError(err, "No se pudo actualizar el usuario portal."));
    }
  };

  const resetearPasswordUsuario = async (usuario) => {
    const password = resetPasswordPorUsuario[usuario.id] || "";

    if (!password.trim()) {
      setError("Debes ingresar una nueva clave para el usuario portal.");
      return;
    }

    try {
      setError("");
      setMensaje("");
      const res = await api.post(
        `/portal/admin/usuarios/${usuario.id}/reset-password`,
        { password }
      );
      setMensaje(res.data?.mensaje || `Clave actualizada para ${usuario.email}`);
      setResetPasswordPorUsuario((actual) => ({
        ...actual,
        [usuario.id]: "",
      }));
      await cargar();
    } catch (err) {
      setError(mensajeError(err, "No se pudo resetear la clave."));
    }
  };

  const eliminarCuentaPrueba = async (cuenta) => {
    const confirmar = window.confirm(
      `¿Eliminar cuenta de prueba ${cuenta.nombre_taller}? Solo se eliminará si no tiene historial.`
    );

    if (!confirmar) return;

    try {
      setError("");
      setMensaje("");
      const res = await api.delete(`/portal/admin/cuentas/${cuenta.id}`);
      setMensaje(res.data?.mensaje || "Cuenta de prueba eliminada.");
      await cargar();
    } catch (err) {
      setError(mensajeError(err, "No se pudo eliminar la cuenta de prueba."));
    }
  };

  const cargarCreditos = async (event) => {
    event.preventDefault();
    setError("");
    setMensaje("");

    if (!credito.cuentaId || Number(credito.monto) <= 0) {
      setError("Selecciona cuenta y monto de créditos mayor a 0.");
      return;
    }

    try {
      await portalAdminCargarCreditos(credito.cuentaId, {
        monto: credito.monto,
        referencia: credito.referencia,
        observacion: credito.observacion,
      });
      setMensaje("Créditos cargados correctamente.");
      setCredito({ cuentaId: "", monto: "", referencia: "", observacion: "" });
      await cargar();
    } catch (err) {
      setError(err.message || "No se pudieron cargar créditos.");
    }
  };

  const verMovimientos = async (cuentaId) => {
    try {
      setError("");
      setCuentaMovimiento(cuentaId);
      const data = await portalAdminMovimientos(cuentaId);
      setMovimientos(Array.isArray(data?.movimientos) ? data.movimientos : []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar movimientos.");
    }
  };

  const verAuditoriaCuenta = async (cuenta) => {
    try {
      setError("");
      const res = await api.get(`/portal/admin/cuentas/${cuenta.id}/auditoria`, {
        params: { limit: 50 },
      });
      setAuditoria(Array.isArray(res.data) ? res.data : []);
      setAuditoriaTitulo(`Auditoría cuenta: ${cuenta.nombre_taller}`);
    } catch (err) {
      setError(mensajeError(err, "No se pudo cargar auditoría de cuenta."));
    }
  };

  const verAuditoriaUsuario = async (usuario) => {
    try {
      setError("");
      const res = await api.get(`/portal/admin/usuarios/${usuario.id}/auditoria`, {
        params: { limit: 50 },
      });
      setAuditoria(Array.isArray(res.data) ? res.data : []);
      setAuditoriaTitulo(`Auditoría usuario: ${usuario.email}`);
    } catch (err) {
      setError(mensajeError(err, "No se pudo cargar auditoría de usuario."));
    }
  };

  const editarFile = (id, campo, valor) => {
    setEdiciones((actual) => ({
      ...actual,
      [id]: {
        ...(actual[id] || {}),
        [campo]: valor,
      },
    }));
  };

  const actualizarFile = async (archivo) => {
    const edit = ediciones[archivo.id] || {};

    try {
      setError("");
      setMensaje("");
      await portalAdminUpdateFile(archivo.id, {
        estado: edit.estado || archivo.estado,
        observaciones_internas:
          edit.observaciones_internas ?? archivo.observaciones_internas ?? "",
        creditos_requeridos:
          edit.creditos_requeridos ?? archivo.creditos_requeridos ?? 1,
      });
      setMensaje(`Solicitud #${archivo.id} actualizada.`);
      await cargar();
    } catch (err) {
      setError(err.message || "No se pudo actualizar la solicitud.");
    }
  };

  const subirMod = async (archivo) => {
    const file = mods[archivo.id];

    if (!file) {
      setError("Debes seleccionar un MOD para subir.");
      return;
    }

    const formData = new FormData();
    formData.append("archivo", file);

    try {
      setError("");
      setMensaje("");
      await portalAdminUploadMod(archivo.id, formData);
      setMensaje(`MOD cargado para solicitud #${archivo.id}.`);
      setMods((actual) => ({ ...actual, [archivo.id]: null }));
      await cargar();
    } catch (err) {
      setError(err.message || "No se pudo subir el MOD.");
    }
  };

  const editarNuevaLectura = (id, campo, valor) => {
    setNuevasLecturas((actual) => ({
      ...actual,
      [id]: {
        ...(actual[id] || {}),
        [campo]: valor,
      },
    }));
  };

  const solicitarNuevaLectura = async (archivo) => {
    const form = nuevasLecturas[archivo.id] || {};
    const motivo = (form.motivo_tecnico || "").trim();
    const instrucciones = (form.instrucciones_nueva_lectura || "").trim();

    if (!motivo || !instrucciones) {
      setError("Debes ingresar motivo tecnico e instrucciones de nueva lectura.");
      return;
    }

    try {
      setError("");
      setMensaje("");
      await portalAdminSolicitarNuevaLectura(archivo.id, {
        motivo_tecnico: motivo,
        instrucciones_nueva_lectura: instrucciones,
      });
      setMensaje("Requerimiento enviado al portal del master/slave.");
      setNuevasLecturas((actual) => ({
        ...actual,
        [archivo.id]: {
          motivo_tecnico: "",
          instrucciones_nueva_lectura: "",
        },
      }));
      await cargar();
    } catch (err) {
      setError(err.message || "No se pudo solicitar la nueva lectura.");
    }
  };

  const guardarBlobDescarga = ({ blob, filename }, fallback) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || fallback || "archivo-portal.bin";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const descargarOriginal = async (archivo) => {
    try {
      setError("");
      setMensaje("");
      const descarga = await portalAdminDownloadOriginal(archivo.id);
      guardarBlobDescarga(descarga, archivo.nombre_original);
      setMensaje(`Archivo original descargado para solicitud #${archivo.id}.`);
    } catch (err) {
      setError(
        err.message ||
          "No se pudo descargar el archivo. Revisa si existe en almacenamiento."
      );
    }
  };

  const descargarNuevaLectura = async (archivo) => {
    try {
      setError("");
      setMensaje("");
      const descarga = await portalAdminDownloadNuevaLectura(archivo.id);
      guardarBlobDescarga(descarga, archivo.nombre_nueva_lectura);
      setMensaje(`Nueva lectura descargada para solicitud #${archivo.id}.`);
    } catch (err) {
      setError(
        err.message ||
          "No se pudo descargar el archivo. Revisa si existe en almacenamiento."
      );
    }
  };

  return (
    <main className="space-y-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
          OWNER
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase text-black">
              Portal externo File Service
            </h1>
            <p className="mt-2 text-xs font-bold uppercase text-gray-500">
              Administración de cuentas, créditos y solicitudes externas.
            </p>
          </div>
          <Link
            to="/mensajes"
            className="border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase text-white hover:bg-blue-700"
          >
            Bandeja mensajes
          </Link>
        </div>
      </div>

      {error && (
        <div className="border-4 border-red-600 bg-red-50 p-4 text-sm font-black uppercase text-red-800">
          {error}
        </div>
      )}
      {mensaje && (
        <div className="border-4 border-green-600 bg-green-50 p-4 text-sm font-black uppercase text-green-800">
          {mensaje}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.8fr]">
        <form onSubmit={crearCuenta} className="border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-sm font-black uppercase">Crear cuenta externa</h2>
          <p className="mt-2 text-xs font-bold text-gray-500">
            El master puede iniciar sesión con Email de acceso o Usuario de acceso. El correo empresa puede ser el mismo.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input className={inputClass} placeholder="Nombre taller" value={nuevaCuenta.nombre_taller} onChange={(e) => actualizarNuevaCuenta("nombre_taller", e.target.value)} />
            <input className={inputClass} placeholder="Contacto" value={nuevaCuenta.contacto} onChange={(e) => actualizarNuevaCuenta("contacto", e.target.value)} />
            <input className={inputClass} placeholder="Correo empresa/contacto" value={nuevaCuenta.email} onChange={(e) => actualizarNuevaCuenta("email", e.target.value)} />
            <input className={inputClass} placeholder="Teléfono" value={nuevaCuenta.telefono} onChange={(e) => actualizarNuevaCuenta("telefono", e.target.value)} />
            <input className={inputClass} placeholder="Nombre usuario portal" value={nuevaCuenta.usuario_nombre} onChange={(e) => actualizarNuevaCuenta("usuario_nombre", e.target.value)} />
            <input
              className={inputClass}
              placeholder="Email de acceso"
              value={nuevaCuenta.usuario_email}
              onChange={(e) => {
                const email = e.target.value;
                actualizarNuevaCuenta("usuario_email", email);
                if (!nuevaCuenta.usuario_username) {
                  actualizarNuevaCuenta("usuario_username", sugerirUsernameDesdeEmail(email));
                }
              }}
            />
            <input className={inputClass} placeholder="Usuario de acceso (opcional)" value={nuevaCuenta.usuario_username} onChange={(e) => actualizarNuevaCuenta("usuario_username", e.target.value)} />
            <input className={inputClass} type="password" placeholder="Password inicial" value={nuevaCuenta.usuario_password} onChange={(e) => actualizarNuevaCuenta("usuario_password", e.target.value)} />
            <input className={inputClass} placeholder="Observaciones" value={nuevaCuenta.observaciones} onChange={(e) => actualizarNuevaCuenta("observaciones", e.target.value)} />
          </div>
          <button className="mt-4 bg-black px-5 py-3 text-xs font-black uppercase text-white hover:bg-blue-700" type="submit">
            Crear cuenta
          </button>
        </form>

        <form onSubmit={cargarCreditos} className="border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-sm font-black uppercase">Cargar créditos</h2>
          <div className="mt-4 space-y-3">
            <select className={inputClass} value={credito.cuentaId} onChange={(e) => setCredito((a) => ({ ...a, cuentaId: e.target.value }))}>
              <option value="">Seleccionar cuenta</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.nombre_taller} - saldo {cuenta.saldo_creditos}
                </option>
              ))}
            </select>
            <input className={inputClass} placeholder="Monto créditos" value={credito.monto} onChange={(e) => setCredito((a) => ({ ...a, monto: e.target.value }))} />
            <input className={inputClass} placeholder="Referencia" value={credito.referencia} onChange={(e) => setCredito((a) => ({ ...a, referencia: e.target.value }))} />
            <input className={inputClass} placeholder="Observación" value={credito.observacion} onChange={(e) => setCredito((a) => ({ ...a, observacion: e.target.value }))} />
          </div>
          <button className="mt-4 bg-blue-600 px-5 py-3 text-xs font-black uppercase text-white hover:bg-black" type="submit">
            Cargar créditos
          </button>
        </form>
      </section>

      <section className="border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-black uppercase">Compras de créditos</h2>
            <p className="mt-1 text-xs font-bold uppercase text-gray-500">
              Pagos Flow del Portal Master. La carga manual sigue disponible.
            </p>
          </div>
          <button type="button" onClick={cargar} disabled={cargando} className="border-2 border-black px-4 py-2 text-xs font-black uppercase disabled:opacity-50">
            {cargando ? "Cargando..." : "Actualizar compras"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
          {comprasCreditos.slice(0, 12).map((compra) => (
            <div key={compra.id} className="border-2 border-black bg-slate-50 p-4 text-xs font-bold">
              <div className="flex items-center justify-between gap-3">
                <span className="font-black uppercase text-black">
                  {compra.estado || "PENDIENTE"}
                </span>
                <span className="font-black uppercase text-blue-700">
                  {compra.creditos} créditos
                </span>
              </div>
              <p className="mt-2 font-black uppercase">
                {compra.Cuenta?.nombre_taller || "Cuenta sin nombre"}
              </p>
              <p className="text-gray-600">
                {compra.Usuario?.email || "Usuario no informado"}
              </p>
              <p className="mt-2">Monto: {formatoCLP(compra.monto_clp)}</p>
              <p>Paquete: {compra.paquete_id}</p>
              <p>Fecha: {fecha(compra.createdAt)}</p>
              {compra.flow_commerce_order && (
                <p className="mt-2 break-all text-[10px] text-gray-500">
                  Flow: {compra.flow_commerce_order}
                </p>
              )}
            </div>
          ))}

          {!comprasCreditos.length && !cargando && (
            <p className="text-xs font-bold uppercase text-gray-500">
              Sin compras de créditos registradas.
            </p>
          )}
        </div>
      </section>

      <section className="border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-black uppercase">Cuentas externas</h2>
          <button type="button" onClick={cargar} disabled={cargando} className="border-2 border-black px-4 py-2 text-xs font-black uppercase disabled:opacity-50">
            {cargando ? "Cargando..." : "Actualizar"}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cuentas.map((cuenta) => {
            const usuariosPortal = cuenta.Usuarios || cuenta.PortalUsuarios || [];

            return (
              <article key={cuenta.id} className="border-2 border-black p-4">
                <p className="text-sm font-black uppercase">{cuenta.nombre_taller}</p>
                <p className="mt-2 text-xs font-bold text-gray-500">
                  Correo empresa/contacto: {cuenta.email || "No registrado"}
                </p>
                <p className="text-xs font-bold text-gray-500">
                  Contacto: {cuenta.contacto || cuenta.telefono || "Sin contacto"}
                </p>
                <p className="mt-2 text-xs font-black uppercase">Saldo: {cuenta.saldo_creditos}</p>
                <p
                  className={`mt-2 inline-block border px-3 py-1 text-xs font-black uppercase ${estadoCuentaClass(
                    cuenta
                  )}`}
                >
                  {cuenta.activo ? "Activa" : "Inactiva"} / {cuenta.aprobado ? "Aprobada" : "Pendiente"}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase text-gray-500">
                  Archivos: {cuenta.total_archivos ?? 0} / Movimientos: {cuenta.total_movimientos ?? 0}
                </p>
                {!cuenta.activo && (
                  <p className="mt-2 bg-red-100 p-2 text-xs font-black uppercase text-red-700">
                    Cuenta inactiva: no podrá iniciar sesión.
                  </p>
                )}
                {cuenta.total_archivos > 0 || cuenta.total_movimientos > 0 ? (
                  <p className="mt-2 bg-yellow-100 p-2 text-xs font-black uppercase text-yellow-800">
                    Cuenta con historial: no se elimina, se desactiva.
                  </p>
                ) : null}

                <details className="mt-3 border-2 border-black p-3">
                  <summary className="cursor-pointer text-[10px] font-black uppercase">
                    Editar datos de cuenta
                  </summary>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <input className={inputClass} placeholder="Nombre taller" value={edicionCuenta[cuenta.id]?.nombre_taller ?? cuenta.nombre_taller ?? ""} onChange={(e) => actualizarEdicionCuenta(cuenta.id, "nombre_taller", e.target.value)} />
                    <input className={inputClass} placeholder="Contacto" value={edicionCuenta[cuenta.id]?.contacto ?? cuenta.contacto ?? ""} onChange={(e) => actualizarEdicionCuenta(cuenta.id, "contacto", e.target.value)} />
                    <input className={inputClass} placeholder="Correo empresa/contacto" value={edicionCuenta[cuenta.id]?.email ?? cuenta.email ?? ""} onChange={(e) => actualizarEdicionCuenta(cuenta.id, "email", e.target.value)} />
                    <input className={inputClass} placeholder="Teléfono" value={edicionCuenta[cuenta.id]?.telefono ?? cuenta.telefono ?? ""} onChange={(e) => actualizarEdicionCuenta(cuenta.id, "telefono", e.target.value)} />
                    <input className={inputClass} placeholder="País" value={edicionCuenta[cuenta.id]?.pais ?? cuenta.pais ?? ""} onChange={(e) => actualizarEdicionCuenta(cuenta.id, "pais", e.target.value)} />
                    <input className={inputClass} placeholder="Ciudad" value={edicionCuenta[cuenta.id]?.ciudad ?? cuenta.ciudad ?? ""} onChange={(e) => actualizarEdicionCuenta(cuenta.id, "ciudad", e.target.value)} />
                    <textarea className={`${inputClass} min-h-[70px]`} placeholder="Observaciones" value={edicionCuenta[cuenta.id]?.observaciones ?? cuenta.observaciones ?? ""} onChange={(e) => actualizarEdicionCuenta(cuenta.id, "observaciones", e.target.value)} />
                  </div>
                  <button
                    type="button"
                    onClick={() => guardarCuentaPortal(cuenta)}
                    className="mt-2 bg-black px-3 py-2 text-[10px] font-black uppercase text-white"
                  >
                    Guardar cuenta
                  </button>
                </details>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => actualizarEstadoCuenta(cuenta, { activo: !cuenta.activo })}
                    className="border-2 border-black px-3 py-2 text-[10px] font-black uppercase"
                  >
                    {cuenta.activo ? "Desactivar cuenta" : "Activar cuenta"}
                  </button>
                  <button
                    type="button"
                    onClick={() => actualizarEstadoCuenta(cuenta, { aprobado: !cuenta.aprobado })}
                    className="border-2 border-black px-3 py-2 text-[10px] font-black uppercase"
                  >
                    {cuenta.aprobado ? "Pausar aprobación" : "Aprobar cuenta"}
                  </button>
                  {cuenta.puede_eliminar_prueba ? (
                    <button
                      type="button"
                      onClick={() => eliminarCuentaPrueba(cuenta)}
                      className="border-2 border-red-600 px-3 py-2 text-[10px] font-black uppercase text-red-700"
                    >
                      Eliminar cuenta de prueba
                    </button>
                  ) : (
                    <span className="border-2 border-yellow-500 px-3 py-2 text-[10px] font-black uppercase text-yellow-700">
                      Tiene historial: desactivar
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => verAuditoriaCuenta(cuenta)}
                    className="border-2 border-blue-600 px-3 py-2 text-[10px] font-black uppercase text-blue-700"
                  >
                    Ver auditoría
                  </button>
                </div>

                <div className="mt-3 border-t-2 border-black pt-3">
                  <p className="text-[10px] font-black uppercase text-blue-700">
                    Usuarios de acceso
                  </p>
                  {usuariosPortal.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {usuariosPortal.map((usuario) => (
                        <div
                          key={usuario.id || usuario.email}
                          className={`border p-2 ${estadoCuentaClass(usuario)}`}
                        >
                          <p className="text-xs font-black uppercase">
                            {usuario.nombre || "Usuario portal"}
                          </p>
                          <p className="text-xs font-bold text-gray-700">
                            Email de acceso:{" "}
                            {usuario.email ? (
                              <a href={`mailto:${usuario.email}`} className="text-blue-700 underline">
                                {usuario.email}
                              </a>
                            ) : (
                              "No registrado"
                            )}
                          </p>
                          <p className="text-xs font-bold text-gray-700">
                            Usuario de acceso: {usuario.username || "No registrado"}
                          </p>
                          <p className="text-[10px] font-black uppercase">
                            {usuario.activo ? "Activo" : "Inactivo"} / {usuario.aprobado ? "Aprobado" : "Pendiente"}
                          </p>
                          <p className="text-[10px] font-bold uppercase text-gray-500">
                            Rol portal: {usuario.rol || "MASTER"}
                          </p>
                          <p className="text-[10px] font-bold uppercase text-gray-500">
                            Último login: {fecha(usuario.last_login_at)}
                          </p>
                          <p className="text-[10px] font-bold uppercase text-gray-500">
                            Última actividad: {fecha(usuario.last_seen_at)}
                          </p>
                          {!usuario.activo && (
                            <p className="mt-1 bg-red-100 p-2 text-[10px] font-black uppercase text-red-700">
                              Usuario inactivo
                            </p>
                          )}

                          <details className="mt-2 border border-gray-400 p-2">
                            <summary className="cursor-pointer text-[9px] font-black uppercase">
                              Editar usuario portal
                            </summary>
                            <div className="mt-2 grid grid-cols-1 gap-2">
                              <input
                                className={inputClass}
                                placeholder="Nombre"
                                value={edicionUsuario[usuario.id]?.nombre ?? usuario.nombre ?? ""}
                                onChange={(e) => actualizarEdicionUsuario(usuario.id, "nombre", e.target.value)}
                              />
                              <input
                                className={inputClass}
                                placeholder="Email de acceso"
                                value={edicionUsuario[usuario.id]?.email ?? usuario.email ?? ""}
                                onChange={(e) => actualizarEdicionUsuario(usuario.id, "email", e.target.value)}
                              />
                              <input
                                className={inputClass}
                                placeholder="Usuario de acceso (opcional)"
                                value={edicionUsuario[usuario.id]?.username ?? usuario.username ?? ""}
                                onChange={(e) => actualizarEdicionUsuario(usuario.id, "username", e.target.value)}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => guardarUsuarioPortal(usuario)}
                              className="mt-2 bg-black px-3 py-2 text-[9px] font-black uppercase text-white"
                            >
                              Guardar usuario
                            </button>
                          </details>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => actualizarEstadoUsuario(usuario, { activo: !usuario.activo })}
                              className="border border-black px-2 py-1 text-[9px] font-black uppercase"
                            >
                              {usuario.activo ? "Desactivar usuario" : "Activar usuario"}
                            </button>
                            <button
                              type="button"
                              onClick={() => actualizarEstadoUsuario(usuario, { aprobado: !usuario.aprobado })}
                              className="border border-black px-2 py-1 text-[9px] font-black uppercase"
                            >
                              {usuario.aprobado ? "Pausar usuario" : "Aprobar usuario"}
                            </button>
                            <button
                              type="button"
                              onClick={() => verAuditoriaUsuario(usuario)}
                              className="border border-blue-600 px-2 py-1 text-[9px] font-black uppercase text-blue-700"
                            >
                              Auditoría
                            </button>
                          </div>

                          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                            <input
                              className={inputClass}
                              type="password"
                              placeholder="Nueva clave portal"
                              value={resetPasswordPorUsuario[usuario.id] || ""}
                              onChange={(e) =>
                                setResetPasswordPorUsuario((actual) => ({
                                  ...actual,
                                  [usuario.id]: e.target.value,
                                }))
                              }
                            />
                            <button
                              type="button"
                              onClick={() => resetearPasswordUsuario(usuario)}
                              className="bg-black px-3 py-2 text-[9px] font-black uppercase text-white"
                            >
                              Reset clave
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 border-2 border-red-600 bg-red-50 p-3 text-xs font-black uppercase text-red-700">
                      Esta cuenta no tiene usuario de acceso. El cliente no podrá iniciar sesión.
                    </div>
                  )}
                </div>

                <form
                  onSubmit={(event) => crearUsuarioPortal(event, cuenta)}
                  className="mt-3 border-t-2 border-black pt-3"
                >
                  <p className="text-[10px] font-black uppercase text-gray-500">
                    Crear usuario de acceso
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <input
                      className={inputClass}
                      placeholder="Nombre usuario portal"
                      value={nuevoUsuarioPorCuenta[cuenta.id]?.nombre || ""}
                      onChange={(e) => actualizarNuevoUsuario(cuenta.id, "nombre", e.target.value)}
                    />
                    <input
                      className={inputClass}
                      placeholder="Email de acceso"
                      value={nuevoUsuarioPorCuenta[cuenta.id]?.email || ""}
                      onChange={(e) => {
                        const email = e.target.value;
                        actualizarNuevoUsuario(cuenta.id, "email", email);
                        if (!nuevoUsuarioPorCuenta[cuenta.id]?.username) {
                          actualizarNuevoUsuario(cuenta.id, "username", sugerirUsernameDesdeEmail(email));
                        }
                      }}
                    />
                    <input
                      className={inputClass}
                      placeholder="Usuario de acceso (opcional)"
                      value={nuevoUsuarioPorCuenta[cuenta.id]?.username || ""}
                      onChange={(e) => actualizarNuevoUsuario(cuenta.id, "username", e.target.value)}
                    />
                    <input
                      className={inputClass}
                      type="password"
                      placeholder="Password inicial"
                      value={nuevoUsuarioPorCuenta[cuenta.id]?.password || ""}
                      onChange={(e) => actualizarNuevoUsuario(cuenta.id, "password", e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="mt-2 bg-blue-600 px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-black"
                  >
                    Crear usuario de acceso
                  </button>
                </form>

                <button type="button" onClick={() => verMovimientos(cuenta.id)} className="mt-3 border-2 border-black px-3 py-2 text-[10px] font-black uppercase">
                  Ver movimientos
                </button>
              </article>
            );
          })}
        </div>

        {cuentaMovimiento && (
          <div className="mt-5 border-2 border-blue-600 p-4">
            <p className="text-xs font-black uppercase text-blue-700">
              Movimientos cuenta #{cuentaMovimiento}
            </p>
            <div className="mt-3 space-y-2">
              {movimientos.map((movimiento) => (
                <div key={movimiento.id} className="grid grid-cols-1 gap-2 border border-gray-300 p-3 text-xs font-bold md:grid-cols-5">
                  <span>{fecha(movimiento.createdAt)}</span>
                  <span>{movimiento.tipo}</span>
                  <span>Monto: {movimiento.monto}</span>
                  <span>Saldo: {movimiento.saldo_nuevo}</span>
                  <span>{movimiento.observacion || movimiento.referencia || "Sin observación"}</span>
                </div>
              ))}
              {!movimientos.length && <p className="text-xs font-bold text-gray-500">Sin movimientos.</p>}
            </div>
          </div>
        )}
      </section>

      {auditoriaTitulo && (
        <section className="border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-sm font-black uppercase">{auditoriaTitulo}</h2>
            <button
              type="button"
              onClick={() => {
                setAuditoria([]);
                setAuditoriaTitulo("");
              }}
              className="border-2 border-black px-4 py-2 text-xs font-black uppercase"
            >
              Cerrar auditoría
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {auditoria.map((evento) => (
              <div
                key={evento.id}
                className="grid grid-cols-1 gap-2 border border-gray-300 p-3 text-xs font-bold md:grid-cols-5"
              >
                <span>{fecha(evento.createdAt)}</span>
                <span>{evento.tipo}</span>
                <span>{evento.resultado}</span>
                <span>{evento.creado_por || "Sistema"}</span>
                <span>{evento.descripcion || "Sin descripción"}</span>
              </div>
            ))}
            {!auditoria.length && (
              <p className="text-xs font-bold text-gray-500">
                Sin eventos de auditoría para esta selección.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-sm font-black uppercase">Solicitudes externas</h2>
        <div className="mt-4 space-y-4">
          {archivos.map((archivo) => {
            const edit = ediciones[archivo.id] || {};
            const destacado = String(archivo.id) === String(archivoDestacadoId);
            const hashActual = window.location.hash;
            return (
              <article
                key={archivo.id}
                id={`portal-file-${archivo.id}`}
                className={`border-2 p-4 ${
                  destacado
                    ? "border-blue-600 bg-blue-50 shadow-[0_0_0_4px_rgba(37,99,235,0.22)]"
                    : "border-black"
                }`}
              >
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
                  <div>
                    <p className="text-sm font-black uppercase">File #{archivo.id} - {archivo.tipo_servicio}</p>
                    <span
                      className={`mt-2 inline-block border px-3 py-1 text-[10px] font-black uppercase ${estadoPortalClass(
                        archivo.requiere_nueva_lectura
                          ? "REQUIERE_NUEVA_LECTURA"
                          : archivo.estado
                      )}`}
                    >
                      {getOperationalStatusLabel(
                        archivo.requiere_nueva_lectura
                          ? "REQUIERE_NUEVA_LECTURA"
                          : archivo.estado || "RECIBIDO"
                      )}
                    </span>
                    <p className="text-xs font-bold text-gray-500">
                      {archivo.Cuenta?.nombre_taller || "Cuenta no registrada"} / {archivo.Usuario?.email || "Usuario no registrado"}
                    </p>
                    <p className="mt-2 text-xs font-bold text-gray-500">
                      {archivo.marca_vehiculo} {archivo.modelo_vehiculo} {archivo.anio_vehiculo}
                    </p>
                    <p className="mt-2 text-xs font-black uppercase">
                      Original: {archivo.nombre_original || "No registrado"} / MOD: {archivo.nombre_modificado || "Pendiente"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {archivo.archivo_original_disponible && (
                        <button
                          type="button"
                          onClick={() => descargarOriginal(archivo)}
                          className="border-2 border-blue-600 px-3 py-2 text-[10px] font-black uppercase text-blue-700 hover:bg-blue-600 hover:text-white"
                        >
                          Descargar archivo original
                        </button>
                      )}
                      {archivo.nombre_nueva_lectura && (
                        <button
                          type="button"
                          onClick={() => descargarNuevaLectura(archivo)}
                          className="border-2 border-yellow-600 px-3 py-2 text-[10px] font-black uppercase text-yellow-700 hover:bg-yellow-500 hover:text-black"
                        >
                          Descargar nueva lectura
                        </button>
                      )}
                    </div>
                    {archivo.observacion_correccion && (
                      <p className="mt-2 text-xs font-bold text-red-700">
                        Corrección: {archivo.observacion_correccion}
                      </p>
                    )}
                  </div>

                  {archivo.requiere_nueva_lectura && (
                    <div
                      className={`mt-3 border-2 p-3 text-xs font-bold ${getStatusColor(
                        "REQUIERE_NUEVA_LECTURA",
                        "soft"
                      )}`}
                    >
                      <p className="font-black uppercase">
                        Nueva lectura solicitada al portal
                      </p>
                      <p className="mt-1">
                        Motivo: {archivo.nueva_lectura_motivo || "No registrado"}
                      </p>
                      <p className="mt-1">
                        Instrucciones: {archivo.nueva_lectura_instrucciones || "No registradas"}
                      </p>
                      <p className="mt-1 text-[10px] uppercase">
                        Por: {archivo.nueva_lectura_solicitada_por || "GMTCH"} / {fecha(archivo.nueva_lectura_solicitada_at)}
                      </p>
                    </div>
                  )}
                  {archivo.nombre_nueva_lectura && (
                    <p className="mt-2 text-xs font-bold text-blue-700">
                      Ultima nueva lectura: {archivo.nombre_nueva_lectura} / {fecha(archivo.nueva_lectura_subida_at)}
                    </p>
                  )}

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <select className={inputClass} value={edit.estado || archivo.estado || "RECIBIDO"} onChange={(e) => editarFile(archivo.id, "estado", e.target.value)}>
                        {estados.map((estado) => (
                          <option key={estado} value={estado}>{estado}</option>
                        ))}
                      </select>
                      <input className={inputClass} placeholder="Créditos requeridos" value={edit.creditos_requeridos ?? archivo.creditos_requeridos ?? ""} onChange={(e) => editarFile(archivo.id, "creditos_requeridos", e.target.value)} />
                      <button type="button" onClick={() => actualizarFile(archivo)} className="bg-black px-4 py-2 text-xs font-black uppercase text-white hover:bg-blue-700">
                        Actualizar
                      </button>
                    </div>
                    <textarea className={`${inputClass} min-h-[80px]`} placeholder="Observaciones internas" value={edit.observaciones_internas ?? archivo.observaciones_internas ?? ""} onChange={(e) => editarFile(archivo.id, "observaciones_internas", e.target.value)} />
                    <details
                      open={destacado && hashActual === "#nueva-lectura"}
                      className="border-2 border-yellow-500 bg-yellow-50 p-3"
                    >
                      <summary className="cursor-pointer text-[10px] font-black uppercase text-yellow-900">
                        Solicitar nueva lectura
                      </summary>
                      <p className="mt-2 text-xs font-bold text-yellow-900">
                        Usalo cuando la lectura original no sea tecnicamente valida para continuar.
                      </p>
                      <textarea
                        className={`${inputClass} mt-3 min-h-[70px]`}
                        placeholder="Motivo tecnico"
                        value={nuevasLecturas[archivo.id]?.motivo_tecnico || ""}
                        onChange={(e) => editarNuevaLectura(archivo.id, "motivo_tecnico", e.target.value)}
                      />
                      <textarea
                        className={`${inputClass} mt-3 min-h-[90px]`}
                        placeholder="Instrucciones. Ej: Lectura EEPROM por KESS3 no valida. Requiere lectura in-circuit con programador EEPROM."
                        value={nuevasLecturas[archivo.id]?.instrucciones_nueva_lectura || ""}
                        onChange={(e) => editarNuevaLectura(archivo.id, "instrucciones_nueva_lectura", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => solicitarNuevaLectura(archivo)}
                        className="mt-3 border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white hover:bg-yellow-500 hover:text-black"
                      >
                        Solicitar nueva lectura
                      </button>
                    </details>
                    <div className="flex flex-col gap-2 md:flex-row">
                      <input type="file" className={inputClass} onChange={(e) => setMods((actual) => ({ ...actual, [archivo.id]: e.target.files?.[0] || null }))} />
                      <button type="button" onClick={() => subirMod(archivo)} className="bg-blue-600 px-4 py-2 text-xs font-black uppercase text-white hover:bg-black">
                        Subir MOD
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          {!archivos.length && !cargando && (
            <p className="text-sm font-bold text-gray-500">Sin solicitudes externas.</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default PortalAdminPage;
