const { Op, QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const {
  Cliente,
  CierreSemanal,
  ComprobantePago,
  FondoReservaMovimiento,
  MaterialRecuperado,
  MovimientoFinanciero,
  OrdenTrabajo,
  Vehiculo,
} = require("../models");
const { crearNotificacionesInternas } = require("./notificacionController");
const {
  descargarComprobante: descargarComprobantePrivado,
} = require("./archivoPrivadoController");

const TIPOS_MATERIAL = ["LOZA_DPF", "OTRO"];
const ESTADOS_MATERIAL = ["ACUMULADO", "VENDIDO", "DESCARTADO", "AJUSTADO"];
const LOTES_ESTADO = ["ABIERTO", "CERRADO", "VENDIDO"];
const ROLES_VALORES = ["OWNER", "ADMIN"];
const ROLES_CIERRE = ["OWNER", "ADMIN"];
const PARTICIPANTES_CIERRE = ["Gastón Muñoz", "Felipe Pozo", "Alejandro Cea"];
const PORCENTAJE_FONDO_RESERVA = 15;

const TIPOS_MOVIMIENTO = ["INGRESO", "EGRESO"];
const CATEGORIAS_INGRESO = ["SERVICIO", "FILE_SERVICE", "VENTA_MATERIAL", "OTRO"];
const CATEGORIAS_EGRESO = [
  "GASTO_OPERATIVO",
  "SUELDO",
  "COMPRA",
  "HERRAMIENTA",
  "ARRIENDO",
  "TRANSPORTE",
  "MARKETING",
  "IMPUESTO_PROVISION",
  "OTRO",
];
const METODOS_PAGO = ["TRANSFERENCIA", "EFECTIVO", "TARJETA", "OTRO"];
const ESTADOS_COMPROBANTE = ["PENDIENTE_REVISION", "VALIDADO", "RECHAZADO"];
const TIPOS_FONDO = ["APORTE", "RETIRO", "AJUSTE"];
const ESTADOS_CIERRE = ["BORRADOR", "CERRADO", "PAGADO"];

let tablaPreparada = false;
let tablasFinanzasPreparadas = false;

const prepararTablaMaterial = async () => {
  if (tablaPreparada) return;

  await MaterialRecuperado.sync();
  await sequelize.query(`
    ALTER TABLE materiales_recuperados
      ADD COLUMN IF NOT EXISTS "ordenId" INTEGER,
      ADD COLUMN IF NOT EXISTS "clienteId" INTEGER,
      ADD COLUMN IF NOT EXISTS "vehiculoId" INTEGER,
      ADD COLUMN IF NOT EXISTS "fecha" DATE,
      ADD COLUMN IF NOT EXISTS "marca" VARCHAR(80),
      ADD COLUMN IF NOT EXISTS "modelo" VARCHAR(120),
      ADD COLUMN IF NOT EXISTS "motor" VARCHAR(80),
      ADD COLUMN IF NOT EXISTS "anio" INTEGER,
      ADD COLUMN IF NOT EXISTS "patente" VARCHAR(30),
      ADD COLUMN IF NOT EXISTS "tipo_material" VARCHAR(40) DEFAULT 'LOZA_DPF',
      ADD COLUMN IF NOT EXISTS "kilos" DECIMAL(12,3) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "precio_estimado_kg" DECIMAL(12,2) DEFAULT 11000,
      ADD COLUMN IF NOT EXISTS "valor_estimado" DECIMAL(14,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "lote_mes" VARCHAR(7),
      ADD COLUMN IF NOT EXISTS "lote_estado" VARCHAR(30) DEFAULT 'ABIERTO',
      ADD COLUMN IF NOT EXISTS "estado" VARCHAR(30) DEFAULT 'ACUMULADO',
      ADD COLUMN IF NOT EXISTS "comprador" VARCHAR(160),
      ADD COLUMN IF NOT EXISTS "precio_real_kg" DECIMAL(12,2),
      ADD COLUMN IF NOT EXISTS "valor_real" DECIMAL(14,2),
      ADD COLUMN IF NOT EXISTS "observacion" TEXT,
      ADD COLUMN IF NOT EXISTS "creado_por" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "marca_normalizada" VARCHAR(80),
      ADD COLUMN IF NOT EXISTS "modelo_normalizado" VARCHAR(120),
      ADD COLUMN IF NOT EXISTS "motor_normalizado" VARCHAR(80),
      ADD COLUMN IF NOT EXISTS "estadistica_clave" VARCHAR(280),
      ADD COLUMN IF NOT EXISTS "promedio_historico_kg" DECIMAL(12,3),
      ADD COLUMN IF NOT EXISTS "diferencia_porcentaje" DECIMAL(8,2),
      ADD COLUMN IF NOT EXISTS "alerta_rango" VARCHAR(30) DEFAULT 'OK',
      ADD COLUMN IF NOT EXISTS "confianza_estadistica" VARCHAR(30) DEFAULT 'BAJA',
      ADD COLUMN IF NOT EXISTS "lote_cerrado_por" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "lote_cerrado_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "auditoria" JSONB DEFAULT '[]'::jsonb
  `);
  await sequelize.query(`
    UPDATE materiales_recuperados
    SET
      "tipo_material" = COALESCE("tipo_material", 'LOZA_DPF'),
      "estado" = COALESCE("estado", 'ACUMULADO'),
      "lote_estado" = COALESCE("lote_estado", 'ABIERTO'),
      "precio_estimado_kg" = COALESCE("precio_estimado_kg", 11000),
      "valor_estimado" = COALESCE("valor_estimado", 0),
      "alerta_rango" = COALESCE("alerta_rango", 'OK'),
      "confianza_estadistica" = COALESCE("confianza_estadistica", 'BAJA'),
      "auditoria" = COALESCE("auditoria", '[]'::jsonb)
  `);

  tablaPreparada = true;
};

const prepararTablasFinanzas = async () => {
  if (tablasFinanzasPreparadas) return;

  await Promise.all([
    MovimientoFinanciero.sync(),
    FondoReservaMovimiento.sync(),
    CierreSemanal.sync(),
    ComprobantePago.sync(),
  ]);

  await sequelize.query(`
    ALTER TABLE movimientos_financieros
      ADD COLUMN IF NOT EXISTS "tipo" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "categoria" VARCHAR(80),
      ADD COLUMN IF NOT EXISTS "monto" DECIMAL(14,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "descripcion" TEXT,
      ADD COLUMN IF NOT EXISTS "fecha" DATE,
      ADD COLUMN IF NOT EXISTS "metodo_pago" VARCHAR(40) DEFAULT 'TRANSFERENCIA',
      ADD COLUMN IF NOT EXISTS "ordenId" INTEGER,
      ADD COLUMN IF NOT EXISTS "clienteId" INTEGER,
      ADD COLUMN IF NOT EXISTS "trabajador_nombre" VARCHAR(160),
      ADD COLUMN IF NOT EXISTS "proveedor" VARCHAR(160),
      ADD COLUMN IF NOT EXISTS "periodo" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "estado" VARCHAR(30) DEFAULT 'REGISTRADO',
      ADD COLUMN IF NOT EXISTS "comprobanteId" INTEGER,
      ADD COLUMN IF NOT EXISTS "creado_por" VARCHAR(100)
  `);

  await sequelize.query(`
    ALTER TABLE fondo_reserva_movimientos
      ADD COLUMN IF NOT EXISTS "tipo" VARCHAR(30) DEFAULT 'APORTE',
      ADD COLUMN IF NOT EXISTS "monto" DECIMAL(14,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "motivo" TEXT,
      ADD COLUMN IF NOT EXISTS "fecha" DATE,
      ADD COLUMN IF NOT EXISTS "creado_por" VARCHAR(100)
  `);

  await sequelize.query(`
    ALTER TABLE cierres_semanales
      ADD COLUMN IF NOT EXISTS "semana_inicio" DATE,
      ADD COLUMN IF NOT EXISTS "semana_fin" DATE,
      ADD COLUMN IF NOT EXISTS "ingresos_total" DECIMAL(14,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "egresos_total" DECIMAL(14,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "sueldos_total" DECIMAL(14,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "aporte_fondo_reserva" DECIMAL(14,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "utilidad_distribuible" DECIMAL(14,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "participantes" JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS "estado" VARCHAR(30) DEFAULT 'BORRADOR',
      ADD COLUMN IF NOT EXISTS "creado_por" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "cerrado_por" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "cerrado_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "auditoria" JSONB DEFAULT '[]'::jsonb
  `);

  await sequelize.query(`
    ALTER TABLE comprobantes_pago
      ADD COLUMN IF NOT EXISTS "ordenId" INTEGER,
      ADD COLUMN IF NOT EXISTS "clienteId" INTEGER,
      ADD COLUMN IF NOT EXISTS "movimientoFinancieroId" INTEGER,
      ADD COLUMN IF NOT EXISTS "monto" DECIMAL(14,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "fecha_pago" DATE,
      ADD COLUMN IF NOT EXISTS "metodo_pago" VARCHAR(40) DEFAULT 'TRANSFERENCIA',
      ADD COLUMN IF NOT EXISTS "banco_origen" VARCHAR(120),
      ADD COLUMN IF NOT EXISTS "folio_referencia" VARCHAR(120),
      ADD COLUMN IF NOT EXISTS "archivo_comprobante_path" TEXT,
      ADD COLUMN IF NOT EXISTS "archivo_comprobante_nombre" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "estado" VARCHAR(40) DEFAULT 'PENDIENTE_REVISION',
      ADD COLUMN IF NOT EXISTS "observacion" TEXT,
      ADD COLUMN IF NOT EXISTS "subido_por" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "validado_por" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "validado_at" TIMESTAMP WITH TIME ZONE
  `);

  tablasFinanzasPreparadas = true;
};

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const normalizarTexto = (valor) =>
  limpiarTexto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toUpperCase();

const normalizarNumero = (valor, defecto = 0) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : defecto;
};

