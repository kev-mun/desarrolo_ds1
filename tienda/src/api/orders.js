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

/**
 * Obtiene la lista completa de pedidos ordenados por fecha descendente.
 * @returns {Promise<{ count: number, data: Array<Object> }>}
 */
export async function getOrders() {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    let errorMessage = `Error al consultar pedidos (HTTP ${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData?.message) errorMessage = errorData.message;
    } catch {
      // Ignorar error JSON
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Obtiene el detalle de un pedido por su identificador único o número de orden.
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function getOrderById(id) {
  if (!id) throw new Error('Identificador de pedido no proporcionado.');

  const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(id)}`, {
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    let errorMessage = response.status === 404
      ? 'Pedido no encontrado'
      : `Error al obtener el pedido (HTTP ${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData?.message) errorMessage = errorData.message;
    } catch {
      // Ignorar error JSON
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Actualiza el estado de un pedido en el backend.
 * @param {string} id
 * @param {'pendiente'|'completado'|'cancelado'} status
 * @returns {Promise<{ message: string, order: Object }>}
 */
export async function updateOrderStatus(id, status) {
  const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    let errorMessage = `Error al actualizar estado (HTTP ${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData?.message) errorMessage = errorData.message;
    } catch {
      // Ignorar error JSON
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Elimina un pedido del sistema.
 * @param {string} id
 * @returns {Promise<{ message: string }>}
 */
export async function deleteOrder(id) {
  const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    let errorMessage = `Error al eliminar el pedido (HTTP ${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData?.message) errorMessage = errorData.message;
    } catch {
      // Ignorar error JSON
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return response.json();
}
