const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const sequelize = require("./src/config/database");

dotenv.config();

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

// Rutas opcionales, para que no rompan el servidor si un archivo no existe
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

// Iniciar servidor
const startServer = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("✅ BASE DE DATOS SINCRONIZADA");

    const Usuario = require("./src/models/Usuario");

    const [, created] = await Usuario.findOrCreate({
      where: { username: "gaston" },
      defaults: {
        password: "123",
        rol: "ADMIN",
      },
    });

    if (created) {
      console.log("🚀 ACCESO MAESTRO CREADO: gaston / 123");
    } else {
      console.log("ℹ️ EL USUARIO gaston YA EXISTE EN LA BASE DE DATOS");
    }

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