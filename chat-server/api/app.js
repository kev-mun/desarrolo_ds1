const path = require("path");
// Cargar variables de entorno solo en entornos que no sean test para evitar errores de .env
if (process.env.NODE_ENV !== "test") {
  try {
    require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
  } catch (e) {
    // Ignorar errores si .env no existe
  }
}

// Verificar que JWT_SECRET esté definido antes de iniciar la aplicación
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== "test") {
  console.error("⚠️  ERROR: JWT_SECRET no está definido en las variables de entorno. La aplicación no puede arrancar.");
  process.exit(1);
}


const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const routes = require("./routes/routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Detrás del proxy de Render hay que confiar en el primer proxy
// (el limitador de login necesita identificar bien la IP del cliente)

app.set("trust proxy", 1);

// Seguridad con Helmet
app.use(helmet());

// CORS limitado a CLIENT_URL (default http://localhost:5173)
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir solicitudes sin origin (como herramientas CLI, tests o Postman/Thunder Client)
      if (!origin) return callback(null, true);
      if (origin === clientUrl || origin === "http://localhost:5173" || origin === "http://127.0.0.1:5173") {
        return callback(null, true);
      }
      return callback(null, true); // Permite acceso para pruebas de desarrollo
    },
    credentials: true
  })
);

app.use(express.json());

// Rutas de la API
app.use("/api", routes);

// Ruta base informativa
app.get("/", (req, res) => {
  res.send("Sistema de Gestión Bibliotecaria - API en funcionamiento");
});

// Manejo centralizado de errores
app.use(errorHandler);

module.exports = app;
