const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const { Usuario } = require("../models");

const limpiarTexto = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
};

const upper = (valor) => limpiarTexto(valor).toUpperCase();

const normalizarClaveUsuario = (valor) => limpiarTexto(valor).toLowerCase();

const numero = (valor) => {
  const parsed = Number(valor || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const booleano = (valor) =>
  valor === true ||
  valor === 1 ||
  valor === "1" ||
  upper(valor) === "TRUE" ||
  upper(valor) === "SI";

const fechaValida = (valor) => {
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const horasDesde = (valor, base = new Date()) => {
  const fecha = fechaValida(valor);
  if (!fecha) return 0;
  return Math.max(0, (base.getTime() - fecha.getTime()) / 36e5);
};

const redondearHoras = (valor) => Number(numero(valor).toFixed(1));

const quoteIdent = (valor) => `"${String(valor).replace(/"/g, '""')}"`;

const tablaExiste = async (tableName) => {
  try {
    const rows = await sequelize.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = :tableName
      ) AS existe
      `,
      {
        replacements: { tableName },
        type: QueryTypes.SELECT,
      }
    );

    return Boolean(rows?.[0]?.existe);
  } catch (error) {
    console.warn(`[guardia] No se pudo verificar tabla ${tableName}:`, error.message);
    return false;
  }
};

const leerTabla = async (tableName, limit = 1200) => {
  if (!(await tablaExiste(tableName))) return [];

  try {
    return await sequelize.query(`SELECT * FROM ${quoteIdent(tableName)} LIMIT :limit`, {
      replacements: { limit },
      type: QueryTypes.SELECT,
    });
  } catch (error) {
    console.warn(`[guardia] No se pudo leer tabla ${tableName}:`, error.message);
    return [];
  }
};

const crearIdentidadDesdeUsuario = (usuario = {}) => {
  const id = limpiarTexto(usuario.id);
  const username = limpiarTexto(usuario.username);
  const nombre = limpiarTexto(usuario.nombre);
  const email = limpiarTexto(usuario.email);
  const rol = upper(usuario.rol);
  const claves = new Set(
    [id, username, nombre, email].map(normalizarClaveUsuario).filter(Boolean)
  );

  return {
    id,
    username,
    nombre,
    email,
    rol,
    claves,
  };
};

const coincideIdentidad = (identidad, ...valores) =>
  valores.some((valor) => {
    const clave = normalizarClaveUsuario(valor);
    return clave && identidad.claves.has(clave);
  });

const normalizarEstado = (valor) => upper(valor || "");

const esArchivoActivo = (archivo) => {
  const estado = normalizarEstado(archivo.estado);
  return (
    !booleano(archivo.archivado) &&
    !["FINALIZADO_TECNICO", "FINALIZADO", "ARCHIVADO"].includes(estado)
  );
};

const materialCumple = (material) => {
  if (!material) return false;
  const peso = numero(material.peso_kg ?? material.kilos);
  const excepcion = limpiarTexto(material.motivo_excepcion_material);
  return peso > 0 || Boolean(excepcion);
};

const cargarContextoGuardia = async () => {
  const [ordenes, archivos, items, materiales, fotos] = await Promise.all([
    leerTabla("ordenes_trabajo"),
    leerTabla("archivos_ecu"),
    leerTabla("orden_servicio_items"),
    leerTabla("materiales_recuperados"),
    leerTabla("fotos_vehiculo"),
  ]);

  return {
    ordenes,
    archivos,
    items,
    materiales,
    fotos,
  };
};

const verificarGuardiaOperativaUsuario = async ({ usuarioId, rol, contexto } = {}) => {
  const id = limpiarTexto(usuarioId);

  if (!id) {
    return {
      bloqueado: false,
      usuarioId: null,
      pendientes_criticos: [],
    };
  }

  const usuario = await Usuario.findByPk(id, {
    attributes: ["id", "nombre", "username", "email", "rol", "activo"],
  });

  if (!usuario || usuario.activo === false) {
    return {
      bloqueado: true,
      usuarioId: id,
      usuario: null,
      pendientes_criticos: [
        {
          tipo: "USUARIO_NO_ASIGNABLE",
          titulo: "Usuario no asignable",
          descripcion: "El usuario no existe o esta inactivo.",
          ordenId: null,
          archivoECUId: null,
          itemId: null,
          horas: 0,
          accion_url: "/usuarios",
        },
      ],
    };
  }

  const ctx = contexto || (await cargarContextoGuardia());
  const identidad = crearIdentidadDesdeUsuario({
    ...usuario.toJSON(),
    rol: rol || usuario.rol,
  });
  const ahora = new Date();
  const fotosPorOrden = new Map();
  const itemsPorOrden = new Map();
  const materialesPorOrden = new Map();
  const materialesPorItem = new Map();
  const pendientesMap = new Map();

  ctx.fotos.forEach((foto) => {
    const ordenId = Number(foto.ordenId || foto.orden_id || foto.ordenTrabajoId);
    if (!ordenId) return;
    if (!fotosPorOrden.has(ordenId)) fotosPorOrden.set(ordenId, []);
    fotosPorOrden.get(ordenId).push(foto);
  });

  ctx.items.forEach((item) => {
    const ordenId = Number(item.ordenId || item.orden_id);
    if (!ordenId) return;
    if (!itemsPorOrden.has(ordenId)) itemsPorOrden.set(ordenId, []);
    itemsPorOrden.get(ordenId).push(item);
  });

  ctx.materiales.forEach((material) => {
    const ordenId = Number(material.ordenId || material.orden_id);
    const itemId = Number(material.itemId || material.item_id || 0);
    if (ordenId) {
      if (!materialesPorOrden.has(ordenId)) materialesPorOrden.set(ordenId, []);
      materialesPorOrden.get(ordenId).push(material);
    }
    if (itemId) {
      if (!materialesPorItem.has(itemId)) materialesPorItem.set(itemId, []);
      materialesPorItem.get(itemId).push(material);
    }
  });

  const itemMaterialCumplido = (item, ordenId) => {
    const itemId = Number(item.id);
    const materialesItem = materialesPorItem.get(itemId) || [];
    const materialesOrden = (materialesPorOrden.get(Number(ordenId)) || []).filter(
      (material) => !Number(material.itemId || material.item_id || 0)
    );
    return [...materialesItem, ...materialesOrden].some(materialCumple);
  };

  const agregarPendienteCritico = (pendiente) => {
    const key = [
      pendiente.tipo,
      pendiente.ordenId || "",
      pendiente.archivoECUId || "",
      pendiente.itemId || "",
    ].join(":");

    if (pendientesMap.has(key)) return;

    pendientesMap.set(key, {
      tipo: pendiente.tipo,
      titulo: pendiente.titulo,
      descripcion: pendiente.descripcion,
      ordenId: pendiente.ordenId || null,
      archivoECUId: pendiente.archivoECUId || null,
      itemId: pendiente.itemId || null,
      horas: redondearHoras(pendiente.horas || 0),
      accion_url: pendiente.accion_url || "/",
    });
  };

  const usuarioAsignadoOrden = (orden) =>
    coincideIdentidad(
      identidad,
      orden.recepcionado_por_id,
      orden.recepcionado_por,
      orden.diagnostico_asignado_a_id,
      orden.diagnostico_asignado_a,
      orden.operador_ecu_asignado_a_id,
      orden.operador_ecu_asignado_a,
      orden.mecanico_asignado_a_id,
      orden.mecanico_asignado_a,
      orden.supervisor_asignado_a_id,
      orden.supervisor_asignado_a
    );

  const usuarioAsignadoRecepcion = (orden) =>
    coincideIdentidad(identidad, orden.recepcionado_por_id, orden.recepcionado_por);

  const usuarioAsignadoArchivo = (archivo) =>
    coincideIdentidad(
      identidad,
      archivo.tuner_asignado_a_id,
      archivo.tuner_asignado_a,
      archivo.operador_ecu_asignado_a_id,
      archivo.operador_ecu_asignado_a,
      archivo.slave_asignado_a_id,
      archivo.slave_asignado_a,
      archivo.post_escritura_por_id,
      archivo.post_escritura_por,
      archivo.cierre_tecnico_por_id,
      archivo.cierre_tecnico_por,
      archivo.proceso_guard_responsable_id
    );

  ctx.ordenes
    .filter((orden) => normalizarEstado(orden.estado) !== "ENTREGADO" && !booleano(orden.archivada))
    .forEach((orden) => {
      const ordenId = Number(orden.id);
      const estado = normalizarEstado(orden.estado);
      const horasOrden = horasDesde(orden.updatedAt || orden.createdAt, ahora);
      const accionOrden = `/ordenes?ordenId=${ordenId}`;

      if (estado === "EN_PROGRAMACION" && usuarioAsignadoOrden(orden) && horasOrden > 24) {
        agregarPendienteCritico({
          tipo: "PROGRAMACION_ATRASADA",
          titulo: "Programacion atrasada",
          descripcion: "Orden en programacion por mas de 24 horas corridas.",
          ordenId,
          horas: horasOrden,
          accion_url: accionOrden,
        });
      }

      if (
        estado === "LISTO_PARA_ENTREGA" &&
        usuarioAsignadoRecepcion(orden) &&
        !orden.entregado_at &&
        horasOrden > 24
      ) {
        agregarPendienteCritico({
          tipo: "LISTO_SIN_ENTREGA",
          titulo: "Lista sin entrega",
          descripcion: "Orden lista para entrega por mas de 24 horas corridas.",
          ordenId,
          horas: horasOrden,
          accion_url: `${accionOrden}#entrega`,
        });
      }

      const emergencia = upper(orden.origen_recepcion) === "RECEPCION_EMERGENCIA_OPERADOR";
      const fotosOrden = fotosPorOrden.get(ordenId) || [];
      const itemsOrden = itemsPorOrden.get(ordenId) || [];

      if (
        emergencia &&
        usuarioAsignadoRecepcion(orden) &&
        (fotosOrden.length === 0 || itemsOrden.length === 0) &&
        horasDesde(orden.createdAt, ahora) > 2
      ) {
        agregarPendienteCritico({
          tipo: "RECEPCION_EMERGENCIA_INCOMPLETA",
          titulo: "Recepcion emergencia incompleta",
          descripcion: "Recepcion de emergencia sin fotos o items despues de 2 horas corridas.",
          ordenId,
          horas: horasDesde(orden.createdAt, ahora),
          accion_url: accionOrden,
        });
      }
    });

  ctx.items.forEach((item) => {
    const ordenId = Number(item.ordenId || item.orden_id);
    const orden = ctx.ordenes.find((actual) => Number(actual.id) === ordenId);
    if (!orden || normalizarEstado(orden.estado) === "ENTREGADO" || booleano(orden.archivada)) {
      return;
    }

    const asignadoItem = coincideIdentidad(identidad, item.responsable_id, item.responsable);
    const obligatorio =
      booleano(item.material_recuperado_obligatorio) ||
      booleano(item.requiere_material_recuperado);
    const cerrado = ["ANULADO", "LISTO", "CERRADO", "COMPLETADO", "FINALIZADO"].includes(
      normalizarEstado(item.estado)
    );
    const horasItem = horasDesde(item.updatedAt || item.createdAt || orden.createdAt, ahora);

    if (asignadoItem && obligatorio && !cerrado && !itemMaterialCumplido(item, ordenId) && horasItem > 24) {
      agregarPendienteCritico({
        tipo: "MATERIAL_OBLIGATORIO_PENDIENTE",
        titulo: "Material obligatorio pendiente",
        descripcion: "Item con material recuperado obligatorio pendiente por mas de 24 horas.",
        ordenId,
        itemId: item.id || null,
        horas: horasItem,
        accion_url: `/ordenes?ordenId=${ordenId}#material`,
      });
    }
  });

  ctx.materiales.forEach((material) => {
    const asignadoMaterial = coincideIdentidad(
      identidad,
      material.responsable_id,
      material.responsable,
      material.registrado_por_id,
      material.registrado_por
    );
    if (!asignadoMaterial) return;
    const ordenId = Number(material.ordenId || material.orden_id);
    const horasMaterial = horasDesde(material.updatedAt || material.createdAt, ahora);

    if (!materialCumple(material) && horasMaterial > 24) {
      agregarPendienteCritico({
        tipo: "MATERIAL_REGISTRO_INCOMPLETO",
        titulo: "Registro de material incompleto",
        descripcion: "Material recuperado sin peso o motivo de excepcion por mas de 24 horas.",
        ordenId: ordenId || null,
        itemId: material.itemId || null,
        horas: horasMaterial,
        accion_url: ordenId ? `/ordenes?ordenId=${ordenId}#material` : "/",
      });
    }
  });

  ctx.archivos.filter(esArchivoActivo).forEach((archivo) => {
    if (!usuarioAsignadoArchivo(archivo)) return;

    const estadoArchivo = normalizarEstado(archivo.estado);
    const horasArchivo = horasDesde(archivo.updatedAt || archivo.createdAt, ahora);
    const accion = `/archivos-ecu?archivoId=${archivo.id}`;
    const postPendiente =
      upper(archivo.post_escritura_estado) !== "OK" &&
      upper(archivo.post_escritura_estado) !== "NO_APLICA" &&
      (["MODIFICADO_LISTO", "NOTIFICADO_SLAVE", "POST_ESCRITURA_PENDIENTE"].includes(
        estadoArchivo
      ) ||
        Boolean(archivo.archivo_modificado));
    const correccionPendiente =
      booleano(archivo.correccion_pendiente) || estadoArchivo === "REQUIERE_CORRECCION";
    const guardCritico = ["CRITICO", "ESCALADO"].includes(
      upper(archivo.proceso_guard_estado)
    );

    if (correccionPendiente && horasArchivo > 12) {
      agregarPendienteCritico({
        tipo: "CORRECCION_FILE_SERVICE_ATRASADA",
        titulo: "Correccion File Service atrasada",
        descripcion: "File Service con correccion pendiente por mas de 12 horas.",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        horas: horasArchivo,
        accion_url: `${accion}#correccion`,
      });
    }

    if (postPendiente && horasArchivo > 24) {
      agregarPendienteCritico({
        tipo: "POST_ESCRITURA_ATRASADA",
        titulo: "Post escritura atrasada",
        descripcion: "File Service sin post escritura OK por mas de 24 horas.",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        horas: horasArchivo,
        accion_url: `${accion}#post-escritura`,
      });
    }

    if (guardCritico) {
      agregarPendienteCritico({
        tipo: "PROCESS_GUARD_CRITICO",
        titulo: "Process Guard critico",
        descripcion: "Proceso tecnico con cierre obligatorio en estado critico o escalado.",
        ordenId: archivo.ordenId || null,
        archivoECUId: archivo.id,
        horas: horasArchivo,
        accion_url: accion,
      });
    }
  });

  const pendientes_criticos = [...pendientesMap.values()].sort(
    (a, b) => numero(b.horas) - numero(a.horas)
  );

  return {
    bloqueado: pendientes_criticos.length > 0,
    usuarioId: id,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      username: usuario.username,
      rol: usuario.rol,
    },
    pendientes_criticos,
  };
};

module.exports = {
  verificarGuardiaOperativaUsuario,
};
