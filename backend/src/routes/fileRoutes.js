const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const axios = require('axios');

// Configuración de guardado local (Temporalmente para archivos técnicos)
const storage = multer.diskStorage({
  destination: 'src/uploads/ecu_files/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Este flujo legacy no tiene registro, empresa ni orden que permitan autorizar
// una descarga posterior. Se bloquea antes de que Multer escriba el archivo.
router.all('/upload-ecu', (req, res) => {
  return res.status(410).json({
    error: 'FLUJO_ARCHIVO_LEGACY_DESHABILITADO',
    message: 'Usa File Service para cargar archivos tecnicos con trazabilidad.'
  });
});

router.post('/upload-ecu', upload.single('archivo'), async (req, res) => {
  try {
    const { marca, modelo, motor, userId } = req.body;
    
    console.log(`📩 Nuevo archivo recibido de ${marca} ${modelo}`);
    console.log("Motor:", motor);
    console.log("UserID:", userId);
    console.log("Archivo físico:", req.file.path);

    // --- AVISO A N8N PARA WHATSAPP ---
    const n8n_url = "https://primary-production-ddabe.up.railway.app/webhook/webhook-pago-exitoso";
    await axios.post(n8n_url, {
      pagador: "Cliente Gmtch",
      monto: "ARCHIVO BIN",
      plan: `SERVICIO: ${marca} ${modelo} (${motor})`,
      userId: userId
    });

    res.json({ ok: true, message: "Archivo cargado y equipo notificado" });
  } catch (error) {
    console.error("Error en upload-ecu:", error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
