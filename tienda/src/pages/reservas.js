import { h } from "../utils/dom.js";
import { request } from "../api/client.js";
import { getUsuario } from "../utils/auth.js";
import { toast } from "../utils/toast.js";
import { fechaCorta } from "../utils/cop.js";

const esPersonal = (u) => u && ["admin", "bibliotecario"].includes(u.rol);

const TEXTO_ESTADO = {
  en_espera: "En cola",
  lista: "Lista para pedir",
  cumplida: "Cumplida",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

function fechaHora(valor) {
  if (!valor) return "—";
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

function detalle(r) {
  if (r.estado === "en_espera") return `Posición ${r.posicion ?? "—"} en la cola`;
  if (r.estado === "lista") return `Pídela antes del ${fechaHora(r.fechaLimite)}`;
  return fechaCorta(r.updatedAt);
}

export async function renderReservas(salida) {
  const u = getUsuario();
  if (!u) {
    salida.replaceChildren(h("p", { class: "error" }, "Inicia sesión para ver tus reservas."));
    return;
  }
  const personal = esPersonal(u);
  const cuerpo = h("div", {});
  let filtro = "";

  async function accion(r, boton, ruta, metodo, confirmacion, exito) {
    if (confirmacion && !confirm(confirmacion)) return;
    boton.disabled = true;
    try {
      await request(`/reservas/${r._id}/${ruta}`, { method: metodo });
      toast(exito);
      await cargar();
    } catch (e) {
      boton.disabled = false;
      toast(e.message || "No se pudo completar la acción", "error");
    }
  }

  function botones(r) {
    const acciones = [];
    if (r.estado === "lista") {
      const b = h("button", { class: "btn", type: "button" }, "Solicitar préstamo");
      b.addEventListener("click", () => accion(r, b, "prestar", "POST", "¿Solicitar el préstamo del ejemplar apartado?", "Préstamo registrado"));
      acciones.push(b);
    }
    if (r.estado === "en_espera" || r.estado === "lista") {
      const b = h("button", { class: "btn btn-sec", type: "button" }, "Cancelar");
      b.addEventListener("click", () => accion(r, b, "cancelar", "PATCH", "¿Cancelar la reserva?", "Reserva cancelada"));
      acciones.push(b);
    }
    return acciones;
  }

  async function cargar() {
    cuerpo.replaceChildren(h("p", {}, "Cargando reservas…"));
    try {
      const r = await request("/reservas", { params: { estado: filtro } });
      const lista = r.data || [];
      if (!lista.length) {
        cuerpo.replaceChildren(
          h("p", { class: "vacio" }, personal ? "No hay reservas con este filtro." : "No tienes reservas."),
          personal ? null : h("p", { class: "muted" }, "Cuando todos los ejemplares de un libro estén prestados, podrás reservarlo desde su ficha.")
        );
        return;
      }
      const cols = [...(personal ? ["Usuario"] : []), "Libro", "Estado", "Detalle", "Acciones"];
      cuerpo.replaceChildren(
        h("p", { class: "sub" }, `${lista.length} reserva(s)`),
        h(
          "div",
          { class: "tabla-wrap" },
          h(
            "table",
            { class: "tabla" },
            h("thead", {}, h("tr", {}, cols.map((c) => h("th", { scope: "col" }, c)))),
            h(
              "tbody",
              {},
              lista.map((x) =>
                h(
                  "tr",
                  {},
                  personal ? h("td", {}, (x.usuario && x.usuario.nombre) || "—") : null,
                  h("td", {}, (x.libro && x.libro.titulo) || "—", h("small", { class: "sub" }, (x.libro && x.libro.autor) || "")),
                  h("td", {}, h("span", { class: `chip chip-${x.estado === "lista" ? "activo" : x.estado === "en_espera" ? "vencido" : "devuelto"}` }, TEXTO_ESTADO[x.estado] || x.estado)),
                  h("td", {}, detalle(x)),
                  h("td", {}, botones(x))
                )
              )
            )
          )
        )
      );
    } catch (e) {
      cuerpo.replaceChildren(
        h("p", { class: "error" }, e.message || "No se pudieron cargar las reservas."),
        h("button", { class: "btn", type: "button", onclick: () => cargar() }, "Reintentar")
      );
    }
  }

  const barra = personal
    ? h(
        "div",
        { class: "barra" },
        h("label", { for: "filtro-reserva" }, "Estado: "),
        h(
          "select",
          {
            id: "filtro-reserva",
            "aria-label": "Filtrar reservas por estado",
            onchange: (e) => {
              filtro = e.target.value;
              cargar();
            },
          },
          [["", "Todas"], ["en_espera", "En cola"], ["lista", "Listas"], ["cumplida", "Cumplidas"], ["vencida", "Vencidas"], ["cancelada", "Canceladas"]].map(([v, t]) => h("option", { value: v }, t))
        )
      )
    : null;

  salida.replaceChildren(h("h1", {}, personal ? "Reservas" : "Mis reservas"), barra, cuerpo);
  await cargar();
}
