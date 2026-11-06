const mongoose = require("mongoose");
const Prestamo = require("../models/Prestamo");
const Ejemplar = require("../models/Ejemplar");
const Usuario = require("../models/Usuario");
const Multa = require("../models/Multa");
const { diasHabilesAtraso, calcularMonto } = require("../utils/multas");
const { actualizarEstadosSiToca } = require("../utils/estados");
const { PLAZO_DIAS, MAX_RENOVACIONES, reservasEnEspera } = require("../utils/reglas");
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
    await actualizarEstadosSiToca();

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
    // Los lectores solo pueden pedir préstamos a su propio nombre; el personal puede indicar el usuario.
    const esLector = req.usuario.rol === "estudiante" || req.usuario.rol === "profesor";
    const rawUsuario = esLector ? String(req.usuario._id) : req.body.usuario || req.body.usuarioId;

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

    // 2. Bloqueo por multa pendiente
    const multaPendiente = await Multa.exists({ usuario: usuarioId, estado: "pendiente" });
    if (multaPendiente) {
      return res.status(403).json({
        message: "El usuario tiene una multa pendiente. Debe pagarla para solicitar nuevos préstamos"
      });
    }

    // 3. Verificar existencia previa del ejemplar
    const ejemplarExiste = await Ejemplar.findById(ejemplarId);
    if (!ejemplarExiste) {
      return res.status(404).json({
        message: "Ejemplar no encontrado"
      });
    }

    // 4. Operación atómica con findOneAndUpdate para evitar condiciones de carrera
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

    // 5. Plazo del préstamo
    const fechaPrestamo = new Date();
    const fechaVencEsperada = new Date(Date.now() + PLAZO_DIAS * 24 * 60 * 60 * 1000);

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
 * Registrar devolución de un préstamo. Si es tardía, genera la multa.
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

    // Un ejemplar prestado (o dado por perdido y luego encontrado) vuelve a estar disponible
    await Ejemplar.findOneAndUpdate(
      { _id: prestamo.ejemplar, estado: { $in: ["prestado", "perdido"] } },
      { $set: { estado: "disponible" } }
    );

    let multa = null;
    const diasAtraso = diasHabilesAtraso(prestamo.fechaVencEsperada, prestamo.fechaDevolucionReal);
    if (diasAtraso > 0) {
      multa = await Multa.create({
        prestamo: prestamo._id,
        ejemplar: prestamo.ejemplar,
        usuario: prestamo.usuario,
        diasAtraso,
        monto: calcularMonto(diasAtraso)
      });
    }

    res.json({ ...prestamo.toObject(), multa });
  } catch (error) {
    next(error);
  }
};

/**
 * Renovar un préstamo: extiende la fecha límite PLAZO_DIAS días, hasta MAX_RENOVACIONES veces.
 * POST /api/prestamos/:id/renovar  (el dueño o el personal)
 */
const renovarPrestamo = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID de préstamo inválido" });
    }

    const actual = await Prestamo.findById(id);
    if (!actual) {
      return res.status(404).json({ message: "Préstamo no encontrado" });
    }

    const esLector = req.usuario.rol === "estudiante" || req.usuario.rol === "profesor";
    if (esLector && String(actual.usuario) !== String(req.usuario._id)) {
      return res.status(403).json({ message: "No puede renovar el préstamo de otro usuario" });
    }

    if (await Multa.exists({ usuario: actual.usuario, estado: "pendiente" })) {
      return res.status(403).json({ message: "El usuario tiene una multa pendiente. Debe pagarla para renovar" });
    }

    if ((await reservasEnEspera(actual.ejemplar)) > 0) {
      return res.status(409).json({ message: "No se puede renovar: otro usuario tiene una reserva en espera" });
    }

    const ahora = new Date();
    const nuevaFecha = new Date(actual.fechaVencEsperada.getTime() + PLAZO_DIAS * 24 * 60 * 60 * 1000);

    // Atómico: solo renueva si sigue activo, no está vencido y no alcanzó el límite
    const prestamo = await Prestamo.findOneAndUpdate(
      {
        _id: id,
        estado: "activo",
        fechaVencEsperada: { $gt: ahora },
        $expr: { $lt: [{ $size: "$renovaciones" }, MAX_RENOVACIONES] }
      },
      {
        $set: { fechaVencEsperada: nuevaFecha },
        $push: { renovaciones: { fecha: ahora, nuevaFechaVenc: nuevaFecha, renovadoPor: req.usuario._id } }
      },
      { returnDocument: "after" }
    );

    if (!prestamo) {
      const ahoraDoc = await Prestamo.findById(id);
      let motivo = "El préstamo no se puede renovar";
      if (ahoraDoc.estado === "devuelto") motivo = "El préstamo ya fue devuelto";
      else if (ahoraDoc.estado === "vencido" || ahoraDoc.fechaVencEsperada <= ahora) motivo = "El préstamo está vencido: devuelva el ejemplar";
      else if (ahoraDoc.renovaciones.length >= MAX_RENOVACIONES) motivo = `Alcanzó el máximo de ${MAX_RENOVACIONES} renovaciones`;
      return res.status(409).json({ message: motivo });
    }

    res.json(prestamo);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPrestamos,
  createPrestamo,
  devolverPrestamo,
  renovarPrestamo
};
