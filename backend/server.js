// ... (arriba están los imports de express, cors, etc)

// 1. IMPORTAR RUTAS
const clienteRoutes = require('./src/routes/clienteRoutes');
const vehiculoRoutes = require('./src/routes/vehiculoRoutes');
const ordenTrabajoRoutes = require('./src/routes/ordenTrabajoRoutes');
const diagnosticoRoutes = require('./src/routes/diagnosticoRoutes');
const archivoECURoutes = require('./src/routes/archivoECURoutes');
const fotoVehiculoRoutes = require('./src/routes/fotoVehiculoRoutes');
const authRoutes = require('./src/routes/authRoutes'); // <-- ASEGURATE QUE ESTA LINEA ESTE

// 2. USAR RUTAS
app.use('/api/clientes', clienteRoutes);
app.use('/api/vehiculos', vehiculoRoutes);
app.use('/api/ordenes', ordenTrabajoRoutes);
app.use('/api/diagnosticos', diagnosticoRoutes);
app.use('/api/archivos-ecu', archivoECURoutes);
app.use('/api/fotos', fotoVehiculoRoutes);
app.use('/api/auth', authRoutes); // <-- ASEGURATE QUE ESTA LINEA ESTE

// ... (abajo está el startServer)
