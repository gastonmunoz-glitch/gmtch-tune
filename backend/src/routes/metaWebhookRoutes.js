const express = require("express");
const {
  recibirWebhookMeta,
  verificarWebhookMeta,
} = require("../controllers/metaWebhookController");

const router = express.Router();

router.get("/", verificarWebhookMeta);
router.post("/", recibirWebhookMeta);

module.exports = router;
