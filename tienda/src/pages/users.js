import { h } from "../utils/dom.js";
import { request } from "../api/client.js";
import { getUsuario } from "../utils/auth.js";
import { alDobleClic } from "../components/modal.js";
import { abrirDetalleUsuario } from "../components/detalles.js";

const esPersonal = (u) => u && ["admin", "bibliotecario"].includes(u.rol);

export async function renderUsuarios(salida) {
  if (!esPersonal(getUsuario())) {
    salida.replaceChildren(h("p", { class: "error" }, "No tienes permiso para ver esta página."));
    return;
  }

  const estado = { rol: "", page: 1 };
  const cuerpo = h("div", {});

  const roles = ["", "estudiante", "profesor", "bibliotecario", "admin", "editorial"];
  const selector = h(
    "select",
    {
      id: "filtro-rol",
      "aria-label": "Filtrar por rol",
      onchange: (e) => {
        estado.rol = e.target.value;
        estado.page = 1;
        cargar();
      },
    },
    roles.map((r) => h("option", { value: r }, r || "Todos los roles"))
  );

  async function cargar() {
    cuerpo.replaceChildren(h("p", {}, "Cargando usuarios…"));
    try {
      const r = await request("/usuarios", { params: { rol: estado.rol, page: estado.page, limit: 15 } });
      const lista = r.data || [];
      const { page = 1, pages = 1, total = lista.length } = r.pagination || {};

      if (!lista.length) {
        cuerpo.replaceChildren(h("p", { class: "vacio" }, "No hay usuarios con este filtro."));
        return;
      }

      cuerpo.replaceChildren(
        h("p", { class: "sub" }, `${total} usuario(s). Doble clic sobre un usuario para ver toda su información.`),
        h(
          "table",
          { class: "tabla" },
          h("thead", {}, h("tr", {}, ["Nombre", "Documento", "Correo", "Rol", "Estado"].map((c) => h("th", {}, c)))),
          h(
            "tbody",
            {},
            lista.map((u) =>
              alDobleClic(
                h("tr", {}, h("td", {}, u.nombre), h("td", {}, u.documento), h("td", {}, u.correo), h("td", {}, u.rol), h("td", {}, u.estado)),
                () => abrirDetalleUsuario(u._id),
                "Doble clic para ver el usuario"
              )
            )
          )
        ),
        pages > 1
          ? h(
              "nav",
              { class: "paginacion", "aria-label": "Paginación" },
              h("button", { class: "btn btn-sec", type: "button", disabled: page <= 1, onclick: () => { estado.page = page - 1; cargar(); } }, "Anterior"),
              h("span", {}, `Página ${page} de ${pages}`),
              h("button", { class: "btn btn-sec", type: "button", disabled: page >= pages, onclick: () => { estado.page = page + 1; cargar(); } }, "Siguiente")
            )
          : null
      );
    } catch (e) {
      cuerpo.replaceChildren(
        h("p", { class: "error" }, e.message || "No se pudieron cargar los usuarios."),
        h("button", { class: "btn", type: "button", onclick: () => cargar() }, "Reintentar")
      );
    }
  }

  salida.replaceChildren(
    h("h1", {}, "Usuarios"),
    h("div", { class: "barra" }, h("label", { for: "filtro-rol" }, "Rol: "), selector),
    cuerpo
  );
  await cargar();
}
