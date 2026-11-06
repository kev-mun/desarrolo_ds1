const express = require("express");
const router = express.Router();
const {
  getPrestamos,
  createPrestamo,
  devolverPrestamo,
  renovarPrestamo
} = require("../controllers/prestamoController");
const { requireAuth } = require("../middleware/auth");

const soloPersonal = (req, res, next) => {
  if (req.usuario.rol === "admin" || req.usuario.rol === "bibliotecario") return next();
  return res.status(403).json({ message: "No tiene permisos para esta operación" });
};

router.use(requireAuth);

router.get("/", getPrestamos);
router.post("/", createPrestamo);
router.patch("/:id/devolver", soloPersonal, devolverPrestamo);
router.post("/:id/renovar", renovarPrestamo);

module.exports = router;
