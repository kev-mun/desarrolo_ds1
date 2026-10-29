import { h } from "../utils/dom.js";
import { request } from "../api/client.js";
import { getQuery } from "../utils/router.js";

export async function renderCatalogo(salida) {
  const consulta = getQuery();
  const estado = {
    q: consulta.get("q") || "",
    coleccion: consulta.get("coleccion") || "",
    page: Number(consulta.get("page")) || 1,
  };

  const resultados = h("div", { id: "resultados" });

  let colecciones = [];
  try {
    const r = await request("/colecciones");
    colecciones = Array.isArray(r) ? r : r.data || [];
  } catch {
    colecciones = [];
  }

  const input = h("input", {
    type: "search",
    id: "q",
    value: estado.q,
    placeholder: "Buscar por título, autor, ISBN o categoría",
    "aria-label": "Buscar libros",
  });

  const selector = h(
    "select",
    {
      id: "coleccion",
      "aria-label": "Colección",
      onchange: (e) => {
        estado.coleccion = e.target.value;
        estado.page = 1;
        cargar();
      },
    },
    h("option", { value: "" }, "Todas las colecciones"),
    colecciones.map((c) => h("option", { value: c._id, selected: c._id === estado.coleccion }, c.nombre))
  );

  let temporizador;
  input.addEventListener("input", () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      estado.q = input.value.trim();
      estado.page = 1;
      cargar();
    }, 400);
  });

  let secuencia = 0;

  const guardarUrl = () => {
    const p = new URLSearchParams();
    if (estado.q) p.set("q", estado.q);
    if (estado.coleccion) p.set("coleccion", estado.coleccion);
    if (estado.page > 1) p.set("page", estado.page);
    const texto = p.toString();
    history.replaceState(null, "", `#/${texto ? `?${texto}` : ""}`);
  };

  const tarjeta = (libro) => {
    const total = libro.ejemplaresTotales ?? 0;
    const libres = libro.ejemplaresDisponibles ?? 0;
    const disponibilidad = libres === 0 ? "Sin ejemplares disponibles" : `${libres} de ${total} ejemplares disponibles`;
    return h(
      "article",
      { class: "libro" },
      h("div", { class: "portada", "aria-hidden": "true" }, (libro.titulo || "?").charAt(0).toUpperCase()),
      h(
        "div",
        { class: "libro-info" },
        libro.categoria ? h("span", { class: "etiqueta" }, libro.categoria) : null,
        h("h3", {}, libro.titulo),
        h("p", { class: "muted" }, libro.autor),
        h("p", { class: `disp ${libres === 0 ? "sin" : "ok"}` }, disponibilidad),
        h("a", { class: "btn btn-sec", href: `#/libro/${libro._id}` }, "Ver detalle")
      )
    );
  };

  const pintar = (r) => {
    const libros = r.data || [];
    if (libros.length === 0) {
      resultados.replaceChildren(h("p", { class: "estado" }, "No se encontraron libros con esos criterios."));
      return;
    }
    const { page = 1, pages = 1, total = libros.length } = r.pagination || {};
    resultados.replaceChildren(
      h("p", { class: "muted" }, `${total} libro${total === 1 ? "" : "s"}`),
      h("div", { class: "rejilla" }, libros.map(tarjeta)),
      pages > 1
        ? h(
            "nav",
            { class: "paginacion", "aria-label": "Paginación" },
            h(
              "button",
              {
                class: "btn btn-sec",
                disabled: page <= 1,
                onclick: () => {
                  estado.page = page - 1;
                  cargar();
                },
              },
              "Anterior"
            ),
            h("span", {}, `Página ${page} de ${pages}`),
            h(
              "button",
              {
                class: "btn btn-sec",
                disabled: page >= pages,
                onclick: () => {
                  estado.page = page + 1;
                  cargar();
                },
              },
              "Siguiente"
            )
          )
        : null
    );
  };

  async function cargar() {
    const mia = ++secuencia;
    guardarUrl();
    resultados.replaceChildren(h("p", { class: "estado" }, "Cargando…"));
    try {
      const r = await request("/libros", {
        params: { q: estado.q, coleccion: estado.coleccion, page: estado.page, limit: 12 },
      });
      if (mia !== secuencia) return;
      pintar(r);
    } catch (err) {
      if (mia !== secuencia) return;
      resultados.replaceChildren(
        h("div", { class: "estado error" }, h("p", {}, err.message), h("button", { class: "btn", onclick: cargar }, "Reintentar"))
      );
    }
  }

  salida.replaceChildren(
    h("h1", {}, "Catálogo"),
    h("div", { class: "filtros" }, input, selector),
    resultados
  );
  cargar();
}