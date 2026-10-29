require("./setup");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../api/app");
const Libro = require("../api/models/Libro");
const Ejemplar = require("../api/models/Ejemplar");
const { createTestUser, getTestToken } = require("./helpers");

const idFalso = "60c72b2f9b1d8b2bad8e9999";

const datosLibro = (extra = {}) => ({
  titulo: "Rayuela",
  autor: "Julio Cortázar",
  isbn: "978-950-07-0001-1",
  editorial: "Sudamericana",
  anio: 1963,
  categoria: "Novela",
  ...extra
});

describe("Libros: cobertura de crear, actualizar, eliminar y listar", () => {
  let editorToken, lectorToken;

  beforeEach(async () => {
    const editor = await createTestUser({ rol: "editorial", permisos: ["gestionar_libros"] });
    editorToken = getTestToken(editor);
    const lector = await createTestUser({ rol: "estudiante" });
    lectorToken = getTestToken(lector);
  });

  describe("POST /api/libros", () => {
    test("crea un libro y devuelve 201", async () => {
      const res = await request(app).post("/api/libros").set("Authorization", `Bearer ${editorToken}`).send(datosLibro());
      expect(res.status).toBe(201);
      expect(res.body.titulo).toBe("Rayuela");
    });

    test("crea un libro con colección válida", async () => {
      const col = new mongoose.Types.ObjectId().toString();
      const res = await request(app).post("/api/libros").set("Authorization", `Bearer ${editorToken}`).send(datosLibro({ coleccion: col }));
      expect(res.status).toBe(201);
      expect(String(res.body.coleccion)).toBe(col);
    });

    test("ISBN duplicado responde 409", async () => {
      await Libro.create(datosLibro());
      const res = await request(app).post("/api/libros").set("Authorization", `Bearer ${editorToken}`).send(datosLibro());
      expect(res.status).toBe(409);
    });

    test("datos incompletos responden 400", async () => {
      const res = await request(app).post("/api/libros").set("Authorization", `Bearer ${editorToken}`).send({ titulo: "Solo título" });
      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.errores)).toBe(true);
    });

    test("colección con id inválido responde 400", async () => {
      const res = await request(app).post("/api/libros").set("Authorization", `Bearer ${editorToken}`).send(datosLibro({ coleccion: "no-es-id" }));
      expect(res.status).toBe(400);
    });

    test("un estudiante no puede crear libros", async () => {
      const res = await request(app).post("/api/libros").set("Authorization", `Bearer ${lectorToken}`).send(datosLibro());
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/libros/:id", () => {
    test("devuelve el libro con sus ejemplares", async () => {
      const libro = await Libro.create(datosLibro());
      await Ejemplar.create({ libro: libro._id, codigoBarras: "RAY-01", estado: "disponible", ubicacion: "E1" });

      const res = await request(app).get(`/api/libros/${libro._id}`).set("Authorization", `Bearer ${lectorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ejemplares.length).toBe(1);
    });

    test("id inválido responde 400", async () => {
      const res = await request(app).get("/api/libros/abc").set("Authorization", `Bearer ${lectorToken}`);
      expect(res.status).toBe(400);
    });

    test("libro inexistente responde 404", async () => {
      const res = await request(app).get(`/api/libros/${idFalso}`).set("Authorization", `Bearer ${lectorToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/libros/:id", () => {
    test("actualiza campos y recorta espacios", async () => {
      const libro = await Libro.create(datosLibro());
      const res = await request(app)
        .put(`/api/libros/${libro._id}`)
        .set("Authorization", `Bearer ${editorToken}`)
        .send({ titulo: "  Rayuela (edición 2)  ", anio: 1990 });

      expect(res.status).toBe(200);
      expect(res.body.titulo).toBe("Rayuela (edición 2)");
      expect(res.body.anio).toBe(1990);
    });

    test("puede quitar la colección enviando cadena vacía", async () => {
      const libro = await Libro.create(datosLibro({ coleccion: new mongoose.Types.ObjectId() }));
      const res = await request(app).put(`/api/libros/${libro._id}`).set("Authorization", `Bearer ${editorToken}`).send({ coleccion: "" });
      expect(res.status).toBe(200);
      expect(res.body.coleccion).toBeNull();
    });

    test("cambiar el ISBN por uno existente responde 409", async () => {
      await Libro.create(datosLibro({ isbn: "ISBN-A" }));
      const otro = await Libro.create(datosLibro({ isbn: "ISBN-B", titulo: "Otro" }));
      const res = await request(app).put(`/api/libros/${otro._id}`).set("Authorization", `Bearer ${editorToken}`).send({ isbn: "ISBN-A" });
      expect(res.status).toBe(409);
    });

    test("mantener el mismo ISBN no es conflicto", async () => {
      const libro = await Libro.create(datosLibro());
      const res = await request(app).put(`/api/libros/${libro._id}`).set("Authorization", `Bearer ${editorToken}`).send({ isbn: libro.isbn, titulo: "Mismo ISBN" });
      expect(res.status).toBe(200);
    });

    test("datos inválidos responden 400", async () => {
      const libro = await Libro.create(datosLibro());
      const res = await request(app).put(`/api/libros/${libro._id}`).set("Authorization", `Bearer ${editorToken}`).send({ anio: -5 });
      expect(res.status).toBe(400);
    });

    test("id inválido responde 400", async () => {
      const res = await request(app).put("/api/libros/abc").set("Authorization", `Bearer ${editorToken}`).send({ titulo: "X" });
      expect(res.status).toBe(400);
    });

    test("libro inexistente responde 404", async () => {
      const res = await request(app).put(`/api/libros/${idFalso}`).set("Authorization", `Bearer ${editorToken}`).send({ titulo: "X" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/libros/:id", () => {
    test("elimina el libro y sus ejemplares disponibles", async () => {
      const libro = await Libro.create(datosLibro());
      await Ejemplar.create({ libro: libro._id, codigoBarras: "DEL-01", estado: "disponible", ubicacion: "E1" });

      const res = await request(app).delete(`/api/libros/${libro._id}`).set("Authorization", `Bearer ${editorToken}`);
      expect(res.status).toBe(200);
      expect(await Libro.findById(libro._id)).toBeNull();
      expect(await Ejemplar.countDocuments({ libro: libro._id })).toBe(0);
    });

    test("no elimina si hay ejemplares prestados (409)", async () => {
      const libro = await Libro.create(datosLibro());
      await Ejemplar.create({ libro: libro._id, codigoBarras: "DEL-02", estado: "prestado", ubicacion: "E1" });

      const res = await request(app).delete(`/api/libros/${libro._id}`).set("Authorization", `Bearer ${editorToken}`);
      expect(res.status).toBe(409);
      expect(await Libro.findById(libro._id)).not.toBeNull();
    });

    test("id inválido responde 400", async () => {
      const res = await request(app).delete("/api/libros/abc").set("Authorization", `Bearer ${editorToken}`);
      expect(res.status).toBe(400);
    });

    test("libro inexistente responde 404", async () => {
      const res = await request(app).delete(`/api/libros/${idFalso}`).set("Authorization", `Bearer ${editorToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/libros: filtros y paginación", () => {
    test("filtra por colección (regresión del bug de ObjectId en aggregate)", async () => {
      const col = new mongoose.Types.ObjectId();
      await Libro.create(datosLibro({ isbn: "C-1", coleccion: col }));
      await Libro.create(datosLibro({ isbn: "C-2" }));

      const res = await request(app).get(`/api/libros?coleccion=${col}`).set("Authorization", `Bearer ${lectorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.total).toBe(1);
    });

    test("filtra por categoría sin distinguir mayúsculas", async () => {
      await Libro.create(datosLibro({ isbn: "K-1", categoria: "Ciencia" }));
      await Libro.create(datosLibro({ isbn: "K-2", categoria: "Novela" }));

      const res = await request(app).get("/api/libros?categoria=ciencia").set("Authorization", `Bearer ${lectorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    test("una categoría con caracteres de regex no rompe el servidor", async () => {
      const res = await request(app).get("/api/libros?categoria=(").set("Authorization", `Bearer ${lectorToken}`);
      expect(res.status).toBe(200);
    });

    test("el límite se acota entre 1 y 50", async () => {
      const alto = await request(app).get("/api/libros?limit=999").set("Authorization", `Bearer ${lectorToken}`);
      expect(alto.body.pagination.limit).toBe(50);

      const negativo = await request(app).get("/api/libros?limit=-3").set("Authorization", `Bearer ${lectorToken}`);
      expect(negativo.body.pagination.limit).toBe(10);
    });

    test("pagina los resultados", async () => {
      for (let i = 1; i <= 3; i++) await Libro.create(datosLibro({ isbn: `P-${i}`, titulo: `Libro ${i}` }));

      const res = await request(app).get("/api/libros?limit=2&page=2").set("Authorization", `Bearer ${lectorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.pages).toBe(2);
    });
  });
});