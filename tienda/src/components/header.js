import { getCartCount, onCartChange } from '../utils/cart.js';
import { openCart } from './cartDrawer.js';

/**
 * Componente Header para TiendaPC
 * @returns {HTMLElement}
 */
export function createHeader() {
  const header = document.createElement('header');
  header.className = 'site-header';

  const container = document.createElement('div');
  container.className = 'site-header__container';

  // Logo
  const logoLink = document.createElement('a');
  logoLink.href = '#/';
  logoLink.className = 'site-logo';
  logoLink.setAttribute('aria-label', 'TiendaPC - Inicio');

  const logoIcon = document.createElement('div');
  logoIcon.className = 'site-logo__icon';
  logoIcon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  `;

  const logoText = document.createElement('span');
  logoText.innerHTML = 'Tienda<span class="site-logo__accent">PC</span>';

  logoLink.appendChild(logoIcon);
  logoLink.appendChild(logoText);

  // Navegación
  const nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.setAttribute('aria-label', 'Navegación principal');

  const catalogLink = document.createElement('a');
  catalogLink.href = '#/';
  catalogLink.className = 'site-nav__link active';
  catalogLink.textContent = 'Catálogo';

  // Botón Carrito interactivo
  const cartButton = document.createElement('button');
  cartButton.type = 'button';
  cartButton.className = 'cart-button';
  cartButton.id = 'header-cart-btn';
  cartButton.setAttribute('aria-label', 'Carrito de compras, 0 productos');
  cartButton.title = 'Abrir carrito de compras';
  cartButton.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
    <span class="cart-button__label">Carrito</span>
    <span class="cart-button__badge" id="header-cart-badge" aria-hidden="true">0</span>
  `;

  const badgeEl = cartButton.querySelector('#header-cart-badge');

  // Actualización reactiva del contador
  onCartChange(() => {
    const count = getCartCount();
    if (badgeEl) {
      badgeEl.textContent = String(count);
      badgeEl.classList.remove('cart-button__badge--bump');
      // Forzar reflujo para reiniciar animación
      void badgeEl.offsetWidth;
      badgeEl.classList.add('cart-button__badge--bump');
    }
    cartButton.setAttribute('aria-label', `Carrito de compras, ${count} ${count === 1 ? 'producto' : 'productos'}`);
  });

  // Abrir Drawer al hacer clic
  cartButton.addEventListener('click', () => {
    openCart();
  });

  nav.appendChild(catalogLink);
  nav.appendChild(cartButton);

  container.appendChild(logoLink);
  container.appendChild(nav);
  header.appendChild(container);

  return header;
}
