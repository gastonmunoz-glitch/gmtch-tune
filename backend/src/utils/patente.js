const LONGITUD_MINIMA_PATENTE = 4;
const LONGITUD_MAXIMA_PATENTE = 10;

class PatenteInvalidaError extends Error {
  constructor(message) {
    super(message);
    this.name = "PatenteInvalidaError";
    this.codigo = "PATENTE_INVALIDA";
    this.statusCode = 400;
  }
}

const SEPARADORES_PATENTE = /[\s.\-\u2010-\u2015\u2212]/gu;
const CARACTERES_PATENTE_VALIDOS = /^[A-Z0-9]+$/;

const normalizarPatente = (valor) => {
  if (valor === null || valor === undefined) {
    throw new PatenteInvalidaError("Debes ingresar una patente.");
  }

  const patenteOriginal = String(valor).normalize("NFKC").trim();

  if (!patenteOriginal) {
    throw new PatenteInvalidaError("Debes ingresar una patente.");
  }

  const patenteNormalizada = patenteOriginal
    .toUpperCase()
    .replace(SEPARADORES_PATENTE, "");

  if (!CARACTERES_PATENTE_VALIDOS.test(patenteNormalizada)) {
    throw new PatenteInvalidaError(
      "La patente solo puede contener letras, numeros, espacios, puntos o guiones."
    );
  }

  if (
    patenteNormalizada.length < LONGITUD_MINIMA_PATENTE ||
    patenteNormalizada.length > LONGITUD_MAXIMA_PATENTE
  ) {
    throw new PatenteInvalidaError(
      `La patente debe tener entre ${LONGITUD_MINIMA_PATENTE} y ${LONGITUD_MAXIMA_PATENTE} caracteres.`
    );
  }

  return {
    patenteOriginal,
    patenteNormalizada,
  };
};

module.exports = {
  LONGITUD_MINIMA_PATENTE,
  LONGITUD_MAXIMA_PATENTE,
  PatenteInvalidaError,
  normalizarPatente,
};
