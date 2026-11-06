// Reglas de circulación (valores únicos para toda la biblioteca)
const PLAZO_DIAS = 7; // días de un préstamo y de cada renovación
const MAX_RENOVACIONES = 2; // renovaciones permitidas por préstamo

/**
 * Cantidad de reservas en espera sobre el libro de un ejemplar.
 * Provisional: todavía no existen las reservas; la fase de reservas reemplaza este cuerpo.
 */
async function reservasEnEspera(/* ejemplarId */) {
  return 0;
}

module.exports = { PLAZO_DIAS, MAX_RENOVACIONES, reservasEnEspera };
