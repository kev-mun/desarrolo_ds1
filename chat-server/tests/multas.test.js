require("./setup");
const request = require("supertest");
const app = require("../api/app");
const Libro = require("../api/models/Libro");
const Ejemplar = require("../api/models/Ejemplar");
const Prestamo = require("../api/models/Prestamo");
const Multa = require("../api/models/Multa");
const { diasHabilesAtraso, calcularMonto } = require("../api/utils/multas");
const { createTestUser, getTestToken } = require("./helpers");

const DIA = 24 * 60 * 60 * 1000;
const idFalso = "60c72b2f9b1d8b2bad8e9999";

describe("Reglas de multas (cálculo)", () => {
  test("monto según los días hábiles de atraso", () => {
    expect(calcularMonto(0)).toBe(0);
    expect(calcularMonto(-3)).toBe(0);
    expect(calcularMonto(1)).toBe(1000);
    expect(calcularMonto(2)).toBe(2500);
    expect(calcularMonto(7)).toBe(2500);
    expect(calcularMonto(8)).toBe(2600);
    expect(calcularMonto(10)).toBe(2800);
  });

  test("solo cuenta días hábiles (lunes a viernes)", () => {
    // viernes -> lunes: solo el lunes cuenta
    expect(diasHabilesAtraso(new Date("2026-10-30T12:00:00"), new Date("2026-11-02T12:00:00"))).toBe(1);
    // misma fecha: sin atraso
    expect(diasHabilesAtraso(new Date("2026-10-30T12:00:00"), new Date("2026-10-30T18:00:00"))).toBe(0);
    // una semana completa: 5 días hábiles
    expect(diasHabilesAtraso(new Date("2026-10-30T12:00:00"), new Date("2026-11-06T12:00:00"))).toBe(5);
    // devolución anticipada
    expect(diasHabilesAtraso(new Date("2026-10-30T12:00:00"), new Date("2026-10-28T12:00:00"))).toBe(0);
  });
});

