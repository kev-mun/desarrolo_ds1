require("./setup");
const request = require("supertest");
const app = require("../api/app");
const Libro = require("../api/models/Libro");
const Ejemplar = require("../api/models/Ejemplar");
const Prestamo = require("../api/models/Prestamo");
const { createTestUser, getTestToken } = require("./helpers");

describe("Préstamos: usuario desde el token y devolución", () => {
  let estudiante, estudianteToken;
  let profesor, profesorToken;
  let bibliotecario, bibliotecarioToken;
  let admin, adminToken;
  let otro;
  let libro, ej1, ej2;

  beforeEach(async () => {
    estudiante = await createTestUser({ rol: "estudiante" });
    profesor = await createTestUser({ rol: "profesor" });
    bibliotecario = await createTestUser({ rol: "bibliotecario" });
    admin = await createTestUser({ rol: "admin" });
    otro = await createTestUser({ rol: "estudiante" });

    estudianteToken = getTestToken(estudiante);
    profesorToken = getTestToken(profesor);
    bibliotecarioToken = getTestToken(bibliotecario);
    adminToken = getTestToken(admin);

    libro = await Libro.create({
      titulo: "Cien años de soledad",
      autor: "García Márquez",
      isbn: "978-0-00-000000-1",
      editorial: "Sudamericana",
      anio: 1967,
      categoria: "Novela"
    });
    ej1 = await Ejemplar.create({ libro: libro._id, codigoBarras: "DEV-01", estado: "disponible", ubicacion: "E1" });
    ej2 = await Ejemplar.create({ libro: libro._id, codigoBarras: "DEV-02", estado: "disponible", ubicacion: "E1" });
  });

  describe("POST /api/prestamos: el usuario sale del token para lectores", () => {
    test("estudiante que manda el id de otro queda como titular del préstamo", async () => {
      const res = await request(app)
        .post("/api/prestamos")
        .set("Authorization", `Bearer ${estudianteToken}`)
        .send({ ejemplar: String(ej1._id), usuario: String(otro._id) });

      expect(res.status).toBe(201);
      expect(String(res.body.usuario)).toBe(String(estudiante._id));
      expect(String(res.body.usuario)).not.toBe(String(otro._id));
    });

    test("estudiante puede pedir préstamo sin enviar usuario", async () => {
      const res = await request(app)
        .post("/api/prestamos")
        .set("Authorization", `Bearer ${estudianteToken}`)
        .send({ ejemplar: String(ej1._id) });

      expect(res.status).toBe(201);
      expect(String(res.body.usuario)).toBe(String(estudiante._id));
    });

    test("profesor también queda como titular del préstamo", async () => {
      const res = await request(app)
        .post("/api/prestamos")
        .set("Authorization", `Bearer ${profesorToken}`)
        .send({ ejemplar: String(ej1._id), usuario: String(otro._id) });

      expect(res.status).toBe(201);
      expect(String(res.body.usuario)).toBe(String(profesor._id));
    });

    test("bibliotecario puede registrar el préstamo a nombre de otro usuario", async () => {
      const res = await request(app)
        .post("/api/prestamos")
        .set("Authorization", `Bearer ${bibliotecarioToken}`)
        .send({ ejemplar: String(ej1._id), usuario: String(otro._id) });

      expect(res.status).toBe(201);
      expect(String(res.body.usuario)).toBe(String(otro._id));
    });

    test("bibliotecario sin indicar usuario recibe 400", async () => {
      const res = await request(app)
        .post("/api/prestamos")
        .set("Authorization", `Bearer ${bibliotecarioToken}`)
        .send({ ejemplar: String(ej1._id) });

      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.errores)).toBe(true);
    });

    test("sin ejemplar responde 400", async () => {
      const res = await request(app)
        .post("/api/prestamos")
        .set("Authorization", `Bearer ${estudianteToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    test("identificador de ejemplar inválido responde 400", async () => {
      const res = await request(app)
        .post("/api/prestamos")
        .set("Authorization", `Bearer ${estudianteToken}`)
        .send({ ejemplar: "no-es-un-id" });

      expect(res.status).toBe(400);
    });

    test("sin token responde 401", async () => {
      const res = await request(app)
        .post("/api/prestamos")
        .send({ ejemplar: String(ej1._id) });

      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/prestamos/:id/devolver", () => {
    let prestamo;

    beforeEach(async () => {
      await Ejemplar.findByIdAndUpdate(ej1._id, { estado: "prestado" });
      prestamo = await Prestamo.create({
        ejemplar: ej1._id,
        usuario: estudiante._id,
        fechaVencEsperada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    });

    test("el estudiante no puede registrar devoluciones (403)", async () => {
      const res = await request(app)
        .patch(`/api/prestamos/${prestamo._id}/devolver`)
        .set("Authorization", `Bearer ${estudianteToken}`);

      expect(res.status).toBe(403);
      const db = await Prestamo.findById(prestamo._id);
      expect(db.estado).toBe("activo");
    });

    test("sin token responde 401", async () => {
      const res = await request(app).patch(`/api/prestamos/${prestamo._id}/devolver`);
      expect(res.status).toBe(401);
    });

    test("el bibliotecario devuelve: estado devuelto, fecha real y ejemplar disponible", async () => {
      const res = await request(app)
        .patch(`/api/prestamos/${prestamo._id}/devolver`)
        .set("Authorization", `Bearer ${bibliotecarioToken}`);

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe("devuelto");
      expect(res.body.fechaDevolucionReal).toBeTruthy();

      const ejemplarDB = await Ejemplar.findById(ej1._id);
      expect(ejemplarDB.estado).toBe("disponible");
    });

    test("el admin también puede devolver", async () => {
      const res = await request(app)
        .patch(`/api/prestamos/${prestamo._id}/devolver`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe("devuelto");
    });

    test("devolver dos veces responde 409", async () => {
      await request(app)
        .patch(`/api/prestamos/${prestamo._id}/devolver`)
        .set("Authorization", `Bearer ${bibliotecarioToken}`);

      const res = await request(app)
        .patch(`/api/prestamos/${prestamo._id}/devolver`)
        .set("Authorization", `Bearer ${bibliotecarioToken}`);

      expect(res.status).toBe(409);
    });

    test("un préstamo vencido también se puede devolver", async () => {
      await Prestamo.findByIdAndUpdate(prestamo._id, { estado: "vencido" });

      const res = await request(app)
        .patch(`/api/prestamos/${prestamo._id}/devolver`)
        .set("Authorization", `Bearer ${bibliotecarioToken}`);

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe("devuelto");
    });

    test("id con formato inválido responde 400", async () => {
      const res = await request(app)
        .patch("/api/prestamos/abc/devolver")
        .set("Authorization", `Bearer ${bibliotecarioToken}`);

      expect(res.status).toBe(400);
    });

    test("id válido que no existe responde 404", async () => {
      const res = await request(app)
        .patch("/api/prestamos/60c72b2f9b1d8b2bad8e9999/devolver")
        .set("Authorization", `Bearer ${bibliotecarioToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/prestamos: filtros", () => {
    beforeEach(async () => {
      await Prestamo.create({
        ejemplar: ej1._id,
        usuario: estudiante._id,
        fechaVencEsperada: new Date(),
        estado: "activo"
      });
      await Prestamo.create({
        ejemplar: ej2._id,
        usuario: otro._id,
        fechaVencEsperada: new Date(),
        estado: "devuelto"
      });
    });

    test("el personal ve todos los préstamos", async () => {
      const res = await request(app)
        .get("/api/prestamos")
        .set("Authorization", `Bearer ${bibliotecarioToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.count).toBe(2);
    });

    test("el personal puede filtrar por estado", async () => {
      const res = await request(app)
        .get("/api/prestamos?estado=devuelto")
        .set("Authorization", `Bearer ${bibliotecarioToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].estado).toBe("devuelto");
    });

    test("el personal puede filtrar por usuario", async () => {
      const res = await request(app)
        .get(`/api/prestamos?usuario=${otro._id}`)
        .set("Authorization", `Bearer ${bibliotecarioToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(String(res.body.data[0].usuario._id)).toBe(String(otro._id));
    });

    test("filtro por usuario con id inválido responde 400", async () => {
      const res = await request(app)
        .get("/api/prestamos?usuario=xyz")
        .set("Authorization", `Bearer ${bibliotecarioToken}`);

      expect(res.status).toBe(400);
    });

    test("un estudiante no puede ver préstamos ajenos aunque pida el filtro de otro usuario", async () => {
      const res = await request(app)
        .get(`/api/prestamos?usuario=${otro._id}`)
        .set("Authorization", `Bearer ${estudianteToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(String(res.body.data[0].usuario._id)).toBe(String(estudiante._id));
    });
  });
});