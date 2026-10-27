const mongoose = require("mongoose");
const Coleccion = require("../models/Coleccion");
const Libro = require("../models/Libro");
const { z } = require("zod");

const coleccionSchema = z.object({
  nombre: z.string({ required_error: "El nombre es obligatorio" }).min(1, "El nombre es obligatorio").trim(),
  descripcion: z.string().optional().default("")
});

/**
 * Obtener lista de colecciones incluyendo cantidad de libros.
 * GET /api/colecciones
 */
const getColecciones = async (req, res, next) => {
  try {
    const colecciones = await Coleccion.find().sort({ nombre: 1 });

    // Contar libros por colección
    const librosCounts = await Libro.aggregate([
      { $match: { coleccion: { $ne: null } } },
      { $group: { _id: "$coleccion", total: { $sum: 1 } } }
    ]);

    const countsMap = {};
    librosCounts.forEach((c) => {
      countsMap[String(c._id)] = c.total;
    });

    const data = colecciones.map((col) => {
      const obj = col.toObject();
      obj.cantidadLibros = countsMap[String(col._id)] || 0;
      return obj;
    });

    res.json({
      data,
      count: data.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener libros de una colección específica.
 * GET /api/colecciones/:id/libros
 * Si no hay libros responde { data: [], message: "No existen libros disponibles en esta colección" }
 */
const getLibrosPorColeccion = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID de colección inválido" });
    }

    const coleccion = await Coleccion.findById(id);
    if (!coleccion) {
      return res.status(404).json({ message: "Colección no encontrada" });
    }

    const libros = await Libro.find({ coleccion: id }).sort({ titulo: 1 });

    if (libros.length === 0) {
      return res.status(200).json({
        data: [],
        message: "No existen libros disponibles en esta colección"
      });
    }

    res.json({
      data: libros,
      count: libros.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear colección.
 * POST /api/colecciones
 */
const createColeccion = async (req, res, next) => {
  try {
    const parse = coleccionSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        message: "Datos de colección inválidos",
        errores: parse.error.errors.map((e) => e.message)
      });
    }

    const { nombre, descripcion } = parse.data;

    const existente = await Coleccion.findOne({ nombre });
    if (existente) {
      return res.status(409).json({
        message: "Ya existe una colección con este nombre"
      });
    }

    const nueva = await Coleccion.create({
      nombre,
      descripcion: descripcion || ""
    });

    res.status(201).json(nueva);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar colección.
 * PUT /api/colecciones/:id
 */
const updateColeccion = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID de colección inválido" });
    }

    const parse = coleccionSchema.partial().safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        message: "Datos de colección inválidos",
        errores: parse.error.errors.map((e) => e.message)
      });
    }

    const coleccion = await Coleccion.findById(id);
    if (!coleccion) {
      return res.status(404).json({ message: "Colección no encontrada" });
    }

    const { nombre, descripcion } = parse.data;

    if (nombre && nombre !== coleccion.nombre) {
      const duplicado = await Coleccion.findOne({ nombre });
      if (duplicado) {
        return res.status(409).json({ message: "Ya existe una colección con este nombre" });
      }
      coleccion.nombre = nombre;
    }

    if (descripcion !== undefined) {
      coleccion.descripcion = descripcion;
    }

    await coleccion.save();
    res.json(coleccion);
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar colección.
 * DELETE /api/colecciones/:id
 */
const deleteColeccion = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID de colección inválido" });
    }

    const coleccion = await Coleccion.findByIdAndDelete(id);
    if (!coleccion) {
      return res.status(404).json({ message: "Colección no encontrada" });
    }

    // Desvincular libros de la colección eliminada
    await Libro.updateMany({ coleccion: id }, { $set: { coleccion: null } });

    res.json({ message: "Colección eliminada exitosamente" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getColecciones,
  getLibrosPorColeccion,
  createColeccion,
  updateColeccion,
  deleteColeccion
};
