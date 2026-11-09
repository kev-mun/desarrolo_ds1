// scripts/smoke-test.js
// Prueba de humo de la API. Requiere la API corriendo: npm run dev
// Uso: npm run smoke
// Variables obligatorias: SMOKE_ADMIN_CORREO, SMOKE_ADMIN_PASSWORD, SMOKE_ESTUDIANTE_CORREO, SMOKE_ESTUDIANTE_PASSWORD
// Variables opcionales: BASE_URL, SMOKE_TEST_PASSWORD

const BASE_URL = process.env.BASE_URL || "http://localhost:8080/api";

const ADMIN_CORREO = process.env.SMOKE_ADMIN_CORREO;
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;
const ESTUDIANTE_CORREO = process.env.SMOKE_ESTUDIANTE_CORREO || process.env.ESTUDIANTE_CORREO;
const ESTUDIANTE_PASSWORD = process.env.SMOKE_ESTUDIANTE_PASSWORD || process.env.ESTUDIANTE_PASSWORD;

if (!ADMIN_CORREO) {
  console.error("❌ Falta la variable de entorno obligatoria: SMOKE_ADMIN_CORREO");
  process.exit(1);
}
if (!ADMIN_PASSWORD) {
  console.error("❌ Falta la variable de entorno obligatoria: SMOKE_ADMIN_PASSWORD");
  process.exit(1);
}
if (!ESTUDIANTE_CORREO) {
  console.error("❌ Falta la variable de entorno obligatoria: SMOKE_ESTUDIANTE_CORREO");
  process.exit(1);
}
if (!ESTUDIANTE_PASSWORD) {
  console.error("❌ Falta la variable de entorno obligatoria: SMOKE_ESTUDIANTE_PASSWORD");
  process.exit(1);
}

const ADMIN = { correo: ADMIN_CORREO, password: ADMIN_PASSWORD };
const ESTUDIANTE = { correo: ESTUDIANTE_CORREO, password: ESTUDIANTE_PASSWORD };
const PASSWORD_PRUEBA = process.env.SMOKE_TEST_PASSWORD || "TestTemporal#2026";

let ok = 0;
let fail = 0;

const check = (nombre, condicion, detalle = "") => {
  if (condicion) {
    ok++;
    console.log(`✅ ${nombre}`);
  } else {
    fail++;
    console.log(`❌ ${nombre}${detalle ? ` -> ${detalle}` : ""}`);
  }
};

