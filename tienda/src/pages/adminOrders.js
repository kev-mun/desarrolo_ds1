import { getOrders, updateOrderStatus, deleteOrder } from '../api/orders.js';
import { formatPrice } from '../utils/format.js';
import { showToast } from '../utils/toast.js';

/**
 * Renderiza la página del Panel de Administración de Pedidos (#/admin).
 * @param {HTMLElement} container - Contenedor principal de la aplicación
 */
export function renderAdminOrdersPage(container) {
  container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'admin-page';

  // 1. Barra de navegación secundaria
  const navBar = document.createElement('div');
  navBar.className = 'detail-nav';

  const backBtn = document.createElement('a');
  backBtn.href = '#/';
  backBtn.className = 'btn-back';
  backBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
    <span>Volver a la Tienda</span>
  `;
  navBar.appendChild(backBtn);
  page.appendChild(navBar);

  // 2. Encabezado principal del Dashboard
  const header = document.createElement('div');
  header.className = 'admin-header';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'admin-header__title-wrap';

  const badge = document.createElement('div');
  badge.className = 'hero__badge';
  badge.innerHTML = `
    <span class="hero__badge-dot"></span>
    <span>Consola de Administración TiendaPC</span>
  `;

  const title = document.createElement('h1');
  title.className = 'admin-header__title';
  title.textContent = 'Gestión de Pedidos';

  const subtitle = document.createElement('p');
  subtitle.className = 'admin-header__subtitle';
  subtitle.textContent = 'Supervisa y administra en tiempo real las órdenes y compras sincronizadas con MongoDB.';

  titleWrap.appendChild(badge);
  titleWrap.appendChild(title);
  titleWrap.appendChild(subtitle);

  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'btn btn-secondary admin-refresh-btn';
  refreshBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18">
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
    <span>Actualizar Datos</span>
  `;
  refreshBtn.addEventListener('click', () => {
    loadOrders();
  });

  header.appendChild(titleWrap);
  header.appendChild(refreshBtn);
  page.appendChild(header);

  // 3. Tarjetas métricas (KPIs)
  const metricsContainer = document.createElement('div');
  metricsContainer.className = 'admin-metrics-grid';
  metricsContainer.id = 'admin-metrics';
  page.appendChild(metricsContainer);

  // 4. Barra de búsqueda y filtros
  const filterBar = document.createElement('div');
  filterBar.className = 'admin-filter-bar';

  const searchInputWrapper = document.createElement('div');
  searchInputWrapper.className = 'admin-search-wrapper';
  searchInputWrapper.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="18" height="18">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
    <input
      type="text"
      id="admin-search-input"
      class="form-input admin-search-input"
      placeholder="Buscar por # de orden, cliente, teléfono o dirección..."
    />
  `;

  const statusFilterSelect = document.createElement('select');
  statusFilterSelect.id = 'admin-status-select';
  statusFilterSelect.className = 'form-input admin-status-select';
  statusFilterSelect.innerHTML = `
    <option value="all">Todos los estados</option>
    <option value="completado">Completados</option>
    <option value="pendiente">Pendientes</option>
    <option value="cancelado">Cancelados</option>
  `;

  filterBar.appendChild(searchInputWrapper);
  filterBar.appendChild(statusFilterSelect);
  page.appendChild(filterBar);

  // 5. Contenedor de listado de pedidos
  const ordersListContainer = document.createElement('div');
  ordersListContainer.className = 'admin-orders-container';
  ordersListContainer.id = 'admin-orders-container';
  page.appendChild(ordersListContainer);

  container.appendChild(page);

  // Estado local para búsqueda y filtrado
  let allOrders = [];

  const searchInput = filterBar.querySelector('#admin-search-input');
  searchInput.addEventListener('input', () => {
    applyFilters();
  });

  statusFilterSelect.addEventListener('change', () => {
    applyFilters();
  });

  // Carga inicial
  loadOrders();

  async function loadOrders() {
    renderLoading(ordersListContainer);
    refreshBtn.disabled = true;

    try {
      const response = await getOrders();
      allOrders = response.data || [];
      renderMetrics(metricsContainer, allOrders);
      applyFilters();
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      renderError(ordersListContainer, error.message || 'Error al conectar con la base de datos de pedidos.', () => loadOrders());
    } finally {
      refreshBtn.disabled = false;
    }
  }

  function applyFilters() {
    const term = searchInput.value.toLowerCase().trim();
    const status = statusFilterSelect.value;

    const filtered = allOrders.filter((order) => {
      const matchesStatus = status === 'all' || (order.status || 'completado') === status;
      if (!matchesStatus) return false;

      if (!term) return true;

      const orderNum = (order.orderNumber || order._id || '').toLowerCase();
      const clientName = (order.customer?.name || '').toLowerCase();
      const clientPhone = (order.customer?.phone || '').toLowerCase();
      const clientAddress = (order.customer?.address || '').toLowerCase();
      const clientEmail = (order.customer?.email || '').toLowerCase();

      return (
        orderNum.includes(term) ||
        clientName.includes(term) ||
        clientPhone.includes(term) ||
        clientAddress.includes(term) ||
        clientEmail.includes(term)
      );
    });

    renderOrdersList(ordersListContainer, filtered, () => loadOrders());
  }
}

/**
 * Renderiza las métricas KPI resumidas.
 */
function renderMetrics(container, orders) {
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const avgTicket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Clientes únicos por teléfono o nombre
  const uniqueClients = new Set(orders.map((o) => (o.customer?.phone || o.customer?.name || '').toLowerCase())).size;

  container.innerHTML = `
    <div class="admin-kpi-card">
      <div class="admin-kpi-card__icon admin-kpi-card__icon--cyan">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
      </div>
      <div class="admin-kpi-card__info">
        <span class="admin-kpi-card__label">Pedidos Totales</span>
        <strong class="admin-kpi-card__value">${totalOrders}</strong>
      </div>
    </div>

    <div class="admin-kpi-card">
      <div class="admin-kpi-card__icon admin-kpi-card__icon--green">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      </div>
      <div class="admin-kpi-card__info">
        <span class="admin-kpi-card__label">Ingresos Registrados</span>
        <strong class="admin-kpi-card__value admin-kpi-card__value--accent">${formatPrice(totalRevenue)}</strong>
      </div>
    </div>

    <div class="admin-kpi-card">
      <div class="admin-kpi-card__icon admin-kpi-card__icon--blue">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>
      <div class="admin-kpi-card__info">
        <span class="admin-kpi-card__label">Ticket Promedio</span>
        <strong class="admin-kpi-card__value">${formatPrice(avgTicket)}</strong>
      </div>
    </div>

    <div class="admin-kpi-card">
      <div class="admin-kpi-card__icon admin-kpi-card__icon--purple">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      </div>
      <div class="admin-kpi-card__info">
        <span class="admin-kpi-card__label">Clientes Atendidos</span>
        <strong class="admin-kpi-card__value">${uniqueClients}</strong>
      </div>
    </div>
  `;
}

/**
 * Renderiza el listado de tarjetas de órdenes.
 */
function renderOrdersList(container, orders, onReload) {
  container.innerHTML = '';

  if (orders.length === 0) {
    const emptyBox = document.createElement('div');
    emptyBox.className = 'state-container';
    emptyBox.innerHTML = `
      <div class="state-icon state-icon--empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="40" height="40">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
      </div>
      <h2 class="state-title">No se encontraron pedidos</h2>
      <p class="state-message">No existen órdenes que coincidan con el criterio de búsqueda o filtros seleccionados.</p>
    `;
    container.appendChild(emptyBox);
    return;
  }

  const list = document.createElement('div');
  list.className = 'admin-orders-list';

  orders.forEach((order) => {
    const card = document.createElement('article');
    card.className = 'admin-order-card';
    card.id = `order-card-${order._id}`;

    // Fecha formateada
    const orderDate = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Fecha reciente';

    // 1. Header de la orden
    const cardHeader = document.createElement('div');
    cardHeader.className = 'admin-order-card__header';

    const orderIdent = document.createElement('div');
    orderIdent.className = 'admin-order-card__ident';
    orderIdent.innerHTML = `
      <div class="admin-order-card__num-wrap">
        <span class="checkout-order-badge">${order.orderNumber || order._id}</span>
        <span class="admin-order-card__date">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          ${orderDate}
        </span>
      </div>
    `;

    const statusActions = document.createElement('div');
    statusActions.className = 'admin-order-card__status-wrap';

    const statusSelect = document.createElement('select');
    statusSelect.className = `admin-order-status-badge admin-order-status-badge--${order.status || 'completado'}`;
    statusSelect.innerHTML = `
      <option value="completado" ${(order.status || 'completado') === 'completado' ? 'selected' : ''}>Completado</option>
      <option value="pendiente" ${order.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
      <option value="cancelado" ${order.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
    `;

    statusSelect.addEventListener('change', async (e) => {
      const newStatus = e.target.value;
      try {
        await updateOrderStatus(order._id, newStatus);
        statusSelect.className = `admin-order-status-badge admin-order-status-badge--${newStatus}`;
        showToast({
          title: 'Estado actualizado',
          message: `Orden #${order.orderNumber || order._id} marcada como "${newStatus}".`,
          type: 'success'
        });
      } catch (err) {
        showToast({
          title: 'Error al cambiar estado',
          message: err.message,
          type: 'danger'
        });
        statusSelect.value = order.status || 'completado';
      }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-delete-order';
    deleteBtn.title = 'Eliminar pedido';
    deleteBtn.setAttribute('aria-label', `Eliminar pedido ${order.orderNumber || order._id}`);
    deleteBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    deleteBtn.addEventListener('click', async () => {
      if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el pedido ${order.orderNumber || order._id}?`)) {
        try {
          await deleteOrder(order._id);
          showToast({
            title: 'Pedido eliminado',
            message: `El pedido ${order.orderNumber || order._id} fue eliminado.`,
            type: 'info'
          });
          onReload();
        } catch (err) {
          showToast({
            title: 'Error al eliminar',
            message: err.message,
            type: 'danger'
          });
        }
      }
    });

    statusActions.appendChild(statusSelect);
    statusActions.appendChild(deleteBtn);

    cardHeader.appendChild(orderIdent);
    cardHeader.appendChild(statusActions);

    // 2. Información del Cliente
    const customer = order.customer || {};
    const customerBox = document.createElement('div');
    customerBox.className = 'admin-order-customer';
    customerBox.innerHTML = `
      <div class="admin-order-customer__col">
        <span class="admin-order-customer__label">Cliente</span>
        <strong class="admin-order-customer__name">${customer.name || 'Sin nombre'}</strong>
        ${customer.email ? `<span class="admin-order-customer__email">${customer.email}</span>` : ''}
      </div>
      <div class="admin-order-customer__col">
        <span class="admin-order-customer__label">Teléfono / Contacto</span>
        <span class="admin-order-customer__phone">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          ${customer.phone || 'No registrado'}
        </span>
      </div>
      <div class="admin-order-customer__col admin-order-customer__col--full">
        <span class="admin-order-customer__label">Dirección de Entrega</span>
        <span class="admin-order-customer__address">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          ${customer.address || 'No especificada'}
        </span>
        ${customer.notes ? `<p class="admin-order-customer__notes"><em>Nota: ${customer.notes}</em></p>` : ''}
      </div>
    `;

    // 3. Lista de Productos Comprados
    const items = order.items || [];
    const itemsTableWrap = document.createElement('div');
    itemsTableWrap.className = 'admin-order-items';

    const itemsHeader = document.createElement('h4');
    itemsHeader.className = 'admin-order-items__title';
    itemsHeader.textContent = `Productos comprados (${items.reduce((s, it) => s + (Number(it.quantity) || 1), 0)} unidades)`;
    itemsTableWrap.appendChild(itemsHeader);

    const itemsList = document.createElement('div');
    itemsList.className = 'admin-order-items__list';

    items.forEach((item) => {
      const itemRow = document.createElement('div');
      itemRow.className = 'admin-order-item-row';

      const img = document.createElement('img');
      img.className = 'admin-order-item__img';
      img.src = item.image || 'https://placehold.co/80x80?text=Hardware';
      img.alt = item.name;
      img.width = 44;
      img.height = 44;
      img.loading = 'lazy';
      img.addEventListener('error', () => {
        img.src = 'https://placehold.co/80x80?text=Hardware';
      });

      const itemInfo = document.createElement('div');
      itemInfo.className = 'admin-order-item__info';
      itemInfo.innerHTML = `
        <span class="admin-order-item__name">${item.name}</span>
        <span class="admin-order-item__qty-price">${item.quantity} × ${formatPrice(item.price)}</span>
      `;

      const subtotal = document.createElement('span');
      subtotal.className = 'admin-order-item__subtotal';
      subtotal.textContent = formatPrice((Number(item.price) || 0) * (Number(item.quantity) || 1));

      itemRow.appendChild(img);
      itemRow.appendChild(itemInfo);
      itemRow.appendChild(subtotal);

      itemsList.appendChild(itemRow);
    });

    itemsTableWrap.appendChild(itemsList);

    // 4. Footer con Total
    const cardFooter = document.createElement('div');
    cardFooter.className = 'admin-order-card__footer';
    cardFooter.innerHTML = `
      <span class="admin-order-card__footer-label">Monto Total de la Orden</span>
      <strong class="admin-order-card__total">${formatPrice(order.total)}</strong>
    `;

    card.appendChild(cardHeader);
    card.appendChild(customerBox);
    card.appendChild(itemsTableWrap);
    card.appendChild(cardFooter);

    list.appendChild(card);
  });

  container.appendChild(list);
}

/**
 * Muestra el esqueleto de carga.
 */
function renderLoading(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1rem; padding: 2rem 0;">
      <div class="skeleton-shimmer skeleton-line skeleton-line--medium" style="height: 38px;"></div>
      <div class="skeleton-shimmer" style="height: 220px; border-radius: var(--radius-lg);"></div>
      <div class="skeleton-shimmer" style="height: 220px; border-radius: var(--radius-lg);"></div>
    </div>
  `;
}

/**
 * Muestra el mensaje de error.
 */
function renderError(container, message, onRetry) {
  container.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'state-container';
  box.innerHTML = `
    <div class="state-icon state-icon--error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="40" height="40">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    </div>
    <h2 class="state-title">Error al consultar pedidos</h2>
    <p class="state-message">${message}</p>
    <button type="button" class="btn btn-primary" id="admin-retry-btn">Reintentar</button>
  `;
  const retryBtn = box.querySelector('#admin-retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', onRetry);
  }
  container.appendChild(box);
}
