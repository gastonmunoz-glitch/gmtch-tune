const bloquearUploadsPublicos = (req, res, next) => {
  const ruta = String(req.path || "").toLowerCase();
  if (ruta === "/uploads" || ruta.startsWith("/uploads/")) {
    return res.status(404).json({
      error: "Ruta no encontrada",
    });
  }

  return next();
};

module.exports = { bloquearUploadsPublicos };
