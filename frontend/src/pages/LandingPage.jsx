import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const WHATSAPP_NUMBER = "56962267642";
const WHATSAPP_DISPLAY = "+56 9 6226 7642";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
const INSTAGRAM_URL = "https://instagram.com/gmtchtune";

const tabs = {
  tune: {
    label: "Servicios Tune",
    title: "Reprogramacion ECU/TCU, diagnostico y calibracion automotriz",
    text:
      "Stage 1, Stage 2, Stage 3, optimizacion ECU, optimizacion TCU, scanner profesional, revision de DTC y soluciones tecnicas segun evaluacion del vehiculo.",
    cta: "Contactar por WhatsApp",
    ctaHref: WHATSAPP_URL,
    visual: "CALIBRATION CORE",
    cards: [
      "Stage 1 / Stage 2 / Stage 3",
      "Optimizacion ECU",
      "Optimizacion TCU",
      "Scanner profesional",
      "Revision de DTC",
      "Flotas y proyectos tecnicos",
    ],
  },
  os: {
    label: "GMTCH Tune OS",
    title: "Centro de mando operativo para trabajo automotriz real",
    text:
      "Plataforma propia para recepcion, ordenes, estados, responsables, notificaciones, historial tecnico y cierre tecnico/comercial.",
    cta: "Acceso plataforma",
    ctaTo: "/login",
    visual: "OPERATIONS OS",
    cards: [
      "Centro de mando operativo",
      "Recepcion y seguimiento",
      "Ordenes de trabajo",
      "Estados operativos",
      "Notificaciones",
      "Responsables",
      "Historial tecnico",
      "Cierre tecnico y comercial",
    ],
  },
  portal: {
    label: "Portal File Service",
    title: "Portal para talleres, masters y flujo externo controlado",
    text:
      "File Service Chile para talleres: carga de archivo, revision de lecturas, MOD listo, correcciones, requerimiento de nueva lectura, descarga protegida e historial.",
    cta: "Entrar al Portal File Service",
    ctaTo: "/portal/login",
    visual: "FILE SERVICE FLOW",
    cards: [
      "Carga de archivo",
      "Revision tecnica",
      "MOD listo",
      "Correcciones",
      "Requerimiento de nueva lectura",
      "Descarga protegida",
      "Historial",
      "Auditoria",
    ],
  },
};

const servicios = [
  {
    icon: "S1",
    title: "Stage 1",
    text: "Mejora de calibracion sobre vehiculo original, enfocada en respuesta, torque y eficiencia segun objetivo tecnico.",
    badge: "ECU",
  },
  {
    icon: "S2",
    title: "Stage 2",
    text: "Calibracion para vehiculos con mejoras de hardware. Requiere evaluacion tecnica, diagnostico y validacion del conjunto.",
    badge: "HW",
  },
  {
    icon: "S3",
    title: "Stage 3 / proyectos especiales",
    text: "Desarrollo para proyectos de alto nivel, competicion donde corresponda y configuraciones que requieren planificacion avanzada.",
    badge: "PRO",
  },
  {
    icon: "TCU",
    title: "Optimizacion TCU",
    text: "Trabajo sobre gestion de transmision cuando aplica: respuesta, estrategia de cambios y coherencia con calibracion del motor.",
    badge: "GEAR",
  },
  {
    icon: "DTC",
    title: "Diagnostico avanzado",
    text: "Scanner profesional, revision de DTC, analisis de sintomas, pruebas y evidencia para tomar decisiones tecnicas con respaldo.",
    badge: "SCAN",
  },
  {
    icon: "FS",
    title: "File Service para talleres",
    text: "Revision de lecturas, soporte tecnico, MOD, correcciones, nueva lectura cuando corresponde y descarga protegida.",
    badge: "PORTAL",
  },
  {
    icon: "FLT",
    title: "Flotas y proyectos tecnicos",
    text: "Soporte para operaciones con varios vehiculos, trazabilidad por unidad, historial y control de procesos.",
    badge: "FLEET",
  },
  {
    icon: "LAB",
    title: "Soporte a talleres",
    text: "Acompanamiento para lectura, escritura, validacion, post escritura y continuidad tecnica del trabajo.",
    badge: "HELP",
  },
  {
    icon: "TRC",
    title: "Trazabilidad tecnica",
    text: "Historial por vehiculo, responsables, evidencia, estados operativos y comunicacion ordenada.",
    badge: "TRACE",
  },
];

