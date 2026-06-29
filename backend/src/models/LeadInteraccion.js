const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const LeadInteraccion = sequelize.define(
  "LeadInteraccion",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    leadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    canal: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "OTRO",
    },

    direccion: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "INTERNA",
    },

    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    autor: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: "lead_interacciones",
    timestamps: true,
  }
);

module.exports = LeadInteraccion;
