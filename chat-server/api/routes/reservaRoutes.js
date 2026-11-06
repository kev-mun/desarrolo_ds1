const express = require("express");
const router = express.Router();
const { crearReserva, getReservas, cancelarReserva, prestarReserva } = require("../controllers/reservaController");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

router.get("/", getReservas);
router.post("/", crearReserva);
router.patch("/:id/cancelar", cancelarReserva);
router.post("/:id/prestar", prestarReserva);

module.exports = router;
