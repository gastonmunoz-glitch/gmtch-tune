const express = require("express");
const {
  listarPortalConversaciones,
  obtenerPortalConversacion,
  crearPortalConversacion,
  responderPortalConversacion,
} = require("../controllers/portalMensajeController");

const router = express.Router();

router.get("/", listarPortalConversaciones);
router.post("/", crearPortalConversacion);
router.get("/:id", obtenerPortalConversacion);
router.post("/:id/responder", responderPortalConversacion);

module.exports = router;
