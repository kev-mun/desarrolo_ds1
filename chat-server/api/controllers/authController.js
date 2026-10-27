const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");
const { JWT_SECRET } = require("../middleware/auth");
const { z } = require("zod");

const loginSchema = z.object({
  correo: z.string({ error: "El correo es obligatorio" }).email("Correo electrónico inválido"),
  password: z.string({ error: "La contraseña es obligatoria" }).min(1, "La contraseña es obligatoria")
});

const login = async (req, res, next) => {
  try {
    const parseResult = loginSchema.safeParse(req.body || {});
    if (!parseResult.success) {
      const lista = parseResult.error.issues || parseResult.error.errors || [];
      return res.status(400).json({
        message: "Datos inválidos",
        errores: lista.map((e) => ({
          campo: e.path.join(".") || "body",
          mensaje: e.message
        }))
      });
    }

    const { correo, password } = parseResult.data;

    const usuario = await Usuario.findOne({ correo: correo.toLowerCase() }).select("+password");
    if (!usuario) {
      return res.status(401).json({
        message: "Credenciales inválidas"
      });
    }

    const esValido = await usuario.comparePassword(password);
    if (!esValido) {
      return res.status(401).json({
        message: "Credenciales inválidas"
      });
    }

    if (usuario.estado === "suspendido") {
      return res.status(403).json({
        message: "Usuario suspendido. Comuníquese con la biblioteca"
      });
    }

    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol },
      process.env.JWT_SECRET || JWT_SECRET,
      { expiresIn: "8h" }
    );

    const usuarioRes = usuario.toObject();
    delete usuarioRes.password;

    res.json({
      token,
      usuario: usuarioRes
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login
};