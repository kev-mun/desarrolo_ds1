# Referencia de la API

Base URL en desarrollo: `http://localhost:8080/api`

## Autenticación

Todas las rutas, salvo `POST /auth/login` y `GET /status`, requieren el encabezado:

```
Authorization: Bearer <token>
```

El token se obtiene en el login y dura 8 horas.

## Formato de respuestas

Listados paginados:

```json
{
  "data": [],
  "pagination": { "page": 1, "limit": 10, "total": 12, "pages": 2 }
}
```

Errores de validación (400):

```json
{
  "message": "Datos inválidos",
  "errores": [{ "campo": "correo", "mensaje": "El correo es obligatorio" }]
}
```

Otros errores:

```json
{ "message": "Descripción del problema" }
```

| Código    | Significado                                          |
| --------- | ---------------------------------------------------- |
| 200 / 201 | Operación correcta / recurso creado                  |
| 400       | Datos inválidos o identificador mal formado          |
| 401       | Sin token, token inválido o credenciales incorrectas |
| 403       | Sin permisos para la acción, o usuario suspendido    |
| 404       | Recurso no encontrado                                |
| 409       | Conflicto (duplicado o ejemplar no disponible)       |
| 429       | Demasiados intentos de inicio de sesión              |
| 500       | Error interno                                        |

## Resumen de endpoints

| Método | Ruta                      | Acceso                     | Descripción                      |
| ------ | ------------------------- | -------------------------- | -------------------------------- |
| GET    | `/status`                 | Público                    | Estado del servicio              |
| POST   | `/auth/login`             | Público                    | Iniciar sesión                   |
| GET    | `/usuarios`               | admin, bibliotecario       | Listar usuarios                  |
| GET    | `/usuarios/:id`           | admin, bibliotecario       | Detalle de un usuario            |
| POST   | `/usuarios`               | admin, bibliotecario       | Crear usuario                    |
| PUT    | `/usuarios/:id`           | admin, bibliotecario       | Actualizar usuario               |
| PATCH  | `/usuarios/:id/estado`    | admin, bibliotecario       | Activar o suspender              |
| PUT    | `/usuarios/:id/permisos`  | admin                      | Asignar permisos a una editorial |
| GET    | `/colecciones`            | Autenticado                | Listar colecciones               |
| GET    | `/colecciones/:id/libros` | Autenticado                | Libros de una colección          |
| POST   | `/colecciones`            | admin, bibliotecario       | Crear colección                  |
| PUT    | `/colecciones/:id`        | admin, bibliotecario       | Actualizar colección             |
| DELETE | `/colecciones/:id`        | admin, bibliotecario       | Eliminar colección               |
| GET    | `/libros`                 | Autenticado                | Listar y buscar libros           |
| GET    | `/libros/:id`             | Autenticado                | Detalle de un libro              |
| POST   | `/libros`                 | Permiso `gestionar_libros` | Crear libro                      |
| PUT    | `/libros/:id`             | Permiso `gestionar_libros` | Actualizar libro                 |
| DELETE | `/libros/:id`             | Permiso `gestionar_libros` | Eliminar libro                   |
| GET    | `/ejemplares`             | Autenticado                | Listar ejemplares                |
| POST   | `/ejemplares`             | admin, bibliotecario       | Crear ejemplar                   |
| PUT    | `/ejemplares/:id`         | admin, bibliotecario       | Actualizar ejemplar              |
| PATCH  | `/ejemplares/:id/estado`  | admin, bibliotecario       | Cambiar estado del ejemplar      |
| GET    | `/prestamos`              | Autenticado                | Listar préstamos                 |
| POST   | `/prestamos`              | Autenticado                | Registrar préstamo               |

---

## Autenticación

### POST /auth/login

```json
{ "correo": "admin@biblioteca.com", "password": "Admin12345" }
```

Respuesta 200:

```json
{
  "token": "eyJhbGciOi...",
  "usuario": {
    "_id": "...",
    "nombre": "Administrador",
    "correo": "admin@biblioteca.com",
    "rol": "admin",
    "estado": "activo"
  }
}
```

Errores: 400 (campos faltantes, con `errores`), 401 (credenciales inválidas), 403 (usuario suspendido), 429 (demasiados intentos fallidos).

## Usuarios (HU 0002 y HU 0013)

### POST /usuarios

