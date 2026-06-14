const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { FotoVehiculo } = require("../models");

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "uploads", "fotos");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const limpiarNombreArchivo = (nombre) => {
  return String(nombre || "foto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "");
    const nombreBase = path.basename(file.originalname || "foto", extension);
    const nombreLimpio = limpiarNombreArchivo(nombreBase);
    const nombreFinal = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${nombreLimpio}${extension}`;

    cb(null, nombreFinal);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten imágenes"));
    }

    cb(null, true);
  },
});

const subirFoto = upload.fields([
  { name: "foto", maxCount: 1 },
  { name: "archivo", maxCount: 1 },
  { name: "imagen", maxCount: 1 },
  { name: "file", maxCount: 1 },
]);

const obtenerArchivoSubido = (req) => {
  return (
    req.files?.foto?.[0] ||
    req.files?.archivo?.[0] ||
    req.files?.imagen?.[0] ||
    req.files?.file?.[0] ||
    null
  );
};

router.post("/", (req, res, next) => {
  subirFoto(req, res, (error) => {
    if (error) {
      console.error("ERROR MULTER FOTOS:", error.message);
      return res.status(400).json({
        error: error.message || "Error al subir la foto",
      });
    }

    next();
  });
}, async (req, res) => {
  try {
    const archivo = obtenerArchivoSubido(req);

    const ordenId = req.body.ordenId || req.body.orden_id;

    if (!ordenId) {
      return res.status(400).json({
        error: "Falta ordenId para asociar la foto",
      });
    }

    if (!archivo) {
      return res.status(400).json({
        error: "No se recibió ninguna foto",
      });
    }

    const urlFoto = `/uploads/fotos/${archivo.filename}`;

    const nuevaFoto = await FotoVehiculo.create({
      ordenId: Number(ordenId),
      orden_id: Number(ordenId),
      url_foto: urlFoto,
      nombre_archivo: archivo.originalname,
      tipo_foto: req.body.tipo_foto || req.body.tipo || "Ingreso",
      descripcion: req.body.descripcion || "",
    });

    return res.status(201).json({
      mensaje: "Foto subida correctamente",
      foto: nuevaFoto,
      url_foto: urlFoto,
    });
  } catch (error) {
    console.error("ERROR AL GUARDAR FOTO:", error);

    return res.status(500).json({
      error: error.message || "Error interno al guardar foto",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const fotos = await FotoVehiculo.findAll({
      order: [["createdAt", "DESC"]],
    });

    return res.json(fotos);
  } catch (error) {
    console.error("ERROR AL LISTAR FOTOS:", error);

    return res.status(500).json({
      error: error.message || "Error al listar fotos",
    });
  }
});

router.get("/orden/:ordenId", async (req, res) => {
  try {
    const { ordenId } = req.params;

    const fotos = await FotoVehiculo.findAll({
      where: {
        ordenId,
      },
      order: [["createdAt", "DESC"]],
    });

    return res.json(fotos);
  } catch (error) {
    console.error("ERROR AL LISTAR FOTOS DE ORDEN:", error);

    return res.status(500).json({
      error: error.message || "Error al listar fotos de la orden",
    });
  }
});

module.exports = router;