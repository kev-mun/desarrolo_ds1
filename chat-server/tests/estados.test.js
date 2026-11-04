require("./setup");
const request = require("supertest");
const app = require("../api/app");
const Libro = require("../api/models/Libro");
const Ejemplar = require("../api/models/Ejemplar");
const Prestamo = require("../api/models/Prestamo");
const { actualizarEstados, actualizarEstadosSiToca } = require("../api/utils/estados");
const { createTestUser, getTestToken } = require("./helpers");

const DIA = 24 * 60 * 60 * 1000;
const idFalso = "60c72b2f9b1d8b2bad8e9999";

describe("Estados automáticos: vencido y perdido", () => {
  let lector, libro, n;

  const prestar = async (diasVencido, estadoPrestamo = "activo") => {
    const ej = await Ejemplar.create({ libro: libro._id, codigoBarras: `ES-${++n}`, estado: "prestado" });
    const p = await Prestamo.create({
      ejemplar: ej._id,
      usuario: lector._id,
      fechaVencEsperada: new Date(Date.now() - diasVencido * DIA),
      estado: estadoPrestamo
    });
    return { ej, p };
  };

  beforeEach(async () => {
    n = 0;
    lector = await createTestUser({ rol: "estudiante" });
    libro = await Libro.create({ titulo: "Estados", autor: "A", isbn: "ES-ISBN-1", editorial: "E", anio: 2000, categoria: "C" });
  });

  test("un préstamo con la fecha límite vencida pasa a vencido y el ejemplar sigue prestado", async () => {
    const { ej, p } = await prestar(5);
    const r = await actualizarEstados();
    expect(r.vencidos).toBe(1);
    expect(r.perdidos).toBe(0);
    expect((await Prestamo.findById(p._id)).estado).toBe("vencido");
    expect((await Ejemplar.findById(ej._id)).estado).toBe("prestado");
  });

  test("a los 120 días sin devolver el ejemplar pasa a perdido", async () => {
    const { ej } = await prestar(121);
    const r = await actualizarEstados();
    expect(r.perdidos).toBe(1);
    expect((await Ejemplar.findById(ej._id)).estado).toBe("perdido");
  });

  test("a los 119 días todavía no es perdido", async () => {
    const { ej } = await prestar(119);
    await actualizarEstados();
    expect((await Ejemplar.findById(ej._id)).estado).toBe("prestado");
  });

  test("un préstamo devuelto no se toca", async () => {
    const { ej, p } = await prestar(200, "devuelto");
    await Prestamo.findByIdAndUpdate(p._id, { fechaDevolucionReal: new Date() });
    const r = await actualizarEstados();
    expect(r).toEqual({ vencidos: 0, perdidos: 0 });
    expect((await Ejemplar.findById(ej._id)).estado).toBe("prestado");
  });

  test("devolver un ejemplar perdido lo deja disponible", async () => {
    const { ej, p } = await prestar(130);
    await actualizarEstados();
    const bibToken = getTestToken(await createTestUser({ rol: "bibliotecario" }));
    const res = await request(app).patch(`/api/prestamos/${p._id}/devolver`).set("Authorization", `Bearer ${bibToken}`);
    expect(res.status).toBe(200);
    expect((await Ejemplar.findById(ej._id)).estado).toBe("disponible");
  });

  test("actualizarEstadosSiToca limita la ejecución a una vez por minuto", async () => {
    const primera = await actualizarEstadosSiToca();
    const segunda = await actualizarEstadosSiToca();
    expect(segunda).toBeNull();
    expect(primera === null || typeof primera.vencidos === "number").toBe(true);
  });
});

