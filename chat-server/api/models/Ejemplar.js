const mongoose = require("mongoose");

// "danado" y "extraviado" se conservan por compatibilidad con datos anteriores.
// "perdido" (automático a los 120 días) y "dado_de_baja" (solo personal, con motivo) son los estados nuevos.
const ESTADOS_EJEMPLAR = ["disponible", "prestado", "reservado", "perdido", "dado_de_baja", "danado", "extraviado"];

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
    },
    motivoBaja: {
      type: String,
      trim: true,
      default: "",
      required: [
        function () {
          return this.estado === "dado_de_baja";
        },
        "El motivo de la baja es obligatorio"
      ]
    },
    fechaBaja: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Ejemplar = mongoose.model("Ejemplar", ejemplarSchema);

module.exports = Ejemplar;
module.exports.ESTADOS_EJEMPLAR = ESTADOS_EJEMPLAR;
