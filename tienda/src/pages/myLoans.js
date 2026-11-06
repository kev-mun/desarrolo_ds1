import { h } from "../utils/dom.js";
import { request } from "../api/client.js";
import { getUsuario } from "../utils/auth.js";
import { tablaPrestamos, estadoVisible, libroDe, chipEstado } from "../utils/prestamos.js";
import { fechaCorta } from "../utils/cop.js";
import { formatFecha } from "../utils/format.js";
import { toast } from "../utils/toast.js";

function codigoDe(p) {
  const e = p.ejemplar || {};
  return e.codigo || e.codigoBarras || (e._id ? String(e._id).slice(-6) : "—");
}

function tablaMisPrestamos(lista, onRenovar) {
  const cols = ["Libro", "Ejemplar", "Prestado", "Vence", "Devuelto", "Estado", "Acción"];
  const thead = h("thead", {}, h("tr", {}, cols.map((c) => h("th", { scope: "col" }, c))));

  const filas = lista.map((p) => {
    const est = estadoVisible(p);
    const libro = libroDe(p);
    const nRenovaciones = Array.isArray(p.renovaciones) ? p.renovaciones.length : 0;
    const puedeRenovar = est === "activo" && nRenovaciones < 2;

    const celdaAccion = h(
      "td",
      {},
      h("span", { class: "sub" }, `Renovaciones: ${nRenovaciones} de 2`),
      puedeRenovar
        ? h(
            "button",
            {
              class: "btn btn-sec",
              style: "margin-top: 0.25rem",
              onclick: (e) => onRenovar(p, e.currentTarget)
            },
            "Renovar"
          )
        : null
    );

    return h(
      "tr",
      {},
      h("td", {}, libro.titulo || "—", h("small", { class: "sub" }, libro.autor || "")),
      h("td", {}, codigoDe(p)),
      h("td", {}, p.fechaPrestamo ? formatFecha(p.fechaPrestamo) : "—"),
      h("td", {}, p.fechaVencEsperada ? formatFecha(p.fechaVencEsperada) : "—"),
      h("td", {}, p.fechaDevolucionReal ? formatFecha(p.fechaDevolucionReal) : "—"),
      h("td", {}, chipEstado(est)),
      celdaAccion
    );
  });

  return h("div", { class: "tabla-wrap" }, h("table", { class: "tabla" }, thead, h("tbody", {}, filas)));
}

export async function renderMisPrestamos(salida) {
  const usuario = getUsuario();
  salida.replaceChildren(h("h1", {}, "Mis préstamos"), h("p", {}, "Cargando tus préstamos…"));

  async function renovar(p, boton) {
    if (!confirm("¿Deseas renovar este préstamo?")) return;
    boton.disabled = true;
    try {
      const respuesta = await request(`/prestamos/${p._id}/renovar`, { method: "POST" });
      const fechaVenc = respuesta.fechaVencEsperada || (respuesta.data && respuesta.data.fechaVencEsperada);
      toast("Préstamo renovado. Nueva fecha límite: " + fechaCorta(fechaVenc));
      await renderMisPrestamos(salida);
    } catch (e) {
      toast(e.message, "error");
      boton.disabled = false;
    }
  }

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

    salida.replaceChildren(h("h1", {}, "Mis préstamos"), tablaMisPrestamos(lista, renovar));
  } catch (e) {
    salida.replaceChildren(
      h("h1", {}, "Mis préstamos"),
      h("p", { class: "error" }, e.message || "No se pudieron cargar tus préstamos."),
      h("button", { class: "btn", onclick: () => renderMisPrestamos(salida) }, "Reintentar")
    );
  }
}
