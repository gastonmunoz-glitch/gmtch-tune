import { useEffect, useRef, useState } from "react";
import api from "../services/api";

const ESTADO_ORDEN_INICIAL = "RECEPCIONADO";
const ESTADO_ORDEN_FINAL_RECEPCION = "PARA_DIAGNOSTICO";

const ESTADO_INICIAL_CLIENTE = {
  nombre: "",
  telefono: "",
};

const ESTADO_INICIAL_VEHICULO = {
  patente: "",
  marca: "",
  modelo: "",
  anio: "",
  vin: "",
};

const ESTADO_INICIAL_ORDEN = {
  kilometraje: "",
  servicio_solicitado: "",
  sintomas_cliente: "",
  observaciones_visuales: "",
  prioridad: "MEDIA",
  requiere_scanner: true,
  requiere_lectura_ecu: true,
  requiere_mecanica: false,
  monto_total: "",
};

const leerStorage = (clave) => {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
};

const escribirStorage = (clave, valor) => {
  try {
    localStorage.setItem(clave, String(valor));
  } catch {
    // Evita errores si el navegador bloquea localStorage
  }
};

const borrarStorage = (clave) => {
  try {
    localStorage.removeItem(clave);
  } catch {
    // Evita errores si el navegador bloquea localStorage
  }
};

const calcularPasoInicial = () => {
  const clienteGuardado = leerStorage("gmtch_clienteId");
  const vehiculoGuardado = leerStorage("gmtch_vehiculoId");
  const ordenGuardada = leerStorage("gmtch_ordenId");
  const pasoGuardado = Number(leerStorage("gmtch_paso_recepcion") || "1");

  let pasoSeguro = pasoGuardado;

  if (!clienteGuardado && pasoSeguro > 1) pasoSeguro = 1;
  if (clienteGuardado && !vehiculoGuardado && pasoSeguro > 2) pasoSeguro = 2;
  if (vehiculoGuardado && !ordenGuardada && pasoSeguro > 4) pasoSeguro = 3;

  if (!pasoSeguro || pasoSeguro < 1 || pasoSeguro > 5) pasoSeguro = 1;

  return pasoSeguro;
};

