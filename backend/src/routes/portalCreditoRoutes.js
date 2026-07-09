const express = require("express");

const {
  obtenerCreditos,
  listarPaquetes,
  listarCompras,
  comprarCreditos,
  confirmarFlow,
  retornoFlow,
} = require("../controllers/portalCreditoController");

const router = express.Router();
const flowRouter = express.Router();

router.get("/", obtenerCreditos);
router.get("/paquetes", listarPaquetes);
router.post("/comprar", comprarCreditos);
router.get("/compras", listarCompras);

flowRouter.post("/confirmacion", confirmarFlow);
flowRouter.get("/retorno", retornoFlow);

module.exports = router;
module.exports.flowRouter = flowRouter;
