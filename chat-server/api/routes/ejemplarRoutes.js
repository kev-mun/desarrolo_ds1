const express = require("express");
const router = express.Router();
const {
  getEjemplares,
  createEjemplar,
  updateEjemplar,
  updateEstadoEjemplar
} = require("../controllers/ejemplarController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);

router.get("/", getEjemplares);
router.post("/", requireRole("admin", "bibliotecario"), createEjemplar);
router.put("/:id", requireRole("admin", "bibliotecario"), updateEjemplar);
router.patch("/:id/estado", requireRole("admin", "bibliotecario"), updateEstadoEjemplar);

module.exports = router;
