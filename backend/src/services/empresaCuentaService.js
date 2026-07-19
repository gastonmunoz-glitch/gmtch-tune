const EmpresaCuenta = require("../models/EmpresaCuenta");

const SLUG_EMPRESA_GMTCH = "gmtch";

const DATOS_EMPRESA_GMTCH = Object.freeze({
  nombre: "Gmtch Tune",
  slug: SLUG_EMPRESA_GMTCH,
  plan: "INTERNO",
  estado: "ACTIVA",
  timezone: "America/Santiago",
  moneda: "CLP",
  idioma: "es",
  branding: {},
  settings: {},
});

async function obtenerEmpresaGmtch() {
  return EmpresaCuenta.findOne({
    where: { slug: SLUG_EMPRESA_GMTCH },
  });
}

async function asegurarEmpresaPrincipalGmtch() {
  const empresaExistente = await obtenerEmpresaGmtch();

  if (empresaExistente) {
    return empresaExistente;
  }

  const [empresa] = await EmpresaCuenta.findOrCreate({
    where: { slug: SLUG_EMPRESA_GMTCH },
    defaults: DATOS_EMPRESA_GMTCH,
  });

  return empresa;
}

module.exports = {
  asegurarEmpresaPrincipalGmtch,
  obtenerEmpresaGmtch,
};
