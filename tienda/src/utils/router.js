/**
 * Router basado en Hash para SPA vanilla.
 * Rutas soportadas:
 * - '#/' (Catálogo, con soporte para query params: #/?search=...&category=...)
 * - '#/producto/:id' (Detalle de producto)
 */

/**
 * Parsea el hash actual de la ventana y extrae la ruta, parámetros de ruta y query params.
 * @returns {{ route: 'catalog'|'product-detail'|'not-found', path: string, params: Object, query: Record<string, string> }}
 */
export function parseCurrentLocation() {
  const rawHash = window.location.hash ? window.location.hash.substring(1) : '/';
  const [rawPath, queryString] = rawHash.split('?');
  const path = (rawPath || '/').trim();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const searchParams = new URLSearchParams(queryString || '');
  const query = Object.fromEntries(searchParams.entries());

  // Coincidencia con #/producto/:id
  const productMatch = normalizedPath.match(/^\/producto\/([^/]+)$/);
  if (productMatch) {
    return {
      route: 'product-detail',
      path: normalizedPath,
      params: { id: decodeURIComponent(productMatch[1]) },
      query
    };
  }

  // Coincidencia con #/admin o #/admin/orders
  if (normalizedPath === '/admin' || normalizedPath === '/admin/orders') {
    return {
      route: 'admin',
      path: normalizedPath,
      params: {},
      query
    };
  }

  // Coincidencia con #/carrito o #/cart
  if (normalizedPath === '/carrito' || normalizedPath === '/cart') {
    return {
      route: 'cart',
      path: normalizedPath,
      params: {},
      query
    };
  }

  // Coincidencia con #/ o raíz
  if (normalizedPath === '/' || normalizedPath === '') {
    return {
      route: 'catalog',
      path: '/',
      params: {},
      query
    };
  }

  return {
    route: 'not-found',
    path: normalizedPath,
    params: {},
    query
  };
}

/**
 * Navega a un hash específico.
 * @param {string} targetHash 
 */
export function navigate(targetHash) {
  const hashWithPrefix = targetHash.startsWith('#') ? targetHash : `#${targetHash}`;
  window.location.hash = hashWithPrefix;
}

/**
 * Actualiza los query parameters en la URL para el catálogo.
 * @param {Record<string, string|number>} queryParams
 * @param {boolean} [replace=false]
 */
export function setCatalogQueryParams(queryParams, replace = false) {
  const searchParams = new URLSearchParams();

  Object.entries(queryParams).forEach(([key, val]) => {
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      searchParams.set(key, String(val).trim());
    }
  });

  const queryStr = searchParams.toString();
  const targetHash = queryStr ? `#/?${queryStr}` : '#/';

  if (replace) {
    const currentUrl = new URL(window.location.href);
    currentUrl.hash = targetHash;
    window.history.replaceState(null, '', currentUrl.toString());
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = targetHash;
  }
}

/**
 * Inicializa el listener del router y ejecuta el callback en el estado inicial.
 * @param {(location: ReturnType<typeof parseCurrentLocation>) => void} onChange
 * @returns {() => void} Función de limpieza
 */
export function initRouter(onChange) {
  const handleRouting = () => {
    // Si no hay hash, establecer #/ por defecto
    if (!window.location.hash) {
      window.location.hash = '#/';
      return;
    }
    const location = parseCurrentLocation();
    onChange(location);
  };

  window.addEventListener('hashchange', handleRouting);
  // Ejecución inicial
  handleRouting();

  return () => {
    window.removeEventListener('hashchange', handleRouting);
  };
}
