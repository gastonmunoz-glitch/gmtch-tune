import { useEffect, useState } from "react";
import api from "../services/api";

const ROLES = [
  { value: "OWNER", label: "OWNER" },
  { value: "ADMIN", label: "ADMIN" },
  { value: "SUPERVISOR", label: "SUPERVISOR" },
  { value: "RECEPCION", label: "RECEPCION" },
  { value: "OPERADOR_SCANNER", label: "OPERADOR SCANNER" },
  { value: "OPERADOR_ECU", label: "OPERADOR ECU" },
  { value: "MECANICO", label: "MECANICO" },
  { value: "TUNER", label: "TUNER" },
];

const ESTADO_INICIAL = {
  nombre: "",
  username: "",
  password: "",
  rol: "RECEPCION",
};

const formatearFecha = (fecha) => {
  if (!fecha) return "No registrada";

  try {
    return new Date(fecha).toLocaleDateString("es-CL", {
      dateStyle: "short",
    });
  } catch {
    return fecha;
  }
};

const formatearFechaHora = (fecha) => {
  if (!fecha) return "No registrada";

  try {
    return new Date(fecha).toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return fecha;
  }
};

const obtenerEstadoPresencia = (usuario) => {
  if (!usuario.last_login_at) {
    return {
      label: "Nunca ingresó",
      className: "bg-gray-200 text-gray-700 border-gray-500",
    };
  }

  const lastSeen = usuario.last_seen_at ? new Date(usuario.last_seen_at) : null;
  const diffMinutos = lastSeen
    ? (Date.now() - lastSeen.getTime()) / 60000
    : Number.POSITIVE_INFINITY;

  if (usuario.online_aproximado || diffMinutos <= 10) {
    return {
      label: "Online aproximado",
      className: "bg-green-100 text-green-800 border-green-500",
    };
  }

  if (usuario.activo_reciente || diffMinutos <= 60) {
    return {
      label: "Reciente",
      className: "bg-blue-100 text-blue-800 border-blue-500",
    };
  }

  return {
    label: "Inactivo",
    className: "bg-yellow-100 text-yellow-800 border-yellow-500",
  };
};

