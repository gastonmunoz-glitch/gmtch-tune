const express = require("express");
const router = express.Router();
const {
  crearCliente,
  obtenerClientes,
  obtenerClientePorId,
  actualizarCliente,
  eliminarCliente,
} = require("../controllers/clienteController");

router.get("/", obtenerClientes);
router.get("/:id", obtenerClientePorId);
router.post("/", crearCliente);
router.put("/:id", actualizarCliente);
router.patch("/:id", actualizarCliente);
router.delete("/:id", eliminarCliente);

module.exports = router;
