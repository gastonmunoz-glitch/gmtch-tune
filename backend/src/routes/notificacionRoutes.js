const express = require("express");

const {
  obtenerNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
} = require("../controllers/notificacionController");

const router = express.Router();

router.get("/", obtenerNotificaciones);
router.patch("/marcar-todas-leidas", marcarTodasLeidas);
router.patch("/:id/leida", marcarLeida);

module.exports = router;
