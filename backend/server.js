const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const sequelize = require("./src/config/database");
const { QueryTypes } = require("sequelize");

dotenv.config();

console.log("SERVER VERSION: GARAGE-FILA-PAGOS-VEHICULOS-DIRECT-V6-2026-06-22");

// Railway/prod required envs:
// NODE_ENV=production, JWT_SECRET, PORTAL_JWT_SECRET, FRONTEND_URL,
// FRONTEND_URLS, ENABLE_WEB_PUSH=false, ENABLE_INTERNAL_AUTOMATIONS=false,
// VAPID_SUBJECT=mailto:contacto@gmtchtune.com, PORTAL_UPLOAD_MAX_MB=50.
const validarSecretosProduccion = () => {
  if (process.env.NODE_ENV !== "production") return;

  const jwtSecret = String(process.env.JWT_SECRET || "").trim();
  const portalJwtSecret = String(process.env.PORTAL_JWT_SECRET || "").trim();

  if (!jwtSecret) {
    throw new Error("JWT_SECRET es obligatorio en produccion.");
  }

  if (!portalJwtSecret) {
    throw new Error("PORTAL_JWT_SECRET es obligatorio en produccion.");
  }

  if (jwtSecret === portalJwtSecret) {
    throw new Error("JWT_SECRET y PORTAL_JWT_SECRET deben ser distintos en produccion.");
  }
};

validarSecretosProduccion();

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

// ====================== CARPETAS UPLOADS ======================

const uploadsPath = path.join(__dirname, "src", "uploads");
const fotosPath = path.join(__dirname, "src", "uploads", "fotos");

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

if (!fs.existsSync(fotosPath)) {
  fs.mkdirSync(fotosPath, { recursive: true });
}

// ====================== CORS ======================

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://gmtchtune.com",
  "https://www.gmtchtune.com",
  "https://abundant-emotion-production-830a.up.railway.app",
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
].filter(Boolean);

const isAllowedOrigin = (origin) => !origin || allowedOrigins.includes(origin);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    console.warn("CORS bloqueado para origin:", origin);
    return callback(new Error("Origen no permitido por CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(cors(corsOptions));

app.use(
  helmet({
    hidePoweredBy: true,
    frameguard: { action: "deny" },
    noSniff: true,
    referrerPolicy: { policy: "no-referrer" },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "base-uri": ["'self'"],
        "frame-ancestors": ["'none'"],
        "form-action": ["'self'"],
        "img-src": ["'self'", "data:", "blob:"],
        "font-src": ["'self'", "data:"],
        "object-src": ["'none'"],
        "script-src": ["'self'"],
        "script-src-attr": ["'none'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "connect-src": [
          "'self'",
          "https://gmtchtune.com",
          "https://www.gmtchtune.com",
          "https://api.gmtchtune.com",
          ...allowedOrigins.filter((origin) => origin.startsWith("http")),
        ],
      },
    },
    crossOriginResourcePolicy: false,
  })
);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  next();
});

// ====================== MIDDLEWARES BASE ======================

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Riesgo controlado V1: /uploads se mantiene publico por compatibilidad interna.
// Portal Masters usa portal_uploads y no debe montarse como static publico.
app.use(
  "/uploads",
  express.static(uploadsPath, {
    dotfiles: "deny",
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  })
);

const crearRateLimiter = ({ windowMs, limit, mensaje }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: mensaje || "Demasiadas solicitudes. Intenta nuevamente mas tarde.",
    },
  });

const loginRateLimiter = crearRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  mensaje: "Demasiados intentos de login. Intenta nuevamente mas tarde.",
});

const portalLoginRateLimiter = crearRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  mensaje: "Demasiados intentos de login portal. Intenta nuevamente mas tarde.",
});

const portalAdminSensitiveRateLimiter = crearRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  mensaje: "Demasiadas operaciones administrativas sensibles. Intenta mas tarde.",
});

const portalUploadRateLimiter = crearRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  mensaje: "Demasiadas subidas de archivos. Intenta nuevamente mas tarde.",
});

const portalDownloadRateLimiter = crearRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  mensaje: "Demasiadas descargas. Intenta nuevamente mas tarde.",
});

app.post("/api/auth/login", loginRateLimiter);
app.post("/api/portal/auth/login", portalLoginRateLimiter);
app.post("/api/portal/admin/usuarios/:id/reset-password", portalAdminSensitiveRateLimiter);
app.post("/api/portal/files", portalUploadRateLimiter);
app.get("/api/portal/files/:id/descargar-mod", portalDownloadRateLimiter);

// ====================== MODELOS ======================

require("./src/models");

const {
  autenticar,
  permitirRoles,
  permitirPorMetodo,
} = require("./src/middleware/authMiddleware");
const { autenticarPortal } = require("./src/middleware/portalAuthMiddleware");

// ====================== RUTAS BASE ======================

app.get("/", (req, res) => {
  res.send("GMTCH TUNE SERVER ONLINE");
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Backend Gmtch Tune funcionando",
    version: "GARAGE-FILA-PAGOS-VEHICULOS-DIRECT-V6-2026-06-22",
    environment: process.env.NODE_ENV || "development",
  });
});

// ====================== IMPORTAR RUTAS ======================

