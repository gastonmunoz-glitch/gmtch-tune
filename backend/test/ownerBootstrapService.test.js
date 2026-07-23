const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaDatabase = require.resolve("../src/config/database");
require.cache[rutaDatabase] = {
  id: rutaDatabase,
  filename: rutaDatabase,
  loaded: true,
  exports: {},
};

const {
  OwnerBootstrapConfigError,
  crearOwnerBootstrapService,
} = require("../src/services/ownerBootstrapService");

const crearDependencias = ({ owners = [], colisiones = [] } = {}) => {
  const consultas = [];
  const transaction = {
    finished: false,
    commits: 0,
    rollbacks: 0,
    async commit() {
      this.finished = "commit";
      this.commits += 1;
    },
    async rollback() {
      this.finished = "rollback";
      this.rollbacks += 1;
    },
  };
  const sequelizeImpl = {
    async transaction() {
      return transaction;
    },
    async query(sql, opciones = {}) {
      consultas.push({ sql, opciones });
      if (sql.includes(`WHERE "rol" = 'OWNER'`)) return owners;
      if (sql.includes("lower(btrim(\"username\"))")) return colisiones;
      return [];
    },
  };
  const bcryptImpl = {
    llamadas: [],
    async hash(password, costo) {
      this.llamadas.push({ password, costo });
      return "hash-no-real-para-prueba";
    },
  };
  const cryptoImpl = { randomUUID: () => "00000000-0000-4000-8000-000000000001" };
  const servicio = crearOwnerBootstrapService({
    sequelizeImpl,
    bcryptImpl,
    cryptoImpl,
    queryTypes: { SELECT: "SELECT" },
  });

  return { bcryptImpl, consultas, servicio, transaction };
};

describe("ownerBootstrapService", () => {
  test("un OWNER existente no exige credencial, no se modifica y confirma la transaccion", async () => {
    const deps = crearDependencias({ owners: [{ id: "owner-existente" }] });
    const env = {};
    Object.defineProperty(env, "OWNER_INITIAL_PASSWORD", {
      get() {
        throw new Error("No se debe leer la credencial");
      },
    });

    const resultado = await deps.servicio.asegurarOwnerInicial(
      { id: "empresa-a" },
      env
    );

    assert.deepEqual(resultado, { creado: false });
    assert.equal(deps.transaction.commits, 1);
    assert.equal(deps.transaction.rollbacks, 0);
    assert.equal(deps.bcryptImpl.llamadas.length, 0);
    assert.equal(deps.consultas.some(({ sql }) => sql.includes("INSERT INTO")), false);
    assert.equal(deps.consultas.some(({ sql }) => sql.includes("UPDATE")), false);
  });

  test("sin OWNER y sin configuracion opt-in falla cerrado", async () => {
    const deps = crearDependencias();

    await assert.rejects(
      deps.servicio.asegurarOwnerInicial({ id: "empresa-a" }, {}),
      (error) =>
        error instanceof OwnerBootstrapConfigError &&
        error.codigo === "OWNER_BOOTSTRAP_DESHABILITADO"
    );

    assert.equal(deps.transaction.commits, 0);
    assert.equal(deps.transaction.rollbacks, 1);
    assert.equal(deps.consultas.some(({ sql }) => sql.includes("INSERT INTO")), false);
  });

  test("rechaza una credencial debil sin calcular hash ni insertar", async () => {
    const deps = crearDependencias();

    await assert.rejects(
      deps.servicio.asegurarOwnerInicial(
        { id: "empresa-a" },
        {
          OWNER_BOOTSTRAP_ENABLED: "true",
          OWNER_INITIAL_USERNAME: "owner.inicial",
          OWNER_INITIAL_PASSWORD: "debil",
        }
      ),
      (error) =>
        error instanceof OwnerBootstrapConfigError &&
        error.codigo === "OWNER_BOOTSTRAP_CONFIG_INVALIDA"
    );

    assert.equal(deps.bcryptImpl.llamadas.length, 0);
    assert.equal(deps.consultas.some(({ sql }) => sql.includes("INSERT INTO")), false);
  });

  test("crea un OWNER tenant-bound con bind parameters y sin incluir el hash en SQL", async () => {
    const deps = crearDependencias();
    const password = "Clave-Muy-Fuerte-2026!";

    const resultado = await deps.servicio.asegurarOwnerInicial(
      { id: "empresa-a" },
      {
        OWNER_BOOTSTRAP_ENABLED: "true",
        OWNER_INITIAL_USERNAME: "owner.inicial",
        OWNER_INITIAL_PASSWORD: password,
      }
    );

    const insercion = deps.consultas.find(({ sql }) => sql.includes("INSERT INTO"));
    assert.deepEqual(resultado, { creado: true });
    assert.ok(insercion);
    assert.equal(insercion.sql.includes("hash-no-real-para-prueba"), false);
    assert.equal(insercion.opciones.replacements, undefined);
    assert.equal(insercion.opciones.bind.empresaId, "empresa-a");
    assert.equal(insercion.opciones.bind.passwordHash, "hash-no-real-para-prueba");
    assert.deepEqual(deps.bcryptImpl.llamadas, [{ password, costo: 10 }]);
    assert.equal(deps.transaction.commits, 1);
  });

  test("el codigo no contiene fallback para OWNER_INITIAL_PASSWORD", () => {
    const archivos = [
      path.join(__dirname, "..", "server.js"),
      path.join(__dirname, "..", "src", "services", "ownerBootstrapService.js"),
    ];
    const codigo = archivos.map((archivo) => fs.readFileSync(archivo, "utf8")).join("\n");

    assert.doesNotMatch(codigo, /OWNER_INITIAL_PASSWORD\s*\|\|\s*["'][^"']+/);
    assert.doesNotMatch(codigo, /passwordInicial\s*=.*\|\|/);
  });
});
