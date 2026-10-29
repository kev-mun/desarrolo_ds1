const mongoose = require("mongoose");
const Ejemplar = require("../models/Ejemplar");
const Libro = require("../models/Libro");
const { ESTADOS_EJEMPLAR } = require("../models/Ejemplar");
const { z } = require("zod");

const ejemplarSchema = z.object({
  libro: z.string({ error: "El libro es obligatorio" }),
  codigoBarras: z.string({ error: "El código de barras es obligatorio" }).min(1).trim(),
  estado: z.enum(ESTADOS_EJEMPLAR).optional().default("disponible"),
  ubicacion: z.string().optional().default("")
});

/**
 * Obtener listado de ejemplares.
 * GET /api/ejemplares
 */
const getEjemplares = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.libro) {
      if (!mongoose.isValidObjectId(req.query.libro)) {
        return res.status(400).json({ message: "ID de libro inválido" });
      }
      filter.libro = req.query.libro;
    }
    if (req.query.estado && ESTADOS_EJEMPLAR.includes(req.query.estado)) {
      filter.estado = req.query.estado;
    }

    const ejemplares = await Ejemplar.find(filter)
      .populate("libro", "titulo autor isbn")
      .sort({ codigoBarras: 1 });

    res.json({
      data: ejemplares,
      count: ejemplares.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear ejemplar.
 * POST /api/ejemplares
 */
const createEjemplar = async (req, res, next) => {
  try {
    const parse = ejemplarSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        message: "Datos de ejemplar inválidos",
        errores: parse.error.issues.map((e) => e.message)
      });
    }

    const { libro, codigoBarras, estado, ubicacion } = parse.data;

    if (!mongoose.isValidObjectId(libro)) {
      return res.status(400).json({ message: "ID de libro inválido" });
    }

    const libroExiste = await Libro.findById(libro);
    if (!libroExiste) {
      return res.status(404).json({ message: "El libro asociado no existe" });
    }

    const codigoExistente = await Ejemplar.findOne({ codigoBarras });
    if (codigoExistente) {
      return res.status(409).json({ message: "El código de barras ya se encuentra registrado" });
    }

    const nuevoEjemplar = await Ejemplar.create({
      libro,
      codigoBarras,
      estado: estado || "disponible",
      ubicacion: ubicacion || ""
    });

    res.status(201).json(nuevoEjemplar);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar ejemplar.
 * PUT /api/ejemplares/:id
 */
const updateEjemplar = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID de ejemplar inválido" });
    }

    const ejemplar = await Ejemplar.findById(id);
    if (!ejemplar) {
      return res.status(404).json({ message: "Ejemplar no encontrado" });
    }

    const { codigoBarras, estado, ubicacion, libro } = req.body;

    if (codigoBarras && codigoBarras !== ejemplar.codigoBarras) {
      const codigoDuplicado = await Ejemplar.findOne({ codigoBarras: String(codigoBarras).trim() });
      if (codigoDuplicado) {
        return res.status(409).json({ message: "El código de barras ya se encuentra registrado" });
      }
      ejemplar.codigoBarras = String(codigoBarras).trim();
    }

    if (estado !== undefined) {
      if (!ESTADOS_EJEMPLAR.includes(estado)) {
        return res.status(400).json({ message: `Estado inválido. Opciones: ${ESTADOS_EJEMPLAR.join(", ")}` });
      }
      ejemplar.estado = estado;
    }

    if (libro !== undefined) {
      if (!mongoose.isValidObjectId(libro)) {
        return res.status(400).json({ message: "ID de libro inválido" });
      }
      const libroExiste = await Libro.findById(libro);
      if (!libroExiste) return res.status(404).json({ message: "El libro indicado no existe" });
      ejemplar.libro = libro;
    }

    if (ubicacion !== undefined) {
      ejemplar.ubicacion = String(ubicacion).trim();
    }

    await ejemplar.save();
    res.json(ejemplar);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar estado de ejemplar.
 * PATCH /api/ejemplares/:id/estado
 */
const updateEstadoEjemplar = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID de ejemplar inválido" });
    }

    const { estado } = req.body;
    if (!estado || !ESTADOS_EJEMPLAR.includes(estado)) {
      return res.status(400).json({
        message: `Estado no válido. Opciones: ${ESTADOS_EJEMPLAR.join(", ")}`
      });
    }

    const ejemplar = await Ejemplar.findByIdAndUpdate(
      id,
      { $set: { estado } },
      { returnDocument: "after", runValidators: true }
    );

    if (!ejemplar) {
      return res.status(404).json({ message: "Ejemplar no encontrado" });
    }

    res.json({
      message: `Estado de ejemplar actualizado a '${estado}'`,
      ejemplar
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEjemplares,
  createEjemplar,
  updateEjemplar,
  updateEstadoEjemplar
};
