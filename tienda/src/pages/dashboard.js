import { h } from "../utils/dom.js";
import { request } from "../api/client.js";
import { getUsuario } from "../utils/auth.js";
import { toast } from "../utils/toast.js";
import { alDobleClic } from "../components/modal.js";
import { abrirDetalleLibro, abrirDetalleUsuario } from "../components/detalles.js";
import { cop, fechaCorta } from "../utils/cop.js";

const esPersonal = (u) => u && ["admin", "bibliotecario"].includes(u.rol);

function tarjeta(titulo, valor) {
  return h("div", { class: "kpi" }, h("span", { class: "kpi-valor" }, String(valor)), h("span", { class: "kpi-texto" }, titulo));
}

function seccion(titulo, nota, cabeceras, filas, vacio) {
  return h(
    "section",
    { class: "panel" },
    h("h2", {}, titulo),
    nota ? h("p", { class: "muted" }, nota) : null,
    filas.length
      ? h(
          "table",
          { class: "tabla" },
          h("thead", {}, h("tr", {}, cabeceras.map((c) => h("th", {}, c)))),
          h("tbody", {}, filas)
        )
      : h("p", { class: "vacio" }, vacio)
  );
}

export async function renderDashboard(salida) {
  if (!esPersonal(getUsuario())) {
    salida.replaceChildren(h("p", { class: "error" }, "No tienes permiso para ver esta página."));
    return;
  }

  const cuerpo = h("div", {});
  const botonRefrescar = h("button", { class: "btn btn-sec", type: "button" }, "Actualizar vista materializada");

  async function cargar() {
    cuerpo.replaceChildren(h("p", {}, "Cargando dashboard…"));
    try {
      const d = await request("/dashboard");
      const r = d.resumen || {};

      const filaLibro = (x, i) =>
        alDobleClic(
          h("tr", {}, h("td", {}, String(i + 1)), h("td", {}, x.titulo), h("td", {}, x.autor || "—"), h("td", {}, String(x.total))),
          () => abrirDetalleLibro(x._id),
          "Doble clic para ver el recurso"
        );

      const filaMoroso = (x, i) =>
        alDobleClic(
          h(
            "tr",
            {},
            h("td", {}, String(i + 1)),
            h("td", {}, x.nombre),
            h("td", {}, x.documento || "—"),
            h("td", {}, String(x.prestamosVencidos)),
            h("td", {}, fechaCorta(x.masAntiguo))
          ),
          () => abrirDetalleUsuario(x._id),
          "Doble clic para ver el usuario"
        );

      cuerpo.replaceChildren(
        h(
          "div",
          { class: "kpis" },
          tarjeta("Préstamos activos", r.prestamosActivos ?? 0),
          tarjeta("Préstamos vencidos", r.prestamosVencidos ?? 0),
          tarjeta("Multas pendientes", r.multasPendientes ?? 0),
          tarjeta("Monto por cobrar", cop(r.montoPendiente ?? 0)),
          tarjeta("Ejemplares perdidos", r.ejemplaresPerdidos ?? 0)
        ),
        seccion(
          "Top de usuarios morosos",
          "Vista normal: se calcula en cada consulta. Doble clic sobre un usuario para ver su información.",
          ["#", "Usuario", "Documento", "Préstamos vencidos", "Vencido desde"],
          (d.morosos || []).map(filaMoroso),
          "No hay usuarios morosos."
        ),
        seccion(
          "Recursos más prestados",
          `Vista materializada${d.actualizadoEn ? `, actualizada el ${fechaCorta(d.actualizadoEn)}` : ""}. Doble clic sobre un recurso para ver su información.`,
          ["#", "Título", "Autor", "Préstamos"],
          (d.masPrestados || []).map(filaLibro),
          "Aún no hay préstamos registrados."
        ),
        seccion(
          "Recursos más renovados",
          "Vista normal. Doble clic sobre un recurso para ver su información.",
          ["#", "Título", "Autor", "Renovaciones"],
          (d.masRenovados || []).map(filaLibro),
          "Aún no hay renovaciones registradas."
        ),
        seccion(
          "Recursos más reservados",
          "Vista normal. Doble clic sobre un recurso para ver su información.",
          ["#", "Título", "Autor", "Reservas"],
          (d.masReservados || []).map(filaLibro),
          "Aún no hay reservas registradas."
        )
      );
    } catch (e) {
      cuerpo.replaceChildren(
        h("p", { class: "error" }, e.message || "No se pudo cargar el dashboard."),
        h("button", { class: "btn", type: "button", onclick: () => cargar() }, "Reintentar")
      );
    }
  }

  botonRefrescar.addEventListener("click", async () => {
    botonRefrescar.disabled = true;
    try {
      await request("/dashboard/refrescar", { method: "POST" });
      toast("Vista materializada actualizada");
      await cargar();
    } catch (e) {
      toast(e.message || "No se pudo actualizar", "error");
    } finally {
      botonRefrescar.disabled = false;
    }
  });

  salida.replaceChildren(h("h1", {}, "Dashboard"), h("div", { class: "barra" }, botonRefrescar), cuerpo);
  await cargar();
}
