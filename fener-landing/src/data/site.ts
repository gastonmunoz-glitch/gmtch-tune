// Edita aqui los datos comerciales principales de Fener.
// Si aun no hay telefono o WhatsApp confirmado, deja esos campos vacios para no mostrar datos falsos.
export const contact = {
  email: "contacto@fener.cl",
  phoneLabel: "",
  phoneHref: "",
  whatsappNumber: "",
  whatsappLabel: "",
  address: "Chile",
  coverageLabel: "Alcance nacional",
  formAction: "mailto:contacto@fener.cl",
  formMethod: "post",
};

export const whatsappMessage =
  "Hola Fener, necesito solicitar una propuesta de servicios de alimentacion.";

export const links = {
  email: `mailto:${contact.email}?subject=${encodeURIComponent(
    "Solicitud comercial Fener.cl",
  )}`,
  whatsapp: contact.whatsappNumber
    ? `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(
        whatsappMessage,
      )}`
    : "",
  phone: contact.phoneHref,
};

export const brand = {
  name: "Fener.cl",
  shortName: "Fener",
  tagline: "Servicios de alimentacion para empresas e instituciones",
  descriptor:
    "Soluciones diarias y servicios especiales a nivel nacional, con una propuesta renovada y continuidad operativa de trayectoria consolidada.",
};

export const seo = {
  siteUrl: "https://fener.cl/",
  image: "/images/hero-fener.png",
  defaultTitle:
    "Fener.cl | Servicios de alimentacion para empresas e instituciones",
  defaultDescription:
    "Fener.cl entrega servicios de alimentacion institucional, alimentacion diaria, cafeterias, catering corporativo, cocteleria, banqueteria y eventos en Chile.",
  pages: {
    home: {
      title:
        "Fener.cl | Alimentacion institucional, catering y servicios diarios en Chile",
      description:
        "Servicios de alimentacion para empresas, colegios, universidades, ministerios e instituciones. Soluciones diarias y servicios especiales a nivel nacional.",
    },
    servicios: {
      title:
        "Servicios de alimentacion para empresas, colegios e instituciones | Fener.cl",
      description:
        "Alimentacion diaria, cafeterias corporativas, catering, cocteleria, banqueteria, eventos y produccion alimentaria para operaciones institucionales.",
    },
    trayectoria: {
      title: "Trayectoria y continuidad operativa | Fener.cl",
      description:
        "Fener da continuidad operativa a una trayectoria consolidada en servicios de alimentacion, con una propuesta renovada para empresas e instituciones.",
    },
    calidad: {
      title: "Calidad e inocuidad alimentaria | Fener.cl",
      description:
        "Control operativo, higiene, planificacion, trazabilidad interna y supervision de procesos para servicios de alimentacion de alto estandar.",
    },
    clientes: {
      title: "Clientes, instituciones y rubros atendidos | Fener.cl",
      description:
        "Servicios alimentarios para empresas, colegios, universidades, ministerios, instituciones publicas y privadas, cafeterias y eventos corporativos.",
    },
    galeria: {
      title: "Galeria corporativa y produccion alimentaria | Fener.cl",
      description:
        "Espacio preparado para fotos reales de alimentacion diaria, cafeterias, catering, banqueteria, cocteleria y produccion alimentaria.",
    },
    contacto: {
      title: "Contacto y solicitud de propuesta | Fener.cl",
      description:
        "Solicita una propuesta para servicios de alimentacion diaria, cafeterias, catering, cocteleria, banqueteria o eventos institucionales.",
    },
  },
};

export const navItems = [
  { label: "Home", href: "/" },
  { label: "Servicios", href: "/servicios" },
  { label: "Trayectoria", href: "/trayectoria" },
  { label: "Calidad e inocuidad", href: "/calidad-e-inocuidad" },
  { label: "Clientes", href: "/clientes" },
  { label: "Galeria", href: "/galeria" },
  { label: "Contacto", href: "/contacto" },
];

