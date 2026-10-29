require("./setup");
const request = require("supertest");
const app = require("../api/app");
const Libro = require("../api/models/Libro");
const Ejemplar = require("../api/models/Ejemplar");
const { createTestUser, getTestToken } = require("./helpers");

const idFalso = "60c72b2f9b1d8b2bad8e9999";

describe("Ejemplares: cobertura completa", () => {
  let bibToken, lectorToken, libro, otroLibro;

  beforeEach(async () => {
    bibToken = getTestToken(await createTestUser({ rol: "bibliotecario" }));
    lectorToken = getTestToken(await createTestUser({ rol: "estudiante" }));
    libro = await Libro.create({ titulo: "Uno", autor: "A", isbn: "EJ-ISBN-1", editorial: "E", anio: 2001, categoria: "C" });
    otroLibro = await Libro.create({ titulo: "Dos", autor: "B", isbn: "EJ-ISBN-2", editorial: "E", anio: 2002, categoria: "C" });
  });

  describe("GET /api/ejemplares", () => {
    beforeEach(async () => {
      await Ejemplar.create({ libro: libro._id, codigoBarras: "G-1", estado: "disponible", ubicacion: "E1" });
      await Ejemplar.create({ libro: libro._id, codigoBarras: "G-2", estado: "prestado", ubicacion: "E1" });
      await Ejemplar.create({ libro: otroLibro._id, codigoBarras: "G-3", estado: "disponible", ubicacion: "E2" });
    });

    test("lista todos con el libro poblado", async () => {
      const res = await request(app).get("/api/ejemplares").set("Authorization", `Bearer ${bibToken}`);
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(3);
      expect(res.body.data[0].libro.titulo).toBeTruthy();
    });

    test("filtra por libro", async () => {
      const res = await request(app).get(`/api/ejemplares?libro=${libro._id}`).set("Authorization", `Bearer ${bibToken}`);
      expect(res.body.count).toBe(2);
    });

    test("filtra por estado", async () => {
      const res = await request(app).get("/api/ejemplares?estado=prestado").set("Authorization", `Bearer ${bibToken}`);
      expect(res.body.count).toBe(1);
    });

    test("un estado desconocido se ignora", async () => {
      const res = await request(app).get("/api/ejemplares?estado=inventado").set("Authorization", `Bearer ${bibToken}`);
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(3);
    });

    test("libro con id inválido responde 400", async () => {
      const res = await request(app).get("/api/ejemplares?libro=abc").set("Authorization", `Bearer ${bibToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/ejemplares", () => {
    test("crea un ejemplar con estado disponible por defecto", async () => {
      const res = await request(app).post("/api/ejemplares").set("Authorization", `Bearer ${bibToken}`)
        .send({ libro: String(libro._id), codigoBarras: "NEW-1", ubicacion: "Estante 5" });
      expect(res.status).toBe(201);
      expect(res.body.estado).toBe("disponible");
      expect(res.body.ubicacion).toBe("Estante 5");
    });

    test("sin código de barras responde 400", async () => {
      const res = await request(app).post("/api/ejemplares").set("Authorization", `Bearer ${bibToken}`).send({ libro: String(libro._id) });
      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.errores)).toBe(true);
    });

    test("libro con id inválido responde 400", async () => {
      const res = await request(app).post("/api/ejemplares").set("Authorization", `Bearer ${bibToken}`).send({ libro: "abc", codigoBarras: "X-1" });
      expect(res.status).toBe(400);
    });

    test("libro inexistente responde 404", async () => {
      const res = await request(app).post("/api/ejemplares").set("Authorization", `Bearer ${bibToken}`).send({ libro: idFalso, codigoBarras: "X-2" });
      expect(res.status).toBe(404);
    });

    test("código de barras duplicado responde 409", async () => {
      await Ejemplar.create({ libro: libro._id, codigoBarras: "DUP-1" });
      const res = await request(app).post("/api/ejemplares").set("Authorization", `Bearer ${bibToken}`).send({ libro: String(libro._id), codigoBarras: "DUP-1" });
      expect(res.status).toBe(409);
    });

    test("un estudiante no puede crear ejemplares", async () => {
      const res = await request(app).post("/api/ejemplares").set("Authorization", `Bearer ${lectorToken}`).send({ libro: String(libro._id), codigoBarras: "X-3" });
      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/ejemplares/:id", () => {
    let ej;
    beforeEach(async () => {
      ej = await Ejemplar.create({ libro: libro._id, codigoBarras: "PUT-1", estado: "disponible", ubicacion: "E1" });
    });

    test("actualiza código, estado y ubicación", async () => {
      const res = await request(app).put(`/api/ejemplares/${ej._id}`).set("Authorization", `Bearer ${bibToken}`)
        .send({ codigoBarras: " PUT-1B ", estado: "prestado", ubicacion: "  E9  " });
      expect(res.status).toBe(200);
      expect(res.body.codigoBarras).toBe("PUT-1B");
      expect(res.body.estado).toBe("prestado");
      expect(res.body.ubicacion).toBe("E9");
    });

    test("puede cambiar el ejemplar a otro libro", async () => {
      const res = await request(app).put(`/api/ejemplares/${ej._id}`).set("Authorization", `Bearer ${bibToken}`).send({ libro: String(otroLibro._id) });
      expect(res.status).toBe(200);
      expect(String(res.body.libro)).toBe(String(otroLibro._id));
    });

    test("código de otro ejemplar responde 409", async () => {
      await Ejemplar.create({ libro: libro._id, codigoBarras: "PUT-2" });
      const res = await request(app).put(`/api/ejemplares/${ej._id}`).set("Authorization", `Bearer ${bibToken}`).send({ codigoBarras: "PUT-2" });
      expect(res.status).toBe(409);
    });

    test("estado inválido responde 400", async () => {
      const res = await request(app).put(`/api/ejemplares/${ej._id}`).set("Authorization", `Bearer ${bibToken}`).send({ estado: "inventado" });
      expect(res.status).toBe(400);
    });

    test("libro con id inválido responde 400", async () => {
      const res = await request(app).put(`/api/ejemplares/${ej._id}`).set("Authorization", `Bearer ${bibToken}`).send({ libro: "abc" });
      expect(res.status).toBe(400);
    });

    test("libro inexistente responde 404", async () => {
      const res = await request(app).put(`/api/ejemplares/${ej._id}`).set("Authorization", `Bearer ${bibToken}`).send({ libro: idFalso });
      expect(res.status).toBe(404);
    });

    test("id inválido responde 400", async () => {
      const res = await request(app).put("/api/ejemplares/abc").set("Authorization", `Bearer ${bibToken}`).send({ ubicacion: "X" });
      expect(res.status).toBe(400);
    });

    test("ejemplar inexistente responde 404", async () => {
      const res = await request(app).put(`/api/ejemplares/${idFalso}`).set("Authorization", `Bearer ${bibToken}`).send({ ubicacion: "X" });
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/ejemplares/:id/estado", () => {
    let ej;
    beforeEach(async () => {
      ej = await Ejemplar.create({ libro: libro._id, codigoBarras: "PAT-1", estado: "disponible" });
    });

    test("cambia el estado", async () => {
      const res = await request(app).patch(`/api/ejemplares/${ej._id}/estado`).set("Authorization", `Bearer ${bibToken}`).send({ estado: "prestado" });
      expect(res.status).toBe(200);
      expect(res.body.ejemplar.estado).toBe("prestado");
    });

    test("estado inválido responde 400", async () => {
      const res = await request(app).patch(`/api/ejemplares/${ej._id}/estado`).set("Authorization", `Bearer ${bibToken}`).send({ estado: "inventado" });
      expect(res.status).toBe(400);
    });

    test("sin estado responde 400", async () => {
      const res = await request(app).patch(`/api/ejemplares/${ej._id}/estado`).set("Authorization", `Bearer ${bibToken}`).send({});
      expect(res.status).toBe(400);
    });

    test("id inválido responde 400", async () => {
      const res = await request(app).patch("/api/ejemplares/abc/estado").set("Authorization", `Bearer ${bibToken}`).send({ estado: "prestado" });
      expect(res.status).toBe(400);
    });

    test("ejemplar inexistente responde 404", async () => {
      const res = await request(app).patch(`/api/ejemplares/${idFalso}/estado`).set("Authorization", `Bearer ${bibToken}`).send({ estado: "prestado" });
      expect(res.status).toBe(404);
    });
  });
});
