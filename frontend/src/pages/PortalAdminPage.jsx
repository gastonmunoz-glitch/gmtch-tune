import { useEffect, useState } from "react";
import {
  portalAdminCargarCreditos,
  portalAdminCrearCuenta,
  portalAdminListCuentas,
  portalAdminListFiles,
  portalAdminMovimientos,
  portalAdminUpdateFile,
  portalAdminUploadMod,
} from "../services/portalApi";

const estados = [
  "RECIBIDO",
  "EN_REVISION",
  "EN_PROCESO",
  "MOD_LISTO",
  "CORRECCION_SOLICITADA",
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

function PortalAdminPage() {
  const [cuentas, setCuentas] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [ediciones, setEdiciones] = useState({});
  const [mods, setMods] = useState({});
  const [cuentaMovimiento, setCuentaMovimiento] = useState("");
  const [nuevaCuenta, setNuevaCuenta] = useState({
    nombre_taller: "",
    contacto: "",
    email: "",
    telefono: "",
    observaciones: "",
    usuario_nombre: "",
    usuario_email: "",
    usuario_password: "",
  });
  const [credito, setCredito] = useState({
    cuentaId: "",
    monto: "",
    referencia: "",
    observacion: "",
  });

  const cargar = async () => {
    try {
      setError("");
      setCargando(true);
      const [cuentasData, filesData] = await Promise.all([
        portalAdminListCuentas(),
        portalAdminListFiles(),
      ]);
      setCuentas(Array.isArray(cuentasData) ? cuentasData : []);
      setArchivos(Array.isArray(filesData) ? filesData : []);
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

  const actualizarNuevaCuenta = (campo, valor) => {
    setNuevaCuenta((actual) => ({ ...actual, [campo]: valor }));
  };

  const crearCuenta = async (event) => {
    event.preventDefault();
    setError("");
    setMensaje("");

    if (
      !nuevaCuenta.nombre_taller ||
      !nuevaCuenta.usuario_nombre ||
      !nuevaCuenta.usuario_email ||
      !nuevaCuenta.usuario_password
    ) {
      setError("Debes completar taller y primer usuario externo.");
      return;
    }

    try {
      await portalAdminCrearCuenta(nuevaCuenta);
      setMensaje("Cuenta portal creada correctamente.");
      setNuevaCuenta({
        nombre_taller: "",
        contacto: "",
        email: "",
        telefono: "",
        observaciones: "",
        usuario_nombre: "",
        usuario_email: "",
        usuario_password: "",
      });
      await cargar();
    } catch (err) {
      setError(err.message || "No se pudo crear la cuenta.");
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

  return (
    <main className="space-y-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
          OWNER
        </p>
        <h1 className="text-4xl font-black uppercase text-black">
          Portal externo File Service
        </h1>
        <p className="mt-2 text-xs font-bold uppercase text-gray-500">
          Administración de cuentas, créditos y solicitudes externas.
        </p>
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
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input className={inputClass} placeholder="Nombre taller" value={nuevaCuenta.nombre_taller} onChange={(e) => actualizarNuevaCuenta("nombre_taller", e.target.value)} />
            <input className={inputClass} placeholder="Contacto" value={nuevaCuenta.contacto} onChange={(e) => actualizarNuevaCuenta("contacto", e.target.value)} />
            <input className={inputClass} placeholder="Email cuenta" value={nuevaCuenta.email} onChange={(e) => actualizarNuevaCuenta("email", e.target.value)} />
            <input className={inputClass} placeholder="Teléfono" value={nuevaCuenta.telefono} onChange={(e) => actualizarNuevaCuenta("telefono", e.target.value)} />
            <input className={inputClass} placeholder="Nombre usuario" value={nuevaCuenta.usuario_nombre} onChange={(e) => actualizarNuevaCuenta("usuario_nombre", e.target.value)} />
            <input className={inputClass} placeholder="Email usuario" value={nuevaCuenta.usuario_email} onChange={(e) => actualizarNuevaCuenta("usuario_email", e.target.value)} />
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
          <h2 className="text-sm font-black uppercase">Cuentas externas</h2>
          <button type="button" onClick={cargar} disabled={cargando} className="border-2 border-black px-4 py-2 text-xs font-black uppercase disabled:opacity-50">
            {cargando ? "Cargando..." : "Actualizar"}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cuentas.map((cuenta) => (
            <article key={cuenta.id} className="border-2 border-black p-4">
              <p className="text-sm font-black uppercase">{cuenta.nombre_taller}</p>
              <p className="text-xs font-bold text-gray-500">{cuenta.email || cuenta.contacto || "Sin contacto"}</p>
              <p className="mt-2 text-xs font-black uppercase">Saldo: {cuenta.saldo_creditos}</p>
              <p className="text-xs font-bold uppercase text-gray-500">
                {cuenta.activo ? "Activa" : "Inactiva"} / {cuenta.aprobado ? "Aprobada" : "Pendiente"}
              </p>
              <button type="button" onClick={() => verMovimientos(cuenta.id)} className="mt-3 border-2 border-black px-3 py-2 text-[10px] font-black uppercase">
                Ver movimientos
              </button>
            </article>
          ))}
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

      <section className="border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-sm font-black uppercase">Solicitudes externas</h2>
        <div className="mt-4 space-y-4">
          {archivos.map((archivo) => {
            const edit = ediciones[archivo.id] || {};
            return (
              <article key={archivo.id} className="border-2 border-black p-4">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
                  <div>
                    <p className="text-sm font-black uppercase">File #{archivo.id} - {archivo.tipo_servicio}</p>
                    <p className="text-xs font-bold text-gray-500">
                      {archivo.Cuenta?.nombre_taller || "Cuenta no registrada"} / {archivo.Usuario?.email || "Usuario no registrado"}
                    </p>
                    <p className="mt-2 text-xs font-bold text-gray-500">
                      {archivo.marca_vehiculo} {archivo.modelo_vehiculo} {archivo.anio_vehiculo}
                    </p>
                    <p className="mt-2 text-xs font-black uppercase">
                      Original: {archivo.nombre_original || "No registrado"} / MOD: {archivo.nombre_modificado || "Pendiente"}
                    </p>
                    {archivo.observacion_correccion && (
                      <p className="mt-2 text-xs font-bold text-red-700">
                        Corrección: {archivo.observacion_correccion}
                      </p>
                    )}
                  </div>

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
