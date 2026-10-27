# Sistema de Gestión Bibliotecaria

API REST para gestionar el catálogo, los usuarios y los préstamos de una biblioteca universitaria. Proyecto académico desarrollado por historias de usuario y sprints (HU 0001 a HU 0013, HT001 a HT005).

## Tecnologías

- Node.js y Express 5
- MongoDB Atlas con Mongoose
- Autenticación con JWT y contraseñas cifradas con bcrypt
- Validación con zod
- Seguridad: helmet, CORS restringido y límite de intentos de login
- Pruebas con Jest, Supertest y mongodb-memory-server

## Estructura del proyecto

```
proyecto-completo/
├── chat-server/          API (backend)
│   ├── api/
│   │   ├── app.js            configuración de Express
│   │   ├── index.js          arranque y conexión a MongoDB
│   │   ├── seed.js           datos de ejemplo
│   │   ├── config/           conexión a la base de datos
│   │   ├── controllers/      lógica de cada recurso
│   │   ├── middleware/       autenticación, roles y errores
│   │   ├── models/           esquemas de Mongoose
│   │   ├── routes/           rutas de la API
│   │   └── utils/            búsqueda sin tildes ni mayúsculas
│   ├── scripts/smoke-test.js prueba de humo de la API en ejecución
│   └── tests/                pruebas automáticas
├── tienda/               Frontend (Vite), en conversión al sistema bibliotecario
└── docs/                 documentación adicional
```

## Requisitos

- Node.js 20 o superior
- Una base de datos MongoDB (por ejemplo, un clúster gratuito en MongoDB Atlas)

## Instalación

```bash
cd chat-server
npm install
```

Crea un archivo `.env` en `chat-server/` a partir de `.env.example`:

```
PORT=8080
MONGODB_URI=tu_cadena_de_conexion_aqui
JWT_SECRET=cambia_esto_por_un_secreto_largo
CLIENT_URL=http://localhost:5173
```

| Variable      | Descripción                                                             |
| ------------- | ----------------------------------------------------------------------- |
| `PORT`        | Puerto de la API (por defecto 8080)                                     |
| `MONGODB_URI` | Cadena de conexión de MongoDB, incluyendo el nombre de la base de datos |
| `JWT_SECRET`  | Secreto para firmar los tokens. Genera uno largo y aleatorio            |
| `CLIENT_URL`  | Origen del frontend permitido por CORS                                  |

Para generar un secreto:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

El archivo `.env` está en `.gitignore`: nunca debe subirse al repositorio.

## Scripts

Se ejecutan desde `chat-server/`.

| Comando         | Descripción                                                            |
| --------------- | ---------------------------------------------------------------------- |
| `npm run dev`   | Inicia la API con reinicio automático                                  |
| `npm start`     | Inicia la API                                                          |
| `npm run seed`  | Borra y vuelve a crear los datos de ejemplo                            |
| `npm test`      | Ejecuta las pruebas con informe de cobertura                           |
| `npm run smoke` | Prueba de humo contra la API en ejecución (inicia antes `npm run dev`) |

## Datos de ejemplo

`npm run seed` crea usuarios de cada rol, colecciones, 12 libros y sus ejemplares, e imprime la tabla de credenciales de prueba en la consola.

| Rol           | Correo                       | Contraseña  |
| ------------- | ---------------------------- | ----------- |
| admin         | admin@biblioteca.com         | Admin12345  |
| bibliotecario | bibliotecario@biblioteca.com | Biblio12345 |
| estudiante    | estudiante@biblioteca.com    | Est12345    |

El profesor y la editorial de prueba tienen sus credenciales en la tabla que imprime el seed. Estas credenciales son solo para desarrollo.

## Uso rápido

1. Inicia la API: `npm run dev`
2. Inicia sesión:

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@biblioteca.com","password":"Admin12345"}'
```

3. Usa el `token` recibido en las demás peticiones:

```bash
curl http://localhost:8080/api/libros?q=garcia \
  -H "Authorization: Bearer TU_TOKEN"
```

La referencia completa de endpoints está en [docs/API.md](docs/API.md).

## Roles

| Rol                       | Alcance                                                       |
| ------------------------- | ------------------------------------------------------------- |
| `admin`                   | Todo, incluida la gestión de permisos de editoriales          |
| `bibliotecario`           | Usuarios, colecciones, ejemplares y préstamos                 |
| `profesor` y `estudiante` | Consulta del catálogo y solicitud de préstamos                |
| `editorial`               | Gestión de libros solo si tiene el permiso `gestionar_libros` |

No existe registro público: solo `admin` y `bibliotecario` crean usuarios.

## Historias de usuario cubiertas

| Historia                                                                | Estado                                                      |
| ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| HU 0002 Creación de usuario                                             | Implementada                                                |
| HU 0013 Permisos de editoriales                                         | Implementada                                                |
| HU 0005 Selección de colección                                          | Implementada                                                |
| HU 0006 Registro de préstamos                                           | Implementada (plazo provisional de 7 días)                  |
| HU 0007 Registro de estados                                             | Parcial (estado del ejemplar)                               |
| HT001 Modelo de datos y API base                                        | Implementada                                                |
| HT005 Búsqueda de texto                                                 | Implementada (parcial, sin distinguir tildes ni mayúsculas) |
| HU 0001, 0003, 0004, 0008, 0009, 0010, 0011, 0012                       | Pendientes                                                  |
| HT002 Catálogo en el frontend, HT003 Tiempo real, HT004 Motor de reglas | Pendientes                                                  |

## Pruebas

```bash
npm test
```

Estado actual: 7 suites y 43 pruebas. Cobertura por carpeta: modelos 100 %, middleware 88 %, rutas 99 %. Los controladores están por debajo de la meta de 80 % de HT001 y la mejora está en curso.

## Seguridad

- Las contraseñas se guardan con bcrypt y nunca se devuelven en las respuestas.
- El inicio de sesión limita a 10 intentos fallidos cada 15 minutos.
- CORS acepta únicamente el origen definido en `CLIENT_URL`.
- Los préstamos usan operaciones atómicas para evitar prestar dos veces el mismo ejemplar.
- Los secretos viven solo en `.env`.
