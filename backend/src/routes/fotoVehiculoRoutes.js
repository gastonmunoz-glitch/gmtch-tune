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

let columnasPreparadas = false;

const prepararColumnasFotos = async () => {
  if (columnasPreparadas) return;

  await FotoVehiculo.sequelize.query(`
    ALTER TABLE "fotos_vehiculo"
    ADD COLUMN IF NOT EXISTS "tipo_foto" VARCHAR(60) DEFAULT 'OTRO';

    ALTER TABLE "fotos_vehiculo"
    ADD COLUMN IF NOT EXISTS "nombre_archivo" VARCHAR(255);

    ALTER TABLE "fotos_vehiculo"
    ADD COLUMN IF NOT EXISTS "subido_por" VARCHAR(100);
  `);

  columnasPreparadas = true;
};

const usuarioActual = (req) => {
  return (
    req.usuario?.username ||
    req.user?.username ||
    req.usuario?.nombre ||
    req.user?.nombre ||
    "sistema"
  );
};

const camposArchivoPermitidos = ["fotos", "fotos[]", "foto", "archivo", "imagen", "file"];

const subirFoto = upload.any();

const obtenerArchivosSubidos = (req) => {
  if (Array.isArray(req.files)) {
    return req.files.filter((archivo) =>
      camposArchivoPermitidos.includes(archivo.fieldname)
    );
  }

  if (req.files && typeof req.files === "object") {
    return camposArchivoPermitidos.flatMap((campo) => req.files[campo] || []);
  }

  if (req.file) return [req.file];

  return [];
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
    await prepararColumnasFotos();

    const archivos = obtenerArchivosSubidos(req);

    const ordenId = req.body.ordenId || req.body.orden_id;

    if (!ordenId) {
      return res.status(400).json({
        error: "Falta ordenId para asociar la foto",
      });
    }

    if (!archivos.length) {
      return res.status(400).json({
        error: "No se recibió ninguna foto",
      });
    }

    const tipoFoto =
      String(req.body.tipo_foto || req.body.tipo || "OTRO")
        .trim()
        .toUpperCase() || "OTRO";

    const descripcion = req.body.descripcion || "";
    const subidoPor = usuarioActual(req);

    const fotosCreadas = await Promise.all(
      archivos.map((archivo) => {
        const urlFoto = `/uploads/fotos/${archivo.filename}`;

        return FotoVehiculo.create({
          ordenId: Number(ordenId),
          url_foto: urlFoto,
          descripcion,
          tipo_foto: tipoFoto,
          nombre_archivo: archivo.originalname || archivo.filename,
          subido_por: subidoPor,
        });
      })
    );

    return res.status(201).json({
      mensaje:
        fotosCreadas.length === 1
          ? "Foto subida correctamente"
          : "Fotos subidas correctamente",
      cantidad: fotosCreadas.length,
      fotos: fotosCreadas,
      foto: fotosCreadas[0],
      url_foto: fotosCreadas[0]?.url_foto,
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
