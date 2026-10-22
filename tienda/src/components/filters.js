import { CATEGORY_LABELS } from '../utils/format.js';

/**
 * Crea el componente de filtros para el catálogo.
 * @param {Object} options
 * @param {Record<string, string>} options.currentFilters - Valores actuales de los filtros
 * @param {(filters: Record<string, string>) => void} options.onFilterChange - Callback cuando cambia cualquier filtro
 * @returns {HTMLElement}
 */
export function createFilters({ currentFilters = {}, onFilterChange }) {
  const panel = document.createElement('section');
  panel.className = 'filters-panel';
  panel.setAttribute('aria-label', 'Filtros de productos');

  const form = document.createElement('form');
  form.className = 'filters-form';
  form.setAttribute('role', 'search');
  form.addEventListener('submit', (e) => e.preventDefault());

  // 1. Búsqueda por texto con debounce 400ms
  const searchGroup = document.createElement('div');
  searchGroup.className = 'form-group';

  const searchLabel = document.createElement('label');
  searchLabel.htmlFor = 'filter-search';
  searchLabel.textContent = 'Buscar producto';

  const searchWrapper = document.createElement('div');
  searchWrapper.className = 'input-search-wrapper';
  searchWrapper.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  `;

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.id = 'filter-search';
  searchInput.className = 'input-control';
  searchInput.placeholder = 'Ej: RTX 4060, Kingston, Ryzen...';
  searchInput.value = currentFilters.search || '';
  searchInput.autocomplete = 'off';

  let debounceTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      emitChange();
    }, 400);
  });

  searchWrapper.appendChild(searchInput);
  searchGroup.appendChild(searchLabel);
  searchGroup.appendChild(searchWrapper);

  // 2. Select de Categoría
  const categoryGroup = document.createElement('div');
  categoryGroup.className = 'form-group';

  const categoryLabel = document.createElement('label');
  categoryLabel.htmlFor = 'filter-category';
  categoryLabel.textContent = 'Categoría';

  const categorySelect = document.createElement('select');
  categorySelect.id = 'filter-category';
  categorySelect.className = 'select-control';

  const defaultCategoryOption = document.createElement('option');
  defaultCategoryOption.value = '';
  defaultCategoryOption.textContent = 'Todas las categorías';
  categorySelect.appendChild(defaultCategoryOption);

  Object.entries(CATEGORY_LABELS).forEach(([key, label]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = label;
    if (currentFilters.category === key) {
      option.selected = true;
    }
    categorySelect.appendChild(option);
  });

  categorySelect.addEventListener('change', () => {
    emitChange();
  });

  categoryGroup.appendChild(categoryLabel);
  categoryGroup.appendChild(categorySelect);

  // 3. Rango de Precio (Min / Max)
  const priceGroup = document.createElement('div');
  priceGroup.className = 'form-group form-group--price-range';

  const priceLabel = document.createElement('label');
  priceLabel.textContent = 'Rango de precio (COP)';

  const priceInputs = document.createElement('div');
  priceInputs.className = 'price-inputs';

  const minPriceInput = document.createElement('input');
  minPriceInput.type = 'number';
  minPriceInput.id = 'filter-min-price';
  minPriceInput.className = 'input-control';
  minPriceInput.placeholder = 'Mín';
  minPriceInput.min = '0';
  minPriceInput.step = '10000';
  minPriceInput.value = currentFilters.minPrice || '';
  minPriceInput.setAttribute('aria-label', 'Precio mínimo en COP');

  const priceSep = document.createElement('span');
  priceSep.className = 'price-separator';
  priceSep.textContent = '—';

  const maxPriceInput = document.createElement('input');
  maxPriceInput.type = 'number';
  maxPriceInput.id = 'filter-max-price';
  maxPriceInput.className = 'input-control';
  maxPriceInput.placeholder = 'Máx';
  maxPriceInput.min = '0';
  maxPriceInput.step = '10000';
  maxPriceInput.value = currentFilters.maxPrice || '';
  maxPriceInput.setAttribute('aria-label', 'Precio máximo en COP');

  let priceDebounce = null;
  const handlePriceInput = () => {
    clearTimeout(priceDebounce);
    priceDebounce = setTimeout(() => {
      emitChange();
    }, 400);
  };

  minPriceInput.addEventListener('input', handlePriceInput);
  maxPriceInput.addEventListener('input', handlePriceInput);

  priceInputs.appendChild(minPriceInput);
  priceInputs.appendChild(priceSep);
  priceInputs.appendChild(maxPriceInput);

  priceGroup.appendChild(priceLabel);
  priceGroup.appendChild(priceInputs);

  // 4. Ordenamiento
  const sortGroup = document.createElement('div');
  sortGroup.className = 'form-group';

  const sortLabel = document.createElement('label');
  sortLabel.htmlFor = 'filter-sort';
  sortLabel.textContent = 'Ordenar por';

  const sortSelect = document.createElement('select');
  sortSelect.id = 'filter-sort';
  sortSelect.className = 'select-control';

  const sortOptions = [
    { value: '-createdAt', label: 'Más recientes' },
    { value: 'price', label: 'Precio: menor a mayor' },
    { value: '-price', label: 'Precio: mayor a menor' }
  ];

  sortOptions.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (currentFilters.sort === opt.value) {
      option.selected = true;
    }
    sortSelect.appendChild(option);
  });

  sortSelect.addEventListener('change', () => {
    emitChange();
  });

  sortGroup.appendChild(sortLabel);
  sortGroup.appendChild(sortSelect);

  // 5. Botón Resetear / Limpiar
  const resetGroup = document.createElement('div');
  resetGroup.className = 'form-group';

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'btn-reset-filters';
  resetBtn.title = 'Restablecer todos los filtros';
  resetBtn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
      <path d="M3 3v5h5"></path>
    </svg>
    <span>Limpiar</span>
  `;

  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    categorySelect.value = '';
    minPriceInput.value = '';
    maxPriceInput.value = '';
    sortSelect.value = '-createdAt';
    emitChange();
  });

  resetGroup.appendChild(resetBtn);

  // Ensamblar formulario
  form.appendChild(searchGroup);
  form.appendChild(categoryGroup);
  form.appendChild(priceGroup);
  form.appendChild(sortGroup);
  form.appendChild(resetGroup);

  panel.appendChild(form);

  function emitChange() {
    const updated = {
      search: searchInput.value.trim(),
      category: categorySelect.value,
      minPrice: minPriceInput.value.trim(),
      maxPrice: maxPriceInput.value.trim(),
      sort: sortSelect.value
    };
    onFilterChange(updated);
  }

  return panel;
}
