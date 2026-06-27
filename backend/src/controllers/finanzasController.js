const { Op, QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const {
  Cliente,
  MaterialRecuperado,
  OrdenTrabajo,
  Vehiculo,
} = require("../models");
const { crearNotificacionesInternas } = require("./notificacionController");

const TIPOS_MATERIAL = ["LOZA_DPF", "OTRO"];
const ESTADOS_MATERIAL = ["ACUMULADO", "VENDIDO", "DESCARTADO", "AJUSTADO"];
const LOTES_ESTADO = ["ABIERTO", "CERRADO", "VENDIDO"];
const ROLES_VALORES = ["OWNER", "ADMIN"];
const ROLES_CIERRE = ["OWNER", "ADMIN"];

let tablaPreparada = false;

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

module.exports = {
  listarMaterialRecuperado,
  crearMaterialRecuperado,
  actualizarMaterialRecuperado,
  marcarMaterialVendido,
  obtenerEstadisticasModelo,
  obtenerLoteMensual,
  cerrarLoteMensual,
  listarOrdenesParaMaterial,
};
