import { getProductById } from '../api/products.js';
import { formatPrice, formatCategory } from '../utils/format.js';

/**
 * Renderiza la vista de detalle del producto (#/producto/:id).
 * @param {HTMLElement} container - Contenedor principal
 * @param {string} productId - ID del producto
 */
export async function renderProductDetailPage(container, productId) {
  container.innerHTML = '';

  // Barra de navegación secundaria (Volver al catálogo)
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
    <span>Volver al catálogo</span>
  `;
  navBar.appendChild(backBtn);
  container.appendChild(navBar);

  // Contenedor de contenido
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'detail-content-wrapper';
  container.appendChild(contentWrapper);

  // Validar formato del ID antes de consultar
  if (!productId || typeof productId !== 'string' || productId.trim() === '') {
    renderDetailError(contentWrapper, 'Identificador de producto no válido.');
    return;
  }

  // Estado de carga
  renderDetailLoading(contentWrapper);

  try {
    const product = await getProductById(productId);
    contentWrapper.innerHTML = '';
    renderProductDetails(contentWrapper, product);
  } catch (error) {
    contentWrapper.innerHTML = '';
    let message = 'No pudimos encontrar el producto solicitado.';
    if (error.status === 400) {
      message = 'El ID del producto proporcionado no tiene un formato válido.';
    } else if (error.status === 404) {
      message = 'El producto no existe o fue retirado del catálogo.';
    } else if (error.message) {
      message = error.message;
    }
    renderDetailError(contentWrapper, message);
  }
}

/**
 * Construye y renderiza la estructura completa del producto de forma segura.
 * @param {HTMLElement} container 
 * @param {Object} product 
 */
function renderProductDetails(container, product) {
  const layout = document.createElement('article');
  layout.className = 'detail-layout';

  // 1. Imagen grande
  const imageBox = document.createElement('div');
  imageBox.className = 'detail-image-box';

  const img = document.createElement('img');
  img.className = 'detail-image';
  img.src = product.image || 'https://placehold.co/600x400?text=Sin+Imagen';
  img.alt = product.name ? `Fotografía de ${product.name}` : 'Detalle de producto';
  img.loading = 'lazy';
  img.width = 600;
  img.height = 450;

  img.addEventListener('error', () => {
    img.src = 'https://placehold.co/600x400?text=Hardware+Detalle';
  });

  imageBox.appendChild(img);

  // 2. Información del producto
  const info = document.createElement('div');
  info.className = 'detail-info';

  // Badges (Marca & Categoría)
  const badges = document.createElement('div');
  badges.className = 'detail-badges';

  const brandBadge = document.createElement('span');
  brandBadge.className = 'detail-badge-brand';
  brandBadge.textContent = product.brand || 'Genérico';

  const categoryBadge = document.createElement('span');
  categoryBadge.className = 'detail-badge-category';
  categoryBadge.textContent = formatCategory(product.category);

  badges.appendChild(brandBadge);
  badges.appendChild(categoryBadge);

  // Título
  const title = document.createElement('h1');
  title.className = 'detail-title';
  title.textContent = product.name || 'Producto sin nombre';

  // Caja de Precio y Stock
  const priceBox = document.createElement('div');
  priceBox.className = 'detail-price-box';

  const price = document.createElement('span');
  price.className = 'detail-price';
  price.textContent = formatPrice(product.price);

  const stockBadge = document.createElement('span');
  const stockCount = Number(product.stock) || 0;
  if (stockCount > 0) {
    stockBadge.className = 'detail-stock detail-stock--available';
    stockBadge.textContent = `En stock: ${stockCount} unidades disponibles`;
  } else {
    stockBadge.className = 'detail-stock detail-stock--out';
    stockBadge.textContent = 'Agotado temporalmente';
  }

  priceBox.appendChild(price);
  priceBox.appendChild(stockBadge);

  // Descripción
  const desc = document.createElement('p');
  desc.className = 'detail-description';
  desc.textContent = product.description || 'Sin descripción detallada para este artículo.';

  // Acciones (Agregar al carrito deshabilitado "Próximamente")
  const actions = document.createElement('div');
  actions.className = 'detail-actions';

  const addToCartBtn = document.createElement('button');
  addToCartBtn.type = 'button';
  addToCartBtn.className = 'btn btn-primary';
  addToCartBtn.disabled = true;
  addToCartBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
    <span>Agregar al carrito (Próximamente)</span>
  `;

  actions.appendChild(addToCartBtn);

  // 3. Tabla de Especificaciones Técnicas (specs)
  const specsSection = document.createElement('div');
  specsSection.className = 'specs-section';

  const specsTitle = document.createElement('h2');
  specsTitle.className = 'specs-title';
  specsTitle.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="4 17 10 11 4 5"></polyline>
      <line x1="12" y1="19" x2="20" y2="19"></line>
    </svg>
    <span>Especificaciones Técnicas</span>
  `;
  specsSection.appendChild(specsTitle);

  const specs = product.specs;
  if (specs && typeof specs === 'object' && Object.keys(specs).length > 0) {
    const table = document.createElement('table');
    table.className = 'specs-table';

    const tbody = document.createElement('tbody');

    Object.entries(specs).forEach(([key, val]) => {
      const row = document.createElement('tr');

      const th = document.createElement('th');
      th.scope = 'row';
      // Limpiar y formatear la clave: "interfaz_memoria" -> "Interfaz memoria"
      const formattedKey = key.replace(/_/g, ' ');
      th.textContent = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);

      const td = document.createElement('td');
      td.textContent = String(val);

      row.appendChild(th);
      row.appendChild(td);
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    specsSection.appendChild(table);
  } else {
    const noSpecs = document.createElement('p');
    noSpecs.className = 'state-message';
    noSpecs.textContent = 'No hay especificaciones técnicas detalladas para este modelo.';
    specsSection.appendChild(noSpecs);
  }

  // Ensamblar panel de información
  info.appendChild(badges);
  info.appendChild(title);
  info.appendChild(priceBox);
  info.appendChild(desc);
  info.appendChild(actions);
  info.appendChild(specsSection);

  layout.appendChild(imageBox);
  layout.appendChild(info);

  container.appendChild(layout);
}

/**
 * Muestra el esqueleto de carga de detalle.
 * @param {HTMLElement} container 
 */
function renderDetailLoading(container) {
  const box = document.createElement('div');
  box.className = 'detail-layout';
  box.innerHTML = `
    <div class="skeleton-shimmer" style="height: 380px; border-radius: var(--radius-lg);"></div>
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div class="skeleton-shimmer skeleton-line skeleton-line--short"></div>
      <div class="skeleton-shimmer skeleton-line skeleton-line--long" style="height: 28px;"></div>
      <div class="skeleton-shimmer skeleton-line skeleton-line--medium" style="height: 44px;"></div>
      <div class="skeleton-shimmer skeleton-line skeleton-line--long" style="height: 70px;"></div>
      <div class="skeleton-shimmer skeleton-btn"></div>
    </div>
  `;
  container.appendChild(box);
}

/**
 * Renderiza el estado de error (404, ID inválido, etc.).
 * @param {HTMLElement} container 
 * @param {string} message 
 */
function renderDetailError(container, message) {
  const box = document.createElement('div');
  box.className = 'state-container';

  const icon = document.createElement('div');
  icon.className = 'state-icon state-icon--error';
  icon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  `;

  const title = document.createElement('h2');
  title.className = 'state-title';
  title.textContent = 'Producto no disponible';

  const text = document.createElement('p');
  text.className = 'state-message';
  text.textContent = message;

  const backLink = document.createElement('a');
  backLink.href = '#/';
  backLink.className = 'btn btn-primary';
  backLink.textContent = 'Regresar al Catálogo';

  box.appendChild(icon);
  box.appendChild(title);
  box.appendChild(text);
  box.appendChild(backLink);

  container.appendChild(box);
}
