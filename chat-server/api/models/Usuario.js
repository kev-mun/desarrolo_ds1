const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ROLES = ["estudiante", "profesor", "bibliotecario", "admin", "editorial"];
const ESTADOS = ["activo", "suspendido"];

const usuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true
    },
    documento: {
      type: String,
      required: [true, "El documento es obligatorio"],
      unique: true,
      trim: true
    },
    correo: {
      type: String,
      required: [true, "El correo electrónico es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, "La contraseña es obligatoria"],
      select: false
    },
    rol: {
      type: String,
      required: [true, "El rol es obligatorio"],
      enum: {
        values: ROLES,
        message: "{VALUE} no es un rol válido"
      }
    },
    estado: {
      type: String,
      enum: {
        values: ESTADOS,
        message: "{VALUE} no es un estado válido"
      },
      default: "activo"
    },
    permisos: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

usuarioSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

usuarioSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Usuario = mongoose.model("Usuario", usuarioSchema);

module.exports = Usuario;
module.exports.ROLES = ROLES;
module.exports.ESTADOS = ESTADOS;
