const fs = require("fs");
const path = require("path");

const BACKEND_ROOT = path.resolve(__dirname, "..", "..");
const UPLOADS_ROOT = path.resolve(__dirname, "..", "uploads");

const RAICES_ARCHIVOS_PRIVADOS = Object.freeze({
  ecu: path.join(UPLOADS_ROOT, "ecu"),
  fotos: path.join(UPLOADS_ROOT, "fotos"),
  scanner: path.join(UPLOADS_ROOT, "scanner"),
  comprobantes: path.join(UPLOADS_ROOT, "comprobantes"),
});

class ArchivoPrivadoNoDisponibleError extends Error {
  constructor() {
    super("ARCHIVO_NO_DISPONIBLE");
    this.name = "ArchivoPrivadoNoDisponibleError";
    this.codigo = "ARCHIVO_NO_DISPONIBLE";
  }
}

const crearErrorNoDisponible = () => new ArchivoPrivadoNoDisponibleError();

const estaDentroDeRaiz = (raiz, candidato) => {
  const relativa = path.relative(path.resolve(raiz), path.resolve(candidato));
  return (
    relativa === "" ||
    (!relativa.startsWith(`..${path.sep}`) &&
      relativa !== ".." &&
      !path.isAbsolute(relativa))
  );
};

const candidatosRutaAlmacenada = (rutaAlmacenada) => {
  const ruta = String(rutaAlmacenada || "").trim();
  if (!ruta || ruta.includes("\0") || /^[a-z][a-z0-9+.-]*:\/\//i.test(ruta)) {
    throw crearErrorNoDisponible();
  }

  const normalizada = ruta.replace(/\\/g, "/");

  if (normalizada.startsWith("/uploads/")) {
    return [path.resolve(UPLOADS_ROOT, normalizada.slice("/uploads/".length))];
  }

  if (path.isAbsolute(ruta)) {
    return [path.resolve(ruta)];
  }

  const sinPrefijoUploads = normalizada.replace(/^(?:backend\/)?src\/uploads\//i, "");

  return [
    path.resolve(BACKEND_ROOT, ruta),
    path.resolve(UPLOADS_ROOT, sinPrefijoUploads),
  ];
};

const resolverRutaDentroDeRaiz = (rutaAlmacenada, raizPermitida) => {
  const raiz = path.resolve(raizPermitida);
  const candidato = candidatosRutaAlmacenada(rutaAlmacenada).find((actual) =>
    estaDentroDeRaiz(raiz, actual)
  );

  if (!candidato) {
    throw crearErrorNoDisponible();
  }

  return candidato;
};

const resolverArchivoRegular = async (rutaAlmacenada, raizPermitida) => {
  const raiz = path.resolve(raizPermitida);
  const candidato = resolverRutaDentroDeRaiz(rutaAlmacenada, raiz);

  try {
    const [raizReal, candidatoReal] = await Promise.all([
      fs.promises.realpath(raiz),
      fs.promises.realpath(candidato),
    ]);

    if (!estaDentroDeRaiz(raizReal, candidatoReal)) {
      throw crearErrorNoDisponible();
    }

    const estadistica = await fs.promises.stat(candidatoReal);
    if (!estadistica.isFile()) {
      throw crearErrorNoDisponible();
    }

    return candidatoReal;
  } catch (error) {
    if (error instanceof ArchivoPrivadoNoDisponibleError) throw error;
    throw crearErrorNoDisponible();
  }
};

const nombreDescargaSeguro = (nombre, fallback = "archivo") => {
  const entradaMultiplataforma = String(nombre || fallback).replace(/\\/g, "/");
  const base = path.posix
    .basename(entradaMultiplataforma)
    .normalize("NFKC")
    .replace(/[\r\n\0-\x1f\x7f]/g, "")
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+$/, "");

  return (base || fallback).slice(0, 180);
};

