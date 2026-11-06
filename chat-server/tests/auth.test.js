require("./setup");
const request = require("supertest");
const app = require("../api/app");
const { createTestUser } = require("./helpers");

describe("Pruebas de Autenticación (/api/auth)", () => {
  describe("POST /api/auth/login", () => {
    test("Debería iniciar sesión correctamente y retornar token JWT sin contraseña", async () => {
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

    test("Debería rechazar contraseña incorrecta con 401", async () => {
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

    test("Debería rechazar correo no registrado con 401", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          correo: "inexistente@biblioteca.com",
          password: "Password123"
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Credenciales inválidas");
    });

    test("Debería rechazar usuarios suspendidos con 403", async () => {
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

    test("Debería responder 400 si faltan campos o el formato de correo es inválido", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          correo: "no-es-correo"
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errores");
    });
  });

  describe("POST /api/auth/register", () => {
    test("Debería registrar un usuario correctamente y no devolver contraseña", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          nombre: "Nuevo Usuario",
          documento: "99887766",
          correo: "nuevo@biblioteca.com",
          password: "Password123",
          rol: "estudiante"
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("message");
      expect(res.body).toHaveProperty("usuario");
      expect(res.body.usuario.nombre).toBe("Nuevo Usuario");
      expect(res.body.usuario.documento).toBe("99887766");
      expect(res.body.usuario.correo).toBe("nuevo@biblioteca.com");
      expect(res.body.usuario.rol).toBe("estudiante");
      expect(res.body.usuario.password).toBeUndefined();
    });

    test("Debería permitir registrarse a través de POST /api/auth/signup", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          nombre: "Usuario Signup",
          documento: "55443322",
          correo: "signup@biblioteca.com",
          password: "Password123"
        });

      expect(res.status).toBe(201);
      expect(res.body.usuario.correo).toBe("signup@biblioteca.com");
      expect(res.body.usuario.rol).toBe("estudiante");
    });

    test("Debería rechazar registro si faltan campos obligatorios con 400", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          nombre: "Sin Correo"
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errores");
    });

    test("Debería rechazar si la contraseña tiene menos de 6 caracteres con 400", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          nombre: "Pass Corto",
          documento: "11223344",
          correo: "corto@biblioteca.com",
          password: "123"
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errores");
    });

    test("Debería rechazar correo duplicado con 409", async () => {
      await createTestUser({
        documento: "10001",
        correo: "duplicado@biblioteca.com"
      });

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          nombre: "Otro Nombre",
          documento: "10002",
          correo: "duplicado@biblioteca.com",
          password: "Password123"
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("correo electrónico ya se encuentra registrado");
    });

    test("Debería rechazar documento duplicado con 409", async () => {
      await createTestUser({
        documento: "99999",
        correo: "primero@biblioteca.com"
      });

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          nombre: "Segundo",
          documento: "99999",
          correo: "segundo@biblioteca.com",
          password: "Password123"
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("documento ya se encuentra registrado");
    });
  });
});
