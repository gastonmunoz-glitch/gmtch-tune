const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Importar conexión y modelos
const sequelize = require('./src/config/database');
const models = require('./src/models');

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API Gmtch Tune funcionando');
});

// Importar todas las rutas
const clienteRoutes = require('./src/routes/clienteRoutes');
const vehiculoRoutes = require('./src/routes/vehiculoRoutes');
const ordenTrabajoRoutes = require('./src/routes/ordenTrabajoRoutes');
const diagnosticoRoutes = require('./src/routes/diagnosticoRoutes');
const archivoECURoutes = require('./src/routes/archivoECURoutes');
const fotoVehiculoRoutes = require('./src/routes/fotoVehiculoRoutes');

// Usar rutas
app.use('/api/clientes', clienteRoutes);
app.use('/api/vehiculos', vehiculoRoutes);
app.use('/api/ordenes', ordenTrabajoRoutes);
app.use('/api/diagnosticos', diagnosticoRoutes);
app.use('/api/archivos-ecu', archivoECURoutes);
app.use('/api/fotos', fotoVehiculoRoutes);

// Sincronizar modelos con la base de datos
const startServer = async () => {
  try {
    await sequelize.sync({ alter: true }); // Crea o actualiza las tablas
    console.log('✅ Tablas sincronizadas correctamente');

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log('📡 Endpoints: /api/clientes /api/vehiculos /api/ordenes /api/diagnosticos /api/archivos-ecu /api/fotos');
    });
  } catch (error) {
    console.error('❌ Error al sincronizar la base de datos:', error);
  }
};

startServer();