describe("Baja de ejemplares", () => {
  let bibToken, adminToken, lectorToken, libro, n;

  const ejemplar = (estado = "disponible") => Ejemplar.create({ libro: libro._id, codigoBarras: `BA-${++n}`, estado });

  beforeEach(async () => {
    n = 0;
    bibToken = getTestToken(await createTestUser({ rol: "bibliotecario" }));
    adminToken = getTestToken(await createTestUser({ rol: "admin" }));
    lectorToken = getTestToken(await createTestUser({ rol: "estudiante" }));
    libro = await Libro.create({ titulo: "Baja", autor: "A", isbn: "BA-ISBN-1", editorial: "E", anio: 2000, categoria: "C" });
  });

  test("el bibliotecario da de baja un ejemplar con motivo", async () => {
    const ej = await ejemplar();
    const res = await request(app).patch(`/api/ejemplares/${ej._id}/baja`).set("Authorization", `Bearer ${bibToken}`).send({ motivo: "Páginas dañadas" });
    expect(res.status).toBe(200);
    expect(res.body.ejemplar.estado).toBe("dado_de_baja");
    expect(res.body.ejemplar.motivoBaja).toBe("Páginas dañadas");
    expect(res.body.ejemplar.fechaBaja).toBeTruthy();
  });

  test("el admin también puede", async () => {
    const ej = await ejemplar();
    const res = await request(app).patch(`/api/ejemplares/${ej._id}/baja`).set("Authorization", `Bearer ${adminToken}`).send({ motivo: "Obsoleto" });
    expect(res.status).toBe(200);
  });

  test("sin motivo o con motivo corto responde 400", async () => {
    const ej = await ejemplar();
    const a = await request(app).patch(`/api/ejemplares/${ej._id}/baja`).set("Authorization", `Bearer ${bibToken}`).send({});
    expect(a.status).toBe(400);
    const b = await request(app).patch(`/api/ejemplares/${ej._id}/baja`).set("Authorization", `Bearer ${bibToken}`).send({ motivo: "ab" });
    expect(b.status).toBe(400);
    expect((await Ejemplar.findById(ej._id)).estado).toBe("disponible");
  });

  test("un estudiante no puede dar de baja (403)", async () => {
    const ej = await ejemplar();
    const res = await request(app).patch(`/api/ejemplares/${ej._id}/baja`).set("Authorization", `Bearer ${lectorToken}`).send({ motivo: "Intento" });
    expect(res.status).toBe(403);
  });

  test("sin token responde 401", async () => {
    const ej = await ejemplar();
    const res = await request(app).patch(`/api/ejemplares/${ej._id}/baja`).send({ motivo: "Intento" });
    expect(res.status).toBe(401);
  });

  test("un ejemplar prestado no se puede dar de baja (409)", async () => {
    const ej = await ejemplar("prestado");
    const res = await request(app).patch(`/api/ejemplares/${ej._id}/baja`).set("Authorization", `Bearer ${bibToken}`).send({ motivo: "Daño grave" });
    expect(res.status).toBe(409);
  });

  test("dar de baja dos veces responde 409", async () => {
    const ej = await ejemplar();
    await request(app).patch(`/api/ejemplares/${ej._id}/baja`).set("Authorization", `Bearer ${bibToken}`).send({ motivo: "Daño grave" });
    const res = await request(app).patch(`/api/ejemplares/${ej._id}/baja`).set("Authorization", `Bearer ${bibToken}`).send({ motivo: "Otra vez" });
    expect(res.status).toBe(409);
  });

  test("id inválido 400 e inexistente 404", async () => {
    const a = await request(app).patch("/api/ejemplares/abc/baja").set("Authorization", `Bearer ${bibToken}`).send({ motivo: "Daño grave" });
    expect(a.status).toBe(400);
    const b = await request(app).patch(`/api/ejemplares/${idFalso}/baja`).set("Authorization", `Bearer ${bibToken}`).send({ motivo: "Daño grave" });
    expect(b.status).toBe(404);
  });

  test("un ejemplar dado de baja no se puede prestar", async () => {
    const ej = await ejemplar();
    await request(app).patch(`/api/ejemplares/${ej._id}/baja`).set("Authorization", `Bearer ${bibToken}`).send({ motivo: "Daño grave" });
    const res = await request(app).post("/api/prestamos").set("Authorization", `Bearer ${lectorToken}`).send({ ejemplar: String(ej._id) });
    expect(res.status).toBe(409);
  });
});
