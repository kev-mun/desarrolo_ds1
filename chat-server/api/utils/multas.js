/**
 * Reglas de multas por retraso (días hábiles = lunes a viernes).
 *   1.er día de atraso ........ 1.000 COP
 *   2.º al 7.º día ............ 2.500 COP
 *   8.º día en adelante ....... 2.500 COP + 100 COP por cada día desde el 8.º
 */
const MULTA_DIA_1 = 1000;
const MULTA_DIA_2_7 = 2500;
const MULTA_EXTRA_DIA = 100;

function inicioDelDia(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Cuenta los días hábiles transcurridos después de la fecha límite, hasta la devolución (inclusive). */
function diasHabilesAtraso(fechaVenc, fechaDevolucion) {
  const inicio = inicioDelDia(fechaVenc);
  const fin = inicioDelDia(fechaDevolucion);
  let dias = 0;
  const cursor = new Date(inicio);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor <= fin) {
    const dia = cursor.getDay();
    if (dia !== 0 && dia !== 6) dias++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

function calcularMonto(diasHabiles) {
  if (!diasHabiles || diasHabiles <= 0) return 0;
  if (diasHabiles === 1) return MULTA_DIA_1;
  if (diasHabiles <= 7) return MULTA_DIA_2_7;
  return MULTA_DIA_2_7 + MULTA_EXTRA_DIA * (diasHabiles - 7);
}

module.exports = { diasHabilesAtraso, calcularMonto };
