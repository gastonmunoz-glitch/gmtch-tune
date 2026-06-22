const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const sequelize = require("./src/config/database");

dotenv.config();

console.log("🛠️ SERVER VERSION: ROLES-PERMISSIONS-V1-2026-06-22");

const app = express();

const uploadsPath = path.join(__dirname, "src", "uploads");
const fotosPath = path.join(__dirname, "src", "uploads", "fotos");

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

if (!fs.existsSync(fotosPath)) {
  fs.mkdirSync(fotosPath, { recursive: true });
}

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://abundant-emotion-production-830a.up.railway.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("CORS permitido temporalmente para origin:", origin);
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use("/uploads", express.static(uploadsPath));

require("./src/models");

const {
  autenticar,
  permitirRoles,
  permitirPorMetodo,
} = require("./src/middleware/authMiddleware");

app.get("/", (req, res) => {
  res.send("GMTCH TUNE SERVER ONLINE");
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Backend Gmtch Tune funcionando",
    version: "ROLES-PERMISSIONS-V1-2026-06-22",
    environment: process.env.NODE_ENV || "development",
  });
});

const authRoutes = require("./src/routes/authRoutes");
const usuarioRoutes = require("./src/routes/usuarioRoutes");
const clienteRoutes = require("./src/routes/clienteRoutes");
const vehiculoRoutes = require("./src/routes/vehiculoRoutes");
const ordenTrabajoRoutes = require("./src/routes/ordenTrabajoRoutes");
const diagnosticoRoutes = require("./src/routes/diagnosticoRoutes");
const archivoECURoutes = require("./src/routes/archivoECURoutes");
const fotoVehiculoRoutes = require("./src/routes/fotoVehiculoRoutes");

app.use("/api/auth", authRoutes);

app.use(
  "/api/usuarios",
  autenticar,
  permitirRoles("OWNER"),
  usuarioRoutes
);

app.use(
  "/api/clientes",
  autenticar,
  permitirPorMetodo({
    GET: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
    ],
    POST: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
    PUT: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
    PATCH: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
    DELETE: ["OWNER"],
  }),
  clienteRoutes
);

app.use(
  "/api/vehiculos",
  autenticar,
  permitirPorMetodo({
    GET: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
      "TUNER",
    ],
    POST: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
    PUT: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
    PATCH: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
    DELETE: ["OWNER"],
  }),
  vehiculoRoutes
);

app.use(
  "/api/ordenes",
  autenticar,
  permitirPorMetodo({
    GET: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
      "TUNER",
    ],
    POST: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
    PUT: ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_SCANNER", "OPERADOR_ECU", "MECANICO"],
    PATCH: ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_SCANNER", "OPERADOR_ECU", "MECANICO"],
    DELETE: ["OWNER"],
  }),
  ordenTrabajoRoutes
);

app.use(
  "/api/diagnosticos",
  autenticar,
  permitirPorMetodo({
    GET: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
    ],
    POST: ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_SCANNER", "OPERADOR_ECU", "MECANICO"],
    PUT: ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_SCANNER", "OPERADOR_ECU", "MECANICO"],
    PATCH: ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_SCANNER", "OPERADOR_ECU", "MECANICO"],
    DELETE: ["OWNER"],
  }),
  diagnosticoRoutes
);

app.use(
  "/api/archivos-ecu",
  autenticar,
  permitirPorMetodo({
    GET: ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_ECU", "TUNER"],
    POST: ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_ECU", "TUNER"],
    PUT: ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_ECU", "TUNER"],
    PATCH: ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_ECU", "TUNER"],
    DELETE: ["OWNER"],
  }),
  archivoECURoutes
);

app.use(
  "/api/fotos",
  autenticar,
  permitirPorMetodo({
    GET: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION", "OPERADOR_SCANNER", "OPERADOR_ECU", "MECANICO"],
    POST: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
    PUT: ["OWNER", "ADMIN", "SUPERVISOR"],
    PATCH: ["OWNER", "ADMIN", "SUPERVISOR"],
    DELETE: ["OWNER"],
  }),
  fotoVehiculoRoutes
);

