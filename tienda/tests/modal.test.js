// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from "vitest";
import { abrirModal, alDobleClic } from "../src/components/modal.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("modal", () => {
  test("se abre con el título y el contenido", () => {
    abrirModal("Recurso", "Hola");
    const caja = document.querySelector(".modal-caja");
    expect(caja).not.toBeNull();
    expect(caja.getAttribute("role")).toBe("dialog");
    expect(caja.getAttribute("aria-modal")).toBe("true");
    expect(document.querySelector(".modal-titulo").textContent).toBe("Recurso");
    expect(document.querySelector(".modal-cuerpo").textContent).toBe("Hola");
  });

  test("se cierra con el botón ×", () => {
    abrirModal("X", "a");
    document.querySelector(".modal-cerrar").click();
    expect(document.querySelector(".modal-fondo")).toBeNull();
  });

  test("se cierra con Esc", () => {
    abrirModal("X", "a");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.querySelector(".modal-fondo")).toBeNull();
  });

  test("se cierra al hacer clic en el fondo, pero no dentro de la caja", () => {
    abrirModal("X", "a");
    document.querySelector(".modal-caja").dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(document.querySelector(".modal-fondo")).not.toBeNull();
    document.querySelector(".modal-fondo").dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(document.querySelector(".modal-fondo")).toBeNull();
  });

  test("abrir otra modal reemplaza la anterior", () => {
    abrirModal("Uno", "a");
    abrirModal("Dos", "b");
    expect(document.querySelectorAll(".modal-fondo").length).toBe(1);
    expect(document.querySelector(".modal-titulo").textContent).toBe("Dos");
  });

  test("el cuerpo se puede rellenar después de abrir", () => {
    const m = abrirModal("X", "Cargando");
    m.cuerpo.replaceChildren("Listo");
    expect(document.querySelector(".modal-cuerpo").textContent).toBe("Listo");
  });
});

describe("alDobleClic", () => {
  test("ejecuta la acción con doble clic y con Enter", () => {
    const fila = document.createElement("tr");
    let veces = 0;
    alDobleClic(fila, () => veces++);
    fila.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    fila.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    fila.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    expect(veces).toBe(2);
    expect(fila.getAttribute("tabindex")).toBe("0");
    expect(fila.classList.contains("doble-clic")).toBe(true);
  });
});
