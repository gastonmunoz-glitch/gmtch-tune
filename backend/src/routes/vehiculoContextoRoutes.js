const express = require("express");
const {
  obtenerContextoPatente,
} = require("../controllers/vehiculoContextoController");

const router = express.Router();

router.get("/:patente", obtenerContextoPatente);

module.exports = router;
