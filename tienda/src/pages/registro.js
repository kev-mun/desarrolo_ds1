import { h } from "../utils/dom.js";
import { request } from "../api/client.js";
import { getToken } from "../utils/auth.js";
import { toast } from "../utils/toast.js";

const campo = (etiqueta, input) => h("label", { class: "campo", for: input.id }, h("span", {}, etiqueta), input);

export function renderRegistro(salida) {
  if (getToken()) {
    location.hash = "#/";
    return;
  }

  const alerta = h("div", { class: "alerta", role: "alert", hidden: true });
  const nombre = h("input", { type: "text", id: "nombre", required: true, autocomplete: "name", placeholder: "Tu nombre completo" });
  const documento = h("input", { type: "text", id: "documento", required: true, autocomplete: "off", placeholder: "Número de identificación" });
  const correo = h("input", { type: "email", id: "correo", required: true, autocomplete: "username", placeholder: "correo@ejemplo.com" });
  const password = h("input", { type: "password", id: "password", required: true, autocomplete: "new-password", placeholder: "Mínimo 6 caracteres" });

  const rol = h(
    "select",
    { id: "rol" },
    h("option", { value: "estudiante" }, "Estudiante"),
    h("option", { value: "profesor" }, "Profesor")
  );

  const boton = h("button", { type: "submit", class: "btn" }, "Registrarse");

  const mostrarError = (err) => {
    const mensajes = err.errores && err.errores.length ? err.errores.map((e) => e.mensaje) : [err.message || "Error al registrarse"];
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
        boton.textContent = "Registrando…";
        try {
          await request("/auth/register", {
            method: "POST",
            body: {
              nombre: nombre.value.trim(),
              documento: documento.value.trim(),
              correo: correo.value.trim(),
              password: password.value,
              rol: rol.value,
            },
          });
          toast("Registro exitoso. Inicia sesión.");
          location.hash = "#/login";
        } catch (err) {
          mostrarError(err);
          toast(err.message, "error");
        } finally {
          boton.disabled = false;
          boton.textContent = "Registrarse";
        }
      },
    },
    h("h1", {}, "Crear cuenta"),
    h("p", { class: "muted" }, "Regístrate para solicitar préstamos y reservar recursos en la biblioteca."),
    alerta,
    campo("Nombre completo", nombre),
    campo("Documento de identidad", documento),
    campo("Correo electrónico", correo),
    campo("Contraseña", password),
    campo("Rol", rol),
    boton,
    h(
      "p",
      { style: "margin-top: 1rem; font-size: 0.9rem; text-align: center" },
      "¿Ya tienes una cuenta? ",
      h("a", { href: "#/login" }, "Inicia sesión")
    )
  );

  salida.replaceChildren(formulario);
}

