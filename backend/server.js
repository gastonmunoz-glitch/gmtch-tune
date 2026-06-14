const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

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
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("CORS bloqueado para origin:", origin);
      return callback(null, true); // marcha blanca: permisivo para evitar bloqueo
    },
    credentials: true,
  })
);

// Middlewares
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Servir archivos subidos
app.use("/uploads", express.static(uploadsPath));

// Importar conexión y modelos
const sequelize = require("./src/config/database");
require("./src/models");

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API Gmtch Tune funcionando");
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "API Gmtch Tune funcionando",
    environment: process.env.NODE_ENV || "development",
  });
});

// Importar rutas
const clienteRoutes = require("./src/routes/clienteRoutes");
const vehiculoRoutes = require("./src/routes/vehiculoRoutes");
const ordenTrabajoRoutes = require("./src/routes/ordenTrabajoRoutes");
const diagnosticoRoutes = require("./src/routes/diagnosticoRoutes");
const archivoECURoutes = require("./src/routes/archivoECURoutes");
const fotoVehiculoRoutes = require("./src/routes/fotoVehiculoRoutes");

// Usar rutas
app.use("/api/clientes", clienteRoutes);
app.use("/api/vehiculos", vehiculoRoutes);
app.use("/api/ordenes", ordenTrabajoRoutes);
app.use("/api/diagnosticos", diagnosticoRoutes);
app.use("/api/archivos-ecu", archivoECURoutes);
app.use("/api/fotos", fotoVehiculoRoutes);

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

// Sincronizar modelos con la base de datos
const startServer = async () => {
  try {
    const shouldAlter = process.env.DB_ALTER === "true";

    await sequelize.sync({ alter: shouldAlter });

    console.log("✅ Tablas sincronizadas correctamente");
    console.log("📁 Uploads path:", uploadsPath);

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log("📡 Endpoints:");
      console.log("   /api/clientes");
      console.log("   /api/vehiculos");
      console.log("   /api/ordenes");
      console.log("   /api/diagnosticos");
      console.log("   /api/archivos-ecu");
      console.log("   /api/fotos");
      console.log("   /api/health");
    });
  } catch (error) {
    console.error("❌ Error al sincronizar la base de datos:", error);
    process.exit(1);
  }
};

startServer();