const stages = [
  {
    title: "Stage 1",
    text:
      "Calibracion sobre vehiculo original. Busca mejor respuesta, entrega de torque y eficiencia segun uso y condicion mecanica.",
    tag: "Original hardware",
  },
  {
    title: "Stage 2",
    text:
      "Calibracion para vehiculos con mejoras de hardware. Requiere evaluacion tecnica previa y validacion del conjunto.",
    tag: "Hardware upgrades",
  },
  {
    title: "Stage 3",
    text:
      "Proyectos especiales, desarrollo avanzado y competicion donde corresponda. Requiere diagnostico, planificacion y control.",
    tag: "Advanced project",
  },
];

const technicalSolutions = [
  "DTC / diagnostico y gestion de fallas",
  "DPF / FAP",
  "EGR",
  "SCR / AdBlue / DEF",
  "NOx",
  "Lambda / O2",
  "TVA / mariposa admision",
  "IMMO / inmovilizador",
  "Vmax / limitadores",
  "Pops & Bangs / sonido deportivo donde corresponda",
  "Launch Control / funciones especiales si aplica",
];

const whyChoose = [
  "Plataforma propia GMTCH Tune OS",
  "Trazabilidad por vehiculo y orden",
  "Historial tecnico y evidencia",
  "Soporte postventa ordenado",
  "Revision tecnica interna",
  "Comunicacion clara con clientes y talleres",
  "Experiencia ECU, TCU y File Service",
  "Control de procesos y responsables",
];

const osFeatures = [
  "Centro de mando operativo",
  "Recepcion de vehiculos",
  "Ordenes de trabajo",
  "Estados por area",
  "File Service interno",
  "Notificaciones operativas",
  "Portal Masters",
  "Trazabilidad",
  "Historial tecnico",
  "Control de responsables",
  "Cierre comercial/tecnico",
];

const fileFlow = [
  "Carga archivo",
  "Revision tecnica",
  "Validacion",
  "MOD listo",
  "Correccion si aplica",
  "Nueva lectura si el metodo fue incorrecto",
  "Descarga protegida",
  "Historial/auditoria",
];

const capabilityBars = [
  ["Control operativo", 92],
  ["Trazabilidad", 96],
  ["File Service", 88],
  ["Diagnostico", 84],
  ["Soporte a talleres", 90],
  ["Portal OS", 86],
];

const gallery = [
  {
    title: "Laboratorio ECU",
    label: "Banco tecnico, lectura, revision y control de archivos",
    badge: "LAB",
  },
  {
    title: "Diagnostico profesional",
    label: "Scanner, DTC, pruebas y evidencia tecnica",
    badge: "SCAN",
  },
  {
    title: "File Service",
    label: "Carga, MOD, correcciones, nueva lectura e historial",
    badge: "FILE",
  },
  {
    title: "Centro de mando GMTCH Tune OS",
    label: "Ordenes, responsables, estados y trazabilidad",
    badge: "OS",
  },
  {
    title: "Soporte a talleres",
    label: "Acompanamiento tecnico para lectura, escritura y validacion",
    badge: "SHOP",
  },
  {
    title: "Proyectos flota",
    label: "Gestion por unidad, historial y continuidad operativa",
    badge: "FLEET",
  },
];

