const jwt = require("jsonwebtoken");
const Usuario = require("../api/models/Usuario");
const { JWT_SECRET } = require("../api/middleware/auth");

const createTestUser = async (overrides = {}) => {
  const defaults = {
    nombre: "Usuario Test",
    documento: "DOC-" + Math.random().toString(36).substring(2, 8),
    correo: "user" + Math.random().toString(36).substring(2, 8) + "@test.com",
    password: "Password123",
    rol: "estudiante",
    estado: "activo",
    permisos: []
  };

  const user = new Usuario({ ...defaults, ...overrides });
  await user.save();
  return user;
};

const getTestToken = (user) => {
  return jwt.sign(
    { id: user._id, rol: user.rol },
    process.env.JWT_SECRET || JWT_SECRET,
    { expiresIn: "8h" }
  );
};

module.exports = {
  createTestUser,
  getTestToken
};
