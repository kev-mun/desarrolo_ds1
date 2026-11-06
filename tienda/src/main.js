import "./styles/main.css";
import "./styles/fase-e.css";
import { h } from "./utils/dom.js";
import { addRoute, startRouter } from "./utils/router.js";
import { renderHeader } from "./components/header.js";
import { renderLogin } from "./pages/login.js";
import { renderRegistro } from "./pages/registro.js";
import { renderCatalogo } from "./pages/catalog.js";
import { renderLibro } from "./pages/bookDetail.js";
import { renderMisPrestamos } from "./pages/myLoans.js";
import { renderPrestamosPersonal } from "./pages/staffLoans.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderUsuarios } from "./pages/users.js";
import { renderMisMultas } from "./pages/myFines.js";
import { renderReservas } from "./pages/reservas.js";

const app = document.getElementById("app");
const cabecera = h("div", { id: "cabecera" });
const contenido = h("main", { class: "contenedor", id: "contenido" });
app.append(cabecera, contenido);

addRoute(/^\/login$/, renderLogin, { auth: false });
addRoute(/^\/registro$/, renderRegistro, { auth: false });
addRoute(/^\/$/, renderCatalogo);
addRoute(/^\/libro\/([a-f0-9]{24})$/i, renderLibro);
addRoute(/^\/mis-prestamos$/, renderMisPrestamos);
addRoute(/^\/prestamos$/, renderPrestamosPersonal);
addRoute(/^\/reservas$/, renderReservas);
addRoute(/^\/dashboard$/, renderDashboard);
addRoute(/^\/usuarios$/, renderUsuarios);
addRoute(/^\/mis-multas$/, renderMisMultas);

startRouter(contenido, () => cabecera.replaceChildren(renderHeader()));