function RecepcionRapidaPage() {
  const fotosInputRef = useRef(null);

  const [paso, setPaso] = useState(() => calcularPasoInicial());
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const [cliente, setCliente] = useState({ ...ESTADO_INICIAL_CLIENTE });
  const [clienteId, setClienteId] = useState(() => leerStorage("gmtch_clienteId"));

  const [vehiculo, setVehiculo] = useState({ ...ESTADO_INICIAL_VEHICULO });
  const [vehiculoId, setVehiculoId] = useState(() => leerStorage("gmtch_vehiculoId"));

  const [orden, setOrden] = useState({ ...ESTADO_INICIAL_ORDEN });
  const [ordenId, setOrdenId] = useState(() => leerStorage("gmtch_ordenId"));

  const [fotosArchivos, setFotosArchivos] = useState([]);

  const etiquetas = ["Cliente", "Vehículo", "Servicio", "Fotos", "Cierre"];

  useEffect(() => {
    escribirStorage("gmtch_paso_recepcion", paso);
  }, [paso]);

  const mostrarAviso = (tipo, mensaje) => {
    setAviso({ tipo, mensaje });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const limpiarAviso = () => {
    setAviso(null);
  };

  const siguiente = () => {
    limpiarAviso();
    setPaso((p) => Math.min(5, p + 1));
  };

  const anterior = () => {
    limpiarAviso();
    setPaso((p) => Math.max(1, p - 1));
  };

  const limpiarNumero = (valor) => {
    return String(valor ?? "")
      .replace(/\./g, "")
      .replace(/,/g, "")
      .trim();
  };

  const idParaBackend = (id) => {
    if (id === null || id === undefined || id === "") return null;

    const texto = String(id);

    if (/^\d+$/.test(texto)) {
      return Number(texto);
    }

    return texto;
  };

  const obtenerClienteId = (data) => {
    return (
      data?.id ??
      data?._id ??
      data?.clienteId ??
      data?.cliente_id ??
      data?.cliente?.id ??
      data?.data?.id ??
      data?.data?._id ??
      null
    );
  };

  const obtenerVehiculoId = (data) => {
    return (
      data?.id ??
      data?._id ??
      data?.vehiculoId ??
      data?.vehiculo_id ??
      data?.vehiculo?.id ??
      data?.data?.id ??
      data?.data?._id ??
      null
    );
  };

  const obtenerOrdenId = (data) => {
    return (
      data?.id ??
      data?._id ??
      data?.ordenId ??
      data?.orden_id ??
      data?.orden?.id ??
      data?.data?.id ??
      data?.data?._id ??
      null
    );
  };

  const obtenerOrdenActual = () => {
    return ordenId || leerStorage("gmtch_ordenId") || null;
  };

  const mensajeErrorAmigable = (err, entidad) => {
    const status = err.response?.status;
    const data = err.response?.data;
    const mensaje = String(
      data?.error || data?.message || err.message || "Error desconocido"
    );

    const texto = mensaje.toLowerCase();

    if (
      status === 409 ||
      texto.includes("duplicate") ||
      texto.includes("unique") ||
      texto.includes("ya existe") ||
      texto.includes("registrado") ||
      texto.includes("validation error")
    ) {
      return `${entidad} ya existe o hay un dato duplicado en la base. Revisa si ya fue registrado antes.`;
    }

    return mensaje;
  };

  const guardarCliente = async () => {
    const nombre = String(cliente.nombre ?? "").trim();
    const telefono = String(cliente.telefono ?? "").trim();

    if (!nombre) {
      mostrarAviso("error", "Debe ingresar nombre del cliente.");
      return;
    }

    try {
      setCargando(true);
      limpiarAviso();

      const payload = {
        nombre,
        telefono,
      };

      const res = await api.post("/clientes", payload);
      console.log("CLIENTE CREADO:", res.data);

      const nuevoClienteId = obtenerClienteId(res.data);

      if (!nuevoClienteId) {
        mostrarAviso("error", "Cliente guardado, pero el backend no devolvió el ID.");
        console.error("Respuesta sin ID de cliente:", res.data);
        return;
      }

      setClienteId(nuevoClienteId);
      escribirStorage("gmtch_clienteId", nuevoClienteId);

      mostrarAviso("ok", "Cliente guardado correctamente. Continúa con el vehículo.");
      setPaso(2);
    } catch (err) {
      console.error("ERROR AL GUARDAR CLIENTE:", err.response?.data || err.message);
      mostrarAviso("error", mensajeErrorAmigable(err, "Cliente"));
    } finally {
      setCargando(false);
    }
  };

  const guardarVehiculo = async () => {
    const idClienteActual = clienteId || leerStorage("gmtch_clienteId");

    const patente = String(vehiculo.patente ?? "").trim().toUpperCase();
    const marca = String(vehiculo.marca ?? "").trim();
    const modelo = String(vehiculo.modelo ?? "").trim();
    const anio = String(vehiculo.anio ?? "").trim();
    const vin = String(vehiculo.vin ?? "").trim();

    if (!idClienteActual) {
      mostrarAviso("error", "Falta cliente del paso 1.");
      return;
    }

    if (!patente || !marca || !modelo) {
      mostrarAviso("error", "Debe completar Patente, Marca y Modelo.");
      return;
    }

    try {
      setCargando(true);
      limpiarAviso();

      const payload = {
        patente,
        marca,
        modelo,
        anio: anio ? Number(anio) : null,
        vin: vin || null,
        clienteId: idParaBackend(idClienteActual),
        cliente_id: idParaBackend(idClienteActual),
      };

      const res = await api.post("/vehiculos", payload);
      console.log("VEHÍCULO CREADO:", res.data);

      const nuevoVehiculoId = obtenerVehiculoId(res.data);

      if (!nuevoVehiculoId) {
        mostrarAviso("error", "Vehículo guardado, pero el backend no devolvió el ID.");
        console.error("Respuesta sin ID de vehículo:", res.data);
        return;
      }

      setVehiculoId(nuevoVehiculoId);
      escribirStorage("gmtch_vehiculoId", nuevoVehiculoId);

      mostrarAviso("ok", "Vehículo guardado correctamente. Continúa con servicio y síntomas.");
      setPaso(3);
    } catch (err) {
      console.error("ERROR AL GUARDAR VEHÍCULO:", err.response?.data || err.message);
      mostrarAviso("error", mensajeErrorAmigable(err, "Vehículo"));
    } finally {
      setCargando(false);
    }
  };

  const construirMotivoIngreso = () => {
    const servicioSolicitado = String(orden.servicio_solicitado ?? "").trim();
    const sintomasCliente = String(orden.sintomas_cliente ?? "").trim();
    const observacionesVisuales = String(orden.observaciones_visuales ?? "").trim();

    return [
      "=== RECEPCIÓN GMTCH TUNE ===",
      `Servicio solicitado: ${servicioSolicitado || "No informado"}`,
      "",
      "Síntomas indicados por cliente:",
      sintomasCliente || "No informado",
      "",
      "Observaciones visibles de recepción:",
      observacionesVisuales || "Sin observaciones visibles registradas",
      "",
      "Requerimientos iniciales marcados por recepción:",
      `- Requiere scanner/diagnóstico: ${orden.requiere_scanner ? "SÍ" : "NO"}`,
      `- Requiere lectura ECU: ${orden.requiere_lectura_ecu ? "SÍ" : "NO"}`,
      `- Requiere mecánica: ${orden.requiere_mecanica ? "SÍ" : "NO"}`,
      "",
      "Nota de flujo:",
      "Recepción no decide método de lectura ECU. El técnico ECU define si corresponde OBD, BENCH, BOOT o retiro de ECU. El mecánico solo ejecuta instrucciones asignadas por plataforma.",
    ].join("\n");
  };

  const guardarOrden = async () => {
    const idVehiculoActual = vehiculoId || leerStorage("gmtch_vehiculoId");

    const kilometraje = limpiarNumero(orden.kilometraje);
    const servicioSolicitado = String(orden.servicio_solicitado ?? "").trim();
    const sintomasCliente = String(orden.sintomas_cliente ?? "").trim();
    const montoTotal = limpiarNumero(orden.monto_total);

    if (!idVehiculoActual) {
      mostrarAviso("error", "Falta vehículo.");
      return;
    }

    if (!kilometraje || !servicioSolicitado || !sintomasCliente || !montoTotal) {
      mostrarAviso("error", "Complete kilometraje, servicio solicitado, síntomas y monto.");
      return;
    }

    try {
      setCargando(true);
      limpiarAviso();

      const payload = {
        vehiculoId: idParaBackend(idVehiculoActual),
        vehiculo_id: idParaBackend(idVehiculoActual),
        prioridad: orden.prioridad || "MEDIA",
        kilometraje: Number(kilometraje),
        motivo_ingreso: construirMotivoIngreso(),
        monto_total: Number(montoTotal),
        estado: ESTADO_ORDEN_INICIAL,
      };

      console.log("ENVIANDO ORDEN:", payload);

      const res = await api.post("/ordenes", payload);
      console.log("ORDEN CREADA:", res.data);

      const nuevaOrdenId = obtenerOrdenId(res.data);

      if (!nuevaOrdenId) {
        mostrarAviso("error", "La orden se guardó, pero no se recibió el ID.");
        console.error("Respuesta sin ID de orden:", res.data);
        return;
      }

      setOrdenId(nuevaOrdenId);
      escribirStorage("gmtch_ordenId", nuevaOrdenId);

      mostrarAviso("ok", "Orden creada correctamente. Continúa con las fotos de respaldo.");
      setPaso(4);
    } catch (err) {
      console.error("ERROR AL GUARDAR ORDEN:", err.response?.data || err.message);
      mostrarAviso("error", mensajeErrorAmigable(err, "Orden"));
    } finally {
      setCargando(false);
    }
  };

  const subirFotosSeleccionadas = async () => {
    const idOrdenActual = obtenerOrdenActual();

    if (!idOrdenActual) {
      mostrarAviso("error", "Falta orden. Vuelve al paso 3 y guarda la orden nuevamente.");
      return false;
    }

    if (!fotosArchivos.length) {
      return true;
    }

    for (const foto of fotosArchivos) {
      const fd = new FormData();
      fd.append("foto", foto);
      fd.append("ordenId", String(idOrdenActual));
      fd.append("orden_id", String(idOrdenActual));

      await api.post("/fotos", fd);
    }

    console.log("FOTOS SUBIDAS:", fotosArchivos.length);
    return true;
  };

  const actualizarOrdenAParaDiagnostico = async () => {
    const idOrdenActual = obtenerOrdenActual();

    if (!idOrdenActual) {
      return false;
    }

    const payload = {
      estado: ESTADO_ORDEN_FINAL_RECEPCION,
    };

    try {
      await api.put(`/ordenes/${idOrdenActual}`, payload);
      return true;
    } catch (errorPut) {
      console.warn(
        "No se pudo actualizar por PUT, intentando PATCH:",
        errorPut.response?.data || errorPut.message
      );

      try {
        await api.patch(`/ordenes/${idOrdenActual}`, payload);
        return true;
      } catch (errorPatch) {
        console.warn(
          "No se pudo actualizar estado por PATCH:",
          errorPatch.response?.data || errorPatch.message
        );
        return false;
      }
    }
  };

  const finalizarRecepcion = async () => {
    const idOrdenActual = obtenerOrdenActual();

    if (!idOrdenActual) {
      mostrarAviso("error", "No hay orden activa para finalizar.");
      return;
    }

    if (!fotosArchivos.length) {
      const continuar = window.confirm(
        "No hay fotos seleccionadas. Lo recomendado es subir respaldo exterior e interior. ¿Deseas finalizar sin fotos?"
      );

      if (!continuar) {
        return;
      }
    }

    try {
      setCargando(true);
      limpiarAviso();

      await subirFotosSeleccionadas();

      const estadoActualizado = await actualizarOrdenAParaDiagnostico();

      if (estadoActualizado) {
        alert("Recepción finalizada. La orden quedó lista para diagnóstico.");
      } else {
        alert(
          "Recepción guardada. No se pudo mover automáticamente a diagnóstico, pero la orden quedó registrada."
        );
      }

      limpiarFlujo();
    } catch (err) {
      console.error("ERROR AL FINALIZAR RECEPCIÓN:", err.response?.data || err.message);
      mostrarAviso("error", mensajeErrorAmigable(err, "Recepción"));
    } finally {
      setCargando(false);
    }
  };

  const limpiarFlujo = () => {
    setPaso(1);
    setAviso(null);

    setCliente({ ...ESTADO_INICIAL_CLIENTE });
    setClienteId(null);

    setVehiculo({ ...ESTADO_INICIAL_VEHICULO });
    setVehiculoId(null);

    setOrden({ ...ESTADO_INICIAL_ORDEN });
    setOrdenId(null);

    setFotosArchivos([]);

    borrarStorage("gmtch_clienteId");
    borrarStorage("gmtch_vehiculoId");
    borrarStorage("gmtch_ordenId");
    borrarStorage("gmtch_paso_recepcion");
  };

  const abrirSelectorFotos = () => {
    fotosInputRef.current?.click();
  };

  const renderAviso = () => {
    if (!aviso) return null;

    const estilos =
      aviso.tipo === "ok"
        ? "bg-green-100 border-green-600 text-green-900"
        : "bg-red-100 border-red-600 text-red-900";

    return (
      <div className={`mb-6 border-4 p-4 font-black uppercase text-xs ${estilos}`}>
        {aviso.mensaje}
      </div>
    );
  };

  const renderPaso = () => {
    switch (paso) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="font-black text-lg uppercase">1. Cliente</h2>
              <p className="text-xs font-bold text-gray-500 uppercase">
                Datos mínimos para iniciar la orden.
              </p>
            </div>

            <input
              className="border border-black p-3 w-full"
              placeholder="Nombre cliente"
              value={cliente.nombre ?? ""}
              onChange={(e) =>
                setCliente((prev) => ({
                  ...prev,
                  nombre: e.target.value ?? "",
                }))
              }
            />

            <input
              className="border border-black p-3 w-full"
              placeholder="Teléfono / WhatsApp"
              value={cliente.telefono ?? ""}
              onChange={(e) =>
                setCliente((prev) => ({
                  ...prev,
                  telefono: e.target.value ?? "",
                }))
              }
            />

            <button
              type="button"
              onClick={guardarCliente}
              disabled={cargando}
              className="bg-black text-white px-6 py-3 font-black uppercase text-xs disabled:bg-gray-400"
            >
              {cargando ? "Guardando..." : "Guardar Cliente y Continuar →"}
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="font-black text-lg uppercase">2. Vehículo</h2>
              <p className="text-xs font-bold text-gray-500 uppercase">
                Identificación de la unidad ingresada.
              </p>
            </div>

            <input
              className="border border-black p-3 w-full"
              placeholder="Patente"
              value={vehiculo.patente ?? ""}
              onChange={(e) =>
                setVehiculo((prev) => ({
                  ...prev,
                  patente: e.target.value.toUpperCase(),
                }))
              }
            />

            <input
              className="border border-black p-3 w-full"
              placeholder="Marca"
              value={vehiculo.marca ?? ""}
              onChange={(e) =>
                setVehiculo((prev) => ({
                  ...prev,
                  marca: e.target.value ?? "",
                }))
              }
            />

            <input
              className="border border-black p-3 w-full"
              placeholder="Modelo"
              value={vehiculo.modelo ?? ""}
              onChange={(e) =>
                setVehiculo((prev) => ({
                  ...prev,
                  modelo: e.target.value ?? "",
                }))
              }
            />

            <input
              className="border border-black p-3 w-full"
              placeholder="Año"
              value={vehiculo.anio ?? ""}
              onChange={(e) =>
                setVehiculo((prev) => ({
                  ...prev,
                  anio: e.target.value ?? "",
                }))
              }
            />

            <input
              className="border border-black p-3 w-full"
              placeholder="VIN"
              value={vehiculo.vin ?? ""}
              onChange={(e) =>
                setVehiculo((prev) => ({
                  ...prev,
                  vin: e.target.value ?? "",
                }))
              }
            />

            <div className="flex justify-between gap-4">
              <button
                type="button"
                onClick={anterior}
                className="text-xs uppercase font-bold"
              >
                ← Volver
              </button>

              <button
                type="button"
                onClick={guardarVehiculo}
                disabled={cargando}
                className="bg-black text-white px-6 py-3 font-black uppercase text-xs disabled:bg-gray-400"
              >
                {cargando ? "Guardando..." : "Guardar Vehículo y Continuar →"}
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="font-black text-lg uppercase">3. Servicio / Síntomas</h2>
              <p className="text-xs font-bold text-gray-500 uppercase">
                Recepción registra lo que informa el cliente y lo visible. No diagnostica ECU.
              </p>
            </div>

            <input
              className="border border-black p-3 w-full"
              placeholder="Kilometraje"
              type="number"
              value={orden.kilometraje ?? ""}
              onChange={(e) =>
                setOrden((prev) => ({
                  ...prev,
                  kilometraje: e.target.value ?? "",
                }))
              }
            />

            <select
              className="border border-black p-3 w-full bg-white font-bold"
              value={orden.prioridad ?? "MEDIA"}
              onChange={(e) =>
                setOrden((prev) => ({
                  ...prev,
                  prioridad: e.target.value,
                }))
              }
            >
              <option value="BAJA">Prioridad baja</option>
              <option value="MEDIA">Prioridad media</option>
              <option value="ALTA">Prioridad alta</option>
              <option value="URGENTE">Urgente</option>
            </select>

            <textarea
              className="border border-black p-3 w-full"
              placeholder="Servicio solicitado por el cliente. Ej: DPF Off, diagnóstico, EGR, AdBlue, Stage 1, lectura ECU, etc."
              value={orden.servicio_solicitado ?? ""}
              onChange={(e) =>
                setOrden((prev) => ({
                  ...prev,
                  servicio_solicitado: e.target.value ?? "",
                }))
              }
            />

            <textarea
              className="border border-black p-3 w-full"
              placeholder="Síntomas indicados por el cliente. Ej: pierde fuerza, humo, testigo motor, regeneraciones constantes, no parte, etc."
              value={orden.sintomas_cliente ?? ""}
              onChange={(e) =>
                setOrden((prev) => ({
                  ...prev,
                  sintomas_cliente: e.target.value ?? "",
                }))
              }
            />

            <textarea
              className="border border-black p-3 w-full"
              placeholder="Observaciones visibles de recepción. Ej: golpes, rayas, testigos encendidos, nivel combustible, accesorios, estado interior."
              value={orden.observaciones_visuales ?? ""}
              onChange={(e) =>
                setOrden((prev) => ({
                  ...prev,
                  observaciones_visuales: e.target.value ?? "",
                }))
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-xs font-black uppercase border border-black p-3">
                <input
                  type="checkbox"
                  checked={Boolean(orden.requiere_scanner)}
                  onChange={(e) =>
                    setOrden((prev) => ({
                      ...prev,
                      requiere_scanner: e.target.checked,
                    }))
                  }
                />
                Requiere Scanner
              </label>

              <label className="flex items-center gap-2 text-xs font-black uppercase border border-black p-3">
                <input
                  type="checkbox"
                  checked={Boolean(orden.requiere_lectura_ecu)}
                  onChange={(e) =>
                    setOrden((prev) => ({
                      ...prev,
                      requiere_lectura_ecu: e.target.checked,
                    }))
                  }
                />
                Requiere Lectura ECU
              </label>

              <label className="flex items-center gap-2 text-xs font-black uppercase border border-black p-3">
                <input
                  type="checkbox"
                  checked={Boolean(orden.requiere_mecanica)}
                  onChange={(e) =>
                    setOrden((prev) => ({
                      ...prev,
                      requiere_mecanica: e.target.checked,
                    }))
                  }
                />
                Requiere Mecánica
              </label>
            </div>

            <input
              className="border border-black p-3 w-full"
              placeholder="Monto estimado o total ($)"
              value={orden.monto_total ?? ""}
              onChange={(e) =>
                setOrden((prev) => ({
                  ...prev,
                  monto_total: e.target.value ?? "",
                }))
              }
            />

            <div className="bg-yellow-50 border-2 border-yellow-500 p-4 text-xs font-bold uppercase leading-relaxed">
              El mecánico no decide si se retira la ECU. Esa decisión queda para el técnico ECU /
              operador de lectura según método OBD, BENCH, BOOT o retiro.
            </div>

            <div className="flex justify-between gap-4">
              <button
                type="button"
                onClick={anterior}
                className="text-xs uppercase font-bold"
              >
                ← Volver
              </button>

              <button
                type="button"
                onClick={guardarOrden}
                disabled={cargando}
                className="bg-black text-white px-6 py-3 font-black uppercase text-xs disabled:bg-gray-400"
              >
                {cargando ? "Guardando..." : "Guardar Orden y Continuar →"}
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <div>
              <h2 className="font-black text-lg uppercase">4. Fotos de Ingreso</h2>
              <p className="text-xs font-bold text-gray-500 uppercase">
                Respaldo visual del estado del vehículo al momento de recepción.
              </p>
            </div>

            <div className="border border-black p-3 text-xs font-bold uppercase bg-gray-50">
              Orden actual: {obtenerOrdenActual() || "No detectada"}
            </div>

            <div className="bg-blue-50 border-4 border-blue-600 p-5">
              <h3 className="text-sm font-black uppercase mb-3">
                Guía rápida de fotos recomendadas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold uppercase">
                <div className="bg-white border border-black p-3">✅ Frente completo</div>
                <div className="bg-white border border-black p-3">✅ Parte trasera completa</div>
                <div className="bg-white border border-black p-3">✅ Lateral izquierdo</div>
                <div className="bg-white border border-black p-3">✅ Lateral derecho</div>
                <div className="bg-white border border-black p-3">✅ Tablero con KM</div>
                <div className="bg-white border border-black p-3">✅ Testigos encendidos</div>
                <div className="bg-white border border-black p-3">✅ Rayones, golpes o detalles</div>
                <div className="bg-white border border-black p-3">✅ Motor / zona ECU si aplica</div>
              </div>

              <p className="text-[11px] font-bold uppercase mt-4 leading-relaxed">
                Estas fotos sirven como respaldo si el cliente reclama golpes, rayones,
                daños previos o diferencias al momento de entrega.
              </p>
            </div>

            <input
              ref={fotosInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => setFotosArchivos(Array.from(e.target.files || []))}
            />

            <button
              type="button"
              onClick={abrirSelectorFotos}
              className="w-full bg-black text-white border-4 border-black py-5 px-6 font-black uppercase text-sm hover:bg-blue-600 transition"
            >
              📸 Seleccionar Fotos de Recepción
            </button>

            <div className="bg-slate-50 border-4 border-black p-4">
              <p className="text-xs font-black uppercase">
                Fotos seleccionadas: {fotosArchivos.length}
              </p>

              {fotosArchivos.length > 0 && (
                <ul className="mt-3 space-y-1 text-[11px] font-bold text-gray-600">
                  {fotosArchivos.map((foto, index) => (
                    <li key={`${foto.name}-${index}`}>• {foto.name}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-between gap-4">
              <button
                type="button"
                onClick={anterior}
                className="text-xs uppercase font-bold"
              >
                ← Volver
              </button>

              <button
                type="button"
                onClick={siguiente}
                className="bg-black text-white px-6 py-3 font-black uppercase text-xs"
              >
                Continuar a Cierre →
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="font-black text-lg uppercase">5. Cierre de Recepción</h2>
              <p className="text-xs font-bold text-gray-500 uppercase">
                Al finalizar, la orden queda en cola para diagnóstico.
              </p>
            </div>

            <div className="bg-slate-50 border-4 border-black p-5 space-y-3 text-xs font-bold uppercase">
              <p>Cliente ID: {clienteId || "—"}</p>
              <p>Vehículo ID: {vehiculoId || "—"}</p>
              <p>Orden ID: {ordenId || leerStorage("gmtch_ordenId") || "—"}</p>
              <p>Estado actual: {ESTADO_ORDEN_INICIAL}</p>
              <p>Estado siguiente: {ESTADO_ORDEN_FINAL_RECEPCION}</p>
              <p>Fotos pendientes de subir: {fotosArchivos.length}</p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-600 p-4 text-xs font-bold uppercase leading-relaxed">
              Siguiente etapa: operador de diagnóstico/scanner. Luego el técnico ECU define el
              método de lectura y si corresponde desmontaje. Mecánica solo ejecuta trabajos
              asignados por plataforma.
            </div>

            <div className="flex justify-between gap-4">
              <button
                type="button"
                onClick={anterior}
                className="text-xs uppercase font-bold"
              >
                ← Volver
              </button>

              <button
                type="button"
                onClick={finalizarRecepcion}
                disabled={cargando}
                className="bg-green-600 text-white px-6 py-3 font-black uppercase text-xs disabled:bg-gray-400"
              >
                {cargando ? "Finalizando..." : "Finalizar Recepción"}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] p-6">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">
          Recepción Operativa
        </h1>
        <p className="text-xs font-black uppercase text-gray-500 mt-2">
          Ingreso inicial. Scanner, lectura ECU y mecánica se asignan después.
        </p>
      </div>

      {renderAviso()}

      <div className="flex justify-between mb-8 gap-2">
        {etiquetas.map((label, idx) => {
          const numero = idx + 1;
          const activo = numero === paso;
          const completo = numero < paso;

          return (
            <div key={label} className="flex-1 flex flex-col items-center text-center">
              <div
                className={`w-8 h-8 flex items-center justify-center rounded-full border-2 font-black text-xs
                  ${
                    activo
                      ? "bg-black text-white border-black"
                      : completo
                      ? "bg-green-500 text-white border-black"
                      : "bg-white text-black border-gray-400"
                  }
                `}
              >
                {numero}
              </div>

              <p className="mt-1 text-[9px] md:text-[10px] font-black uppercase">
                {label}
              </p>
            </div>
          );
        })}
      </div>

      {renderPaso()}

      <div className="mt-8 pt-4 border-t border-black flex flex-col md:flex-row justify-between gap-4 md:items-center">
        <div className="text-[10px] uppercase font-bold text-gray-500">
          Cliente ID: {clienteId || "—"} | Vehículo ID: {vehiculoId || "—"} | Orden ID:{" "}
          {ordenId || leerStorage("gmtch_ordenId") || "—"}
        </div>

        <button
          type="button"
          onClick={limpiarFlujo}
          className="text-[10px] uppercase font-black border border-black px-3 py-2"
        >
          Limpiar flujo
        </button>
      </div>
    </div>
  );
}

export default RecepcionRapidaPage;