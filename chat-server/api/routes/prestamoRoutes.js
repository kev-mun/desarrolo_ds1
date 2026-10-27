const express = require("express");
const router = express.Router();
const {
  getPrestamos,
  createPrestamo
} = require("../controllers/prestamoController");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

router.get("/", getPrestamos);
router.post("/", createPrestamo);

module.exports = router;
