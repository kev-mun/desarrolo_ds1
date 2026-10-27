require("./setup");
const request = require("supertest");
const app = require("../api/app");
const Libro = require("../api/models/Libro");
const Ejemplar = require("../api/models/Ejemplar");
const { createTestUser, getTestToken } = require("./helpers");

describe("Pruebas de Ejemplares (/api/ejemplares)", () => {
  let adminToken;
  let estudianteToken;
  let libro;

  beforeEach(async () => {
    const admin = await createTestUser({ rol: "admin" });
    adminToken = getTestToken(admin);

    const estudiante = await createTestUser({ rol: "estudiante" });
    estudianteToken = getTestToken(estudiante);

    libro = await Libro.create({
      titulo: "Libro Base",
      autor: "Autor Base",
      isbn: "978-0-999999-01-0",
      editorial: "Editorial Base",
      anio: 2023,
      categoria: "General"
    });
  });

  test("POST /api/ejemplares - Admin crea ejemplar con éxito", async () => {
    const res = await request(app)
      .post("/api/ejemplares")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        libro: String(libro._id),
        codigoBarras: "BAR-001",
        estado: "disponible",
        ubicacion: "Estante 5"
      });

    expect(res.status).toBe(201);
    expect(res.body.codigoBarras).toBe("BAR-001");
    expect(res.body.estado).toBe("disponible");
  });

  test("POST /api/ejemplares - Responde 409 si el código de barras ya existe", async () => {
    await Ejemplar.create({
      libro: libro._id,
      codigoBarras: "BAR-EXISTE",
      estado: "disponible"
    });

    const res = await request(app)
      .post("/api/ejemplares")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        libro: String(libro._id),
        codigoBarras: "BAR-EXISTE"
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain("código de barras ya se encuentra registrado");
  });

  test("GET /api/ejemplares - Obtiene lista filtrable por libro", async () => {
    await Ejemplar.create([
      { libro: libro._id, codigoBarras: "BAR-A", estado: "disponible" },
      { libro: libro._id, codigoBarras: "BAR-B", estado: "prestado" }
    ]);

    const res = await request(app)
      .get(`/api/ejemplares?libro=${libro._id}`)
      .set("Authorization", `Bearer ${estudianteToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  test("PATCH /api/ejemplares/:id/estado - Actualiza estado de ejemplar", async () => {
    const ej = await Ejemplar.create({
      libro: libro._id,
      codigoBarras: "BAR-CAMBIO",
      estado: "disponible"
    });

    const res = await request(app)
      .patch(`/api/ejemplares/${ej._id}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ estado: "danado" });

    expect(res.status).toBe(200);
    expect(res.body.ejemplar.estado).toBe("danado");
  });

  test("PATCH /api/ejemplares/:id/estado - Rechaza estado no válido con 400", async () => {
    const ej = await Ejemplar.create({
      libro: libro._id,
      codigoBarras: "BAR-INVALIDO",
      estado: "disponible"
    });

    const res = await request(app)
      .patch(`/api/ejemplares/${ej._id}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ estado: "invalido_total" });

    expect(res.status).toBe(400);
  });
});
