const mongoose = require("mongoose");

const libroSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: [true, "El título es obligatorio"],
      trim: true
    },
    autor: {
      type: String,
      required: [true, "El autor es obligatorio"],
      trim: true
    },
    isbn: {
      type: String,
      required: [true, "El ISBN es obligatorio"],
      unique: true,
      trim: true
    },
    editorial: {
      type: String,
      required: [true, "La editorial es obligatoria"],
      trim: true
    },
    anio: {
      type: Number,
      required: [true, "El año de publicación es obligatorio"]
    },
    categoria: {
      type: String,
      required: [true, "La categoría es obligatoria"],
      trim: true
    },
    coleccion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coleccion",
      default: null
    },
    portada: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

libroSchema.index({
  titulo: "text",
  autor: "text",
  isbn: "text",
  categoria: "text"
});

const Libro = mongoose.model("Libro", libroSchema);

module.exports = Libro;
