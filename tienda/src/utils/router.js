import { h } from "./dom.js";
import { getToken } from "./auth.js";

const rutas = [];

export function addRoute(patron, manejador, { auth = true } = {}) {
  rutas.push({ patron, manejador, auth });
}

export function getQuery() {
  return new URLSearchParams(location.hash.split("?")[1] || "");
}

export function startRouter(salida, alCambiar) {
  const pintar = async () => {
    const ruta = (location.hash.slice(1).split("?")[0]) || "/";
    for (const r of rutas) {
      const coincide = ruta.match(r.patron);
      if (!coincide) continue;
      if (r.auth && !getToken()) {
        location.hash = "#/login";
        return;
      }
      if (alCambiar) alCambiar();
      salida.replaceChildren();
      await r.manejador(salida, coincide.slice(1));
      window.scrollTo(0, 0);
      return;
    }
    if (alCambiar) alCambiar();
    salida.replaceChildren(h("p", { class: "estado" }, "Página no encontrada"));
  };
  window.addEventListener("hashchange", pintar);
  pintar();
}