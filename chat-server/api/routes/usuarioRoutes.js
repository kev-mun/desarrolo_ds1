const express = require("express");
const router = express.Router();
const {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  updateEstadoUsuario,
  updatePermisosUsuario
} = require("../controllers/usuarioController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);

router.get("/", requireRole("admin", "bibliotecario"), getUsuarios);
router.get("/:id", requireRole("admin", "bibliotecario"), getUsuarioById);
router.post("/", requireRole("admin", "bibliotecario"), createUsuario);
router.put("/:id", requireRole("admin", "bibliotecario"), updateUsuario);
router.patch("/:id/estado", requireRole("admin", "bibliotecario"), updateEstadoUsuario);
router.put("/:id/permisos", requireRole("admin"), updatePermisosUsuario);

module.exports = router;
