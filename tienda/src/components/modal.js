import { h } from "../utils/dom.js";

let abierto = null;

/**
 * Ventana modal accesible. Se cierra con Esc, con el botón ×, o al hacer clic fuera.
 * Devuelve { cerrar, cuerpo } para poder rellenar el contenido después (por ejemplo, tras cargar datos).
 */
export function abrirModal(titulo, contenido) {
  if (abierto) abierto.cerrar();

  const previo = document.activeElement;
  const cuerpo = h("div", { class: "modal-cuerpo" }, contenido || null);
  const cerrarBtn = h("button", { class: "modal-cerrar", type: "button" }, "×");
  cerrarBtn.setAttribute("aria-label", "Cerrar");

  const caja = h(
    "div",
    { class: "modal-caja", tabindex: "-1" },
    h("div", { class: "modal-cab" }, h("h2", { class: "modal-titulo" }, titulo), cerrarBtn),
    cuerpo
  );
  caja.setAttribute("role", "dialog");
  caja.setAttribute("aria-modal", "true");
  caja.setAttribute("aria-label", titulo);

  const fondo = h("div", { class: "modal-fondo" }, caja);

  function cerrar() {
    document.removeEventListener("keydown", teclas);
    fondo.remove();
    if (abierto && abierto.fondo === fondo) abierto = null;
    if (previo && typeof previo.focus === "function") previo.focus();
  }

  function teclas(e) {
    if (e.key === "Escape") cerrar();
  }

  fondo.addEventListener("mousedown", (e) => {
    if (e.target === fondo) cerrar();
  });
  cerrarBtn.addEventListener("click", cerrar);
  document.addEventListener("keydown", teclas);

  document.body.appendChild(fondo);
  caja.focus();

  abierto = { cerrar, fondo };
  return { cerrar, cuerpo };
}

/** Atajo: ejecuta `accion` al hacer doble clic sobre el elemento (y con Enter, para teclado). */
export function alDobleClic(elemento, accion, ayuda = "Doble clic para ver el detalle") {
  elemento.addEventListener("dblclick", accion);
  elemento.addEventListener("keydown", (e) => {
    if (e.key === "Enter") accion(e);
  });
  elemento.setAttribute("tabindex", "0");
  elemento.setAttribute("title", ayuda);
  elemento.classList.add("doble-clic");
  return elemento;
}