const api = async (metodo, ruta, { token, body } = {}) => {
  const res = await fetch(`${BASE_URL}${ruta}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
};

const login = async (cred) => {
  const r = await api("POST", "/auth/login", { body: cred });
  return { ...r, token: r.data && r.data.token };
};

const lista = (data) => (Array.isArray(data) ? data : (data && data.data) || []);

(async () => {
  // La API debe estar viva
  try {
    await fetch(BASE_URL.replace(/\/api$/, "") + "/api/auth/login", { method: "OPTIONS" });
  } catch {
    console.log(`❌ No se pudo conectar a ${BASE_URL}. Inicia la API con "npm run dev" y vuelve a intentar.`);
    process.exit(1);
  }

  const creados = { usuarioId: null };
  const sufijo = Date.now();

  // 1. Autenticación
  const admin = await login(ADMIN);
  check("Login admin: 200 y token", admin.status === 200 && !!admin.token, `status ${admin.status}`);
  check(
    "Login admin: la respuesta no incluye password",
    !JSON.stringify(admin.data || {}).toLowerCase().includes('"password"')
  );

  const malo = await login({ correo: ADMIN.correo, password: "incorrecta" });
  check("Login con contraseña incorrecta: 401", malo.status === 401, `status ${malo.status}`);

  const sinToken = await api("GET", "/usuarios");
  check("GET /usuarios sin token: 401", sinToken.status === 401, `status ${sinToken.status}`);

  if (!admin.token) {
    console.log("\nSin token de admin no se puede continuar.");
    process.exit(1);
  }

  // 2. Roles
  const est = await login(ESTUDIANTE);
  if (est.token) {
    const r = await api("POST", "/usuarios", {
      token: est.token,
      body: { nombre: "X", documento: `D${sufijo}`, correo: `x${sufijo}@t.com`, password: PASSWORD_PRUEBA, rol: "estudiante" },
    });
    check("Estudiante creando usuario: 403", r.status === 403, `status ${r.status}`);
  } else {
    console.log(`⚠️  No se pudo iniciar sesión como estudiante (${ESTUDIANTE.correo}). Define SMOKE_ESTUDIANTE_CORREO y SMOKE_ESTUDIANTE_PASSWORD con los datos correspondientes.`);
  }

  // 3. Usuarios
  const nuevo = {
    nombre: "Usuario Smoke",
    documento: `SMK${sufijo}`,
    correo: `smoke${sufijo}@biblioteca.com`,
    password: PASSWORD_PRUEBA,
    rol: "estudiante",
  };
  const crear = await api("POST", "/usuarios", { token: admin.token, body: nuevo });
  check("Admin crea usuario: 201", crear.status === 201 || crear.status === 200, `status ${crear.status}`);
  creados.usuarioId = crear.data && (crear.data._id || (crear.data.usuario && crear.data.usuario._id) || (crear.data.data && crear.data.data._id));

  const dup = await api("POST", "/usuarios", { token: admin.token, body: nuevo });
  check("Usuario duplicado: 409", dup.status === 409, `status ${dup.status}`);

  const incompleto = await api("POST", "/usuarios", { token: admin.token, body: { nombre: "Sin datos" } });
  check(
    "Usuario con campos faltantes: 400 con 'errores'",
    incompleto.status === 400 && !!incompleto.data && Array.isArray(incompleto.data.errores),
    `status ${incompleto.status}`
  );

  // 4. Colecciones y libros
  const cols = await api("GET", "/colecciones", { token: admin.token });
  check("GET /colecciones: 200", cols.status === 200, `status ${cols.status}`);

  const libros = await api("GET", "/libros?q=garcia", { token: admin.token });
  check("GET /libros?q=garcia: 200", libros.status === 200, `status ${libros.status}`);
  const primero = lista(libros.data)[0];
  if (primero) {
    check(
      "Libros incluyen ejemplaresTotales y ejemplaresDisponibles",
      "ejemplaresTotales" in primero && "ejemplaresDisponibles" in primero
    );
  } else {
    console.log("⚠️  La búsqueda 'garcia' no devolvió libros; revisa los datos del seed.");
  }

  // 5. Préstamos
  const todos = await api("GET", "/libros?limit=50", { token: admin.token });
  const conStock = lista(todos.data).find((l) => l.ejemplaresDisponibles > 0);
  let ejemplarId = null;
  if (conStock) {
    const det = await api("GET", `/libros/${conStock._id}`, { token: admin.token });
    const ejemplares = (det.data && (det.data.ejemplares || (det.data.data && det.data.data.ejemplares))) || [];
    const libre = ejemplares.find((e) => e.estado === "disponible");
    ejemplarId = libre && libre._id;
  }

  if (ejemplarId && creados.usuarioId) {
    const p1 = await api("POST", "/prestamos", {
      token: admin.token,
      body: { ejemplar: ejemplarId, usuario: creados.usuarioId },
    });
    check("Préstamo de ejemplar disponible: 201", p1.status === 201, `status ${p1.status}`);

    const p2 = await api("POST", "/prestamos", {
      token: admin.token,
      body: { ejemplar: ejemplarId, usuario: creados.usuarioId },
    });
    check("Repetir préstamo del mismo ejemplar: 409", p2.status === 409, `status ${p2.status}`);

    // Limpieza: devolver el ejemplar a "disponible"
    await api("PATCH", `/ejemplares/${ejemplarId}/estado`, {
      token: admin.token,
      body: { estado: "disponible" },
    });
  } else {
    console.log("⚠️  No se pudo probar préstamos (no hay ejemplar disponible o no se creó el usuario).");
  }

  // Limpieza del usuario de prueba: se suspende
  if (creados.usuarioId) {
    await api("PATCH", `/usuarios/${creados.usuarioId}/estado`, {
      token: admin.token,
      body: { estado: "suspendido" },
    });
  }

  console.log(`\nResultado: ${ok} correctas, ${fail} con error.`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.log("❌ Error inesperado:", e.message);
  process.exit(1);
});