function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({ ...ESTADO_INICIAL });
  const [cargando, setCargando] = useState(false);

  const cargarUsuarios = async () => {
    try {
      setCargando(true);

      const res = await api.get("/usuarios/presencia");

      setUsuarios(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("ERROR CARGANDO USUARIOS:", err.response?.data || err.message);
      alert(err.response?.data?.error || "No se pudieron cargar los usuarios.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    let activo = true;

    const cargarInicial = async () => {
      try {
        const res = await api.get("/usuarios/presencia");

        if (!activo) return;

        setUsuarios(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(
          "ERROR CARGANDO USUARIOS:",
          err.response?.data || err.message
        );

        if (!activo) return;

        alert(
          err.response?.data?.error || "No se pudieron cargar los usuarios."
        );
      }
    };

    cargarInicial();

    return () => {
      activo = false;
    };
  }, []);

  const actualizarForm = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const crearUsuario = async (e) => {
    e.preventDefault();

    const nombre = form.nombre.trim();
    const username = form.username.trim();
    const password = form.password.trim();
    const rol = form.rol.trim();

    if (!nombre || !username || !password || !rol) {
      alert("Debes completar nombre, usuario, contraseña y rol.");
      return;
    }

    try {
      setCargando(true);

      await api.post("/usuarios", {
        nombre,
        username,
        password,
        rol,
      });

      setForm({ ...ESTADO_INICIAL });
      await cargarUsuarios();

      alert("Usuario creado correctamente.");
    } catch (err) {
      console.error("ERROR CREANDO USUARIO:", err.response?.data || err.message);
      alert(err.response?.data?.error || "No se pudo crear el usuario.");
    } finally {
      setCargando(false);
    }
  };

  const actualizarUsuario = async (id, payload) => {
    try {
      setCargando(true);

      await api.patch(`/usuarios/${id}`, payload);
      await cargarUsuarios();
    } catch (err) {
      console.error(
        "ERROR ACTUALIZANDO USUARIO:",
        err.response?.data || err.message
      );
      alert(err.response?.data?.error || "No se pudo actualizar el usuario.");
    } finally {
      setCargando(false);
    }
  };

  const cambiarPassword = async (id) => {
    const nueva = window.prompt("Nueva contraseña para el usuario:");

    if (!nueva) return;

    await actualizarUsuario(id, {
      password: nueva,
    });

    alert("Contraseña actualizada.");
  };

  const desactivarUsuario = async (id, username) => {
    const confirmar = window.confirm(
      `¿Desactivar acceso de ${username}? No se borrará su historial.`
    );

    if (!confirmar) return;

    try {
      setCargando(true);

      await api.delete(`/usuarios/${id}`);
      await cargarUsuarios();

      alert("Usuario desactivado correctamente.");
    } catch (err) {
      console.error(
        "ERROR DESACTIVANDO USUARIO:",
        err.response?.data || err.message
      );
      alert(err.response?.data?.error || "No se pudo desactivar el usuario.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="bg-black text-white p-8 border-b-8 border-blue-600 shadow-2xl">
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase">
          Control de Usuarios
        </h1>

        <p className="text-blue-400 font-bold text-xs uppercase tracking-[.3em] mt-2">
          Roles · Accesos · Segmentación Operativa GMTCH Tune
        </p>
      </div>

      <div className="bg-blue-50 border-4 border-blue-700 p-5">
        <h2 className="text-xl font-black uppercase text-blue-900">
          Presencia de usuarios V1
        </h2>
        <p className="text-xs font-bold uppercase text-blue-700 mt-2">
          Esta información es referencial. Online aproximado se calcula por actividad reciente en la plataforma.
        </p>
      </div>

      <form
        onSubmit={crearUsuario}
        className="bg-white border-4 border-black p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
      >
        <h2 className="text-2xl font-black uppercase mb-5">
          Crear nuevo usuario
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <input
            className="border-2 border-black p-3 font-bold"
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => actualizarForm("nombre", e.target.value)}
            required
          />

          <input
            className="border-2 border-black p-3 font-bold"
            placeholder="Usuario"
            value={form.username}
            onChange={(e) => actualizarForm("username", e.target.value)}
            required
          />

          <input
            className="border-2 border-black p-3 font-bold"
            placeholder="Contraseña"
            type="password"
            value={form.password}
            onChange={(e) => actualizarForm("password", e.target.value)}
            required
          />

          <select
            className="border-2 border-black p-3 font-bold bg-white"
            value={form.rol}
            onChange={(e) => actualizarForm("rol", e.target.value)}
            required
          >
            {ROLES.map((rol) => (
              <option key={rol.value} value={rol.value}>
                {rol.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={cargando}
          className="mt-5 bg-black text-white px-8 py-4 font-black uppercase text-xs disabled:bg-gray-400"
        >
          {cargando ? "Guardando..." : "Crear usuario"}
        </button>
      </form>

      <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="bg-slate-100 border-b-4 border-black p-5 flex flex-col md:flex-row gap-4 md:justify-between md:items-center">
          <div>
            <h2 className="text-2xl font-black uppercase">
              Usuarios registrados
            </h2>

            <p className="text-xs font-bold uppercase text-gray-500">
              Solo OWNER puede administrar esta sección.
            </p>
          </div>

          <button
            type="button"
            onClick={cargarUsuarios}
            disabled={cargando}
            className="bg-blue-600 text-white px-4 py-2 font-black uppercase text-[10px] disabled:bg-gray-400"
          >
            {cargando ? "Cargando..." : "Refrescar"}
          </button>
        </div>

        <div className="divide-y-2 divide-black">
          {usuarios.map((usuario) => {
            const estado = obtenerEstadoPresencia(usuario);

            return (
              <div
                key={usuario.id}
                className="p-5 grid grid-cols-1 xl:grid-cols-12 gap-4 xl:items-center"
              >
                <div className="xl:col-span-3">
                  <p className="text-lg font-black uppercase">
                    {usuario.nombre || usuario.username}
                  </p>

                  <p className="text-xs font-bold uppercase text-gray-500">
                    @{usuario.username}
                  </p>

                  {usuario.createdAt && (
                    <p className="text-xs font-bold uppercase text-gray-500">
                      Creado: {formatearFecha(usuario.createdAt)}
                    </p>
                  )}
                </div>

                <div className="xl:col-span-3 space-y-2">
                  <span
                    className={`inline-block border-2 rounded-full px-3 py-1 text-[10px] font-black uppercase ${estado.className}`}
                  >
                    {estado.label}
                  </span>

                  <p className="text-[10px] font-black uppercase text-gray-500">
                    Último login: {formatearFechaHora(usuario.last_login_at)}
                  </p>

                  <p className="text-[10px] font-black uppercase text-gray-500">
                    Última actividad: {formatearFechaHora(usuario.last_seen_at)}
                  </p>

                  <p className="text-[10px] font-black uppercase text-gray-500">
                    Cantidad de ingresos: {Number(usuario.login_count || 0)}
                  </p>
                </div>

                <div className="xl:col-span-2">
                  <select
                    className="border-2 border-black p-3 font-bold bg-white w-full"
                    value={usuario.rol}
                    onChange={(e) =>
                      actualizarUsuario(usuario.id, {
                        rol: e.target.value,
                      })
                    }
                  >
                    {ROLES.map((rol) => (
                      <option key={rol.value} value={rol.value}>
                        {rol.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="xl:col-span-1">
                  <button
                    type="button"
                    onClick={() =>
                      actualizarUsuario(usuario.id, {
                        activo: !usuario.activo,
                      })
                    }
                    className={`w-full px-4 py-3 border-2 border-black font-black uppercase text-[10px] ${
                      usuario.activo
                        ? "bg-green-500 text-black"
                        : "bg-red-600 text-white"
                    }`}
                  >
                    {usuario.activo ? "Activo" : "Inactivo"}
                  </button>
                </div>

                <div className="xl:col-span-1">
                  <button
                    type="button"
                    onClick={() => cambiarPassword(usuario.id)}
                    className="w-full bg-black text-white px-4 py-3 border-2 border-black font-black uppercase text-[10px]"
                  >
                    Cambiar clave
                  </button>
                </div>

                <div className="xl:col-span-2">
                  <button
                    type="button"
                    onClick={() =>
                      desactivarUsuario(usuario.id, usuario.username)
                    }
                    disabled={!usuario.activo}
                    className="w-full bg-red-600 text-white px-4 py-3 border-2 border-black font-black uppercase text-[10px] disabled:bg-gray-400 disabled:text-gray-700"
                  >
                    Desactivar acceso
                  </button>
                </div>
              </div>
            );
          })}

          {usuarios.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-xl font-black uppercase">
                No hay usuarios registrados
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UsuariosPage;
