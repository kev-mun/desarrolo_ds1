require("./setup");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../api/app");
const Libro = require("../api/models/Libro");
const Ejemplar = require("../api/models/Ejemplar");
const Prestamo = require("../api/models/Prestamo");
const Multa = require("../api/models/Multa");
const { createTestUser, getTestToken } = require("./helpers");

const DIA = 24 * 60 * 60 * 1000;

describe("Dashboard del bibliotecario", () => {
  let bibToken, lectorToken, ana, beto, libroA, libroB, n;

  const prestamo = async (usuario, libro, extra = {}) => {
    const ej = await Ejemplar.create({ libro: libro._id, codigoBarras: `DB-${++n}`, estado: "prestado" });
    return Prestamo.create({ ejemplar: ej._id, usuario: usuario._id, fechaVencEsperada: new Date(Date.now() + 5 * DIA), ...extra });
  };

  beforeEach(async () => {
    n = 0;
    // La vista materializada vive fuera de los modelos: se limpia a mano entre pruebas
    await mongoose.connection.db.collection("mv_mas_prestados").deleteMany({});
    bibToken = getTestToken(await createTestUser({ rol: "bibliotecario" }));
    lectorToken = getTestToken(await createTestUser({ rol: "estudiante" }));
    ana = await createTestUser({ rol: "estudiante", nombre: "Ana Mora" });
    beto = await createTestUser({ rol: "profesor", nombre: "Beto Ruiz" });
    libroA = await Libro.create({ titulo: "Libro A", autor: "X", isbn: "DB-A", editorial: "E", anio: 2000, categoria: "C" });
    libroB = await Libro.create({ titulo: "Libro B", autor: "Y", isbn: "DB-B", editorial: "E", anio: 2001, categoria: "C" });
  });

  test("sin datos devuelve todo vacío", async () => {
    const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${bibToken}`);
    expect(res.status).toBe(200);
    expect(res.body.morosos).toEqual([]);
    expect(res.body.masPrestados).toEqual([]);
    expect(res.body.masRenovados).toEqual([]);
    expect(res.body.resumen).toEqual({
      prestamosActivos: 0,
      prestamosVencidos: 0,
      multasPendientes: 0,
      montoPendiente: 0,
      ejemplaresPerdidos: 0
    });
  });

  test("el estudiante no puede ver el dashboard (403) y sin token 401", async () => {
    const a = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${lectorToken}`);
    expect(a.status).toBe(403);
    const b = await request(app).get("/api/dashboard");
    expect(b.status).toBe(401);
    const c = await request(app).post("/api/dashboard/refrescar").set("Authorization", `Bearer ${lectorToken}`);
    expect(c.status).toBe(403);
  });

  test("top de morosos ordenado por préstamos vencidos", async () => {
    await prestamo(ana, libroA, { fechaVencEsperada: new Date(Date.now() - 3 * DIA), estado: "vencido" });
    await prestamo(ana, libroB, { fechaVencEsperada: new Date(Date.now() - 9 * DIA), estado: "activo" });
    await prestamo(beto, libroA, { fechaVencEsperada: new Date(Date.now() - 2 * DIA), estado: "vencido" });
    await prestamo(beto, libroB); // al día: no cuenta

    const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${bibToken}`);
    expect(res.body.morosos.length).toBe(2);
    expect(res.body.morosos[0].nombre).toBe("Ana Mora");
    expect(res.body.morosos[0].prestamosVencidos).toBe(2);
    expect(res.body.morosos[1].nombre).toBe("Beto Ruiz");
    expect(res.body.morosos[1].prestamosVencidos).toBe(1);
  });

  test("recursos más renovados (solo los que tienen renovaciones)", async () => {
    const r = { fecha: new Date(), nuevaFechaVenc: new Date(Date.now() + 7 * DIA) };
    await prestamo(ana, libroA, { renovaciones: [r, r, r] });
    await prestamo(beto, libroB, { renovaciones: [r] });
    await prestamo(beto, libroB);

    const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${bibToken}`);
    expect(res.body.masRenovados.map((x) => [x.titulo, x.total])).toEqual([["Libro A", 3], ["Libro B", 1]]);
  });

  test("más prestados usa la vista materializada: no cambia hasta refrescar", async () => {
    await prestamo(ana, libroA);
    await prestamo(beto, libroA);
    await prestamo(beto, libroB);

    const primera = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${bibToken}`);
    expect(primera.body.masPrestados[0]).toMatchObject({ titulo: "Libro A", total: 2 });
    expect(primera.body.actualizadoEn).toBeTruthy();

    await prestamo(ana, libroA); // nuevo préstamo, la vista materializada aún no lo sabe
    const segunda = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${bibToken}`);
    expect(segunda.body.masPrestados[0].total).toBe(2);

    const refresco = await request(app).post("/api/dashboard/refrescar").set("Authorization", `Bearer ${bibToken}`);
    expect(refresco.status).toBe(200);

    const tercera = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${bibToken}`);
    expect(tercera.body.masPrestados[0].total).toBe(3);
  });

  test("el resumen cuenta préstamos, multas pendientes y ejemplares perdidos", async () => {
    const p1 = await prestamo(ana, libroA);
    await prestamo(beto, libroB, { estado: "vencido", fechaVencEsperada: new Date(Date.now() - DIA) });
    await Ejemplar.create({ libro: libroA._id, codigoBarras: "DB-PERD", estado: "perdido" });
    await Multa.create({ prestamo: p1._id, ejemplar: p1.ejemplar, usuario: ana._id, diasAtraso: 2, monto: 2500 });

    const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${bibToken}`);
    expect(res.body.resumen).toEqual({
      prestamosActivos: 1,
      prestamosVencidos: 1,
      multasPendientes: 1,
      montoPendiente: 2500,
      ejemplaresPerdidos: 1
    });
  });
});
