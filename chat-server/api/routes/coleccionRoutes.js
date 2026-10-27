const express = require("express");
const router = express.Router();
const {
  getColecciones,
  getLibrosPorColeccion,
  createColeccion,
  updateColeccion,
  deleteColeccion
} = require("../controllers/coleccionController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);

router.get("/", getColecciones);
router.get("/:id/libros", getLibrosPorColeccion);
router.post("/", requireRole("admin", "bibliotecario"), createColeccion);
router.put("/:id", requireRole("admin", "bibliotecario"), updateColeccion);
router.delete("/:id", requireRole("admin", "bibliotecario"), deleteColeccion);

module.exports = router;
