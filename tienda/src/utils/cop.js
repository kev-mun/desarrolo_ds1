const moneda = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/** 2500 -> "$ 2.500" (pesos colombianos) */
export function cop(valor) {
  return moneda.format(Number(valor) || 0);
}

/** Fecha corta en español; vacío si no hay fecha válida. */
export function fechaCorta(valor) {
  if (!valor) return "—";
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
}

export const ESTADOS_EJEMPLAR_TEXTO = {
  disponible: "Disponible",
  prestado: "Prestado",
  reservado: "Reservado",
  perdido: "Perdido",
  dado_de_baja: "Dado de baja",
  danado: "Dañado",
  extraviado: "Extraviado",
};

export function textoEstadoEjemplar(estado) {
  return ESTADOS_EJEMPLAR_TEXTO[estado] || estado || "—";
}