```json
{
  "nombre": "Ana Pérez",
  "documento": "10000010",
  "correo": "ana@biblioteca.com",
  "password": "Clave12345",
  "rol": "estudiante"
}
```

Roles válidos: `estudiante`, `profesor`, `bibliotecario`, `admin`, `editorial`.

- 201: usuario creado (sin contraseña).
- 400: faltan campos obligatorios, con la lista en `errores`.
- 403: el rol del solicitante no puede crear usuarios.
- 409: el documento o el correo ya están registrados.

### GET /usuarios

Parámetros opcionales: `page`, `limit` (máximo 50), `rol`, `estado`.

### PATCH /usuarios/:id/estado

```json
{ "estado": "suspendido" }
```

Valores: `activo`, `suspendido`.

### PUT /usuarios/:id/permisos

```json
{ "permisos": ["gestionar_libros"] }
```

## Colecciones (HU 0005)

### GET /colecciones

Devuelve las colecciones registradas.

### GET /colecciones/:id/libros

Libros de la colección. Si no tiene libros:

```json
{ "data": [], "message": "No existen libros disponibles en esta colección" }
```

### POST /colecciones

```json
{ "nombre": "Novela Contemporánea", "descripcion": "Obras del siglo XXI" }
```

Errores: 400 (sin nombre), 409 (nombre repetido).

## Libros (HT001 y HT005)

### GET /libros

| Parámetro       | Descripción                                                                             |
| --------------- | --------------------------------------------------------------------------------------- |
| `q`             | Búsqueda parcial por título, autor, ISBN o categoría. No distingue mayúsculas ni tildes |
| `categoria`     | Filtro exacto por categoría                                                             |
| `coleccion`     | Filtro por identificador de colección                                                   |
| `page`, `limit` | Paginación (límite máximo 50)                                                           |

Ejemplos de búsqueda: `?q=garcia` encuentra "Gabriel García Márquez" y `?q=quijo` encuentra "Don Quijote de la Mancha".

Cada libro incluye `ejemplaresTotales` y `ejemplaresDisponibles`:

```json
{
  "titulo": "Cien años de soledad",
  "autor": "Gabriel García Márquez",
  "ejemplaresTotales": 2,
  "ejemplaresDisponibles": 2
}
```

### GET /libros/:id

Detalle del libro con la lista de sus ejemplares.

### POST /libros

```json
{
  "titulo": "Cien años de soledad",
  "autor": "Gabriel García Márquez",
  "isbn": "978-84-206-3311-0",
  "editorial": "Sudamericana",
  "anio": 1967,
  "categoria": "Novela"
}
```

Requiere el permiso `gestionar_libros`. Errores: 400, 403 y 409 (ISBN repetido).

## Ejemplares

### POST /ejemplares

```json
{
  "libro": "<ID_DEL_LIBRO>",
  "codigoBarras": "EJ-001",
  "estado": "disponible",
  "ubicacion": "Estante A3"
}
```

Estados: `disponible`, `prestado`, `reservado`, `danado`, `extraviado`.

### PATCH /ejemplares/:id/estado

```json
{ "estado": "danado" }
```

## Préstamos (HU 0006)

### POST /prestamos

```json
{ "ejemplar": "<ID_DEL_EJEMPLAR>", "usuario": "<ID_DEL_USUARIO>" }
```

- 201: préstamo registrado y el ejemplar pasa a `prestado`. El plazo provisional es de 7 días.
- 404: el ejemplar o el usuario no existen.
- 409: el ejemplar no está disponible para préstamo.

La operación es atómica: dos peticiones simultáneas sobre el mismo ejemplar no pueden tener éxito ambas.

### GET /prestamos

Devuelve los préstamos con su estado (`activo`, `devuelto`, `vencido`).

## Estado del servicio

### GET /status

```json
{
  "status": "online",
  "sistema": "Sistema de Gestión Bibliotecaria",
  "version": "1.0.0",
  "timestamp": "2026-10-27T20:00:00.000Z",
  "uptime": 120
}
```

## Pruebas con Thunder Client o Postman

1. Crea la variable `BASE_URL` con `http://localhost:8080/api`.
2. Haz `POST {{BASE_URL}}/auth/login` y copia el `token`.
3. En las demás peticiones agrega el encabezado `Authorization: Bearer <token>`.