const LogoGMTCH = ({ className = "h-12 w-auto" }) => {
  const [logoOk, setLogoOk] = useState(true);

  if (!logoOk) {
    return (
      <span className="text-xl font-black uppercase tracking-[0.18em] text-white">
        GMTCH <span className="text-blue-400">Tune</span>
      </span>
    );
  }

  return (
    <img
      src="/brand/gmtch-logo.png"
      alt="GMTCH Tune"
      className={`${className} max-w-full object-contain`}
      onError={() => setLogoOk(false)}
    />
  );
};

const SectionHeader = ({ eyebrow, title, text }) => (
  <div className="max-w-4xl">
    <p className="text-[11px] font-black uppercase tracking-[0.34em] text-blue-300">
      {eyebrow}
    </p>
    <h2 className="mt-4 text-3xl font-black uppercase leading-tight text-white md:text-5xl">
      {title}
    </h2>
    {text && (
      <p className="mt-5 max-w-3xl text-sm font-semibold leading-7 text-slate-300 md:text-base">
        {text}
      </p>
    )}
  </div>
);

const ActionButton = ({ href, to, children, variant = "primary" }) => {
  const classes =
    variant === "primary"
      ? "group relative overflow-hidden border border-blue-300 bg-blue-500 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_0_34px_rgba(59,130,246,0.34)] transition hover:bg-white hover:text-black"
      : "group relative overflow-hidden border border-slate-500 bg-white/5 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-100 backdrop-blur transition hover:border-blue-300 hover:bg-blue-500/10 hover:text-blue-100";

  const content = (
    <>
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-y-0 left-0 w-0 bg-white/20 transition-all duration-300 group-hover:w-full" />
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={classes}>
      {content}
    </a>
  );
};

const Telemetry = ({ label, value, sub = "READY" }) => (
  <div className="border border-blue-400/25 bg-white/[0.045] p-4 backdrop-blur-xl">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <span className="h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_18px_rgba(96,165,250,1)]" />
    </div>
    <p className="mt-3 text-2xl font-black uppercase text-white">{value}</p>
    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">
      {sub}
    </p>
  </div>
);

