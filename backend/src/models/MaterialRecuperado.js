const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MaterialRecuperado = sequelize.define(
  "MaterialRecuperado",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    ordenId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    clienteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    vehiculoId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    marca: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },

    modelo: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },

    motor: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    anio: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    patente: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    tipo_material: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "LOZA_DPF",
    },

    kilos: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 0,
    },

    precio_estimado_kg: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 11000,
    },

    valor_estimado: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    lote_mes: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },

    lote_estado: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "ABIERTO",
    },

    estado: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "ACUMULADO",
    },

    comprador: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },

    precio_real_kg: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },

    valor_real: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
    },

    observacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    creado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    marca_normalizada: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    modelo_normalizado: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    motor_normalizado: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    estadistica_clave: {
      type: DataTypes.STRING(280),
      allowNull: true,
    },

    promedio_historico_kg: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: true,
    },

    diferencia_porcentaje: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },

    alerta_rango: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "OK",
    },

    confianza_estadistica: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "BAJA",
    },

    lote_cerrado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    lote_cerrado_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    auditoria: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    tableName: "materiales_recuperados",
    timestamps: true,
  }
);

module.exports = MaterialRecuperado;
