import { getCart, removeFromCart, updateQuantity, clearCart, getCartTotal, getCartCount, onCartChange } from '../utils/cart.js';
import { formatPrice, formatCategory } from '../utils/format.js';
import { showToast } from '../utils/toast.js';
import { openCheckoutModal } from './checkoutModal.js';

let drawerElement = null;
let isOpen = false;

/**
 * Inicializa y devuelve la estructura del Drawer/Modal de Carrito.
 * @returns {HTMLElement}
 */
export function createCartDrawer() {
  if (drawerElement) return drawerElement;

  const overlay = document.createElement('div');
  overlay.className = 'cart-drawer-overlay';
  overlay.id = 'cart-drawer-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const drawer = document.createElement('aside');
  drawer.className = 'cart-drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-label', 'Carrito de compras');
  drawer.id = 'cart-drawer';

  // 1. Header
  const header = document.createElement('div');
  header.className = 'cart-drawer__header';

  const headerTitleWrap = document.createElement('div');
  headerTitleWrap.className = 'cart-drawer__title-wrap';

  const headerIcon = document.createElement('div');
  headerIcon.className = 'cart-drawer__header-icon';
  headerIcon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  `;

  const headerTitle = document.createElement('h2');
  headerTitle.className = 'cart-drawer__title';
  headerTitle.textContent = 'Tu Carrito';

  const headerBadge = document.createElement('span');
  headerBadge.className = 'cart-drawer__count-badge';
  headerBadge.id = 'cart-drawer-count';
  headerBadge.textContent = '0';

  headerTitleWrap.appendChild(headerIcon);
  headerTitleWrap.appendChild(headerTitle);
  headerTitleWrap.appendChild(headerBadge);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'cart-drawer__close-btn';
  closeBtn.setAttribute('aria-label', 'Cerrar carrito');
  closeBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  closeBtn.addEventListener('click', closeCart);

  header.appendChild(headerTitleWrap);
  header.appendChild(closeBtn);

  // 2. Body (Listado o Empty State)
  const body = document.createElement('div');
  body.className = 'cart-drawer__body';
  body.id = 'cart-drawer-body';

  // 3. Footer (Totales y Botones)
  const footer = document.createElement('div');
  footer.className = 'cart-drawer__footer';
  footer.id = 'cart-drawer-footer';

  drawer.appendChild(header);
  drawer.appendChild(body);
  drawer.appendChild(footer);
  overlay.appendChild(drawer);

  // Cerrar al hacer clic en el fondo oscuro
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeCart();
    }
  });

  // Cerrar con tecla Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeCart();
    }
  });

  drawerElement = overlay;

  // Suscribirse a cambios en el carrito para actualizar la vista en tiempo real
  onCartChange(() => {
    renderCartContents();
  });

  // Render inicial
  renderCartContents();

  return overlay;
}

/**
 * Renderiza el contenido interno del carrito (items o empty state y footer).
 */
function renderCartContents() {
  if (!drawerElement) return;

  const body = drawerElement.querySelector('#cart-drawer-body');
  const footer = drawerElement.querySelector('#cart-drawer-footer');
  const badge = drawerElement.querySelector('#cart-drawer-count');

  if (!body || !footer) return;

  const items = getCart();
  const totalCount = getCartCount();
  const totalPrice = getCartTotal();

  if (badge) {
    badge.textContent = `${totalCount} ${totalCount === 1 ? 'artículo' : 'artículos'}`;
  }

  body.innerHTML = '';
  footer.innerHTML = '';

  // ESTADO VACÍO
  if (items.length === 0) {
    footer.style.display = 'none';

    const emptyBox = document.createElement('div');
    emptyBox.className = 'cart-empty-state';

    const iconCircle = document.createElement('div');
    iconCircle.className = 'cart-empty-state__icon';
    iconCircle.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>
    `;

    const title = document.createElement('h3');
    title.className = 'cart-empty-state__title';
    title.textContent = 'Tu carrito está vacío';

    const text = document.createElement('p');
    text.className = 'cart-empty-state__text';
    text.textContent = 'Aún no has añadido ningún producto. Explora nuestro catálogo y descubre lo último en hardware y tecnología.';

    const exploreBtn = document.createElement('a');
    exploreBtn.href = '#/';
    exploreBtn.className = 'btn btn-primary';
    exploreBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
      <span>Explorar Catálogo</span>
    `;
    exploreBtn.addEventListener('click', () => {
      closeCart();
    });

    emptyBox.appendChild(iconCircle);
    emptyBox.appendChild(title);
    emptyBox.appendChild(text);
    emptyBox.appendChild(exploreBtn);

    body.appendChild(emptyBox);
    return;
  }

  // ESTADO CON PRODUCTOS
  footer.style.display = 'flex';

  const list = document.createElement('div');
  list.className = 'cart-items-list';

  items.forEach((item) => {
    const itemRow = document.createElement('article');
    itemRow.className = 'cart-item';
    itemRow.setAttribute('data-id', item._id);

    // Miniatura
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'cart-item__image-wrap';

    const img = document.createElement('img');
    img.className = 'cart-item__image';
    img.src = item.image || 'https://placehold.co/120x120?text=Hardware';
    img.alt = item.name;
    img.width = 68;
    img.height = 68;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.src = 'https://placehold.co/120x120?text=Hardware';
    });
    imgWrapper.appendChild(img);

    // Información
    const info = document.createElement('div');
    info.className = 'cart-item__info';

    const categoryText = document.createElement('span');
    categoryText.className = 'cart-item__category';
    categoryText.textContent = formatCategory(item.category);

    const nameLink = document.createElement('a');
    nameLink.href = `#/producto/${encodeURIComponent(item._id)}`;
    nameLink.className = 'cart-item__name';
    nameLink.textContent = item.name;
    nameLink.title = item.name;
    nameLink.addEventListener('click', () => {
      closeCart();
    });

    const unitPrice = document.createElement('span');
    unitPrice.className = 'cart-item__unit-price';
    unitPrice.textContent = `${formatPrice(item.price)} c/u`;

    info.appendChild(categoryText);
    info.appendChild(nameLink);
    info.appendChild(unitPrice);

    // Controles de cantidad y Subtotal
    const controlsWrap = document.createElement('div');
    controlsWrap.className = 'cart-item__controls-wrap';

    const qtyControls = document.createElement('div');
    qtyControls.className = 'cart-item__quantity-controls';

    // Botón Disminuir
    const minusBtn = document.createElement('button');
    minusBtn.type = 'button';
    minusBtn.className = 'cart-item__qty-btn';
    minusBtn.setAttribute('aria-label', `Disminuir cantidad de ${item.name}`);
    minusBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    `;
    minusBtn.addEventListener('click', () => {
      updateQuantity(item._id, item.quantity - 1);
    });

    // Indicador Cantidad
    const qtyValue = document.createElement('span');
    qtyValue.className = 'cart-item__qty-value';
    qtyValue.textContent = String(item.quantity);

    // Botón Aumentar
    const plusBtn = document.createElement('button');
    plusBtn.type = 'button';
    plusBtn.className = 'cart-item__qty-btn';
    plusBtn.setAttribute('aria-label', `Aumentar cantidad de ${item.name}`);
    plusBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    `;
    const isAtMaxStock = typeof item.stock === 'number' && item.quantity >= item.stock;
    if (isAtMaxStock) {
      plusBtn.disabled = true;
      plusBtn.title = 'Stock máximo alcanzado';
    }
    plusBtn.addEventListener('click', () => {
      if (!isAtMaxStock) {
        updateQuantity(item._id, item.quantity + 1);
      }
    });

    qtyControls.appendChild(minusBtn);
    qtyControls.appendChild(qtyValue);
    qtyControls.appendChild(plusBtn);

    // Subtotal de la fila
    const subtotal = document.createElement('div');
    subtotal.className = 'cart-item__subtotal';
    subtotal.textContent = formatPrice(item.price * item.quantity);

    // Botón eliminar
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'cart-item__remove-btn';
    removeBtn.setAttribute('aria-label', `Eliminar ${item.name} del carrito`);
    removeBtn.title = 'Eliminar del carrito';
    removeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    `;
    removeBtn.addEventListener('click', () => {
      removeFromCart(item._id);
      showToast({
        title: 'Producto eliminado',
        message: `${item.name} fue retirado de tu carrito.`,
        type: 'info'
      });
    });

    controlsWrap.appendChild(qtyControls);
    controlsWrap.appendChild(subtotal);
    controlsWrap.appendChild(removeBtn);

    itemRow.appendChild(imgWrapper);
    itemRow.appendChild(info);
    itemRow.appendChild(controlsWrap);

    list.appendChild(itemRow);
  });

  body.appendChild(list);

  // FOOTER CON DETALLES DE PAGO
  const summaryBox = document.createElement('div');
  summaryBox.className = 'cart-summary';

  const subtotalRow = document.createElement('div');
  subtotalRow.className = 'cart-summary__row';
  subtotalRow.innerHTML = `
    <span>Subtotal</span>
    <span>${formatPrice(totalPrice)}</span>
  `;

  const shippingRow = document.createElement('div');
  shippingRow.className = 'cart-summary__row';
  shippingRow.innerHTML = `
    <span>Envío nacional</span>
    <span class="cart-summary__free-shipping">¡Gratis!</span>
  `;

  const divider = document.createElement('div');
  divider.className = 'cart-summary__divider';

  const totalRow = document.createElement('div');
  totalRow.className = 'cart-summary__row cart-summary__row--total';
  totalRow.innerHTML = `
    <span>Total</span>
    <span class="cart-summary__total-value">${formatPrice(totalPrice)}</span>
  `;

  summaryBox.appendChild(subtotalRow);
  summaryBox.appendChild(shippingRow);
  summaryBox.appendChild(divider);
  summaryBox.appendChild(totalRow);

  // Botones de acción
  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'cart-drawer__actions';

  const checkoutBtn = document.createElement('button');
  checkoutBtn.type = 'button';
  checkoutBtn.className = 'btn btn-primary btn-block cart-drawer__checkout-btn';
  checkoutBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
      <line x1="1" y1="10" x2="23" y2="10"></line>
    </svg>
    <span>Finalizar Pedido (${formatPrice(totalPrice)})</span>
  `;
  checkoutBtn.addEventListener('click', handleCheckout);

  const secondaryActions = document.createElement('div');
  secondaryActions.className = 'cart-drawer__secondary-actions';

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn btn-outline cart-drawer__clear-btn';
  clearBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="16" height="16">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
    <span>Vaciar Carrito</span>
  `;
  clearBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que deseas vaciar todos los productos del carrito?')) {
      clearCart();
      showToast({
        title: 'Carrito vaciado',
        message: 'Se han eliminado todos los productos del carrito.',
        type: 'info'
      });
    }
  });

  const continueBtn = document.createElement('button');
  continueBtn.type = 'button';
  continueBtn.className = 'btn btn-secondary cart-drawer__continue-btn';
  continueBtn.textContent = 'Seguir Comprando';
  continueBtn.addEventListener('click', closeCart);

  secondaryActions.appendChild(clearBtn);
  secondaryActions.appendChild(continueBtn);

  actionsWrap.appendChild(checkoutBtn);
  actionsWrap.appendChild(secondaryActions);

  footer.appendChild(summaryBox);
  footer.appendChild(actionsWrap);
}

/**
 * Inicia el proceso de checkout abriendo el formulario de pedido.
 */
function handleCheckout() {
  const count = getCartCount();
  if (count === 0) {
    showToast({
      title: 'Carrito vacío',
      message: 'Tu carrito no tiene artículos para procesar.',
      type: 'warning'
    });
    return;
  }

  openCheckoutModal();
}

/**
 * Abre el Drawer del carrito.
 */
export function openCart() {
  if (!drawerElement) {
    createCartDrawer();
  }
  isOpen = true;
  drawerElement.classList.add('cart-drawer-overlay--open');
  drawerElement.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Enfocar el botón de cerrar para accesibilidad
  const closeBtn = drawerElement.querySelector('.cart-drawer__close-btn');
  if (closeBtn) {
    setTimeout(() => closeBtn.focus(), 50);
  }
}

/**
 * Cierra el Drawer del carrito.
 */
export function closeCart() {
  if (!drawerElement) return;
  isOpen = false;
  drawerElement.classList.remove('cart-drawer-overlay--open');
  drawerElement.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/**
 * Alterna el estado del Drawer del carrito.
 */
export function toggleCart() {
  if (isOpen) {
    closeCart();
  } else {
    openCart();
  }
}