describe("Multas: devolución tardía, bloqueo y pago", () => {
  let bib, bibToken, lector, lectorToken, otroToken, libro, contador;

  const crearPrestamo = async (usuario, diasVencido) => {
    const ej = await Ejemplar.create({ libro: libro._id, codigoBarras: `MU-${++contador}`, estado: "prestado" });
    return Prestamo.create({
      ejemplar: ej._id,
      usuario: usuario._id,
      fechaPrestamo: new Date(Date.now() - (diasVencido + 7) * DIA),
      fechaVencEsperada: new Date(Date.now() - diasVencido * DIA),
      estado: "vencido"
    });
  };

  beforeEach(async () => {
    contador = 0;
    bib = await createTestUser({ rol: "bibliotecario" });
    bibToken = getTestToken(bib);
    lector = await createTestUser({ rol: "estudiante" });
    lectorToken = getTestToken(lector);
    otroToken = getTestToken(await createTestUser({ rol: "profesor" }));
    libro = await Libro.create({ titulo: "Libro multa", autor: "A", isbn: "MU-ISBN-1", editorial: "E", anio: 2001, categoria: "C" });
  });

  test("devolver a tiempo no genera multa", async () => {
    const ej = await Ejemplar.create({ libro: libro._id, codigoBarras: "MU-OK", estado: "prestado" });
    const p = await Prestamo.create({ ejemplar: ej._id, usuario: lector._id, fechaVencEsperada: new Date(Date.now() + 3 * DIA) });
    const res = await request(app).patch(`/api/prestamos/${p._id}/devolver`).set("Authorization", `Bearer ${bibToken}`);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("devuelto");
    expect(res.body.multa).toBeNull();
    expect(await Multa.countDocuments()).toBe(0);
  });

  test("devolver tarde genera la multa con el monto de la tabla", async () => {
    const p = await crearPrestamo(lector, 10);
    const res = await request(app).patch(`/api/prestamos/${p._id}/devolver`).set("Authorization", `Bearer ${bibToken}`);
    expect(res.status).toBe(200);

    const dias = diasHabilesAtraso(p.fechaVencEsperada, new Date());
    expect(dias).toBeGreaterThanOrEqual(6);
    expect(res.body.multa.diasAtraso).toBe(dias);
    expect(res.body.multa.monto).toBe(calcularMonto(dias));
    expect(res.body.multa.estado).toBe("pendiente");
    expect(await Multa.countDocuments({ usuario: lector._id })).toBe(1);
  });

  test("con una multa pendiente no puede pedir préstamos y al pagarla sí", async () => {
    const p = await crearPrestamo(lector, 10);
    const dev = await request(app).patch(`/api/prestamos/${p._id}/devolver`).set("Authorization", `Bearer ${bibToken}`);
    const multaId = dev.body.multa._id;

    const libre = await Ejemplar.create({ libro: libro._id, codigoBarras: "MU-LIBRE", estado: "disponible" });
    const bloqueado = await request(app).post("/api/prestamos").set("Authorization", `Bearer ${lectorToken}`).send({ ejemplar: String(libre._id) });
    expect(bloqueado.status).toBe(403);
    expect(bloqueado.body.message).toMatch(/multa pendiente/i);
    expect((await Ejemplar.findById(libre._id)).estado).toBe("disponible");

    const pago = await request(app).patch(`/api/multas/${multaId}/pagar`).set("Authorization", `Bearer ${lectorToken}`);
    expect(pago.status).toBe(200);
    expect(pago.body.estado).toBe("pagada");
    expect(pago.body.fechaPago).toBeTruthy();

    const ok = await request(app).post("/api/prestamos").set("Authorization", `Bearer ${lectorToken}`).send({ ejemplar: String(libre._id) });
    expect(ok.status).toBe(201);
  });

  test("pagar una multa ya pagada responde 409", async () => {
    const p = await crearPrestamo(lector, 10);
    const dev = await request(app).patch(`/api/prestamos/${p._id}/devolver`).set("Authorization", `Bearer ${bibToken}`);
    await request(app).patch(`/api/multas/${dev.body.multa._id}/pagar`).set("Authorization", `Bearer ${bibToken}`);
    const otra = await request(app).patch(`/api/multas/${dev.body.multa._id}/pagar`).set("Authorization", `Bearer ${bibToken}`);
    expect(otra.status).toBe(409);
  });

  test("un lector no puede pagar la multa de otro", async () => {
    const p = await crearPrestamo(lector, 10);
    const dev = await request(app).patch(`/api/prestamos/${p._id}/devolver`).set("Authorization", `Bearer ${bibToken}`);
    const res = await request(app).patch(`/api/multas/${dev.body.multa._id}/pagar`).set("Authorization", `Bearer ${otroToken}`);
    expect(res.status).toBe(403);
    expect((await Multa.findById(dev.body.multa._id)).estado).toBe("pendiente");
  });

  test("id inválido responde 400 y multa inexistente 404", async () => {
    const a = await request(app).patch("/api/multas/abc/pagar").set("Authorization", `Bearer ${bibToken}`);
    expect(a.status).toBe(400);
    const b = await request(app).patch(`/api/multas/${idFalso}/pagar`).set("Authorization", `Bearer ${bibToken}`);
    expect(b.status).toBe(404);
  });

  describe("GET /api/multas", () => {
    beforeEach(async () => {
      for (const u of [lector, await createTestUser({ rol: "profesor" })]) {
        const p = await crearPrestamo(u, 10);
        await request(app).patch(`/api/prestamos/${p._id}/devolver`).set("Authorization", `Bearer ${bibToken}`);
      }
    });

    test("el lector solo ve las suyas", async () => {
      const res = await request(app).get("/api/multas").set("Authorization", `Bearer ${lectorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.totalPendiente).toBeGreaterThan(0);
    });

    test("el personal ve todas y puede filtrar", async () => {
      const todas = await request(app).get("/api/multas").set("Authorization", `Bearer ${bibToken}`);
      expect(todas.body.count).toBe(2);
      const porUsuario = await request(app).get(`/api/multas?usuario=${lector._id}`).set("Authorization", `Bearer ${bibToken}`);
      expect(porUsuario.body.count).toBe(1);
      const pagadas = await request(app).get("/api/multas?estado=pagada").set("Authorization", `Bearer ${bibToken}`);
      expect(pagadas.body.count).toBe(0);
    });

    test("usuario con id inválido responde 400", async () => {
      const res = await request(app).get("/api/multas?usuario=abc").set("Authorization", `Bearer ${bibToken}`);
      expect(res.status).toBe(400);
    });

    test("sin token responde 401", async () => {
      const res = await request(app).get("/api/multas");
      expect(res.status).toBe(401);
    });
  });
});
