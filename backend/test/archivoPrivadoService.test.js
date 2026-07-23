const { afterEach, describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  ArchivoPrivadoNoDisponibleError,
  contentDispositionSeguro,
  esRutaConMetadatosPrivados,
  mimeControlado,
  nombreDescargaSeguro,
  resolverArchivoRegular,
  resolverRutaDentroDeRaiz,
  sanitizarMetadatosArchivo,
} = require("../src/services/archivoPrivadoService");

const temporales = [];

const crearTemporal = () => {
  const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "gmtch-privado-"));
  temporales.push(directorio);
  return directorio;
};

afterEach(() => {
  while (temporales.length > 0) {
    fs.rmSync(temporales.pop(), { recursive: true, force: true });
  }
});

describe("archivoPrivadoService", () => {
  test("resuelve un archivo regular que esta dentro de la raiz autorizada", async () => {
    const raiz = crearTemporal();
    const archivo = path.join(raiz, "original.bin");
    fs.writeFileSync(archivo, Buffer.from([0x01, 0x02, 0x03]));

    assert.equal(await resolverArchivoRegular(archivo, raiz), fs.realpathSync(archivo));
  });

  test("rechaza traversal, URLs y archivos fuera de la raiz", async () => {
    const base = crearTemporal();
    const raiz = path.join(base, "permitidos");
    const fuera = path.join(base, "secreto.bin");
    fs.mkdirSync(raiz);
    fs.writeFileSync(fuera, "secreto");

    assert.throws(
      () => resolverRutaDentroDeRaiz(path.join(raiz, "..", "secreto.bin"), raiz),
      ArchivoPrivadoNoDisponibleError
    );
    assert.throws(
      () => resolverRutaDentroDeRaiz("https://ejemplo.invalid/archivo.bin", raiz),
      ArchivoPrivadoNoDisponibleError
    );
    await assert.rejects(
      resolverArchivoRegular(path.join(raiz, "no-existe.bin"), raiz),
      ArchivoPrivadoNoDisponibleError
    );
  });

  test("genera Content-Disposition sin inyeccion de headers ni separadores", () => {
    const nombre = 'carpeta\\archivo\r\nX-Prueba: inyectado".bin';
    const seguro = nombreDescargaSeguro(nombre);
    const header = contentDispositionSeguro(nombre);

    assert.equal(/[\r\n]/.test(seguro), false);
    assert.equal(/[\r\n]/.test(header), false);
    assert.equal(header.startsWith("attachment;"), true);
    assert.equal(header.includes("X-Prueba:"), false);
    assert.equal(header.includes("carpeta"), false);
  });

  test("un nombre HTML nunca obtiene un Content-Type ejecutable", () => {
    assert.equal(mimeControlado("ecu", "payload.html"), "application/octet-stream");
    assert.equal(mimeControlado("imagen", "payload.html"), "application/octet-stream");
    assert.equal(mimeControlado("comprobante", "documento.pdf"), "application/pdf");
  });

  test("reemplaza localizadores privados por indicadores de disponibilidad", () => {
    const seguro = sanitizarMetadatosArchivo({
      archivo_original: "C:\\privado\\original.bin",
      archivo_original_actual: "C:\\privado\\portal-original.bin",
      foto_scanner: "/uploads/scanner/captura.png",
      archivo_comprobante_path: "C:\\privado\\comprobante.pdf",
      versiones_modificadas: [
        { version: 1, archivo: "/uploads/ecu/mod-v1.bin", nombre_archivo: "mod.bin" },
      ],
    });

    assert.equal(seguro.archivo_original, true);
    assert.equal(seguro.archivo_original_disponible, true);
    assert.equal(seguro.archivo_original_actual, true);
    assert.equal(seguro.foto_scanner, true);
    assert.equal(seguro.archivo_comprobante_path, undefined);
    assert.equal(seguro.archivo_comprobante_disponible, true);
    assert.equal(seguro.versiones_modificadas[0].archivo, true);
    assert.equal(seguro.versiones_modificadas[0].archivo_disponible, true);
    assert.equal(JSON.stringify(seguro).includes("/uploads/"), false);
    assert.equal(JSON.stringify(seguro).includes("C:\\\\privado"), false);
  });

  test("reconoce rutas operativas sin depender de mayusculas", () => {
    assert.equal(esRutaConMetadatosPrivados("/api/archivos-ecu/1"), true);
    assert.equal(esRutaConMetadatosPrivados("/API/ARCHIVOS-ECU/1"), true);
    assert.equal(esRutaConMetadatosPrivados("/api/Diagnosticos/1"), true);
    assert.equal(esRutaConMetadatosPrivados("/api/portal/files/1"), true);
    assert.equal(esRutaConMetadatosPrivados("/api/portal/admin/files/1"), true);
    assert.equal(esRutaConMetadatosPrivados("/api/portal/creditos"), false);
  });
});
