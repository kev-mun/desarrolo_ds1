/**
 * Mapeo de Public IDs de Cloudinary por título de libro o clave conocida
 */
export const CLOUDINARY_IDS = {
  "cien anos de soledad": "cien",
  "cien años de soledad": "cien",
  "patrones de diseno": "diseño",
  "patrones de diseño": "diseño",
  "dune": "dune",
  "estructura e interpretacion de programas de computadora": "estructura",
  "estructura e interpretación de programas de computadora": "estructura",
  "fahrenheit 451": "faren",
  "ficciones": "ficciones",
  "clean code": "clean-code",
  "codigo limpio (clean code)": "clean-code",
  "código limpio (clean code)": "clean-code",
  "el laberinto de la soledad": "laberinto",
  "don quijote de la mancha": "mancha",
  "neuromante": "neuro",
  "sapiens": "sapiesn",
  "sapiens: de animales a dioses": "sapiesn",
  "la sombra del viento": "viento"
};

const DEFAULT_CLOUD_NAME = "fs67c4g1";

/**
 * Obtiene el nombre del cloud de Cloudinary desde variables de entorno o fallback.
 */
export function getCloudinaryCloudName() {
  return (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) || DEFAULT_CLOUD_NAME;
}

/**
 * Construye la URL dinámica de Cloudinary para un publicId dado.
 * Formato: https://res.cloudinary.com/TU_CLOUD_NAME/image/upload/NOMBRE_PUBLIC_ID.jpg
 */
export function buildCloudinaryUrl(publicId, cloudName = getCloudinaryCloudName()) {
  if (!publicId) return "";
  // Si ya es una URL completa, devolverla tal cual
  if (publicId.startsWith("http://") || publicId.startsWith("https://")) {
    return publicId;
  }
  // Limpiar extensión si viniera incluida para garantizar .jpg final
  const idLimpio = publicId.replace(/\.[a-zA-Z0-9]+$/, "");
  return `https://res.cloudinary.com/${cloudName}/image/upload/${idLimpio}.jpg`;
}

/**
 * Resuelve la URL de la portada del libro:
 * 1. libro.cloudinaryId o libro.publicId si existen
 * 2. Mapeo por título conocido
 * 3. libro.imagenUrl o libro.portada si ya existen
 */
export function getUrlPortadaLibro(libro) {
  if (!libro) return "";

  // 1. Identificador directo de Cloudinary en el libro
  if (libro.cloudinaryId) {
    return buildCloudinaryUrl(libro.cloudinaryId);
  }
  if (libro.publicId) {
    return buildCloudinaryUrl(libro.publicId);
  }

  // 2. Mapeo dinámico por título
  const tituloNorm = (libro.titulo || "").trim().toLowerCase();
  if (CLOUDINARY_IDS[tituloNorm]) {
    return buildCloudinaryUrl(CLOUDINARY_IDS[tituloNorm]);
  }

  // Buscar coincidencia parcial si el título contiene alguna de las claves
  for (const [clave, publicId] of Object.entries(CLOUDINARY_IDS)) {
    if (tituloNorm.includes(clave) || clave.includes(tituloNorm)) {
      return buildCloudinaryUrl(publicId);
    }
  }

  // 3. Fallback a imagenUrl o portada existente
  if (libro.imagenUrl) {
    return buildCloudinaryUrl(libro.imagenUrl);
  }
  if (libro.portada) {
    return buildCloudinaryUrl(libro.portada);
  }

  return "";
}

