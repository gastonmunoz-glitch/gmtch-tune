const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ArchivoECU = sequelize.define(
  "ArchivoECU",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    ordenId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "ordenes_trabajo",
        key: "id",
      },
    },

    estado: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "ORIGINAL_CARGADO",
    },

    prioridad: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: "MEDIA",
    },

    tipo_servicio: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    metodo_lectura: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    herramienta_lectura: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    archivo_original: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    archivo_modificado: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    versiones_modificadas: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },

    ultima_version_modificada: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },

    notificado_master_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    notificado_master_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    notificado_slave_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    notificado_slave_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    correccion_pendiente: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },

    dtc_post_escritura: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    observacion_correccion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    marca_ecu: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    modelo_ecu: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    hw: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    sw: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    version_software: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    notas_operador: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    instrucciones_tuner: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "archivos_ecu",
    timestamps: true,
  }
);

module.exports = ArchivoECU;