const authRoutes = require("./src/routes/authRoutes");
const usuarioRoutes = require("./src/routes/usuarioRoutes");
const clienteRoutes = require("./src/routes/clienteRoutes");
const ordenTrabajoRoutes = require("./src/routes/ordenTrabajoRoutes");
const diagnosticoRoutes = require("./src/routes/diagnosticoRoutes");
const archivoECURoutes = require("./src/routes/archivoECURoutes");
const fotoVehiculoRoutes = require("./src/routes/fotoVehiculoRoutes");
const notificacionRoutes = require("./src/routes/notificacionRoutes");
const pushRoutes = require("./src/routes/pushRoutes");
const bitacoraOperativaRoutes = require("./src/routes/bitacoraOperativaRoutes");
const finanzasRoutes = require("./src/routes/finanzasRoutes");
const aiAgentRoutes = require("./src/routes/aiAgentRoutes");
const automatizacionRoutes = require("./src/routes/automatizacionRoutes");
const leadRoutes = require("./src/routes/leadRoutes");
const tarifaRoutes = require("./src/routes/tarifaRoutes");
const campaniaRoutes = require("./src/routes/campaniaRoutes");
const portalAuthRoutes = require("./src/routes/portalAuthRoutes");
const portalFileRoutes = require("./src/routes/portalFileRoutes");
const portalCreditoRoutes = require("./src/routes/portalCreditoRoutes");
const portalAdminRoutes = require("./src/routes/portalAdminRoutes");
const portalMensajeRoutes = require("./src/routes/portalMensajeRoutes");
const mensajeRoutes = require("./src/routes/mensajeRoutes");
const { iniciarSchedulerInterno } = require("./src/services/internalScheduler");

// ====================== RUTAS PÚBLICAS ======================

app.use("/api/auth", authRoutes);
app.use("/api/portal/auth", portalAuthRoutes);
app.use("/api/portal/creditos/flow", portalCreditoRoutes.flowRouter);

// ====================== RUTAS PROTEGIDAS ======================

app.use("/api/portal/files", autenticarPortal, portalFileRoutes);
app.use("/api/portal/creditos", autenticarPortal, portalCreditoRoutes);
app.use("/api/portal/mensajes", autenticarPortal, portalMensajeRoutes);
app.use("/api/portal/admin", autenticar, permitirRoles("OWNER"), portalAdminRoutes);
app.use("/api/mensajes", autenticar, mensajeRoutes);
app.use("/api/ai-agents", autenticar, permitirRoles("OWNER", "ADMIN"), aiAgentRoutes);
app.use("/api/automatizaciones", autenticar, automatizacionRoutes);
app.use("/api/push", autenticar, pushRoutes);
app.use(
  "/api/leads",
  autenticar,
  permitirRoles(
    "OWNER",
    "ADMIN",
    "RECEPCION",
    "SUPERVISOR",
    "OPERADOR_ECU",
    "TUNER"
  ),
  leadRoutes
);

app.use(
  "/api/tarifas",
  autenticar,
  permitirRoles(
    "OWNER",
    "ADMIN",
    "SUPERVISOR",
    "RECEPCION",
    "OPERADOR_SCANNER",
    "OPERADOR_ECU",
    "MECANICO",
    "TUNER"
  ),
  tarifaRoutes
);

app.use(
  "/api/campanias",
  autenticar,
  permitirRoles("OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"),
  campaniaRoutes
);

app.use(
  "/api/usuarios",
  autenticar,
  usuarioRoutes
);

app.use(
  "/api/clientes",
  autenticar,
  permitirPorMetodo({
    GET: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
    ],
    POST: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION", "OPERADOR_ECU"],
    PUT: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
    PATCH: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
    DELETE: ["OWNER"],
  }),
  clienteRoutes
);

// ====================== VEHÍCULOS DIRECTO SQL V6 ======================

const normalizarPatenteDirecta = (patente) => {
  return String(patente || "").trim().toUpperCase().replace(/\s+/g, "");
};

const armarVehiculoDesdeRows = (rows = []) => {
  if (!rows.length) return null;

  const base = rows[0];

  const ordenes = rows
    .filter((row) => row.orden_id)
    .map((row) => ({
      id: row.orden_id,
      vehiculoId: row.orden_vehiculoId,
      prioridad: row.orden_prioridad,
      estado: row.orden_estado,
      estado_pago: row.orden_estado_pago,
      medio_pago: row.orden_medio_pago,
      monto_pagado: row.orden_monto_pagado,
      fecha_pago: row.orden_fecha_pago,
      cobrado_por: row.orden_cobrado_por,
      observacion_pago: row.orden_observacion_pago,
      kilometraje: row.orden_kilometraje,
      motivo_ingreso: row.orden_motivo_ingreso,
      monto_total: row.orden_monto_total,
      monto_original: row.orden_monto_original,
      monto_final: row.orden_monto_final ?? row.orden_monto_total,
      motivo_ajuste: row.orden_motivo_ajuste,
      ajustado_por: row.orden_ajustado_por,
      ajustado_at: row.orden_ajustado_at,
      historial_ajustes: row.orden_historial_ajustes || [],
      createdAt: row.orden_createdAt,
      updatedAt: row.orden_updatedAt,
      Diagnosticos: [],
      ArchivoECUs: [],
      FotoVehiculos: [],
      OrdenServicioItems: [],
      MaterialRecuperados: [],
    }));

  return {
    id: base.id,
    clienteId: base.clienteId,
    patente: base.patente,
    marca: base.marca,
    modelo: base.modelo,
    anio: base.anio,
    vin: base.vin,
    tipo_unidad: base.tipo_unidad,
    activo: base.activo,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    Cliente: base.cliente_id
      ? {
          id: base.cliente_id,
          nombre: base.cliente_nombre,
          telefono: base.cliente_telefono,
          email: base.cliente_email,
          direccion: base.cliente_direccion,
          categoria_cliente: base.cliente_categoria_cliente || "NORMAL",
          nota_cliente: base.cliente_nota_cliente,
        }
      : null,
    OrdenTrabajos: ordenes,
  };
};

