import { h } from "../utils/dom.js";
import { request } from "../api/client.js";
import { abrirModal } from "./modal.js";
import { cop, fechaCorta, textoEstadoEjemplar } from "../utils/cop.js";

function lista(pares) {
  const filas = pares.filter(([, v]) => v !== undefined && v !== null && v !== "");
  return h(
    "dl",
    { class: "detalle" },
    filas.map(([k, v]) => [h("dt", {}, k), h("dd", {}, String(v))])
  );
}

const nombreColeccion = (c) => (c && typeof c === "object" ? c.nombre : c || "");

/** Modal con la información completa de un recurso (libro) y sus ejemplares. */
export async function abrirDetalleLibro(id) {
  const modal = abrirModal("Recurso", h("p", { class: "muted" }, "Cargando…"));
  try {
    const r = await request(`/libros/${id}`);
    const libro = r.libro || r.data || r;

    let ejemplares = Array.isArray(libro.ejemplares) ? libro.ejemplares : Array.isArray(r.ejemplares) ? r.ejemplares : null;
    if (!ejemplares) {
      try {
        const e = await request("/ejemplares", { params: { libro: id } });
        ejemplares = Array.isArray(e) ? e : e.data || [];
      } catch {
        ejemplares = null;
      }
    }

    const tabla = ejemplares
      ? ejemplares.length
        ? h(
            "table",
            { class: "tabla" },
            h("thead", {}, h("tr", {}, h("th", {}, "Código"), h("th", {}, "Estado"), h("th", {}, "Ubicación"))),
            h(
              "tbody",
              {},
              ejemplares.map((ej) =>
                h(
                  "tr",
                  {},
                  h("td", {}, ej.codigoBarras),
                  h(
                    "td",
                    {},
                    textoEstadoEjemplar(ej.estado),
                    ej.estado === "dado_de_baja" && ej.motivoBaja ? ` — ${ej.motivoBaja}` : ""
                  ),
                  h("td", {}, ej.ubicacion || "—")
                )
              )
            )
          )
        : h("p", { class: "vacio" }, "Este recurso no tiene ejemplares registrados.")
      : null;

    modal.cuerpo.replaceChildren(
      h("h3", {}, libro.titulo || "Recurso"),
      lista([
        ["Autor", libro.autor],
        ["ISBN", libro.isbn],
        ["Editorial", libro.editorial],
        ["Año", libro.anio],
        ["Categoría", libro.categoria],
        ["Colección", nombreColeccion(libro.coleccion)],
        ["Resumen", libro.resumen || libro.descripcion],
      ]),
      tabla ? h("h4", {}, "Ejemplares") : null,
      tabla
    );
  } catch (e) {
    modal.cuerpo.replaceChildren(h("p", { class: "error" }, e.message || "No se pudo cargar el recurso."));
  }
}

/** Modal con toda la información de un usuario, sus multas y sus préstamos. */
export async function abrirDetalleUsuario(id) {
  const modal = abrirModal("Usuario", h("p", { class: "muted" }, "Cargando…"));
  try {
    const r = await request(`/usuarios/${id}`);
    const u = r.usuario || r.data || r;

    let multas = null;
    let prestamos = null;
    try {
      const m = await request("/multas", { params: { usuario: id } });
      multas = m;
    } catch {
      multas = null;
    }
    try {
      const p = await request("/prestamos", { params: { usuario: id } });
      prestamos = Array.isArray(p) ? p : p.data || [];
    } catch {
      prestamos = null;
    }

    const activos = prestamos ? prestamos.filter((p) => p.estado === "activo" || p.estado === "vencido").length : null;

    modal.cuerpo.replaceChildren(
      h("h3", {}, u.nombre || "Usuario"),
      lista([
        ["Documento", u.documento],
        ["Correo", u.correo],
        ["Rol", u.rol],
        ["Estado", u.estado],
        ["Permisos", Array.isArray(u.permisos) && u.permisos.length ? u.permisos.join(", ") : ""],
        ["Registrado", u.createdAt ? fechaCorta(u.createdAt) : ""],
        ["Préstamos sin devolver", activos],
        ["Préstamos en total", prestamos ? prestamos.length : ""],
        ["Multas pendientes", multas ? `${(multas.data || []).filter((x) => x.estado === "pendiente").length} (${cop(multas.totalPendiente || 0)})` : ""],
      ])
    );
  } catch (e) {
    modal.cuerpo.replaceChildren(h("p", { class: "error" }, e.message || "No se pudo cargar el usuario."));
  }
}
