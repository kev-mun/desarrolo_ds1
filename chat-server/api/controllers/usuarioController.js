const mongoose = require("mongoose");
const Usuario = require("../models/Usuario");
const { ROLES, ESTADOS } = require("../models/Usuario");
const { z } = require("zod");

/**
 * Obtener lista paginada de usuarios.
 * GET /api/usuarios
 */
const getUsuarios = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    let limit = parseInt(req.query.limit, 10) || 10;
    if (limit < 1) limit = 10;
    if (limit > 50) limit = 50;

    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.rol && ROLES.includes(req.query.rol)) {
      filter.rol = req.query.rol;
    }
    if (req.query.estado && ESTADOS.includes(req.query.estado)) {
      filter.estado = req.query.estado;
    }

    const total = await Usuario.countDocuments(filter);
    const data = await Usuario.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const pages = Math.ceil(total / limit) || 1;

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener detalle de usuario por ID.
 * GET /api/usuarios/:id
 */
const getUsuarioById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID de usuario inválido" });
    }

    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(usuario);
  } catch (error) {
    next(error);
  }
};

/**
 * Crear usuario (solo admin y bibliotecario).
 * POST /api/usuarios
 */
const createUsuario = async (req, res, next) => {
  try {
    const body = req.body || {};
    const camposObligatorios = ["nombre", "documento", "correo", "password", "rol"];
    const camposFaltantes = camposObligatorios.filter(
      (campo) => body[campo] === undefined || body[campo] === null || String(body[campo]).trim() === ""
    );

        if (camposFaltantes.length > 0) {
      return res.status(400).json({
        message: "Datos inválidos",
        errores: camposFaltantes.map((campo) => ({
          campo,
          mensaje: `El campo ${campo} es obligatorio`
        })),
        camposFaltantes
      });
    }

    if (!ROLES.includes(body.rol)) {
      return res.status(400).json({
        message: "Datos inválidos",
        errores: [
          {
            campo: "rol",
            mensaje: `El rol '${body.rol}' no es válido. Roles permitidos: ${ROLES.join(", ")}`
          }
        ]
      });
    }

    // Verificar si documento o correo ya existen
    const docExistente = await Usuario.findOne({ documento: String(body.documento).trim() });
    if (docExistente) {
      return res.status(409).json({
        message: "El documento ya se encuentra registrado"
      });
    }

    const correoExistente = await Usuario.findOne({ correo: String(body.correo).trim().toLowerCase() });
    if (correoExistente) {
      return res.status(409).json({
        message: "El correo electrónico ya se encuentra registrado"
      });
    }

    const nuevoUsuario = new Usuario({
      nombre: String(body.nombre).trim(),
      documento: String(body.documento).trim(),
      correo: String(body.correo).trim().toLowerCase(),
      password: body.password,
      rol: body.rol,
      estado: body.estado || "activo",
      permisos: Array.isArray(body.permisos) ? body.permisos : []
    });

    await nuevoUsuario.save();

    const usuarioRes = nuevoUsuario.toObject();
    delete usuarioRes.password;

    res.status(201).json(usuarioRes);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar usuario.
 * PUT /api/usuarios/:id
 */
const updateUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID de usuario inválido" });
    }

    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const { nombre, documento, correo, password, rol, estado, permisos } = req.body;

    if (documento && documento !== usuario.documento) {
      const docExistente = await Usuario.findOne({ documento: String(documento).trim() });
      if (docExistente) {
        return res.status(409).json({ message: "El documento ya se encuentra registrado" });
      }
      usuario.documento = String(documento).trim();
    }

    if (correo && correo.toLowerCase() !== usuario.correo) {
      const correoExistente = await Usuario.findOne({ correo: String(correo).trim().toLowerCase() });
      if (correoExistente) {
        return res.status(409).json({ message: "El correo electrónico ya se encuentra registrado" });
      }
      usuario.correo = String(correo).trim().toLowerCase();
    }

    if (nombre !== undefined) usuario.nombre = String(nombre).trim();
    if (rol !== undefined) {
      if (!ROLES.includes(rol)) {
        return res.status(400).json({ message: `Rol inválido. Opciones: ${ROLES.join(", ")}` });
      }
      usuario.rol = rol;
    }
    if (estado !== undefined) {
      if (!ESTADOS.includes(estado)) {
        return res.status(400).json({ message: `Estado inválido. Opciones: ${ESTADOS.join(", ")}` });
      }
      usuario.estado = estado;
    }
    if (Array.isArray(permisos)) usuario.permisos = permisos;
    if (password) usuario.password = password; // Se hasheará en el pre('save')

    await usuario.save();

    const usuarioRes = usuario.toObject();
    delete usuarioRes.password;

    res.json(usuarioRes);
  } catch (error) {
    next(error);
  }
};

/**
 * Cambiar estado de usuario (activo/suspendido).
 * PATCH /api/usuarios/:id/estado
 */
const updateEstadoUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID de usuario inválido" });
    }

    const { estado } = req.body;
    if (!estado || !ESTADOS.includes(estado)) {
      return res.status(400).json({
        message: `Estado inválido. Opciones: ${ESTADOS.join(", ")}`
      });
    }

    const usuario = await Usuario.findByIdAndUpdate(
      id,
      { $set: { estado } },
      { returnDocument: "after", runValidators: true }
    );

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({
      message: `Estado actualizado a '${estado}'`,
      usuario
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Asignar o modificar permisos de una editorial (solo admin).
 * PUT /api/usuarios/:id/permisos
 */
const updatePermisosUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "ID de usuario inválido" });
    }

    const { permisos } = req.body;
    if (!Array.isArray(permisos)) {
      return res.status(400).json({
        message: "El campo permisos debe ser un arreglo de cadenas"
      });
    }

    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    usuario.permisos = permisos;
    await usuario.save();

    res.json({
      message: "Permisos actualizados correctamente",
      usuario
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  updateEstadoUsuario,
  updatePermisosUsuario
};
