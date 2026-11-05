// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { cop, fechaCorta, textoEstadoEjemplar } from "../src/utils/cop.js";

describe("utils/cop", () => {
  test("formatea pesos colombianos", () => {
    expect(cop(2500).replace(/\s/g, " ")).toMatch(/2\.500/);
    expect(cop(0)).toMatch(/0/);
    expect(cop(undefined)).toMatch(/0/);
  });

  test("fechaCorta tolera valores vacíos o inválidos", () => {
    expect(fechaCorta(null)).toBe("—");
    expect(fechaCorta("no es fecha")).toBe("—");
    expect(fechaCorta("2026-11-04T12:00:00")).toMatch(/2026/);
  });

  test("texto legible de los estados de ejemplar", () => {
    expect(textoEstadoEjemplar("dado_de_baja")).toBe("Dado de baja");
    expect(textoEstadoEjemplar("perdido")).toBe("Perdido");
    expect(textoEstadoEjemplar("raro")).toBe("raro");
    expect(textoEstadoEjemplar(undefined)).toBe("—");
  });
});
