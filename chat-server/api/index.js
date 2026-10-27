const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 8080;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor de la Biblioteca corriendo en http://localhost:${PORT}`);
  });
});
