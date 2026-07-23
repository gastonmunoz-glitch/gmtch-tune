const { after, before, describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");

process.env.NODE_ENV = "test";

const rutaModelos = require.resolve("../src/models");
const rutaEmpresaService = require.resolve("../src/services/empresaCuentaService");
require.cache[rutaModelos] = {
  id: rutaModelos,
  filename: rutaModelos,
  loaded: true,
  exports: { Usuario: {}, EmpresaCuenta: {} },
};
require.cache[rutaEmpresaService] = {
  id: rutaEmpresaService,
  filename: rutaEmpresaService,
  loaded: true,
  exports: { asegurarEmpresaPrincipalGmtch: async () => null },
};

const { autenticar } = require("../src/middleware/authMiddleware");
const {
  bloquearUploadsPublicos,
} = require("../src/middleware/bloquearUploadsPublicos");

const app = express();
app.use(bloquearUploadsPublicos);
app.get(
  "/api/archivos-ecu/:id/descargar/:tipo",
  autenticar,
  (_req, res) => res.sendStatus(204)
);
app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

let servidor;
let origen;

before(async () => {
  await new Promise((resolve, reject) => {
    servidor = app.listen(0, "127.0.0.1", resolve);
    servidor.once("error", reject);
  });
  const direccion = servidor.address();
  origen = `http://127.0.0.1:${direccion.port}`;
});

after(async () => {
  if (!servidor) return;
  await new Promise((resolve, reject) =>
    servidor.close((error) => (error ? reject(error) : resolve()))
  );
});

describe("limite HTTP de archivos privados", () => {
  test("la antigua ruta publica /uploads ya no entrega archivos", async () => {
    const response = await fetch(`${origen}/uploads/ecu/no-debe-ser-publico.bin`);

    assert.equal(response.status, 404);
    assert.equal(response.headers.get("content-disposition"), null);

    const mixedCase = await fetch(`${origen}/UPLOADS/ecu/no-publico.bin`);
    assert.equal(mixedCase.status, 404);
  });

  test("un endpoint privado sin autenticacion responde 401", async () => {
    const response = await fetch(
      `${origen}/api/archivos-ecu/1/descargar/original`
    );

    assert.equal(response.status, 401);
  });

  test("server.js monta el bloqueo y no publica express.static en /uploads", () => {
    const codigo = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

    assert.match(codigo, /app\.use\(bloquearUploadsPublicos\)/);
    assert.doesNotMatch(
      codigo,
      /app\.use\(\s*["']\/uploads["'][\s\S]{0,160}express\.static/
    );
  });
});
