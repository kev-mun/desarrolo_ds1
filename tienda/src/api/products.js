const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  console.warn('VITE_API_URL no está definida en las variables de entorno.');
}

/**
 * Obtiene el listado de productos aplicando filtros y paginación.
 * @param {Record<string, string|number>} [params={}]
 * @returns {Promise<{ data: Array, pagination: { page: number, limit: number, total: number, pages: number } }>}
 */
export async function getProducts(params = {}) {
  const url = new URL(`${API_BASE_URL}/products`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      url.searchParams.append(key, String(value).trim());
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    let errorMessage = `Error al consultar productos (HTTP ${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData?.message) errorMessage = errorData.message;
    } catch {
      // Ignorar error al parsear JSON
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Obtiene el detalle de un producto por su identificador único.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function getProductById(id) {
  if (!id) {
    const error = new Error('Identificador de producto no especificado.');
    error.status = 400;
    throw error;
  }

  const response = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`, {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    let errorMessage = response.status === 404
      ? 'Producto no encontrado'
      : `Error al obtener el producto (HTTP ${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData?.message) errorMessage = errorData.message;
    } catch {
      // Ignorar error al parsear JSON
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return response.json();
}
