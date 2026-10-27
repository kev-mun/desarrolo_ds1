const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { login } = require("../controllers/authController");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === "test" ? Infinity : 10, // 10 intentos fallidos
  skipSuccessfulRequests: true, // solo cuentan los intentos fallidos
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Demasiados intentos de inicio de sesión. Por favor intente más tarde."
  }
});

router.post("/login", loginLimiter, login);

module.exports = router;
