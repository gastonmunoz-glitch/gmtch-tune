const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Cliente = sequelize.define(
  "Cliente",
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

    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    direccion: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    categoria_cliente: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "NORMAL",
    },

    excluir_estadisticas: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    nota_cliente: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "clientes",
    timestamps: true,
  }
);

module.exports = Cliente;
