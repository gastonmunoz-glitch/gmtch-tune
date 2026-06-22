const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const sequelize = require("./src/config/database");

dotenv.config();

console.log("🛠️ SERVER VERSION: GARAGE-FILA-PAGOS-V4-2026-06-22");

const app = express();

// ====================== CARPETAS UPLOADS ======================

const uploadsPath = path.join(__dirname, "src", "uploads");
const fotosPath = path.join(__dirname, "src", "uploads", "fotos");

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

if (!fs.existsSync(fotosPath)) {
  fs.mkdirSync(fotosPath, { recursive: true });
}

// ====================== CORS ======================

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://abundant-emotion-production-830a.up.railway.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("CORS permitido temporalmente para origin:", origin);
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(cors(corsOptions));

// ====================== MIDDLEWARES BASE ======================

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use("/uploads", express.static(uploadsPath));

// ====================== MODELOS ======================

require("./src/models");

const {
  autenticar,
  permitirRoles,
  permitirPorMetodo,
} = require("./src/middleware/authMiddleware");

// ====================== RUTAS BASE ======================

app.get("/", (req, res) => {
  res.send("GMTCH TUNE SERVER ONLINE");
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Backend Gmtch Tune funcionando",
    version: "GARAGE-FILA-PAGOS-V4-2026-06-22",
    environment: process.env.NODE_ENV || "development",
  });
});

// ====================== IMPORTAR RUTAS ======================

const authRoutes = require("./src/routes/authRoutes");
const usuarioRoutes = require("./src/routes/usuarioRoutes");
const clienteRoutes = require("./src/routes/clienteRoutes");
const vehiculoRoutes = require("./src/routes/vehiculoRoutes");
const ordenTrabajoRoutes = require("./src/routes/ordenTrabajoRoutes");
const diagnosticoRoutes = require("./src/routes/diagnosticoRoutes");
const archivoECURoutes = require("./src/routes/archivoECURoutes");
const fotoVehiculoRoutes = require("./src/routes/fotoVehiculoRoutes");

// ====================== RUTAS PÚBLICAS ======================

app.use("/api/auth", authRoutes);

// ====================== RUTAS PROTEGIDAS ======================

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
    PUT: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
    ],
    PATCH: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
    ],
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
    POST: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
    ],
    PUT: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
    ],
    PATCH: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
    ],
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
    GET: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
    ],
    POST: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
    PUT: ["OWNER", "ADMIN", "SUPERVISOR"],
    PATCH: ["OWNER", "ADMIN", "SUPERVISOR"],
    DELETE: ["OWNER"],
  }),
  fotoVehiculoRoutes
);

// ====================== RUTAS OPCIONALES ======================

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

// ====================== RUTA NO ENCONTRADA ======================

app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.originalUrl,
  });
});

// ====================== MANEJO GENERAL DE ERRORES ======================

app.use((err, req, res, next) => {
  console.error("ERROR GENERAL BACKEND:", err);

  res.status(err.status || 500).json({
    error: err.message || "Error interno del servidor",
  });
});

// ====================== PREPARAR BASE DE DATOS ======================

