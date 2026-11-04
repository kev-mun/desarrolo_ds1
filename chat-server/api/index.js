const app = require("./app");
const connectDB = require("./config/db");
const { actualizarEstados } = require("./utils/estados");

const PORT = process.env.PORT || 8080;

connectDB().then(() => {
  actualizarEstados().catch(console.error);
  setInterval(() => actualizarEstados().catch(console.error), 60 * 60 * 1000);

  app.listen(PORT, () => {
    console.log(`Servidor de la Biblioteca corriendo en http://localhost:${PORT}`);
  });
});
