const mongoose = require("mongoose");

const ESTADOS_EJEMPLAR = ["disponible", "prestado", "reservado", "danado", "extraviado"];

const ejemplarSchema = new mongoose.Schema(
  {
    libro: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Libro",
      required: [true, "El libro asociado es obligatorio"]
    },
    codigoBarras: {
      type: String,
      required: [true, "El código de barras es obligatorio"],
      unique: true,
      trim: true
    },
    estado: {
      type: String,
      enum: {
        values: ESTADOS_EJEMPLAR,
        message: "{VALUE} no es un estado de ejemplar válido"
      },
      default: "disponible"
    },
    ubicacion: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

const Ejemplar = mongoose.model("Ejemplar", ejemplarSchema);

module.exports = Ejemplar;
module.exports.ESTADOS_EJEMPLAR = ESTADOS_EJEMPLAR;