const queryVehiculoDetalleSQL = `
  SELECT
    v."id",
    v."clienteId",
    v."patente",
    v."marca",
    v."modelo",
    v."anio",
    v."vin",
    v."tipo_unidad",
    v."activo",
    v."createdAt",
    v."updatedAt",

    c."id" AS "cliente_id",
    c."nombre" AS "cliente_nombre",
    c."telefono" AS "cliente_telefono",
    c."email" AS "cliente_email",
    c."direccion" AS "cliente_direccion",
    c."categoria_cliente" AS "cliente_categoria_cliente",
    c."nota_cliente" AS "cliente_nota_cliente",

    o."id" AS "orden_id",
    o."vehiculoId" AS "orden_vehiculoId",
    o."prioridad" AS "orden_prioridad",
    o."estado" AS "orden_estado",
    o."estado_pago" AS "orden_estado_pago",
    o."medio_pago" AS "orden_medio_pago",
    o."monto_pagado" AS "orden_monto_pagado",
    o."fecha_pago" AS "orden_fecha_pago",
    o."cobrado_por" AS "orden_cobrado_por",
    o."observacion_pago" AS "orden_observacion_pago",
    o."kilometraje" AS "orden_kilometraje",
    o."motivo_ingreso" AS "orden_motivo_ingreso",
    o."monto_total" AS "orden_monto_total",
    o."monto_original" AS "orden_monto_original",
    o."monto_final" AS "orden_monto_final",
    o."motivo_ajuste" AS "orden_motivo_ajuste",
    o."ajustado_por" AS "orden_ajustado_por",
    o."ajustado_at" AS "orden_ajustado_at",
    o."historial_ajustes" AS "orden_historial_ajustes",
    o."createdAt" AS "orden_createdAt",
    o."updatedAt" AS "orden_updatedAt"

  FROM "vehiculos" v
  LEFT JOIN "clientes" c ON c."id" = v."clienteId"
  LEFT JOIN "ordenes_trabajo" o ON o."vehiculoId" = v."id"
`;

app.get(
  "/api/vehiculos",
  autenticar,
  permitirPorMetodo({
    GET: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
      "TUNER",
    ],
  }),
  async (req, res) => {
    try {
      console.log("GET /api/vehiculos DIRECT-SERVER-V6");

      const rows = await sequelize.query(
        `
        SELECT
          v."id",
          v."clienteId",
          v."patente",
          v."marca",
          v."modelo",
          v."anio",
          v."vin",
          v."tipo_unidad",
          v."activo",
          v."createdAt",
          v."updatedAt",

          c."id" AS "cliente_id",
          c."nombre" AS "cliente_nombre",
          c."telefono" AS "cliente_telefono",
          c."email" AS "cliente_email",
          c."direccion" AS "cliente_direccion",
          c."categoria_cliente" AS "cliente_categoria_cliente",
          c."nota_cliente" AS "cliente_nota_cliente",

          (
            SELECT COUNT(*)::int
            FROM "ordenes_trabajo" o
            WHERE o."vehiculoId" = v."id"
          ) AS "total_ordenes"

        FROM "vehiculos" v
        LEFT JOIN "clientes" c ON c."id" = v."clienteId"
        ORDER BY c."nombre" ASC NULLS LAST, v."patente" ASC;
        `,
        {
          type: QueryTypes.SELECT,
        }
      );

      const data = rows.map((row) => ({
        id: row.id,
        clienteId: row.clienteId,
        patente: row.patente,
        marca: row.marca,
        modelo: row.modelo,
        anio: row.anio,
        vin: row.vin,
        tipo_unidad: row.tipo_unidad,
        activo: row.activo,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        Cliente: row.cliente_id
          ? {
              id: row.cliente_id,
              nombre: row.cliente_nombre,
              telefono: row.cliente_telefono,
              email: row.cliente_email,
              direccion: row.cliente_direccion,
              categoria_cliente: row.cliente_categoria_cliente || "NORMAL",
              nota_cliente: row.cliente_nota_cliente,
            }
          : null,
        OrdenTrabajos: Array.from(
          { length: Number(row.total_ordenes || 0) },
          (_, i) => ({ id: `historial-${i + 1}` })
        ),
      }));

      res.json(data);
    } catch (error) {
      console.error("ERROR GET VEHÍCULOS DIRECT-SERVER-V6:", error);

      res.status(500).json({
        error: error.message,
        controller: "DIRECT-SERVER-V6",
      });
    }
  }
);

app.post(
  "/api/vehiculos",
  autenticar,
  permitirPorMetodo({
    POST: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION", "OPERADOR_ECU"],
  }),
  async (req, res) => {
    try {
      console.log("POST /api/vehiculos DIRECT-SERVER-V6 BODY:", req.body);

      const patente = normalizarPatenteDirecta(req.body.patente);
      const clienteId = req.body.clienteId ? Number(req.body.clienteId) : null;
      const marca = String(req.body.marca || "SIN MARCA").trim() || "SIN MARCA";
      const modelo =
        String(req.body.modelo || "SIN MODELO").trim() || "SIN MODELO";
      const anio = req.body.anio ? Number(req.body.anio) : null;
      const vin = String(req.body.vin || "").trim() || null;
      const tipo_unidad =
        String(req.body.tipo_unidad || "AUTO").trim() || "AUTO";

      if (!patente) {
        return res.status(400).json({
          error: "Falta patente",
          controller: "DIRECT-SERVER-V6",
        });
      }

      if (!clienteId) {
        return res.status(400).json({
          error: "Falta clienteId",
          controller: "DIRECT-SERVER-V6",
        });
      }

      const cliente = await sequelize.query(
        `
        SELECT "id"
        FROM "clientes"
        WHERE "id" = :clienteId
        LIMIT 1;
        `,
        {
          replacements: { clienteId },
          type: QueryTypes.SELECT,
        }
      );

      if (cliente.length === 0) {
        return res.status(404).json({
          error: "Cliente no encontrado",
          controller: "DIRECT-SERVER-V6",
        });
      }

      const existente = await sequelize.query(
        `
        SELECT "id", "patente"
        FROM "vehiculos"
        WHERE UPPER(TRIM("patente")) = :patente
        LIMIT 1;
        `,
        {
          replacements: { patente },
          type: QueryTypes.SELECT,
        }
      );

      if (existente.length > 0) {
        return res.status(409).json({
          error: "La patente ya está registrada",
          controller: "DIRECT-SERVER-V6",
          vehiculo: existente[0],
        });
      }

      const insertado = await sequelize.query(
        `
        INSERT INTO "vehiculos"
          (
            "clienteId",
            "patente",
            "marca",
            "modelo",
            "anio",
            "vin",
            "tipo_unidad",
            "activo",
            "createdAt",
            "updatedAt"
          )
        VALUES
          (
            :clienteId,
            :patente,
            :marca,
            :modelo,
            :anio,
            :vin,
            :tipo_unidad,
            true,
            NOW(),
            NOW()
          )
        RETURNING *;
        `,
        {
          replacements: {
            clienteId,
            patente,
            marca,
            modelo,
            anio,
            vin,
            tipo_unidad,
          },
          type: QueryTypes.SELECT,
        }
      );

      res.status(201).json({
        mensaje: "Vehículo creado correctamente",
        controller: "DIRECT-SERVER-V6",
        vehiculo: insertado[0],
      });
    } catch (error) {
      console.error("ERROR POST VEHÍCULO DIRECT-SERVER-V6:", error);

      res.status(500).json({
        error: error.message,
        controller: "DIRECT-SERVER-V6",
      });
    }
  }
);

