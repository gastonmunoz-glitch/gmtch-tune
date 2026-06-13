const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,     // gmtch_tune_db
  process.env.DB_USER,     // postgres
  process.env.DB_PASSWORD, // gmtch2024
  {
    host: process.env.DB_HOST,     // localhost
    port: process.env.DB_PORT,     // 5432
    dialect: 'postgres',
    logging: false, // Cambia a true si quieres ver las consultas SQL en consola
  }
);

// Probar la conexión
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL exitosa');
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos:', error);
  }
};

testConnection();

module.exports = sequelize;
