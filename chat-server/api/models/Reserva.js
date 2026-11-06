const mongoose = require("mongoose");

// en_espera: en la cola · lista: ejemplar apartado, con plazo para pedir el préstamo
// cumplida: se convirtió en préstamo · vencida: no pidió el préstamo a tiempo · cancelada
const ESTADOS_RESERVA = ["en_espera", "lista", "cumplida", "vencida", "cancelada"];

const reservaSchema = new mongoose.Schema(
  {
    libro: { type: mongoose.Schema.Types.ObjectId, ref: "Libro", required: [true, "El libro es obligatorio"] },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: [true, "El usuario es obligatorio"] },
    estado: {
      type: String,
      enum: { values: ESTADOS_RESERVA, message: "{VALUE} no es un estado de reserva válido" },
      default: "en_espera"
    },
    ejemplar: { type: mongoose.Schema.Types.ObjectId, ref: "Ejemplar", default: null },
    fechaLimite: { type: Date, default: null }
  },
  { timestamps: true }
);

const Reserva = mongoose.model("Reserva", reservaSchema);

module.exports = Reserva;
module.exports.ESTADOS_RESERVA = ESTADOS_RESERVA;
