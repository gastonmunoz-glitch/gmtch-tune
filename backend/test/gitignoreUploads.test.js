const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repo = path.resolve(__dirname, "..", "..");

const estaIgnorado = (ruta) => {
  const resultado = spawnSync(
    "git",
    ["check-ignore", "--no-index", "--quiet", "--", ruta],
    { cwd: repo, encoding: "utf8" }
  );

  if (resultado.error) throw resultado.error;
  return resultado.status === 0;
};

describe("proteccion Git de uploads locales", () => {
  test("ignora archivos operativos en todos los destinos locales conocidos", () => {
    const sensibles = [
      "backend/src/portal_uploads/prueba-seguridad.ori",
      "backend/src/uploads/ecu/prueba-seguridad.bin",
      "backend/src/uploads/ecu_files/prueba-seguridad.bin",
      "backend/src/uploads/fotos/prueba-seguridad.jpg",
      "backend/src/uploads/scanner/prueba-seguridad.png",
      "backend/src/uploads/comprobantes/prueba-seguridad.pdf",
      "src/uploads/ecu_files/prueba-seguridad.bin",
    ];

    for (const ruta of sensibles) {
      assert.equal(estaIgnorado(ruta), true, `${ruta} debe estar ignorado`);
    }
  });

  test("permite unicamente los .gitkeep declarados", () => {
    assert.equal(estaIgnorado("backend/src/portal_uploads/.gitkeep"), false);
    assert.equal(estaIgnorado("backend/src/uploads/.gitkeep"), false);
    assert.equal(estaIgnorado("backend/src/uploads/fotos/.gitkeep"), false);
    assert.equal(
      estaIgnorado("backend/src/portal_uploads/.gitkeep/archivo-operativo.bin"),
      true
    );
  });

  test("un ECU temporal real no aparece en git status", () => {
    const relativo = `backend/src/uploads/ecu/codex-ignore-${process.pid}.bin`;
    const absoluto = path.join(repo, relativo);
    fs.writeFileSync(absoluto, Buffer.from([0x00, 0x01]));

    try {
      const resultado = spawnSync(
        "git",
        ["status", "--short", "--untracked-files=all", "--", relativo],
        { cwd: repo, encoding: "utf8" }
      );
      if (resultado.error) throw resultado.error;

      assert.equal(resultado.status, 0);
      assert.equal(resultado.stdout.trim(), "");
    } finally {
      fs.rmSync(absoluto, { force: true });
    }
  });
});
