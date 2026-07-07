// Edita aqui los datos principales de Fener.
// Cambia telefono, WhatsApp, correo, direccion e imagenes sin tocar los componentes.
export const contact = {
  whatsappNumber: "56912345678",
  whatsappLabel: "+56 9 1234 5678",
  phoneHref: "tel:+56912345678",
  phoneLabel: "+56 9 1234 5678",
  email: "contacto@fener.cl",
  address: "Santiago, Chile",
  formAction: "mailto:contacto@fener.cl",
};

export const whatsappMessage =
  "Hola Fener, necesito cotizar un servicio de alimentacion/catering.";

export const links = {
  whatsapp: `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(
    whatsappMessage,
  )}`,
  email: `mailto:${contact.email}?subject=${encodeURIComponent(
    "Cotizacion Fener.cl",
  )}`,
  phone: contact.phoneHref,
};

export const seo = {
  title:
    "Fener.cl | Comida tipica chilena, catering y servicios alimentarios",
  description:
    "Fener.cl entrega soluciones de alimentacion para empresas, catering, eventos y produccion alimentaria con foco en calidad, cumplimiento e inocuidad.",
  url: "https://fener.cl/",
  image: "/images/hero-fener.png",
};

export const navItems = [
  { label: "Servicios", href: "/#servicios" },
  { label: "Por que Fener", href: "/#por-que-fener" },
  { label: "Proceso", href: "/#proceso" },
  { label: "Galeria", href: "/#galeria" },
  { label: "Contacto", href: "/#contacto" },
];

export const services = [
  {
    title: "Alimentacion para empresas",
    description:
      "Menus diarios, colaciones, turnos y servicios recurrentes para equipos de trabajo.",
    icon: "building",
  },
  {
    title: "Catering y eventos",
    description:
      "Banqueteria practica y cuidada para reuniones, celebraciones, lanzamientos y actividades corporativas.",
    icon: "calendar",
  },
  {
    title: "Platos tipicos chilenos",
    description:
      "Preparaciones tradicionales con sabor familiar, buena presentacion y estandar profesional.",
    icon: "plate",
  },
  {
    title: "Produccion alimentaria",
    description:
      "Planificacion, elaboracion y despacho de alimentos con control operativo y trazabilidad.",
    icon: "kitchen",
  },
  {
    title: "Soluciones a medida",
    description:
      "Propuestas ajustadas a volumen, presupuesto, ubicacion, horarios y tipo de servicio.",
    icon: "spark",
  },
];

export const whyUs = [
  "Calidad constante en cada preparacion",
  "Inocuidad alimentaria y buenas practicas",
  "Experiencia operativa en servicios de alimentacion",
  "Cumplimiento de horarios, formatos y acuerdos",
  "Atencion personalizada antes, durante y despues del servicio",
];

export const processSteps = [
  {
    title: "Solicitud",
    description:
      "Recibimos tu requerimiento, cantidad de personas, fecha, lugar y tipo de alimentacion.",
  },
  {
    title: "Propuesta",
    description:
      "Preparamos una alternativa clara con menu, formato de servicio, valores y tiempos.",
  },
  {
    title: "Produccion",
    description:
      "Coordinamos compras, preparacion y control de calidad bajo buenas practicas.",
  },
  {
    title: "Entrega",
    description:
      "Despachamos o servimos en terreno con puntualidad, presentacion y seguimiento.",
  },
];

// Reemplaza estas imagenes por fotos reales en public/images/ cuando las tengas.
export const gallery = [
  {
    src: "/images/hero-fener.png",
    alt: "Mesa de catering con comida tipica chilena preparada por Fener",
    title: "Catering corporativo",
  },
  {
    src: "/images/hero-fener.png",
    alt: "Platos tipicos chilenos listos para servicio",
    title: "Sabores chilenos",
  },
  {
    src: "/images/hero-fener.png",
    alt: "Produccion alimentaria con estandar profesional",
    title: "Produccion cuidada",
  },
  {
    src: "/images/hero-fener.png",
    alt: "Servicio de alimentacion para empresas y equipos",
    title: "Servicios a medida",
  },
];

export const clientSectors = [
  "Empresas y oficinas",
  "Eventos corporativos",
  "Instituciones",
  "Obras y equipos en terreno",
  "Celebraciones privadas",
  "Produccion alimentaria externa",
];

export const socialLinks = [
  // Cambia estas URLs por las redes reales de Fener.
  { label: "Instagram", href: "https://www.instagram.com/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/" },
  { label: "Facebook", href: "https://www.facebook.com/" },
];
