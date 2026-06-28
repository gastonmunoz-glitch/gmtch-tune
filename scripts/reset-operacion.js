#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const BACKEND_DIR = path.join(ROOT_DIR, "backend");
const CONFIRM_PHRASE = "RESET_GMTCH_PROD_LUNES";

try {
  const dotenv = require(path.join(BACKEND_DIR, "node_modules", "dotenv"));
  dotenv.config({ path: path.join(BACKEND_DIR, ".env") });
  dotenv.config({ path: path.join(ROOT_DIR, ".env") });
} catch {
  // Si dotenv no esta disponible, Sequelize usara variables ya presentes.
}

const sequelize = require("../backend/src/config/database");

const boolEnv = (name, defaultValue = false) => {
  const value = process.env[name];
  if (value === undefined || value === null || value === "") return defaultValue;
  return ["1", "true", "si", "yes", "on"].includes(String(value).toLowerCase());
};

const RESET_CONFIRM = process.env.RESET_CONFIRM || "";
const RESET_PORTAL_ACCOUNTS = boolEnv("RESET_PORTAL_ACCOUNTS", false);
const RESET_UPLOAD_FILES = boolEnv("RESET_UPLOAD_FILES", false);
const IS_CONFIRMED = RESET_CONFIRM === CONFIRM_PHRASE;
const IS_DRY_RUN = !IS_CONFIRMED;

const INTERNAL_TABLES = [
  "notificaciones",
  "bitacora_operativa",
  "comprobantes_pago",
  "movimientos_financieros",
  "fondo_reserva_movimientos",
  "cierres_semanales",
  "materiales_recuperados",
  "fotos_vehiculo",
  "diagnosticos",
  "archivos_ecu",
  "ordenes_trabajo",
  "vehiculos",
  "clientes",
];

const PORTAL_OPERATION_TABLES = [
  "portal_auditoria_eventos",
  "portal_credito_movimientos",
  "portal_file_services",
];

const PORTAL_ACCOUNT_TABLES = ["portal_usuarios", "portal_cuentas"];

const PRESERVED_TABLES = ["Usuarios"];

const UPLOAD_DIRS = [
  path.join(BACKEND_DIR, "src", "uploads", "ecu"),
  path.join(BACKEND_DIR, "src", "uploads", "ecu_files"),
  path.join(BACKEND_DIR, "src", "uploads", "fotos"),
  path.join(BACKEND_DIR, "src", "uploads", "scanner"),
  path.join(BACKEND_DIR, "src", "uploads", "comprobantes"),
  path.join(BACKEND_DIR, "src", "portal_uploads"),
];

const quoteIdent = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;

