const mongoose = require("mongoose");
const { z } = require("zod");
const Ejemplar = require("../models/Ejemplar");

const bajaSchema = z.object({
  motivo: z.string({ error: "El motivo es obligatorio" }).trim().min(3, { error: "El motivo debe tener al menos 3 caracteres" })
});

/**
 * PATCH /api/ejemplares/:id/baja  (admin, bibliotecario)
 * Da de baja un ejemplar registrando el motivo. No se puede dar de baja un ejemplar prestado.
 */
const darDeBaja = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID de ejemplar inválido" });
    }

    const parse = bajaSchema.safeParse(req.body);
    if (!parse.success) {
      return next(parse.error);
    }

    const ejemplar = await Ejemplar.findOneAndUpdate(
      { _id: id, estado: { $in: ["disponible", "reservado", "perdido", "danado", "extraviado"] } },
      { $set: { estado: "dado_de_baja", motivoBaja: parse.data.motivo, fechaBaja: new Date() } },
      { returnDocument: "after" }
    );

    if (!ejemplar) {
      const actual = await Ejemplar.findById(id);
      if (!actual) return res.status(404).json({ message: "Ejemplar no encontrado" });
      return res.status(409).json({
        message:
          actual.estado === "dado_de_baja"
            ? "El ejemplar ya está dado de baja"
            : "No se puede dar de baja un ejemplar que está prestado"
      });
    }

    res.json({ message: "Ejemplar dado de baja", ejemplar });
  } catch (error) {
    next(error);
  }
};

module.exports = { darDeBaja };