const redondear = (valor, decimales = 2) => {
  const factor = 10 ** decimales;
  return Math.round((Number(valor) || 0) * factor) / factor;
};

const usuarioActual = (req) =>
  req.usuario?.username ||
  req.user?.username ||
  req.usuario?.nombre ||
  req.user?.nombre ||
  "sistema";

const puedeVerValores = (req) => ROLES_VALORES.includes(req.usuario?.rol);
const puedeCerrarLote = (req) => ROLES_CIERRE.includes(req.usuario?.rol);
const exigirValores = (req, res) => {
  if (puedeVerValores(req)) return true;
  res.status(403).json({ error: "No tienes permisos para ver o modificar valores financieros" });
  return false;
};

const normalizarMetodoPago = (valor) => {
  const metodo = limpiarTexto(valor).toUpperCase();
  return METODOS_PAGO.includes(metodo) ? metodo : "TRANSFERENCIA";
};

const normalizarTipoMovimiento = (valor) => {
  const tipo = limpiarTexto(valor).toUpperCase();
  return TIPOS_MOVIMIENTO.includes(tipo) ? tipo : "INGRESO";
};

const normalizarCategoriaMovimiento = (tipo, valor) => {
  const categoria = limpiarTexto(valor).toUpperCase();
  const validas = tipo === "EGRESO" ? CATEGORIAS_EGRESO : CATEGORIAS_INGRESO;
  return validas.includes(categoria) ? categoria : "OTRO";
};

const normalizarEstadoComprobante = (valor) => {
  const estado = limpiarTexto(valor).toUpperCase();
  return ESTADOS_COMPROBANTE.includes(estado) ? estado : "PENDIENTE_REVISION";
};

const normalizarTipoFondo = (valor) => {
  const tipo = limpiarTexto(valor).toUpperCase();
  return TIPOS_FONDO.includes(tipo) ? tipo : "APORTE";
};

const fechaFinDia = (valor) => {
  const fecha = new Date(`${fechaISO(valor)}T23:59:59.999`);
  return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
};

const inicioSemanaLocal = () => {
  const ahora = new Date();
  const dia = ahora.getDay() || 7;
  const inicio = new Date(ahora);
  inicio.setDate(ahora.getDate() - dia + 1);
  return inicio.toISOString().slice(0, 10);
};

const finSemanaDesdeInicio = (inicio) => {
  const fecha = new Date(`${fechaISO(inicio)}T00:00:00`);
  fecha.setDate(fecha.getDate() + 6);
  return fecha.toISOString().slice(0, 10);
};

const ocultarMovimientoSiCorresponde = (movimiento, req) => {
  const data =
    typeof movimiento.toJSON === "function" ? movimiento.toJSON() : movimiento;

  if (puedeVerValores(req)) return data;

  return {
    ...data,
    monto: null,
    trabajador_nombre: data.categoria === "SUELDO" ? null : data.trabajador_nombre,
    proveedor: null,
  };
};

const ocultarComprobanteSiCorresponde = (comprobante, req) => {
  const data =
    typeof comprobante.toJSON === "function" ? comprobante.toJSON() : comprobante;

  const seguro = {
    ...data,
    archivo_comprobante_disponible: Boolean(data.archivo_comprobante_path),
  };
  delete seguro.archivo_comprobante_path;

  if (puedeVerValores(req) || req.usuario?.rol === "RECEPCION") return seguro;

  return {
    ...seguro,
    monto: null,
    banco_origen: null,
    folio_referencia: null,
  };
};

const calcularParticipantes = (utilidadDistribuible, participantesRaw) => {
  const nombres =
    Array.isArray(participantesRaw) && participantesRaw.length
      ? participantesRaw.map((item) =>
          typeof item === "string" ? item : limpiarTexto(item.nombre)
        )
      : PARTICIPANTES_CIERRE;
  const montoBase = nombres.length
    ? redondear(normalizarNumero(utilidadDistribuible) / nombres.length, 0)
    : 0;

  return nombres.filter(Boolean).map((nombre) => ({
    nombre,
    monto: montoBase,
  }));
};

const calcularSaldoFondo = (movimientos) =>
  movimientos.reduce((acc, movimiento) => {
    const monto = normalizarNumero(movimiento.monto);
    if (movimiento.tipo === "RETIRO") return acc - monto;
    return acc + monto;
  }, 0);

