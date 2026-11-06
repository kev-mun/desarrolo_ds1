require("./setup");
const request = require("supertest");
const app = require("../api/app");
const Libro = require("../api/models/Libro");
const Ejemplar = require("../api/models/Ejemplar");
const Prestamo = require("../api/models/Prestamo");
const Multa = require("../api/models/Multa");
const { PLAZO_DIAS, MAX_RENOVACIONES } = require("../api/utils/reglas");
const { createTestUser, getTestToken } = require("./helpers");

const DIA = 24 * 60 * 60 * 1000;
const idFalso = "60c72b2f9b1d8b2bad8e9999";

describe("Renovaciones de préstamos", () => {
  let lector, lectorToken, otroToken, bib, bibToken, libro, n;

  const prestamo = async (extra = {}) => {
    const ej = await Ejemplar.create({ libro: libro._id, codigoBarras: `RE-${++n}`, estado: "prestado" });
    return Prestamo.create({ ejemplar: ej._id, usuario: lector._id, fechaVencEsperada: new Date(Date.now() + 3 * DIA), ...extra });
  };
  const renovar = (id, token) => request(app).post(`/api/prestamos/${id}/renovar`).set("Authorization", `Bearer ${token}`);

  beforeEach(async () => {
    n = 0;
    lector = await createTestUser({ rol: "estudiante" });
    lectorToken = getTestToken(lector);
    otroToken = getTestToken(await createTestUser({ rol: "profesor" }));
    bib = await createTestUser({ rol: "bibliotecario" });
    bibToken = getTestToken(bib);
    libro = await Libro.create({ titulo: "Renovable", autor: "A", isbn: "RE-ISBN-1", editorial: "E", anio: 2000, categoria: "C" });
  });

  test("el dueño renueva: extiende la fecha límite y registra la renovación", async () => {
    const p = await prestamo();
    const res = await renovar(p._id, lectorToken);
    expect(res.status).toBe(200);
    expect(new Date(res.body.fechaVencEsperada).getTime()).toBe(p.fechaVencEsperada.getTime() + PLAZO_DIAS * DIA);
    expect(res.body.renovaciones.length).toBe(1);
    expect(String(res.body.renovaciones[0].renovadoPor)).toBe(String(lector._id));
    expect(res.body.estado).toBe("activo");
  });

  test("el personal puede renovar el préstamo de otro usuario y queda registrado quién lo hizo", async () => {
    const p = await prestamo();
    const res = await renovar(p._id, bibToken);
    expect(res.status).toBe(200);
    expect(String(res.body.renovaciones[0].renovadoPor)).toBe(String(bib._id));
  });

  test("no se puede superar el máximo de renovaciones", async () => {
    const p = await prestamo();
    for (let i = 0; i < MAX_RENOVACIONES; i++) {
      expect((await renovar(p._id, lectorToken)).status).toBe(200);
    }
    const res = await renovar(p._id, lectorToken);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/máximo/i);
    expect((await Prestamo.findById(p._id)).renovaciones.length).toBe(MAX_RENOVACIONES);
  });

  test("un préstamo vencido no se renueva", async () => {
    const p = await prestamo({ fechaVencEsperada: new Date(Date.now() - DIA), estado: "vencido" });
    const res = await renovar(p._id, lectorToken);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/vencido/i);
  });

  test("un préstamo activo con la fecha ya pasada tampoco", async () => {
    const p = await prestamo({ fechaVencEsperada: new Date(Date.now() - DIA), estado: "activo" });
    const res = await renovar(p._id, lectorToken);
    expect(res.status).toBe(409);
  });

  test("un préstamo devuelto no se renueva", async () => {
    const p = await prestamo({ estado: "devuelto", fechaDevolucionReal: new Date() });
    const res = await renovar(p._id, lectorToken);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/devuelto/i);
  });

  test("un lector no puede renovar el préstamo de otro (403)", async () => {
    const p = await prestamo();
    const res = await renovar(p._id, otroToken);
    expect(res.status).toBe(403);
    expect((await Prestamo.findById(p._id)).renovaciones.length).toBe(0);
  });

  test("con una multa pendiente no puede renovar (403)", async () => {
    const p = await prestamo();
    const otro = await prestamo({ estado: "devuelto", fechaDevolucionReal: new Date() });
    await Multa.create({ prestamo: otro._id, ejemplar: otro.ejemplar, usuario: lector._id, diasAtraso: 2, monto: 2500 });
    const res = await renovar(p._id, lectorToken);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/multa/i);
  });

  test("id inválido responde 400 y préstamo inexistente 404", async () => {
    expect((await renovar("abc", lectorToken)).status).toBe(400);
    expect((await renovar(idFalso, lectorToken)).status).toBe(404);
  });

  test("sin token responde 401", async () => {
    const p = await prestamo();
    const res = await request(app).post(`/api/prestamos/${p._id}/renovar`);
    expect(res.status).toBe(401);
  });
});