app.get(
  "/api/vehiculos/patente/:patente",
  autenticar,
  permitirPorMetodo({
    GET: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
      "TUNER",
    ],
  }),
  async (req, res) => {
    try {
      const patente = normalizarPatenteDirecta(req.params.patente);

      const rows = await sequelize.query(
        `
        ${queryVehiculoDetalleSQL}
        WHERE UPPER(TRIM(v."patente")) = :patente
        ORDER BY o."createdAt" DESC NULLS LAST;
        `,
        {
          replacements: { patente },
          type: QueryTypes.SELECT,
        }
      );

      const vehiculo = armarVehiculoDesdeRows(rows);

      if (!vehiculo) {
        return res.status(404).json({
          error: "Vehículo no encontrado",
          controller: "DIRECT-SERVER-V6",
        });
      }

      res.json(vehiculo);
    } catch (error) {
      console.error("ERROR GET VEHÍCULO POR PATENTE DIRECT-SERVER-V6:", error);

      res.status(500).json({
        error: error.message,
        controller: "DIRECT-SERVER-V6",
      });
    }
  }
);

app.get(
  "/api/vehiculos/:id",
  autenticar,
  permitirPorMetodo({
    GET: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
      "TUNER",
    ],
  }),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const vehiculoRows = await sequelize.query(
        `
        SELECT
          v."id",
          v."clienteId",
          v."patente",
          v."marca",
          v."modelo",
          v."anio",
          v."vin",
          v."tipo_unidad",
          v."activo",
          v."createdAt",
          v."updatedAt",

          c."id" AS "cliente_id",
          c."nombre" AS "cliente_nombre",
          c."telefono" AS "cliente_telefono",
          c."email" AS "cliente_email",
          c."direccion" AS "cliente_direccion",
          c."categoria_cliente" AS "cliente_categoria_cliente",
          c."nota_cliente" AS "cliente_nota_cliente"

        FROM "vehiculos" v
        LEFT JOIN "clientes" c ON c."id" = v."clienteId"
        WHERE v."id" = :id
        LIMIT 1;
        `,
        {
          replacements: { id },
          type: QueryTypes.SELECT,
        }
      );

      if (!vehiculoRows.length) {
        return res.status(404).json({
          error: "Vehículo no encontrado",
          controller: "DIRECT-SERVER-V6",
        });
      }

      const base = vehiculoRows[0];

      const ordenesRows = await sequelize.query(
        `
        SELECT *
        FROM "ordenes_trabajo"
        WHERE "vehiculoId" = :id
        ORDER BY "createdAt" DESC NULLS LAST;
        `,
        {
          replacements: { id },
          type: QueryTypes.SELECT,
        }
      );

      const ordenIds = ordenesRows.map((orden) => orden.id).filter(Boolean);

      const agruparPorOrden = (items = []) => {
        return items.reduce((acc, item) => {
          const ordenId =
            item.ordenId ||
            item.orden_id ||
            item.ordenTrabajoId ||
            item.orden_trabajo_id;

          if (!ordenId) return acc;

          const key = String(ordenId);
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);

          return acc;
        }, {});
      };

      const consultarRelacion = async (nombre, sql) => {
        if (!ordenIds.length) return [];

        try {
          return await sequelize.query(sql, {
            replacements: { ordenIds },
            type: QueryTypes.SELECT,
          });
        } catch (error) {
          console.warn(
            `No se pudo cargar ${nombre} para ficha vehículo 360:`,
            error.message
          );

          return [];
        }
      };

      const [diagnosticos, fotos, archivosECU, servicioItems, materiales] =
        await Promise.all([
        consultarRelacion(
          "diagnósticos",
          `
          SELECT *
          FROM "diagnosticos"
          WHERE "ordenId" IN (:ordenIds)
          ORDER BY "createdAt" DESC NULLS LAST;
          `
        ),
        consultarRelacion(
          "fotos",
          `
          SELECT *
          FROM "fotos_vehiculo"
          WHERE "ordenId" IN (:ordenIds)
          ORDER BY "createdAt" DESC NULLS LAST;
          `
        ),
        consultarRelacion(
          "archivos ECU",
          `
          SELECT *
          FROM "archivos_ecu"
          WHERE "ordenId" IN (:ordenIds)
          ORDER BY "createdAt" DESC NULLS LAST;
          `
        ),
        consultarRelacion(
          "items de servicio",
          `
          SELECT *
          FROM "orden_servicio_items"
          WHERE "ordenId" IN (:ordenIds)
          ORDER BY "id" ASC;
          `
        ),
        consultarRelacion(
          "material recuperado",
          `
          SELECT *
          FROM "materiales_recuperados"
          WHERE "ordenId" IN (:ordenIds)
          ORDER BY "createdAt" DESC NULLS LAST;
          `
        ),
      ]);

      const diagnosticosPorOrden = agruparPorOrden(diagnosticos);
      const fotosPorOrden = agruparPorOrden(fotos);
      const archivosPorOrden = agruparPorOrden(archivosECU);
      const itemsPorOrden = agruparPorOrden(servicioItems);
      const materialPorOrden = agruparPorOrden(materiales);

      const ordenes = ordenesRows.map((orden) => {
        const key = String(orden.id);
        const diagnosticosOrden = diagnosticosPorOrden[key] || [];
        const fotosOrden = fotosPorOrden[key] || [];
        const archivosOrden = archivosPorOrden[key] || [];
        const itemsOrden = itemsPorOrden[key] || [];
        const materialOrden = materialPorOrden[key] || [];

        return {
          id: orden.id,
          vehiculoId: orden.vehiculoId,
          prioridad: orden.prioridad,
          estado: orden.estado,
          estado_pago: orden.estado_pago,
          medio_pago: orden.medio_pago,
          monto_pagado: orden.monto_pagado,
          fecha_pago: orden.fecha_pago,
          cobrado_por: orden.cobrado_por,
          observacion_pago: orden.observacion_pago,
          entregado_por: orden.entregado_por,
          entregado_at: orden.entregado_at,
          observacion_cierre: orden.observacion_cierre,
          tecnico_finalizado_por: orden.tecnico_finalizado_por,
          tecnico_finalizado_at: orden.tecnico_finalizado_at,
          kilometraje: orden.kilometraje,
          motivo_ingreso: orden.motivo_ingreso,
          monto_total: orden.monto_total,
          monto_original: orden.monto_original,
          monto_final: orden.monto_final ?? orden.monto_total,
          motivo_ajuste: orden.motivo_ajuste,
          ajustado_por: orden.ajustado_por,
          ajustado_at: orden.ajustado_at,
          historial_ajustes: orden.historial_ajustes || [],
          createdAt: orden.createdAt,
          updatedAt: orden.updatedAt,
          Diagnosticos: diagnosticosOrden,
          ArchivoECUs: archivosOrden,
          ArchivosECU: archivosOrden,
          FotoVehiculos: fotosOrden,
          FotosVehiculo: fotosOrden,
          OrdenServicioItems: itemsOrden,
          ItemsServicio: itemsOrden,
          MaterialRecuperados: materialOrden,
          MaterialRecuperado: materialOrden,
        };
      });

      const totalFacturado = ordenes.reduce(
        (acc, orden) =>
          acc + Number(orden.monto_final ?? orden.monto_total ?? 0),
        0
      );

      const totalPagado = ordenes.reduce(
        (acc, orden) => acc + Number(orden.monto_pagado || 0),
        0
      );

      const ultimaVisita =
        ordenes
          .map((orden) => orden.createdAt)
          .filter(Boolean)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ||
        null;

      const ultimaEntrega =
        ordenes
          .map((orden) => orden.entregado_at)
          .filter(Boolean)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ||
        null;

      const metricas = {
        totalOrdenes: ordenes.length,
        totalDiagnosticos: diagnosticos.length,
        totalFotos: fotos.length,
        totalArchivosECU: archivosECU.length,
        totalFacturado,
        totalPagado,
        ultimaVisita,
        ultimaEntrega,
      };

      const vehiculo = {
        id: base.id,
        clienteId: base.clienteId,
        patente: base.patente,
        marca: base.marca,
        modelo: base.modelo,
        anio: base.anio,
        vin: base.vin,
        tipo_unidad: base.tipo_unidad,
        activo: base.activo,
        createdAt: base.createdAt,
        updatedAt: base.updatedAt,
        Cliente: base.cliente_id
          ? {
              id: base.cliente_id,
              nombre: base.cliente_nombre,
              telefono: base.cliente_telefono,
              email: base.cliente_email,
              direccion: base.cliente_direccion,
              categoria_cliente: base.cliente_categoria_cliente || "NORMAL",
              nota_cliente: base.cliente_nota_cliente,
            }
          : null,
        OrdenTrabajos: ordenes,
        Diagnosticos: diagnosticos,
        ArchivoECUs: archivosECU,
        ArchivosECU: archivosECU,
        FotoVehiculos: fotos,
        FotosVehiculo: fotos,
        metricas,
        ...metricas,
      };

      res.json(vehiculo);
    } catch (error) {
      console.error("ERROR GET VEHÍCULO ID DIRECT-SERVER-V6:", error);

      res.status(500).json({
        error: error.message,
        controller: "DIRECT-SERVER-V6",
      });
    }
  }
);

