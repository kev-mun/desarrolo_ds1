const mongoose = require("mongoose");
const Prestamo = require("../models/Prestamo");
const Ejemplar = require("../models/Ejemplar");
const Usuario = require("../models/Usuario");
const { z } = require("zod");

const prestamoCreateSchema = z.object({
  ejemplar: z.string({ error: "El ejemplar es obligatorio" }),
  usuario: z.string({ error: "El usuario es obligatorio" })
});

/**
 * Obtener préstamos.
 * GET /api/prestamos
 */
const getPrestamos = async (req, res, next) => {
  try {
    const filter = {};

    // Si es estudiante o profesor, solo puede ver sus propios préstamos
    if (req.usuario.rol === "estudiante" || req.usuario.rol === "profesor") {
      filter.usuario = req.usuario._id;
    } else if (req.query.usuario) {
      if (!mongoose.isValidObjectId(req.query.usuario)) {
        return res.status(400).json({ message: "ID de usuario inválido" });
      }
      filter.usuario = req.query.usuario;
    }

    if (req.query.estado) {
      filter.estado = req.query.estado;
    }

    const prestamos = await Prestamo.find(filter)
      .populate({
        path: "ejemplar",
        populate: { path: "libro", select: "titulo autor isbn" }
      })
      .populate("usuario", "nombre documento correo rol estado")
      .sort({ createdAt: -1 });

    res.json({
      data: prestamos,
      count: prestamos.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear préstamo con validación atómica de disponibilidad del ejemplar.
 * POST /api/prestamos
 */
const createPrestamo = async (req, res, next) => {
  try {
    const rawEjemplar = req.body.ejemplar || req.body.ejemplarId;

    const esLector = req.usuario.rol === "estudiante" || req.usuario.rol === "profesor";
    const rawUsuario = esLector
      ? String(req.usuario._id)
      : (req.body.usuario || req.body.usuarioId);

    const parse = prestamoCreateSchema.safeParse({
      ejemplar: rawEjemplar,
      usuario: rawUsuario
    });

    if (!parse.success) {
      return next(parse.error);
    }

    const { ejemplar: ejemplarId, usuario: usuarioId } = parse.data;

    if (!mongoose.isValidObjectId(ejemplarId) || !mongoose.isValidObjectId(usuarioId)) {
      return res.status(400).json({
        message: "Identificador de ejemplar o usuario no válido"
      });
    }

    // 1. Validar existencia del usuario y su estado activo
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    if (usuario.estado !== "activo") {
      return res.status(400).json({
        message: "El usuario no está activo o se encuentra suspendido"
      });
    }

    // 2. Verificar existencia previa del ejemplar
    const ejemplarExiste = await Ejemplar.findById(ejemplarId);
    if (!ejemplarExiste) {
      return res.status(404).json({
        message: "Ejemplar no encontrado"
      });
    }

    // 3. Operación atómica con findOneAndUpdate para evitar condiciones de carrera
    const ejemplarActualizado = await Ejemplar.findOneAndUpdate(
      { _id: ejemplarId, estado: "disponible" },
      { $set: { estado: "prestado" } },
      { returnDocument: "after" }
    );

    if (!ejemplarActualizado) {
      return res.status(409).json({
        message: "El ejemplar no está disponible para préstamo"
      });
    }

    // 4. Plazo provisional de 7 días
    const fechaPrestamo = new Date();
    const fechaVencEsperada = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const nuevoPrestamo = await Prestamo.create({
      ejemplar: ejemplarId,
      usuario: usuarioId,
      fechaPrestamo,
      fechaVencEsperada,
      estado: "activo",
      renovaciones: []
    });

    res.status(201).json(nuevoPrestamo);
  } catch (error) {
    next(error);
  }
};

/**
 * Registrar devolución de un préstamo.
 * PATCH /api/prestamos/:id/devolver  (admin, bibliotecario)
 */
const devolverPrestamo = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID de préstamo inválido" });
    }

    // Atómico: solo se devuelve una vez (evita doble devolución)
    const prestamo = await Prestamo.findOneAndUpdate(
      { _id: id, estado: { $in: ["activo", "vencido"] } },
      { $set: { estado: "devuelto", fechaDevolucionReal: new Date() } },
      { returnDocument: "after" }
    );

    if (!prestamo) {
      const existe = await Prestamo.exists({ _id: id });
      return existe
        ? res.status(409).json({ message: "El préstamo ya fue devuelto" })
        : res.status(404).json({ message: "Préstamo no encontrado" });
    }

    await Ejemplar.findByIdAndUpdate(prestamo.ejemplar, { $set: { estado: "disponible" } });

    res.json(prestamo);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPrestamos,
  createPrestamo,
  devolverPrestamo
};