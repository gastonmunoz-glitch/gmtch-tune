const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ComprobantePago = sequelize.define(
  "ComprobantePago",
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

    movimientoFinancieroId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    monto: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    fecha_pago: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    metodo_pago: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "TRANSFERENCIA",
    },

    banco_origen: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    folio_referencia: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    archivo_comprobante_path: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    archivo_comprobante_nombre: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    estado: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "PENDIENTE_REVISION",
    },

    observacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    subido_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    validado_por: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    validado_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "comprobantes_pago",
    timestamps: true,
  }
);

module.exports = ComprobantePago;
