const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const OrdenTrabajo = sequelize.define(
  "OrdenTrabajo",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    vehiculoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    prioridad: {
      type: DataTypes.ENUM("BAJA", "MEDIA", "ALTA", "URGENTE"),
      defaultValue: "MEDIA",
    },

    estado: {
      type: DataTypes.ENUM(
        "RECEPCIONADO", // Recepción registra cliente, vehículo, síntomas, fotos y servicio solicitado
        "PARA_DIAGNOSTICO", // Espera operador scanner/diagnóstico
        "EN_PROGRAMACION", // Uso temporal: diagnóstico técnico / scanner / lectura ECU / file service
        "PARA_MECANICA", // Mecánico ejecuta una instrucción ya definida por plataforma
        "EN_MECANICA", // Mecánico trabajando según instrucción asignada
        "LISTO_PARA_ENTREGA" // Trabajo listo para entrega
      ),
      defaultValue: "RECEPCIONADO",
    },

    estado_pago: {
      type: DataTypes.ENUM("PENDIENTE", "PAGADO"),
      defaultValue: "PENDIENTE",
    },

    kilometraje: {
      type: DataTypes.INTEGER,
    },

    motivo_ingreso: {
      type: DataTypes.TEXT,
    },

    monto_total: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
  },
  {
    tableName: "ordenes_trabajo",
    timestamps: true,
  }
);

module.exports = OrdenTrabajo;