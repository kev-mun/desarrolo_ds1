import { formatPrice, formatCategory } from '../utils/format.js';

/**
 * Crea el elemento DOM para una tarjeta de producto de forma segura (sin innerHTML con datos de la API).
 * @param {Object} product - Datos del producto provenientes de la API
 * @returns {HTMLElement}
 */
export function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.setAttribute('aria-labelledby', `product-title-${product._id}`);

  // Contenedor de Imagen
  const imageContainer = document.createElement('div');
  imageContainer.className = 'product-card__image-container';

  const img = document.createElement('img');
  img.className = 'product-card__image';
  img.src = product.image || 'https://placehold.co/600x400?text=Sin+Imagen';
  img.alt = product.name ? `Imagen de ${product.name}` : 'Producto TiendaPC';
  img.loading = 'lazy';
  img.width = 300;
  img.height = 200;

  // Manejo de error de carga de imagen
  img.addEventListener('error', () => {
    img.src = 'https://placehold.co/600x400?text=Hardware';
  });

  // Badge de categoría
  const categoryBadge = document.createElement('span');
  categoryBadge.className = 'product-card__badge-category';
  categoryBadge.textContent = formatCategory(product.category);

  imageContainer.appendChild(img);
  imageContainer.appendChild(categoryBadge);

  // Badge de Agotado si stock es 0
  const isOutOfStock = Number(product.stock) <= 0;
  if (isOutOfStock) {
    const stockBadge = document.createElement('span');
    stockBadge.className = 'product-card__badge-stock';
    stockBadge.textContent = 'Agotado';
    imageContainer.appendChild(stockBadge);
  }

  // Contenido de la tarjeta
  const content = document.createElement('div');
  content.className = 'product-card__content';

  // Marca
  const brand = document.createElement('span');
  brand.className = 'product-card__brand';
  brand.textContent = product.brand || 'Genérico';

  // Título
  const title = document.createElement('h3');
  title.className = 'product-card__title';
  title.id = `product-title-${product._id}`;
  title.textContent = product.name || 'Producto sin nombre';

  // Precio
  const priceWrapper = document.createElement('div');
  priceWrapper.className = 'product-card__price-wrapper';

  const priceLabel = document.createElement('span');
  priceLabel.className = 'product-card__price-label';
  priceLabel.textContent = 'Precio';

  const price = document.createElement('span');
  price.className = 'product-card__price';
  price.textContent = formatPrice(product.price);

  priceWrapper.appendChild(priceLabel);
  priceWrapper.appendChild(price);

  // Acciones: Botón "Ver detalle" y Botón "Agregar al carrito" (Deshabilitado / Próximamente)
  const actions = document.createElement('div');
  actions.className = 'product-card__actions';

  const detailLink = document.createElement('a');
  detailLink.href = `#/producto/${encodeURIComponent(product._id)}`;
  detailLink.className = 'btn btn-primary btn-block';
  detailLink.textContent = 'Ver detalle';
  detailLink.setAttribute('aria-label', `Ver detalle de ${product.name}`);

  actions.appendChild(detailLink);

  content.appendChild(brand);
  content.appendChild(title);
  content.appendChild(priceWrapper);
  content.appendChild(actions);

  card.appendChild(imageContainer);
  card.appendChild(content);

  return card;
}
