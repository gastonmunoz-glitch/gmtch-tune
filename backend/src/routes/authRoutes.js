const express = require("express");
const router = express.Router();

const { login, me } = require("../controllers/authController");
const { autenticar } = require("../middleware/authMiddleware");

router.get("/test", (req, res) => {
  res.json({
    ok: true,
    message: "Ruta auth funcionando correctamente",
  });
});

router.post("/login", login);
router.get("/me", autenticar, me);

module.exports = router;