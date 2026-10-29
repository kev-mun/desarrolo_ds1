// Crea elementos del DOM sin usar innerHTML (evita inyección de HTML con datos de la API)
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [clave, valor] of Object.entries(attrs || {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave === "class") el.className = valor;
    else if (clave.startsWith("on") && typeof valor === "function") {
      el.addEventListener(clave.slice(2).toLowerCase(), valor);
    } else if (valor === true) el.setAttribute(clave, "");
    else el.setAttribute(clave, valor);
  }
  for (const hijo of children.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return el;
}