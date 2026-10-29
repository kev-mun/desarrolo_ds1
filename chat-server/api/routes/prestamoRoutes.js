const express = require("express");
const router = express.Router();
const {
  getPrestamos,
  createPrestamo,
  devolverPrestamo
} = require("../controllers/prestamoController");
const { requireAuth } = require("../middleware/auth");

// Solo el personal de la biblioteca puede registrar devoluciones
const soloPersonal = (req, res, next) => {
  if (["admin", "bibliotecario"].includes(req.usuario.rol)) return next();
  return res.status(403).json({ message: "No tiene permisos para realizar esta acción" });
};

router.use(requireAuth);

router.get("/", getPrestamos);
router.post("/", createPrestamo);
router.patch("/:id/devolver", soloPersonal, devolverPrestamo);

module.exports = router;