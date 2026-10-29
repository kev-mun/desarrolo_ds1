require("./setup");
const request = require("supertest");
const app = require("../api/app");
const { createTestUser, getTestToken } = require("./helpers");

const idFalso = "60c72b2f9b1d8b2bad8e9999";

describe("Usuarios: cobertura completa", () => {
  let admin, adminToken, bibToken, lectorToken;

  beforeEach(async () => {
    admin = await createTestUser({ rol: "admin" });
    adminToken = getTestToken(admin);
    bibToken = getTestToken(await createTestUser({ rol: "bibliotecario" }));
    lectorToken = getTestToken(await createTestUser({ rol: "estudiante" }));
  });

  describe("GET /api/usuarios", () => {
    test("lista con paginación", async () => {
      const res = await request(app).get("/api/usuarios?limit=2&page=1").set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.pages).toBe(2);
    });

    test("filtra por rol", async () => {
      const res = await request(app).get("/api/usuarios?rol=estudiante").set("Authorization", `Bearer ${adminToken}`);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].rol).toBe("estudiante");
    });

    test("filtra por estado", async () => {
      await createTestUser({ rol: "estudiante", estado: "suspendido" });
      const res = await request(app).get("/api/usuarios?estado=suspendido").set("Authorization", `Bearer ${adminToken}`);
      expect(res.body.data.length).toBe(1);
    });

    test("rol y estado desconocidos se ignoran; el límite se acota", async () => {
      const res = await request(app).get("/api/usuarios?rol=inventado&estado=raro&limit=999").set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(50);
      expect(res.body.pagination.total).toBe(3);
    });

    test("un límite no válido vuelve a 10", async () => {
      const res = await request(app).get("/api/usuarios?limit=-4").set("Authorization", `Bearer ${adminToken}`);
      expect(res.body.pagination.limit).toBe(10);
    });

    test("un estudiante no puede listar usuarios", async () => {
      const res = await request(app).get("/api/usuarios").set("Authorization", `Bearer ${lectorToken}`);
      expect(res.status).toBe(403);
    });

    test("la respuesta no incluye contraseñas", async () => {
      const res = await request(app).get("/api/usuarios").set("Authorization", `Bearer ${adminToken}`);
      expect(JSON.stringify(res.body)).not.toContain("password");
    });
  });

  describe("GET /api/usuarios/:id", () => {
    test("devuelve el usuario", async () => {
      const res = await request(app).get(`/api/usuarios/${admin._id}`).set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.correo).toBe(admin.correo);
      expect(res.body.password).toBeUndefined();
    });

    test("id inválido responde 400", async () => {
      const res = await request(app).get("/api/usuarios/abc").set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    test("usuario inexistente responde 404", async () => {
      const res = await request(app).get(`/api/usuarios/${idFalso}`).set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/usuarios", () => {
    const datos = (extra = {}) => ({
      nombre: "Nuevo Usuario",
      documento: "DOC-NUEVO-1",
      correo: "Nuevo@Test.com",
      password: "Password123",
      rol: "estudiante",
      ...extra
    });

    test("crea un usuario, normaliza el correo y no devuelve la contraseña", async () => {
      const res = await request(app).post("/api/usuarios").set("Authorization", `Bearer ${bibToken}`).send(datos());
      expect(res.status).toBe(201);
      expect(res.body.correo).toBe("nuevo@test.com");
      expect(res.body.estado).toBe("activo");
      expect(res.body.password).toBeUndefined();
    });

    test("acepta estado y permisos", async () => {
      const res = await request(app).post("/api/usuarios").set("Authorization", `Bearer ${adminToken}`)
        .send(datos({ rol: "editorial", estado: "suspendido", permisos: ["gestionar_libros"] }));
      expect(res.status).toBe(201);
      expect(res.body.estado).toBe("suspendido");
      expect(res.body.permisos).toEqual(["gestionar_libros"]);
    });

    test("campos faltantes responden 400 con detalle", async () => {
      const res = await request(app).post("/api/usuarios").set("Authorization", `Bearer ${bibToken}`).send({ nombre: "Solo nombre" });
      expect(res.status).toBe(400);
      expect(res.body.camposFaltantes).toContain("correo");
      expect(res.body.errores.length).toBeGreaterThan(0);
    });

    test("rol inválido responde 400", async () => {
      const res = await request(app).post("/api/usuarios").set("Authorization", `Bearer ${bibToken}`).send(datos({ rol: "superheroe" }));
      expect(res.status).toBe(400);
    });

    test("documento duplicado responde 409", async () => {
      await request(app).post("/api/usuarios").set("Authorization", `Bearer ${bibToken}`).send(datos());
      const res = await request(app).post("/api/usuarios").set("Authorization", `Bearer ${bibToken}`).send(datos({ correo: "otro@test.com" }));
      expect(res.status).toBe(409);
    });

    test("correo duplicado responde 409", async () => {
      await request(app).post("/api/usuarios").set("Authorization", `Bearer ${bibToken}`).send(datos());
      const res = await request(app).post("/api/usuarios").set("Authorization", `Bearer ${bibToken}`).send(datos({ documento: "DOC-NUEVO-2" }));
      expect(res.status).toBe(409);
    });

    test("un estudiante no puede crear usuarios", async () => {
      const res = await request(app).post("/api/usuarios").set("Authorization", `Bearer ${lectorToken}`).send(datos());
      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/usuarios/:id", () => {
    let objetivo;
    beforeEach(async () => {
      objetivo = await createTestUser({ rol: "estudiante", documento: "DOC-OBJ", correo: "objetivo@test.com" });
    });

    test("actualiza nombre, documento, correo, rol, estado y permisos", async () => {
      const res = await request(app).put(`/api/usuarios/${objetivo._id}`).set("Authorization", `Bearer ${adminToken}`).send({
        nombre: "  Nombre Nuevo ",
        documento: "DOC-OBJ-2",
        correo: "Cambiado@Test.com",
        rol: "profesor",
        estado: "suspendido",
        permisos: ["algo"]
      });
      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe("Nombre Nuevo");
      expect(res.body.documento).toBe("DOC-OBJ-2");
      expect(res.body.correo).toBe("cambiado@test.com");
      expect(res.body.rol).toBe("profesor");
      expect(res.body.estado).toBe("suspendido");
      expect(res.body.password).toBeUndefined();
    });

    test("cambiar la contraseña permite iniciar sesión con la nueva", async () => {
      await request(app).put(`/api/usuarios/${objetivo._id}`).set("Authorization", `Bearer ${adminToken}`).send({ password: "NuevaClave456" });
      const login = await request(app).post("/api/auth/login").send({ correo: "objetivo@test.com", password: "NuevaClave456" });
      expect(login.status).toBe(200);
      expect(login.body.token).toBeTruthy();
    });

    test("documento ya registrado responde 409", async () => {
      const res = await request(app).put(`/api/usuarios/${objetivo._id}`).set("Authorization", `Bearer ${adminToken}`).send({ documento: admin.documento });
      expect(res.status).toBe(409);
    });

    test("correo ya registrado responde 409", async () => {
      const res = await request(app).put(`/api/usuarios/${objetivo._id}`).set("Authorization", `Bearer ${adminToken}`).send({ correo: admin.correo });
      expect(res.status).toBe(409);
    });

    test("rol inválido responde 400", async () => {
      const res = await request(app).put(`/api/usuarios/${objetivo._id}`).set("Authorization", `Bearer ${adminToken}`).send({ rol: "superheroe" });
      expect(res.status).toBe(400);
    });

    test("estado inválido responde 400", async () => {
      const res = await request(app).put(`/api/usuarios/${objetivo._id}`).set("Authorization", `Bearer ${adminToken}`).send({ estado: "raro" });
      expect(res.status).toBe(400);
    });

    test("id inválido responde 400", async () => {
      const res = await request(app).put("/api/usuarios/abc").set("Authorization", `Bearer ${adminToken}`).send({ nombre: "X" });
      expect(res.status).toBe(400);
    });

    test("usuario inexistente responde 404", async () => {
      const res = await request(app).put(`/api/usuarios/${idFalso}`).set("Authorization", `Bearer ${adminToken}`).send({ nombre: "X" });
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/usuarios/:id/estado", () => {
    test("suspende a un usuario y luego no puede iniciar sesión", async () => {
      const u = await createTestUser({ rol: "estudiante", correo: "susp@test.com", password: "Password123" });
      const res = await request(app).patch(`/api/usuarios/${u._id}/estado`).set("Authorization", `Bearer ${bibToken}`).send({ estado: "suspendido" });
      expect(res.status).toBe(200);
      expect(res.body.usuario.estado).toBe("suspendido");

      const login = await request(app).post("/api/auth/login").send({ correo: "susp@test.com", password: "Password123" });
      expect(login.status).toBe(403);
    });

    test("estado inválido responde 400", async () => {
      const res = await request(app).patch(`/api/usuarios/${admin._id}/estado`).set("Authorization", `Bearer ${adminToken}`).send({ estado: "raro" });
      expect(res.status).toBe(400);
    });

    test("sin estado responde 400", async () => {
      const res = await request(app).patch(`/api/usuarios/${admin._id}/estado`).set("Authorization", `Bearer ${adminToken}`).send({});
      expect(res.status).toBe(400);
    });

    test("id inválido responde 400", async () => {
      const res = await request(app).patch("/api/usuarios/abc/estado").set("Authorization", `Bearer ${adminToken}`).send({ estado: "activo" });
      expect(res.status).toBe(400);
    });

    test("usuario inexistente responde 404", async () => {
      const res = await request(app).patch(`/api/usuarios/${idFalso}/estado`).set("Authorization", `Bearer ${adminToken}`).send({ estado: "activo" });
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/usuarios/:id/permisos", () => {
    test("el admin asigna permisos", async () => {
      const ed = await createTestUser({ rol: "editorial" });
      const res = await request(app).put(`/api/usuarios/${ed._id}/permisos`).set("Authorization", `Bearer ${adminToken}`).send({ permisos: ["gestionar_libros"] });
      expect(res.status).toBe(200);
      expect(res.body.usuario.permisos).toEqual(["gestionar_libros"]);
    });

    test("permisos que no son un arreglo responden 400", async () => {
      const res = await request(app).put(`/api/usuarios/${admin._id}/permisos`).set("Authorization", `Bearer ${adminToken}`).send({ permisos: "gestionar_libros" });
      expect(res.status).toBe(400);
    });

    test("id inválido responde 400", async () => {
      const res = await request(app).put("/api/usuarios/abc/permisos").set("Authorization", `Bearer ${adminToken}`).send({ permisos: [] });
      expect(res.status).toBe(400);
    });

    test("usuario inexistente responde 404", async () => {
      const res = await request(app).put(`/api/usuarios/${idFalso}/permisos`).set("Authorization", `Bearer ${adminToken}`).send({ permisos: [] });
      expect(res.status).toBe(404);
    });

    test("el bibliotecario no puede asignar permisos (solo admin)", async () => {
      const res = await request(app).put(`/api/usuarios/${admin._id}/permisos`).set("Authorization", `Bearer ${bibToken}`).send({ permisos: [] });
      expect(res.status).toBe(403);
    });
  });
});
