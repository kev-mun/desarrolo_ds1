/**
 * Sistema de notificaciones tipo Toast moderno para TiendaPC.
 * Proporciona avisos flotantes no invasivos con micro-animaciones.
 */

let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    toastContainer.setAttribute('aria-live', 'polite');
    toastContainer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Muestra una notificación emergente.
 * @param {Object} options
 * @param {string} options.title - Título principal
 * @param {string} [options.message] - Detalle del mensaje
 * @param {string} [options.type='success'] - 'success' | 'info' | 'warning' | 'danger'
 * @param {number} [options.duration=3200] - Tiempo en ms antes de desaparecer
 * @param {{ label: string, onClick: () => void }} [options.action] - Botón de acción opcional
 */
export function showToast({ title, message = '', type = 'success', duration = 3200, action = null }) {
  const container = ensureToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');

  const iconSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  `;

  const content = document.createElement('div');
  content.className = 'toast__content';

  const titleEl = document.createElement('div');
  titleEl.className = 'toast__title';
  titleEl.textContent = title;
  content.appendChild(titleEl);

  if (message) {
    const msgEl = document.createElement('div');
    msgEl.className = 'toast__message';
    msgEl.textContent = message;
    content.appendChild(msgEl);
  }

  const iconEl = document.createElement('div');
  iconEl.className = 'toast__icon';
  iconEl.innerHTML = iconSvg;

  toast.appendChild(iconEl);
  toast.appendChild(content);

  if (action && action.label && typeof action.onClick === 'function') {
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'toast__action-btn';
    actionBtn.textContent = action.label;
    actionBtn.addEventListener('click', () => {
      action.onClick();
      dismissToast(toast);
    });
    toast.appendChild(actionBtn);
  }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast__close-btn';
  closeBtn.setAttribute('aria-label', 'Cerrar aviso');
  closeBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  closeBtn.addEventListener('click', () => dismissToast(toast));
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  // Trigger reflow for slide/fade animation
  requestAnimationFrame(() => {
    toast.classList.add('toast--visible');
  });

  const timer = setTimeout(() => {
    dismissToast(toast);
  }, duration);

  function dismissToast(el) {
    clearTimeout(timer);
    el.classList.remove('toast--visible');
    el.classList.add('toast--leaving');
    el.addEventListener(
      'transitionend',
      () => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      },
      { once: true }
    );
  }
}
