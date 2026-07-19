const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const OrdenServicioItem = sequelize.define(
  "OrdenServicioItem",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    empresaId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "empresa_cuentas",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },

    ordenId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    tipo_servicio: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },

    categoria: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: "OTRO",
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    cantidad: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1,
    },

    precio_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },

    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },

    responsable: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    responsable_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    estado: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "PENDIENTE",
    },

    requiere_material_recuperado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    material_recuperado_obligatorio: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "orden_servicio_items",
    timestamps: true,
  }
);

module.exports = OrdenServicioItem;
