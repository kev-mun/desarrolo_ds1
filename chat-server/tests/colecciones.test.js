require("./setup");
const request = require("supertest");
const app = require("../api/app");
const Coleccion = require("../api/models/Coleccion");
const Libro = require("../api/models/Libro");
const { createTestUser, getTestToken } = require("./helpers");

describe("Pruebas de Colecciones (/api/colecciones)", () => {
  let adminToken;
  let estudianteToken;

  beforeEach(async () => {
    const admin = await createTestUser({ rol: "admin" });
    adminToken = getTestToken(admin);

    const estudiante = await createTestUser({ rol: "estudiante" });
    estudianteToken = getTestToken(estudiante);
  });

  test("GET /api/colecciones/:id/libros - Responde mensaje amigable cuando no existen libros en la colección", async () => {
    const coleccionVacia = await Coleccion.create({
      nombre: "Colección Sin Libros",
      descripcion: "Colección recién creada sin obras"
    });

    const res = await request(app)
      .get(`/api/colecciones/${coleccionVacia._id}/libros`)
      .set("Authorization", `Bearer ${estudianteToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.message).toBe("No existen libros disponibles en esta colección");
  });

  test("GET /api/colecciones/:id/libros - Devuelve libros cuando existen en la colección", async () => {
    const coleccion = await Coleccion.create({
      nombre: "Colección Con Libros"
    });

    await Libro.create({
      titulo: "Libro en Colección",
      autor: "Autor Test",
      isbn: "978-0-123456-01-1",
      editorial: "Editorial Test",
      anio: 2024,
      categoria: "Ensayo",
      coleccion: coleccion._id
    });

    const res = await request(app)
      .get(`/api/colecciones/${coleccion._id}/libros`)
      .set("Authorization", `Bearer ${estudianteToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].titulo).toBe("Libro en Colección");
  });

  test("GET /api/colecciones - Incluye cantidadLibros", async () => {
    const col = await Coleccion.create({ nombre: "Col A" });
    await Libro.create({
      titulo: "Libro 1",
      autor: "Autor 1",
      isbn: "978-0-111111-01-1",
      editorial: "Editorial 1",
      anio: 2020,
      categoria: "Novela",
      coleccion: col._id
    });

    const res = await request(app)
      .get("/api/colecciones")
      .set("Authorization", `Bearer ${estudianteToken}`);

    expect(res.status).toBe(200);
    const found = res.body.data.find((c) => c.nombre === "Col A");
    expect(found).toBeDefined();
    expect(found.cantidadLibros).toBe(1);
  });

  test("POST /api/colecciones - Rechaza duplicados con 409", async () => {
    await Coleccion.create({ nombre: "Colección Existente" });

    const res = await request(app)
      .post("/api/colecciones")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Colección Existente" });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain("Ya existe una colección con este nombre");
  });
});
