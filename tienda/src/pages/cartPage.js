import { getCart, removeFromCart, updateQuantity, clearCart, getCartTotal, getCartCount, onCartChange } from '../utils/cart.js';
import { formatPrice, formatCategory } from '../utils/format.js';
import { showToast } from '../utils/toast.js';

/**
 * Renderiza la página completa de Carrito (#/carrito o #/cart).
 * @param {HTMLElement} container - Contenedor principal de vistas
 */
export function renderCartPage(container) {
  container.innerHTML = '';

  const pageWrapper = document.createElement('div');
  pageWrapper.className = 'cart-page';

  // Navegación / Breadcrumb
  const navBar = document.createElement('div');
  navBar.className = 'detail-nav';

  const backBtn = document.createElement('a');
  backBtn.href = '#/';
  backBtn.className = 'btn-back';
  backBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
    <span>Continuar explorando el catálogo</span>
  `;
  navBar.appendChild(backBtn);
  pageWrapper.appendChild(navBar);

  // Título de la página
  const titleHeader = document.createElement('div');
  titleHeader.className = 'cart-page__header';
  titleHeader.innerHTML = `
    <h1 class="cart-page__title">Carrito de Compras</h1>
    <p class="cart-page__subtitle" id="cart-page-subtitle">Revisa tus artículos antes de completar la orden.</p>
  `;
  pageWrapper.appendChild(titleHeader);

  // Contenedor dinámico de contenido
  const contentArea = document.createElement('div');
  contentArea.id = 'cart-page-content';
  pageWrapper.appendChild(contentArea);

  container.appendChild(pageWrapper);

  // Función de re-renderizado
  function updateView() {
    renderContent(contentArea);
  }

  // Suscripción al carrito mientras esté en esta vista
  const unsubscribe = onCartChange(() => {
    // Si el contenedor aún está en el DOM, actualizamos
    if (document.body.contains(contentArea)) {
      updateView();
    }
  });

  updateView();
}

/**
 * Dibuja el contenido de la página según si hay o no items en el carrito.
 * @param {HTMLElement} container 
 */
function renderContent(container) {
  container.innerHTML = '';
  const items = getCart();
  const totalCount = getCartCount();
  const totalPrice = getCartTotal();

  const subtitle = document.getElementById('cart-page-subtitle');
  if (subtitle) {
    subtitle.textContent = items.length === 0
      ? 'Tu carrito se encuentra vacío actualmente.'
      : `Tienes ${totalCount} ${totalCount === 1 ? 'artículo seleccionado' : 'artículos seleccionados'}.`;
  }

  if (items.length === 0) {
    const emptyBox = document.createElement('div');
    emptyBox.className = 'state-container cart-empty-full';

    const icon = document.createElement('div');
    icon.className = 'state-icon state-icon--empty';
    icon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>
    `;

    const title = document.createElement('h2');
    title.className = 'state-title';
    title.textContent = 'Tu carrito está vacío';

    const message = document.createElement('p');
    message.className = 'state-message';
    message.textContent = 'No tienes productos guardados en tu carrito. Explora nuestro catálogo y equipa tu setup con la mejor tecnología.';

    const backLink = document.createElement('a');
    backLink.href = '#/';
    backLink.className = 'btn btn-primary';
    backLink.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
      <span>Ir al Catálogo de Productos</span>
    `;

    emptyBox.appendChild(icon);
    emptyBox.appendChild(title);
    emptyBox.appendChild(message);
    emptyBox.appendChild(backLink);

    container.appendChild(emptyBox);
    return;
  }

  // Grid de 2 columnas: Lista de productos + Resumen de compra
  const layout = document.createElement('div');
  layout.className = 'cart-page__layout';

  // Columna Izquierda: Tabla/Lista de productos
  const itemsSection = document.createElement('div');
  itemsSection.className = 'cart-page__items-col';

  const itemsList = document.createElement('div');
  itemsList.className = 'cart-page__list';

  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'cart-page-item';

    // Imagen
    const imgWrap = document.createElement('div');
    imgWrap.className = 'cart-page-item__image-wrap';

    const img = document.createElement('img');
    img.className = 'cart-page-item__image';
    img.src = item.image || 'https://placehold.co/120x120?text=Hardware';
    img.alt = item.name;
    img.loading = 'lazy';
    img.width = 80;
    img.height = 80;
    img.addEventListener('error', () => {
      img.src = 'https://placehold.co/120x120?text=Hardware';
    });
    imgWrap.appendChild(img);

    // Detalles
    const details = document.createElement('div');
    details.className = 'cart-page-item__details';

    const categoryBadge = document.createElement('span');
    categoryBadge.className = 'cart-page-item__category';
    categoryBadge.textContent = formatCategory(item.category);

    const titleLink = document.createElement('a');
    titleLink.href = `#/producto/${encodeURIComponent(item._id)}`;
    titleLink.className = 'cart-page-item__title';
    titleLink.textContent = item.name;

    const unitPrice = document.createElement('span');
    unitPrice.className = 'cart-page-item__unit-price';
    unitPrice.textContent = `Precio unitario: ${formatPrice(item.price)}`;

    details.appendChild(categoryBadge);
    details.appendChild(titleLink);
    details.appendChild(unitPrice);

    // Controles de cantidad
    const controls = document.createElement('div');
    controls.className = 'cart-page-item__controls';

    const qtyWrap = document.createElement('div');
    qtyWrap.className = 'cart-item__quantity-controls';

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

    const qtyText = document.createElement('span');
    qtyText.className = 'cart-item__qty-value';
    qtyText.textContent = String(item.quantity);

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

    qtyWrap.appendChild(minusBtn);
    qtyWrap.appendChild(qtyText);
    qtyWrap.appendChild(plusBtn);

    // Subtotal
    const subtotal = document.createElement('div');
    subtotal.className = 'cart-page-item__subtotal';
    subtotal.textContent = formatPrice(item.price * item.quantity);

    // Botón borrar
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'cart-item__remove-btn';
    deleteBtn.setAttribute('aria-label', `Eliminar ${item.name}`);
    deleteBtn.title = 'Eliminar producto';
    deleteBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    deleteBtn.addEventListener('click', () => {
      removeFromCart(item._id);
      showToast({
        title: 'Producto eliminado',
        message: `${item.name} fue retirado de tu compra.`,
        type: 'info'
      });
    });

    controls.appendChild(qtyWrap);
    controls.appendChild(subtotal);
    controls.appendChild(deleteBtn);

    card.appendChild(imgWrap);
    card.appendChild(details);
    card.appendChild(controls);

    itemsList.appendChild(card);
  });

  // Acciones secundarias inferiores (Vaciar carrito)
  const bottomActions = document.createElement('div');
  bottomActions.className = 'cart-page__bottom-actions';

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn btn-outline';
  clearBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="16" height="16">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
    <span>Vaciar Carrito Completo</span>
  `;
  clearBtn.addEventListener('click', () => {
    if (confirm('¿Deseas vaciar todos los productos del carrito de compras?')) {
      clearCart();
      showToast({
        title: 'Carrito vaciado',
        message: 'Has vaciado tu carrito de compras.',
        type: 'info'
      });
    }
  });

  bottomActions.appendChild(clearBtn);

  itemsSection.appendChild(itemsList);
  itemsSection.appendChild(bottomActions);

  // Columna Derecha: Tarjeta de Resumen de Pedido
  const summaryCol = document.createElement('aside');
  summaryCol.className = 'cart-page__summary-col';

  const summaryCard = document.createElement('div');
  summaryCard.className = 'cart-page-summary-card';

  summaryCard.innerHTML = `
    <h2 class="cart-page-summary-card__title">Resumen del Pedido</h2>
    <div class="cart-summary__row">
      <span>Subtotal (${totalCount} ítems)</span>
      <span>${formatPrice(totalPrice)}</span>
    </div>
    <div class="cart-summary__row">
      <span>Envío nacional express</span>
      <span class="cart-summary__free-shipping">¡Gratis!</span>
    </div>
    <div class="cart-summary__row">
      <span>Impuestos incluidos (IVA)</span>
      <span>$ 0</span>
    </div>
    <div class="cart-summary__divider"></div>
    <div class="cart-summary__row cart-summary__row--total">
      <span>Total a Pagar</span>
      <span class="cart-summary__total-value">${formatPrice(totalPrice)}</span>
    </div>
    <div class="cart-page-summary-card__guarantee">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
      <span>Compra 100% segura con garantía oficial</span>
    </div>
  `;

  const checkoutBtn = document.createElement('button');
  checkoutBtn.type = 'button';
  checkoutBtn.className = 'btn btn-primary btn-block cart-page__checkout-btn';
  checkoutBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
      <line x1="1" y1="10" x2="23" y2="10"></line>
    </svg>
    <span>Finalizar Pedido (${formatPrice(totalPrice)})</span>
  `;
  checkoutBtn.addEventListener('click', () => {
    const confirmed = confirm(
      `¡Confirmación de Compra!\n\nEstás por realizar un pedido de ${totalCount} artículos por un total de ${formatPrice(totalPrice)}.\n\n¿Deseas confirmar la orden?`
    );

    if (confirmed) {
      clearCart();
      showToast({
        title: '¡Compra confirmada con éxito!',
        message: `Tu pedido por ${formatPrice(totalPrice)} fue recibido. ¡Gracias por confiar en TiendaPC!`,
        type: 'success',
        duration: 5000
      });
    }
  });

  summaryCard.appendChild(checkoutBtn);
  summaryCol.appendChild(summaryCard);

  layout.appendChild(itemsSection);
  layout.appendChild(summaryCol);

  container.appendChild(layout);
}
