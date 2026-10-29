import { h } from "../utils/dom.js";
import { getUsuario, clearSession } from "../utils/auth.js";

export function renderHeader() {
  const usuario = getUsuario();
  const enlaces = [{ href: "#/", texto: "Catálogo" }];
  const actual = location.hash.split("?")[0] || "#/";

  const nav = h(
    "nav",
    { class: "nav", "aria-label": "Principal" },
    enlaces.map((e) => h("a", { href: e.href, class: actual === e.href ? "activo" : "" }, e.texto))
  );

  const sesion = usuario
    ? h(
        "div",
        { class: "sesion" },
        h("span", { class: "usuario" }, `${usuario.nombre} · ${usuario.rol}`),
        h(
          "button",
          {
            class: "btn btn-sec",
            onclick: () => {
              clearSession();
              location.hash = "#/login";
            },
          },
          "Salir"
        )
      )
    : null;

  return h(
    "header",
    { class: "cabecera" },
    h("div", { class: "contenedor cabecera-in" }, h("a", { href: "#/", class: "marca" }, "📚 Biblioteca"), usuario ? nav : null, sesion)
  );
}