require("./setup");
const request = require("supertest");
const app = require("../api/app");
const Libro = require("../api/models/Libro");
const Ejemplar = require("../api/models/Ejemplar");
const Prestamo = require("../api/models/Prestamo");
const { createTestUser, getTestToken } = require("./helpers");

describe("Pruebas de Préstamos (/api/prestamos)", () => {
  let adminToken;
  let estudianteActivo;
  let estudianteActivoToken;
  let estudianteSuspendido;
  let libro;
  let ejemplarDisponible;
  let ejemplarPrestado;

  beforeEach(async () => {
    const admin = await createTestUser({ rol: "admin" });
    adminToken = getTestToken(admin);

    estudianteActivo = await createTestUser({
      rol: "estudiante",
      estado: "activo",
      correo: "activo@test.com",
      documento: "12345001"
    });
    estudianteActivoToken = getTestToken(estudianteActivo);

    estudianteSuspendido = await createTestUser({
      rol: "estudiante",
      estado: "suspendido",
      correo: "suspendido@test.com",
      documento: "12345002"
    });

    libro = await Libro.create({
      titulo: "El Quijote",
      autor: "Cervantes",
      isbn: "978-84-241-0000-1",
      editorial: "Castalia",
      anio: 1605,
      categoria: "Clásico"
    });

    ejemplarDisponible = await Ejemplar.create({
      libro: libro._id,
      codigoBarras: "EJ-DISP-01",
      estado: "disponible",
      ubicacion: "Estante 1"
    });

    ejemplarPrestado = await Ejemplar.create({
      libro: libro._id,
      codigoBarras: "EJ-NO-DISP",
      estado: "prestado",
      ubicacion: "Estante 2"
    });
  });

  test("POST /api/prestamos - Éxito al crear préstamo: pasa a prestado y calcula 7 días de vencimiento", async () => {
    const res = await request(app)
      .post("/api/prestamos")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        ejemplar: String(ejemplarDisponible._id),
        usuario: String(estudianteActivo._id)
      });

    expect(res.status).toBe(201);
    expect(res.body.estado).toBe("activo");
    expect(res.body.ejemplar).toBe(String(ejemplarDisponible._id));
    expect(res.body.usuario).toBe(String(estudianteActivo._id));

    // Verificar plazo de 7 días
    const fechaPrestamo = new Date(res.body.fechaPrestamo);
    const fechaVenc = new Date(res.body.fechaVencEsperada);
    const diffDias = Math.round((fechaVenc - fechaPrestamo) / (1000 * 60 * 60 * 24));
    expect(diffDias).toBe(7);

    // Verificar que el ejemplar pasó a prestado atómicamente en la base de datos
    const ejemplarDB = await Ejemplar.findById(ejemplarDisponible._id);
    expect(ejemplarDB.estado).toBe("prestado");
  });

  test("POST /api/prestamos - Rechaza préstamo si el ejemplar NO está disponible con 400", async () => {
    const res = await request(app)
      .post("/api/prestamos")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        ejemplar: String(ejemplarPrestado._id),
        usuario: String(estudianteActivo._id)
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("El ejemplar no está disponible para préstamo");
  });

  test("POST /api/prestamos - Rechaza préstamo si el usuario está suspendido con 400", async () => {
    const res = await request(app)
      .post("/api/prestamos")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        ejemplar: String(ejemplarDisponible._id),
        usuario: String(estudianteSuspendido._id)
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("suspendido");

    // El ejemplar debe seguir disponible
    const ejemplarDB = await Ejemplar.findById(ejemplarDisponible._id);
    expect(ejemplarDB.estado).toBe("disponible");
  });

  test("POST /api/prestamos - Responde 404 si el ejemplar no existe", async () => {
    const fakeId = "60c72b2f9b1d8b2bad8e9999";
    const res = await request(app)
      .post("/api/prestamos")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        ejemplar: fakeId,
        usuario: String(estudianteActivo._id)
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Ejemplar no encontrado");
  });

  test("POST /api/prestamos - Responde 404 si el usuario no existe", async () => {
    const fakeId = "60c72b2f9b1d8b2bad8e9999";
    const res = await request(app)
      .post("/api/prestamos")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        ejemplar: String(ejemplarDisponible._id),
        usuario: fakeId
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Usuario no encontrado");
  });

  test("GET /api/prestamos - Estudiante solo puede ver sus propios préstamos", async () => {
    // Préstamo del estudiante activo
    await Prestamo.create({
      ejemplar: ejemplarDisponible._id,
      usuario: estudianteActivo._id,
      fechaVencEsperada: new Date()
    });

    // Préstamo de otro usuario
    const otroEstudiante = await createTestUser();
    await Prestamo.create({
      ejemplar: ejemplarPrestado._id,
      usuario: otroEstudiante._id,
      fechaVencEsperada: new Date()
    });

    const res = await request(app)
      .get("/api/prestamos")
      .set("Authorization", `Bearer ${estudianteActivoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(String(res.body.data[0].usuario._id)).toBe(String(estudianteActivo._id));
  });
});
