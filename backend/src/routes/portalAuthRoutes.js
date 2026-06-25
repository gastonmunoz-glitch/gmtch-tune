const express = require("express");
const { loginPortal, mePortal } = require("../controllers/portalAuthController");
const { autenticarPortal } = require("../middleware/portalAuthMiddleware");

const router = express.Router();

router.post("/login", loginPortal);
router.get("/me", autenticarPortal, mePortal);

module.exports = router;
