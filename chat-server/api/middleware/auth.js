const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");

const JWT_SECRET = process.env.JWT_SECRET || "super_secreto_biblioteca_jwt_2026";

/**
 * Middleware para validar token Bearer JWT y cargar el usuario en req.usuario.
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Acceso no autorizado. Token no proporcionado"
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || JWT_SECRET);
    } catch {
      return res.status(401).json({
        message: "Token inválido o expirado"
      });
    }

    const usuario = await Usuario.findById(decoded.id);
    if (!usuario) {
      return res.status(401).json({
        message: "Usuario no encontrado"
      });
    }

    if (usuario.estado === "suspendido") {
      return res.status(403).json({
        message: "Usuario suspendido. No tiene acceso al sistema"
      });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware para restringir acceso por rol(es).
 * @param  {...string} roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        message: "Autenticación requerida"
      });
    }

    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        message: `Acceso denegado. Se requiere uno de los siguientes roles: ${roles.join(", ")}`
      });
    }

    next();
  };
};

/**
 * Middleware requirePermiso(permiso):
 * Si el usuario es admin o bibliotecario, se le permite el acceso.
 * Si el usuario tiene rol editorial y no posee el permiso, responde 403 "No cuenta con los permisos necesarios".
 * Si tiene cualquier otro rol no autorizado, responde 403 "No cuenta con los permisos necesarios".
 * @param {string} permiso
 */
const requirePermiso = (permiso) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        message: "Autenticación requerida"
      });
    }

    // Admin y bibliotecario tienen permisos totales por defecto
    if (req.usuario.rol === "admin" || req.usuario.rol === "bibliotecario") {
      return next();
    }

    // Rol editorial: valida si tiene el permiso específico
    if (req.usuario.rol === "editorial") {
      const tienePermiso = Array.isArray(req.usuario.permisos) && req.usuario.permisos.includes(permiso);
      if (!tienePermiso) {
        return res.status(403).json({
          message: "No cuenta con los permisos necesarios"
        });
      }
      return next();
    }

    // Cualquier otro rol
    return res.status(403).json({
      message: "No cuenta con los permisos necesarios"
    });
  };
};

module.exports = {
  requireAuth,
  requireRole,
  requirePermiso,
  JWT_SECRET
};