const HudVisual = () => (
  <div className="relative min-h-[560px] overflow-hidden border border-blue-400/30 bg-slate-950/70 p-5 shadow-[0_0_130px_rgba(37,99,235,0.22)] backdrop-blur-xl">
    <div className="circuit-grid absolute inset-0" />
    <div className="circuit-line circuit-line-a" />
    <div className="circuit-line circuit-line-b" />
    <div className="circuit-line circuit-line-c" />
    <div className="circuit-node left-[14%] top-[18%]" />
    <div className="circuit-node right-[17%] top-[21%]" />
    <div className="circuit-node bottom-[18%] left-[20%]" />

    <div className="relative z-10 flex h-full min-h-[520px] flex-col justify-between gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-blue-300">
            Technical Diagnostic HUD
          </p>
          <h3 className="mt-3 text-2xl font-black uppercase text-white">
            ECU / TCU Control Matrix
          </h3>
        </div>
        <div className="border border-green-400/40 bg-green-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-green-200">
          OS Online
        </div>
      </div>

      <div className="mx-auto grid aspect-square w-full max-w-[310px] place-items-center border border-blue-300/40 bg-black/70 shadow-[inset_0_0_45px_rgba(59,130,246,0.22),0_0_60px_rgba(59,130,246,0.25)]">
        <div className="relative grid h-[72%] w-[72%] place-items-center border border-slate-500 bg-slate-950 shadow-[inset_0_0_30px_rgba(15,23,42,1)]">
          <div className="absolute -left-8 top-8 h-px w-8 bg-blue-400/50" />
          <div className="absolute -right-8 bottom-8 h-px w-8 bg-blue-400/50" />
          <img
            src="/brand/gmtch-isotipo.png"
            alt="GMTCH"
            className="h-24 w-24 object-contain opacity-90"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <span className="mt-3 text-[10px] font-black uppercase tracking-[0.28em] text-blue-200">
            Control Unit
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          ["ECU", "READY"],
          ["TCU", "MAP"],
          ["FILE", "QUEUE"],
          ["TRACE", "OK"],
          ["Signal", "A-17"],
          ["Checksum", "PASS"],
        ].map(([label, value]) => (
          <div key={`${label}-${value}`} className="border border-slate-700 bg-black/60 p-3">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <span>{label}</span>
              <span className="text-blue-300">{value}</span>
            </div>
            <div className="mt-3 h-1 overflow-hidden bg-slate-800">
              <div className="hud-bar h-full bg-blue-400" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ExploreTabs = () => {
  const [activeKey, setActiveKey] = useState("tune");
  const active = tabs[activeKey];

  return (
    <section id="explora" className="border-y border-white/10 bg-slate-950/80 px-5 py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Explora GMTCH"
          title="Dos lineas tecnicas, una sola operacion controlada"
          text="GMTCH Tune une servicios automotrices especializados con GMTCH Tune OS, una plataforma propia para controlar trabajo real."
        />

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="space-y-3">
            {Object.entries(tabs).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveKey(key)}
                className={`w-full border px-5 py-4 text-left text-xs font-black uppercase tracking-[0.16em] transition ${
                  activeKey === key
                    ? "border-blue-300 bg-blue-500 text-white shadow-[0_0_30px_rgba(59,130,246,0.24)]"
                    : "border-slate-700 bg-black/50 text-slate-300 hover:border-blue-400"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.8fr]">
            <div className="border border-blue-400/25 bg-black/55 p-6 backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-300">
                {active.visual}
              </p>
              <h3 className="mt-4 text-2xl font-black uppercase text-white md:text-3xl">
                {active.title}
              </h3>
              <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
                {active.text}
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {active.cards.map((card) => (
                  <div
                    key={card}
                    className="border border-slate-700 bg-slate-950/80 px-4 py-3 text-xs font-black uppercase text-slate-200"
                  >
                    <span className="mr-2 text-blue-300">/</span>
                    {card}
                  </div>
                ))}
              </div>
              <div className="mt-7 max-w-sm">
                <ActionButton href={active.ctaHref} to={active.ctaTo}>
                  {active.cta}
                </ActionButton>
              </div>
            </div>

            <div className="relative overflow-hidden border border-slate-700 bg-white/[0.035] p-5">
              <div className="circuit-grid absolute inset-0 opacity-60" />
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">
                  Dynamic module
                </p>
                <p className="mt-4 text-4xl font-black uppercase text-blue-200">
                  {activeKey.toUpperCase()}
                </p>
                <div className="mt-8 space-y-4">
                  {[76, 88, 64, 94].map((value, index) => (
                    <div key={value + index}>
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        <span>Channel {index + 1}</span>
                        <span>Active</span>
                      </div>
                      <div className="mt-2 h-2 bg-slate-800">
                        <div
                          className="hud-bar h-full bg-blue-400"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ServiceCard = ({ item }) => (
  <article className="group translate-y-0 border border-slate-700 bg-white/[0.035] p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-blue-400 hover:bg-blue-950/25 hover:shadow-[0_0_45px_rgba(37,99,235,0.18)]">
    <div className="flex items-center justify-between gap-3">
      <span className="grid h-12 w-12 place-items-center border border-blue-400/40 bg-blue-400/10 text-sm font-black uppercase text-blue-200">
        {item.icon}
      </span>
      <span className="border border-slate-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
        {item.badge}
      </span>
    </div>
    <h3 className="mt-6 text-lg font-black uppercase text-white">{item.title}</h3>
    <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">{item.text}</p>
  </article>
);

const DashboardMockup = () => (
  <div className="border border-blue-400/25 bg-black/60 p-5 backdrop-blur-xl">
    <div className="flex items-center justify-between border-b border-white/10 pb-4">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">
        GMTCH Tune OS
      </p>
      <span className="border border-green-400/40 px-3 py-1 text-[10px] font-black uppercase text-green-300">
        Command center
      </span>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
      {["Recepcion", "Diagnostico", "File Service", "Entrega"].map((item, index) => (
        <div key={item} className="border border-slate-700 bg-slate-950 p-3">
          <p className="text-[10px] font-black uppercase text-slate-500">Area</p>
          <p className="mt-2 text-xs font-black uppercase text-white">{item}</p>
          <div className="mt-3 h-1 bg-slate-800">
            <div className="h-full bg-blue-400" style={{ width: `${62 + index * 8}%` }} />
          </div>
        </div>
      ))}
    </div>

    <div className="mt-5 overflow-hidden border border-slate-700">
      {[
        ["#1042", "LISTO ENTREGA", "RECEPCION", "ATENCION"],
        ["#1043", "EN PROGRAMACION", "ECU", "OK"],
        ["#1044", "PAGO PENDIENTE", "CAJA", "ALERTA"],
      ].map((row) => (
        <div
          key={row[0]}
          className="grid grid-cols-4 gap-2 border-b border-slate-800 bg-slate-950/80 px-3 py-3 text-[10px] font-black uppercase text-slate-300 last:border-b-0"
        >
          {row.map((cell) => (
            <span key={cell}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const ContactForm = () => {
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
    tipo: "Servicio ECU/TCU",
    mensaje: "",
  });

  const whatsappHref = useMemo(() => {
    const texto = [
      "Hola GMTCH Tune, quiero hacer una consulta.",
      `Nombre: ${form.nombre || "No indicado"}`,
      `Telefono: ${form.telefono || "No indicado"}`,
      `Email: ${form.email || "No indicado"}`,
      `Tipo de solicitud: ${form.tipo}`,
      `Mensaje: ${form.mensaje || "No indicado"}`,
    ].join("\n");

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
  }, [form]);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <form
      className="border border-blue-400/25 bg-white/[0.035] p-5 backdrop-blur-xl"
      onSubmit={(event) => {
        event.preventDefault();
        window.open(whatsappHref, "_blank", "noopener,noreferrer");
      }}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          className="border border-slate-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-400"
          placeholder="Nombre"
          value={form.nombre}
          onChange={(event) => update("nombre", event.target.value)}
        />
        <input
          className="border border-slate-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-400"
          placeholder="Telefono"
          value={form.telefono}
          onChange={(event) => update("telefono", event.target.value)}
        />
        <input
          className="border border-slate-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-400"
          placeholder="Email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
        />
        <select
          className="border border-slate-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-400"
          value={form.tipo}
          onChange={(event) => update("tipo", event.target.value)}
        >
          <option>Servicio ECU/TCU</option>
          <option>Diagnostico</option>
          <option>File Service</option>
          <option>Taller/Master</option>
          <option>Flota/empresa</option>
          <option>Soporte plataforma</option>
        </select>
      </div>
      <textarea
        className="mt-3 min-h-[130px] w-full border border-slate-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-400"
        placeholder="Mensaje"
        value={form.mensaje}
        onChange={(event) => update("mensaje", event.target.value)}
      />
      <button
        type="submit"
        className="mt-4 w-full border border-blue-300 bg-blue-500 px-5 py-4 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-black"
      >
        Enviar por WhatsApp
      </button>
    </form>
  );
};

function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500 selection:text-white">
      <style>{`
        @keyframes gmtchFlow {
          0% { transform: translateX(-100%); opacity: 0.2; }
          45% { opacity: 1; }
          100% { transform: translateX(120%); opacity: 0.15; }
        }
        @keyframes gmtchPulseGlow {
          0%, 100% { box-shadow: 0 0 18px rgba(59, 130, 246, 0.25); }
          50% { box-shadow: 0 0 42px rgba(59, 130, 246, 0.55); }
        }
        .circuit-grid {
          background-image:
            linear-gradient(rgba(96,165,250,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(96,165,250,0.08) 1px, transparent 1px);
          background-size: 34px 34px;
        }
        .circuit-line {
          position: absolute;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(96,165,250,0.75), transparent);
          animation: gmtchFlow 4.2s linear infinite;
        }
        .circuit-line-a { left: 8%; right: 8%; top: 21%; }
        .circuit-line-b { left: 14%; right: 18%; top: 61%; animation-delay: 1.2s; }
        .circuit-line-c { left: 22%; right: 12%; top: 78%; animation-delay: 2.1s; }
        .circuit-node {
          position: absolute;
          height: 10px;
          width: 10px;
          border-radius: 999px;
          background: rgb(147, 197, 253);
          box-shadow: 0 0 24px rgba(96,165,250,1);
          animation: gmtchPulseGlow 2.4s ease-in-out infinite;
        }
        .hud-bar {
          position: relative;
          overflow: hidden;
        }
        .hud-bar::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 45%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent);
          animation: gmtchFlow 2.2s linear infinite;
        }
      `}</style>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <a href="#inicio" className="flex items-center gap-3">
            <LogoGMTCH className="h-10 w-auto max-w-[180px]" />
          </a>

          <nav className="hidden items-center gap-6 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 lg:flex">
            <a href="#inicio" className="hover:text-blue-300">Inicio</a>
            <a href="#servicios" className="hover:text-blue-300">Servicios</a>
            <a href="#tune-os" className="hover:text-blue-300">GMTCH Tune OS</a>
            <a href="#file-service" className="hover:text-blue-300">File Service</a>
            <a href="#contacto" className="hover:text-blue-300">Contacto</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/portal/login"
              className="hidden border border-slate-600 bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-100 transition hover:border-blue-300 sm:block"
            >
              Portal
            </Link>
            <Link
              to="/login"
              className="border border-blue-400/60 bg-blue-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-blue-100 transition hover:bg-blue-500 hover:text-white"
            >
              Acceso
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="inicio" className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(59,130,246,0.32),transparent_32%),radial-gradient(circle_at_80%_18%,rgba(14,165,233,0.18),transparent_28%),linear-gradient(135deg,#020617_0%,#000_42%,#07111f_100%)]" />
          <div className="circuit-grid absolute inset-0 opacity-60" />
          <div className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl grid-cols-1 items-center gap-10 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <LogoGMTCH className="mb-8 h-auto w-full max-w-[360px] md:max-w-[480px]" />
              <div className="inline-flex border border-blue-400/40 bg-blue-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-blue-200">
                ECU - TCU - File Service - GMTCH Tune OS
              </div>

              <h1 className="mt-7 max-w-5xl text-4xl font-black uppercase leading-[0.95] text-white md:text-6xl xl:text-7xl">
                Ingenieria automotriz avanzada para ECU, TCU y File Service
              </h1>

              <p className="mt-7 max-w-3xl text-base font-semibold leading-8 text-slate-300 md:text-xl">
                Diagnostico, calibracion automotriz, reprogramacion ECU Chile,
                reprogramacion TCU, File Service Chile y soporte tecnico para
                talleres, flotas y proyectos de alto nivel.
              </p>
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
                GMTCH Tune combina desarrollo tecnico automotriz con una plataforma propia de
                trazabilidad y control operativo.
              </p>

              <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ActionButton href={WHATSAPP_URL}>WhatsApp</ActionButton>
                <ActionButton to="/login" variant="secondary">Acceso plataforma</ActionButton>
                <ActionButton to="/portal/login" variant="secondary">Portal File Service</ActionButton>
                <ActionButton href={INSTAGRAM_URL} variant="secondary">Instagram</ActionButton>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-6">
                <Telemetry label="Trace" value="OK" sub="Operativo" />
                <Telemetry label="Queue" value="FS" sub="Portal" />
                <Telemetry label="OS" value="Live" sub="GMTCH" />
              </div>
            </div>

            <HudVisual />
          </div>
        </section>

        <ExploreTabs />

        <section id="servicios" className="relative overflow-hidden px-5 py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(37,99,235,0.16),transparent_28%)]" />
          <div className="relative mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Servicios GMTCH Tune"
              title="Servicios completos para clientes finales, talleres y flotas"
              text="Reprogramacion ECU, reprogramacion TCU, diagnostico automotriz, calibracion automotriz, soporte a talleres y File Service con trazabilidad."
            />
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {servicios.map((item) => (
                <ServiceCard key={item.title} item={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-slate-950/80 px-5 py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Etapas de desarrollo"
              title="Stage 1, Stage 2 y Stage 3 explicados con criterio tecnico"
              text="Cada proyecto parte con evaluacion del vehiculo, objetivo del cliente y condicion mecanica. La prioridad es trabajar con respaldo, trazabilidad y comunicacion clara."
            />

            <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {stages.map((stage, index) => (
                <article
                  key={stage.title}
                  className="relative overflow-hidden border border-blue-400/25 bg-white/[0.035] p-7 backdrop-blur-xl"
                >
                  <div className="circuit-grid absolute inset-0 opacity-40" />
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">
                      Level 0{index + 1}
                    </p>
                    <h3 className="mt-5 text-3xl font-black uppercase text-white">
                      {stage.title}
                    </h3>
                    <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
                      {stage.text}
                    </p>
                    <span className="mt-6 inline-block border border-slate-600 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                      {stage.tag}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-24">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <SectionHeader
              eyebrow="Soluciones tecnicas"
              title="Diagnostico, gestion de fallas y funciones especiales"
              text="Servicios sujetos a evaluacion tecnica del vehiculo, normativa aplicable, uso autorizado y/o proyectos de competicion donde corresponda."
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {technicalSolutions.map((item) => (
                <div
                  key={item}
                  className="border border-slate-700 bg-black/55 px-4 py-4 text-xs font-black uppercase tracking-[0.08em] text-slate-200 transition hover:border-blue-400 hover:bg-blue-950/20"
                >
                  <span className="mr-2 text-blue-300">/</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="tune-os" className="border-y border-white/10 bg-slate-950/80 px-5 py-24">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <SectionHeader
              eyebrow="GMTCH Tune OS"
              title="Plataforma propia de control operativo"
              text="La diferencia no es solo calibrar. Es controlar el proceso: recepcion, ordenes, estados operativos, archivos ECU, notificaciones, portal masters, responsables, historial tecnico y cierre comercial/tecnico."
            />
            <div>
              <DashboardMockup />
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {osFeatures.map((item) => (
                  <div
                    key={item}
                    className="border border-slate-700 bg-black/50 px-4 py-3 text-xs font-black uppercase text-slate-200"
                  >
                    <span className="mr-2 text-blue-300">/</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="file-service" className="px-5 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_0.9fr]">
              <SectionHeader
                eyebrow="Portal File Service"
                title="File Service profesional para talleres"
                text="Los talleres pueden cargar archivos, recibir revision tecnica, gestionar correcciones, responder requerimientos de nueva lectura y descargar MODs con control, historial y auditoria."
              />
              <div className="grid content-end gap-3 sm:grid-cols-2">
                <ActionButton to="/portal/login">Entrar al Portal File Service</ActionButton>
                <ActionButton href={WHATSAPP_URL} variant="secondary">Consultar por WhatsApp</ActionButton>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {fileFlow.map((step, index) => (
                <div
                  key={step}
                  className="relative overflow-hidden border border-slate-700 bg-white/[0.035] p-6 backdrop-blur-xl transition hover:border-blue-400"
                >
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full border border-blue-400/20" />
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-blue-300">
                    FS-0{index + 1}
                  </p>
                  <h3 className="mt-5 text-base font-black uppercase text-white">{step}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(0,0,0,1))] px-5 py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Por que elegir GMTCH Tune"
              title="Tecnica, proceso y respaldo en una sola operacion"
              text="GMTCH Tune no trabaja como una lista de tareas sueltas. Cada servicio se apoya en control de procesos, revision tecnica interna, comunicacion ordenada e historial."
            />

            <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {whyChoose.map((item) => (
                  <div
                    key={item}
                    className="border border-slate-700 bg-black/50 px-4 py-4 text-xs font-black uppercase tracking-[0.08em] text-slate-200"
                  >
                    <span className="mr-2 text-blue-300">/</span>
                    {item}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                {capabilityBars.map(([label, value]) => (
                  <div key={label} className="border border-slate-700 bg-black/50 p-5">
                    <div className="flex justify-between text-xs font-black uppercase tracking-[0.16em] text-slate-300">
                      <span>{label}</span>
                      <span className="text-blue-300">GMTCH</span>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden bg-slate-800">
                      <div className="hud-bar h-full bg-blue-400" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Operacion tecnica"
              title="Visuales finales de laboratorio, diagnostico y File Service"
              text="Una presencia digital pensada para transmitir ingenieria automotriz, control, trazabilidad y soporte real a clientes, talleres y flotas."
            />
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {gallery.map((item, index) => (
                <div
                  key={item.title}
                  className="group relative min-h-[300px] overflow-hidden border border-slate-700 bg-slate-950 p-5 transition hover:-translate-y-1 hover:border-blue-400 hover:shadow-[0_0_45px_rgba(37,99,235,0.20)]"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.35),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(0,0,0,1))]" />
                  <div className="circuit-grid absolute inset-0 opacity-60" />
                  <div className="absolute left-8 top-20 h-20 w-20 border border-blue-300/40 bg-blue-400/10 shadow-[0_0_32px_rgba(59,130,246,0.18)]" />
                  <div className="absolute bottom-10 right-8 h-24 w-32 border border-slate-500/40 bg-black/40" />
                  <div className="absolute left-12 top-32 h-px w-2/3 bg-blue-400/40" />
                  <div className="relative z-10 flex h-full min-h-[260px] flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">
                        {item.badge}
                      </p>
                      <span className="h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_18px_rgba(96,165,250,1)]" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase text-white">{item.title}</h3>
                      <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                        {item.label}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contacto" className="relative overflow-hidden border-y border-white/10 px-5 py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(37,99,235,0.20),transparent_36%)]" />
          <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <SectionHeader
                eyebrow="Contacto"
                title="Conversemos por el canal correcto"
                text="Cotiza reprogramacion ECU, reprogramacion TCU, diagnostico automotriz, File Service, soporte a talleres o proyectos de flota."
              />
              <div className="mt-8 space-y-3 text-sm font-bold text-slate-300">
                <p>WhatsApp: {WHATSAPP_DISPLAY}</p>
                <p>Instagram: @gmtchtune</p>
                <p>
                  Email: <a className="text-blue-300" href="mailto:contacto@gmtchtune.com">contacto@gmtchtune.com</a>
                </p>
                <p>
                  Ventas: <a className="text-blue-300" href="mailto:ventas@gmtchtune.com">ventas@gmtchtune.com</a>
                </p>
                <p>
                  File Service: <a className="text-blue-300" href="mailto:fileservice@gmtchtune.com">fileservice@gmtchtune.com</a>
                </p>
              </div>
            </div>
            <ContactForm />
          </div>
        </section>

        <section className="px-5 py-24">
          <div className="mx-auto max-w-7xl border border-blue-400/25 bg-white/[0.035] p-7 backdrop-blur-xl md:p-10">
            <h2 className="max-w-5xl text-3xl font-black uppercase leading-tight text-white md:text-5xl">
              Eleva tu operacion automotriz con una plataforma tecnica disenada para trabajo real.
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ActionButton href={WHATSAPP_URL}>Cotizar servicio</ActionButton>
              <ActionButton to="/portal/login" variant="secondary">Portal File Service</ActionButton>
              <ActionButton to="/login" variant="secondary">Acceso plataforma</ActionButton>
              <ActionButton href={INSTAGRAM_URL} variant="secondary">Instagram</ActionButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 py-8 text-center text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
        GMTCH Tune / Ingenieria automotriz avanzada / GMTCH Tune OS / File Service
      </footer>
    </div>
  );
}

export default LandingPage;
