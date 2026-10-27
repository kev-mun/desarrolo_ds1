const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const mongoose = require("mongoose");
const Usuario = require("./models/Usuario");
const Coleccion = require("./models/Coleccion");
const Libro = require("./models/Libro");
const Ejemplar = require("./models/Ejemplar");
const Prestamo = require("./models/Prestamo");

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("Error: MONGODB_URI no está definida en las variables de entorno.");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("Conectado a MongoDB para sembrado de datos...\n");

    // Limpieza de colecciones previas
    await Promise.all([
      Usuario.deleteMany({}),
      Coleccion.deleteMany({}),
      Libro.deleteMany({}),
      Ejemplar.deleteMany({}),
      Prestamo.deleteMany({})
    ]);

    console.log("Colecciones limpiadas.");

    // 1. Usuarios requeridos
    const usuariosData = [
      {
        nombre: "Administrador Principal",
        documento: "10000001",
        correo: "admin@biblioteca.com",
        password: "Admin12345",
        rol: "admin",
        estado: "activo",
        permisos: ["*"]
      },
      {
        nombre: "Carlos Bibliotecario",
        documento: "10000002",
        correo: "bibliotecario@biblioteca.com",
        password: "Biblio12345",
        rol: "bibliotecario",
        estado: "activo",
        permisos: ["gestionar_libros", "gestionar_ejemplares", "gestionar_prestamos"]
      },
      {
        nombre: "Ana Estudiante",
        documento: "10000003",
        correo: "estudiante@biblioteca.com",
        password: "Est12345",
        rol: "estudiante",
        estado: "activo",
        permisos: []
      },
      {
        nombre: "Prof. Roberto Gómez",
        documento: "10000004",
        correo: "profesor@biblioteca.com",
        password: "Prof12345",
        rol: "profesor",
        estado: "activo",
        permisos: []
      },
      {
        nombre: "Editorial Planeta Colombia",
        documento: "10000005",
        correo: "editorial@biblioteca.com",
        password: "Edit12345",
        rol: "editorial",
        estado: "activo",
        permisos: ["gestionar_libros"]
      }
    ];

    for (const u of usuariosData) {
      const usuario = new Usuario(u);
      await usuario.save(); // Dispara pre('save') para hashear password con bcrypt
    }
    console.log(`✓ ${usuariosData.length} usuarios creados exitosamente.`);

    // 2. Colecciones (4)
    const coleccionesData = [
      {
        nombre: "Literatura Clásica e Hispanoamericana",
        descripcion: "Obras maestras de la narrativa en lengua española y clásicos universales."
      },
      {
        nombre: "Ciencia Ficción y Fantasía",
        descripcion: "Grandes novelas especulativas, distopías y mundos futuristas."
      },
      {
        nombre: "Ciencias de la Computación y Software",
        descripcion: "Textos de referencia sobre programación, arquitectura y algoritmos."
      },
      {
        nombre: "Historia, Ensayo y Filosofía",
        descripcion: "Obras sobre pensamiento crítico, evolución humana y reflexión social."
      }
    ];

    const coleccionesCreadas = await Coleccion.insertMany(coleccionesData);
    console.log(`✓ ${coleccionesCreadas.length} colecciones creadas.`);

    const cMap = {};
    coleccionesCreadas.forEach((c) => {
      cMap[c.nombre] = c._id;
    });

    // 3. 12 Libros reales en español
    const librosData = [
      {
        titulo: "Cien años de soledad",
        autor: "Gabriel García Márquez",
        isbn: "978-84-376-0494-7",
        editorial: "Sudamericana",
        anio: 1967,
        categoria: "Novela",
        coleccion: cMap["Literatura Clásica e Hispanoamericana"],
        portada: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=500&q=80"
      },
      {
        titulo: "Don Quijote de la Mancha",
        autor: "Miguel de Cervantes",
        isbn: "978-84-241-1582-1",
        editorial: "Castalia",
        anio: 1605,
        categoria: "Clásico",
        coleccion: cMap["Literatura Clásica e Hispanoamericana"],
        portada: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=500&q=80"
      },
      {
        titulo: "Ficciones",
        autor: "Jorge Luis Borges",
        isbn: "978-84-206-3312-1",
        editorial: "Sur",
        anio: 1944,
        categoria: "Cuento",
        coleccion: cMap["Literatura Clásica e Hispanoamericana"],
        portada: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=500&q=80"
      },
      {
        titulo: "La sombra del viento",
        autor: "Carlos Ruiz Zafón",
        isbn: "978-84-08-04364-5",
        editorial: "Planeta",
        anio: 2001,
        categoria: "Misterio",
        coleccion: cMap["Literatura Clásica e Hispanoamericana"],
        portada: "https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=500&q=80"
      },
      {
        titulo: "Fahrenheit 451",
        autor: "Ray Bradbury",
        isbn: "978-84-473-2680-8",
        editorial: "Minotauro",
        anio: 1953,
        categoria: "Distopía",
        coleccion: cMap["Ciencia Ficción y Fantasía"],
        portada: "https://images.unsplash.com/photo-1507842229452-7b1897d28734?auto=format&fit=crop&w=500&q=80"
      },
      {
        titulo: "Dune",
        autor: "Frank Herbert",
        isbn: "978-84-9759-682-4",
        editorial: "DeBolsillo",
        anio: 1965,
        categoria: "Ciencia Ficción",
        coleccion: cMap["Ciencia Ficción y Fantasía"],
        portada: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=500&q=80"
      },
      {
        titulo: "Neuromante",
        autor: "William Gibson",
        isbn: "978-84-450-7409-1",
        editorial: "Minotauro",
        anio: 1984,
        categoria: "Cyberpunk",
        coleccion: cMap["Ciencia Ficción y Fantasía"],
        portada: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=500&q=80"
      },
      {
        titulo: "Estructura e Interpretación de Programas de Computadora",
        autor: "Harold Abelson & Gerald Jay Sussman",
        isbn: "978-84-291-5034-6",
        editorial: "McGraw-Hill",
        anio: 1996,
        categoria: "Programación",
        coleccion: cMap["Ciencias de la Computación y Software"],
        portada: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=500&q=80"
      },
      {
        titulo: "Código Limpio (Clean Code)",
        autor: "Robert C. Martin",
        isbn: "978-84-415-3210-6",
        editorial: "Anaya Multimedia",
        anio: 2008,
        categoria: "Ingeniería de Software",
        coleccion: cMap["Ciencias de la Computación y Software"],
        portada: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=500&q=80"
      },
      {
        titulo: "Patrones de Diseño",
        autor: "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides",
        isbn: "978-84-205-3459-6",
        editorial: "Pearson Educación",
        anio: 1994,
        categoria: "Arquitectura de Software",
        coleccion: cMap["Ciencias de la Computación y Software"],
        portada: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=500&q=80"
      },
      {
        titulo: "Sapiens: De animales a dioses",
        autor: "Yuval Noah Harari",
        isbn: "978-84-9992-421-2",
        editorial: "Debate",
        anio: 2014,
        categoria: "Historia",
        coleccion: cMap["Historia, Ensayo y Filosofía"],
        portada: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=500&q=80"
      },
      {
        titulo: "El laberinto de la soledad",
        autor: "Octavio Paz",
        isbn: "978-968-16-1502-4",
        editorial: "Fondo de Cultura Económica",
        anio: 1950,
        categoria: "Ensayo",
        coleccion: cMap["Historia, Ensayo y Filosofía"],
        portada: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=500&q=80"
      }
    ];

    const librosCreados = await Libro.insertMany(librosData);
    console.log(`✓ ${librosCreados.length} libros creados.`);

    // 4. Ejemplares (2 a 4 por libro)
    const ejemplaresData = [];
    const letras = ["A", "B", "C", "D"];

    librosCreados.forEach((libro, idx) => {
      // Alternar entre 2, 3 y 4 ejemplares
      const numEjemplares = 2 + (idx % 3); // 2, 3 o 4
      const numStr = String(idx + 1).padStart(3, "0");

      for (let i = 0; i < numEjemplares; i++) {
        ejemplaresData.push({
          libro: libro._id,
          codigoBarras: `EJ-${numStr}-${letras[i]}`,
          estado: "disponible",
          ubicacion: `Pabellón ${(idx % 4) + 1}, Estante ${i + 1}, Pasillo ${(idx % 3) + 1}`
        });
      }
    });

    const ejemplaresCreados = await Ejemplar.insertMany(ejemplaresData);
    console.log(`✓ ${ejemplaresCreados.length} ejemplares creados.`);

    console.log("\n==========================================================================");
    console.log("            SISTEMA DE GESTIÓN BIBLIOTECARIA - SEMILLA COMPLETADA         ");
    console.log("==========================================================================");
    console.log("Credenciales de prueba generadas:");
    console.log("--------------------------------------------------------------------------");
    console.log(" Rol            | Correo                        | Contraseña | Documento ");
    console.log("--------------------------------------------------------------------------");
    console.log(" admin          | admin@biblioteca.com          | Admin12345 | 10000001  ");
    console.log(" bibliotecario  | bibliotecario@biblioteca.com  | Biblio12345| 10000002  ");
    console.log(" estudiante     | estudiante@biblioteca.com     | Est12345   | 10000003  ");
    console.log(" profesor       | profesor@biblioteca.com       | Prof12345  | 10000004  ");
    console.log(" editorial      | editorial@biblioteca.com      | Edit12345  | 10000005  ");
    console.log("--------------------------------------------------------------------------\n");

    await mongoose.connection.close();
    console.log("Conexión a MongoDB cerrada. Proceso completado exitosamente.");
    process.exit(0);
  } catch (error) {
    console.error("Error al sembrar la base de datos:", error);
    process.exit(1);
  }
};

seedDatabase();
