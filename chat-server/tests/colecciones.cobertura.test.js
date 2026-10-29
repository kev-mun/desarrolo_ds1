require("./setup");
const request = require("supertest");
const app = require("../api/app");
const Coleccion = require("../api/models/Coleccion");
const Libro = require("../api/models/Libro");
const { createTestUser, getTestToken } = require("./helpers");

const idFalso = "60c72b2f9b1d8b2bad8e9999";
let contador = 0;
const nuevoLibro = (extra = {}) => ({
  titulo: "Libro de prueba",
  autor: "Autor",
  isbn: `ISBN-COL-${++contador}`,
  editorial: "Editorial",
  anio: 2000,
  categoria: "General",
  ...extra
});

describe("Colecciones: cobertura completa", () => {
  let bibToken, lectorToken;

  beforeEach(async () => {
    bibToken = getTestToken(await createTestUser({ rol: "bibliotecario" }));
    lectorToken = getTestToken(await createTestUser({ rol: "estudiante" }));
  });

  describe("GET /api/colecciones", () => {
    test("lista ordenada por nombre con la cantidad de libros", async () => {
      const b = await Coleccion.create({ nombre: "B Historia" });
      await Coleccion.create({ nombre: "A Ciencia" });
      await Libro.create(nuevoLibro({ coleccion: b._id }));
      await Libro.create(nuevoLibro({ coleccion: b._id }));

      const res = await request(app).get("/api/colecciones").set("Authorization", `Bearer ${lectorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.data[0].nombre).toBe("A Ciencia");
      expect(res.body.data[0].cantidadLibros).toBe(0);
      expect(res.body.data[1].cantidadLibros).toBe(2);
    });
  });

  describe("GET /api/colecciones/:id/libros", () => {
    test("devuelve los libros de la colección", async () => {
      const c = await Coleccion.create({ nombre: "Novelas" });
      await Libro.create(nuevoLibro({ coleccion: c._id }));

      const res = await request(app).get(`/api/colecciones/${c._id}/libros`).set("Authorization", `Bearer ${lectorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
    });

    test("colección sin libros devuelve lista vacía con mensaje", async () => {
      const c = await Coleccion.create({ nombre: "Vacía" });
      const res = await request(app).get(`/api/colecciones/${c._id}/libros`).set("Authorization", `Bearer ${lectorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.message).toBeTruthy();
    });

    test("id inválido responde 400", async () => {
      const res = await request(app).get("/api/colecciones/abc/libros").set("Authorization", `Bearer ${lectorToken}`);
      expect(res.status).toBe(400);
    });

    test("colección inexistente responde 404", async () => {
      const res = await request(app).get(`/api/colecciones/${idFalso}/libros`).set("Authorization", `Bearer ${lectorToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/colecciones", () => {
    test("crea una colección", async () => {
      const res = await request(app).post("/api/colecciones").set("Authorization", `Bearer ${bibToken}`).send({ nombre: "Poesía", descripcion: "Versos" });
      expect(res.status).toBe(201);
      expect(res.body.nombre).toBe("Poesía");
    });

    test("la descripción es opcional", async () => {
      const res = await request(app).post("/api/colecciones").set("Authorization", `Bearer ${bibToken}`).send({ nombre: "Sin descripción" });
      expect(res.status).toBe(201);
      expect(res.body.descripcion).toBe("");
    });

    test("nombre duplicado responde 409", async () => {
      await Coleccion.create({ nombre: "Repetida" });
      const res = await request(app).post("/api/colecciones").set("Authorization", `Bearer ${bibToken}`).send({ nombre: "Repetida" });
      expect(res.status).toBe(409);
    });

    test("sin nombre responde 400", async () => {
      const res = await request(app).post("/api/colecciones").set("Authorization", `Bearer ${bibToken}`).send({});
      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.errores)).toBe(true);
    });

    test("un estudiante no puede crear colecciones", async () => {
      const res = await request(app).post("/api/colecciones").set("Authorization", `Bearer ${lectorToken}`).send({ nombre: "X" });
      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/colecciones/:id", () => {
    test("actualiza nombre y descripción", async () => {
      const c = await Coleccion.create({ nombre: "Antigua" });
      const res = await request(app).put(`/api/colecciones/${c._id}`).set("Authorization", `Bearer ${bibToken}`).send({ nombre: "Nueva", descripcion: "Texto" });
      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe("Nueva");
      expect(res.body.descripcion).toBe("Texto");
    });

    test("enviar el mismo nombre no es conflicto", async () => {
      const c = await Coleccion.create({ nombre: "Igual" });
      const res = await request(app).put(`/api/colecciones/${c._id}`).set("Authorization", `Bearer ${bibToken}`).send({ nombre: "Igual", descripcion: "Cambia" });
      expect(res.status).toBe(200);
    });

    test("nombre de otra colección responde 409", async () => {
      await Coleccion.create({ nombre: "Ocupado" });
      const c = await Coleccion.create({ nombre: "Libre" });
      const res = await request(app).put(`/api/colecciones/${c._id}`).set("Authorization", `Bearer ${bibToken}`).send({ nombre: "Ocupado" });
      expect(res.status).toBe(409);
    });

    test("nombre vacío responde 400", async () => {
      const c = await Coleccion.create({ nombre: "Valida" });
      const res = await request(app).put(`/api/colecciones/${c._id}`).set("Authorization", `Bearer ${bibToken}`).send({ nombre: "" });
      expect(res.status).toBe(400);
    });

    test("id inválido responde 400", async () => {
      const res = await request(app).put("/api/colecciones/abc").set("Authorization", `Bearer ${bibToken}`).send({ nombre: "X" });
      expect(res.status).toBe(400);
    });

    test("colección inexistente responde 404", async () => {
      const res = await request(app).put(`/api/colecciones/${idFalso}`).set("Authorization", `Bearer ${bibToken}`).send({ nombre: "X" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/colecciones/:id", () => {
    test("elimina la colección y desvincula sus libros", async () => {
      const c = await Coleccion.create({ nombre: "Temporal" });
      const libro = await Libro.create(nuevoLibro({ coleccion: c._id }));

      const res = await request(app).delete(`/api/colecciones/${c._id}`).set("Authorization", `Bearer ${bibToken}`);
      expect(res.status).toBe(200);
      expect(await Coleccion.findById(c._id)).toBeNull();

      const libroDB = await Libro.findById(libro._id);
      expect(libroDB).not.toBeNull();
      expect(libroDB.coleccion).toBeNull();
    });

    test("id inválido responde 400", async () => {
      const res = await request(app).delete("/api/colecciones/abc").set("Authorization", `Bearer ${bibToken}`);
      expect(res.status).toBe(400);
    });

    test("colección inexistente responde 404", async () => {
      const res = await request(app).delete(`/api/colecciones/${idFalso}`).set("Authorization", `Bearer ${bibToken}`);
      expect(res.status).toBe(404);
    });
  });
});
