const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const sequelize = require("./src/config/database");

// Cargar variables
dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// --- 1. IMPORTACIÓN DE RUTAS ---
const authRoutes = require("./src/routes/authRoutes");
const clienteRoutes = require("./src/routes/clienteRoutes");
const vehiculoRoutes = require("./src/routes/vehiculoRoutes");
const ordenTrabajoRoutes = require("./src/routes/ordenTrabajoRoutes");
const diagnosticoRoutes = require("./src/routes/diagnosticoRoutes");
const archivoECURoutes = require("./src/routes/archivoECURoutes");
const fotoVehiculoRoutes = require("./src/routes/fotoVehiculoRoutes");

// --- 2. REGISTRO DE RUTAS (ORDEN CRÍTICO) ---
app.use("/api/auth", authRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/vehiculos", vehiculoRoutes);
app.use("/api/ordenes", ordenTrabajoRoutes);
app.use("/api/diagnosticos", diagnosticoRoutes);
app.use("/api/archivos-ecu", archivoECURoutes);
app.use("/api/fotos", fotoVehiculoRoutes);

app.get("/", (req, res) => res.send("GMTCH TUNE SERVER ONLINE"));

// --- 3. INICIO Y SEMILLERO DE SEGURIDAD ---
const startServer = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("✅ BASE DE DATOS ACTUALIZADA");

    // Buscamos si existe, si no, lo creamos con clave simple: 123
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

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 SERVIDOR ESCUCHANDO EN PUERTO ${PORT}`);
    });
  } catch (error) {
    console.error("❌ ERROR AL ARRANCAR:", error);
  }
};

startServer();