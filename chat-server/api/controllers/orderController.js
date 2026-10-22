const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");

/**
 * Crea un nuevo pedido calculando y validando precios y totales de forma segura en el servidor.
 * POST /api/orders
 */
const createOrder = async (req, res, next) => {
  try {
    const { customer, items } = req.body;

    // 1. Validar datos del cliente
    if (!customer || typeof customer !== "object") {
      return res.status(400).json({
        message: "Los datos del cliente son obligatorios."
      });
    }

    const { name, address, phone, email = "", notes = "" } = customer;

    if (!name || String(name).trim() === "") {
      return res.status(400).json({ message: "El nombre del cliente es obligatorio." });
    }
    if (!address || String(address).trim() === "") {
      return res.status(400).json({ message: "La dirección de entrega es obligatoria." });
    }
    if (!phone || String(phone).trim() === "") {
      return res.status(400).json({ message: "El teléfono de contacto es obligatorio." });
    }

    // 2. Validar lista de productos
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "El pedido debe contener al menos un producto."
      });
    }

    const sanitizedItems = [];
    let calculatedTotal = 0;
    const productsToUpdateStock = [];

    for (const item of items) {
      const productId = item.productId || item._id || item.id;
      const quantity = Math.floor(Number(item.quantity));

      if (!productId || !mongoose.isValidObjectId(productId)) {
        return res.status(400).json({
          message: `El identificador del producto '${productId}' no es válido.`
        });
      }

      if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({
          message: "La cantidad de cada producto debe ser un número entero mayor a 0."
        });
      }

      // Consultar el producto real en la base de datos (seguridad contra alteración de precios en el cliente)
      const dbProduct = await Product.findById(productId);
      if (!dbProduct) {
        return res.status(404).json({
          message: `El producto con ID '${productId}' no existe en el catálogo.`
        });
      }

      // Validar stock disponible
      if (typeof dbProduct.stock === "number" && dbProduct.stock < quantity) {
        return res.status(400).json({
          message: `Stock insuficiente para "${dbProduct.name}". Disponibles: ${dbProduct.stock}, Solicitados: ${quantity}.`
        });
      }

      const itemPrice = Number(dbProduct.price) || 0;
      const itemSubtotal = itemPrice * quantity;
      calculatedTotal += itemSubtotal;

      sanitizedItems.push({
        product: dbProduct._id,
        name: dbProduct.name,
        price: itemPrice,
        quantity: quantity,
        image: dbProduct.image || ""
      });

      productsToUpdateStock.push({
        productDoc: dbProduct,
        quantity
      });
    }

    // 3. Crear el documento del Pedido en MongoDB
    const newOrder = await Order.create({
      customer: {
        name: String(name).trim(),
        address: String(address).trim(),
        phone: String(phone).trim(),
        email: String(email).trim(),
        notes: String(notes).trim()
      },
      items: sanitizedItems,
      total: calculatedTotal,
      status: "completado"
    });

    // 4. Descontar el stock de los productos vendidos
    for (const { productDoc, quantity } of productsToUpdateStock) {
      if (typeof productDoc.stock === "number") {
        productDoc.stock = Math.max(0, productDoc.stock - quantity);
        await productDoc.save();
      }
    }

    res.status(201).json({
      message: "Pedido registrado con éxito",
      order: newOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene el listado de pedidos registrados.
 * GET /api/orders
 */
const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({
      data: orders,
      count: orders.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene el detalle de un pedido por su ID o número de orden.
 * GET /api/orders/:id
 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let order = null;
    if (mongoose.isValidObjectId(id)) {
      order = await Order.findById(id);
    }

    if (!order) {
      order = await Order.findOne({ orderNumber: id });
    }

    if (!order) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza el estado de un pedido (pendiente, completado, cancelado).
 * PATCH /api/orders/:id/status
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pendiente", "completado", "cancelado"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Estado no válido. Opciones permitidas: ${validStatuses.join(", ")}`
      });
    }

    let order = null;
    if (mongoose.isValidObjectId(id)) {
      order = await Order.findById(id);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: id });
    }

    if (!order) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    order.status = status;
    await order.save();

    res.json({
      message: `Estado del pedido actualizado a '${status}'`,
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina un pedido del sistema.
 * DELETE /api/orders/:id
 */
const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    let order = null;
    if (mongoose.isValidObjectId(id)) {
      order = await Order.findByIdAndDelete(id);
    }
    if (!order) {
      order = await Order.findOneAndDelete({ orderNumber: id });
    }

    if (!order) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    res.json({ message: "Pedido eliminado correctamente", orderId: id });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder
};