export const homeHero = {
  eyebrow: "Servicios de alimentacion institucional",
  title: "Servicios de alimentacion para empresas e instituciones",
  description:
    "Soluciones diarias y servicios especiales a nivel nacional: alimentacion diaria, cafeterias, catering, cocteleria, banqueteria y eventos con planificacion, cumplimiento y calidad operativa.",
  primaryLabel: "Solicitar propuesta",
  primaryHref: "/contacto",
  secondaryLabel: "Ver servicios",
  secondaryHref: "/servicios",
  image: "/images/hero-fener.png",
  imageAlt:
    "Servicio profesional de alimentacion corporativa con preparaciones chilenas y operacion cuidada",
};

export const metrics = [
  {
    value: "Trayectoria consolidada",
    label: "Continuidad operativa",
    description:
      "Experiencia en servicios de alimentacion con una propuesta renovada para clientes institucionales.",
  },
  {
    value: "Operacion diaria",
    label: "Servicios recurrentes",
    description:
      "Planificacion para operaciones de alimentacion diaria, cafeterias y puntos de atencion.",
  },
  {
    value: "Cobertura nacional",
    label: "Alcance en Chile",
    description:
      "Capacidad de estructurar servicios en distintas ciudades, comunas y formatos operativos.",
  },
  {
    value: "Clientes institucionales",
    label: "Ambito corporativo",
    description:
      "Atencion a empresas, colegios, universidades, ministerios e instituciones publicas y privadas.",
  },
];

export const services = [
  {
    title: "Alimentacion diaria para empresas",
    type: "Servicio diario",
    description:
      "Menus, colaciones y soluciones recurrentes para equipos, plantas, oficinas y operaciones con turnos.",
    detail:
      "Planificacion de frecuencias, volumenes, horarios, formatos de entrega y seguimiento operativo.",
    icon: "briefcase",
  },
  {
    title: "Servicios para colegios y universidades",
    type: "Servicio diario",
    description:
      "Alimentacion institucional para comunidades educativas, con foco en orden, continuidad y cumplimiento.",
    detail:
      "Propuestas para casinos, cafeterias, colaciones, actividades y requerimientos especiales.",
    icon: "education",
  },
  {
    title: "Instituciones publicas y privadas",
    type: "Servicio diario o especial",
    description:
      "Soluciones para ministerios, organismos, fundaciones, corporaciones e instituciones con alto estandar.",
    detail:
      "Coordinacion de servicios recurrentes, eventos internos y necesidades alimentarias a pedido.",
    icon: "institution",
  },
  {
    title: "Cafeterias y puntos de atencion",
    type: "Servicio diario",
    description:
      "Operacion de cafeterias, estaciones de servicio y puntos de alimentacion para usuarios internos o externos.",
    detail:
      "Definicion de oferta, flujos de atencion, reposicion, imagen operativa y control de servicio.",
    icon: "coffee",
  },
  {
    title: "Catering corporativo",
    type: "Por solicitud",
    description:
      "Servicios para reuniones, jornadas, lanzamientos, capacitaciones y actividades empresariales.",
    detail:
      "Formatos flexibles de coffee break, almuerzos, estaciones, bandejas y servicios en terreno.",
    icon: "catering",
  },
  {
    title: "Cocteleria",
    type: "Por solicitud",
    description:
      "Propuestas de bocados, estaciones y atencion para encuentros corporativos y actividades especiales.",
    detail:
      "Presentacion cuidada, montaje ordenado y coordinacion segun horario, lugar y perfil del evento.",
    icon: "toast",
  },
  {
    title: "Banqueteria",
    type: "Por solicitud",
    description:
      "Servicio de banqueteria para eventos institucionales, celebraciones y recepciones corporativas.",
    detail:
      "Menus, montaje, apoyo operativo y planificacion del servicio segun cantidad de asistentes.",
    icon: "banquet",
  },
  {
    title: "Eventos especiales",
    type: "Por solicitud",
    description:
      "Soluciones alimentarias para hitos internos, ceremonias, ferias, encuentros y actividades masivas.",
    detail:
      "Coordinacion de requerimientos, tiempos, montaje, entrega y supervision en terreno.",
    icon: "calendar",
  },
  {
    title: "Produccion alimentaria",
    type: "Servicio planificado",
    description:
      "Produccion y preparacion de alimentos para servicios propios o requerimientos externos.",
    detail:
      "Organizacion de procesos, compras, preparacion, despacho y trazabilidad interna.",
    icon: "production",
  },
  {
    title: "Soluciones alimentarias a medida",
    type: "Segun requerimiento",
    description:
      "Diseno de propuestas segun volumen, presupuesto, ubicacion, periodicidad y perfil del usuario.",
    detail:
      "Diagnostico comercial, propuesta operativa y ajustes para necesidades especificas.",
    icon: "custom",
  },
  {
    title: "Operacion y planificacion de servicios diarios",
    type: "Servicio diario",
    description:
      "Estructuracion de servicios recurrentes con foco en continuidad, horarios, control y calidad.",
    detail:
      "Gestion de rutinas, dotacion, abastecimiento, supervision y mejora del servicio.",
    icon: "planning",
  },
];

