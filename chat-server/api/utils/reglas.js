// Reglas de circulación (valores únicos para toda la biblioteca)
const PLAZO_DIAS = 7; // días de un préstamo y de cada renovación
const MAX_RENOVACIONES = 2; // renovaciones permitidas por préstamo

/** Cantidad de reservas en espera sobre el libro de un ejemplar (si hay, no se puede renovar). */
async function reservasEnEspera(ejemplarId) {
  const Ejemplar = require("../models/Ejemplar");
  const Reserva = require("../models/Reserva");
  const ejemplar = await Ejemplar.findById(ejemplarId).select("libro");
  if (!ejemplar) return 0;
  return Reserva.countDocuments({ libro: ejemplar.libro, estado: "en_espera" });
}

module.exports = { PLAZO_DIAS, MAX_RENOVACIONES, reservasEnEspera };
