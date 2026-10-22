const express = require("express");
const router = express.Router();
const userRoutes = require("./userRoutes");
const productRoutes = require("./productRoutes");
const orderRoutes = require("./orderRoutes");

router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);

router.get("/status", (req, res) => {
  res.json({
    status: "online",
    message: "Servidor Express conectado exitosamente",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

module.exports = router;
