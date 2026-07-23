const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const rutaDatabase = require.resolve("../src/config/database");
const rutaModelos = require.resolve("../src/models");
require.cache[rutaDatabase] = {
  id: rutaDatabase,
  filename: rutaDatabase,
  loaded: true,
  exports: { query: async () => [] },
};
require.cache[rutaModelos] = {
  id: rutaModelos,
  filename: rutaModelos,
  loaded: true,
  exports: {
    Diagnostico: {
      create: async () => {
        throw new Error("No debe persistir una ruta entregada por el cliente");
      },
    },
    OrdenTrabajo: {
      findOne: async () => {
        throw new Error("Debe rechazar la ruta antes de consultar la orden");
      },
    },
  },
};

const {
  contieneRutaScannerCliente,
  crearDiagnostico,
} = require("../src/controllers/diagnosticoController");

const crearRespuesta = () => ({
  statusCode: 200,
  body: null,
  status(codigo) {
    this.statusCode = codigo;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

describe("entrada de evidencia scanner", () => {
  test("detecta ambos campos de ruta controlables por cliente", () => {
    assert.equal(contieneRutaScannerCliente({ informe_scanner: "/uploads/x" }), true);
    assert.equal(contieneRutaScannerCliente({ foto_scanner: "C:\\privado\\x" }), true);
    assert.equal(contieneRutaScannerCliente({ observaciones: "sin ruta" }), false);
  });

  test("crear diagnostico rechaza una ruta del body con 400", async () => {
    const res = crearRespuesta();
    const req = {
      auth: { empresaId: "empresa-a" },
      body: {
        ordenId: "10",
        informe_scanner: "/uploads/scanner/archivo-ajeno.png",
        sin_dtc: true,
        observaciones: "prueba",
      },
      file: null,
    };

    await crearDiagnostico(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.codigo, "RUTA_ARCHIVO_NO_PERMITIDA");
  });
});
