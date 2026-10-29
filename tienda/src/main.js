import "./styles/main.css";
import { h } from "./utils/dom.js";
import { addRoute, startRouter } from "./utils/router.js";
import { renderHeader } from "./components/header.js";
import { renderLogin } from "./pages/login.js";
import { renderCatalogo } from "./pages/catalog.js";
import { renderLibro } from "./pages/bookDetail.js";
import { renderMisPrestamos } from "./pages/myLoans.js";
import { renderPrestamosPersonal } from "./pages/staffLoans.js";

const app = document.getElementById("app");
const cabecera = h("div", { id: "cabecera" });
const contenido = h("main", { class: "contenedor", id: "contenido" });
app.append(cabecera, contenido);

addRoute(/^\/login$/, renderLogin, { auth: false });
addRoute(/^\/$/, renderCatalogo);
addRoute(/^\/libro\/([a-f0-9]{24})$/i, renderLibro);
addRoute(/^\/mis-prestamos$/, renderMisPrestamos);
addRoute(/^\/prestamos$/, renderPrestamosPersonal);

startRouter(contenido, () => cabecera.replaceChildren(renderHeader()));