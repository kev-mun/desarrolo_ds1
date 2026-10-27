require("./setup");
const request = require("supertest");
const app = require("../api/app");
const { createTestUser, getTestToken } = require("./helpers");

describe("Pruebas de Usuarios (/api/usuarios)", () => {
  let adminToken;
  let bibliotecarioToken;
  let estudianteToken;

  beforeEach(async () => {
    const admin = await createTestUser({
      correo: "admin@test.com",
      documento: "11111111",
      rol: "admin"
    });
    adminToken = getTestToken(admin);

    const bibliotecario = await createTestUser({
      correo: "biblio@test.com",
      documento: "22222222",
      rol: "bibliotecario"
    });
    bibliotecarioToken = getTestToken(bibliotecario);

    const estudiante = await createTestUser({
      correo: "estudiante@test.com",
      documento: "33333333",
      rol: "estudiante"
    });
    estudianteToken = getTestToken(estudiante);
  });

  test("POST /api/usuarios - Éxito al crear usuario por admin", async () => {
    const res = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        nombre: "Nuevo Lector",
        documento: "55555555",
        correo: "lector@test.com",
        password: "Password123",
        rol: "estudiante"
      });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("Nuevo Lector");
    expect(res.body.documento).toBe("55555555");
    expect(res.body.correo).toBe("lector@test.com");
    expect(res.body.password).toBeUndefined();
  });

  test("POST /api/usuarios - Responde 400 con lista de camposFaltantes si faltan campos obligatorios", async () => {
    const res = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        nombre: "Incompleto"
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Datos inválidos");
    expect(Array.isArray(res.body.camposFaltantes)).toBe(true);
    expect(res.body.camposFaltantes).toContain("documento");
    expect(res.body.camposFaltantes).toContain("correo");
    expect(res.body.camposFaltantes).toContain("password");
    expect(res.body.camposFaltantes).toContain("rol");
  });

  test("POST /api/usuarios - Responde 409 si el documento ya existe", async () => {
    const res = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        nombre: "Duplicado Doc",
        documento: "11111111", // Mismo del admin
        correo: "otro@test.com",
        password: "Password123",
        rol: "estudiante"
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain("documento ya se encuentra registrado");
  });

  test("POST /api/usuarios - Responde 409 si el correo ya existe", async () => {
    const res = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        nombre: "Duplicado Correo",
        documento: "99999999",
        correo: "admin@test.com", // Mismo del admin
        password: "Password123",
        rol: "profesor"
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain("correo electrónico ya se encuentra registrado");
  });

  test("POST /api/usuarios - Rechaza creación por estudiante con 403", async () => {
    const res = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${estudianteToken}`)
      .send({
        nombre: "No permitido",
        documento: "88888888",
        correo: "nopermitido@test.com",
        password: "Password123",
        rol: "estudiante"
      });

    expect(res.status).toBe(403);
  });

  test("GET /api/usuarios - Devuelve lista paginada de usuarios", async () => {
    const res = await request(app)
      .get("/api/usuarios?page=1&limit=2")
      .set("Authorization", `Bearer ${bibliotecarioToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("pagination");
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(2);
  });

  test("PATCH /api/usuarios/:id/estado - Actualiza estado a suspendido y luego a activo", async () => {
    const estudiante = await createTestUser({
      correo: "a_suspender@test.com",
      documento: "44444444",
      estado: "activo"
    });

    const resSuspender = await request(app)
      .patch(`/api/usuarios/${estudiante._id}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ estado: "suspendido" });

    expect(resSuspender.status).toBe(200);
    expect(resSuspender.body.usuario.estado).toBe("suspendido");

    const resActivar = await request(app)
      .patch(`/api/usuarios/${estudiante._id}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ estado: "activo" });

    expect(resActivar.status).toBe(200);
    expect(resActivar.body.usuario.estado).toBe("activo");
  });

  test("PUT /api/usuarios/:id/permisos - Solo admin puede modificar permisos de editorial", async () => {
    const editorial = await createTestUser({
      correo: "editorial@test.com",
      documento: "77777777",
      rol: "editorial",
      permisos: []
    });

    // Intento con bibliotecario -> 403
    const resBiblio = await request(app)
      .put(`/api/usuarios/${editorial._id}/permisos`)
      .set("Authorization", `Bearer ${bibliotecarioToken}`)
      .send({ permisos: ["gestionar_libros"] });

    expect(resBiblio.status).toBe(403);

    // Intento con admin -> 200
    const resAdmin = await request(app)
      .put(`/api/usuarios/${editorial._id}/permisos`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ permisos: ["gestionar_libros", "ver_reportes"] });

    expect(resAdmin.status).toBe(200);
    expect(resAdmin.body.usuario.permisos).toContain("gestionar_libros");
    expect(resAdmin.body.usuario.permisos).toContain("ver_reportes");
  });
});
