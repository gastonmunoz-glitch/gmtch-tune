const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PushSubscription = sequelize.define(
  "PushSubscription",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    endpoint: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },

    p256dh: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    auth: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    deviceLabel: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },

    platform: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    lastPushAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "push_subscriptions",
    timestamps: true,
  }
);

module.exports = PushSubscription;
