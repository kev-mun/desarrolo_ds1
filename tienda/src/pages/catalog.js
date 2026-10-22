import { getProducts } from '../api/products.js';
import { createFilters } from '../components/filters.js';
import { createProductCard } from '../components/productCard.js';
import { createPagination } from '../components/pagination.js';
import { setCatalogQueryParams } from '../utils/router.js';

/**
 * Renderiza la página del Catálogo de productos.
 * @param {HTMLElement} container - Contenedor principal donde se inyectará la vista
 * @param {Record<string, string>} queryParams - Parámetros de consulta actuales en la URL
 */
export function renderCatalogPage(container, queryParams = {}) {
  container.innerHTML = '';

  // 1. Hero Section
  const hero = document.createElement('section');
  hero.className = 'hero';
  hero.innerHTML = `
    <div class="hero__badge">
      <span class="hero__badge-dot"></span>
      <span>Hardware & Gaming Tech</span>
    </div>
    <h1 class="hero__title">
      Potencia Tu Setup con <span class="hero__title-gradient">TiendaPC</span>
    </h1>
    <p class="hero__subtitle">
      Descubre lo último en componentes para PC, portátiles de alto rendimiento y periféricos gamer con garantía oficial.
    </p>
  `;
  container.appendChild(hero);

  // Parámetros normalizados
  const currentFilters = {
    search: queryParams.search || '',
    category: queryParams.category || '',
    minPrice: queryParams.minPrice || '',
    maxPrice: queryParams.maxPrice || '',
    sort: queryParams.sort || '-createdAt',
    page: Number(queryParams.page) || 1
  };

  // 2. Filtros
  const filtersComponent = createFilters({
    currentFilters,
    onFilterChange: (updatedFilters) => {
      // Al cambiar filtros, volvemos a la página 1
      const newQuery = {
        ...updatedFilters,
        page: 1
      };
      setCatalogQueryParams(newQuery, false);
    }
  });
  container.appendChild(filtersComponent);

  // 3. Contenedor de Resultados (Header con conteo, Grilla, Paginación)
  const resultsSection = document.createElement('section');
  resultsSection.className = 'catalog-results';
  resultsSection.id = 'catalog-results-section';

  const resultsHeader = document.createElement('div');
  resultsHeader.className = 'catalog-header';
  resultsHeader.id = 'catalog-results-header';

  const gridContainer = document.createElement('div');
  gridContainer.className = 'products-grid';
  gridContainer.id = 'products-grid';

  const paginationContainer = document.createElement('div');
  paginationContainer.id = 'pagination-container';

  resultsSection.appendChild(resultsHeader);
  resultsSection.appendChild(gridContainer);
  resultsSection.appendChild(paginationContainer);
  container.appendChild(resultsSection);

  // Carga inicial de productos
  loadProducts();

  async function loadProducts() {
    renderLoadingSkeletons(gridContainer, 8);
    resultsHeader.innerHTML = '';
    paginationContainer.innerHTML = '';

    try {
      const response = await getProducts({
        search: currentFilters.search,
        category: currentFilters.category,
        minPrice: currentFilters.minPrice,
        maxPrice: currentFilters.maxPrice,
        sort: currentFilters.sort,
        page: currentFilters.page,
        limit: 8
      });

      const products = response.data || [];
      const pagination = response.pagination || { page: 1, pages: 1, total: products.length };

      // Render Conteo
      const countP = document.createElement('p');
      countP.className = 'catalog-count';
      countP.innerHTML = `Mostrando <strong>${products.length}</strong> de <strong>${pagination.total}</strong> productos`;
      resultsHeader.appendChild(countP);

      // Si no hay productos
      if (products.length === 0) {
        gridContainer.innerHTML = '';
        renderEmptyState(gridContainer);
        return;
      }

      // Render Grilla
      gridContainer.innerHTML = '';
      products.forEach((product) => {
        const card = createProductCard(product);
        gridContainer.appendChild(card);
      });

      // Render Paginación
      const paginationNav = createPagination({
        currentPage: pagination.page,
        totalPages: pagination.pages,
        onPageChange: (newPage) => {
          const newQuery = {
            ...currentFilters,
            page: newPage
          };
          setCatalogQueryParams(newQuery, false);
          resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      if (paginationNav) {
        paginationContainer.appendChild(paginationNav);
      }
    } catch (error) {
      gridContainer.innerHTML = '';
      renderErrorState(gridContainer, error.message, () => loadProducts());
    }
  }
}

/**
 * Renderiza esqueletos de carga estilo Shimmer en la grilla.
 * @param {HTMLElement} container 
 * @param {number} count 
 */
function renderLoadingSkeletons(container, count = 8) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
    skeleton.innerHTML = `
      <div class="skeleton-shimmer skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-shimmer skeleton-line skeleton-line--short"></div>
        <div class="skeleton-shimmer skeleton-line skeleton-line--long"></div>
        <div class="skeleton-shimmer skeleton-line skeleton-line--medium"></div>
        <div class="skeleton-shimmer skeleton-btn"></div>
      </div>
    `;
    container.appendChild(skeleton);
  }
}

/**
 * Renderiza el estado vacío cuando no hay resultados.
 * @param {HTMLElement} container 
 */
function renderEmptyState(container) {
  const box = document.createElement('div');
  box.className = 'state-container';

  const icon = document.createElement('div');
  icon.className = 'state-icon state-icon--empty';
  icon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      <line x1="8" y1="11" x2="14" y2="11"></line>
    </svg>
  `;

  const title = document.createElement('h3');
  title.className = 'state-title';
  title.textContent = 'No encontramos productos';

  const message = document.createElement('p');
  message.className = 'state-message';
  message.textContent = 'Intenta ajustar los términos de búsqueda o limpiar los filtros seleccionados.';

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'btn btn-secondary';
  resetBtn.textContent = 'Ver todos los productos';
  resetBtn.addEventListener('click', () => {
    setCatalogQueryParams({}, false);
  });

  box.appendChild(icon);
  box.appendChild(title);
  box.appendChild(message);
  box.appendChild(resetBtn);

  container.appendChild(box);
}

/**
 * Renderiza el estado de error de conexión con botón reintentar.
 * @param {HTMLElement} container 
 * @param {string} errorText 
 * @param {() => void} onRetry 
 */
function renderErrorState(container, errorText, onRetry) {
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

  const title = document.createElement('h3');
  title.className = 'state-title';
  title.textContent = 'No se pudo cargar el catálogo';

  const message = document.createElement('p');
  message.className = 'state-message';
  message.textContent = errorText || 'Ocurrió un error al comunicarse con el servidor API.';

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'btn btn-primary';
  retryBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10"></polyline>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
    </svg>
    <span>Reintentar</span>
  `;
  retryBtn.addEventListener('click', () => {
    onRetry();
  });

  box.appendChild(icon);
  box.appendChild(title);
  box.appendChild(message);
  box.appendChild(retryBtn);

  container.appendChild(box);
}
