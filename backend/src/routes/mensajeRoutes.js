const express = require("express");
const { permitirRoles } = require("../middleware/authMiddleware");
const {
  listarConversaciones,
  obtenerConversacion,
  responderConversacion,
  asignarConversacion,
  cambiarEstadoConversacion,
  cerrarConversacion,
} = require("../controllers/mensajeController");

const router = express.Router();

const ROLES_BANDEJA = [
  "OWNER",
  "ADMIN",
  "SUPERVISOR",
  "RECEPCION",
  "OPERADOR_ECU",
  "TUNER",
];

router.get("/conversaciones", permitirRoles(...ROLES_BANDEJA), listarConversaciones);
router.get("/conversaciones/:id", permitirRoles(...ROLES_BANDEJA), obtenerConversacion);
router.post(
  "/conversaciones/:id/responder",
  permitirRoles(...ROLES_BANDEJA),
  responderConversacion
);
router.patch(
  "/conversaciones/:id/asignar",
  permitirRoles("OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"),
  asignarConversacion
);
router.patch(
  "/conversaciones/:id/estado",
  permitirRoles(...ROLES_BANDEJA),
  cambiarEstadoConversacion
);
router.patch(
  "/conversaciones/:id/cerrar",
  permitirRoles(...ROLES_BANDEJA),
  cerrarConversacion
);

module.exports = router;
