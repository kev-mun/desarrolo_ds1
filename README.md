# Sistema de Gestión Bibliotecaria

API REST y aplicación web para gestionar el catálogo, los usuarios, los préstamos, las multas y las reservas de una biblioteca universitaria. Proyecto académico desarrollado por historias de usuario y sprints (HU 0001 a HU 0015, HT001 a HT005).

**Autores:** Kevin Alexander Muñoz R. y Juan David Colorado B.

---

## Tecnologías

- Node.js y Express 5
- MongoDB Atlas con Mongoose
- Autenticación con JWT y contraseñas cifradas con bcrypt
- Validación con zod
- Seguridad: helmet, CORS restringido y límite de intentos de login y de registro
- Pruebas del backend con Jest, Supertest y mongodb-memory-server
- Frontend con Vite y JavaScript sin framework, con pruebas en Vitest (diseño glassmorphism)

---

## Estructura del proyecto

```text
proyecto-completo/
├── chat-server/          API (backend)
│   ├── api/
│   │   ├── app.js            configuración de Express
│   │   ├── index.js          arranque, conexión a MongoDB y tareas periódicas
│   │   ├── seed.js           datos de ejemplo
│   │   ├── config/           conexión a la base de datos
│   │   ├── controllers/      lógica de cada recurso
│   │   ├── middleware/       autenticación, roles y errores
│   │   ├── models/           esquemas de Mongoose
│   │   ├── routes/           rutas de la API
│   │   └── utils/            búsqueda, multas, estados, reservas y vistas
│   ├── scripts/              smoke-test y utilidades de mantenimiento
│   └── tests/                pruebas automáticas
├── tienda/               Frontend (Vite)
│   └── src/                  páginas, componentes, utilidades y estilos
└── docs/                 documentación adicional
```

---

## Requisitos

- Node.js 20 o superior
- Una base de datos MongoDB (por ejemplo, un clúster gratuito en MongoDB Atlas)

---

## Instalación

### Backend

```bash
cd chat-server
npm install
```

Crea un archivo `.env` en `chat-server/` a partir de `.env.example`:

```env
PORT=8080
MONGODB_URI=tu_cadena_de_conexion_aqui
JWT_SECRET=cambia_esto_por_un_secreto_largo
CLIENT_URL=http://localhost:5173
```

| Variable | Descripción |
| --- | --- |
| `PORT` | Puerto de la API (por defecto 8080) |
| `MONGODB_URI` | Cadena de conexión de MongoDB, incluyendo el nombre de la base de datos |
| `JWT_SECRET` | Secreto para firmar los tokens. Genera uno largo y aleatorio |
| `CLIENT_URL` | Origen del frontend permitido por CORS |

Para generar un secreto:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

El archivo `.env` está en `.gitignore`: nunca debe subirse al repositorio.

### Frontend

```bash
cd tienda
npm install
npm run dev
```

---

## Scripts

### Backend (desde `chat-server/`)

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia la API con reinicio automático |
| `npm start` | Inicia la API |
| `npm run seed` | Borra y vuelve a crear los datos de ejemplo (no usar contra una base con datos reales) |
| `npm test` | Ejecuta las pruebas con informe de cobertura |
| `npm run smoke` | Prueba de humo contra la API en ejecución. Requiere las variables `SMOKE_ADMIN_CORREO`, `SMOKE_ADMIN_PASSWORD`, `SMOKE_ESTUDIANTE_CORREO` y `SMOKE_ESTUDIANTE_PASSWORD` |

### Utilidades en `chat-server/scripts/` (escriben en la base de `MONGODB_URI`)

| Comando | Descripción |
| --- | --- |
| `node scripts/cambiar-password.js --listar` | Lista los usuarios con su rol y estado |
| `node scripts/cambiar-password.js correo` | Cambia la contraseña de un usuario (la toma de `NUEVA_PASSWORD`) |
| `node scripts/limpiar-usuarios-prueba.js [--borrar]` | Lista, o borra con `--borrar`, las cuentas creadas por las pruebas |

### Frontend (desde `tienda/`)

- `npm run dev` — Servidor de desarrollo
- `npm test` — Pruebas unitarias con Vitest
- `npm run build` — Compilación para producción

