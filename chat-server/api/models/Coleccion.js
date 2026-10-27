const mongoose = require("mongoose");

const coleccionSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre de la colección es obligatorio"],
      unique: true,
      trim: true
    },
    descripcion: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

const Coleccion = mongoose.model("Coleccion", coleccionSchema);

module.exports = Coleccion;
