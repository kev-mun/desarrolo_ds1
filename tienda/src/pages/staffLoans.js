import { h } from "../utils/dom.js";
import { request } from "../api/client.js";
import { getUsuario } from "../utils/auth.js";
import { toast } from "../utils/toast.js";
import { tablaPrestamos, estadoVisible, libroDe } from "../utils/prestamos.js";

export async function renderPrestamosPersonal(salida) {
  const u = getUsuario();
  if (!u || !["admin", "bibliotecario"].includes(u.rol)) {
    salida.replaceChildren(h("p", { class: "error" }, "No tienes permiso para ver esta página."));
    return;
  }

  let filtro = "activo";
  const cuerpo = h("div", {});

  const opciones = [
    ["", "Todos"],
    ["activo", "Activos (incluye vencidos)"],
    ["vencido", "Solo vencidos"],
    ["devuelto", "Devueltos"],
  ];

  const selector = h(
    "select",
    {
      id: "filtro-estado",
      "aria-label": "Filtrar por estado",
      onchange: (e) => {
        filtro = e.target.value;
        cargar();
      },
    },
    opciones.map(([v, t]) => h("option", { value: v, selected: v === filtro }, t))
  );

  async function devolver(p, boton) {
    const titulo = libroDe(p).titulo || "este libro";
    if (!confirm(`¿Registrar la devolución de "${titulo}"?`)) return;
    boton.disabled = true;
    try {
      await request(`/prestamos/${p._id}/devolver`, { method: "PATCH" });
      toast("Devolución registrada");
      cargar();
    } catch (e) {
      boton.disabled = false;
      toast(e.message || "No se pudo registrar la devolución", "error");
    }
  }

  async function cargar() {
    cuerpo.replaceChildren(h("p", {}, "Cargando préstamos…"));
    try {
      const params = {};
      if (filtro === "activo" || filtro === "vencido") params.estado = "activo";
      if (filtro === "devuelto") params.estado = "devuelto";

      const r = await request("/prestamos", { params });
      let lista = Array.isArray(r) ? r : r.data || [];
      if (filtro === "vencido") lista = lista.filter((p) => estadoVisible(p) === "vencido");

      if (!lista.length) {
        cuerpo.replaceChildren(h("p", { class: "vacio" }, "No hay préstamos con este filtro."));
        return;
      }
      cuerpo.replaceChildren(
        h("p", { class: "sub" }, `${lista.length} préstamo(s)`),
        tablaPrestamos(lista, { conUsuario: true, onDevolver: devolver })
      );
    } catch (e) {
      cuerpo.replaceChildren(
        h("p", { class: "error" }, e.message || "No se pudieron cargar los préstamos."),
        h("button", { class: "btn", onclick: () => cargar() }, "Reintentar")
      );
    }
  }

  salida.replaceChildren(
    h("h1", {}, "Préstamos"),
    h("div", { class: "barra" }, h("label", { for: "filtro-estado" }, "Estado: "), selector),
    cuerpo
  );
  await cargar();
}