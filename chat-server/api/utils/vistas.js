const mongoose = require("mongoose");
const Prestamo = require("../models/Prestamo");
const Ejemplar = require("../models/Ejemplar");
const Libro = require("../models/Libro");
const Usuario = require("../models/Usuario");
const Reserva = require("../models/Reserva");

/**
 * Vistas del dashboard (MongoDB):
 *  - Vistas NORMALES (se calculan en cada consulta): vista_morosos, vista_mas_renovados.
 *  - Vista MATERIALIZADA (resultado guardado en una colección y refrescado con $merge): mv_mas_prestados.
 */
const VISTA_MOROSOS = "vista_morosos";
const VISTA_MAS_RENOVADOS = "vista_mas_renovados";
const VISTA_MAS_RESERVADOS = "vista_mas_reservados";
const MV_MAS_PRESTADOS = "mv_mas_prestados";

// Agrupa un valor por préstamo -> ejemplar -> libro
const pipelinePorLibro = (acumulador, filtroFinal) => [
  { $group: { _id: "$ejemplar", total: acumulador } },
  { $lookup: { from: Ejemplar.collection.name, localField: "_id", foreignField: "_id", as: "ej" } },
  { $unwind: "$ej" },
  { $group: { _id: "$ej.libro", total: { $sum: "$total" } } },
  ...(filtroFinal ? [{ $match: filtroFinal }] : []),
  { $lookup: { from: Libro.collection.name, localField: "_id", foreignField: "_id", as: "libro" } },
  { $unwind: "$libro" },
  { $project: { _id: 1, titulo: "$libro.titulo", autor: "$libro.autor", total: 1 } },
  { $sort: { total: -1, titulo: 1 } }
];

// Reservas agrupadas por libro (las canceladas no cuentan)
const pipelineMasReservados = () => [
  { $match: { estado: { $ne: "cancelada" } } },
  { $group: { _id: "$libro", total: { $sum: 1 } } },
  { $lookup: { from: Libro.collection.name, localField: "_id", foreignField: "_id", as: "libro" } },
  { $unwind: "$libro" },
  { $project: { _id: 1, titulo: "$libro.titulo", autor: "$libro.autor", total: 1 } },
  { $sort: { total: -1, titulo: 1 } }
];

const pipelineMorosos = () => [
  {
    $match: {
      fechaDevolucionReal: null,
      estado: { $in: ["activo", "vencido"] },
      $expr: { $lt: ["$fechaVencEsperada", "$$NOW"] }
    }
  },
  { $group: { _id: "$usuario", prestamosVencidos: { $sum: 1 }, masAntiguo: { $min: "$fechaVencEsperada" } } },
  { $lookup: { from: Usuario.collection.name, localField: "_id", foreignField: "_id", as: "u" } },
  { $unwind: "$u" },
  {
    $project: {
      _id: 1,
      nombre: "$u.nombre",
      documento: "$u.documento",
      correo: "$u.correo",
      prestamosVencidos: 1,
      masAntiguo: 1
    }
  },
  { $sort: { prestamosVencidos: -1, masAntiguo: 1 } }
];

const pipelineMasPrestados = () => [
  ...pipelinePorLibro({ $sum: 1 }),
  { $addFields: { actualizadoEn: "$$NOW" } },
  { $merge: { into: MV_MAS_PRESTADOS, on: "_id", whenMatched: "replace", whenNotMatched: "insert" } }
];

async function existeColeccion(nombre) {
  const lista = await mongoose.connection.db.listCollections({ name: nombre }).toArray();
  return lista.length > 0;
}

/** Crea las vistas normales si no existen (idempotente). */
async function asegurarVistas() {
  const db = mongoose.connection.db;
  const definiciones = [
    [VISTA_MOROSOS, Prestamo.collection.name, pipelineMorosos()],
    [VISTA_MAS_RENOVADOS, Prestamo.collection.name, pipelinePorLibro({ $sum: { $size: "$renovaciones" } }, { total: { $gt: 0 } })],
    [VISTA_MAS_RESERVADOS, Reserva.collection.name, pipelineMasReservados()]
  ];
  for (const [nombre, origen, pipeline] of definiciones) {
    if (!(await existeColeccion(nombre))) {
      await db.createCollection(nombre, { viewOn: origen, pipeline });
    }
  }
}

/** Recalcula la vista materializada. */
async function refrescarMaterializadas() {
  await mongoose.connection.db.collection(MV_MAS_PRESTADOS).deleteMany({});
  await Prestamo.aggregate(pipelineMasPrestados()).exec();
}

async function leer(nombre, limite, orden) {
  let cursor = mongoose.connection.db.collection(nombre).find({});
  if (orden) cursor = cursor.sort(orden);
  return cursor.limit(limite).toArray();
}

module.exports = {
  VISTA_MOROSOS,
  VISTA_MAS_RENOVADOS,
  VISTA_MAS_RESERVADOS,
  MV_MAS_PRESTADOS,
  asegurarVistas,
  refrescarMaterializadas,
  leer
};
