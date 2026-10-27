/**
 * Generate a RegExp that matches the search text in a case-insensitive and accent-insensitive way.
 * It escapes regex special characters, removes diacritics, and replaces each vowel (and n) with a
 * character class that includes the common accented variants.
 *
 * Example: 'garcia' → /[g][aáàäâ][r][c][iíìïî][aáàäâ]/i
 */
function crearRegexBusqueda(text) {
  if (!text) return /./i; // match anything if empty
  // Escape regex special characters
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Normalise and strip diacritics
  const normalized = escaped.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const map = {
    a: "[aáàäâ]",
    e: "[eéèëê]",
    i: "[iíìïî]",
    o: "[oóòöô]",
    u: "[uúùüû]",
    n: "[nñ]"
  };
  const pattern = normalized.replace(/[aeioun]/gi, (c) => map[c.toLowerCase()] || c);
  return new RegExp(pattern, "i");
}
module.exports = { crearRegexBusqueda };
