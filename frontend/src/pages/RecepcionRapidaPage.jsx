import { useEffect, useState } from "react";
import api from "../services/api";

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
  motivo_ingreso: "",
  monto_total: "",
};

const ESTADO_INICIAL_SCANNER = {
  fallas_detectadas: "",
  codigos_dtc: "",
};

const ESTADO_INICIAL_ECU = {
  marca_ecu: "",
  modelo_ecu: "",
  version_software: "",
  dpf_vaciado: false,
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
  if (vehiculoGuardado && !ordenGuardada && pasoSeguro > 3) pasoSeguro = 3;

  if (!pasoSeguro || pasoSeguro < 1 || pasoSeguro > 6) pasoSeguro = 1;

  return pasoSeguro;
};

function RecepcionRapidaPage() {
  const [paso, setPaso] = useState(() => calcularPasoInicial());

  const [cliente, setCliente] = useState({ ...ESTADO_INICIAL_CLIENTE });
  const [clienteId, setClienteId] = useState(() => leerStorage("gmtch_clienteId"));

  const [vehiculo, setVehiculo] = useState({ ...ESTADO_INICIAL_VEHICULO });
  const [vehiculoId, setVehiculoId] = useState(() => leerStorage("gmtch_vehiculoId"));

  const [orden, setOrden] = useState({ ...ESTADO_INICIAL_ORDEN });
  const [ordenId, setOrdenId] = useState(() => leerStorage("gmtch_ordenId"));

  const [fotoArchivo, setFotoArchivo] = useState(null);
  const [scanner, setScanner] = useState({ ...ESTADO_INICIAL_SCANNER });

  const [ecuOriginal, setEcuOriginal] = useState(null);
  const [ecuInfo, setEcuInfo] = useState({ ...ESTADO_INICIAL_ECU });

  const etiquetas = ["Cliente", "Vehículo", "Orden", "Fotos", "Scanner", "ECU"];

  useEffect(() => {
    escribirStorage("gmtch_paso_recepcion", paso);
  }, [paso]);

  const siguiente = () => {
    setPaso((p) => Math.min(6, p + 1));
  };

  const anterior = () => {
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

  const guardarCliente = async () => {
    const nombre = String(cliente.nombre ?? "").trim();
    const telefono = String(cliente.telefono ?? "").trim();

    if (!nombre) {
      alert("Debe ingresar nombre");
      return;
    }

    try {
      const payload = {
        nombre,
        telefono,
      };

      const res = await api.post("/clientes", payload);
      console.log("CLIENTE CREADO:", res.data);

      const nuevoClienteId = obtenerClienteId(res.data);

      if (!nuevoClienteId) {
        alert("Cliente guardado, pero el backend no devolvió el ID.");
        console.error("Respuesta sin ID de cliente:", res.data);
        return;
      }

      setClienteId(nuevoClienteId);
      escribirStorage("gmtch_clienteId", nuevoClienteId);

      siguiente();
    } catch (err) {
      console.error("ERROR AL GUARDAR CLIENTE:", err.response?.data || err.message);
      alert("Error al guardar cliente: " + (err.response?.data?.error || err.message));
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
      alert("Falta cliente del paso 1");
      return;
    }

    if (!patente || !marca || !modelo) {
      alert("Debe completar Patente, Marca y Modelo");
      return;
    }

    try {
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
        alert("Vehículo guardado, pero el backend no devolvió el ID.");
        console.error("Respuesta sin ID de vehículo:", res.data);
        return;
      }

      setVehiculoId(nuevoVehiculoId);
      escribirStorage("gmtch_vehiculoId", nuevoVehiculoId);

      siguiente();
    } catch (err) {
      console.error("ERROR AL GUARDAR VEHÍCULO:", err.response?.data || err.message);
      alert("Error al guardar vehículo: " + (err.response?.data?.error || err.message));
    }
  };

  const guardarOrden = async () => {
    const idVehiculoActual = vehiculoId || leerStorage("gmtch_vehiculoId");

    const kilometraje = limpiarNumero(orden.kilometraje);
    const motivoIngreso = String(orden.motivo_ingreso ?? "").trim();
    const montoTotal = limpiarNumero(orden.monto_total);

    if (!idVehiculoActual) {
      alert("Falta vehículo");
      return;
    }

    if (!kilometraje || !motivoIngreso || !montoTotal) {
      alert("Complete KM, trabajo y monto");
      return;
    }

    try {
      const payload = {
        vehiculoId: idParaBackend(idVehiculoActual),
        vehiculo_id: idParaBackend(idVehiculoActual),
        kilometraje: Number(kilometraje),
        motivo_ingreso: motivoIngreso,
        monto_total: Number(montoTotal),
        estado: "Recepción",
      };

      const res = await api.post("/ordenes", payload);
      console.log("ORDEN CREADA:", res.data);

      const nuevaOrdenId = obtenerOrdenId(res.data);

      if (!nuevaOrdenId) {
        alert("La orden se guardó, pero no se recibió el ID. Revisa la consola.");
        console.error("Respuesta sin ID de orden:", res.data);
        return;
      }

      setOrdenId(nuevaOrdenId);
      escribirStorage("gmtch_ordenId", nuevaOrdenId);

      siguiente();
    } catch (err) {
      console.error("ERROR AL GUARDAR ORDEN:", err.response?.data || err.message);
      alert("Error al guardar orden: " + (err.response?.data?.error || err.message));
    }
  };

  const guardarFoto = async () => {
    const idOrdenActual = obtenerOrdenActual();

    if (!idOrdenActual) {
      alert("Falta orden. Vuelve al paso 3 y guarda la orden nuevamente.");
      return;
    }

    if (!fotoArchivo) {
      alert("Seleccione foto");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("foto", fotoArchivo);
      fd.append("ordenId", String(idOrdenActual));
      fd.append("orden_id", String(idOrdenActual));

      const res = await api.post("/fotos", fd);
      console.log("FOTO SUBIDA:", res.data);

      setFotoArchivo(null);
      siguiente();
    } catch (err) {
      console.error("ERROR AL SUBIR FOTO:", err.response?.data || err.message);
      alert("Error al subir foto: " + (err.response?.data?.error || err.message));
    }
  };

  const guardarScanner = async () => {
    const idOrdenActual = obtenerOrdenActual();

    if (!idOrdenActual) {
      alert("Falta orden");
      return;
    }

    try {
      const payload = {
        ordenId: idParaBackend(idOrdenActual),
        orden_id: idParaBackend(idOrdenActual),
        fallas_detectadas: String(scanner.fallas_detectadas ?? "").trim(),
        codigos_dtc: String(scanner.codigos_dtc ?? "").trim(),
      };

      const res = await api.post("/diagnosticos", payload);
      console.log("SCANNER GUARDADO:", res.data);

      siguiente();
    } catch (err) {
      console.error("ERROR AL GUARDAR SCANNER:", err.response?.data || err.message);
      alert("Error al guardar diagnóstico: " + (err.response?.data?.error || err.message));
    }
  };

  const guardarECU = async () => {
    const idOrdenActual = obtenerOrdenActual();

    if (!idOrdenActual) {
      alert("Falta orden");
      return;
    }

    if (!ecuOriginal) {
      alert("Seleccione archivo ECU");
      return;
    }

    try {
      const fd = new FormData();

      fd.append("archivo", ecuOriginal);
      fd.append("ordenId", String(idOrdenActual));
      fd.append("orden_id", String(idOrdenActual));
      fd.append("marca_ecu", String(ecuInfo.marca_ecu ?? "").trim());
      fd.append("modelo_ecu", String(ecuInfo.modelo_ecu ?? "").trim());
      fd.append("version_software", String(ecuInfo.version_software ?? "").trim());
      fd.append("observaciones", ecuInfo.dpf_vaciado ? "DPF vaciado / anulado" : "");

      const res = await api.post("/archivos-ecu", fd);
      console.log("ECU GUARDADA:", res.data);

      alert("Flujo completo registrado correctamente");
      limpiarFlujo();
    } catch (err) {
      console.error("ERROR AL GUARDAR ECU:", err.response?.data || err.message);
      alert("Error al guardar ECU: " + (err.response?.data?.error || err.message));
    }
  };

  const limpiarFlujo = () => {
    setPaso(1);

    setCliente({ ...ESTADO_INICIAL_CLIENTE });
    setClienteId(null);

    setVehiculo({ ...ESTADO_INICIAL_VEHICULO });
    setVehiculoId(null);

    setOrden({ ...ESTADO_INICIAL_ORDEN });
    setOrdenId(null);

    setFotoArchivo(null);

    setScanner({ ...ESTADO_INICIAL_SCANNER });

    setEcuOriginal(null);
    setEcuInfo({ ...ESTADO_INICIAL_ECU });

    borrarStorage("gmtch_clienteId");
    borrarStorage("gmtch_vehiculoId");
    borrarStorage("gmtch_ordenId");
    borrarStorage("gmtch_paso_recepcion");
  };

  const renderPaso = () => {
    switch (paso) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="font-black text-lg uppercase">1. Cliente</h2>

            <input
              className="border border-black p-3 w-full"
              placeholder="Nombre"
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
              placeholder="Teléfono"
              value={cliente.telefono ?? ""}
              onChange={(e) =>
                setCliente((prev) => ({
                  ...prev,
                  telefono: e.target.value ?? "",
                }))
              }
            />

            <button
              onClick={guardarCliente}
              className="bg-black text-white px-6 py-3 font-black uppercase text-xs"
            >
              Guardar Cliente y Continuar →
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="font-black text-lg uppercase">2. Vehículo</h2>

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

            <div className="flex justify-between">
              <button onClick={anterior} className="text-xs uppercase font-bold">
                ← Volver
              </button>

              <button
                onClick={guardarVehiculo}
                className="bg-black text-white px-6 py-3 font-black uppercase text-xs"
              >
                Guardar Vehículo y Continuar →
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="font-black text-lg uppercase">3. Recepción / Orden</h2>

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

            <textarea
              className="border border-black p-3 w-full"
              placeholder="Trabajo a realizar"
              value={orden.motivo_ingreso ?? ""}
              onChange={(e) =>
                setOrden((prev) => ({
                  ...prev,
                  motivo_ingreso: e.target.value ?? "",
                }))
              }
            />

            <input
              className="border border-black p-3 w-full"
              placeholder="Monto ($)"
              value={orden.monto_total ?? ""}
              onChange={(e) =>
                setOrden((prev) => ({
                  ...prev,
                  monto_total: e.target.value ?? "",
                }))
              }
            />

            <div className="flex justify-between">
              <button onClick={anterior} className="text-xs uppercase font-bold">
                ← Volver
              </button>

              <button
                onClick={guardarOrden}
                className="bg-black text-white px-6 py-3 font-black uppercase text-xs"
              >
                Guardar Orden y Continuar →
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="font-black text-lg uppercase">4. Fotos de Ingreso</h2>

            <div className="border border-black p-3 text-xs font-bold uppercase bg-gray-50">
              Orden actual: {obtenerOrdenActual() || "No detectada"}
            </div>

            <input
              type="file"
              accept="image/*"
              className="w-full text-xs"
              onChange={(e) => setFotoArchivo(e.target.files?.[0] || null)}
            />

            <div className="flex justify-between">
              <button onClick={anterior} className="text-xs uppercase font-bold">
                ← Volver
              </button>

              <button
                onClick={guardarFoto}
                className="bg-black text-white px-6 py-3 font-black uppercase text-xs"
              >
                Subir Foto y Continuar →
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h2 className="font-black text-lg uppercase">5. Scanner / DTC</h2>

            <textarea
              className="border border-black p-3 w-full"
              placeholder="Fallas detectadas"
              value={scanner.fallas_detectadas ?? ""}
              onChange={(e) =>
                setScanner((prev) => ({
                  ...prev,
                  fallas_detectadas: e.target.value ?? "",
                }))
              }
            />

            <input
              className="border border-black p-3 w-full"
              placeholder="Códigos DTC (P0401, P2002...)"
              value={scanner.codigos_dtc ?? ""}
              onChange={(e) =>
                setScanner((prev) => ({
                  ...prev,
                  codigos_dtc: e.target.value ?? "",
                }))
              }
            />

            <div className="flex justify-between">
              <button onClick={anterior} className="text-xs uppercase font-bold">
                ← Volver
              </button>

              <button
                onClick={guardarScanner}
                className="bg-black text-white px-6 py-3 font-black uppercase text-xs"
              >
                Guardar Scanner y Continuar →
              </button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h2 className="font-black text-lg uppercase">6. ECU Original / DPF</h2>

            <input
              className="border border-black p-3 w-full"
              placeholder="Marca ECU"
              value={ecuInfo.marca_ecu ?? ""}
              onChange={(e) =>
                setEcuInfo((prev) => ({
                  ...prev,
                  marca_ecu: e.target.value ?? "",
                }))
              }
            />

            <input
              className="border border-black p-3 w-full"
              placeholder="Modelo ECU"
              value={ecuInfo.modelo_ecu ?? ""}
              onChange={(e) =>
                setEcuInfo((prev) => ({
                  ...prev,
                  modelo_ecu: e.target.value ?? "",
                }))
              }
            />

            <input
              className="border border-black p-3 w-full"
              placeholder="Versión SW"
              value={ecuInfo.version_software ?? ""}
              onChange={(e) =>
                setEcuInfo((prev) => ({
                  ...prev,
                  version_software: e.target.value ?? "",
                }))
              }
            />

            <label className="flex items-center gap-2 text-xs font-black uppercase">
              <input
                type="checkbox"
                checked={Boolean(ecuInfo.dpf_vaciado)}
                onChange={(e) =>
                  setEcuInfo((prev) => ({
                    ...prev,
                    dpf_vaciado: e.target.checked,
                  }))
                }
              />
              DPF vaciado / anulado
            </label>

            <input
              type="file"
              className="w-full text-xs"
              onChange={(e) => setEcuOriginal(e.target.files?.[0] || null)}
            />

            <div className="flex justify-between">
              <button onClick={anterior} className="text-xs uppercase font-bold">
                ← Volver
              </button>

              <button
                onClick={guardarECU}
                className="bg-black text-white px-6 py-3 font-black uppercase text-xs"
              >
                Finalizar Flujo
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white border-4 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] p-6">
      <div className="flex justify-between mb-8">
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

              <p className="mt-1 text-[10px] font-black uppercase">{label}</p>
            </div>
          );
        })}
      </div>

      {renderPaso()}

      <div className="mt-8 pt-4 border-t border-black flex justify-between items-center">
        <div className="text-[10px] uppercase font-bold text-gray-500">
          Cliente ID: {clienteId || "—"} | Vehículo ID: {vehiculoId || "—"} | Orden ID:{" "}
          {ordenId || leerStorage("gmtch_ordenId") || "—"}
        </div>

        <button
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