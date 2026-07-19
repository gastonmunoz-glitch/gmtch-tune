const { Op, QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const {
  Cliente,
  OrdenTrabajo,
  Diagnostico,
  ArchivoECU,
  OrdenServicioItem,
  MaterialRecuperado,
  Usuario,
} = require("../models");
const { normalizarPatente } = require("../utils/patente");

const LIMITE_ORDENES = 5;
const LIMITE_SERVICIOS = 5;
const LIMITE_DIAGNOSTICOS = 3;
const LIMITE_ARCHIVOS_ECU = 3;
const LIMITE_COINCIDENCIAS = 5;
const LIMITE_HISTORIAL_INTERNO = 50;

const ROLES_CON_TELEFONO = new Set([
  "RECEPCION",
  "OWNER",
  "ADMIN",
  "SUPERVISOR",
]);

const ESTADOS_ORDEN_TERMINALES = new Set([
  "ENTREGADO",
  "ANULADO",
  "ANULADA",
  "CANCELADO",
  "CANCELADA",
  "ARCHIVADO",
  "ARCHIVADA",
]);

const ESTADOS_FILE_SERVICE_TERMINALES = new Set([
  "FINALIZADO",
  "FINALIZADO_TECNICO",
  "ARCHIVADO",
]);

const UUID_VALIDO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const limpiarTexto = (valor, maximo = 200) => {
  const limpio = String(valor ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!limpio) return null;
  return limpio.slice(0, maximo);
};

const normalizarEstado = (valor) => String(valor || "").trim().toUpperCase();

const parsearLista = (valor) => {
  if (Array.isArray(valor)) return valor;
  if (!valor) return [];

  if (typeof valor === "string") {
    try {
      const parsed = JSON.parse(valor);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return valor
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const resumirServiciosArchivo = (archivo) => {
  const servicios = parsearLista(archivo.servicios_solicitados)
    .map((item) => {
      if (typeof item === "string") return limpiarTexto(item, 100);
      if (!item || typeof item !== "object") return null;

      return limpiarTexto(
        item.servicio || item.nombre || item.label || item.tipo || item.codigo,
        100
      );
    })
    .filter(Boolean);

  if (!servicios.length) {
    const fallback = limpiarTexto(
      archivo.servicio_principal || archivo.tipo_servicio || archivo.servicios_preset,
      100
    );
    if (fallback) servicios.push(fallback);
  }

  return [...new Set(servicios)].slice(0, 5);
};

const extraerServicioOrden = (motivoIngreso) => {
  const texto = String(motivoIngreso || "");
  const coincidencia = texto.match(
    /^(?:servicio solicitado|servicio urgente)\s*:\s*(.+)$/im
  );

  return limpiarTexto(coincidencia?.[1], 140);
};

const resumirDtc = (diagnostico) => {
  if (diagnostico.sin_dtc === true) return "Sin DTC registrados";

  return (
    limpiarTexto(diagnostico.codigos_dtc, 240) ||
    limpiarTexto(diagnostico.fallas_detectadas, 240) ||
    "Sin resumen DTC"
  );
};

const respuestaBase = (patente) => ({
  patente,
  fuente: "INTERNA",
  resultado: "NO_ENCONTRADO",
  existe_vehiculo: false,
  vehiculo: null,
  cliente: null,
  coincidencias: [],
  ultimas_ordenes: [],
  servicios_frecuentes: [],
  diagnosticos_recientes: [],
  archivos_ecu_recientes: [],
  responsable_sugerido: {
    principal: null,
    diagnostico: null,
    operador_ecu: null,
    mecanico: null,
  },
  alertas: [],
  sugerencias: [],
  puede_autocompletar: false,
  puede_consultar_externo: false,
});

const mapearVehiculo = (row) => ({
  id: row.id,
  patente: row.patente,
  marca: row.marca,
  modelo: row.modelo,
  anio: row.anio,
  vin: row.vin,
  tipo: row.tipo_unidad || null,
  activo: row.activo === true,
});

const mapearClienteCoincidencia = (row) =>
  row.cliente_id
    ? {
        id: row.cliente_id,
        nombre: row.cliente_nombre,
        categoria_cliente: row.cliente_categoria_cliente || "NORMAL",
      }
    : null;

const buscarCoincidenciasExactas = async ({ empresaId, patenteNormalizada }) => {
  return sequelize.query(
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
      c."id" AS "cliente_id",
      c."nombre" AS "cliente_nombre",
      c."categoria_cliente" AS "cliente_categoria_cliente"
    FROM "vehiculos" v
    LEFT JOIN "clientes" c
      ON c."id" = v."clienteId"
     AND c."empresaId" = :empresaId
    WHERE v."empresaId" = :empresaId
      AND REGEXP_REPLACE(
        TRANSLATE(
          UPPER(TRIM(COALESCE(v."patente", ''))),
          '.-‐‑‒–—―−',
          ''
        ),
        '[[:space:]]+',
        '',
        'g'
      ) = :patenteNormalizada
    ORDER BY v."activo" DESC, v."updatedAt" DESC NULLS LAST, v."id" DESC
    LIMIT :limite;
    `,
    {
      replacements: {
        empresaId,
        patenteNormalizada,
        limite: LIMITE_COINCIDENCIAS + 1,
      },
      type: QueryTypes.SELECT,
    }
  );
};

const cargarCliente = async ({ clienteId, empresaId, rol }) => {
  if (!clienteId) return null;

  const incluyeTelefono = ROLES_CON_TELEFONO.has(normalizarEstado(rol));
  const attributes = ["id", "nombre", "categoria_cliente"];
  if (incluyeTelefono) attributes.push("telefono");

  const cliente = await Cliente.findOne({
    where: { id: clienteId, empresaId },
    attributes,
    raw: true,
  });

  if (!cliente) return null;

  return {
    id: cliente.id,
    nombre: cliente.nombre,
    categoria_cliente: cliente.categoria_cliente || "NORMAL",
    ...(incluyeTelefono ? { telefono: cliente.telefono || null } : {}),
  };
};

const cargarOrdenes = ({ vehiculoId, empresaId }) =>
  OrdenTrabajo.findAll({
    where: { vehiculoId, empresaId },
    attributes: [
      "id",
      "estado",
      "prioridad",
      "motivo_ingreso",
      "requiere_regularizacion",
      "regularizar_antes_de_entrega",
      "archivada",
      "entregado_at",
      "diagnostico_asignado_a_id",
      "operador_ecu_asignado_a_id",
      "mecanico_asignado_a_id",
      "supervisor_asignado_a_id",
      "createdAt",
      "updatedAt",
    ],
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
    limit: LIMITE_HISTORIAL_INTERNO,
    raw: true,
  });

const cargarRelacionesOrden = async ({ ordenIds, empresaId }) => {
  if (!ordenIds.length) {
    return {
      diagnosticos: [],
      archivos: [],
      items: [],
      materiales: [],
    };
  }

  const whereOrden = {
    empresaId,
    ordenId: { [Op.in]: ordenIds },
  };

  const [diagnosticos, archivos, items, materiales] = await Promise.all([
    Diagnostico.findAll({
      where: whereOrden,
      attributes: [
        "id",
        "ordenId",
        "fase",
        "codigos_dtc",
        "fallas_detectadas",
        "sin_dtc",
        "createdAt",
      ],
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      limit: LIMITE_DIAGNOSTICOS,
      raw: true,
    }),
    ArchivoECU.findAll({
      where: whereOrden,
      attributes: [
        "id",
        "ordenId",
        "estado",
        "tipo_servicio",
        "servicios_solicitados",
        "servicios_preset",
        "servicio_principal",
        "operador_ecu_asignado_a_id",
        "tuner_asignado_a_id",
        "archivado",
        "createdAt",
      ],
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      limit: LIMITE_HISTORIAL_INTERNO,
      raw: true,
    }),
    OrdenServicioItem.findAll({
      where: whereOrden,
      attributes: [
        "id",
        "ordenId",
        "tipo_servicio",
        "estado",
        "material_recuperado_obligatorio",
      ],
      order: [["id", "DESC"]],
      raw: true,
    }),
    MaterialRecuperado.findAll({
      where: whereOrden,
      attributes: [
        "id",
        "ordenId",
        "itemId",
        "peso_kg",
        "kilos",
        "motivo_excepcion_material",
      ],
      raw: true,
    }),
  ]);

  return { diagnosticos, archivos, items, materiales };
};

const construirServiciosFrecuentes = ({ ordenes, items }) => {
  const conteos = new Map();
  const ordenesConItems = new Set();

  const sumar = (servicio) => {
    const limpio = limpiarTexto(servicio, 140);
    if (!limpio) return;
    const clave = limpio.toLocaleUpperCase("es-CL");
    const actual = conteos.get(clave) || { servicio: limpio, veces: 0 };
    actual.veces += 1;
    conteos.set(clave, actual);
  };

  for (const item of items) {
    if (normalizarEstado(item.estado) === "ANULADO") continue;
    ordenesConItems.add(String(item.ordenId));
    sumar(item.tipo_servicio);
  }

  for (const orden of ordenes) {
    if (ordenesConItems.has(String(orden.id))) continue;
    sumar(extraerServicioOrden(orden.motivo_ingreso));
  }

  return [...conteos.values()]
    .sort((a, b) => b.veces - a.veces || a.servicio.localeCompare(b.servicio))
    .slice(0, LIMITE_SERVICIOS);
};

const materialEstaRegistrado = (material) => {
  const peso = Number(material?.peso_kg ?? material?.kilos ?? 0);
  return (
    (Number.isFinite(peso) && peso > 0) ||
    Boolean(limpiarTexto(material?.motivo_excepcion_material, 20))
  );
};

const hayMaterialPendiente = ({ items, materiales }) => {
  const obligatorios = items.filter(
    (item) =>
      item.material_recuperado_obligatorio === true &&
      normalizarEstado(item.estado) !== "ANULADO"
  );

  return obligatorios.some((item) =>
    !materiales.some(
      (material) =>
        Number(material.ordenId) === Number(item.ordenId) &&
        (!material.itemId || Number(material.itemId) === Number(item.id)) &&
        materialEstaRegistrado(material)
    )
  );
};

const obtenerIdsResponsables = ({ ordenes, archivos }) => {
  const ids = [];
  const agregar = (valor) => {
    const id = String(valor || "").trim();
    if (UUID_VALIDO.test(id)) ids.push(id);
  };

  for (const orden of ordenes) {
    agregar(orden.diagnostico_asignado_a_id);
    agregar(orden.operador_ecu_asignado_a_id);
    agregar(orden.mecanico_asignado_a_id);
    agregar(orden.supervisor_asignado_a_id);
  }

  for (const archivo of archivos) {
    agregar(archivo.operador_ecu_asignado_a_id);
    agregar(archivo.tuner_asignado_a_id);
  }

  return [...new Set(ids)];
};

const cargarUsuariosActivos = async ({ ids, empresaId }) => {
  if (!ids.length) return new Map();

  const usuarios = await Usuario.findAll({
    where: {
      id: { [Op.in]: ids },
      empresaId,
      activo: true,
    },
    attributes: ["id", "username", "nombre", "rol", "activo"],
    raw: true,
  });

  return new Map(usuarios.map((usuario) => [String(usuario.id), usuario]));
};

const primerUsuarioActivo = (ids, usuariosPorId) => {
  for (const valor of ids) {
    const id = String(valor || "").trim();
    const usuario = usuariosPorId.get(id);
    if (usuario) return usuario;
  }
  return null;
};

const construirResponsablesSugeridos = ({ ordenes, archivos, usuariosPorId }) => {
  const diagnosticoIds = ordenes.map((orden) => orden.diagnostico_asignado_a_id);
  const operadorIds = [
    ...ordenes.map((orden) => orden.operador_ecu_asignado_a_id),
    ...archivos.flatMap((archivo) => [
      archivo.operador_ecu_asignado_a_id,
      archivo.tuner_asignado_a_id,
    ]),
  ];
  const mecanicoIds = ordenes.map((orden) => orden.mecanico_asignado_a_id);
  const principales = ordenes.flatMap((orden) => [
    orden.diagnostico_asignado_a_id,
    orden.operador_ecu_asignado_a_id,
    orden.mecanico_asignado_a_id,
    orden.supervisor_asignado_a_id,
  ]);

  return {
    principal: primerUsuarioActivo(principales, usuariosPorId),
    diagnostico: primerUsuarioActivo(diagnosticoIds, usuariosPorId),
    operador_ecu: primerUsuarioActivo(operadorIds, usuariosPorId),
    mecanico: primerUsuarioActivo(mecanicoIds, usuariosPorId),
  };
};

const construirAlertas = ({ vehiculo, cliente, ordenes, archivos, items, materiales }) => {
  const alertas = [];
  const agregar = (codigo) => {
    if (!alertas.includes(codigo)) alertas.push(codigo);
  };

  if (vehiculo.activo !== true) agregar("VEHICULO_INACTIVO");

  const categoria = normalizarEstado(cliente?.categoria_cliente);
  if (categoria === "VIP") agregar("CLIENTE_VIP");
  if (categoria === "FLOTA") agregar("CLIENTE_FLOTA");
  if (categoria === "TALLER_ALIADO") agregar("CLIENTE_TALLER_ALIADO");
  if (categoria === "GARANTIA_RECLAMO") agregar("CLIENTE_GARANTIA");

  const ordenesActivas = ordenes.filter(
    (orden) =>
      orden.archivada !== true &&
      !ESTADOS_ORDEN_TERMINALES.has(normalizarEstado(orden.estado))
  );
  if (ordenesActivas.length) agregar("ORDEN_ACTIVA");

  if (
    ordenes.some(
      (orden) =>
        orden.archivada !== true &&
        normalizarEstado(orden.estado) === "LISTO_PARA_ENTREGA" &&
        !orden.entregado_at
    )
  ) {
    agregar("ORDEN_LISTA_SIN_ENTREGAR");
  }

  if (
    ordenes.some(
      (orden) =>
        orden.requiere_regularizacion === true ||
        orden.regularizar_antes_de_entrega === true
    )
  ) {
    agregar("REGULARIZACION_PENDIENTE");
  }

  if (
    archivos.some(
      (archivo) =>
        archivo.archivado !== true &&
        !ESTADOS_FILE_SERVICE_TERMINALES.has(normalizarEstado(archivo.estado))
    )
  ) {
    agregar("FILE_SERVICE_PENDIENTE");
  }

  if (hayMaterialPendiente({ items, materiales })) {
    agregar("MATERIAL_PENDIENTE");
  }

  return alertas;
};

const construirSugerencias = ({ serviciosFrecuentes, responsables }) => {
  const sugerencias = [];

  if (serviciosFrecuentes[0]) {
    sugerencias.push({
      tipo: "SERVICIO_FRECUENTE",
      servicio: serviciosFrecuentes[0].servicio,
      veces: serviciosFrecuentes[0].veces,
    });
  }

  for (const [tipo, responsable] of Object.entries(responsables)) {
    if (!responsable) continue;
    sugerencias.push({
      tipo: `RESPONSABLE_${tipo.toUpperCase()}`,
      responsable,
    });
  }

  return sugerencias;
};

const consultarContextoPatente = async ({ patente, empresaId, rol }) => {
  const empresaSegura = String(empresaId || "").trim();
  if (!empresaSegura) {
    const error = new Error("Empresa no disponible");
    error.codigo = "EMPRESA_NO_DISPONIBLE";
    error.statusCode = 503;
    throw error;
  }

  const { patenteNormalizada } = normalizarPatente(patente);
  const base = respuestaBase(patenteNormalizada);
  const coincidencias = await buscarCoincidenciasExactas({
    empresaId: empresaSegura,
    patenteNormalizada,
  });

  if (!coincidencias.length) return base;

  if (coincidencias.length > 1) {
    return {
      ...base,
      resultado: "AMBIGUO",
      existe_vehiculo: true,
      coincidencias: coincidencias.slice(0, LIMITE_COINCIDENCIAS).map((row) => ({
        ...mapearVehiculo(row),
        cliente: mapearClienteCoincidencia(row),
      })),
    };
  }

  const row = coincidencias[0];
  const vehiculo = mapearVehiculo(row);
  const cliente = await cargarCliente({
    clienteId: row.clienteId,
    empresaId: empresaSegura,
    rol,
  });
  const ordenes = await cargarOrdenes({
    vehiculoId: vehiculo.id,
    empresaId: empresaSegura,
  });
  const ordenIds = ordenes.map((orden) => orden.id);
  const { diagnosticos, archivos, items, materiales } =
    await cargarRelacionesOrden({
      ordenIds,
      empresaId: empresaSegura,
    });

  const serviciosFrecuentes = construirServiciosFrecuentes({ ordenes, items });
  const idsResponsables = obtenerIdsResponsables({ ordenes, archivos });
  const usuariosPorId = await cargarUsuariosActivos({
    ids: idsResponsables,
    empresaId: empresaSegura,
  });
  const responsables = construirResponsablesSugeridos({
    ordenes,
    archivos,
    usuariosPorId,
  });
  const alertas = construirAlertas({
    vehiculo,
    cliente,
    ordenes,
    archivos,
    items,
    materiales,
  });

  return {
    ...base,
    resultado: "EXACTO",
    existe_vehiculo: true,
    vehiculo,
    cliente,
    ultimas_ordenes: ordenes.slice(0, LIMITE_ORDENES).map((orden) => ({
      id: orden.id,
      estado: orden.estado,
      prioridad: orden.prioridad,
      servicio: extraerServicioOrden(orden.motivo_ingreso),
      createdAt: orden.createdAt,
      updatedAt: orden.updatedAt,
    })),
    servicios_frecuentes: serviciosFrecuentes,
    diagnosticos_recientes: diagnosticos
      .slice(0, LIMITE_DIAGNOSTICOS)
      .map((diagnostico) => ({
        id: diagnostico.id,
        fase: diagnostico.fase || null,
        resumen_dtc: resumirDtc(diagnostico),
        fecha: diagnostico.createdAt,
      })),
    archivos_ecu_recientes: archivos
      .slice(0, LIMITE_ARCHIVOS_ECU)
      .map((archivo) => ({
        id: archivo.id,
        estado: archivo.estado,
        servicios_solicitados: resumirServiciosArchivo(archivo),
        fecha: archivo.createdAt,
      })),
    responsable_sugerido: responsables,
    alertas,
    sugerencias: construirSugerencias({
      serviciosFrecuentes,
      responsables,
    }),
    puede_autocompletar: vehiculo.activo === true && Boolean(cliente),
  };
};

module.exports = {
  consultarContextoPatente,
};
