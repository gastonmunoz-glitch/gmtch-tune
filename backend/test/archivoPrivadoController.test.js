const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const rutaModelos = require.resolve("../src/models");
require.cache[rutaModelos] = {
  id: rutaModelos,
  filename: rutaModelos,
  loaded: true,
  exports: {},
};

const {
  crearArchivoPrivadoController,
} = require("../src/controllers/archivoPrivadoController");

const crearRespuesta = () => ({
  statusCode: 200,
  body: undefined,
  headersSent: false,
  writableEnded: false,
  status(codigo) {
    this.statusCode = codigo;
    return this;
  },
  json(payload) {
    this.body = payload;
    this.headersSent = true;
    this.writableEnded = true;
    return this;
  },
  end() {
    this.writableEnded = true;
  },
});

const crearEscenario = ({ empresaArchivo = "empresa-a", archivoExiste = true } = {}) => {
  const consultas = [];
  const entregas = [];
  const archivo = {
    id: 10,
    empresaId: empresaArchivo,
    ordenId: 20,
    archivo_original: "/uploads/ecu/original.bin",
    archivo_modificado: null,
    versiones_modificadas: [],
    procesamiento_externo_archivo_resultado: null,
    procesamiento_externo_archivos: [],
    post_escritura_scanner: null,
    tuner_asignado_a_id: "usuario-a",
    operador_ecu_asignado_a_id: null,
    slave_asignado_a_id: null,
  };

  const registrar = (modelo, resultado) => ({
    async findOne(opciones) {
      consultas.push({ modelo, opciones });
      return typeof resultado === "function" ? resultado(opciones) : resultado;
    },
  });

  const modelos = {
    ArchivoECU: registrar("ArchivoECU", ({ where }) =>
      archivoExiste && where.id === 10 && where.empresaId === empresaArchivo
        ? archivo
        : null
    ),
    OrdenTrabajo: registrar("OrdenTrabajo", ({ where }) =>
      where.id === 20 && where.empresaId === "empresa-a"
        ? {
            id: 20,
            empresaId: "empresa-a",
            vehiculoId: 30,
            operador_ecu_asignado_a_id: null,
          }
        : null
    ),
    Vehiculo: registrar("Vehiculo", ({ where }) =>
      where.id === 30 && where.empresaId === "empresa-a"
        ? { id: 30, empresaId: "empresa-a", clienteId: 40 }
        : null
    ),
    Cliente: registrar("Cliente", ({ where }) =>
      where.id === 40 && where.empresaId === "empresa-a"
        ? { id: 40, empresaId: "empresa-a" }
        : null
    ),
    ComprobantePago: registrar("ComprobantePago", null),
    Diagnostico: registrar("Diagnostico", null),
    FotoVehiculo: registrar("FotoVehiculo", null),
  };

  const controladores = crearArchivoPrivadoController({
    modelos,
    entregar: async (_res, opciones) => {
      entregas.push(opciones);
    },
    raices: {
      ecu: "C:\\raiz-segura\\ecu",
      fotos: "C:\\raiz-segura\\fotos",
      scanner: "C:\\raiz-segura\\scanner",
      comprobantes: "C:\\raiz-segura\\comprobantes",
    },
  });

  return { consultas, controladores, entregas };
};

const reqEcu = (sobrescribir = {}) => ({
  auth: { empresaId: "empresa-a", rol: "TUNER", usuarioId: "usuario-a" },
  usuario: { id: "usuario-a", rol: "TUNER" },
  params: { id: "10", tipo: "original" },
  body: { path: "C:\\fuera\\inyectado.bin", empresaId: "empresa-b" },
  query: { ruta: "../../inyectado.bin", empresaId: "empresa-b" },
  ...sobrescribir,
});

describe("archivoPrivadoController", () => {
  test("entrega el archivo propio al responsable autenticado y usa solo la ruta del registro", async () => {
    const escenario = crearEscenario();
    const res = crearRespuesta();

    await escenario.controladores.descargarArchivoEcu(reqEcu(), res);

    assert.equal(res.statusCode, 200);
    assert.equal(escenario.entregas.length, 1);
    assert.equal(
      escenario.entregas[0].rutaAlmacenada,
      "/uploads/ecu/original.bin"
    );
    assert.equal(escenario.consultas.length, 4);
    for (const consulta of escenario.consultas) {
      assert.equal(consulta.opciones.where.empresaId, "empresa-a");
    }
  });

  test("un recurso de otra empresa es indistinguible de un identificador inexistente", async () => {
    const cruzado = crearEscenario({ empresaArchivo: "empresa-b" });
    const inexistente = crearEscenario({ archivoExiste: false });
    const resCruzado = crearRespuesta();
    const resInexistente = crearRespuesta();

    await cruzado.controladores.descargarArchivoEcu(reqEcu(), resCruzado);
    await inexistente.controladores.descargarArchivoEcu(reqEcu(), resInexistente);

    assert.equal(resCruzado.statusCode, 404);
    assert.equal(resInexistente.statusCode, 404);
    assert.deepEqual(resCruzado.body, resInexistente.body);
    assert.equal(cruzado.entregas.length, 0);
    assert.equal(inexistente.entregas.length, 0);
  });

  test("falla cerrado si falta empresa autenticada", async () => {
    const escenario = crearEscenario();
    const res = crearRespuesta();
    const req = reqEcu({ auth: { rol: "OWNER", usuarioId: "usuario-a" } });

    await escenario.controladores.descargarArchivoEcu(req, res);

    assert.equal(res.statusCode, 503);
    assert.equal(res.body.codigo, "EMPRESA_NO_DISPONIBLE");
    assert.equal(escenario.consultas.length, 0);
    assert.equal(escenario.entregas.length, 0);
  });

  test("un rol operativo no asignado recibe 403 aunque el recurso sea de su empresa", async () => {
    const escenario = crearEscenario();
    const res = crearRespuesta();
    const req = reqEcu({
      auth: { empresaId: "empresa-a", rol: "TUNER", usuarioId: "otro-usuario" },
      usuario: { id: "otro-usuario", rol: "TUNER" },
    });

    await escenario.controladores.descargarArchivoEcu(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.codigo, "DESCARGA_NO_AUTORIZADA");
    assert.equal(escenario.entregas.length, 0);
  });

  test("un identificador invalido recibe 404 y nunca deja la conexion pendiente", async () => {
    const escenario = crearEscenario();
    const res = crearRespuesta();
    const req = reqEcu({ params: { id: "no-valido", tipo: "original" } });

    await escenario.controladores.descargarArchivoEcu(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.codigo, "ARCHIVO_NO_DISPONIBLE");
    assert.equal(escenario.consultas.length, 0);
    assert.equal(escenario.entregas.length, 0);
  });
});
