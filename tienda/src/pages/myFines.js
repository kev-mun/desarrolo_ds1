import { h } from "../utils/dom.js";
import { request } from "../api/client.js";
import { getUsuario } from "../utils/auth.js";
import { toast } from "../utils/toast.js";
import { cop, fechaCorta } from "../utils/cop.js";

export async function renderMisMultas(salida) {
  if (!getUsuario()) {
    salida.replaceChildren(h("p", { class: "error" }, "Inicia sesión para ver tus multas."));
    return;
  }
  const cuerpo = h("div", {});

  async function pagar(m, boton) {
    if (!confirm(`¿Pagar la multa de ${cop(m.monto)}? (pago simulado)`)) return;
    boton.disabled = true;
    try {
      await request(`/multas/${m._id}/pagar`, { method: "PATCH" });
      toast("Multa pagada. Ya puedes solicitar préstamos de nuevo.");
      cargar();
    } catch (e) {
      boton.disabled = false;
      toast(e.message || "No se pudo pagar la multa", "error");
    }
  }

  async function cargar() {
    cuerpo.replaceChildren(h("p", {}, "Cargando multas…"));
    try {
      const r = await request("/multas");
      const lista = r.data || [];
      if (!lista.length) {
        cuerpo.replaceChildren(h("p", { class: "vacio" }, "No tienes multas. ¡Gracias por devolver a tiempo!"));
        return;
      }
      cuerpo.replaceChildren(
        r.totalPendiente > 0
          ? h("p", { class: "aviso" }, `Tienes ${cop(r.totalPendiente)} pendientes. Mientras haya una multa pendiente no puedes solicitar préstamos.`)
          : h("p", { class: "sub" }, "No tienes multas pendientes."),
        h(
          "table",
          { class: "tabla" },
          h("thead", {}, h("tr", {}, ["Libro", "Días de atraso", "Valor", "Estado", "Fecha", ""].map((c) => h("th", {}, c)))),
          h(
            "tbody",
            {},
            lista.map((m) => {
              const libro = (m.ejemplar && m.ejemplar.libro && m.ejemplar.libro.titulo) || "—";
              const boton = h("button", { class: "btn", type: "button" }, "Pagar");
              boton.addEventListener("click", () => pagar(m, boton));
              return h(
                "tr",
                {},
                h("td", {}, libro),
                h("td", {}, String(m.diasAtraso)),
                h("td", {}, cop(m.monto)),
                h("td", {}, h("span", { class: m.estado === "pendiente" ? "chip chip-vencido" : "chip chip-devuelto" }, m.estado === "pendiente" ? "Pendiente" : "Pagada")),
                h("td", {}, fechaCorta(m.estado === "pagada" ? m.fechaPago : m.createdAt)),
                h("td", {}, m.estado === "pendiente" ? boton : null)
              );
            })
          )
        )
      );
    } catch (e) {
      cuerpo.replaceChildren(
        h("p", { class: "error" }, e.message || "No se pudieron cargar las multas."),
        h("button", { class: "btn", type: "button", onclick: () => cargar() }, "Reintentar")
      );
    }
  }

  salida.replaceChildren(h("h1", {}, "Mis multas"), cuerpo);
  await cargar();
}
