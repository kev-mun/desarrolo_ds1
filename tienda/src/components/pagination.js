/**
 * Crea el componente de paginación accesible.
 * @param {Object} options
 * @param {number} options.currentPage - Página actual (1-indexed)
 * @param {number} options.totalPages - Total de páginas disponibles
 * @param {(page: number) => void} options.onPageChange - Función llamada al cambiar de página
 * @returns {HTMLElement|null}
 */
export function createPagination({ currentPage, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  const nav = document.createElement('nav');
  nav.className = 'pagination-wrapper';
  nav.setAttribute('aria-label', 'Paginación del catálogo');

  // Botón Anterior
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'pagination-btn pagination-btn--prev';
  prevBtn.setAttribute('aria-label', 'Página anterior');
  prevBtn.disabled = currentPage <= 1;
  prevBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  `;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  });
  nav.appendChild(prevBtn);

  // Generar números de página con elipsis si hay muchas páginas
  const pageNumbers = getVisiblePages(currentPage, totalPages);

  pageNumbers.forEach(item => {
    if (item === '...') {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'pagination-ellipsis';
      ellipsis.textContent = '…';
      ellipsis.setAttribute('aria-hidden', 'true');
      nav.appendChild(ellipsis);
    } else {
      const pageBtn = document.createElement('button');
      pageBtn.type = 'button';
      pageBtn.className = `pagination-btn ${item === currentPage ? 'active' : ''}`;
      pageBtn.textContent = String(item);
      pageBtn.setAttribute('aria-label', `Página ${item}`);
      if (item === currentPage) {
        pageBtn.setAttribute('aria-current', 'page');
      }
      pageBtn.addEventListener('click', () => {
        if (item !== currentPage) {
          onPageChange(item);
        }
      });
      nav.appendChild(pageBtn);
    }
  });

  // Botón Siguiente
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'pagination-btn pagination-btn--next';
  nextBtn.setAttribute('aria-label', 'Página siguiente');
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  `;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  });
  nav.appendChild(nextBtn);

  return nav;
}

/**
 * Calcula qué números de página mostrar.
 * @param {number} current 
 * @param {number} total 
 * @returns {(number|string)[]}
 */
function getVisiblePages(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [];
  pages.push(1);

  if (current > 3) {
    pages.push('...');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('...');
  }

  pages.push(total);
  return pages;
}
