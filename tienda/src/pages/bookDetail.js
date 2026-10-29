import { h } from "../utils/dom.js";
import { request } from "../api/client.js";
import { getUsuario } from "../utils/auth.js";
import { formatFecha } from "../utils/format.js";
import { toast } from "../utils/toast.js";

const ESTADOS = {
  disponible: "Disponible",
  prestado: "Prestado",
  reservado: "Reservado",
  danado: "Dañado",
  extraviado: "Extraviado",
};

export async function renderLibro(salida, [id]) {
  salida.replaceChildren(h("p", { class: "estado" }, "Cargando…"));

  let respuesta;
  try {
    respuesta = await request(`/libros/${id}`);
  } catch (err) {
    salida.replaceChildren(
      h(
        "div",
        { class: "estado error" },
        h("p", {}, err.estado === 404 ? "El libro no existe." : err.message),
        h("a", { class: "btn", href: "#/" }, "Volver al catálogo")
      )
    );
    return;
  }

  const libro = respuesta.libro || (respuesta.data && !Array.isArray(respuesta.data) ? respuesta.data : respuesta);
  const ejemplares = libro.ejemplares || respuesta.ejemplares || [];

  async function solicitar(ejemplar, boton) {
    boton.disabled = true;
    try {
      const r = await request("/prestamos", {
        method: "POST",
        body: { ejemplar: ejemplar._id, usuario: getUsuario()._id },
      });
      const vence = r?.fechaVencEsperada || r?.prestamo?.fechaVencEsperada || r?.data?.fechaVencEsperada;
      toast(vence ? `Préstamo registrado. Devuélvelo antes del ${formatFecha(vence)}.` : "Préstamo registrado.", "ok");
      await renderLibro(salida, [id]);
    } catch (err) {
      toast(err.message, "error");
      boton.disabled = false;
    }
  }

  const fila = (e) => {
    const boton =
      e.estado === "disponible"
        ? h("button", { class: "btn", onclick: (ev) => solicitar(e, ev.currentTarget) }, "Solicitar préstamo")
        : null;
    return h(
      "tr",
      {},
      h("td", {}, e.codigoBarras),
      h("td", {}, e.ubicacion || "—"),
      h("td", {}, h("span", { class: `badge estado-${e.estado}` }, ESTADOS[e.estado] || e.estado)),
      h("td", {}, boton)
    );
  };

  const dato = (etiqueta, valor) => (valor ? h("div", {}, h("dt", {}, etiqueta), h("dd", {}, valor)) : null);

  salida.replaceChildren(
    h("a", { class: "btn btn-sec", href: "#/" }, "← Volver al catálogo"),
    h(
      "section",
      { class: "tarjeta detalle" },
      h("div", { class: "portada grande", "aria-hidden": "true" }, (libro.titulo || "?").charAt(0).toUpperCase()),
      h(
        "div",
        {},
        libro.categoria ? h("span", { class: "etiqueta" }, libro.categoria) : null,
        h("h1", {}, libro.titulo),
        h("p", { class: "muted" }, libro.autor),
        h(
          "dl",
          { class: "datos" },
          dato("Editorial", libro.editorial),
          dato("Año", libro.anio),
          dato("ISBN", libro.isbn)
        )
      )
    ),
    h("h2", {}, "Ejemplares"),
    ejemplares.length === 0
      ? h("p", { class: "estado" }, "Este libro aún no tiene ejemplares registrados.")
      : h(
          "div",
          { class: "tabla-caja" },
          h(
            "table",
            { class: "tabla" },
            h("thead", {}, h("tr", {}, h("th", {}, "Código"), h("th", {}, "Ubicación"), h("th", {}, "Estado"), h("th", {}, ""))),
            h("tbody", {}, ejemplares.map(fila))
          )
        )
  );
}