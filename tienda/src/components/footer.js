/**
 * Componente Footer para TiendaPC
 * @returns {HTMLElement}
 */
export function createFooter() {
  const footer = document.createElement('footer');
  footer.className = 'site-footer';

  const container = document.createElement('div');
  container.className = 'site-footer__container';

  // Columna marca
  const brandCol = document.createElement('div');
  brandCol.className = 'site-footer__brand';

  const brandHeading = document.createElement('h3');
  brandHeading.textContent = 'TiendaPC';

  const brandDesc = document.createElement('p');
  brandDesc.textContent = 'Especialistas en hardware, computadores para gaming, estaciones de trabajo y periféricos de alto desempeño.';

  brandCol.appendChild(brandHeading);
  brandCol.appendChild(brandDesc);

  // Columna Enlaces
  const linksCol = document.createElement('div');
  linksCol.className = 'site-footer__col';

  const linksHeading = document.createElement('h4');
  linksHeading.textContent = 'Categorías';

  const linksList = document.createElement('ul');
  linksList.className = 'site-footer__list';

  const categories = [
    { name: 'Portátiles', href: '#/?category=portatiles' },
    { name: 'Tarjetas Gráficas', href: '#/?category=tarjetas-graficas' },
    { name: 'Procesadores', href: '#/?category=procesadores' },
    { name: 'Monitores', href: '#/?category=monitores' }
  ];

  categories.forEach(cat => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = cat.href;
    a.textContent = cat.name;
    li.appendChild(a);
    linksList.appendChild(li);
  });

  linksCol.appendChild(linksHeading);
  linksCol.appendChild(linksList);

  // Columna Soporte / API
  const supportCol = document.createElement('div');
  supportCol.className = 'site-footer__col';

  const supportHeading = document.createElement('h4');
  supportHeading.textContent = 'Garantía & Soporte';

  const supportList = document.createElement('ul');
  supportList.className = 'site-footer__list';

  const supportItems = [
    'Envíos a todo el país',
    'Garantía directa de fábrica',
    'Soporte técnico especializado'
  ];

  supportItems.forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    supportList.appendChild(li);
  });

  supportCol.appendChild(supportHeading);
  supportCol.appendChild(supportList);

  container.appendChild(brandCol);
  container.appendChild(linksCol);
  container.appendChild(supportCol);

  // Bottom bar
  const bottomBar = document.createElement('div');
  bottomBar.className = 'site-footer__bottom';

  const copy = document.createElement('p');
  copy.textContent = `© ${new Date().getFullYear()} TiendaPC. Todos los derechos reservados.`;

  const techBadge = document.createElement('p');
  techBadge.textContent = 'Desarrollado con JavaScript Vanilla & Express API';

  bottomBar.appendChild(copy);
  bottomBar.appendChild(techBadge);

  footer.appendChild(container);
  footer.appendChild(bottomBar);

  return footer;
}
