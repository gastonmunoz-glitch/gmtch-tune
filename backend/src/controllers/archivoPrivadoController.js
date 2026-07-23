const {
  ArchivoECU,
  Cliente,
  ComprobantePago,
  Diagnostico,
  FotoVehiculo,
  OrdenTrabajo,
  Vehiculo,
} = require("../models");
const {
  ArchivoPrivadoNoDisponibleError,
  RAICES_ARCHIVOS_PRIVADOS,
  entregarArchivoPrivado,
  extensionSegura,
} = require("../services/archivoPrivadoService");

const ROLES_JEFATURA = new Set(["OWNER", "ADMIN", "SUPERVISOR"]);
const ROLES_COMPROBANTES = new Set(["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"]);

const numeroPositivo = (valor) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
};

const texto = (valor) => String(valor || "").trim();
const mismoId = (izquierda, derecha) =>
  Boolean(texto(izquierda)) && texto(izquierda) === texto(derecha);

const empresaAutenticada = (req, res) => {
  const empresaId = texto(req.auth?.empresaId);
  if (empresaId) return empresaId;

  res.status(503).json({
    error: "EMPRESA_NO_DISPONIBLE",
    codigo: "EMPRESA_NO_DISPONIBLE",
    message: "La empresa autenticada no esta disponible para descargar archivos.",
  });
  return null;
};

const responderNoDisponible = (res) =>
  res.status(404).json({
    error: "ARCHIVO_NO_DISPONIBLE",
    codigo: "ARCHIVO_NO_DISPONIBLE",
    message: "El archivo solicitado no esta disponible.",
  });

const responderSinPermiso = (res) =>
  res.status(403).json({
    error: "DESCARGA_NO_AUTORIZADA",
    codigo: "DESCARGA_NO_AUTORIZADA",
    message: "No tienes permiso para descargar este tipo de archivo.",
  });

const camposOrdenPermisos = [
  "id",
  "empresaId",
  "vehiculoId",
  "recepcionado_por_id",
  "diagnostico_asignado_a_id",
  "operador_ecu_asignado_a_id",
  "mecanico_asignado_a_id",
  "supervisor_asignado_a_id",
];

const puedeDescargarEcu = (req, archivo, orden) => {
  const rol = texto(req.auth?.rol || req.usuario?.rol).toUpperCase();
  if (ROLES_JEFATURA.has(rol)) return true;

  const usuarioId = texto(req.auth?.usuarioId || req.usuario?.id);
  if (!usuarioId) return false;

  if (rol === "TUNER") {
    return (
      mismoId(archivo.tuner_asignado_a_id, usuarioId) ||
      mismoId(archivo.slave_asignado_a_id, usuarioId)
    );
  }

  if (rol === "OPERADOR_ECU") {
    return (
      mismoId(archivo.operador_ecu_asignado_a_id, usuarioId) ||
      mismoId(archivo.slave_asignado_a_id, usuarioId) ||
      mismoId(orden.operador_ecu_asignado_a_id, usuarioId)
    );
  }

  return false;
};

const puedeDescargarFoto = (req, orden) => {
  const rol = texto(req.auth?.rol || req.usuario?.rol).toUpperCase();
  if (ROLES_JEFATURA.has(rol) || rol === "RECEPCION") return true;

  const usuarioId = texto(req.auth?.usuarioId || req.usuario?.id);
  if (!usuarioId) return false;

  if (rol === "OPERADOR_SCANNER") {
    return mismoId(orden.diagnostico_asignado_a_id, usuarioId);
  }
  if (rol === "OPERADOR_ECU") {
    return mismoId(orden.operador_ecu_asignado_a_id, usuarioId);
  }
  if (rol === "MECANICO") {
    return mismoId(orden.mecanico_asignado_a_id, usuarioId);
  }

  return false;
};

