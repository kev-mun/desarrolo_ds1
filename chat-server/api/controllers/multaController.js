const mongoose = require("mongoose");
const Multa = require("../models/Multa");
const { ESTADOS_MULTA } = require("../models/Multa");

const esLector = (usuario) => usuario.rol === "estudiante" || usuario.rol === "profesor";

/**
 * GET /api/multas
 * Los lectores ven solo las suyas; el personal ve todas (filtros ?usuario= y ?estado=).
 */
const getMultas = async (req, res, next) => {
  try {
    const filter = {};

    if (esLector(req.usuario)) {
      filter.usuario = req.usuario._id;
    } else if (req.query.usuario) {
      if (!mongoose.isValidObjectId(req.query.usuario)) {
        return res.status(400).json({ message: "ID de usuario inválido" });
      }
      filter.usuario = req.query.usuario;
    }

    if (req.query.estado && ESTADOS_MULTA.includes(req.query.estado)) {
      filter.estado = req.query.estado;
    }

    const multas = await Multa.find(filter)
      .populate({ path: "ejemplar", populate: { path: "libro", select: "titulo autor" } })
      .populate("usuario", "nombre documento correo")
      .sort({ createdAt: -1 });

    const totalPendiente = multas.filter((m) => m.estado === "pendiente").reduce((s, m) => s + m.monto, 0);

    res.json({ data: multas, count: multas.length, totalPendiente });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/multas/:id/pagar  (pago simulado)
 * El dueño de la multa o el personal pueden registrar el pago.
 */
const pagarMulta = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID de multa inválido" });
    }

    const multa = await Multa.findById(id);
    if (!multa) {
      return res.status(404).json({ message: "Multa no encontrada" });
    }

    if (esLector(req.usuario) && String(multa.usuario) !== String(req.usuario._id)) {
      return res.status(403).json({ message: "No puede pagar la multa de otro usuario" });
    }

    const pagada = await Multa.findOneAndUpdate(
      { _id: id, estado: "pendiente" },
      { $set: { estado: "pagada", fechaPago: new Date() } },
      { returnDocument: "after" }
    );

    if (!pagada) {
      return res.status(409).json({ message: "La multa ya fue pagada" });
    }

    res.json(pagada);
  } catch (error) {
    next(error);
  }
};

module.exports = { getMultas, pagarMulta };
