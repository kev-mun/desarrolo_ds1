// Cambia la contraseña de un usuario directamente en la base de datos de MONGODB_URI (.env).
// Uso (desde chat-server):
//   node scripts/cambiar-password.js --listar
//   $env:NUEVA_PASSWORD="UnaClaveLarga#2026"; node scripts/cambiar-password.js correo@del.usuario; Remove-Item Env:NUEVA_PASSWORD
// La contraseña viaja en una variable de entorno para que no quede escrita en el código ni en el repositorio.
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Usuario = require("../api/models/Usuario");

(async () => {
  const arg = (process.argv[2] || "").toLowerCase();
  if (!arg) {
    console.error("Uso: node scripts/cambiar-password.js --listar   |   node scripts/cambiar-password.js correo");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  if (arg === "--listar") {
    const lista = await Usuario.find().select("nombre correo rol estado").sort({ rol: 1, correo: 1 });
    lista.forEach((u) => console.log(`${u.rol.padEnd(14)} ${u.estado.padEnd(11)} ${u.correo}  (${u.nombre})`));
    console.log(`Total: ${lista.length}`);
  } else {
    const nueva = process.env.NUEVA_PASSWORD || "";
    if (nueva.length < 10) throw new Error("Define NUEVA_PASSWORD con al menos 10 caracteres.");
    const usuario = await Usuario.findOne({ correo: arg }).select("+password");
    if (!usuario) throw new Error(`No existe un usuario con el correo ${arg}`);
    usuario.password = nueva; // se cifra con bcrypt en el pre('save')
    await usuario.save();
    console.log(`Contraseña actualizada para ${usuario.correo} (${usuario.rol}).`);
  }
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error("Error:", e.message);
  await mongoose.disconnect();
  process.exit(1);
});
