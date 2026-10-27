require("./setup");
const request = require("supertest");
const app = require("../api/app");
const { createTestUser } = require("./helpers");

describe("Pruebas de Autenticación (/api/auth)", () => {
  test("POST /api/auth/login - Debería iniciar sesión correctamente y retornar token JWT sin contraseña", async () => {
    const user = await createTestUser({
      correo: "test@biblioteca.com",
      password: "Password123"
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        correo: "test@biblioteca.com",
        password: "Password123"
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("usuario");
    expect(res.body.usuario.correo).toBe("test@biblioteca.com");
    expect(res.body.usuario.password).toBeUndefined();
  });

  test("POST /api/auth/login - Debería rechazar contraseña incorrecta con 401", async () => {
    await createTestUser({
      correo: "test@biblioteca.com",
      password: "Password123"
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        correo: "test@biblioteca.com",
        password: "WrongPassword"
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Credenciales inválidas");
  });

  test("POST /api/auth/login - Debería rechazar correo no registrado con 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        correo: "inexistente@biblioteca.com",
        password: "Password123"
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Credenciales inválidas");
  });

  test("POST /api/auth/login - Debería rechazar usuarios suspendidos con 403", async () => {
    await createTestUser({
      correo: "suspendido@biblioteca.com",
      password: "Password123",
      estado: "suspendido"
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        correo: "suspendido@biblioteca.com",
        password: "Password123"
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("Usuario suspendido");
  });

  test("POST /api/auth/login - Debería responder 400 si faltan campos o el formato de correo es inválido", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        correo: "no-es-correo"
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("errores");
  });
});
