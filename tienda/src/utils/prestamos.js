import { h } from "./dom.js";
import { formatFecha } from "./format.js";

// "vencido" se calcula aquí: el API aún no cambia el estado solo (llega con el motor de reglas)
export function estadoVisible(p) {
  if (p.estado === "activo" && p.fechaVencEsperada && new Date(p.fechaVencEsperada) < new Date()) {
    return "vencido";
  }
  return p.estado;
}

export function chipEstado(estado) {
  const etiquetas = { activo: "Activo", vencido: "Vencido", devuelto: "Devuelto" };
  return h("span", { class: `chip chip-${estado}` }, etiquetas[estado] || estado);
}

export function libroDe(p) {
  return (p.ejemplar && p.ejemplar.libro) || {};
}

function codigoDe(p) {
  const e = p.ejemplar || {};
  return e.codigo || e.codigoBarras || (e._id ? String(e._id).slice(-6) : "—");
}

export function tablaPrestamos(lista, { conUsuario = false, onDevolver = null } = {}) {
  const cols = [
    ...(conUsuario ? ["Usuario"] : []),
    "Libro", "Ejemplar", "Prestado", "Vence", "Devuelto", "Estado",
    ...(onDevolver ? ["Acción"] : []),
  ];

  const thead = h("thead", {}, h("tr", {}, cols.map((c) => h("th", { scope: "col" }, c))));

  const filas = lista.map((p) => {
    const est = estadoVisible(p);
    const libro = libroDe(p);
    const celdas = [];

    if (conUsuario) {
      celdas.push(
        h("td", {}, (p.usuario && p.usuario.nombre) || "—", h("small", { class: "sub" }, (p.usuario && p.usuario.correo) || ""))
      );
    }
    celdas.push(
      h("td", {}, libro.titulo || "—", h("small", { class: "sub" }, libro.autor || "")),
      h("td", {}, codigoDe(p)),
      h("td", {}, p.fechaPrestamo ? formatFecha(p.fechaPrestamo) : "—"),
      h("td", {}, p.fechaVencEsperada ? formatFecha(p.fechaVencEsperada) : "—"),
      h("td", {}, p.fechaDevolucionReal ? formatFecha(p.fechaDevolucionReal) : "—"),
      h("td", {}, chipEstado(est))
    );
    if (onDevolver) {
      celdas.push(
        h(
          "td",
          {},
          est !== "devuelto"
            ? h("button", { class: "btn btn-sec", onclick: (e) => onDevolver(p, e.currentTarget) }, "Registrar devolución")
            : null
        )
      );
    }
    return h("tr", {}, celdas);
  });

  return h("div", { class: "tabla-wrap" }, h("table", { class: "tabla" }, thead, h("tbody", {}, filas)));
}