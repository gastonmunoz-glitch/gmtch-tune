const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "uploads", "ecu");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const limpiarNombre = (nombreOriginal) => {
  const ext = path.extname(nombreOriginal || "").toLowerCase();
  const base = path
    .basename(nombreOriginal || "archivo_ecu", ext)
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 80);

  return `${Date.now()}-${base}${ext || ".bin"}`;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, limpiarNombre(file.originalname));
  },
});

const uploadArchivo = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

module.exports = uploadArchivo;