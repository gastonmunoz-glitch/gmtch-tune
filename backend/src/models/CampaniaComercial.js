const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CampaniaComercial = sequelize.define(
  "CampaniaComercial",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    canal: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "OTRO",
    },
    objetivo: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "OTRO",
    },
    presupuesto: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    fecha_inicio: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fecha_fin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estado: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "BORRADOR",
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    utm_source: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    utm_campaign: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    utm_content: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    creado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "campanias_comerciales",
    timestamps: true,
  }
);

module.exports = CampaniaComercial;