app.put(
  "/api/vehiculos/:id",
  autenticar,
  permitirPorMetodo({
    PUT: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
  }),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const existente = await sequelize.query(
        `
        SELECT *
        FROM "vehiculos"
        WHERE "id" = :id
        LIMIT 1;
        `,
        {
          replacements: { id },
          type: QueryTypes.SELECT,
        }
      );

      if (existente.length === 0) {
        return res.status(404).json({
          error: "Vehículo no encontrado",
          controller: "DIRECT-SERVER-V6",
        });
      }

      const actual = existente[0];

      const clienteId =
        req.body.clienteId !== undefined
          ? Number(req.body.clienteId)
          : actual.clienteId;

      const patente =
        req.body.patente !== undefined
          ? normalizarPatenteDirecta(req.body.patente)
          : actual.patente;

      const marca =
        req.body.marca !== undefined
          ? String(req.body.marca || actual.marca).trim() || actual.marca
          : actual.marca;

      const modelo =
        req.body.modelo !== undefined
          ? String(req.body.modelo || actual.modelo).trim() || actual.modelo
          : actual.modelo;

      const anio =
        req.body.anio !== undefined ? Number(req.body.anio) || null : actual.anio;

      const vin =
        req.body.vin !== undefined
          ? String(req.body.vin || "").trim() || null
          : actual.vin;

      const tipo_unidad =
        req.body.tipo_unidad !== undefined
          ? String(req.body.tipo_unidad || "AUTO").trim() || "AUTO"
          : actual.tipo_unidad;

      const activo =
        req.body.activo !== undefined ? Boolean(req.body.activo) : actual.activo;

      const actualizado = await sequelize.query(
        `
        UPDATE "vehiculos"
        SET
          "clienteId" = :clienteId,
          "patente" = :patente,
          "marca" = :marca,
          "modelo" = :modelo,
          "anio" = :anio,
          "vin" = :vin,
          "tipo_unidad" = :tipo_unidad,
          "activo" = :activo,
          "updatedAt" = NOW()
        WHERE "id" = :id
        RETURNING *;
        `,
        {
          replacements: {
            id,
            clienteId,
            patente,
            marca,
            modelo,
            anio,
            vin,
            tipo_unidad,
            activo,
          },
          type: QueryTypes.SELECT,
        }
      );

      res.json({
        mensaje: "Vehículo actualizado",
        controller: "DIRECT-SERVER-V6",
        vehiculo: actualizado[0],
      });
    } catch (error) {
      console.error("ERROR PUT VEHÍCULO DIRECT-SERVER-V6:", error);

      res.status(500).json({
        error: error.message,
        controller: "DIRECT-SERVER-V6",
      });
    }
  }
);