export const featuredServiceTitles = [
  "Alimentacion diaria para empresas",
  "Servicios para colegios y universidades",
  "Instituciones publicas y privadas",
  "Cafeterias y puntos de atencion",
  "Catering corporativo",
  "Cocteleria",
];

export const legacy = {
  eyebrow: "Trayectoria y continuidad",
  title: "Continuidad operativa de una trayectoria consolidada en el rubro",
  body:
    "Fener nace como una propuesta renovada que da continuidad operativa a la experiencia de Aliner Ltda. en servicios de alimentacion. El foco esta en mantener conocimiento del rubro, fortalecer la gestion comercial y responder a las exigencias actuales de empresas e instituciones.",
  points: [
    "Experiencia en servicios de alimentacion institucional y corporativa.",
    "Propuesta renovada para operaciones diarias y servicios especiales.",
    "Lenguaje, gestion y presentacion alineados a clientes de alto estandar.",
    "Capacidad para estructurar servicios recurrentes con seguimiento operativo.",
  ],
};

export const quality = {
  eyebrow: "Calidad e inocuidad",
  title: "Planificacion, cumplimiento y calidad para operaciones de alto estandar",
  intro:
    "Fener aborda cada servicio con criterios de orden operativo, higiene, supervision y trazabilidad interna. No declaramos certificaciones no confirmadas; comunicamos practicas prudentes y verificables.",
  principles: [
    {
      title: "Buenas practicas",
      description:
        "Rutinas de trabajo orientadas a higiene, manipulacion responsable y presentacion consistente.",
    },
    {
      title: "Control operativo",
      description:
        "Planificacion de compras, produccion, tiempos, despacho y ejecucion del servicio.",
    },
    {
      title: "Trazabilidad interna",
      description:
        "Registro y seguimiento de etapas relevantes para mantener orden y responsabilidad operativa.",
    },
    {
      title: "Supervision de procesos",
      description:
        "Revision de preparacion, montaje, entrega y respuesta ante necesidades del cliente.",
    },
    {
      title: "Cumplimiento del servicio",
      description:
        "Coordinacion de horarios, formatos acordados, volumenes y condiciones de entrega.",
    },
    {
      title: "Mejora continua",
      description:
        "Ajustes segun retroalimentacion, demanda real y necesidades de cada institucion.",
    },
  ],
};

export const coverage = {
  eyebrow: "Cobertura nacional",
  title: "Soluciones diarias y servicios especiales a nivel nacional",
  body:
    "Fener puede estructurar propuestas para distintas ciudades y comunas de Chile, segun volumen, periodicidad, ubicacion, tipo de servicio y condiciones operativas requeridas por cada cliente.",
  zones: [
    "Empresas y oficinas",
    "Colegios y universidades",
    "Instituciones publicas",
    "Instituciones privadas",
    "Cafeterias corporativas",
    "Eventos y servicios especiales",
  ],
};

