// backend/src/routes/pagoRoutes.js
const express = require("express");
const axios = require("axios");
const router = express.Router();
const flow = require("../../config/flow");

// Monto de prueba en CLP
const PLAN_BETA_CLP = 15000;

// URLs configurables
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const N8N_WEBHOOK_PAGO_EXITOSO =
  process.env.N8N_WEBHOOK_PAGO_EXITOSO ||
  "https://primary-production-ddabe.up.railway.app/webhook/webhook-pago-exitoso";

// Crear orden de pago
router.post("/crear-orden", async (req, res) => {
  try {
    const { email, userId } = req.body;

    if (!email || !userId) {
      return res.status(400).json({ error: "Falta email o userId" });
    }

    const commerceOrder = `BETA-${userId}-${Date.now()}`;

    const data = {
      commerceOrder,
      subject: "Suscripción Plan Recepción Beta",
      amount: PLAN_BETA_CLP,
      email,
      urlConfirmation: `${BACKEND_URL}/api/pagos/confirmacion`,
      urlReturn: `${FRONTEND_URL}/pago-completado`,
      optional: JSON.stringify({
        userId,
        plan: "BETA_RECEPTION",
      }),
    };

    console.log("Creando orden Flow con data:", data);

    const flowResponse = await flow.createPayment(data);

    console.log("Respuesta Flow:", flowResponse);

    res.json({
      ok: true,
      url: flowResponse.url,
      token: flowResponse.token,
      flowResponse,
    });
  } catch (error) {
    console.error("Error creando orden Flow:", error);
    res.status(500).json({
      error: "Error creando orden de pago",
      detalle: error.message,
    });
  }
});

// Confirmación de pago desde Flow
router.post("/confirmacion", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      console.error("No llegó token desde Flow");
      return res.status(400).json({ error: "Falta token" });
    }

    const status = await flow.getPaymentStatus(token);

    console.log("Estado pago Flow:", status);

    // Intentamos recuperar el userId y plan desde optional
    let optionalData = {};

    try {
      if (status.optional) {
        optionalData = JSON.parse(status.optional);
      }
    } catch (error) {
      console.error("Error leyendo optional:", error.message);
    }

    // Si el pago es exitoso
    if (status.status === 2) {
      console.log("💰 Pago exitoso detectado. Avisando a n8n...");

      const payload = {
        monto: status.amount,
        pagador: status.payer || status.email || "Cliente Gmtch",
        plan: optionalData.plan || "BETA_RECEPTION",
        userId: optionalData.userId || "ID_SISTEMA",
        token,
        commerceOrder: status.commerceOrder || null,
        fecha: new Date().toISOString(),
      };

      try {
        await axios.post(N8N_WEBHOOK_PAGO_EXITOSO, payload);
        console.log("✅ n8n notificado correctamente");
      } catch (error) {
        console.error("❌ Error enviando a n8n:", error.message);
      }
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Error en confirmación:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;