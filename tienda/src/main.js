import './styles/main.css';
import { createHeader } from './components/header.js';
import { createFooter } from './components/footer.js';
import { createCartDrawer } from './components/cartDrawer.js';
import { getCheckoutModalElement } from './components/checkoutModal.js';
import { renderCatalogPage } from './pages/catalog.js';
import { renderProductDetailPage } from './pages/productDetail.js';
import { renderCartPage } from './pages/cartPage.js';
import { initRouter } from './utils/router.js';

/**
 * Inicialización de la aplicación TiendaPC
 */
function initApp() {
  const app = document.getElementById('app');
  if (!app) {
    console.error('Elemento #app no encontrado');
    return;
  }

  app.innerHTML = '';

  // 1. Header persistente
  const header = createHeader();
  app.appendChild(header);

  // 2. Contenedor principal de vistas
  const main = document.createElement('main');
  main.className = 'main-content';
  main.id = 'main-content';
  app.appendChild(main);

  // 3. Footer persistente
  const footer = createFooter();
  app.appendChild(footer);

  // 4. Modal / Drawer global del carrito
  const cartDrawer = createCartDrawer();
  app.appendChild(cartDrawer);

  // 5. Modal de Checkout
  getCheckoutModalElement();

  // 5. Inicializar Router por Hash
  initRouter((location) => {
    // Scroll al inicio en cambio de ruta
    window.scrollTo({ top: 0, behavior: 'instant' });

    switch (location.route) {
      case 'catalog':
        renderCatalogPage(main, location.query);
        break;

      case 'product-detail':
        renderProductDetailPage(main, location.params.id);
        break;

      case 'cart':
        renderCartPage(main);
        break;

      default:
        renderNotFoundPage(main);
        break;
    }
  });
}

/**
 * Vista para rutas no encontradas.
 * @param {HTMLElement} container 
 */
function renderNotFoundPage(container) {
  container.innerHTML = '';

  const box = document.createElement('div');
  box.className = 'state-container';

  const icon = document.createElement('div');
  icon.className = 'state-icon state-icon--empty';
  icon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
    </svg>
  `;

  const title = document.createElement('h1');
  title.className = 'state-title';
  title.textContent = '404 - Página no encontrada';

  const desc = document.createElement('p');
  desc.className = 'state-message';
  desc.textContent = 'La sección o enlace que estás intentando abrir no existe.';

  const backBtn = document.createElement('a');
  backBtn.href = '#/';
  backBtn.className = 'btn btn-primary';
  backBtn.textContent = 'Ir al Catálogo de Productos';

  box.appendChild(icon);
  box.appendChild(title);
  box.appendChild(desc);
  box.appendChild(backBtn);

  container.appendChild(box);
}

// Iniciar aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', initApp);
