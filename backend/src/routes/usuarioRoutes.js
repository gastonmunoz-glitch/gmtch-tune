const express = require("express");
const router = express.Router();
const { permitirRoles } = require("../middleware/authMiddleware");

const {
  listarUsuarios,
  listarResponsables,
  actualizarPresenciaPropia,
  listarPresencia,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} = require("../controllers/usuarioController");

const ROLES_RESPONSABLES = [
  "OWNER",
  "ADMIN",
  "SUPERVISOR",
  "RECEPCION",
  "OPERADOR_SCANNER",
  "OPERADOR_ECU",
  "MECANICO",
  "TUNER",
];

router.get("/responsables", permitirRoles(...ROLES_RESPONSABLES), listarResponsables);
router.post("/me/presencia", actualizarPresenciaPropia);
router.get("/presencia", permitirRoles("OWNER"), listarPresencia);

router.get("/", permitirRoles("OWNER"), listarUsuarios);
router.post("/", permitirRoles("OWNER"), crearUsuario);
router.put("/:id", permitirRoles("OWNER"), actualizarUsuario);
router.patch("/:id", permitirRoles("OWNER"), actualizarUsuario);
router.delete("/:id", permitirRoles("OWNER"), eliminarUsuario);

module.exports = router;