app.patch(
  "/api/vehiculos/:id",
  autenticar,
  permitirPorMetodo({
    PATCH: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
  }),
  async (req, res) => {
    try {
      req.method = "PUT";
      return res.status(405).json({
        error: "Usa PUT para actualizar vehículo por ahora",
        controller: "DIRECT-SERVER-V6",
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        controller: "DIRECT-SERVER-V6",
      });
    }
  }
);

app.delete(
  "/api/vehiculos/:id",
  autenticar,
  permitirPorMetodo({
    DELETE: ["OWNER"],
  }),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const historial = await sequelize.query(
        `
        SELECT COUNT(*)::int AS total
        FROM "ordenes_trabajo"
        WHERE "vehiculoId" = :id;
        `,
        {
          replacements: { id },
          type: QueryTypes.SELECT,
        }
      );

      if ((historial[0]?.total || 0) > 0) {
        return res.status(400).json({
          error:
            "Este vehículo tiene historial de órdenes. Por seguridad no se elimina.",
          controller: "DIRECT-SERVER-V6",
        });
      }

      const eliminado = await sequelize.query(
        `
        DELETE FROM "vehiculos"
        WHERE "id" = :id
        RETURNING "id";
        `,
        {
          replacements: { id },
          type: QueryTypes.SELECT,
        }
      );

      if (eliminado.length === 0) {
        return res.status(404).json({
          error: "Vehículo no encontrado",
          controller: "DIRECT-SERVER-V6",
        });
      }

      res.json({
        mensaje: "Vehículo eliminado correctamente",
        controller: "DIRECT-SERVER-V6",
        id,
      });
    } catch (error) {
      console.error("ERROR DELETE VEHÍCULO DIRECT-SERVER-V6:", error);

      res.status(500).json({
        error: error.message,
        controller: "DIRECT-SERVER-V6",
      });
    }
  }
);

// ====================== ÓRDENES ======================

app.use(
  "/api/ordenes",
  autenticar,
  permitirPorMetodo({
    GET: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
      "TUNER",
    ],
    POST: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_ECU",
      "MECANICO",
    ],
    PUT: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
    ],
    PATCH: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
    ],
    DELETE: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION"],
  }),
  ordenTrabajoRoutes
);

app.use(
  "/api/diagnosticos",
  autenticar,
  permitirPorMetodo({
    GET: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
    ],
    POST: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
    ],
    PUT: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
    ],
    PATCH: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
    ],
    DELETE: ["OWNER"],
  }),
  diagnosticoRoutes
);

app.use(
  "/api/archivos-ecu",
  autenticar,
  permitirPorMetodo({
    GET: ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_ECU", "TUNER"],
    POST: ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_ECU", "TUNER"],
    PUT: ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_ECU", "TUNER"],
    PATCH: ["OWNER", "ADMIN", "SUPERVISOR", "OPERADOR_ECU", "TUNER"],
    DELETE: ["OWNER"],
  }),
  archivoECURoutes
);

app.use(
  "/api/fotos",
  autenticar,
  permitirPorMetodo({
    GET: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
    ],
    POST: ["OWNER", "ADMIN", "SUPERVISOR", "RECEPCION", "OPERADOR_ECU"],
    PUT: ["OWNER", "ADMIN", "SUPERVISOR"],
    PATCH: ["OWNER", "ADMIN", "SUPERVISOR"],
    DELETE: ["OWNER"],
  }),
  fotoVehiculoRoutes
);

app.use(
  "/api/notificaciones",
  autenticar,
  permitirPorMetodo({
    GET: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
      "TUNER",
    ],
    PATCH: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_SCANNER",
      "OPERADOR_ECU",
      "MECANICO",
      "TUNER",
    ],
  }),
  notificacionRoutes
);

