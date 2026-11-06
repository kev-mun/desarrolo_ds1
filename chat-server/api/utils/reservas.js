const Ejemplar = require("../models/Ejemplar");
const Reserva = require("../models/Reserva");

const HORAS_RETENCION = 48; // plazo para pedir el préstamo cuando la reserva queda lista
const HORA_MS = 60 * 60 * 1000;

/**
 * Si el libro tiene reservas en espera y un ejemplar disponible, aparta el ejemplar
 * para el primero de la cola (por orden de llegada) y le da HORAS_RETENCION horas.
 */
async function asignarSiguiente(libroId, ahora = new Date()) {
  if (!(await Reserva.exists({ libro: libroId, estado: "en_espera" }))) return null;

  const ejemplar = await Ejemplar.findOneAndUpdate(
    { libro: libroId, estado: "disponible" },
    { $set: { estado: "reservado" } },
    { returnDocument: "after" }
  );
  if (!ejemplar) return null;

  const reserva = await Reserva.findOneAndUpdate(
    { libro: libroId, estado: "en_espera" },
    { $set: { estado: "lista", ejemplar: ejemplar._id, fechaLimite: new Date(ahora.getTime() + HORAS_RETENCION * HORA_MS) } },
    { sort: { createdAt: 1 }, returnDocument: "after" }
  );
  if (!reserva) {
    // la cola se vació entre las dos operaciones: se libera el ejemplar
    await Ejemplar.updateOne({ _id: ejemplar._id, estado: "reservado" }, { $set: { estado: "disponible" } });
    return null;
  }
  return reserva;
}

/** Libera el ejemplar apartado de una reserva y se lo ofrece al siguiente de la cola. */
async function liberarYReasignar(reserva, ahora = new Date()) {
  if (reserva.ejemplar) {
    await Ejemplar.updateOne({ _id: reserva.ejemplar, estado: "reservado" }, { $set: { estado: "disponible" } });
  }
  return asignarSiguiente(reserva.libro, ahora);
}

/** Reservas listas cuyo plazo venció: pasan a "vencida" y el turno pasa al siguiente. */
async function vencerReservas(ahora = new Date()) {
  const pendientes = await Reserva.find({ estado: "lista", fechaLimite: { $lt: ahora } });
  let vencidas = 0;
  for (const r of pendientes) {
    const marcada = await Reserva.findOneAndUpdate({ _id: r._id, estado: "lista" }, { $set: { estado: "vencida" } }, { returnDocument: "after" });
    if (marcada) {
      vencidas++;
      await liberarYReasignar(marcada, ahora);
    }
  }
  return vencidas;
}

module.exports = { HORAS_RETENCION, asignarSiguiente, liberarYReasignar, vencerReservas };