const normalizarTipoMaterial = (valor) => {
  const tipo = limpiarTexto(valor).toUpperCase();
  return TIPOS_MATERIAL.includes(tipo) ? tipo : "LOZA_DPF";
};

const normalizarEstado = (valor) => {
  const estado = limpiarTexto(valor).toUpperCase();
  return ESTADOS_MATERIAL.includes(estado) ? estado : "ACUMULADO";
};

const loteDesdeFecha = (valor) => {
  const fecha = valor ? new Date(valor) : new Date();
  if (Number.isNaN(fecha.getTime())) {
    return new Date().toISOString().slice(0, 7);
  }
  return fecha.toISOString().slice(0, 7);
};

const fechaISO = (valor) => {
  const fecha = valor ? new Date(valor) : new Date();
  if (Number.isNaN(fecha.getTime())) return new Date().toISOString().slice(0, 10);
  return fecha.toISOString().slice(0, 10);
};

const construirClaveEstadistica = ({ marca, modelo, motor }) => {
  const marcaNormalizada = normalizarTexto(marca);
  const modeloNormalizado = normalizarTexto(modelo);
  const motorNormalizado = normalizarTexto(motor);
  const partes = [marcaNormalizada, modeloNormalizado];

  if (motorNormalizado) partes.push(motorNormalizado);

  return {
    marcaNormalizada,
    modeloNormalizado,
    motorNormalizado,
    clave: partes.filter(Boolean).join("|"),
  };
};

const confianzaPorCantidad = (cantidad) => {
  if (cantidad >= 6) return "ALTA";
  if (cantidad >= 3) return "MEDIA";
  return "BAJA";
};

const calcularEstadisticaValores = (registros) => {
  const valores = registros
    .map((registro) => normalizarNumero(registro.kilos))
    .filter((valor) => valor > 0);

  const cantidad = valores.length;
  const promedio =
    cantidad > 0 ? valores.reduce((acc, valor) => acc + valor, 0) / cantidad : 0;
  const minimo = cantidad > 0 ? Math.min(...valores) : 0;
  const maximo = cantidad > 0 ? Math.max(...valores) : 0;
  const varianza =
    cantidad > 1
      ? valores.reduce((acc, valor) => acc + (valor - promedio) ** 2, 0) /
        cantidad
      : 0;
  const desviacion = Math.sqrt(varianza);

  return {
    cantidad,
    promedio: redondear(promedio, 3),
    minimo: redondear(minimo, 3),
    maximo: redondear(maximo, 3),
    desviacion: redondear(desviacion, 3),
    confianza: confianzaPorCantidad(cantidad),
    valor_promedio_estimado: redondear(promedio * 11000, 0),
  };
};

const obtenerEstadisticaPorClave = async (clave, excluirId = null) => {
  if (!clave) {
    return calcularEstadisticaValores([]);
  }

  const where = {
    estadistica_clave: clave,
    estado: {
      [Op.ne]: "DESCARTADO",
    },
  };

  if (excluirId) {
    where.id = {
      [Op.ne]: excluirId,
    };
  }

  const registros = await MaterialRecuperado.findAll({
    where,
    attributes: ["id", "kilos"],
  });

  return calcularEstadisticaValores(registros);
};

const compararConHistorico = (kilos, estadistica) => {
  const promedio = normalizarNumero(estadistica.promedio);

  if (!promedio || promedio <= 0) {
    return {
      alerta_rango: "OK",
      diferencia_porcentaje: null,
    };
  }

  const diferencia = Math.abs((normalizarNumero(kilos) - promedio) / promedio) * 100;
  const diferenciaRedondeada = redondear(diferencia, 2);

  if (diferenciaRedondeada <= 10) {
    return {
      alerta_rango: "OK",
      diferencia_porcentaje: diferenciaRedondeada,
    };
  }

  if (diferenciaRedondeada <= 20) {
    return {
      alerta_rango: "REVISAR",
      diferencia_porcentaje: diferenciaRedondeada,
    };
  }

  return {
    alerta_rango: "ALERTA",
    diferencia_porcentaje: diferenciaRedondeada,
  };
};

const eventoAuditoria = (tipo, req, detalle = {}) => ({
  tipo,
  usuario: usuarioActual(req),
  fecha: new Date().toISOString(),
  ...detalle,
});

