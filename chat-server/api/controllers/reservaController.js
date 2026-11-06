const mongoose = require("mongoose");
const { z } = require("zod");
const Reserva = require("../models/Reserva");
const { ESTADOS_RESERVA } = require("../models/Reserva");
const Libro = require("../models/Libro");
const Ejemplar = require("../models/Ejemplar");
const Usuario = require("../models/Usuario");
const Prestamo = require("../models/Prestamo");
const Multa = require("../models/Multa");
const { PLAZO_DIAS } = require("../utils/reglas");
const { liberarYReasignar } = require("../utils/reservas");
const { actualizarEstadosSiToca } = require("../utils/estados");

const esLector = (u) => u.rol === "estudiante" || u.rol === "profesor";

const reservaSchema = z.object({
  libro: z.string({ error: "El libro es obligatorio" })
});

const posicionDe = (r) =>
  Reserva.countDocuments({ libro: r.libro._id || r.libro, estado: "en_espera", createdAt: { $lte: r.createdAt } });

/**
 * POST /api/reservas  { libro }
 * Solo se reservan libros cuyos ejemplares están todos prestados. Los lectores reservan a su nombre.
 */
const crearReserva = async (req, res, next) => {
  try {
    const parse = reservaSchema.safeParse({ libro: req.body.libro || req.body.libroId });
    if (!parse.success) return next(parse.error);
    const libroId = parse.data.libro;

    const rawUsuario = esLector(req.usuario) ? String(req.usuario._id) : req.body.usuario || req.body.usuarioId || String(req.usuario._id);

    if (!mongoose.isValidObjectId(libroId) || !mongoose.isValidObjectId(rawUsuario)) {
      return res.status(400).json({ message: "Identificador de libro o usuario no válido" });
    }

    const libro = await Libro.findById(libroId);
    if (!libro) return res.status(404).json({ message: "Libro no encontrado" });

    const usuario = await Usuario.findById(rawUsuario);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
    if (usuario.estado !== "activo") {
      return res.status(400).json({ message: "El usuario no está activo o se encuentra suspendido" });
    }

    if (await Multa.exists({ usuario: usuario._id, estado: "pendiente" })) {
      return res.status(403).json({ message: "El usuario tiene una multa pendiente. Debe pagarla para reservar" });
    }

    const totales = await Ejemplar.countDocuments({ libro: libroId, estado: { $ne: "dado_de_baja" } });
    if (totales === 0) {
      return res.status(409).json({ message: "El libro no tiene ejemplares para reservar" });
    }
    if (await Ejemplar.exists({ libro: libroId, estado: "disponible" })) {
      return res.status(409).json({ message: "El libro tiene ejemplares disponibles: puede solicitarse directamente" });
    }

    if (await Reserva.exists({ libro: libroId, usuario: usuario._id, estado: { $in: ["en_espera", "lista"] } })) {
      return res.status(409).json({ message: "El usuario ya tiene una reserva activa de este libro" });
    }

    const reserva = await Reserva.create({ libro: libroId, usuario: usuario._id });
    const posicion = await posicionDe(reserva);

    res.status(201).json({ ...reserva.toObject(), posicion });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reservas
 * Los lectores ven solo las suyas; el personal ve todas (?usuario=, ?estado=).
 */
const getReservas = async (req, res, next) => {
  try {
    await actualizarEstadosSiToca();

    const filter = {};
    if (esLector(req.usuario)) {
      filter.usuario = req.usuario._id;
    } else if (req.query.usuario) {
      if (!mongoose.isValidObjectId(req.query.usuario)) {
        return res.status(400).json({ message: "ID de usuario inválido" });
      }
      filter.usuario = req.query.usuario;
    }
    if (req.query.estado && ESTADOS_RESERVA.includes(req.query.estado)) {
      filter.estado = req.query.estado;
    }

    const reservas = await Reserva.find(filter)
      .populate("libro", "titulo autor")
      .populate("usuario", "nombre documento correo")
      .sort({ createdAt: -1 });

    const data = [];
    for (const r of reservas) {
      const obj = r.toObject();
      if (r.estado === "en_espera") obj.posicion = await posicionDe(r);
      data.push(obj);
    }

    res.json({ data, count: data.length });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/reservas/:id/cancelar  (el dueño o el personal)
 */
const cancelarReserva = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "ID de reserva inválido" });

    const actual = await Reserva.findById(id);
    if (!actual) return res.status(404).json({ message: "Reserva no encontrada" });
    if (esLector(req.usuario) && String(actual.usuario) !== String(req.usuario._id)) {
      return res.status(403).json({ message: "No puede cancelar la reserva de otro usuario" });
    }

    const previa = await Reserva.findOneAndUpdate(
      { _id: id, estado: { $in: ["en_espera", "lista"] } },
      { $set: { estado: "cancelada" } },
      { returnDocument: "before" }
    );
    if (!previa) return res.status(409).json({ message: "La reserva ya no se puede cancelar" });

    if (previa.estado === "lista") await liberarYReasignar(previa);

    res.json({ ...previa.toObject(), estado: "cancelada" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/reservas/:id/prestar
 * Convierte una reserva lista en préstamo del ejemplar apartado (antes de que venza el plazo).
 */
const prestarReserva = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "ID de reserva inválido" });

    const reserva = await Reserva.findById(id);
    if (!reserva) return res.status(404).json({ message: "Reserva no encontrada" });
    if (esLector(req.usuario) && String(reserva.usuario) !== String(req.usuario._id)) {
      return res.status(403).json({ message: "No puede usar la reserva de otro usuario" });
    }

    if (reserva.estado !== "lista") {
      return res.status(409).json({
        message: reserva.estado === "en_espera" ? "La reserva todavía está en la cola de espera" : `La reserva está ${reserva.estado}`
      });
    }
    if (reserva.fechaLimite <= new Date()) {
      return res.status(409).json({ message: "El plazo para pedir el préstamo de esta reserva venció" });
    }
    if (await Multa.exists({ usuario: reserva.usuario, estado: "pendiente" })) {
      return res.status(403).json({ message: "El usuario tiene una multa pendiente. Debe pagarla para solicitar el préstamo" });
    }

    const cumplida = await Reserva.findOneAndUpdate({ _id: id, estado: "lista" }, { $set: { estado: "cumplida" } }, { returnDocument: "after" });
    if (!cumplida) return res.status(409).json({ message: "La reserva ya fue utilizada" });

    const ejemplar = await Ejemplar.findOneAndUpdate(
      { _id: reserva.ejemplar, estado: "reservado" },
      { $set: { estado: "prestado" } },
      { returnDocument: "after" }
    );
    if (!ejemplar) {
      await Reserva.updateOne({ _id: id }, { $set: { estado: "lista" } });
      return res.status(409).json({ message: "El ejemplar apartado ya no está disponible" });
    }

    const prestamo = await Prestamo.create({
      ejemplar: ejemplar._id,
      usuario: reserva.usuario,
      fechaVencEsperada: new Date(Date.now() + PLAZO_DIAS * 24 * 60 * 60 * 1000),
      estado: "activo",
      renovaciones: []
    });

    res.status(201).json(prestamo);
  } catch (error) {
    next(error);
  }
};

module.exports = { crearReserva, getReservas, cancelarReserva, prestarReserva };
