require("./setup");
const request = require("supertest");
const app = require("../api/app");
const Libro = require("../api/models/Libro");
const Ejemplar = require("../api/models/Ejemplar");
const { createTestUser, getTestToken } = require("./helpers");

describe("Pruebas de Libros y Permisos de Editorial (/api/libros)", () => {
  let adminToken;
  let editorialConPermisoToken;
  let editorialSinPermisoToken;
  let estudianteToken;

  beforeEach(async () => {
    const admin = await createTestUser({ rol: "admin" });
    adminToken = getTestToken(admin);

    const editCon = await createTestUser({
      rol: "editorial",
      permisos: ["gestionar_libros"]
    });
    editorialConPermisoToken = getTestToken(editCon);

    const editSin = await createTestUser({
      rol: "editorial",
      permisos: []
    });
    editorialSinPermisoToken = getTestToken(editSin);

    const estudiante = await createTestUser({ rol: "estudiante" });
    estudianteToken = getTestToken(estudiante);
  });

  test("POST /api/libros - Editorial con permiso 'gestionar_libros' puede registrar libro con éxito", async () => {
    const res = await request(app)
      .post("/api/libros")
      .set("Authorization", `Bearer ${editorialConPermisoToken}`)
      .send({
        titulo: "El Aleph",
        autor: "Jorge Luis Borges",
        isbn: "978-84-206-3311-0",
        editorial: "Sur",
        anio: 1949,
        categoria: "Ficción"
      });

    expect(res.status).toBe(201);
    expect(res.body.titulo).toBe("El Aleph");
    expect(res.body.isbn).toBe("978-84-206-3311-0");
  });

  test("POST /api/libros - Editorial sin permiso 'gestionar_libros' recibe 403 'No cuenta con los permisos necesarios'", async () => {
    const res = await request(app)
      .post("/api/libros")
      .set("Authorization", `Bearer ${editorialSinPermisoToken}`)
      .send({
        titulo: "Libro No Permitido",
        autor: "Autor Desconocido",
        isbn: "978-0-000000-00-0",
        editorial: "Editorial X",
        anio: 2024,
        categoria: "General"
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("No cuenta con los permisos necesarios");
  });

  test("POST /api/libros - Estudiante recibe 403 'No cuenta con los permisos necesarios'", async () => {
    const res = await request(app)
      .post("/api/libros")
      .set("Authorization", `Bearer ${estudianteToken}`)
      .send({
        titulo: "Intento Estudiante",
        autor: "Autor",
        isbn: "978-1-111111-11-1",
        editorial: "Editorial",
        anio: 2024,
        categoria: "General"
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("No cuenta con los permisos necesarios");
  });

  test("POST /api/libros - Responde 409 si el ISBN ya existe", async () => {
    await Libro.create({
      titulo: "Existente",
      autor: "Autor",
      isbn: "978-99-9999-999-9",
      editorial: "Editorial",
      anio: 2021,
      categoria: "General"
    });

    const res = await request(app)
      .post("/api/libros")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        titulo: "Duplicado",
        autor: "Otro Autor",
        isbn: "978-99-9999-999-9",
        editorial: "Editorial",
        anio: 2022,
        categoria: "General"
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain("ISBN");
  });

  test("GET /api/libros - Devuelve ejemplaresTotales y ejemplaresDisponibles por libro", async () => {
    const libro = await Libro.create({
      titulo: "Libro Con Ejemplares",
      autor: "Autor Famoso",
      isbn: "978-12-3456-789-0",
      editorial: "Editorial A",
      anio: 2023,
      categoria: "Tecnología"
    });

    await Ejemplar.create([
      { libro: libro._id, codigoBarras: "EJ-TEST-01", estado: "disponible" },
      { libro: libro._id, codigoBarras: "EJ-TEST-02", estado: "disponible" },
      { libro: libro._id, codigoBarras: "EJ-TEST-03", estado: "prestado" }
    ]);

    const res = await request(app)
      .get("/api/libros?q=Famoso")
      .set("Authorization", `Bearer ${estudianteToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].ejemplaresTotales).toBe(3);
    expect(res.body.data[0].ejemplaresDisponibles).toBe(2);
  });

  test("GET /api/libros/:id - Incluye lista de ejemplares asociados", async () => {
    const libro = await Libro.create({
      titulo: "Libro Detalle",
      autor: "Autor Detalle",
      isbn: "978-77-7777-777-7",
      editorial: "Editorial B",
      anio: 2022,
      categoria: "Historia"
    });

    await Ejemplar.create({
      libro: libro._id,
      codigoBarras: "EJ-DET-01",
      estado: "disponible"
    });

    const res = await request(app)
      .get(`/api/libros/${libro._id}`)
      .set("Authorization", `Bearer ${estudianteToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ejemplares");
    expect(res.body.ejemplares.length).toBe(1);
    expect(res.body.ejemplares[0].codigoBarras).toBe("EJ-DET-01");
  });
});
