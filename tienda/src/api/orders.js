const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  console.warn('VITE_API_URL no está definida en las variables de entorno.');
}

/**
 * Envía un pedido al backend para validación segura y persistencia en MongoDB.
 * @param {Object} payload
 * @param {Object} payload.customer - Datos del cliente ({ name, address, phone, email, notes })
 * @param {Array<{ productId: string, quantity: number }>} payload.items - Lista de artículos del carrito
 * @returns {Promise<{ message: string, order: Object }>}
 */
export async function createOrder(payload) {
  if (!payload || !payload.customer || !Array.isArray(payload.items) || payload.items.length === 0) {
    const error = new Error('Los datos del pedido o los productos seleccionados están incompletos.');
    error.status = 400;
    throw error;
  }

  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errorMessage = `Error al registrar el pedido (HTTP ${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData?.message) errorMessage = errorData.message;
    } catch {
      // Ignorar fallo al parsear JSON
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return response.json();
}
