const Prestamo = require("../models/Prestamo");
const Ejemplar = require("../models/Ejemplar");
const { vencerReservas } = require("./reservas");

const DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_PARA_PERDIDO = 120;
const INTERVALO_MS = 60 * 1000;
let ultimaEjecucion = 0;

/**
 * - Préstamos activos con la fecha límite vencida pasan a "vencido".
 * - Ejemplares con un préstamo vencido hace más de 120 días sin devolver pasan a "perdido".
 * - Reservas listas cuyo plazo de 48 h venció pasan a "vencida" y el turno pasa al siguiente.
 */
async function actualizarEstados(ahora = new Date()) {
  const vencidos = await Prestamo.updateMany(
    { estado: "activo", fechaVencEsperada: { $lt: ahora } },
    { $set: { estado: "vencido" } }
  );

  const limite = new Date(ahora.getTime() - DIAS_PARA_PERDIDO * DIA_MS);
  const antiguos = await Prestamo.find({
    estado: "vencido",
    fechaDevolucionReal: null,
    fechaVencEsperada: { $lt: limite }
  }).select("ejemplar");

  let perdidos = 0;
  if (antiguos.length > 0) {
    const r = await Ejemplar.updateMany(
      { _id: { $in: antiguos.map((p) => p.ejemplar) }, estado: "prestado" },
      { $set: { estado: "perdido" } }
    );
    perdidos = r.modifiedCount;
  }

  await vencerReservas(ahora);

  return { vencidos: vencidos.modifiedCount, perdidos };
}

/** Igual que actualizarEstados, pero como máximo una vez por minuto (se usa al consultar). */
async function actualizarEstadosSiToca() {
  const ahora = Date.now();
  if (ahora - ultimaEjecucion < INTERVALO_MS) return null;
  ultimaEjecucion = ahora;
  return actualizarEstados(new Date(ahora));
}

module.exports = { actualizarEstados, actualizarEstadosSiToca, DIAS_PARA_PERDIDO };
