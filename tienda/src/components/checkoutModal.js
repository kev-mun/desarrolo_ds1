import { getCart, clearCart, getCartTotal, getCartCount } from '../utils/cart.js';
import { formatPrice } from '../utils/format.js';
import { createOrder } from '../api/orders.js';
import { showToast } from '../utils/toast.js';
import { closeCart } from './cartDrawer.js';

let modalOverlay = null;

/**
 * Crea o retorna el elemento DOM del Modal de Checkout.
 * @returns {HTMLElement}
 */
export function getCheckoutModalElement() {
  if (modalOverlay) return modalOverlay;

  const overlay = document.createElement('div');
  overlay.className = 'checkout-modal-overlay';
  overlay.id = 'checkout-modal-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const modal = document.createElement('div');
  modal.className = 'checkout-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'checkout-modal-title');
  modal.id = 'checkout-modal-dialog';

  overlay.appendChild(modal);

  // Cerrar al hacer clic en fondo
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeCheckoutModal();
    }
  });

  // Cerrar con Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('checkout-modal-overlay--open')) {
      closeCheckoutModal();
    }
  });

  modalOverlay = overlay;
  document.body.appendChild(overlay);

  return overlay;
}

/**
 * Abre el modal de checkout para capturar datos y procesar el pedido.
 */
export function openCheckoutModal() {
  const overlay = getCheckoutModalElement();
  const items = getCart();

  if (items.length === 0) {
    showToast({
      title: 'Carrito vacío',
      message: 'Agrega al menos un producto antes de proceder al checkout.',
      type: 'warning'
    });
    return;
  }

  // Cerrar drawer lateral si estaba abierto
  closeCart();

  renderCheckoutForm();

  overlay.classList.add('checkout-modal-overlay--open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Foco en el primer input
  setTimeout(() => {
    const firstInput = overlay.querySelector('#checkout-name');
    if (firstInput) firstInput.focus();
  }, 100);
}

/**
 * Cierra el modal de checkout.
 */
export function closeCheckoutModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.remove('checkout-modal-overlay--open');
  modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/**
 * Renderiza el formulario de checkout dentro del modal.
 */
function renderCheckoutForm() {
  const dialog = modalOverlay.querySelector('#checkout-modal-dialog');
  if (!dialog) return;

  const items = getCart();
  const total = getCartTotal();
  const count = getCartCount();

  dialog.innerHTML = '';

  // 1. Header
  const header = document.createElement('div');
  header.className = 'checkout-modal__header';

  const title = document.createElement('h2');
  title.className = 'checkout-modal__title';
  title.id = 'checkout-modal-title';
  title.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="22" height="22">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <path d="M16 10a4 4 0 0 1-8 0"></path>
    </svg>
    <span>Finalizar Pedido</span>
  `;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'checkout-modal__close-btn';
  closeBtn.setAttribute('aria-label', 'Cerrar ventana de checkout');
  closeBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  closeBtn.addEventListener('click', closeCheckoutModal);

  header.appendChild(title);
  header.appendChild(closeBtn);

  // 2. Contenido / Formulario
  const body = document.createElement('div');
  body.className = 'checkout-modal__body';

  // Resumen rápido
  const summaryBox = document.createElement('div');
  summaryBox.className = 'checkout-quick-summary';
  summaryBox.innerHTML = `
    <div class="checkout-quick-summary__item">
      <span class="checkout-quick-summary__label">Artículos</span>
      <strong class="checkout-quick-summary__value">${count} unidades</strong>
    </div>
    <div class="checkout-quick-summary__item">
      <span class="checkout-quick-summary__label">Envío</span>
      <span class="cart-summary__free-shipping">¡Gratis!</span>
    </div>
    <div class="checkout-quick-summary__item">
      <span class="checkout-quick-summary__label">Total a pagar</span>
      <strong class="checkout-quick-summary__total">${formatPrice(total)}</strong>
    </div>
  `;

  // Formulario de datos del cliente
  const form = document.createElement('form');
  form.className = 'checkout-form';
  form.id = 'checkout-form';
  form.noValidate = true;

  form.innerHTML = `
    <div class="form-group">
      <label for="checkout-name" class="form-label">
        <span>Nombre completo</span> <span class="form-required">*</span>
      </label>
      <input
        type="text"
        id="checkout-name"
        name="name"
        class="form-input"
        placeholder="Ej. Andrés Morales"
        required
        autocomplete="name"
      />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="checkout-phone" class="form-label">
          <span>Teléfono / Celular</span> <span class="form-required">*</span>
        </label>
        <input
          type="tel"
          id="checkout-phone"
          name="phone"
          class="form-input"
          placeholder="Ej. 310 123 4567"
          required
          autocomplete="tel"
        />
      </div>

      <div class="form-group">
        <label for="checkout-email" class="form-label">
          <span>Correo electrónico</span>
        </label>
        <input
          type="email"
          id="checkout-email"
          name="email"
          class="form-input"
          placeholder="correo@ejemplo.com"
          autocomplete="email"
        />
      </div>
    </div>

    <div class="form-group">
      <label for="checkout-address" class="form-label">
        <span>Dirección de entrega</span> <span class="form-required">*</span>
      </label>
      <input
        type="text"
        id="checkout-address"
        name="address"
        class="form-input"
        placeholder="Ej. Calle 100 # 15-20, Apto 402, Bogotá"
        required
        autocomplete="street-address"
      />
    </div>

    <div class="form-group">
      <label for="checkout-notes" class="form-label">
        <span>Indicaciones o notas adicionales</span>
      </label>
      <textarea
        id="checkout-notes"
        name="notes"
        class="form-textarea"
        rows="2"
        placeholder="Ej. Dejar en portería o timbre 402"
      ></textarea>
    </div>

    <div class="checkout-error-banner" id="checkout-error" style="display: none;"></div>

    <div class="checkout-modal__actions">
      <button type="button" class="btn btn-secondary checkout-cancel-btn" id="checkout-cancel-btn">
        Cancelar
      </button>
      <button type="submit" class="btn btn-primary checkout-submit-btn" id="checkout-submit-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Confirmar Pedido (${formatPrice(total)})</span>
      </button>
    </div>
  `;

  // Botón cancelar
  const cancelBtn = form.querySelector('#checkout-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeCheckoutModal);
  }

  // Manejo de envío del formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const errorBanner = form.querySelector('#checkout-error');
    const submitBtn = form.querySelector('#checkout-submit-btn');

    if (errorBanner) {
      errorBanner.style.display = 'none';
      errorBanner.textContent = '';
    }

    const nameInput = form.querySelector('#checkout-name');
    const phoneInput = form.querySelector('#checkout-phone');
    const addressInput = form.querySelector('#checkout-address');
    const emailInput = form.querySelector('#checkout-email');
    const notesInput = form.querySelector('#checkout-notes');

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const address = addressInput.value.trim();
    const email = emailInput ? emailInput.value.trim() : '';
    const notes = notesInput ? notesInput.value.trim() : '';

    // Validar campos obligatorios
    if (!name || !phone || !address) {
      if (errorBanner) {
        errorBanner.textContent = 'Por favor completa los campos obligatorios: Nombre, Teléfono y Dirección.';
        errorBanner.style.display = 'block';
      }
      if (!name) nameInput.focus();
      else if (!phone) phoneInput.focus();
      else if (!address) addressInput.focus();
      return;
    }

    // Preparar payload para la API
    const orderPayload = {
      customer: {
        name,
        phone,
        address,
        email,
        notes
      },
      items: items.map((it) => ({
        productId: it._id,
        quantity: it.quantity
      }))
    };

    // Estado cargando en el botón
    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `
      <span class="btn-spinner" aria-hidden="true"></span>
      <span>Procesando pedido...</span>
    `;

    try {
      const result = await createOrder(orderPayload);
      const createdOrder = result.order;

      // Limpiar el carrito localmente
      clearCart();

      // Notificación toast informativa
      showToast({
        title: '¡Orden creada con éxito!',
        message: `Orden #${createdOrder.orderNumber} registrada en el sistema.`,
        type: 'success',
        duration: 5000
      });

      // Mostrar pantalla de confirmación exitosa dentro del modal
      renderOrderSuccess(createdOrder);
    } catch (error) {
      console.error('Error al enviar el pedido:', error);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;

      if (errorBanner) {
        errorBanner.textContent = error.message || 'No fue posible registrar tu pedido. Por favor intenta de nuevo.';
        errorBanner.style.display = 'block';
      }
    }
  });

  body.appendChild(summaryBox);
  body.appendChild(form);

  dialog.appendChild(header);
  dialog.appendChild(body);
}

