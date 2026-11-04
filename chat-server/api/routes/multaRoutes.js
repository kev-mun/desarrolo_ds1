const express = require("express");
const router = express.Router();
const { getMultas, pagarMulta } = require("../controllers/multaController");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

router.get("/", getMultas);
router.patch("/:id/pagar", pagarMulta);

module.exports = router;
