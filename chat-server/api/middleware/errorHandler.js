const errorHandler = (err, req, res, next) => {
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({
      message: "Datos inválidos",
      errors: errors.length > 0 ? errors : [err.message]
    });
  }

  console.error("Error no controlado:", err);
  res.status(500).json({
    message: "Error interno del servidor"
  });
};

module.exports = errorHandler;