---

## Datos de ejemplo

`npm run seed` crea usuarios de cada rol, colecciones, 12 libros y sus ejemplares, e imprime la tabla de credenciales de prueba en la consola.

> **Nota:** Las credenciales de las cuentas de demostración se entregan por separado; no se publican en el repositorio.

---

## Uso rápido

1. Inicia la API: `npm run dev`
2. Inicia sesión con tus credenciales obtenidas:

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@biblioteca.com","password":"<CONTRASEÑA>"}'
```

3. Usa el token recibido en las demás peticiones:

```bash
curl http://localhost:8080/api/libros?q=garcia \
  -H "Authorization: Bearer TU_TOKEN"
```

La referencia completa de endpoints está en [docs/API.md](docs/API.md).

---

## Roles

| Rol | Alcance |
| --- | --- |
| `admin` | Todo, incluida la gestión de permisos de editoriales y el dashboard |
| `bibliotecario` | Usuarios, colecciones, ejemplares, préstamos, multas, bajas y dashboard |
| `profesor` y `estudiante` | Consulta del catálogo, préstamos, renovaciones, reservas y pago de sus propias multas |
| `editorial` | Gestión de libros solo si tiene el permiso `gestionar_libros` |

El registro público (`POST /api/auth/register`) siempre crea usuarios con rol `estudiante`: cualquier rol, estado o permisos enviado se ignora. Las cuentas de admin, bibliotecario, profesor y editorial solo las crea el personal autorizado. Las contraseñas requieren al menos 8 caracteres.

---

## Funcionalidades

- **Préstamos y devoluciones:** plazo de 7 días. Un ejemplar no puede prestarse dos veces (operaciones atómicas).
- **Renovaciones:** cada renovación suma 7 días, con un máximo de 2. No se puede renovar un préstamo vencido o devuelto, ni uno cuyo libro tenga una reserva en espera. El lector solo renueva sus propios préstamos. Cada renovación queda registrada con fecha, nuevo vencimiento y quién la hizo.
- **Reservas con cola:** solo se reserva un libro cuando no queda ningún ejemplar disponible. La cola se ordena por fecha de creación. Al devolverse un ejemplar, queda reservado para la primera reserva, que pasa a lista y dispone de 48 horas para convertirse en préstamo; si vence, pasa a la siguiente. La reserva lista se convierte en préstamo con `POST /api/reservas/:id/prestar`. Una multa pendiente bloquea nuevas reservas.
- **Estados de ejemplares:** `disponible`, `prestado`, `reservado`, `danado`, `extraviado`, `perdido` (automático cuando un préstamo cumple 120 días vencido) y `dado_de_baja` (solo admin o bibliotecario, con motivo obligatorio de al menos 3 caracteres y fecha de baja; no aplica a un ejemplar prestado).
- **Multas y penalizaciones:** se generan al devolver con atraso y se calculan por días hábiles (lunes a viernes): el 1.er día 1.000 COP; del 2.º al 7.º día 2.500 COP; desde el 8.º día, 2.500 COP más 100 COP por cada día adicional (8.º día = 2.600 COP). Hay una multa por préstamo. Mientras el usuario tenga una multa pendiente no puede pedir préstamos, renovar ni reservar (403). El pago es simulado y siempre exitoso.
- **Dashboard analítico (solo personal):** vistas normales `vista_morosos`, `vista_mas_renovados` y `vista_mas_reservados`, y vista materializada `mv_mas_prestados`, que se refresca al iniciar, cada hora y bajo demanda.
- **Ventana modal con doble clic:** en la interfaz, doble clic (o Enter) sobre un libro o un usuario abre su detalle.
- **Estados automáticos:** las tareas de actualización (préstamos vencidos, ejemplares perdidos y reservas expiradas) se ejecutan cada hora y también al consultar, con un intervalo mínimo de 60 segundos.
- **Interfaz web:** catálogo con búsqueda, detalle de libro con solicitud de préstamo y reserva, Mis préstamos (con renovación), Mis reservas, Mis multas (con pago), gestión de usuarios y préstamos para el personal, y dashboard.

---

## Endpoints

Resumen de los agregados en las últimas fases; el listado completo está en [docs/API.md](docs/API.md).

| Método | Endpoint | Roles permitidos | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Público (limitado a 10 registros por hora y por IP) | Crea una cuenta de estudiante |
| `PATCH` | `/api/ejemplares/:id/baja` | `admin`, `bibliotecario` | Da de baja un ejemplar registrando el motivo |
| `GET` | `/api/multas` | Autenticado (`admin` y `bibliotecario` ven todas; `estudiante` y `profesor` solo las suyas) | Consulta de multas con totales pendientes |
| `PATCH` | `/api/multas/:id/pagar` | Autenticado (dueño de la multa, `admin` o `bibliotecario`) | Registra el pago simulado de una multa |
| `POST` | `/api/prestamos/:id/renovar` | Autenticado (el lector solo sus préstamos) | Renueva un préstamo por 7 días (máximo 2) |
| `GET` | `/api/reservas` | Autenticado | Lista reservas |
| `POST` | `/api/reservas` | Autenticado | Crea una reserva y devuelve la posición en la cola |
| `PATCH` | `/api/reservas/:id/cancelar` | Autenticado | Cancela una reserva |
| `POST` | `/api/reservas/:id/prestar` | Autenticado | Convierte una reserva lista en préstamo |
| `GET` | `/api/dashboard` | `admin`, `bibliotecario` | Métricas y resúmenes analíticos |
| `POST` | `/api/dashboard/refrescar` | `admin`, `bibliotecario` | Fuerza el refresco de la vista materializada |

---

## Fuera de alcance

- Solicitudes de préstamo con aprobación del bibliotecario
- Colecciones adicionales (reserva, referencia, hemeroteca, mapoteca, tecnoteca) y equipos electrónicos
- Escenario de pago fallido y métodos de pago distintos del simulado
- Pantallas de administración y de baja de ejemplares en la interfaz (la baja existe en la API)
- Tiempo real

---

## Historias de usuario cubiertas

| Historia | Estado |
| --- | --- |
| HU 0002 Creación de usuario | Implementada (registro público siempre como estudiante) |
| HU 0003 Reserva de libros | Implementada (cola, 48 horas de retención y paso al siguiente) |
| HU 0004 Gestión de multas | Implementada |
| HU 0005 Selección de colección | Implementada |
| HU 0006 Registro de préstamos | Implementada (plazo de 7 días) |
| HU 0007 Registro de estados | Implementada en la API (incluye perdido y dado de baja) |
| HU 0008 Registro de renovaciones | Implementada |
| HU 0012 Métodos de pago para multas | Parcial (pago simulado siempre exitoso) |
| HU 0013 Permisos de editoriales | Implementada |
| HU 0014 Dashboard del bibliotecario | Implementada |
| HU 0015 Información en ventana modal | Implementada |
| HT001 Modelo de datos y API base | Implementada |
| HT002 Catálogo en el frontend | Implementada |
| HT005 Búsqueda de texto | Implementada (sin distinguir tildes ni mayúsculas) |
| HU 0001, 0009, 0010, 0011 | Pendientes |
| HT003 Tiempo real, HT004 Motor de reglas | Pendientes |

---

## Pruebas

### Backend (desde `chat-server/`)

```bash
npm test
```

Estado actual: 18 suites, 248 pruebas, cerca de 95 % de cobertura, barrera mínima de 85 %.

### Frontend (desde `tienda/`)

```bash
npm test
```

Estado actual: 2 archivos de prueba, 10 pruebas (formato de moneda y ventana modal).

---

## Seguridad

- Las contraseñas se guardan con bcrypt, tienen al menos 8 caracteres y nunca se devuelven en las respuestas.
- El inicio de sesión limita a 10 intentos fallidos cada 15 minutos; el registro público limita a 10 por hora y por IP.
- El registro público no acepta rol, estado ni permisos: siempre crea un estudiante.
- CORS acepta únicamente el origen definido en `CLIENT_URL`.
- Los préstamos usan operaciones atómicas para evitar prestar dos veces el mismo ejemplar.
- Los secretos viven solo en `.env`; las credenciales de demostración no se publican en el repositorio.