const codificarNombreRFC5987 = (nombre) =>
  encodeURIComponent(nombre).replace(/[!'()*]/g, (caracter) =>
    `%${caracter.charCodeAt(0).toString(16).toUpperCase()}`
  );

const contentDispositionSeguro = (nombre) => {
  const seguro = nombreDescargaSeguro(nombre);
  const ascii = seguro.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${codificarNombreRFC5987(seguro)}`;
};

const mimeControlado = (categoria, nombre = "") => {
  if (categoria === "ecu") return "application/octet-stream";

  const extension = path.extname(String(nombre)).toLowerCase();
  const permitidos = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
  };

  return permitidos[extension] || "application/octet-stream";
};

const extensionSegura = (rutaAlmacenada) => {
  const extension = path.extname(String(rutaAlmacenada || "")).toLowerCase();
  return /^[.][a-z0-9]{1,10}$/.test(extension) ? extension : "";
};

const CAMPOS_LOCALIZADOR_PRIVADO = new Set([
  "archivo_original",
  "archivo_original_actual",
  "archivo_anterior",
  "archivo_modificado",
  "post_escritura_scanner",
  "procesamiento_externo_archivo_resultado",
  "foto_scanner",
  "informe_scanner",
  "url_foto",
]);

const esRutaConMetadatosPrivados = (ruta) =>
  /^\/api\/(?:archivos-ecu|diagnosticos|fotos|vehiculos|ordenes|finanzas|portal\/(?:files|admin))(?:\/|$)/i.test(
    String(ruta || "")
  );

const sanitizarMetadatosArchivo = (valor) => {
  if (valor === null || valor === undefined) return valor;
  if (valor instanceof Date || Buffer.isBuffer(valor)) return valor;
  if (Array.isArray(valor)) return valor.map(sanitizarMetadatosArchivo);
  if (typeof valor !== "object") return valor;

  const plano = typeof valor.toJSON === "function" ? valor.toJSON() : valor;
  const seguro = {};

  for (const [clave, contenido] of Object.entries(plano)) {
    if (clave === "archivo_comprobante_path") {
      seguro.archivo_comprobante_disponible = Boolean(contenido);
      continue;
    }

    if (CAMPOS_LOCALIZADOR_PRIVADO.has(clave)) {
      const disponible = Boolean(contenido);
      seguro[clave] = disponible;
      seguro[`${clave}_disponible`] = disponible;
      continue;
    }

    // Versiones MOD y eventos de procesamiento usan la clave generica
    // "archivo". Si contiene un locator, solo se expone su disponibilidad.
    if (clave === "archivo" && typeof contenido === "string") {
      seguro.archivo = Boolean(contenido);
      seguro.archivo_disponible = Boolean(contenido);
      continue;
    }

    seguro[clave] = sanitizarMetadatosArchivo(contenido);
  }

  return seguro;
};

const entregarArchivoPrivado = async (
  res,
  { rutaAlmacenada, raizPermitida, categoria, nombreDescarga }
) => {
  const ruta = await resolverArchivoRegular(rutaAlmacenada, raizPermitida);
  const nombre = nombreDescargaSeguro(nombreDescarga, "archivo");

  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  res.setHeader("Content-Type", mimeControlado(categoria, nombre));
  res.setHeader("Content-Disposition", contentDispositionSeguro(nombre));

  await new Promise((resolve, reject) => {
    res.sendFile(ruta, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
};

module.exports = {
  ArchivoPrivadoNoDisponibleError,
  RAICES_ARCHIVOS_PRIVADOS,
  contentDispositionSeguro,
  entregarArchivoPrivado,
  esRutaConMetadatosPrivados,
  estaDentroDeRaiz,
  extensionSegura,
  mimeControlado,
  nombreDescargaSeguro,
  resolverArchivoRegular,
  resolverRutaDentroDeRaiz,
  sanitizarMetadatosArchivo,
};
