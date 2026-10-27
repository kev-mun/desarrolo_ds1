const mongoose = require("mongoose");

const ESTADOS_PRESTAMO = ["activo", "devuelto", "vencido"];

const renovacionSchema = new mongoose.Schema(
  {
    fecha: {
      type: Date,
      default: Date.now
    },
    nuevaFechaVenc: {
      type: Date,
      required: true
    }
  },
  { _id: false }
);

const prestamoSchema = new mongoose.Schema(
  {
    ejemplar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ejemplar",
      required: [true, "El ejemplar es obligatorio"]
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: [true, "El usuario es obligatorio"]
    },
    fechaPrestamo: {
      type: Date,
      default: Date.now
    },
    fechaVencEsperada: {
      type: Date,
      required: [true, "La fecha de vencimiento esperada es obligatoria"]
    },
    fechaDevolucionReal: {
      type: Date,
      default: null
    },
    estado: {
      type: String,
      enum: {
        values: ESTADOS_PRESTAMO,
        message: "{VALUE} no es un estado de préstamo válido"
      },
      default: "activo"
    },
    renovaciones: {
      type: [renovacionSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const Prestamo = mongoose.model("Prestamo", prestamoSchema);

module.exports = Prestamo;
module.exports.ESTADOS_PRESTAMO = ESTADOS_PRESTAMO;
