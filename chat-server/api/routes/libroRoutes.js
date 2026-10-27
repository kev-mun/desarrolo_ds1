const express = require("express");
const router = express.Router();
const {
  getLibros,
  getLibroById,
  createLibro,
  updateLibro,
  deleteLibro
} = require("../controllers/libroController");
const { requireAuth, requirePermiso } = require("../middleware/auth");

router.use(requireAuth);

router.get("/", getLibros);
router.get("/:id", getLibroById);
router.post("/", requirePermiso("gestionar_libros"), createLibro);
router.put("/:id", requirePermiso("gestionar_libros"), updateLibro);
router.delete("/:id", requirePermiso("gestionar_libros"), deleteLibro);

module.exports = router;
