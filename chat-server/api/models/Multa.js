const mongoose = require("mongoose");

const ESTADOS_MULTA = ["pendiente", "pagada"];

const multaSchema = new mongoose.Schema(
  {
    prestamo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prestamo",
      required: true,
      unique: true // un préstamo genera como máximo una multa
    },
    ejemplar: { type: mongoose.Schema.Types.ObjectId, ref: "Ejemplar", required: true },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    diasAtraso: { type: Number, required: true, min: 1 },
    monto: { type: Number, required: true, min: 0 },
    estado: {
      type: String,
      enum: { values: ESTADOS_MULTA, message: "{VALUE} no es un estado de multa válido" },
      default: "pendiente"
    },
    fechaPago: { type: Date, default: null }
  },
  { timestamps: true }
);

const Multa = mongoose.model("Multa", multaSchema);

module.exports = Multa;
module.exports.ESTADOS_MULTA = ESTADOS_MULTA;
