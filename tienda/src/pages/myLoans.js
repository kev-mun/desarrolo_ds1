import { h } from "../utils/dom.js";
import { request } from "../api/client.js";
import { getUsuario } from "../utils/auth.js";
import { tablaPrestamos } from "../utils/prestamos.js";

export async function renderMisPrestamos(salida) {
  const usuario = getUsuario();
  salida.replaceChildren(h("h1", {}, "Mis préstamos"), h("p", {}, "Cargando tus préstamos…"));

  try {
    const r = await request("/prestamos", { params: { usuario: usuario && usuario._id } });
    const lista = Array.isArray(r) ? r : r.data || [];

    if (!lista.length) {
      salida.replaceChildren(
        h("h1", {}, "Mis préstamos"),
        h("p", { class: "vacio" }, "Aún no tienes préstamos."),
        h("a", { href: "#/", class: "btn" }, "Ir al catálogo")
      );
      return;
    }

    salida.replaceChildren(h("h1", {}, "Mis préstamos"), tablaPrestamos(lista));
  } catch (e) {
    salida.replaceChildren(
      h("h1", {}, "Mis préstamos"),
      h("p", { class: "error" }, e.message || "No se pudieron cargar tus préstamos."),
      h("button", { class: "btn", onclick: () => renderMisPrestamos(salida) }, "Reintentar")
    );
  }
}