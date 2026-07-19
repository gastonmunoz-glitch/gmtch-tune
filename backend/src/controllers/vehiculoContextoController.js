const {
  consultarContextoPatente,
} = require("../services/vehiculoContextoService");
const { PatenteInvalidaError } = require("../utils/patente");

const obtenerContextoPatente = async (req, res) => {
  const empresaId = String(req.auth?.empresaId || "").trim();

  if (!empresaId) {
    return res.status(503).json({
      error: "EMPRESA_NO_DISPONIBLE",
      codigo: "EMPRESA_NO_DISPONIBLE",
      message: "No fue posible determinar la empresa de la sesión.",
    });
  }

  try {
    const contexto = await consultarContextoPatente({
      patente: req.params.patente,
      empresaId,
      rol: req.auth?.rol || req.usuario?.rol,
    });

    return res.status(200).json(contexto);
  } catch (error) {
    if (
      error instanceof PatenteInvalidaError ||
      error?.codigo === "PATENTE_INVALIDA"
    ) {
      return res.status(400).json({
        error: "PATENTE_INVALIDA",
        codigo: "PATENTE_INVALIDA",
        message: error.message,
      });
    }

    if (error?.codigo === "EMPRESA_NO_DISPONIBLE") {
      return res.status(503).json({
        error: "EMPRESA_NO_DISPONIBLE",
        codigo: "EMPRESA_NO_DISPONIBLE",
        message: "No fue posible determinar la empresa de la sesión.",
      });
    }

    console.error("ERROR CONTEXTO INTERNO POR PATENTE:", error);

    return res.status(500).json({
      error: "CONTEXTO_PATENTE_ERROR",
      codigo: "CONTEXTO_PATENTE_ERROR",
      message: "No se pudo consultar el historial de la patente.",
    });
  }
};

module.exports = {
  obtenerContextoPatente,
};