const normalizarAuditoria = (valor) => {
  if (Array.isArray(valor)) return valor;
  if (typeof valor === "string" && valor.trim()) {
    try {
      const parsed = JSON.parse(valor);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const ocultarValoresSiCorresponde = (registro, req) => {
  const data = typeof registro.toJSON === "function" ? registro.toJSON() : registro;

  if (puedeVerValores(req)) {
    return data;
  }

  return {
    ...data,
    precio_estimado_kg: null,
    valor_estimado: null,
    comprador: null,
    precio_real_kg: null,
    valor_real: null,
  };
};

const enriquecerDesdeOrden = async (payload) => {
  const ordenId = payload.ordenId ? Number(payload.ordenId) : null;

  if (!ordenId) return payload;

  const orden = await OrdenTrabajo.findByPk(ordenId);
  if (!orden) return payload;

  const vehiculo = orden.vehiculoId ? await Vehiculo.findByPk(orden.vehiculoId) : null;
  const cliente = vehiculo?.clienteId ? await Cliente.findByPk(vehiculo.clienteId) : null;

  return {
    ...payload,
    ordenId,
    vehiculoId: payload.vehiculoId || vehiculo?.id || null,
    clienteId: payload.clienteId || cliente?.id || vehiculo?.clienteId || null,
    marca: payload.marca || vehiculo?.marca || "",
    modelo: payload.modelo || vehiculo?.modelo || "",
    anio: payload.anio || vehiculo?.anio || null,
    patente: payload.patente || vehiculo?.patente || "",
  };
};

const construirPayloadBase = async (req, existente = null) => {
  const body = req.body || {};
  const inicial = {
    ordenId: body.ordenId || body.orden_id || existente?.ordenId || null,
    clienteId: body.clienteId || body.cliente_id || existente?.clienteId || null,
    vehiculoId: body.vehiculoId || body.vehiculo_id || existente?.vehiculoId || null,
    fecha: fechaISO(body.fecha || existente?.fecha),
    marca: limpiarTexto(body.marca || existente?.marca),
    modelo: limpiarTexto(body.modelo || existente?.modelo),
    motor: limpiarTexto(body.motor || existente?.motor),
    anio: body.anio || existente?.anio || null,
    patente: limpiarTexto(body.patente || existente?.patente),
    tipo_material: normalizarTipoMaterial(body.tipo_material || existente?.tipo_material),
    kilos: normalizarNumero(body.kilos ?? existente?.kilos, 0),
    estado: normalizarEstado(body.estado || existente?.estado),
    observacion: limpiarTexto(body.observacion || existente?.observacion),
  };

  const enriquecido = await enriquecerDesdeOrden(inicial);
  const precioEstimado = puedeVerValores(req)
    ? normalizarNumero(body.precio_estimado_kg ?? existente?.precio_estimado_kg, 11000)
    : normalizarNumero(existente?.precio_estimado_kg, 11000);
  const { marcaNormalizada, modeloNormalizado, motorNormalizado, clave } =
    construirClaveEstadistica(enriquecido);

  return {
    ...enriquecido,
    fecha: fechaISO(enriquecido.fecha),
    lote_mes: loteDesdeFecha(enriquecido.fecha),
    anio: enriquecido.anio ? Number(enriquecido.anio) || null : null,
    precio_estimado_kg: precioEstimado > 0 ? precioEstimado : 11000,
    valor_estimado: redondear(enriquecido.kilos * (precioEstimado || 11000), 0),
    marca_normalizada: marcaNormalizada,
    modelo_normalizado: modeloNormalizado,
    motor_normalizado: motorNormalizado,
    estadistica_clave: clave,
  };
};

const validarPayloadMaterial = (payload) => {
  if (!payload.marca || !payload.modelo) {
    return "Marca y modelo son obligatorios para estadistica por modelo.";
  }

  if (!payload.kilos || payload.kilos <= 0) {
    return "Los kilos deben ser mayores a 0.";
  }

  if (!payload.estadistica_clave) {
    return "No se pudo construir clave estadistica del modelo.";
  }

  return null;
};

const listarMaterialRecuperado = async (req, res) => {
  try {
    await prepararTablaMaterial();

    const where = {};
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 300);

    if (req.query.ordenId) where.ordenId = Number(req.query.ordenId);
    if (req.query.vehiculoId) where.vehiculoId = Number(req.query.vehiculoId);
    if (req.query.clienteId) where.clienteId = Number(req.query.clienteId);
    if (req.query.lote_mes) where.lote_mes = limpiarTexto(req.query.lote_mes);
    if (req.query.estado) where.estado = limpiarTexto(req.query.estado).toUpperCase();

    const registros = await MaterialRecuperado.findAll({
      where,
      order: [["fecha", "DESC"], ["id", "DESC"]],
      limit,
    });

    res.json({
      registros: registros.map((registro) => ocultarValoresSiCorresponde(registro, req)),
      puedeVerValores: puedeVerValores(req),
      puedeCerrarLote: puedeCerrarLote(req),
    });
  } catch (error) {
    console.error("ERROR LISTANDO MATERIAL RECUPERADO:", error);
    res.status(500).json({ error: "No se pudo listar material recuperado" });
  }
};

const crearMaterialRecuperado = async (req, res) => {
  try {
    await prepararTablaMaterial();

    const payload = await construirPayloadBase(req);
    const error = validarPayloadMaterial(payload);

    if (error) {
      return res.status(400).json({ error });
    }

    const estadistica = await obtenerEstadisticaPorClave(payload.estadistica_clave);
    const comparacion = compararConHistorico(payload.kilos, estadistica);
    const registro = await MaterialRecuperado.create({
      ...payload,
      promedio_historico_kg: estadistica.cantidad > 0 ? estadistica.promedio : null,
      diferencia_porcentaje: comparacion.diferencia_porcentaje,
      alerta_rango: comparacion.alerta_rango,
      confianza_estadistica: estadistica.confianza,
      creado_por: usuarioActual(req),
      auditoria: [
        eventoAuditoria("MATERIAL_REGISTRADO", req, {
          kilos: payload.kilos,
          alerta_rango: comparacion.alerta_rango,
          estadistica_clave: payload.estadistica_clave,
        }),
      ],
    });

    if (comparacion.alerta_rango === "ALERTA") {
      try {
        await crearNotificacionesInternas({
          rolesDestino: ["OWNER", "ADMIN"],
          tipo: "MATERIAL_RECUPERADO_FUERA_RANGO",
          titulo: "Alerta material recuperado fuera de rango",
          mensaje:
            "El registro de material recuperado difiere mas de 20% del promedio historico para este modelo.",
          ordenId: registro.ordenId,
          accion_url: `/finanzas?tab=material&materialId=${registro.id}`,
          accion_tipo: "ABRIR_MATERIAL_RECUPERADO",
          entidad_tipo: "MATERIAL_RECUPERADO",
          entidad_id: String(registro.id),
          metadata: {
            materialId: registro.id,
            estadistica_clave: registro.estadistica_clave,
            diferencia_porcentaje: registro.diferencia_porcentaje,
          },
        });
      } catch (errorNotificacion) {
        console.warn("No se pudo notificar alerta de material:", errorNotificacion.message);
      }
    }

    res.status(201).json({
      mensaje: "Material recuperado registrado",
      registro: ocultarValoresSiCorresponde(registro, req),
      estadistica,
      comparacion,
    });
  } catch (error) {
    console.error("ERROR CREANDO MATERIAL RECUPERADO:", error);
    res.status(500).json({ error: "No se pudo registrar material recuperado" });
  }
};

const actualizarMaterialRecuperado = async (req, res) => {
  try {
    await prepararTablaMaterial();

    const registro = await MaterialRecuperado.findByPk(req.params.id);

    if (!registro) {
      return res.status(404).json({ error: "Registro de material no encontrado" });
    }

    const payload = await construirPayloadBase(req, registro);
    const error = validarPayloadMaterial(payload);

    if (error) {
      return res.status(400).json({ error });
    }

    const estadistica = await obtenerEstadisticaPorClave(
      payload.estadistica_clave,
      registro.id
    );
    const comparacion = compararConHistorico(payload.kilos, estadistica);
    const auditoria = normalizarAuditoria(registro.auditoria);

    await registro.update({
      ...payload,
      promedio_historico_kg: estadistica.cantidad > 0 ? estadistica.promedio : null,
      diferencia_porcentaje: comparacion.diferencia_porcentaje,
      alerta_rango: comparacion.alerta_rango,
      confianza_estadistica: estadistica.confianza,
      auditoria: [
        eventoAuditoria("MATERIAL_AJUSTADO", req, {
          kilos: payload.kilos,
          alerta_rango: comparacion.alerta_rango,
        }),
        ...auditoria,
      ],
    });

    res.json({
      mensaje: "Material recuperado actualizado",
      registro: ocultarValoresSiCorresponde(registro, req),
      estadistica,
      comparacion,
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO MATERIAL RECUPERADO:", error);
    res.status(500).json({ error: "No se pudo actualizar material recuperado" });
  }
};

const marcarMaterialVendido = async (req, res) => {
  try {
    await prepararTablaMaterial();

    if (!puedeCerrarLote(req)) {
      return res.status(403).json({ error: "Solo OWNER/ADMIN puede marcar venta" });
    }

    const registro = await MaterialRecuperado.findByPk(req.params.id);

    if (!registro) {
      return res.status(404).json({ error: "Registro de material no encontrado" });
    }

    const precioRealKg = normalizarNumero(req.body.precio_real_kg, 0);
    const comprador = limpiarTexto(req.body.comprador);

    if (precioRealKg <= 0) {
      return res.status(400).json({ error: "Precio real por kg debe ser mayor a 0" });
    }

    const auditoria = normalizarAuditoria(registro.auditoria);
    const valorReal = redondear(normalizarNumero(registro.kilos) * precioRealKg, 0);

    await registro.update({
      estado: "VENDIDO",
      comprador,
      precio_real_kg: precioRealKg,
      valor_real: valorReal,
      auditoria: [
        eventoAuditoria("MATERIAL_VENDIDO", req, {
          comprador,
          precio_real_kg: precioRealKg,
          valor_real: valorReal,
        }),
        ...auditoria,
      ],
    });

    res.json({
      mensaje: "Material marcado como vendido",
      registro: ocultarValoresSiCorresponde(registro, req),
    });
  } catch (error) {
    console.error("ERROR MARCANDO MATERIAL VENDIDO:", error);
    res.status(500).json({ error: "No se pudo marcar venta de material" });
  }
};

const obtenerEstadisticasModelo = async (req, res) => {
  try {
    await prepararTablaMaterial();

    const registros = await MaterialRecuperado.findAll({
      where: {
        estado: {
          [Op.ne]: "DESCARTADO",
        },
      },
      order: [["marca_normalizada", "ASC"], ["modelo_normalizado", "ASC"]],
    });

    const grupos = registros.reduce((acc, registro) => {
      const clave = registro.estadistica_clave || "";
      if (!clave) return acc;
      if (!acc[clave]) {
        acc[clave] = {
          clave,
          marca: registro.marca,
          modelo: registro.modelo,
          motor: registro.motor,
          registros: [],
        };
      }
      acc[clave].registros.push(registro);
      return acc;
    }, {});

    const estadisticas = Object.values(grupos)
      .map((grupo) => ({
        clave: grupo.clave,
        marca: grupo.marca,
        modelo: grupo.modelo,
        motor: grupo.motor,
        ...calcularEstadisticaValores(grupo.registros),
      }))
      .sort((a, b) => b.promedio - a.promedio);

    res.json({
      estadisticas: puedeVerValores(req)
        ? estadisticas
        : estadisticas.map((item) => ({
            ...item,
            valor_promedio_estimado: null,
          })),
      puedeVerValores: puedeVerValores(req),
    });
  } catch (error) {
    console.error("ERROR ESTADISTICAS MATERIAL:", error);
    res.status(500).json({ error: "No se pudo calcular estadisticas" });
  }
};

const calcularResumenLote = (registros, req) => {
  const totalKgReales = registros.reduce(
    (acc, item) => acc + (item.estado === "DESCARTADO" ? 0 : normalizarNumero(item.kilos)),
    0
  );
  const totalKgVendidos = registros.reduce(
    (acc, item) => acc + (item.estado === "VENDIDO" ? normalizarNumero(item.kilos) : 0),
    0
  );
  const totalKgEsperados = registros.reduce((acc, item) => {
    const esperado = normalizarNumero(item.promedio_historico_kg, 0);
    return acc + (esperado > 0 ? esperado : normalizarNumero(item.kilos));
  }, 0);
  const valorEstimado = registros.reduce(
    (acc, item) =>
      acc + (item.estado === "DESCARTADO" ? 0 : normalizarNumero(item.valor_estimado)),
    0
  );
  const valorReal = registros.reduce(
    (acc, item) => acc + normalizarNumero(item.valor_real),
    0
  );
  const diferenciaKg = redondear(totalKgReales - totalKgEsperados, 3);
  const diferenciaPorcentaje =
    totalKgEsperados > 0 ? redondear((diferenciaKg / totalKgEsperados) * 100, 2) : 0;
  const todosVendidos =
    registros.length > 0 && registros.every((item) => item.estado === "VENDIDO");
  const algunoCerrado = registros.some((item) => item.lote_estado === "CERRADO");
  const estadoLote = todosVendidos ? "VENDIDO" : algunoCerrado ? "CERRADO" : "ABIERTO";
  const alerta = Math.abs(diferenciaPorcentaje) > 20 ? "ALERTA" : "OK";

  return {
    lote_mes: registros[0]?.lote_mes || null,
    estado_lote: estadoLote,
    total_registros: registros.length,
    kg_esperados: redondear(totalKgEsperados, 3),
    kg_reales: redondear(totalKgReales, 3),
    kg_vendidos: redondear(totalKgVendidos, 3),
    diferencia_kg: diferenciaKg,
    diferencia_porcentaje: diferenciaPorcentaje,
    valor_estimado: puedeVerValores(req) ? redondear(valorEstimado, 0) : null,
    valor_real_vendido: puedeVerValores(req) ? redondear(valorReal, 0) : null,
    alerta,
  };
};

const obtenerLoteMensual = async (req, res) => {
  try {
    await prepararTablaMaterial();

    const loteMes = limpiarTexto(req.params.loteMes || req.query.lote_mes);
    const registros = await MaterialRecuperado.findAll({
      where: {
        lote_mes: loteMes,
      },
      order: [["fecha", "ASC"], ["id", "ASC"]],
    });

    res.json({
      resumen: calcularResumenLote(registros, req),
      registros: registros.map((registro) => ocultarValoresSiCorresponde(registro, req)),
      puedeVerValores: puedeVerValores(req),
    });
  } catch (error) {
    console.error("ERROR OBTENIENDO LOTE MATERIAL:", error);
    res.status(500).json({ error: "No se pudo obtener lote mensual" });
  }
};

const cerrarLoteMensual = async (req, res) => {
  try {
    await prepararTablaMaterial();

    if (!puedeCerrarLote(req)) {
      return res.status(403).json({ error: "Solo OWNER/ADMIN puede cerrar lote" });
    }

    const loteMes = limpiarTexto(req.params.loteMes);
    const registros = await MaterialRecuperado.findAll({
      where: {
        lote_mes: loteMes,
      },
    });

    if (!registros.length) {
      return res.status(404).json({ error: "Lote mensual sin registros" });
    }

    await Promise.all(
      registros.map((registro) => {
        const auditoria = normalizarAuditoria(registro.auditoria);
        return registro.update({
          lote_estado: "CERRADO",
          lote_cerrado_por: usuarioActual(req),
          lote_cerrado_at: new Date(),
          auditoria: [
            eventoAuditoria("LOTE_CERRADO", req, {
              lote_mes: loteMes,
              observacion: limpiarTexto(req.body.observacion),
            }),
            ...auditoria,
          ],
        });
      })
    );

    const actualizados = await MaterialRecuperado.findAll({
      where: { lote_mes: loteMes },
    });

    res.json({
      mensaje: "Lote mensual cerrado",
      resumen: calcularResumenLote(actualizados, req),
    });
  } catch (error) {
    console.error("ERROR CERRANDO LOTE MATERIAL:", error);
    res.status(500).json({ error: "No se pudo cerrar lote mensual" });
  }
};

const listarOrdenesParaMaterial = async (req, res) => {
  try {
    const rows = await sequelize.query(
      `
      SELECT
        o."id",
        o."estado",
        o."motivo_ingreso",
        o."intervencion_fisica_tipo",
        o."createdAt",
        v."id" AS "vehiculoId",
        v."patente",
        v."marca",
        v."modelo",
        v."anio",
        c."id" AS "clienteId",
        c."nombre" AS "cliente_nombre"
      FROM "ordenes_trabajo" o
      LEFT JOIN "vehiculos" v ON v."id" = o."vehiculoId"
      LEFT JOIN "clientes" c ON c."id" = v."clienteId"
      ORDER BY o."createdAt" DESC
      LIMIT 120;
      `,
      { type: QueryTypes.SELECT }
    );

    res.json(rows);
  } catch (error) {
    console.error("ERROR LISTANDO ORDENES MATERIAL:", error);
    res.status(500).json({ error: "No se pudieron listar ordenes para material" });
  }
};

const crearMovimientoDesdePayload = async (req, forzar = {}) => {
  const tipo = forzar.tipo || normalizarTipoMovimiento(req.body.tipo);
  const categoria =
    forzar.categoria || normalizarCategoriaMovimiento(tipo, req.body.categoria);
  const monto = normalizarNumero(req.body.monto, 0);

  if (monto <= 0) {
    const error = new Error("El monto debe ser mayor a 0");
    error.status = 400;
    throw error;
  }

  return MovimientoFinanciero.create({
    tipo,
    categoria,
    monto,
    descripcion: limpiarTexto(req.body.descripcion || req.body.observacion),
    fecha: fechaISO(req.body.fecha),
    metodo_pago: normalizarMetodoPago(req.body.metodo_pago),
    ordenId: req.body.ordenId || req.body.orden_id || null,
    clienteId: req.body.clienteId || req.body.cliente_id || null,
    trabajador_nombre: limpiarTexto(req.body.trabajador_nombre || req.body.trabajador),
    proveedor: limpiarTexto(req.body.proveedor),
    periodo: limpiarTexto(req.body.periodo),
    estado: limpiarTexto(req.body.estado || forzar.estado || "REGISTRADO").toUpperCase(),
    comprobanteId: req.body.comprobanteId || req.body.comprobante_id || null,
    creado_por: usuarioActual(req),
  });
};

const listarMovimientos = async (req, res) => {
  try {
    await prepararTablasFinanzas();
    if (!exigirValores(req, res)) return;

    const where = {};
    const limit = Math.min(Math.max(Number(req.query.limit) || 150, 1), 300);

    if (req.query.tipo) where.tipo = limpiarTexto(req.query.tipo).toUpperCase();
    if (req.query.categoria) where.categoria = limpiarTexto(req.query.categoria).toUpperCase();
    if (req.query.ordenId) where.ordenId = Number(req.query.ordenId);

    const movimientos = await MovimientoFinanciero.findAll({
      where,
      order: [["fecha", "DESC"], ["id", "DESC"]],
      limit,
    });

    res.json({
      movimientos: movimientos.map((movimiento) =>
        ocultarMovimientoSiCorresponde(movimiento, req)
      ),
      puedeVerValores: true,
    });
  } catch (error) {
    console.error("ERROR LISTANDO MOVIMIENTOS:", error);
    res.status(error.status || 500).json({ error: error.message || "No se pudieron listar movimientos" });
  }
};

const crearMovimiento = async (req, res) => {
  try {
    await prepararTablasFinanzas();
    if (!exigirValores(req, res)) return;

    const movimiento = await crearMovimientoDesdePayload(req);

    res.status(201).json({
      mensaje: "Movimiento financiero registrado",
      movimiento,
    });
  } catch (error) {
    console.error("ERROR CREANDO MOVIMIENTO:", error);
    res.status(error.status || 500).json({ error: error.message || "No se pudo crear movimiento" });
  }
};

const actualizarMovimiento = async (req, res) => {
  try {
    await prepararTablasFinanzas();
    if (!exigirValores(req, res)) return;

    const movimiento = await MovimientoFinanciero.findByPk(req.params.id);

    if (!movimiento) {
      return res.status(404).json({ error: "Movimiento no encontrado" });
    }

    const tipo = Object.prototype.hasOwnProperty.call(req.body, "tipo")
      ? normalizarTipoMovimiento(req.body.tipo)
      : movimiento.tipo;
    const categoria = Object.prototype.hasOwnProperty.call(req.body, "categoria")
      ? normalizarCategoriaMovimiento(tipo, req.body.categoria)
      : movimiento.categoria;

    await movimiento.update({
      tipo,
      categoria,
      monto: Object.prototype.hasOwnProperty.call(req.body, "monto")
        ? normalizarNumero(req.body.monto, movimiento.monto)
        : movimiento.monto,
      descripcion: Object.prototype.hasOwnProperty.call(req.body, "descripcion")
        ? limpiarTexto(req.body.descripcion)
        : movimiento.descripcion,
      fecha: Object.prototype.hasOwnProperty.call(req.body, "fecha")
        ? fechaISO(req.body.fecha)
        : movimiento.fecha,
      metodo_pago: Object.prototype.hasOwnProperty.call(req.body, "metodo_pago")
        ? normalizarMetodoPago(req.body.metodo_pago)
        : movimiento.metodo_pago,
      trabajador_nombre: Object.prototype.hasOwnProperty.call(
        req.body,
        "trabajador_nombre"
      )
        ? limpiarTexto(req.body.trabajador_nombre)
        : movimiento.trabajador_nombre,
      proveedor: Object.prototype.hasOwnProperty.call(req.body, "proveedor")
        ? limpiarTexto(req.body.proveedor)
        : movimiento.proveedor,
      periodo: Object.prototype.hasOwnProperty.call(req.body, "periodo")
        ? limpiarTexto(req.body.periodo)
        : movimiento.periodo,
      estado: Object.prototype.hasOwnProperty.call(req.body, "estado")
        ? limpiarTexto(req.body.estado).toUpperCase()
        : movimiento.estado,
    });

    res.json({
      mensaje: "Movimiento financiero actualizado",
      movimiento,
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO MOVIMIENTO:", error);
    res.status(500).json({ error: "No se pudo actualizar movimiento" });
  }
};

const listarComprobantes = async (req, res) => {
  try {
    await prepararTablasFinanzas();

    const where = {};
    if (req.query.ordenId) where.ordenId = Number(req.query.ordenId);
    if (req.query.clienteId) where.clienteId = Number(req.query.clienteId);
    if (req.query.estado) where.estado = normalizarEstadoComprobante(req.query.estado);

    const comprobantes = await ComprobantePago.findAll({
      where,
      order: [["fecha_pago", "DESC"], ["id", "DESC"]],
      limit: Math.min(Math.max(Number(req.query.limit) || 100, 1), 250),
    });

    res.json({
      comprobantes: comprobantes.map((item) => ocultarComprobanteSiCorresponde(item, req)),
      puedeVerValores: puedeVerValores(req),
    });
  } catch (error) {
    console.error("ERROR LISTANDO COMPROBANTES:", error);
    res.status(500).json({ error: "No se pudieron listar comprobantes" });
  }
};

const crearComprobante = async (req, res) => {
  try {
    await prepararTablasFinanzas();

    const monto = normalizarNumero(req.body.monto, 0);
    if (monto <= 0) {
      return res.status(400).json({ error: "Monto de comprobante debe ser mayor a 0" });
    }

    const comprobante = await ComprobantePago.create({
      ordenId: req.body.ordenId || req.body.orden_id || null,
      clienteId: req.body.clienteId || req.body.cliente_id || null,
      movimientoFinancieroId:
        req.body.movimientoFinancieroId || req.body.movimiento_financiero_id || null,
      monto,
      fecha_pago: fechaISO(req.body.fecha_pago || req.body.fecha),
      metodo_pago: normalizarMetodoPago(req.body.metodo_pago),
      banco_origen: limpiarTexto(req.body.banco_origen),
      folio_referencia: limpiarTexto(req.body.folio_referencia),
      archivo_comprobante_path: req.file?.path || null,
      archivo_comprobante_nombre: req.file?.originalname || req.file?.filename || null,
      estado: "PENDIENTE_REVISION",
      observacion: limpiarTexto(req.body.observacion),
      subido_por: usuarioActual(req),
    });

    res.status(201).json({
      mensaje: "Comprobante subido para revision",
      comprobante: ocultarComprobanteSiCorresponde(comprobante, req),
    });
  } catch (error) {
    console.error("ERROR CREANDO COMPROBANTE:", error);
    res.status(500).json({ error: "No se pudo crear comprobante" });
  }
};

const actualizarComprobante = async (req, res) => {
  try {
    await prepararTablasFinanzas();
    if (!exigirValores(req, res)) return;

    const comprobante = await ComprobantePago.findByPk(req.params.id);
    if (!comprobante) {
      return res.status(404).json({ error: "Comprobante no encontrado" });
    }

    await comprobante.update({
      monto: Object.prototype.hasOwnProperty.call(req.body, "monto")
        ? normalizarNumero(req.body.monto, comprobante.monto)
        : comprobante.monto,
      fecha_pago: Object.prototype.hasOwnProperty.call(req.body, "fecha_pago")
        ? fechaISO(req.body.fecha_pago)
        : comprobante.fecha_pago,
      metodo_pago: Object.prototype.hasOwnProperty.call(req.body, "metodo_pago")
        ? normalizarMetodoPago(req.body.metodo_pago)
        : comprobante.metodo_pago,
      banco_origen: Object.prototype.hasOwnProperty.call(req.body, "banco_origen")
        ? limpiarTexto(req.body.banco_origen)
        : comprobante.banco_origen,
      folio_referencia: Object.prototype.hasOwnProperty.call(
        req.body,
        "folio_referencia"
      )
        ? limpiarTexto(req.body.folio_referencia)
        : comprobante.folio_referencia,
      observacion: Object.prototype.hasOwnProperty.call(req.body, "observacion")
        ? limpiarTexto(req.body.observacion)
        : comprobante.observacion,
    });

    res.json({
      mensaje: "Comprobante actualizado",
      comprobante: ocultarComprobanteSiCorresponde(comprobante, req),
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO COMPROBANTE:", error);
    res.status(500).json({ error: "No se pudo actualizar comprobante" });
  }
};

const cambiarEstadoComprobante = async (req, res, estado) => {
  try {
    await prepararTablasFinanzas();
    if (!exigirValores(req, res)) return;

    const comprobante = await ComprobantePago.findByPk(req.params.id);
    if (!comprobante) {
      return res.status(404).json({ error: "Comprobante no encontrado" });
    }

    await comprobante.update({
      estado,
      observacion: limpiarTexto(req.body.observacion || comprobante.observacion),
      validado_por: usuarioActual(req),
      validado_at: new Date(),
    });

    res.json({
      mensaje: estado === "VALIDADO" ? "Comprobante validado" : "Comprobante rechazado",
      comprobante: ocultarComprobanteSiCorresponde(comprobante, req),
    });
  } catch (error) {
    console.error("ERROR CAMBIANDO COMPROBANTE:", error);
    res.status(500).json({ error: "No se pudo actualizar estado de comprobante" });
  }
};

const validarComprobante = (req, res) => cambiarEstadoComprobante(req, res, "VALIDADO");
const rechazarComprobante = (req, res) => cambiarEstadoComprobante(req, res, "RECHAZADO");

const descargarComprobante = descargarComprobantePrivado;

const listarFondoReserva = async (req, res) => {
  try {
    await prepararTablasFinanzas();
    if (!exigirValores(req, res)) return;

    const movimientos = await FondoReservaMovimiento.findAll({
      order: [["fecha", "DESC"], ["id", "DESC"]],
      limit: 150,
    });

    res.json({
      porcentaje_sugerido: PORCENTAJE_FONDO_RESERVA,
      saldo_actual: redondear(calcularSaldoFondo(movimientos), 0),
      movimientos,
    });
  } catch (error) {
    console.error("ERROR FONDO RESERVA:", error);
    res.status(500).json({ error: "No se pudo cargar fondo de reserva" });
  }
};

const crearMovimientoFondo = async (req, res) => {
  try {
    await prepararTablasFinanzas();
    if (!exigirValores(req, res)) return;

    const monto = normalizarNumero(req.body.monto, 0);
    if (monto <= 0) {
      return res.status(400).json({ error: "Monto de fondo debe ser mayor a 0" });
    }

    const movimiento = await FondoReservaMovimiento.create({
      tipo: normalizarTipoFondo(req.body.tipo),
      monto,
      motivo: limpiarTexto(req.body.motivo),
      fecha: fechaISO(req.body.fecha),
      creado_por: usuarioActual(req),
    });

    res.status(201).json({
      mensaje: "Movimiento de fondo registrado",
      movimiento,
    });
  } catch (error) {
    console.error("ERROR MOVIMIENTO FONDO:", error);
    res.status(500).json({ error: "No se pudo registrar movimiento de fondo" });
  }
};

const calcularResumenSemana = async (inicio, fin) => {
  const movimientos = await MovimientoFinanciero.findAll({
    where: {
      fecha: {
        [Op.between]: [fechaISO(inicio), fechaISO(fin)],
      },
    },
  });
  const ingresos = movimientos
    .filter((item) => item.tipo === "INGRESO")
    .reduce((acc, item) => acc + normalizarNumero(item.monto), 0);
  const sueldos = movimientos
    .filter((item) => item.tipo === "EGRESO" && item.categoria === "SUELDO")
    .reduce((acc, item) => acc + normalizarNumero(item.monto), 0);
  const egresos = movimientos
    .filter((item) => item.tipo === "EGRESO" && item.categoria !== "SUELDO")
    .reduce((acc, item) => acc + normalizarNumero(item.monto), 0);
  const utilidadAntesReserva = ingresos - egresos - sueldos;
  const aporteFondo =
    utilidadAntesReserva > 0
      ? redondear(utilidadAntesReserva * (PORCENTAJE_FONDO_RESERVA / 100), 0)
      : 0;
  const utilidadDistribuible = redondear(utilidadAntesReserva - aporteFondo, 0);

  return {
    ingresos_total: redondear(ingresos, 0),
    egresos_total: redondear(egresos, 0),
    sueldos_total: redondear(sueldos, 0),
    aporte_fondo_reserva: aporteFondo,
    utilidad_distribuible: utilidadDistribuible,
    participantes: calcularParticipantes(utilidadDistribuible),
  };
};

const obtenerResumenFinanzas = async (req, res) => {
  try {
    await Promise.all([prepararTablasFinanzas(), prepararTablaMaterial()]);
    if (!exigirValores(req, res)) return;

    const inicio = req.query.semana_inicio || inicioSemanaLocal();
    const fin = req.query.semana_fin || finSemanaDesdeInicio(inicio);
    const resumenSemana = await calcularResumenSemana(inicio, fin);
    const pendientes = await ComprobantePago.count({
      where: { estado: "PENDIENTE_REVISION" },
    });
    const fondoMovimientos = await FondoReservaMovimiento.findAll();
    const loteMes = loteDesdeFecha(new Date());
    const materialMes = await MaterialRecuperado.findAll({
      where: { lote_mes: loteMes },
    });
    const resumenMaterial = calcularResumenLote(materialMes, req);

    res.json({
      semana_inicio: fechaISO(inicio),
      semana_fin: fechaISO(fin),
      ...resumenSemana,
      reparto_estimado_3: redondear(resumenSemana.utilidad_distribuible / 3, 0),
      pagos_pendientes: pendientes,
      fondo_reserva_saldo: redondear(calcularSaldoFondo(fondoMovimientos), 0),
      material_mes: resumenMaterial,
      porcentaje_fondo_reserva: PORCENTAJE_FONDO_RESERVA,
    });
  } catch (error) {
    console.error("ERROR RESUMEN FINANZAS:", error);
    res.status(500).json({ error: "No se pudo cargar resumen financiero" });
  }
};

const previsualizarCierreSemanal = async (req, res) => {
  try {
    await prepararTablasFinanzas();
    if (!exigirValores(req, res)) return;

    const inicio = req.query.semana_inicio || req.body.semana_inicio || inicioSemanaLocal();
    const fin = req.query.semana_fin || req.body.semana_fin || finSemanaDesdeInicio(inicio);
    const resumen = await calcularResumenSemana(inicio, fin);

    res.json({
      semana_inicio: fechaISO(inicio),
      semana_fin: fechaISO(fin),
      ...resumen,
    });
  } catch (error) {
    console.error("ERROR PREVIEW CIERRE:", error);
    res.status(500).json({ error: "No se pudo calcular cierre semanal" });
  }
};

const listarCierresSemanales = async (req, res) => {
  try {
    await prepararTablasFinanzas();
    if (!exigirValores(req, res)) return;

    const cierres = await CierreSemanal.findAll({
      order: [["semana_inicio", "DESC"], ["id", "DESC"]],
      limit: 80,
    });

    res.json({ cierres });
  } catch (error) {
    console.error("ERROR LISTANDO CIERRES:", error);
    res.status(500).json({ error: "No se pudieron listar cierres" });
  }
};

const crearCierreSemanal = async (req, res) => {
  try {
    await prepararTablasFinanzas();
    if (!exigirValores(req, res)) return;

    const inicio = fechaISO(req.body.semana_inicio || inicioSemanaLocal());
    const fin = fechaISO(req.body.semana_fin || finSemanaDesdeInicio(inicio));
    const resumen = await calcularResumenSemana(inicio, fin);
    const participantes = Array.isArray(req.body.participantes)
      ? req.body.participantes
      : resumen.participantes;
    const estado = limpiarTexto(req.body.estado || "BORRADOR").toUpperCase();
    const estadoSeguro = ESTADOS_CIERRE.includes(estado) ? estado : "BORRADOR";

    const cierre = await CierreSemanal.create({
      semana_inicio: inicio,
      semana_fin: fin,
      ...resumen,
      participantes,
      estado: estadoSeguro,
      creado_por: usuarioActual(req),
      cerrado_por: estadoSeguro === "CERRADO" ? usuarioActual(req) : null,
      cerrado_at: estadoSeguro === "CERRADO" ? new Date() : null,
      auditoria: [
        eventoAuditoria(
          estadoSeguro === "CERRADO" ? "CIERRE_SEMANAL_CERRADO" : "CIERRE_SEMANAL_BORRADOR",
          req,
          { semana_inicio: inicio, semana_fin: fin }
        ),
      ],
    });

    if (estadoSeguro === "CERRADO" && resumen.aporte_fondo_reserva > 0) {
      await FondoReservaMovimiento.create({
        tipo: "APORTE",
        monto: resumen.aporte_fondo_reserva,
        motivo: `Aporte automatico cierre semanal ${inicio} / ${fin}`,
        fecha: fin,
        creado_por: usuarioActual(req),
      });
    }

    res.status(201).json({
      mensaje:
        estadoSeguro === "CERRADO"
          ? "Cierre semanal cerrado"
          : "Cierre semanal guardado como borrador",
      cierre,
      advertencia:
        resumen.utilidad_distribuible < 0
          ? "La utilidad distribuible es negativa. Revisar antes de pagar."
          : null,
    });
  } catch (error) {
    console.error("ERROR CREANDO CIERRE:", error);
    res.status(500).json({ error: "No se pudo crear cierre semanal" });
  }
};

const registrarIngresoVentaMaterial = async (req, res) => {
  try {
    await Promise.all([prepararTablasFinanzas(), prepararTablaMaterial()]);
    if (!exigirValores(req, res)) return;

    const registro = await MaterialRecuperado.findByPk(req.params.id);
    if (!registro) {
      return res.status(404).json({ error: "Material recuperado no encontrado" });
    }

    const monto =
      normalizarNumero(req.body.monto, 0) ||
      normalizarNumero(registro.valor_real, 0) ||
      normalizarNumero(registro.valor_estimado, 0);

    if (monto <= 0) {
      return res.status(400).json({ error: "No hay valor para registrar ingreso" });
    }

    const movimiento = await MovimientoFinanciero.create({
      tipo: "INGRESO",
      categoria: "VENTA_MATERIAL",
      monto,
      descripcion:
        limpiarTexto(req.body.descripcion) ||
        `Ingreso por venta material recuperado #${registro.id}`,
      fecha: fechaISO(req.body.fecha || new Date()),
      metodo_pago: normalizarMetodoPago(req.body.metodo_pago),
      ordenId: registro.ordenId,
      clienteId: registro.clienteId,
      creado_por: usuarioActual(req),
    });

    const auditoria = normalizarAuditoria(registro.auditoria);
    await registro.update({
      auditoria: [
        eventoAuditoria("INGRESO_VENTA_MATERIAL_REGISTRADO", req, {
          movimientoFinancieroId: movimiento.id,
          monto,
        }),
        ...auditoria,
      ],
    });

    res.status(201).json({
      mensaje: "Ingreso por venta de material registrado",
      movimiento,
    });
  } catch (error) {
    console.error("ERROR INGRESO VENTA MATERIAL:", error);
    res.status(500).json({ error: "No se pudo registrar ingreso por venta material" });
  }
};

module.exports = {
  obtenerResumenFinanzas,
  listarMovimientos,
  crearMovimiento,
  actualizarMovimiento,
  listarComprobantes,
  crearComprobante,
  actualizarComprobante,
  validarComprobante,
  rechazarComprobante,
  descargarComprobante,
  listarFondoReserva,
  crearMovimientoFondo,
  previsualizarCierreSemanal,
  listarCierresSemanales,
  crearCierreSemanal,
  registrarIngresoVentaMaterial,
  listarMaterialRecuperado,
  crearMaterialRecuperado,
  actualizarMaterialRecuperado,
  marcarMaterialVendido,
  obtenerEstadisticasModelo,
  obtenerLoteMensual,
  cerrarLoteMensual,
  listarOrdenesParaMaterial,
};