app.use(
  "/api/bitacora-operativa",
  autenticar,
  permitirPorMetodo({
    GET: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_ECU",
      "MECANICO",
      "TUNER",
    ],
    POST: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_ECU",
      "MECANICO",
      "TUNER",
    ],
    PATCH: ["OWNER", "ADMIN", "SUPERVISOR"],
  }),
  bitacoraOperativaRoutes
);

app.use(
  "/api/finanzas",
  autenticar,
  permitirPorMetodo({
    GET: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_ECU",
      "MECANICO",
      "TUNER",
    ],
    POST: [
      "OWNER",
      "ADMIN",
      "SUPERVISOR",
      "RECEPCION",
      "OPERADOR_ECU",
      "MECANICO",
      "TUNER",
    ],
    PATCH: ["OWNER", "ADMIN", "SUPERVISOR"],
  }),
  finanzasRoutes
);

// ====================== RUTAS OPCIONALES ======================

try {
  const pagoRoutes = require("./src/routes/pagoRoutes");
  app.use("/api/pagos", autenticar, permitirRoles("OWNER", "ADMIN"), pagoRoutes);
  console.log("Ruta /api/pagos cargada");
} catch (error) {
  console.warn("Ruta /api/pagos no cargada:", error.message);
}

try {
  const fileRoutes = require("./src/routes/fileRoutes");
  app.use("/api/files", autenticar, permitirRoles("OWNER", "ADMIN"), fileRoutes);
  console.log("Ruta /api/files cargada");
} catch (error) {
  console.warn("Ruta /api/files no cargada:", error.message);
}

// ====================== RUTA NO ENCONTRADA ======================

app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.originalUrl,
  });
});

// ====================== MANEJO GENERAL DE ERRORES ======================

app.use((err, req, res, next) => {
  console.error("ERROR GENERAL BACKEND:", err);

  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Error interno del servidor"
        : err.message || "Error interno del servidor",
  });
});

// ====================== PREPARAR BASE DE DATOS ======================

const prepararBaseDatos = async () => {
  try {
    await sequelize.query(`
      DO $$
      BEGIN
        -- USUARIOS
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'Usuarios'
        ) THEN

          ALTER TABLE "Usuarios"
          ADD COLUMN IF NOT EXISTS "nombre" VARCHAR(120);

          ALTER TABLE "Usuarios"
          ADD COLUMN IF NOT EXISTS "activo" BOOLEAN DEFAULT true;

          UPDATE "Usuarios"
          SET "activo" = true
          WHERE "activo" IS NULL;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'Usuarios'
            AND column_name = 'username'
          ) THEN
            UPDATE "Usuarios"
            SET "username" = CONCAT('usuario_', LEFT("id"::text, 8))
            WHERE "username" IS NULL
               OR TRIM("username") = '';

            WITH duplicados AS (
              SELECT
                "id",
                "username",
                ROW_NUMBER() OVER (
                  PARTITION BY LOWER(TRIM("username"))
                  ORDER BY "createdAt" ASC NULLS LAST, "id" ASC
                ) AS rn
              FROM "Usuarios"
              WHERE "username" IS NOT NULL
            )
            UPDATE "Usuarios" u
            SET "username" = CONCAT(d."username", '_', d.rn)
            FROM duplicados d
            WHERE u."id" = d."id"
            AND d.rn > 1;
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'Usuarios'
            AND column_name = 'rol'
          ) THEN
            ALTER TABLE "Usuarios" ALTER COLUMN "rol" DROP DEFAULT;
            ALTER TABLE "Usuarios" ALTER COLUMN "rol" TYPE VARCHAR(50) USING "rol"::text;
            ALTER TABLE "Usuarios" ALTER COLUMN "rol" SET DEFAULT 'RECEPCION';

            UPDATE "Usuarios"
            SET "rol" = 'RECEPCION'
            WHERE "rol" IS NULL
               OR TRIM("rol") = '';
          END IF;

        END IF;

        -- CLIENTES
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'clientes'
        ) THEN

          ALTER TABLE "clientes"
          ADD COLUMN IF NOT EXISTS "categoria_cliente" VARCHAR(30) DEFAULT 'NORMAL';

          ALTER TABLE "clientes"
          ADD COLUMN IF NOT EXISTS "nota_cliente" TEXT;

          UPDATE "clientes"
          SET "categoria_cliente" = 'NORMAL'
          WHERE "categoria_cliente" IS NULL
             OR TRIM("categoria_cliente") = '';

        END IF;

        -- VEHÍCULOS
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'vehiculos'
        ) THEN

          ALTER TABLE "vehiculos"
          ADD COLUMN IF NOT EXISTS "anio" INTEGER;

          ALTER TABLE "vehiculos"
          ADD COLUMN IF NOT EXISTS "vin" VARCHAR(50);

          ALTER TABLE "vehiculos"
          ADD COLUMN IF NOT EXISTS "tipo_unidad" VARCHAR(40) DEFAULT 'AUTO';

          ALTER TABLE "vehiculos"
          ADD COLUMN IF NOT EXISTS "activo" BOOLEAN DEFAULT true;

          UPDATE "vehiculos"
          SET "tipo_unidad" = 'AUTO'
          WHERE "tipo_unidad" IS NULL
             OR TRIM("tipo_unidad") = '';

          UPDATE "vehiculos"
          SET "activo" = true
          WHERE "activo" IS NULL;

        END IF;

        -- ÓRDENES
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'ordenes_trabajo'
        ) THEN

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'ordenes_trabajo'
            AND column_name = 'prioridad'
          ) THEN
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "prioridad" DROP DEFAULT;
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "prioridad" TYPE VARCHAR(30) USING "prioridad"::text;
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "prioridad" SET DEFAULT 'MEDIA';

            UPDATE "ordenes_trabajo"
            SET "prioridad" = 'MEDIA'
            WHERE "prioridad" IS NULL
               OR TRIM("prioridad") = '';
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'ordenes_trabajo'
            AND column_name = 'estado'
          ) THEN
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "estado" DROP DEFAULT;
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "estado" TYPE VARCHAR(50) USING "estado"::text;
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "estado" SET DEFAULT 'RECEPCIONADO';

            UPDATE "ordenes_trabajo"
            SET "estado" = 'RECEPCIONADO'
            WHERE "estado" IS NULL
               OR TRIM("estado") = '';
          END IF;

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'ordenes_trabajo'
            AND column_name = 'estado_pago'
          ) THEN
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "estado_pago" DROP DEFAULT;
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "estado_pago" TYPE VARCHAR(30) USING "estado_pago"::text;
            ALTER TABLE "ordenes_trabajo" ALTER COLUMN "estado_pago" SET DEFAULT 'PENDIENTE';

            UPDATE "ordenes_trabajo"
            SET "estado_pago" = 'PENDIENTE'
            WHERE "estado_pago" IS NULL
               OR TRIM("estado_pago") = '';
          END IF;

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "medio_pago" VARCHAR(40) DEFAULT 'PENDIENTE';

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "monto_pagado" DECIMAL(10, 2) DEFAULT 0;

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "monto_total" DECIMAL(10, 2) DEFAULT 0;

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "monto_original" DECIMAL(10, 2);

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "monto_final" DECIMAL(10, 2);

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "motivo_ajuste" TEXT;

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "ajustado_por" VARCHAR(100);

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "ajustado_at" TIMESTAMP WITH TIME ZONE;

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "historial_ajustes" JSONB DEFAULT '[]'::jsonb;

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "fecha_pago" TIMESTAMP WITH TIME ZONE;

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "cobrado_por" VARCHAR(100);

          ALTER TABLE "ordenes_trabajo"
          ADD COLUMN IF NOT EXISTS "observacion_pago" TEXT;

          UPDATE "ordenes_trabajo"
          SET "medio_pago" = 'PENDIENTE'
          WHERE "medio_pago" IS NULL
             OR TRIM("medio_pago") = '';

          UPDATE "ordenes_trabajo"
          SET "monto_pagado" = 0
          WHERE "monto_pagado" IS NULL;

          UPDATE "ordenes_trabajo"
          SET "monto_final" = COALESCE("monto_final", "monto_total", 0)
          WHERE "monto_final" IS NULL;

          UPDATE "ordenes_trabajo"
          SET "historial_ajustes" = '[]'::jsonb
          WHERE "historial_ajustes" IS NULL;

        END IF;

      END $$;
    `);

    console.log("Base de datos preparada para garage, fila y pagos");
  } catch (error) {
    console.warn("No se pudo preparar base de datos:", error.message);
  }
};

