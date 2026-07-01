const express = require("express");
const { permitirRoles } = require("../middleware/authMiddleware");
const {
  obtenerStatusPush,
  obtenerVapidPublicKey,
  subscribe,
  unsubscribe,
  testPush,
  testCriticalPush,
} = require("../controllers/pushController");

const router = express.Router();

router.get("/status", obtenerStatusPush);
router.get("/vapid-public-key", obtenerVapidPublicKey);
router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);
router.post("/test", testPush);
router.post("/test-critical", permitirRoles("OWNER", "ADMIN"), testCriticalPush);

module.exports = router;
