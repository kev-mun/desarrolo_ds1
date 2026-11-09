// Borra las cuentas creadas por las pruebas de registro (Intruso, Intruso2, Intruso3, Prueba Uno, Corta...).
// Uso (desde chat-server):
//   node scripts/limpiar-usuarios-prueba.js            -> solo LISTA lo que borraría
//   node scripts/limpiar-usuarios-prueba.js --borrar   -> borra
// Solo toca correos con la forma  letras+números@test.com  y esos nombres. Escribe en la base de MONGODB_URI (.env).
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Usuario = require("../api/models/Usuario");

const NOMBRES = ["Intruso", "Intruso2", "Intruso3", "Prueba Uno", "Corta", "Solo nombre", "Probe Uno"];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const filtro = { correo: /^[a-z]+\d{5,}@test\.com$/, nombre: { $in: NOMBRES } };
  const lista = await Usuario.find(filtro).select("nombre correo rol");
  lista.forEach((u) => console.log(`${u.rol.padEnd(14)} ${u.correo}  (${u.nombre})`));
  console.log(`Coinciden: ${lista.length}`);
  if (process.argv.includes("--borrar")) {
    const r = await Usuario.deleteMany(filtro);
    console.log(`Borrados: ${r.deletedCount}`);
  } else {
    console.log("No se borró nada. Agrega --borrar para borrarlos.");
  }
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error("Error:", e.message);
  await mongoose.disconnect();
  process.exit(1);
});