// ====================== CREAR / ACTUALIZAR OWNER ======================

const crearUsuarioMaestro = async () => {
  try {
    const passwordInicial = process.env.OWNER_INITIAL_PASSWORD || "123";
    const passwordHash = await bcrypt.hash(passwordInicial, 10);

    const [usuarios] = await sequelize.query(`
      SELECT "id", "username", "rol"
      FROM "Usuarios"
      WHERE "username" = 'gaston'
      LIMIT 1;
    `);

    if (usuarios.length > 0) {
      await sequelize.query(
        `
        UPDATE "Usuarios"
        SET "rol" = 'OWNER',
            "nombre" = COALESCE("nombre", 'Gastón Muñoz'),
            "activo" = true,
            "updatedAt" = NOW()
        WHERE "username" = 'gaston';
        `
      );

      console.log("Usuario gaston verificado como OWNER sin resetear password");
      return;
    }

    await sequelize.query(
      `
      INSERT INTO "Usuarios"
        ("id", "nombre", "username", "password", "rol", "activo", "createdAt", "updatedAt")
      VALUES
        (:id, :nombre, :username, :password, :rol, true, NOW(), NOW());
      `,
      {
        replacements: {
          id: crypto.randomUUID(),
          nombre: "Gastón Muñoz",
          username: "gaston",
          password: passwordHash,
          rol: "OWNER",
        },
      }
    );

    console.log("ACCESO OWNER CREADO: usuario gaston");
  } catch (error) {
    console.error("Error creando usuario maestro:", error);
    throw error;
  }
};

// ====================== INICIAR SERVIDOR ======================

const startServer = async () => {
  try {
    await prepararBaseDatos();

    await sequelize.sync();
    console.log("BASE DE DATOS SINCRONIZADA SIN ALTER AUTOMÁTICO");

    await crearUsuarioMaestro();

    console.log("Uploads path:", uploadsPath);

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`SERVIDOR ESCUCHANDO EN PUERTO ${PORT}`);

      console.log("Endpoints activos:");
      console.log("   /");
      console.log("   /api/health");
      console.log("   /api/auth/test");
      console.log("   /api/auth/login");
      console.log("   /api/auth/me");
      console.log("   /api/portal/auth/login");
      console.log("   /api/portal/files");
      console.log("   /api/portal/creditos");
      console.log("   /api/portal/mensajes");
      console.log("   /api/portal/admin");
      console.log("   /api/mensajes");
      console.log("   /api/usuarios");
      console.log("   /api/clientes");
      console.log("   /api/vehiculos DIRECT-SERVER-V6");
      console.log("   /api/ordenes");
      console.log("   /api/diagnosticos");
      console.log("   /api/archivos-ecu");
      console.log("   /api/fotos");
      console.log("   /api/notificaciones");
      console.log("   /api/push");
      console.log("   /api/automatizaciones/scheduler/status");

      iniciarSchedulerInterno();
    });
  } catch (error) {
    console.error("ERROR AL ARRANCAR:", error);
    process.exit(1);
  }
};

startServer();
