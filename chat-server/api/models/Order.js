const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "El ID del producto es obligatorio"]
    },
    name: {
      type: String,
      required: [true, "El nombre del producto es obligatorio"],
      trim: true
    },
    price: {
      type: Number,
      required: [true, "El precio es obligatorio"],
      min: [0, "El precio no puede ser negativo"]
    },
    quantity: {
      type: Number,
      required: [true, "La cantidad es obligatoria"],
      min: [1, "La cantidad mínima es 1"],
      default: 1
    },
    image: {
      type: String,
      default: ""
    }
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre del cliente es obligatorio"],
      trim: true
    },
    address: {
      type: String,
      required: [true, "La dirección de entrega es obligatoria"],
      trim: true
    },
    phone: {
      type: String,
      required: [true, "El teléfono de contacto es obligatorio"],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      default: ""
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true
    },
    customer: {
      type: customerSchema,
      required: [true, "Los datos del cliente son obligatorios"]
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "El pedido debe contener al menos un producto"
      }
    },
    total: {
      type: Number,
      required: [true, "El total es obligatorio"],
      min: [0, "El total no puede ser negativo"]
    },
    status: {
      type: String,
      enum: ["pendiente", "completado", "cancelado"],
      default: "completado"
    }
  },
  {
    timestamps: true
  }
);

// Generar número de orden legible antes de guardar si no fue provisto
orderSchema.pre("validate", function () {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
