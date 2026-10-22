/**
 * Módulo para la gestión del estado del Carrito de Compras en TiendaPC.
 * Proporciona persistencia en localStorage, reactividad para la interfaz de usuario
 * y operaciones seguras sobre los artículos seleccionados.
 */

const STORAGE_KEY = 'tiendapc_cart';
const CART_CHANGE_EVENT = 'tiendapc:cart-change';

/**
 * Memoria caché en ejecución sincronizada con localStorage.
 * @type {Array<Object>}
 */
let cartCache = null;

/**
 * Conjunto de observadores/suscriptores que reaccionan a cambios en el carrito.
 * @type {Set<(cart: Array<Object>) => void>}
 */
const listeners = new Set();

/**
 * Lee y deserializa el carrito desde localStorage de manera segura.
 * @returns {Array<Object>}
 */
function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('Error al leer el carrito desde localStorage:', error);
    return [];
  }
}

/**
 * Guarda el carrito actual en localStorage y notifica a los suscriptores.
 * @param {Array<Object>} cart
 */
function saveCartToStorage(cart) {
  try {
    cartCache = cart;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error('Error al persistir el carrito en localStorage:', error);
  }
  notifyListeners();
}

/**
 * Emite la notificación de cambio a los observadores locales y eventos globales.
 */
function notifyListeners() {
  const currentCart = getCart();
  listeners.forEach((callback) => {
    try {
      callback(currentCart);
    } catch (err) {
      console.error('Error en listener del carrito:', err);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(CART_CHANGE_EVENT, {
        detail: {
          cart: currentCart,
          count: getCartCount(),
          total: getCartTotal()
        }
      })
    );
  }
}

// Sincronización entre pestañas del navegador mediante el evento 'storage'
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      cartCache = loadCartFromStorage();
      notifyListeners();
    }
  });
}

/**
 * Obtiene la lista actual de productos del carrito.
 * @returns {Array<{ _id: string, name: string, price: number, image: string, brand: string, category: string, stock: number, quantity: number }>}
 */
export function getCart() {
  if (cartCache === null) {
    cartCache = loadCartFromStorage();
  }
  // Retorna una copia superficial de los elementos para evitar mutaciones directas accidentales
  return cartCache.map((item) => ({ ...item }));
}

/**
 * Agrega un producto al carrito. Si ya existe, incrementa su cantidad.
 * @param {Object} product - Objeto con datos del producto
 * @param {number} [quantity=1] - Cantidad a añadir
 * @returns {Array<Object>} Lista actualizada del carrito
 */
export function addToCart(product, quantity = 1) {
  if (!product) return getCart();

  const id = String(product._id || product.id || '').trim();
  if (!id) {
    console.warn('addToCart: el producto no posee un ID válido.', product);
    return getCart();
  }

  const currentCart = getCart();
  const qtyToAdd = Math.max(1, Number(quantity) || 1);
  const maxStock = typeof product.stock === 'number' && !isNaN(product.stock) ? product.stock : Infinity;

  const existingIndex = currentCart.findIndex((item) => (item._id || item.id) === id);

  if (existingIndex > -1) {
    const existingItem = currentCart[existingIndex];
    const availableStock = typeof existingItem.stock === 'number' ? existingItem.stock : maxStock;
    const targetQty = existingItem.quantity + qtyToAdd;
    existingItem.quantity = Math.min(targetQty, availableStock > 0 ? availableStock : targetQty);
    
    // Si la info se actualizó, refrescamos detalles
    if (product.price) existingItem.price = Number(product.price);
    if (product.name) existingItem.name = product.name;
    if (product.image) existingItem.image = product.image;
  } else {
    const initialQty = Math.min(qtyToAdd, maxStock > 0 ? maxStock : qtyToAdd);
    currentCart.push({
      _id: id,
      name: product.name || 'Producto sin nombre',
      price: Number(product.price) || 0,
      image: product.image || '',
      brand: product.brand || '',
      category: product.category || '',
      stock: maxStock,
      quantity: initialQty
    });
  }

  saveCartToStorage(currentCart);
  return getCart();
}

/**
 * Elimina un producto del carrito por su ID.
 * @param {string} productId
 * @returns {Array<Object>} Lista actualizada del carrito
 */
export function removeFromCart(productId) {
  if (!productId) return getCart();
  const idStr = String(productId).trim();

  const currentCart = getCart();
  const updatedCart = currentCart.filter((item) => (item._id || item.id) !== idStr);

  saveCartToStorage(updatedCart);
  return getCart();
}

/**
 * Actualiza la cantidad de un producto específico.
 * Si newQuantity <= 0, el producto se elimina del carrito.
 * @param {string} productId
 * @param {number} newQuantity
 * @returns {Array<Object>} Lista actualizada del carrito
 */
export function updateQuantity(productId, newQuantity) {
  if (!productId) return getCart();
  const idStr = String(productId).trim();
  const targetQty = Number(newQuantity);

  if (isNaN(targetQty) || targetQty <= 0) {
    return removeFromCart(idStr);
  }

  const currentCart = getCart();
  const item = currentCart.find((it) => (it._id || it.id) === idStr);

  if (item) {
    const maxStock = typeof item.stock === 'number' && item.stock > 0 ? item.stock : Infinity;
    item.quantity = Math.min(targetQty, maxStock);
    saveCartToStorage(currentCart);
  }

  return getCart();
}

/**
 * Calcula y retorna el costo total acumulado del carrito ($).
 * @returns {number}
 */
export function getCartTotal() {
  const currentCart = getCart();
  return currentCart.reduce((acc, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    return acc + price * qty;
  }, 0);
}

/**
 * Calcula y retorna la cantidad total de artículos sumando las unidades de cada producto.
 * @returns {number}
 */
export function getCartCount() {
  const currentCart = getCart();
  return currentCart.reduce((acc, item) => {
    return acc + (Number(item.quantity) || 0);
  }, 0);
}

/**
 * Vacía completamente todos los productos del carrito.
 * @returns {Array<Object>} Lista vacía del carrito
 */
export function clearCart() {
  saveCartToStorage([]);
  return getCart();
}

/**
 * Suscribe una función para recibir actualizaciones cada vez que el carrito cambie.
 * @param {(cart: Array<Object>) => void} callback
 * @returns {() => void} Función para cancelar la suscripción
 */
export function onCartChange(callback) {
  if (typeof callback === 'function') {
    listeners.add(callback);
    // Ejecución inicial para sincronizar el estado actual
    try {
      callback(getCart());
    } catch (err) {
      console.error('Error al ejecutar callback inicial de onCartChange:', err);
    }
  }

  return () => {
    listeners.delete(callback);
  };
}