const tableExists = async (tableName) => {
  const [rows] = await sequelize.query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = :tableName
    ) AS exists
    `,
    {
      replacements: { tableName },
    }
  );

  return Boolean(rows[0]?.exists);
};

const countRows = async (tableName) => {
  if (!(await tableExists(tableName))) {
    return { tableName, exists: false, count: 0 };
  }

  const [rows] = await sequelize.query(
    `SELECT COUNT(*)::bigint AS count FROM ${quoteIdent(tableName)}`,
    {}
  );

  return {
    tableName,
    exists: true,
    count: Number(rows[0]?.count || 0),
  };
};

const countMany = async (tables) => Promise.all(tables.map(countRows));

const printCounts = (title, counts) => {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));

  for (const item of counts) {
    const status = item.exists ? String(item.count).padStart(8, " ") : "NO EXISTE";
    console.log(`${item.tableName.padEnd(32, " ")} ${status}`);
  }
};

const listFilesRecursive = (dir) => {
  if (!fs.existsSync(dir)) return [];

  const root = path.resolve(dir);
  const result = [];

  const walk = (current) => {
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name !== ".gitkeep") {
        const resolved = path.resolve(fullPath);
        if (resolved.startsWith(root + path.sep) || resolved === root) {
          result.push(resolved);
        }
      }
    }
  };

  walk(root);
  return result;
};

const countUploadFiles = () =>
  UPLOAD_DIRS.map((dir) => ({
    dir,
    files: listFilesRecursive(dir),
  }));

const deleteUploadFiles = (groups) => {
  let deleted = 0;

  for (const group of groups) {
    const root = path.resolve(group.dir);

    for (const file of group.files) {
      const resolved = path.resolve(file);
      if (!resolved.startsWith(root + path.sep)) {
        throw new Error(`Ruta fuera de directorio permitido: ${resolved}`);
      }

      fs.rmSync(resolved, { force: true });
      deleted += 1;
    }
  }

  return deleted;
};

const deleteTable = async (tableName, transaction) => {
  if (!(await tableExists(tableName))) {
    return { tableName, skipped: true, deleted: 0 };
  }

  const result = await sequelize.query(`DELETE FROM ${quoteIdent(tableName)}`, {
    transaction,
  });

  return {
    tableName,
    skipped: false,
    deleted: Array.isArray(result) ? Number(result[1]?.rowCount || 0) : 0,
  };
};

const resetPortalBalances = async (transaction) => {
  if (!(await tableExists("portal_cuentas"))) return 0;

  const result = await sequelize.query(
    `
    UPDATE "portal_cuentas"
    SET "saldo_creditos" = 0,
        "updatedAt" = NOW()
    `,
    { transaction }
  );

  return Array.isArray(result) ? Number(result[1]?.rowCount || 0) : 0;
};

const runReset = async () => {
  const tablesToClean = [
    ...PORTAL_OPERATION_TABLES,
    ...(RESET_PORTAL_ACCOUNTS ? PORTAL_ACCOUNT_TABLES : []),
    ...INTERNAL_TABLES,
  ];

  const allCountTables = [
    ...tablesToClean,
    ...PRESERVED_TABLES,
    ...(!RESET_PORTAL_ACCOUNTS ? PORTAL_ACCOUNT_TABLES : []),
  ];

  console.log("GMTCH Tune OS - Reset seguro de operacion");
  console.log(`Modo: ${IS_DRY_RUN ? "DRY_RUN" : "RESET REAL CONFIRMADO"}`);
  console.log(`RESET_PORTAL_ACCOUNTS=${RESET_PORTAL_ACCOUNTS}`);
  console.log(`RESET_UPLOAD_FILES=${RESET_UPLOAD_FILES}`);
  console.log("No se usa TRUNCATE CASCADE.");

  if (IS_DRY_RUN) {
    console.log(`\nPara reset real debes definir RESET_CONFIRM=${CONFIRM_PHRASE}`);
  }

  await sequelize.authenticate();

  const beforeCounts = await countMany([...new Set(allCountTables)]);
  printCounts("Conteo antes / plan", beforeCounts);

  if (!RESET_PORTAL_ACCOUNTS) {
    console.log(
      "\nPortalCuenta y PortalUsuario se conservan. Se limpiaran solicitudes, auditoria y movimientos de creditos portal; saldos se resetearian a 0 en reset real."
    );
  }

  const uploadGroups = countUploadFiles();
  const totalUploadFiles = uploadGroups.reduce((sum, group) => sum + group.files.length, 0);

  console.log("\nArchivos fisicos detectados");
  console.log("--------------------------");
  for (const group of uploadGroups) {
    console.log(`${group.dir} -> ${group.files.length}`);
  }
  console.log(`Total archivos fisicos: ${totalUploadFiles}`);

  if (!RESET_UPLOAD_FILES) {
    console.log("RESET_UPLOAD_FILES=false: no se borrarian archivos fisicos.");
  }

  if (IS_DRY_RUN) {
    console.log("\nDRY_RUN terminado. No se borro nada.");
    return;
  }

  const transaction = await sequelize.transaction();
  const deleted = [];

  try {
    for (const tableName of tablesToClean) {
      deleted.push(await deleteTable(tableName, transaction));
    }

    if (!RESET_PORTAL_ACCOUNTS) {
      const cuentasActualizadas = await resetPortalBalances(transaction);
      console.log(`\nPortal cuentas preservadas con saldo_creditos resetado: ${cuentasActualizadas}`);
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  let deletedFiles = 0;
  if (RESET_UPLOAD_FILES) {
    deletedFiles = deleteUploadFiles(uploadGroups);
  }

  const afterCounts = await countMany([...new Set(allCountTables)]);
  printCounts("Conteo despues", afterCounts);

  console.log("\nResumen reset");
  console.log("-------------");
  for (const item of deleted) {
    console.log(
      `${item.tableName.padEnd(32, " ")} ${item.skipped ? "NO EXISTE" : "DELETE ejecutado"}`
    );
  }
  console.log(`Archivos fisicos borrados: ${deletedFiles}`);
  console.log("Reset operativo completado.");
};

runReset()
  .catch((error) => {
    console.error("\nRESET ABORTADO:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {
      // Nada mas que hacer al cerrar.
    }
  });
