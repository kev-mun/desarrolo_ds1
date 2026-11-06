require("./setup");
const request = require("supertest");
const app = require("../api/app");
const Usuario = require("../api/models/Usuario");

describe("Seguridad del Registro Público (/api/auth/register)", () => {
  test("registro normal: 201, rol 'estudiante', estado 'activo', sin password en la respuesta", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        nombre: "Lector Uno",
        documento: "DOC-REG-01",
        correo: "lector1@biblioteca.com",
        password: "PasswordSegura123"
      });

    expect(res.status).toBe(201);
    expect(res.body.usuario.nombre).toBe("Lector Uno");
    expect(res.body.usuario.documento).toBe("DOC-REG-01");
    expect(res.body.usuario.correo).toBe("lector1@biblioteca.com");
    expect(res.body.usuario.rol).toBe("estudiante");
    expect(res.body.usuario.estado).toBe("activo");
    expect(res.body.usuario.permisos).toEqual([]);
    expect(res.body.usuario.password).toBeUndefined();

    const enBD = await Usuario.findOne({ documento: "DOC-REG-01" });
    expect(enBD.rol).toBe("estudiante");
    expect(enBD.estado).toBe("activo");
    expect(enBD.permisos).toEqual([]);
  });

  test("con 'rol':'admin' → se crea con rol 'estudiante', NUNCA con rol admin", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        nombre: "Hacker Admin",
        documento: "DOC-HACK-01",
        correo: "hackadmin@biblioteca.com",
        password: "PasswordSegura123",
        rol: "admin"
      });

    expect(res.status).toBe(201);
    expect(res.body.usuario.rol).toBe("estudiante");
    expect(res.body.usuario.rol).not.toBe("admin");

    const enBD = await Usuario.findOne({ documento: "DOC-HACK-01" });
    expect(enBD.rol).toBe("estudiante");
  });

  test("con 'rol':'bibliotecario', 'rol':'profesor' y 'rol':'editorial' → igual, nunca ese rol", async () => {
    const rolesTest = [
      { rol: "bibliotecario", doc: "DOC-HACK-02", email: "hackbiblio@biblioteca.com" },
      { rol: "profesor", doc: "DOC-HACK-03", email: "hackprof@biblioteca.com" },
      { rol: "editorial", doc: "DOC-HACK-04", email: "hackedit@biblioteca.com" }
    ];

    for (const r of rolesTest) {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          nombre: `Hacker ${r.rol}`,
          documento: r.doc,
          correo: r.email,
          password: "PasswordSegura123",
          rol: r.rol
        });

      expect(res.status).toBe(201);
      expect(res.body.usuario.rol).toBe("estudiante");
      expect(res.body.usuario.rol).not.toBe(r.rol);

      const enBD = await Usuario.findOne({ documento: r.doc });
      expect(enBD.rol).toBe("estudiante");
    }
  });

  test("con 'permisos':['gestionar_libros'] y 'estado':'suspendido' → se ignoran (permisos vacíos, estado 'activo')", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        nombre: "Inyector Permisos",
        documento: "DOC-HACK-05",
        correo: "hackpermisos@biblioteca.com",
        password: "PasswordSegura123",
        permisos: ["gestionar_libros", "admin"],
        estado: "suspendido"
      });

    expect(res.status).toBe(201);
    expect(res.body.usuario.estado).toBe("activo");
    expect(res.body.usuario.permisos).toEqual([]);

    const enBD = await Usuario.findOne({ documento: "DOC-HACK-05" });
    expect(enBD.estado).toBe("activo");
    expect(enBD.permisos).toEqual([]);
  });

  test("documento repetido → 409; correo repetido (también con otra capitalización) → 409", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        nombre: "Base",
        documento: "DOC-DUP-01",
        correo: "original@biblioteca.com",
        password: "PasswordSegura123"
      });

    // Documento repetido
    const resDocDup = await request(app)
      .post("/api/auth/register")
      .send({
        nombre: "Otro",
        documento: "DOC-DUP-01",
        correo: "distinto@biblioteca.com",
        password: "PasswordSegura123"
      });
    expect(resDocDup.status).toBe(409);
    expect(resDocDup.body.message).toContain("documento ya se encuentra registrado");

    // Correo repetido exactamente
    const resEmailDup = await request(app)
      .post("/api/auth/register")
      .send({
        nombre: "Otro 2",
        documento: "DOC-DUP-02",
        correo: "original@biblioteca.com",
        password: "PasswordSegura123"
      });
    expect(resEmailDup.status).toBe(409);
    expect(resEmailDup.body.message).toContain("correo electrónico ya se encuentra registrado");

    // Correo repetido con distinta capitalización
    const resEmailCap = await request(app)
      .post("/api/auth/register")
      .send({
        nombre: "Otro 3",
        documento: "DOC-DUP-03",
        correo: "OrIgInAl@BiBlIoTeca.CoM",
        password: "PasswordSegura123"
      });
    expect(resEmailCap.status).toBe(409);
    expect(resEmailCap.body.message).toContain("correo electrónico ya se encuentra registrado");
  });

  test("contraseña de 7 caracteres → 400; sin campos → 400 con el detalle", async () => {
    const res7 = await request(app)
      .post("/api/auth/register")
      .send({
        nombre: "Pass Corta",
        documento: "DOC-PASS-07",
        correo: "pass7@biblioteca.com",
        password: "1234567"
      });
    expect(res7.status).toBe(400);
    expect(JSON.stringify(res7.body)).toContain("La contraseña debe tener al menos 8 caracteres");

    const resVacio = await request(app)
      .post("/api/auth/register")
      .send({});
    expect(resVacio.status).toBe(400);
    expect(resVacio.body).toHaveProperty("errores");
    expect(resVacio.body.errores.length).toBeGreaterThanOrEqual(4);
  });

  test("tras registrarse, el usuario puede iniciar sesión y NO puede entrar al dashboard (403) ni listar usuarios (403)", async () => {
    // 1. Registro
    const resReg = await request(app)
      .post("/api/auth/register")
      .send({
        nombre: "Estudiante Acceso",
        documento: "DOC-ACC-01",
        correo: "acceso@biblioteca.com",
        password: "MiPasswordSegura8"
      });
    expect(resReg.status).toBe(201);

    // 2. Login
    const resLogin = await request(app)
      .post("/api/auth/login")
      .send({
        correo: "acceso@biblioteca.com",
        password: "MiPasswordSegura8"
      });
    expect(resLogin.status).toBe(200);
    const token = resLogin.body.token;
    expect(token).toBeDefined();

    // 3. Intento de acceso a dashboard -> 403
    const resDash = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${token}`);
    expect(resDash.status).toBe(403);

    // 4. Intento de acceso a listar usuarios -> 403
    const resUsers = await request(app)
      .get("/api/usuarios")
      .set("Authorization", `Bearer ${token}`);
    expect(resUsers.status).toBe(403);
  });
});
