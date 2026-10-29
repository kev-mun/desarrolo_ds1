import { h } from "./dom.js";

let contenedor;

export function toast(mensaje, tipo = "info") {
  if (!contenedor) {
    contenedor = h("div", { class: "toasts", "aria-live": "polite" });
    document.body.append(contenedor);
  }
  const aviso = h("div", { class: `toast ${tipo}` }, mensaje);
  contenedor.append(aviso);
  setTimeout(() => aviso.remove(), 4000);
}