const prepararBaseDatos = async () => {
  try {
    await sequelize.query(`
      DO $$
      BEGIN
        -- ======================
        -- USUARIOS
        -- ======================

        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'Usuarios'
        ) THEN

          ALTER TABLE "Usuarios"
          ADD COLUMN IF NOT EXISTS "nombre" VARCHAR(120);

          ALTER TABLE "Usuarios"
          ADD COLUMN IF NOT EXISTS "activo" BOOLEAN DEFAULT true;

          UPDATE "Usuarios"
          SET "activo" = true
          WHERE "activo" IS NULL;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'Usuarios'
            AND column_name = 'username'
          ) THEN
            UPDATE "Usuarios"
            SET "username" = CONCAT('usuario_', LEFT("id"::text, 8))
            WHERE "username" IS NULL
               OR TRIM("username") = '';

            WITH duplicados AS (
              SELECT
                "id",
                "username",
                ROW_NUMBER() OVER (
                  PARTITION BY LOWER(TRIM("username"))
                  ORDER BY "createdAt" ASC NULLS LAST, "id" ASC
                ) AS rn
              FROM "Usuarios"
              WHERE "username" IS NOT NULL
            )
            UPDATE "Usuarios" u
            SET "username" = CONCAT(d."username", '_', d.rn)
            FROM duplicados d
            WHERE u."id" = d."id"
            AND d.rn > 1;
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'Usuarios'
            AND column_name = 'rol'
          ) THEN
            ALTER TABLE "Usuarios" ALTER COLUMN "rol" DROP DEFAULT;
            ALTER TABLE "Usuarios" ALTER COLUMN "rol" TYPE VARCHAR(50) USING "rol"::text;
            ALTER TABLE "Usuarios" ALTER COLUMN "rol" SET DEFAULT 'RECEPCION';

            UPDATE "Usuarios"
            SET "rol" = 'RECEPCION'
            WHERE "rol" IS NULL
               OR TRIM("rol") = '';
          END IF;

        END IF;

        -- ======================
        -- CLIENTES
        -- ======================

        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'clientes'
        ) THEN

          ALTER TABLE "clientes"
          ADD COLUMN IF NOT EXISTS "categoria_cliente" VARCHAR(30) DEFAULT 'NORMAL';

          ALTER TABLE "clientes"
          ADD COLUMN IF NOT EXISTS "nota_cliente" TEXT;

          UPDATE "clientes"
          SET "categoria_cliente" = 'NORMAL'
          WHERE "categoria_cliente" IS NULL
             OR TRIM("categoria_cliente") = '';

        END IF;

        -- ======================
        -- VEHÍCULOS
        -- ======================

        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'vehiculos'
        ) THEN

          ALTER TABLE "vehiculos"
          ADD COLUMN IF NOT EXISTS "anio" INTEGER;

          ALTER TABLE "vehiculos"
          ADD COLUMN IF NOT EXISTS "vin" VARCHAR(50);

          ALTER TABLE "vehiculos"
          ADD COLUMN IF NOT EXISTS "tipo_unidad" VARCHAR(40) DEFAULT 'AUTO';

          ALTER TABLE "vehiculos"
          ADD COLUMN IF NOT EXISTS "activo" BOOLEAN DEFAULT true;

          UPDATE "vehiculos"
          SET "tipo_unidad" = 'AUTO'
          WHERE "tipo_unidad" IS NULL
             OR TRIM("tipo_unidad") = '';

          UPDATE "vehiculos"
          SET "activo" = true
          WHERE "activo" IS NULL;

        END IF;

        -- ======================
        -- ÓRDENES DE TRABAJO
        -- ======================

        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'ordenes_trabajo'
        ) THEN

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'ordenes_trabajo'
            AND column_name = 'prioridad'
          ) THEN
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "prioridad" DROP DEFAULT;
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "prioridad" TYPE VARCHAR(30) USING "prioridad"::text;
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "prioridad" SET DEFAULT 'MEDIA';

            UPDATE "ordenes_trabajo"
            SET "prioridad" = 'MEDIA'
            WHERE "prioridad" IS NULL
               OR TRIM("prioridad") = '';
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'ordenes_trabajo'
            AND column_name = 'estado'
          ) THEN
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "estado" DROP DEFAULT;
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "estado" TYPE VARCHAR(50) USING "estado"::text;
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "estado" SET DEFAULT 'RECEPCIONADO';

            UPDATE "ordenes_trabajo"
            SET "estado" = 'RECEPCIONADO'
            WHERE "estado" IS NULL
               OR TRIM("estado") = '';
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'ordenes_trabajo'
            AND column_name = 'estado_pago'
          ) THEN
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "estado_pago" DROP DEFAULT;
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "estado_pago" TYPE VARCHAR(30) USING "estado_pago"::text;
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "estado_pago" SET DEFAULT 'PENDIENTE';

            UPDATE "ordenes_trabajo"
            SET "estado_pago" = 'PENDIENTE'
            WHERE "estado_pago" IS NULL
               OR TRIM("estado_pago") = '';
          END IF;

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "medio_pago" VARCHAR(40) DEFAULT 'PENDIENTE';

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "monto_pagado" DECIMAL(10, 2) DEFAULT 0;

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "fecha_pago" TIMESTAMP WITH TIME ZONE;

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "cobrado_por" VARCHAR(100);

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "observacion_pago" TEXT;

          UPDATE "ordenes_trabajo"
          SET "medio_pago" = 'PENDIENTE'
          WHERE "medio_pago" IS NULL
             OR TRIM("medio_pago") = '';

          UPDATE "ordenes_trabajo"
          SET "monto_pagado" = 0
          WHERE "monto_pagado" IS NULL;

        END IF;

      END $$;
    `);

    console.log("✅ Base de datos preparada para garage, fila y pagos");
  } catch (error) {
    console.warn("⚠️ No se pudo preparar base de datos:", error.message);
  }
};

// ====================== CREAR / ACTUALIZAR OWNER ======================

const crearUsuarioMaestro = async () => {
  try {
    const passwordHash = await bcrypt.hash("123", 10);

    const [usuarios] = await sequelize.query(`
      SELECT "id", "username", "rol"
      FROM "Usuarios"
      WHERE "username" = 'gaston'
      LIMIT 1;
    `);

    if (usuarios.length > 0) {
      await sequelize.query(
        `
        UPDATE "Usuarios"
        SET "rol" = 'OWNER',
            "nombre" = COALESCE("nombre", 'Gastón Muñoz'),
            "password" = :password,
            "activo" = true,
            "updatedAt" = NOW()
        WHERE "username" = 'gaston';
        `,
        {
          replacements: {
            password: passwordHash,
          },
        }
      );

      console.log("ℹ️ Usuario gaston actualizado como OWNER y password reseteada a 123");
      return;
    }

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

// ====================== INICIAR SERVIDOR ======================

const startServer = async () => {
  try {
    await prepararBaseDatos();

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