/**
 * Renderiza la vista de confirmación exitosa con número de pedido.
 * @param {Object} order 
 */
function renderOrderSuccess(order) {
  const dialog = modalOverlay.querySelector('#checkout-modal-dialog');
  if (!dialog) return;

  dialog.innerHTML = '';

  const successBox = document.createElement('div');
  successBox.className = 'checkout-success-view';

  const iconCircle = document.createElement('div');
  iconCircle.className = 'checkout-success-view__icon';
  iconCircle.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;

  const title = document.createElement('h2');
  title.className = 'checkout-success-view__title';
  title.textContent = '¡Gracias por tu compra!';

  const subtitle = document.createElement('p');
  subtitle.className = 'checkout-success-view__subtitle';
  subtitle.textContent = 'Tu pedido ha sido registrado correctamente en nuestra base de datos.';

  const detailsCard = document.createElement('div');
  detailsCard.className = 'checkout-success-details';
  detailsCard.innerHTML = `
    <div class="checkout-success-details__row checkout-success-details__order-num">
      <span>Número de Orden</span>
      <span class="checkout-order-badge">${order.orderNumber || order._id}</span>
    </div>
    <div class="checkout-success-details__row">
      <span>Cliente</span>
      <strong>${order.customer?.name || 'Cliente'}</strong>
    </div>
    <div class="checkout-success-details__row">
      <span>Dirección de Entrega</span>
      <span>${order.customer?.address || 'Dirección registrada'}</span>
    </div>
    <div class="checkout-success-details__row">
      <span>Teléfono</span>
      <span>${order.customer?.phone || 'No registrado'}</span>
    </div>
    <div class="checkout-success-details__row">
      <span>Total Pagado</span>
      <strong class="checkout-success-details__total">${formatPrice(order.total)}</strong>
    </div>
  `;

  const actions = document.createElement('div');
  actions.className = 'checkout-success-view__actions';

  const continueBtn = document.createElement('a');
  continueBtn.href = '#/';
  continueBtn.className = 'btn btn-primary btn-block';
  continueBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
    <span>Continuar Comprando</span>
  `;
  continueBtn.addEventListener('click', () => {
    closeCheckoutModal();
  });

  actions.appendChild(continueBtn);

  successBox.appendChild(iconCircle);
  successBox.appendChild(title);
  successBox.appendChild(subtitle);
  successBox.appendChild(detailsCard);
  successBox.appendChild(actions);

  dialog.appendChild(successBox);
}