export const clientSectors = [
  {
    title: "Empresas grandes y corporaciones",
    description:
      "Alimentacion diaria, eventos internos, cafeterias, turnos y servicios para equipos.",
  },
  {
    title: "Colegios y universidades",
    description:
      "Servicios para comunidades educativas, actividades especiales y puntos de atencion.",
  },
  {
    title: "Ministerios e instituciones publicas",
    description:
      "Soluciones alimentarias planificadas para requerimientos institucionales.",
  },
  {
    title: "Instituciones privadas",
    description:
      "Servicios recurrentes o por solicitud para organizaciones, fundaciones y oficinas.",
  },
  {
    title: "Cafeterias y puntos de venta",
    description:
      "Operacion y propuesta de servicio para atencion diaria de usuarios.",
  },
  {
    title: "Eventos corporativos",
    description:
      "Catering, cocteleria, banqueteria y alimentacion para actividades especiales.",
  },
];

export const clientPlaceholders = [
  "Cliente institucional",
  "Empresa corporativa",
  "Comunidad educativa",
  "Organismo publico",
  "Cafeteria operada",
  "Evento corporativo",
];

export const dailyOperations = {
  eyebrow: "Operacion diaria",
  title: "Servicios diarios con planificacion y control",
  body:
    "La operacion diaria requiere mas que un menu. Requiere continuidad, abastecimiento, equipos coordinados, supervision y capacidad de respuesta ante cambios de volumen, horarios o requerimientos especiales.",
  steps: [
    "Levantamiento de necesidad y volumenes",
    "Propuesta de menu, frecuencia y formato",
    "Planificacion de compras y produccion",
    "Ejecucion del servicio diario",
    "Supervision, registro y ajustes operativos",
  ],
};

// Reemplaza estos placeholders por fotos reales en public/images/ cuando el material este disponible.
export const gallery = [
  {
    title: "Alimentacion diaria",
    category: "Operacion institucional",
    description:
      "Placeholder para fotografias reales de servicios diarios, casinos o puntos de atencion.",
    image: "/images/hero-fener.png",
    alt: "Servicio profesional de alimentacion diaria para empresas e instituciones",
  },
  {
    title: "Cafeterias",
    category: "Puntos de atencion",
    description:
      "Espacio reservado para imagenes de cafeterias, vitrinas, atencion y merchandising.",
    image: "",
    alt: "Placeholder para cafeteria corporativa Fener",
  },
  {
    title: "Catering corporativo",
    category: "Servicios especiales",
    description:
      "Placeholder para fotos de coffee breaks, reuniones, jornadas y lanzamientos.",
    image: "",
    alt: "Placeholder para catering corporativo Fener",
  },
  {
    title: "Cocteleria y banqueteria",
    category: "Eventos",
    description:
      "Espacio preparado para montajes, bandejas, bocados y servicios en terreno.",
    image: "",
    alt: "Placeholder para cocteleria y banqueteria Fener",
  },
  {
    title: "Produccion alimentaria",
    category: "Procesos",
    description:
      "Placeholder para fotos reales de cocina, preparacion, despacho y control interno.",
    image: "",
    alt: "Placeholder para produccion alimentaria Fener",
  },
  {
    title: "Eventos especiales",
    category: "Servicios a pedido",
    description:
      "Espacio reservado para registros visuales de eventos institucionales y corporativos.",
    image: "",
    alt: "Placeholder para eventos especiales Fener",
  },
];

// Agrega aqui redes sociales reales cuando existan URLs autorizadas.
export const socialLinks: Array<{ label: string; href: string }> = [];

export const commercialTexts = {
  proposalCta: "Solicitar propuesta",
  emailCta: "Enviar correo comercial",
  formIntro:
    "Completa los datos del servicio que necesitas y prepararemos una respuesta comercial acorde al volumen, ciudad y tipo de operacion.",
  noPhoneMessage:
    "Telefono y WhatsApp se publicaran cuando los datos comerciales esten confirmados.",
};
