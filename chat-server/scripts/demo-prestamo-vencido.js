// Crea un préstamo YA VENCIDO (por defecto hace 10 días) para poder probar multas y dashboard.
// Uso (desde chat-server):  node scripts/demo-prestamo-vencido.js correo@del.usuario [diasVencido]
// Escribe en la base de datos que indique MONGODB_URI de tu .env.
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Usuario = require("../api/models/Usuario");
const Ejemplar = require("../api/models/Ejemplar");
const Prestamo = require("../api/models/Prestamo");

const DIA = 24 * 60 * 60 * 1000;

(async () => {
  const correo = (process.argv[2] || "").toLowerCase();
  const dias = Number(process.argv[3]) || 10;
  if (!correo) {
    console.error("Falta el correo del usuario. Ejemplo: node scripts/demo-prestamo-vencido.js alguien@correo.com 10");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const usuario = await Usuario.findOne({ correo });
  if (!usuario) throw new Error(`No existe un usuario con el correo ${correo}`);
  const ejemplar = await Ejemplar.findOneAndUpdate({ estado: "disponible" }, { $set: { estado: "prestado" } }, { returnDocument: "after" });
  if (!ejemplar) throw new Error("No hay ejemplares disponibles");
  const p = await Prestamo.create({
    ejemplar: ejemplar._id,
    usuario: usuario._id,
    fechaPrestamo: new Date(Date.now() - (dias + 7) * DIA),
    fechaVencEsperada: new Date(Date.now() - dias * DIA),
    estado: "vencido"
  });
  console.log(`Préstamo vencido creado (${dias} días) para ${usuario.nombre}: ${p._id}`);
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error("Error:", e.message);
  await mongoose.disconnect();
  process.exit(1);
});
