const express = require("express");

const {
  listarBitacoraOperativa,
  crearBitacoraOperativa,
  actualizarBitacoraOperativa,
  resolverBitacoraOperativa,
} = require("../controllers/bitacoraOperativaController");

const router = express.Router();

router.get("/", listarBitacoraOperativa);
router.post("/", crearBitacoraOperativa);
router.patch("/:id/resolver", resolverBitacoraOperativa);
router.patch("/:id", actualizarBitacoraOperativa);

module.exports = router;
