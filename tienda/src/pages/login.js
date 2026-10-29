import { h } from "../utils/dom.js";
import { request } from "../api/client.js";
import { setSession, getToken } from "../utils/auth.js";

const campo = (etiqueta, input) => h("label", { class: "campo", for: input.id }, h("span", {}, etiqueta), input);

export function renderLogin(salida) {
  if (getToken()) {
    location.hash = "#/";
    return;
  }

  const alerta = h("div", { class: "alerta", role: "alert", hidden: true });
  const correo = h("input", { type: "email", id: "correo", required: true, autocomplete: "username" });
  const password = h("input", { type: "password", id: "password", required: true, autocomplete: "current-password" });
  const boton = h("button", { type: "submit", class: "btn" }, "Ingresar");

  const mostrarError = (err) => {
    const mensajes = err.errores && err.errores.length ? err.errores.map((e) => e.mensaje) : [err.message];
    alerta.replaceChildren(...mensajes.map((m) => h("p", {}, m)));
    alerta.hidden = false;
  };

  const formulario = h(
    "form",
    {
      class: "tarjeta login",
      onsubmit: async (e) => {
        e.preventDefault();
        alerta.hidden = true;
        boton.disabled = true;
        boton.textContent = "Ingresando…";
        try {
          const r = await request("/auth/login", {
            method: "POST",
            body: { correo: correo.value.trim(), password: password.value },
          });
          setSession({ token: r.token, usuario: r.usuario });
          location.hash = "#/";
        } catch (err) {
          mostrarError(err);
        } finally {
          boton.disabled = false;
          boton.textContent = "Ingresar";
        }
      },
    },
    h("h1", {}, "Iniciar sesión"),
    h("p", { class: "muted" }, "Accede con tu cuenta de la biblioteca."),
    alerta,
    campo("Correo", correo),
    campo("Contraseña", password),
    boton
  );

  salida.replaceChildren(formulario);
}