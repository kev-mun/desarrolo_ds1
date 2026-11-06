const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { login, register } = require("../controllers/authController");

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

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: process.env.NODE_ENV === "test" ? Infinity : 10, // 10 registros por hora por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Demasiados intentos de registro desde esta dirección IP. Por favor intente más tarde."
  }
});

router.post("/login", loginLimiter, login);
router.post("/register", registerLimiter, register);
router.post("/signup", registerLimiter, register);

module.exports = router;
