const express = require("express");
const router = express.Router();
const { getDashboard, refrescarDashboard } = require("../controllers/dashboardController");
const { requireAuth } = require("../middleware/auth");

const soloPersonal = (req, res, next) => {
  if (req.usuario.rol === "admin" || req.usuario.rol === "bibliotecario") return next();
  return res.status(403).json({ message: "No tiene permisos para ver el dashboard" });
};

router.use(requireAuth, soloPersonal);

router.get("/", getDashboard);
router.post("/refrescar", refrescarDashboard);

module.exports = router;