try {
  const pagoRoutes = require("./src/routes/pagoRoutes");
  app.use("/api/pagos", autenticar, permitirRoles("OWNER", "ADMIN"), pagoRoutes);
  console.log("✅ Ruta /api/pagos cargada");
} catch (error) {
  console.warn("⚠️ Ruta /api/pagos no cargada:", error.message);
}

try {
  const fileRoutes = require("./src/routes/fileRoutes");
  app.use("/api/files", autenticar, permitirRoles("OWNER", "ADMIN"), fileRoutes);
  console.log("✅ Ruta /api/files cargada");
} catch (error) {
  console.warn("⚠️ Ruta /api/files no cargada:", error.message);
}

app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error("ERROR GENERAL BACKEND:", err);

  res.status(err.status || 500).json({
    error: err.message || "Error interno del servidor",
  });
});

const prepararBaseUsuarios = async () => {
  try {
    await sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_name = 'Usuarios'
        ) THEN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'Usuarios'
            AND column_name = 'rol'
          ) THEN
            ALTER TABLE "Usuarios" ALTER COLUMN "rol" DROP DEFAULT;
            ALTER TABLE "Usuarios" ALTER COLUMN "rol" TYPE VARCHAR(50) USING "rol"::text;
            ALTER TABLE "Usuarios" ALTER COLUMN "rol" SET DEFAULT 'RECEPCION';
          END IF;
        END IF;
      END $$;
    `);

    console.log("✅ Columna Usuarios.rol preparada como VARCHAR");
  } catch (error) {
    console.warn("⚠️ No se pudo preparar Usuarios.rol:", error.message);
  }
};

const crearUsuarioMaestro = async () => {
  try {
    const [usuarios] = await sequelize.query(`
      SELECT "id", "username", "rol"
      FROM "Usuarios"
      WHERE "username" = 'gaston'
      LIMIT 1;
    `);

    if (usuarios.length > 0) {
      await sequelize.query(`
        UPDATE "Usuarios"
        SET "rol" = 'OWNER',
            "nombre" = COALESCE("nombre", 'Gastón Muñoz'),
            "activo" = true,
            "updatedAt" = NOW()
        WHERE "username" = 'gaston';
      `);

      console.log("ℹ️ Usuario gaston actualizado como OWNER");
      return;
    }

    const passwordHash = await bcrypt.hash("123", 10);

    await sequelize.query(
      `
      INSERT INTO "Usuarios"
        ("id", "nombre", "username", "password", "rol", "activo", "createdAt", "updatedAt")
      VALUES
        (:id, :nombre, :username, :password, :rol, true, NOW(), NOW());
      `,
      {
        replacements: {
          id: crypto.randomUUID(),
          nombre: "Gastón Muñoz",
          username: "gaston",
          password: passwordHash,
          rol: "OWNER",
        },
      }
    );

    console.log("🚀 ACCESO OWNER CREADO: gaston / 123");
  } catch (error) {
    console.error("❌ Error creando usuario maestro:", error);
    throw error;
  }
};

const startServer = async () => {
  try {
    await prepararBaseUsuarios();

    await sequelize.sync({ alter: true });
    console.log("✅ BASE DE DATOS SINCRONIZADA");

    await crearUsuarioMaestro();

    console.log("📁 Uploads path:", uploadsPath);

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 SERVIDOR ESCUCHANDO EN PUERTO ${PORT}`);
      console.log("📡 Endpoints activos:");
      console.log("   /");
      console.log("   /api/health");
      console.log("   /api/auth/test");
      console.log("   /api/auth/login");
      console.log("   /api/auth/me");
      console.log("   /api/usuarios");
      console.log("   /api/clientes");
      console.log("   /api/vehiculos");
      console.log("   /api/ordenes");
      console.log("   /api/diagnosticos");
      console.log("   /api/archivos-ecu");
      console.log("   /api/fotos");
    });
  } catch (error) {
    console.error("❌ ERROR AL ARRANCAR:", error);
    process.exit(1);
  }
};

startServer();