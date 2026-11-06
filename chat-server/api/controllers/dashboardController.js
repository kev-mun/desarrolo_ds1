const Prestamo = require("../models/Prestamo");
const Ejemplar = require("../models/Ejemplar");
const Multa = require("../models/Multa");
const vistas = require("../utils/vistas");

const TOP = 10;

/**
 * GET /api/dashboard  (admin, bibliotecario)
 * Morosos y recursos más renovados (vistas normales), recursos más prestados (vista materializada).
 */
const getDashboard = async (req, res, next) => {
  try {
    await vistas.asegurarVistas();

    let masPrestados = await vistas.leer(vistas.MV_MAS_PRESTADOS, TOP, { total: -1, titulo: 1 });
    if (masPrestados.length === 0) {
      await vistas.refrescarMaterializadas();
      masPrestados = await vistas.leer(vistas.MV_MAS_PRESTADOS, TOP, { total: -1, titulo: 1 });
    }

    const [morosos, masRenovados, masReservados, activos, vencidos, multasPendientes, perdidos] = await Promise.all([
      vistas.leer(vistas.VISTA_MOROSOS, TOP),
      vistas.leer(vistas.VISTA_MAS_RENOVADOS, TOP),
      vistas.leer(vistas.VISTA_MAS_RESERVADOS, TOP),
      Prestamo.countDocuments({ estado: "activo" }),
      Prestamo.countDocuments({ estado: "vencido" }),
      Multa.find({ estado: "pendiente" }).select("monto"),
      Ejemplar.countDocuments({ estado: "perdido" })
    ]);

    res.json({
      resumen: {
        prestamosActivos: activos,
        prestamosVencidos: vencidos,
        multasPendientes: multasPendientes.length,
        montoPendiente: multasPendientes.reduce((s, m) => s + m.monto, 0),
        ejemplaresPerdidos: perdidos
      },
      morosos,
      masPrestados,
      masRenovados,
      masReservados,
      actualizadoEn: masPrestados[0] ? masPrestados[0].actualizadoEn : null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dashboard/refrescar  (admin, bibliotecario)
 * Recalcula la vista materializada.
 */
const refrescarDashboard = async (req, res, next) => {
  try {
    await vistas.refrescarMaterializadas();
    res.json({ message: "Vista materializada actualizada" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, refrescarDashboard };
