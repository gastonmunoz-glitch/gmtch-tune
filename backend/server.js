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
const authRoutes = require("./src/routes/authRoutes");
const clienteRoutes = require("./src/routes/clienteRoutes");
const vehiculoRoutes = require("./src/routes/vehiculoRoutes");
const ordenTrabajoRoutes = require("./src/routes/ordenTrabajoRoutes");
const diagnosticoRoutes = require("./src/routes/diagnosticoRoutes");
const archivoECURoutes = require("./src/routes/archivoECURoutes");
const fotoVehiculoRoutes = require("./src/routes/fotoVehiculoRoutes");
const pagoRoutes = require("./src/routes/pagoRoutes");
const fileRoutes = require("./src/routes/fileRoutes");

// Usar rutas
app.use("/api/auth", authRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/vehiculos", vehiculoRoutes);
app.use("/api/ordenes", ordenTrabajoRoutes);
app.use("/api/diagnosticos", diagnosticoRoutes);
app.use("/api/archivos-ecu", archivoECURoutes);
app.use("/api/fotos", fotoVehiculoRoutes);
app.use("/api/pagos", pagoRoutes);
app.use("/api/files", fileRoutes);

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

// Sincronizar modelos con la base de datos + crear usuario maestro
const startServer = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("✅ Base de Datos Sincronizada");

    // --- CREACIÓN AUTOMÁTICA DE TU ACCESO MAESTRO ---
    const Usuario = require("./src/models/Usuario");

    const adminExiste = await Usuario.findOne({
      where: { username: "gaston.master" },
    });

    if (!adminExiste) {
      await Usuario.create({
        username: "gaston.master",
        password: "gmtch2024admin", // ESTA SERÁ TU CLAVE
        rol: "ADMIN",
      });

      console.log("🚀 ACCESO MAESTRO CREADO: gaston.master / gmtch2024admin");
    } else {
      console.log("✅ Acceso maestro ya existe: gaston.master");
    }

    console.log("📁 Uploads path:", uploadsPath);

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Servidor Gmtch Tune en Puerto ${PORT}`);
      console.log("📡 Endpoints:");
      console.log("   /api/auth");
      console.log("   /api/clientes");
      console.log("   /api/vehiculos");
      console.log("   /api/ordenes");
      console.log("   /api/diagnosticos");
      console.log("   /api/archivos-ecu");
      console.log("   /api/fotos");
      console.log("   /api/pagos");
      console.log("   /api/files");
      console.log("   /api/health");
    });
  } catch (error) {
    console.error("❌ Error Crítico:", error);
    process.exit(1);
  }
};

startServer();