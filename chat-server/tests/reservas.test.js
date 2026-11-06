require("./setup");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../api/app");
const Libro = require("../api/models/Libro");
const Ejemplar = require("../api/models/Ejemplar");
const Prestamo = require("../api/models/Prestamo");
const Reserva = require("../api/models/Reserva");
const Multa = require("../api/models/Multa");
const { actualizarEstados } = require("../api/utils/estados");
const { HORAS_RETENCION } = require("../api/utils/reservas");
const { createTestUser, getTestToken } = require("./helpers");

const DIA = 24 * 60 * 60 * 1000;
const HORA = 60 * 60 * 1000;
const idFalso = "60c72b2f9b1d8b2bad8e9999";

describe("Reservas con cola", () => {
  let libro, ejemplar, prestamoA;
  let ana, beto, cris, bib;
  let anaT, betoT, crisT, bibT;
  let n;

  const reservar = (token, body) => request(app).post("/api/reservas").set("Authorization", `Bearer ${token}`).send(body);
  const listar = (token, q = "") => request(app).get(`/api/reservas${q}`).set("Authorization", `Bearer ${token}`);
  const devolver = (id) => request(app).patch(`/api/prestamos/${id}/devolver`).set("Authorization", `Bearer ${bibT}`);
  const prestar = (id, token) => request(app).post(`/api/reservas/${id}/prestar`).set("Authorization", `Bearer ${token}`);
  const cancelar = (id, token) => request(app).patch(`/api/reservas/${id}/cancelar`).set("Authorization", `Bearer ${token}`);

  beforeEach(async () => {
    n = 0;
    await mongoose.connection.db.collection("mv_mas_prestados").deleteMany({});
    ana = await createTestUser({ rol: "estudiante", nombre: "Ana" });
    beto = await createTestUser({ rol: "profesor", nombre: "Beto" });
    cris = await createTestUser({ rol: "estudiante", nombre: "Cris" });
    bib = await createTestUser({ rol: "bibliotecario" });
    [anaT, betoT, crisT, bibT] = [ana, beto, cris, bib].map(getTestToken);
    libro = await Libro.create({ titulo: "Muy pedido", autor: "A", isbn: "RS-ISBN-1", editorial: "E", anio: 2000, categoria: "C" });
    ejemplar = await Ejemplar.create({ libro: libro._id, codigoBarras: "RS-1", estado: "prestado" });
    prestamoA = await Prestamo.create({ ejemplar: ejemplar._id, usuario: ana._id, fechaVencEsperada: new Date(Date.now() + 3 * DIA) });
  });

  describe("crear la reserva", () => {
    test("reserva un libro con todos los ejemplares prestados y devuelve su posición", async () => {
      const a = await reservar(betoT, { libro: String(libro._id) });
      expect(a.status).toBe(201);
      expect(a.body.estado).toBe("en_espera");
      expect(a.body.posicion).toBe(1);
      expect(String(a.body.usuario)).toBe(String(beto._id));
      const b = await reservar(crisT, { libro: String(libro._id) });
      expect(b.body.posicion).toBe(2);
    });

    test("un lector no puede reservar a nombre de otro", async () => {
      const res = await reservar(betoT, { libro: String(libro._id), usuario: String(cris._id) });
      expect(res.status).toBe(201);
      expect(String(res.body.usuario)).toBe(String(beto._id));
    });

    test("el personal puede reservar a nombre de un usuario", async () => {
      const res = await reservar(bibT, { libro: String(libro._id), usuario: String(cris._id) });
      expect(res.status).toBe(201);
      expect(String(res.body.usuario)).toBe(String(cris._id));
    });

    test("con un ejemplar disponible no hace falta reservar (409)", async () => {
      await Ejemplar.create({ libro: libro._id, codigoBarras: "RS-2", estado: "disponible" });
      const res = await reservar(betoT, { libro: String(libro._id) });
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/disponibles/i);
    });

    test("no se reserva dos veces el mismo libro (409)", async () => {
      await reservar(betoT, { libro: String(libro._id) });
      const res = await reservar(betoT, { libro: String(libro._id) });
      expect(res.status).toBe(409);
    });

    test("un libro sin ejemplares no se reserva (409)", async () => {
      const vacio = await Libro.create({ titulo: "Sin copias", autor: "B", isbn: "RS-ISBN-2", editorial: "E", anio: 2001, categoria: "C" });
      const res = await reservar(betoT, { libro: String(vacio._id) });
      expect(res.status).toBe(409);
    });

    test("libro inexistente 404, id inválido 400, sin libro 400, sin token 401", async () => {
      expect((await reservar(betoT, { libro: idFalso })).status).toBe(404);
      expect((await reservar(betoT, { libro: "abc" })).status).toBe(400);
      expect((await reservar(betoT, {})).status).toBe(400);
      expect((await request(app).post("/api/reservas").send({ libro: String(libro._id) })).status).toBe(401);
    });

    test("usuario inexistente 404 y suspendido 400 (reserva hecha por el personal)", async () => {
      expect((await reservar(bibT, { libro: String(libro._id), usuario: idFalso })).status).toBe(404);
      const susp = await createTestUser({ rol: "estudiante", estado: "suspendido" });
      expect((await reservar(bibT, { libro: String(libro._id), usuario: String(susp._id) })).status).toBe(400);
    });

    test("con una multa pendiente no puede reservar (403)", async () => {
      const otro = await Prestamo.create({ ejemplar: ejemplar._id, usuario: beto._id, fechaVencEsperada: new Date(), estado: "devuelto", fechaDevolucionReal: new Date() });
      await Multa.create({ prestamo: otro._id, ejemplar: ejemplar._id, usuario: beto._id, diasAtraso: 3, monto: 2500 });
      const res = await reservar(betoT, { libro: String(libro._id) });
      expect(res.status).toBe(403);
    });
  });

  describe("turno, préstamo y vencimiento", () => {
    let rBeto, rCris;
    beforeEach(async () => {
      rBeto = (await reservar(betoT, { libro: String(libro._id) })).body;
      rCris = (await reservar(crisT, { libro: String(libro._id) })).body;
    });

    test("al devolver el ejemplar, el primero de la cola queda con la reserva lista y 48 horas", async () => {
      const dev = await devolver(prestamoA._id);
      expect(dev.status).toBe(200);

      const listaBeto = await Reserva.findById(rBeto._id);
      expect(listaBeto.estado).toBe("lista");
      expect(String(listaBeto.ejemplar)).toBe(String(ejemplar._id));
      const diff = listaBeto.fechaLimite.getTime() - Date.now();
      expect(diff).toBeGreaterThan((HORAS_RETENCION - 1) * HORA);
      expect(diff).toBeLessThanOrEqual(HORAS_RETENCION * HORA);
      expect((await Ejemplar.findById(ejemplar._id)).estado).toBe("reservado");

      const cola = await listar(crisT);
      expect(cola.body.data[0].estado).toBe("en_espera");
      expect(cola.body.data[0].posicion).toBe(1);
    });

    test("quien tiene la reserva lista la convierte en préstamo", async () => {
      await devolver(prestamoA._id);
      const res = await prestar(rBeto._id, betoT);
      expect(res.status).toBe(201);
      expect(String(res.body.usuario)).toBe(String(beto._id));
      expect(res.body.estado).toBe("activo");
      expect((await Ejemplar.findById(ejemplar._id)).estado).toBe("prestado");
      expect((await Reserva.findById(rBeto._id)).estado).toBe("cumplida");
    });

    test("otro lector no puede usar la reserva (403) y una reserva en espera no se presta (409)", async () => {
      await devolver(prestamoA._id);
      expect((await prestar(rBeto._id, crisT)).status).toBe(403);
      const enEspera = await prestar(rCris._id, crisT);
      expect(enEspera.status).toBe(409);
      expect(enEspera.body.message).toMatch(/cola/i);
    });

    test("una reserva ya usada no se puede usar otra vez (409)", async () => {
      await devolver(prestamoA._id);
      await prestar(rBeto._id, betoT);
      expect((await prestar(rBeto._id, betoT)).status).toBe(409);
    });

    test("pasado el plazo no se puede pedir el préstamo (409)", async () => {
      await devolver(prestamoA._id);
      await Reserva.updateOne({ _id: rBeto._id }, { $set: { fechaLimite: new Date(Date.now() - HORA) } });
      const res = await prestar(rBeto._id, betoT);
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/venci/i);
    });

    test("con una multa pendiente no puede pedir el préstamo (403)", async () => {
      await devolver(prestamoA._id);
      const viejo = await Prestamo.create({ ejemplar: ejemplar._id, usuario: beto._id, fechaVencEsperada: new Date(), estado: "devuelto", fechaDevolucionReal: new Date() });
      await Multa.create({ prestamo: viejo._id, ejemplar: ejemplar._id, usuario: beto._id, diasAtraso: 2, monto: 2500 });
      expect((await prestar(rBeto._id, betoT)).status).toBe(403);
    });

    test("si vence el plazo, la reserva pasa a vencida y el turno al siguiente", async () => {
      await devolver(prestamoA._id);
      await Reserva.updateOne({ _id: rBeto._id }, { $set: { fechaLimite: new Date(Date.now() - HORA) } });
      await actualizarEstados();

      expect((await Reserva.findById(rBeto._id)).estado).toBe("vencida");
      const cris2 = await Reserva.findById(rCris._id);
      expect(cris2.estado).toBe("lista");
      expect(String(cris2.ejemplar)).toBe(String(ejemplar._id));
      expect((await Ejemplar.findById(ejemplar._id)).estado).toBe("reservado");
    });

    test("si vence y no hay nadie más en la cola, el ejemplar queda disponible", async () => {
      await cancelar(rCris._id, crisT);
      await devolver(prestamoA._id);
      await Reserva.updateOne({ _id: rBeto._id }, { $set: { fechaLimite: new Date(Date.now() - HORA) } });
      await actualizarEstados();
      expect((await Reserva.findById(rBeto._id)).estado).toBe("vencida");
      expect((await Ejemplar.findById(ejemplar._id)).estado).toBe("disponible");
    });

    test("si el que tiene el turno cancela, pasa al siguiente", async () => {
      await devolver(prestamoA._id);
      const res = await cancelar(rBeto._id, betoT);
      expect(res.status).toBe(200);
      expect(res.body.estado).toBe("cancelada");
      expect((await Reserva.findById(rCris._id)).estado).toBe("lista");
    });
  });

  describe("cancelar y consultar", () => {
    let r;
    beforeEach(async () => {
      r = (await reservar(betoT, { libro: String(libro._id) })).body;
    });

    test("el dueño cancela una reserva en espera", async () => {
      const res = await cancelar(r._id, betoT);
      expect(res.status).toBe(200);
      expect((await Reserva.findById(r._id)).estado).toBe("cancelada");
    });

    test("el personal puede cancelar la reserva de otro", async () => {
      expect((await cancelar(r._id, bibT)).status).toBe(200);
    });

    test("un lector no cancela la reserva de otro (403)", async () => {
      expect((await cancelar(r._id, crisT)).status).toBe(403);
    });

    test("cancelar dos veces responde 409; id inválido 400; inexistente 404", async () => {
      await cancelar(r._id, betoT);
      expect((await cancelar(r._id, betoT)).status).toBe(409);
      expect((await cancelar("abc", betoT)).status).toBe(400);
      expect((await cancelar(idFalso, betoT)).status).toBe(404);
    });

    test("el lector ve solo las suyas; el personal ve todas y filtra", async () => {
      await reservar(crisT, { libro: String(libro._id) });
      const propias = await listar(betoT);
      expect(propias.body.count).toBe(1);
      const todas = await listar(bibT);
      expect(todas.body.count).toBe(2);
      const porUsuario = await listar(bibT, `?usuario=${cris._id}`);
      expect(porUsuario.body.count).toBe(1);
      const canceladas = await listar(bibT, "?estado=cancelada");
      expect(canceladas.body.count).toBe(0);
      expect((await listar(bibT, "?usuario=abc")).status).toBe(400);
      expect((await request(app).get("/api/reservas")).status).toBe(401);
    });
  });

  describe("integración con renovaciones y dashboard", () => {
    test("con una reserva en espera, el titular no puede renovar", async () => {
      await reservar(betoT, { libro: String(libro._id) });
      const res = await request(app).post(`/api/prestamos/${prestamoA._id}/renovar`).set("Authorization", `Bearer ${anaT}`);
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/reserva/i);
    });

    test("el dashboard lista los libros más reservados", async () => {
      await reservar(betoT, { libro: String(libro._id) });
      await reservar(crisT, { libro: String(libro._id) });
      const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${bibT}`);
      expect(res.status).toBe(200);
      expect(res.body.masReservados[0]).toMatchObject({ titulo: "Muy pedido", total: 2 });
    });
  });
});
