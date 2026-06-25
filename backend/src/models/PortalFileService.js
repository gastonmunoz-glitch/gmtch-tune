const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PortalFileService = sequelize.define(
  "PortalFileService",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    cuentaId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    estado: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: "RECIBIDO",
    },

    tipo_servicio: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },

    marca_vehiculo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    modelo_vehiculo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    anio_vehiculo: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    ecu_info: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    observaciones_cliente: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    observaciones_internas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    archivo_original: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },

    nombre_original: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    archivo_modificado: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },

    nombre_modificado: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    creditos_requeridos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1,
    },

    creditos_consumidos: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    fecha_subida: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    fecha_mod_listo: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    fecha_descarga: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    descargas_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    correccion_solicitada: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    observacion_correccion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "portal_file_services",
    timestamps: true,
  }
);

module.exports = PortalFileService;
