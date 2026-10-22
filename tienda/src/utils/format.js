/**
 * Formatea un número o string numérico a moneda colombiana (COP) sin decimales.
 * @param {number|string} amount
 * @returns {string}
 */
export function formatPrice(amount) {
  const numericAmount = typeof amount === 'number' ? amount : Number(amount) || 0;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(numericAmount);
}

/**
 * Diccionario de categorías legibles en español.
 */
export const CATEGORY_LABELS = {
  'portatiles': 'Portátiles',
  'procesadores': 'Procesadores',
  'tarjetas-graficas': 'Tarjetas Gráficas',
  'memoria-ram': 'Memoria RAM',
  'almacenamiento': 'Almacenamiento',
  'placas-base': 'Placas Base',
  'fuentes-poder': 'Fuentes de Poder',
  'monitores': 'Monitores',
  'perifericos': 'Periféricos'
};

/**
 * Retorna el nombre legible de una categoría dada su clave técnica.
 * @param {string} categoryKey
 * @returns {string}
 */
export function formatCategory(categoryKey) {
  return CATEGORY_LABELS[categoryKey] || categoryKey || 'General';
}
