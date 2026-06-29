const normalize = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const STYLE_MAP = {
  rojo: {
    soft: "bg-red-50 text-red-900 border-red-700",
    solid: "bg-red-700 text-white border-red-900",
    dark: "bg-red-500/15 text-red-300 border-red-500/40",
  },
  ambar: {
    soft: "bg-yellow-50 text-yellow-950 border-yellow-600",
    solid: "bg-yellow-400 text-black border-yellow-800",
    dark: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  },
  azul: {
    soft: "bg-blue-50 text-blue-950 border-blue-700",
    solid: "bg-blue-700 text-white border-blue-900",
    dark: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  },
  morado: {
    soft: "bg-purple-50 text-purple-950 border-purple-700",
    solid: "bg-purple-700 text-white border-purple-900",
    dark: "bg-purple-500/15 text-purple-300 border-purple-500/40",
  },
  verde: {
    soft: "bg-emerald-50 text-emerald-950 border-emerald-700",
    solid: "bg-emerald-700 text-white border-emerald-900",
    dark: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  },
  gris: {
    soft: "bg-slate-100 text-slate-800 border-slate-500",
    solid: "bg-slate-700 text-white border-slate-900",
    dark: "bg-slate-500/15 text-slate-300 border-slate-500/40",
  },
};

const colorFromStatus = (status) => {
  const value = normalize(status);

  if (
    [
      "CRITICO",
      "CRITICA",
      "URGENTE",
      "BLOQUEADO",
      "VENCIDO",
      "ALERTA",
      "RECHAZADO",
      "FALLIDO",
      "FALLO_ESCRITURA",
      "REQUIERE_CORRECCION",
      "CORRECCION_SOLICITADA",
      "CLIENTE_VOLVIO",
      "PAGO_BLOQUEA_ENTREGA",
    ].includes(value)
  ) {
    return "rojo";
  }

  if (
    [
      "PENDIENTE",
      "NUEVO",
      "CONTACTADO",
      "CALIFICANDO",
      "RECEPCIONADO",
      "PARA_DIAGNOSTICO",
      "POST_ESCRITURA_PENDIENTE",
      "PENDIENTE_REVISION",
      "REVISAR",
      "LISTO_PARA_ENTREGA",
      "COTIZADO",
      "PAGO_PENDIENTE",
    ].includes(value)
  ) {
    return "ambar";
  }

  if (
    [
      "EN_PROCESO",
      "EN_REVISION",
      "EN_PROGRAMACION",
      "EN_MECANICA",
      "PARA_MECANICA",
      "OPERACION",
      "MOD_CORRECCION_LISTO",
      "POTENCIAL_REAL",
      "RECIBIDO",
      "ORIGINAL_CARGADO",
    ].includes(value)
  ) {
    return "azul";
  }

  if (
    [
      "ESPERANDO_TERCERO",
      "NOTIFICADO_MASTER",
      "NOTIFICADO_SLAVE",
      "REQUIERE_NUEVA_LECTURA",
      "NUEVA_LECTURA_REQUERIDA",
      "MASTER",
      "SLAVE",
      "PROVEEDOR",
    ].includes(value)
  ) {
    return "morado";
  }

  if (
    [
      "OK",
      "VALIDADO",
      "PAGADO",
      "COMPLETADO",
      "COMPLETA",
      "FINALIZADO",
      "FINALIZADO_TECNICO",
      "ENTREGADO",
      "GANADO",
      "AGENDADO",
      "MODIFICADO_LISTO",
      "MOD_LISTO",
      "POST_ESCRITURA_OK",
      "CORRECCION_APLICADA",
      "CERRADA",
      "VENDIDO",
    ].includes(value)
  ) {
    return "verde";
  }

  if (
    [
      "ARCHIVADO",
      "CANCELADO",
      "CANCELADA",
      "PERDIDO",
      "NO_INTERESADO",
      "SPAM",
      "NO_APLICA",
      "SIN_ACCION",
      "SIN_ESTADO",
      "BORRADOR",
    ].includes(value)
  ) {
    return "gris";
  }

  return "gris";
};

const classForColor = (color, variant = "soft") =>
  STYLE_MAP[color]?.[variant] || STYLE_MAP.gris[variant] || STYLE_MAP.gris.soft;

export const getStatusColor = (status, variant = "soft") =>
  classForColor(colorFromStatus(status), variant);

export const getPriorityColor = (priority, variant = "soft") => {
  const value = normalize(priority);
  if (value === "URGENTE") return classForColor("rojo", variant);
  if (value === "ALTA") return classForColor("ambar", variant);
  if (value === "MEDIA") return classForColor("azul", variant);
  if (value === "BAJA") return classForColor("gris", variant);
  return classForColor("gris", variant);
};

export const getPaymentStatusColor = (status, variant = "soft") => {
  const value = normalize(status);
  if (value === "PAGADO" || value === "VALIDADO") return classForColor("verde", variant);
  if (value === "RECHAZADO" || value === "VENCIDO") return classForColor("rojo", variant);
  return classForColor("ambar", variant);
};

export const getOperationalStatusLabel = (status) => {
  const labels = {
    RECEPCIONADO: "Recepcionado",
    PARA_DIAGNOSTICO: "Para diagnostico",
    EN_PROGRAMACION: "En programacion",
    PARA_MECANICA: "Para mecanica",
    EN_MECANICA: "En mecanica",
    LISTO_PARA_ENTREGA: "Listo para entrega",
    ENTREGADO: "Entregado",
    ORIGINAL_CARGADO: "Original cargado",
    NOTIFICADO_MASTER: "Master notificado",
    MODIFICADO_LISTO: "MOD listo",
    NOTIFICADO_SLAVE: "Slave notificado",
    POST_ESCRITURA_PENDIENTE: "Post escritura pendiente",
    POST_ESCRITURA_OK: "Post escritura OK",
    REQUIERE_CORRECCION: "Requiere correccion",
    REQUIERE_NUEVA_LECTURA: "Requiere nueva lectura",
    FINALIZADO_TECNICO: "Finalizado tecnico",
    FINALIZADO: "Finalizado",
    ARCHIVADO: "Archivado",
    PENDIENTE_REVISION: "Pendiente revision",
    VALIDADO: "Validado",
    PAGADO: "Pagado",
    PENDIENTE: "Pendiente",
  };

  const value = normalize(status);
  return labels[value] || String(status || "Sin estado");
};

export const getSemanticColorName = colorFromStatus;
