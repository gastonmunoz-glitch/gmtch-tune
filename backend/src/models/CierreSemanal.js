const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CierreSemanal = sequelize.define(
  "CierreSemanal",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    semana_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    semana_fin: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    ingresos_total: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    egresos_total: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    sueldos_total: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    aporte_fondo_reserva: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    utilidad_distribuible: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    participantes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },

    estado: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "BORRADOR",
    },

    creado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    cerrado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    cerrado_at: {
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
    tableName: "cierres_semanales",
    timestamps: true,
  }
);

module.exports = CierreSemanal;
