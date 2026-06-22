const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const sequelize = require("./src/config/database");

dotenv.config();

console.log("🛠️ SERVER VERSION: FIX-USUARIOS-ID-V2-2026-06-22");

const app = express();

// Carpetas de uploads
const uploadsPath = path.join(__dirname, "src", "uploads");
const fotosPath = path.join(__dirname, "src", "uploads", "fotos");

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

if (!fs.existsSync(fotosPath)) {
  fs.mkdirSync(fotosPath, { recursive: true });
}

// CORS
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

// Middlewares
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Servir archivos subidos
app.use("/uploads", express.static(uploadsPath));

// Importar modelos
require("./src/models");

// Ruta base
app.get("/", (req, res) => {
  res.send("GMTCH TUNE SERVER ONLINE");
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Backend Gmtch Tune funcionando",
    version: "FIX-USUARIOS-ID-V2-2026-06-22",
    environment: process.env.NODE_ENV || "development",
  });
});

// Importar rutas
const authRoutes = require("./src/routes/authRoutes");
const clienteRoutes = require("./src/routes/clienteRoutes");
const vehiculoRoutes = require("./src/routes/vehiculoRoutes");
const ordenTrabajoRoutes = require("./src/routes/ordenTrabajoRoutes");
const diagnosticoRoutes = require("./src/routes/diagnosticoRoutes");
const archivoECURoutes = require("./src/routes/archivoECURoutes");
const fotoVehiculoRoutes = require("./src/routes/fotoVehiculoRoutes");

// Usar rutas
app.use("/api/auth", authRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/vehiculos", vehiculoRoutes);
app.use("/api/ordenes", ordenTrabajoRoutes);
app.use("/api/diagnosticos", diagnosticoRoutes);
app.use("/api/archivos-ecu", archivoECURoutes);
app.use("/api/fotos", fotoVehiculoRoutes);

// Rutas opcionales
try {
  const pagoRoutes = require("./src/routes/pagoRoutes");
  app.use("/api/pagos", pagoRoutes);
  console.log("✅ Ruta /api/pagos cargada");
} catch (error) {
  console.warn("⚠️ Ruta /api/pagos no cargada:", error.message);
}

try {
  const fileRoutes = require("./src/routes/fileRoutes");
  app.use("/api/files", fileRoutes);
  console.log("✅ Ruta /api/files cargada");
} catch (error) {
  console.warn("⚠️ Ruta /api/files no cargada:", error.message);
}

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.originalUrl,
  });
});

// Manejo general de errores
app.use((err, req, res, next) => {
  console.error("ERROR GENERAL BACKEND:", err);

  res.status(err.status || 500).json({
    error: err.message || "Error interno del servidor",
  });
});

// Reparar autoincremento de Usuarios.id
const repararUsuarioIdSequence = async () => {
  try {
    await sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'Usuarios'
        ) THEN

          CREATE SEQUENCE IF NOT EXISTS "Usuarios_id_seq";

          ALTER TABLE "Usuarios"
          ALTER COLUMN "id"
          SET DEFAULT nextval('"Usuarios_id_seq"'::regclass);

          ALTER SEQUENCE "Usuarios_id_seq"
          OWNED BY "Usuarios"."id";

          PERFORM setval(
            '"Usuarios_id_seq"',
            GREATEST(COALESCE((SELECT MAX("id") FROM "Usuarios"), 0), 1),
            true
          );

        END IF;
      END $$;
    `);

    console.log("✅ Secuencia Usuarios.id reparada/verificada");
  } catch (error) {
    console.error("❌ Error reparando secuencia Usuarios.id:", error);
    throw error;
  }
};

// Crear usuario maestro con SQL directo para evitar error de id null
const crearUsuarioMaestro = async () => {
  try {
    const [usuarios] = await sequelize.query(`
      SELECT "id", "username"
      FROM "Usuarios"
      WHERE "username" = 'gaston'
      LIMIT 1;
    `);

    if (usuarios.length > 0) {
      console.log("ℹ️ EL USUARIO gaston YA EXISTE EN LA BASE DE DATOS");
      return;
    }

    const [resultadoId] = await sequelize.query(`
      SELECT COALESCE(MAX("id"), 0) + 1 AS next_id
      FROM "Usuarios";
    `);

    const nextId = Number(resultadoId[0].next_id || 1);
    const passwordHash = await bcrypt.hash("123", 10);

    await sequelize.query(
      `
      INSERT INTO "Usuarios"
        ("id", "username", "password", "rol", "createdAt", "updatedAt")
      VALUES
        (:id, :username, :password, :rol, NOW(), NOW());
      `,
      {
        replacements: {
          id: nextId,
          username: "gaston",
          password: passwordHash,
          rol: "ADMIN",
        },
      }
    );

    console.log("🚀 ACCESO MAESTRO CREADO: gaston / 123");
  } catch (error) {
    console.error("❌ Error creando usuario maestro:", error);
    throw error;
  }
};

// Iniciar servidor
const startServer = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("✅ BASE DE DATOS SINCRONIZADA");

    await repararUsuarioIdSequence();
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