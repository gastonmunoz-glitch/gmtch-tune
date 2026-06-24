#!/usr/bin/env node

const DEFAULT_API_BASE = "https://gmtch-tune-production.up.railway.app/api";

const rawApiBase = process.env.API_BASE || DEFAULT_API_BASE;
const API_BASE = rawApiBase.replace(/\/+$/, "");
const TOKEN = process.env.TOKEN;

const withoutApiSuffix = (base) => base.replace(/\/api\/?$/i, "");

const printTokenHelp = () => {
  console.log("Falta TOKEN para probar endpoints protegidos.\n");
  console.log("Como obtenerlo:");
  console.log("1. Entra a la app en el navegador.");
  console.log("2. Abre la consola del navegador.");
  console.log('3. Ejecuta: localStorage.getItem("token")');
  console.log("4. Copia el token sin compartirlo.");
  console.log("\nEjecuta en CMD:");
  console.log("cd /d C:\\gmtch-tune-app");
  console.log("set TOKEN=PEGAR_TOKEN_AQUI");
  console.log("node scripts/smoke-prod.js");
  console.log("\nOpcional:");
  console.log("set API_BASE=https://gmtch-tune-production.up.railway.app/api");
};

const redact = (value = "") => {
  if (!value) return "";
  if (value.length <= 12) return "[oculto]";
  return `${value.slice(0, 6)}...[oculto]...${value.slice(-4)}`;
};

const readBodySnippet = async (response) => {
  try {
    const text = await response.text();
    return text.slice(0, 220).replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
};

const request = async ({ name, url, protectedEndpoint = true }) => {
  const headers = {
    Accept: "application/json",
  };

  if (protectedEndpoint) {
    headers.Authorization = `Bearer ${TOKEN}`;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    const ok = response.ok;
    const detail = ok ? "" : await readBodySnippet(response);

    return {
      name,
      url,
      status: response.status,
      ok,
      detail,
    };
  } catch (error) {
    return {
      name,
      url,
      status: "RED",
      ok: false,
      detail: error.message,
    };
  }
};

const printResult = (result) => {
  const estado = result.ok ? "OK" : "FALLA";
  const status = String(result.status).padEnd(3, " ");
  console.log(`[${estado}] ${result.name} - HTTP ${status}`);

  if (!result.ok) {
    console.log(`       URL: ${result.url}`);
    console.log(`       Detalle: ${result.detail || "Sin detalle"}`);
  }
};

const main = async () => {
  console.log("GMTCH Tune OS - Smoke test produccion");
  console.log(`API_BASE: ${API_BASE}`);

  if (TOKEN) {
    console.log(`TOKEN: ${redact(TOKEN)}`);
  }

  if (!TOKEN) {
    printTokenHelp();
    process.exitCode = 1;
    return;
  }

  const appBase = withoutApiSuffix(API_BASE);

  const tests = [
    {
      name: "Health backend",
      url: `${appBase}/api/health`,
      protectedEndpoint: false,
    },
    {
      name: "Usuarios responsables",
      url: `${API_BASE}/usuarios/responsables`,
    },
    {
      name: "Ordenes",
      url: `${API_BASE}/ordenes`,
    },
    {
      name: "Archivos ECU",
      url: `${API_BASE}/archivos-ecu`,
    },
    {
      name: "Notificaciones",
      url: `${API_BASE}/notificaciones`,
    },
  ];

  const results = [];

  for (const test of tests) {
    const result = await request(test);
    results.push(result);
    printResult(result);
  }

  const total = results.length;
  const passed = results.filter((result) => result.ok).length;
  const failed = total - passed;

  console.log("\nResumen");
  console.log(`Total pruebas: ${total}`);
  console.log(`Pasadas: ${passed}`);
  console.log(`Fallidas: ${failed}`);

  process.exitCode = failed > 0 ? 1 : 0;
};

main();
