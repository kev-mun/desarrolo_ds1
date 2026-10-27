const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const usuarioRoutes = require("./usuarioRoutes");
const coleccionRoutes = require("./coleccionRoutes");
const libroRoutes = require("./libroRoutes");
const ejemplarRoutes = require("./ejemplarRoutes");
const prestamoRoutes = require("./prestamoRoutes");

router.use("/auth", authRoutes);
router.use("/usuarios", usuarioRoutes);
router.use("/colecciones", coleccionRoutes);
router.use("/libros", libroRoutes);
router.use("/ejemplares", ejemplarRoutes);
router.use("/prestamos", prestamoRoutes);

router.get("/status", (req, res) => {
  res.json({
    status: "online",
    sistema: "Sistema de Gestión Bibliotecaria",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

module.exports = router;
