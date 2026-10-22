const mongoose = require("mongoose");

const CATEGORIES = [
  "portatiles",
  "procesadores",
  "tarjetas-graficas",
  "memoria-ram",
  "almacenamiento",
  "placas-base",
  "fuentes-poder",
  "monitores",
  "perifericos"
];

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    price: {
      type: Number,
      required: [true, "El precio es obligatorio"],
      min: [0, "El precio no puede ser negativo"]
    },
    category: {
      type: String,
      required: [true, "La categoría es obligatoria"],
      enum: {
        values: CATEGORIES,
        message: "{VALUE} no es una categoría válida"
      }
    },
    brand: {
      type: String,
      default: ""
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, "El stock no puede ser negativo"]
    },
    image: {
      type: String,
      default: ""
    },
    specs: {
      type: Map,
      of: String,
      default: {}
    },
    featured: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

productSchema.index({ name: "text", brand: "text", description: "text" });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
module.exports.Product = Product;
module.exports.CATEGORIES = CATEGORIES;
