const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");
const { ROLES } = require("../models/Usuario");
const { JWT_SECRET } = require("../middleware/auth");
const { z } = require("zod");

const loginSchema = z.object({
  correo: z.string({ error: "El correo es obligatorio" }).email("Correo electrónico inválido"),
  password: z.string({ error: "La contraseña es obligatoria" }).min(1, "La contraseña es obligatoria")
});

const registerSchema = z.object({
  nombre: z.string({ error: "El nombre es obligatorio" }).min(1, "El nombre es obligatorio").trim(),
  documento: z.string({ error: "El documento es obligatorio" }).min(1, "El documento es obligatorio").trim(),
  correo: z.string({ error: "El correo es obligatorio" }).email("Correo electrónico inválido").trim().toLowerCase(),
  password: z.string({ error: "La contraseña es obligatoria" }).min(6, "La contraseña debe tener al menos 6 caracteres"),
  rol: z.enum(ROLES, { error: "Rol inválido" }).optional().default("estudiante")
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

const register = async (req, res, next) => {
  try {
    const parseResult = registerSchema.safeParse(req.body || {});
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

    const { nombre, documento, correo, password, rol } = parseResult.data;

    // Verificar si el documento ya existe
    const docExistente = await Usuario.findOne({ documento });
    if (docExistente) {
      return res.status(409).json({
        message: "El documento ya se encuentra registrado"
      });
    }

    // Verificar si el correo ya existe
    const correoExistente = await Usuario.findOne({ correo });
    if (correoExistente) {
      return res.status(409).json({
        message: "El correo electrónico ya se encuentra registrado"
      });
    }

    const nuevoUsuario = new Usuario({
      nombre,
      documento,
      correo,
      password,
      rol: rol || "estudiante",
      estado: "activo",
      permisos: []
    });

    await nuevoUsuario.save();

    const usuarioRes = nuevoUsuario.toObject();
    delete usuarioRes.password;

    res.status(201).json({
      message: "Usuario registrado exitosamente",
      usuario: usuarioRes
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  register
};