const puedeDescargarScanner = (req, orden) => {
  const rol = texto(req.auth?.rol || req.usuario?.rol).toUpperCase();
  if (ROLES_JEFATURA.has(rol)) return true;

  const usuarioId = texto(req.auth?.usuarioId || req.usuario?.id);
  if (!usuarioId) return false;

  if (rol === "OPERADOR_SCANNER") {
    return mismoId(orden.diagnostico_asignado_a_id, usuarioId);
  }
  if (rol === "OPERADOR_ECU") {
    return mismoId(orden.operador_ecu_asignado_a_id, usuarioId);
  }
  if (rol === "MECANICO") {
    return mismoId(orden.mecanico_asignado_a_id, usuarioId);
  }

  return false;
};

const crearArchivoPrivadoController = ({
  modelos = {
    ArchivoECU,
    Cliente,
    ComprobantePago,
    Diagnostico,
    FotoVehiculo,
    OrdenTrabajo,
    Vehiculo,
  },
  entregar = entregarArchivoPrivado,
  raices = RAICES_ARCHIVOS_PRIVADOS,
} = {}) => {
  const obtenerOrdenTenant = async (id, empresaId) => {
    const orden = await modelos.OrdenTrabajo.findOne({
      where: { id, empresaId },
      attributes: camposOrdenPermisos,
    });
    if (!orden) return null;

    const vehiculo = await modelos.Vehiculo.findOne({
      where: { id: orden.vehiculoId, empresaId },
      attributes: ["id", "empresaId", "clienteId"],
    });
    if (!vehiculo) return null;

    const cliente = await modelos.Cliente.findOne({
      where: { id: vehiculo.clienteId, empresaId },
      attributes: ["id", "empresaId"],
    });
    if (!cliente) return null;

    return { orden, vehiculo, cliente };
  };

  const manejarErrorEntrega = (error, res) => {
    if (res.headersSent) {
      if (!res.writableEnded) res.end();
      return undefined;
    }

    if (error instanceof ArchivoPrivadoNoDisponibleError) {
      return responderNoDisponible(res);
    }

    return res.status(500).json({
      error: "ERROR_DESCARGA_ARCHIVO",
      codigo: "ERROR_DESCARGA_ARCHIVO",
      message: "No se pudo completar la descarga.",
    });
  };

  const cargarArchivoEcuTenant = async (req, res) => {
    const empresaId = empresaAutenticada(req, res);
    const id = numeroPositivo(req.params.id);
    if (!empresaId) return null;
    if (!id) {
      responderNoDisponible(res);
      return null;
    }

    const archivo = await modelos.ArchivoECU.findOne({
      where: { id, empresaId },
      attributes: [
        "id",
        "empresaId",
        "ordenId",
        "archivo_original",
        "archivo_modificado",
        "versiones_modificadas",
        "procesamiento_externo_archivo_resultado",
        "procesamiento_externo_archivos",
        "post_escritura_scanner",
        "tuner_asignado_a_id",
        "operador_ecu_asignado_a_id",
        "slave_asignado_a_id",
      ],
    });

    if (!archivo) {
      responderNoDisponible(res);
      return null;
    }

    const relacion = await obtenerOrdenTenant(archivo.ordenId, empresaId);
    if (!relacion) {
      responderNoDisponible(res);
      return null;
    }

    if (!puedeDescargarEcu(req, archivo, relacion.orden)) {
      responderSinPermiso(res);
      return null;
    }

    return { archivo, ...relacion };
  };

  const descargarArchivoEcu = async (req, res) => {
    try {
      const contexto = await cargarArchivoEcuTenant(req, res);
      if (!contexto) return undefined;

      const { archivo } = contexto;
      const tipos = {
        original: {
          ruta: archivo.archivo_original,
          nombre: `archivo-ecu-${archivo.id}-original${extensionSegura(archivo.archivo_original)}`,
        },
        mod: {
          ruta: archivo.archivo_modificado,
          nombre: `archivo-ecu-${archivo.id}-mod${extensionSegura(archivo.archivo_modificado)}`,
        },
        "post-scan": {
          ruta: archivo.post_escritura_scanner,
          nombre: `archivo-ecu-${archivo.id}-post-scan${extensionSegura(
            archivo.post_escritura_scanner
          )}`,
        },
        "resultado-externo": {
          ruta: archivo.procesamiento_externo_archivo_resultado,
          nombre: `archivo-ecu-${archivo.id}-resultado-externo${extensionSegura(
            archivo.procesamiento_externo_archivo_resultado
          )}`,
        },
      };
      const seleccionado = tipos[texto(req.params.tipo).toLowerCase()];
      if (!seleccionado?.ruta) return responderNoDisponible(res);

      return await entregar(res, {
        rutaAlmacenada: seleccionado.ruta,
        raizPermitida: raices.ecu,
        categoria: "ecu",
        nombreDescarga: seleccionado.nombre,
      });
    } catch (error) {
      return manejarErrorEntrega(error, res);
    }
  };

  const descargarVersionEcu = async (req, res) => {
    try {
      const contexto = await cargarArchivoEcuTenant(req, res);
      if (!contexto) return undefined;

      const versionBuscada = numeroPositivo(req.params.version);
      const versiones = Array.isArray(contexto.archivo.versiones_modificadas)
        ? contexto.archivo.versiones_modificadas
        : [];
      const version = versiones.find(
        (item) => Number(item?.version) === versionBuscada && texto(item?.archivo)
      );
      if (!version) return responderNoDisponible(res);

      return await entregar(res, {
        rutaAlmacenada: version.archivo,
        raizPermitida: raices.ecu,
        categoria: "ecu",
        nombreDescarga:
          version.nombre_archivo ||
          `archivo-ecu-${contexto.archivo.id}-mod-v${versionBuscada}${extensionSegura(
            version.archivo
          )}`,
      });
    } catch (error) {
      return manejarErrorEntrega(error, res);
    }
  };

  const descargarProcesamientoExterno = async (req, res) => {
    try {
      const contexto = await cargarArchivoEcuTenant(req, res);
      if (!contexto) return undefined;

      const indice = Number(req.params.indice);
      const eventos = Array.isArray(contexto.archivo.procesamiento_externo_archivos)
        ? contexto.archivo.procesamiento_externo_archivos
        : [];
      const evento = Number.isInteger(indice) && indice >= 0 ? eventos[indice] : null;
      if (!texto(evento?.archivo)) return responderNoDisponible(res);

      return await entregar(res, {
        rutaAlmacenada: evento.archivo,
        raizPermitida: raices.ecu,
        categoria: "ecu",
        nombreDescarga: `archivo-ecu-${contexto.archivo.id}-externo-${indice + 1}${extensionSegura(
          evento.archivo
        )}`,
      });
    } catch (error) {
      return manejarErrorEntrega(error, res);
    }
  };

  const descargarFoto = async (req, res) => {
    try {
      const empresaId = empresaAutenticada(req, res);
      const id = numeroPositivo(req.params.id);
      if (!empresaId) return undefined;
      if (!id) return responderNoDisponible(res);

      const foto = await modelos.FotoVehiculo.findOne({
        where: { id, empresaId },
        attributes: ["id", "empresaId", "ordenId", "url_foto", "nombre_archivo"],
      });
      if (!foto) return responderNoDisponible(res);

      const relacion = await obtenerOrdenTenant(foto.ordenId, empresaId);
      if (!relacion) return responderNoDisponible(res);
      if (!puedeDescargarFoto(req, relacion.orden)) return responderSinPermiso(res);

      return await entregar(res, {
        rutaAlmacenada: foto.url_foto,
        raizPermitida: raices.fotos,
        categoria: "imagen",
        nombreDescarga:
          foto.nombre_archivo ||
          `foto-${foto.id}${extensionSegura(foto.url_foto)}`,
      });
    } catch (error) {
      return manejarErrorEntrega(error, res);
    }
  };

  const descargarScannerDiagnostico = async (req, res) => {
    try {
      const empresaId = empresaAutenticada(req, res);
      const id = numeroPositivo(req.params.id);
      if (!empresaId) return undefined;
      if (!id) return responderNoDisponible(res);

      const diagnostico = await modelos.Diagnostico.findOne({
        where: { id, empresaId },
        attributes: ["id", "empresaId", "ordenId", "foto_scanner", "informe_scanner"],
      });
      if (!diagnostico) return responderNoDisponible(res);

      const relacion = await obtenerOrdenTenant(diagnostico.ordenId, empresaId);
      if (!relacion) return responderNoDisponible(res);
      if (!puedeDescargarScanner(req, relacion.orden)) return responderSinPermiso(res);

      const ruta = texto(diagnostico.foto_scanner) || texto(diagnostico.informe_scanner);
      if (!ruta) return responderNoDisponible(res);

      return await entregar(res, {
        rutaAlmacenada: ruta,
        raizPermitida: raices.scanner,
        categoria: "imagen",
        nombreDescarga: `scanner-diagnostico-${diagnostico.id}${extensionSegura(ruta)}`,
      });
    } catch (error) {
      return manejarErrorEntrega(error, res);
    }
  };

  const descargarComprobante = async (req, res) => {
    try {
      const empresaId = empresaAutenticada(req, res);
      const id = numeroPositivo(req.params.id);
      if (!empresaId) return undefined;
      if (!id) return responderNoDisponible(res);

      const rol = texto(req.auth?.rol || req.usuario?.rol).toUpperCase();
      if (!ROLES_COMPROBANTES.has(rol)) return responderSinPermiso(res);

      const comprobante = await modelos.ComprobantePago.findOne({
        where: { id },
        attributes: [
          "id",
          "ordenId",
          "clienteId",
          "archivo_comprobante_path",
          "archivo_comprobante_nombre",
        ],
      });
      if (!comprobante?.archivo_comprobante_path) return responderNoDisponible(res);

      const tieneOrden = Boolean(numeroPositivo(comprobante.ordenId));
      const tieneCliente = Boolean(numeroPositivo(comprobante.clienteId));
      if (!tieneOrden && !tieneCliente) return responderNoDisponible(res);

      const relacionOrden = tieneOrden
        ? await obtenerOrdenTenant(Number(comprobante.ordenId), empresaId)
        : null;
      const cliente = tieneCliente
        ? await modelos.Cliente.findOne({
            where: { id: Number(comprobante.clienteId), empresaId },
            attributes: ["id", "empresaId"],
          })
        : null;

      if ((tieneOrden && !relacionOrden) || (tieneCliente && !cliente)) {
        return responderNoDisponible(res);
      }

      if (relacionOrden && cliente && !mismoId(relacionOrden.cliente.id, cliente.id)) {
        return responderNoDisponible(res);
      }

      return await entregar(res, {
        rutaAlmacenada: comprobante.archivo_comprobante_path,
        raizPermitida: raices.comprobantes,
        categoria: "comprobante",
        nombreDescarga:
          comprobante.archivo_comprobante_nombre ||
          `comprobante-${comprobante.id}${extensionSegura(
            comprobante.archivo_comprobante_path
          )}`,
      });
    } catch (error) {
      return manejarErrorEntrega(error, res);
    }
  };

  return {
    descargarArchivoEcu,
    descargarComprobante,
    descargarFoto,
    descargarProcesamientoExterno,
    descargarScannerDiagnostico,
    descargarVersionEcu,
  };
};

const controladores = crearArchivoPrivadoController();

module.exports = {
  ...controladores,
  crearArchivoPrivadoController,
  puedeDescargarEcu,
  puedeDescargarFoto,
  puedeDescargarScanner,
};
