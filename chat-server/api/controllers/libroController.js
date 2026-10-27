const mongoose = require('mongoose');
const Libro = require('../models/Libro');
const Ejemplar = require('../models/Ejemplar');
const Coleccion = require('../models/Coleccion');
const { crearRegexBusqueda } = require('../utils/buscar');
const { z } = require('zod');

// Esquemas de validación con Zod
const libroCreateSchema = z.object({
  titulo: z.string().min(1, { message: 'El título es obligatorio' }).trim(),
  autor: z.string().min(1, { message: 'El autor es obligatorio' }).trim(),
  isbn: z.string().min(1, { message: 'El ISBN es obligatorio' }).trim(),
  editorial: z.string().min(1, { message: 'La editorial es obligatoria' }).trim(),
  anio: z.number().int().positive({ message: 'El año debe ser un número entero positivo' }),
  categoria: z.string().min(1, { message: 'La categoría es obligatoria' }).trim(),
  coleccion: z.string().optional().refine(val => !val || mongoose.isValidObjectId(val), { message: 'ID de colección inválido' }),
  portada: z.string().optional()
});

const libroUpdateSchema = libroCreateSchema.partial();

/**
 * Obtener lista de libros con paginación y filtros.
 * GET /api/libros
 */
const getLibros = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    let limit = parseInt(req.query.limit, 10) || 10;
    if (limit < 1) limit = 10;
    if (limit > 50) limit = 50;
    const skip = (page - 1) * limit;

    const filter = {};

    // filtro por categoría (regex escapada)
    if (req.query.categoria) {
      filter.categoria = new RegExp(req.query.categoria, 'i');
    }

    // filtro por colección (ObjectId válido)
    if (req.query.coleccion && mongoose.isValidObjectId(req.query.coleccion)) {
      filter.coleccion = req.query.coleccion;
    }

    // búsqueda libre sobre varios campos
    if (req.query.q) {
      const regex = crearRegexBusqueda(req.query.q);
      filter.$or = [
        { titulo: regex },
        { autor: regex },
        { isbn: regex },
        { categoria: regex }
      ];
    }

    // Conteo total antes de paginar
    const total = await Libro.countDocuments(filter);

    // Agregación para incluir totales y disponibles de ejemplares
    const libros = await Libro.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: Ejemplar.collection.name,
          localField: '_id',
          foreignField: 'libro',
          as: 'ejemplares'
        }
      },
      {
        $addFields: {
          ejemplaresTotales: { $size: '$ejemplares' },
          ejemplaresDisponibles: {
            $size: {
              $filter: {
                input: '$ejemplares',
                as: 'e',
                cond: { $eq: ['$$e.estado', 'disponible'] }
              }
            }
          }
        }
      },
      { $project: { ejemplares: 0 } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    const pages = Math.ceil(total / limit) || 1;

    res.json({
      data: libros,
      pagination: { page, limit, total, pages }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener detalle de libro por ID, incluye lista de ejemplares.
 * GET /api/libros/:id
 */
const getLibroById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'ID de libro inválido' });
    }

    const libro = await Libro.findById(id);
    if (!libro) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }

    const ejemplares = await Ejemplar.find({ libro: id });
    const libroObj = libro.toObject();
    libroObj.ejemplares = ejemplares;

    res.json(libroObj);
  } catch (error) {
    next(error);
  }
};

/**
 * Crear nuevo libro.
 * POST /api/libros
 */
const createLibro = async (req, res, next) => {
  try {
    const parse = libroCreateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        message: 'Datos de libro inválidos',
        errores: parse.error.errors.map(e => e.message)
      });
    }
    const data = parse.data;

    // Verificar ISBN duplicado
    const existente = await Libro.findOne({ isbn: data.isbn.trim() });
    if (existente) {
      return res.status(409).json({ message: 'Ya existe un libro con este ISBN' });
    }

    // Si se provee coleccion, validar ObjectId
    if (data.coleccion && !mongoose.isValidObjectId(data.coleccion)) {
      return res.status(400).json({ message: 'ID de colección inválido' });
    }

    const nuevo = await Libro.create({
      titulo: data.titulo.trim(),
      autor: data.autor.trim(),
      isbn: data.isbn.trim(),
      editorial: data.editorial.trim(),
      anio: data.anio,
      categoria: data.categoria.trim(),
      coleccion: data.coleccion || null,
      portada: data.portada || ''
    });

    res.status(201).json(nuevo);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar libro existente.
 * PUT /api/libros/:id
 */
const updateLibro = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'ID de libro inválido' });
    }

    const parse = libroUpdateSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        message: 'Datos de libro inválidos',
        errores: parse.error.errors.map(e => e.message)
      });
    }
    const data = parse.data;

    const libro = await Libro.findById(id);
    if (!libro) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }

    // Si se intenta cambiar ISBN, verificar colisión
    if (data.isbn && data.isbn.trim() !== libro.isbn) {
      const existente = await Libro.findOne({ isbn: data.isbn.trim() });
      if (existente) {
        return res.status(409).json({ message: 'Ya existe un libro con este ISBN' });
      }
    }

    // Actualizar campos permitidos
    const fields = ['titulo', 'autor', 'isbn', 'editorial', 'anio', 'categoria', 'coleccion', 'portada'];
    fields.forEach(f => {
      if (data[f] !== undefined) {
        if (f === 'coleccion') {
          if (data[f] && !mongoose.isValidObjectId(data[f])) {
            return res.status(400).json({ message: 'ID de colección inválido' });
          }
          libro[f] = data[f] || null;
        } else if (typeof data[f] === 'string') {
          libro[f] = data[f].trim();
        } else {
          libro[f] = data[f];
        }
      }
    });

    await libro.save();
    res.json(libro);
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar libro.
 * DELETE /api/libros/:id
 * 409 si tiene ejemplares prestados o reservados.
 */
const deleteLibro = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'ID de libro inválido' });
    }

    // Verificar ejemplares que no estén disponibles
    const ejemplarConflicto = await Ejemplar.findOne({ libro: id, estado: { $ne: 'disponible' } });
    if (ejemplarConflicto) {
      return res.status(409).json({ message: 'No se puede eliminar el libro porque tiene ejemplares prestados o reservados' });
    }

    const libro = await Libro.findByIdAndDelete(id);
    if (!libro) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }

    // Opcional: eliminar sus ejemplares disponibles
    await Ejemplar.deleteMany({ libro: id });

    res.json({ message: 'Libro eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLibros,
  getLibroById,
  createLibro,
  updateLibro,
  deleteLibro
};