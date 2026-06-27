#!/usr/bin/env node

const DEFAULT_API_BASE = "https://api.gmtchtune.com/api";

const rawApiBase = process.env.API_BASE || DEFAULT_API_BASE;
const API_BASE = rawApiBase.replace(/\/+$/, "");
const TOKEN = process.env.TOKEN;

const withoutApiSuffix = (base) => base.replace(/\/api\/?$/i, "");

const printTokenHelp = () => {
  console.log("Falta TOKEN para probar endpoints protegidos.\n");
  console.log("Como obtenerlo:");
  console.log("1. Entra a https://gmtchtune.com/login");
  console.log("2. Inicia sesion con un usuario valido.");
  console.log("3. Abre la consola del navegador.");
  console.log('4. Ejecuta: localStorage.getItem("token")');
  console.log("5. Copia el token sin compartirlo.");
  console.log("\nEjecuta en CMD:");
  console.log("cd /d C:\\gmtch-tune-app");
  console.log("set TOKEN=PEGAR_TOKEN_AQUI");
  console.log("node scripts/smoke-prod.js");
  console.log("\nOpcional:");
  console.log("set API_BASE=https://api.gmtchtune.com/api");
};

const redact = (value = "") => {
  if (!value) return "";
  if (value.length <= 12) return "[oculto]";
  return `${value.slice(0, 6)}...[oculto]...${value.slice(-4)}`;
};

const readBodySnippet = async (response) => {
  try {
    const text = await response.text();
    return text.slice(0, 260).replace(/\s+/g, " ").trim();
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

const requestWithFallback = async ({ name, urls, protectedEndpoint = true }) => {
  const attempts = [];

  for (const url of urls) {
    const result = await request({ name, url, protectedEndpoint });
    attempts.push(result);
    if (result.ok) {
      return {
        ...result,
        attempts,
      };
    }
  }

  return {
    ...attempts[attempts.length - 1],
    attempts,
  };
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
  console.log("GMTCH Tune OS - Smoke test produccion V2");
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
      urls: [`${API_BASE}/health`, `${appBase}/api/health`, `${appBase}/health`],
      protectedEndpoint: false,
    },
    {
      name: "Usuarios responsables",
      urls: [`${API_BASE}/usuarios/responsables`],
    },
    {
      name: "Ordenes",
      urls: [`${API_BASE}/ordenes`],
    },
    {
      name: "Archivos ECU",
      urls: [`${API_BASE}/archivos-ecu`],
    },
    {
      name: "Notificaciones",
      urls: [`${API_BASE}/notificaciones`],
    },
    {
      name: "Bitacora operativa",
      urls: [`${API_BASE}/bitacora-operativa?resuelto=false&limit=5`],
    },
  ];

  const results = [];

  for (const test of tests) {
    const result = await requestWithFallback(test);
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

  if (failed > 0) {
    console.log("\nHay fallas. Revisar token, permisos, deploy backend y logs de Railway.");
  }

  process.exitCode = failed > 0 ? 1 : 0;
};

main();
