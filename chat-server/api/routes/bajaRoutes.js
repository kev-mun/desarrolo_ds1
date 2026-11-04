const express = require("express");
const router = express.Router();
const { darDeBaja } = require("../controllers/bajaController");
const { requireAuth } = require("../middleware/auth");

const soloPersonal = (req, res, next) => {
  if (req.usuario.rol === "admin" || req.usuario.rol === "bibliotecario") return next();
  return res.status(403).json({ message: "No tiene permisos para dar de baja ejemplares" });
};

// Se monta en /api/ejemplares antes de las rutas generales
router.patch("/:id/baja", requireAuth, soloPersonal, darDeBaja);

module.exports = router;
