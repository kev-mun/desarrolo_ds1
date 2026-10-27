const errorHandler = (err, req, res, next) => {
  if (err.name === "ValidationError") {
    const errores = Object.entries(err.errors || {}).map(([field, e]) => ({ campo: field, mensaje: e.message }));
    return res.status(400).json({
      message: "Datos inválidos",
      errores: errores.length > 0 ? errores : [{ campo: "general", mensaje: err.message }]
    });
  }

  // Errores de validación de zod (v4 usa "issues"; versiones anteriores "errors")
  if (err.name === "ZodError" || Array.isArray(err.issues)) {
    const lista = err.issues || err.errors || [];
    const errores = lista.map((e) => ({
      campo: (e.path || []).join(".") || "body",
      mensaje: e.message
    }));
    return res.status(400).json({
      message: "Datos inválidos",
      errores
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      message: `Formato de identificador no válido: ${err.value}`
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "campo";
    return res.status(409).json({
      message: `Conflicto: ya existe un registro con ese ${field}`
    });
  }

  if (err.status && err.message) {
    return res.status(err.status).json({
      message: err.message
    });
  }

  console.error("Error no controlado:", err);
  res.status(500).json({
    message: "Error interno del servidor"
  });
};

module.exports = errorHandler;