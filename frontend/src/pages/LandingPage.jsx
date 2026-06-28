import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const WHATSAPP_NUMBER = "56962267642";
const WHATSAPP_DISPLAY = "+56 9 6226 7642";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
const INSTAGRAM_URL = "https://instagram.com/gmtchtune";

const NAV_ITEMS = [
  ["#inicio", "Inicio"],
  ["#servicios", "Servicios"],
  ["#vehiculos", "Vehiculos"],
  ["#tune-os", "GMTCH OS"],
  ["#file-service", "File Service"],
  ["#contacto", "Contacto"],
];

const VEHICLE_CATEGORIES = [
  ["Autos", "Calibracion y diagnostico para uso diario, deportivo o proyectos tecnicos.", "car"],
  ["Camionetas", "Torque, respuesta y soporte para trabajo, ruta y preparaciones.", "pickup"],
  ["SUV", "Gestion ECU/TCU, diagnostico avanzado y soporte postventa.", "suv"],
  ["Camiones", "Soporte tecnico para unidades pesadas y operacion profesional.", "truck"],
  ["Maquinaria", "Diagnostico y soluciones tecnicas para equipos de trabajo.", "machine"],
  ["Agricolas", "Apoyo a proyectos tecnicos y unidades de campo autorizadas.", "tractor"],
  ["Lanchas", "Gestion electronica y soporte para aplicaciones acuaticas.", "boat"],
  ["Motos de agua", "Diagnostico, calibracion y respaldo tecnico especializado.", "jetski"],
  ["Flotas", "Control por unidad, historial y trazabilidad de trabajos.", "fleet"],
  ["Proyectos especiales", "Stage 3, competicion y desarrollos con planificacion tecnica.", "project"],
];

const SERVICE_GROUPS = [
  {
    title: "Performance",
    code: "PERF",
    items: [
      "Stage 1",
      "Stage 2",
      "Stage 3 / proyectos especiales",
      "Reprogramacion ECU",
      "Reprogramacion TCU",
      "Vmax",
      "Launch Control",
      "Pops & Bangs",
      "Hardcut",
    ],
  },
  {
    title: "Diagnostico",
    code: "SCAN",
    items: [
      "Diagnostico profesional",
      "Revision DTC",
      "Scanner avanzado",
      "Analisis de fallas",
      "Soporte postventa",
    ],
  },
  {
    title: "Soluciones tecnicas",
    code: "TECH",
    items: [
      "DPF / FAP",
      "EGR",
      "SCR / AdBlue / DEF",
      "NOx",
      "Lambda / O2",
      "TVA",
      "DTC Off",
      "IMMO",
    ],
  },
  {
    title: "Talleres / Masters",
    code: "FILE",
    items: [
      "File Service",
      "Revision de lecturas",
      "Correcciones",
      "Nueva lectura si aplica",
      "Descarga protegida",
      "Soporte a talleres",
    ],
  },
];

const WHY_ITEMS = [
  "Ingenieria y calibracion profesional",
  "Plataforma propia GMTCH Tune OS",
  "Trazabilidad de trabajos y archivos",
  "Soporte postventa",
  "Control de ordenes y responsables",
  "Clientes finales, talleres y flotas",
  "Operacion ordenada, no improvisada",
  "Experiencia en ECU, TCU y File Service",
];

const OS_ITEMS = [
  "Ordenes de trabajo",
  "Historial tecnico",
  "File Service interno",
  "Postventa tecnica",
  "Bitacora operativa",
  "Notificaciones",
  "Responsables por etapa",
  "Finanzas y control interno",
  "Estadisticas internas",
];

const FILE_SERVICE_ITEMS = [
  "Portal exclusivo",
  "Carga de archivos",
  "Revision tecnica",
  "MOD listo",
  "Correcciones ordenadas",
  "Nueva lectura si aplica",
  "Descarga protegida",
  "Historial y auditoria",
];

const PROCESS_STEPS = [
  ["01", "Diagnostico / solicitud", "Recepcion clara de datos, sintomas, objetivo tecnico y contexto del vehiculo."],
  ["02", "Evaluacion tecnica", "Revision del caso, lectura, DTC, estado mecanico y factibilidad del servicio."],
  ["03", "Calibracion / File Service", "Trabajo tecnico controlado sobre ECU, TCU o archivo segun corresponda."],
  ["04", "Validacion / post escritura", "Registro de evidencia, post escritura y revision final cuando aplica."],
  ["05", "Entrega y soporte postventa", "Cierre ordenado, comunicacion clara e historial para respaldo futuro."],
];

const LogoGMTCH = ({ className = "h-14 w-auto" }) => {
  const [logoOk, setLogoOk] = useState(true);

  if (!logoOk) {
    return (
      <span className="text-3xl font-black uppercase tracking-[0.2em] text-white">
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

const ActionButton = ({ href, to, children, variant = "primary" }) => {
  const base =
    "group relative inline-flex min-h-[52px] items-center justify-center overflow-hidden border px-5 py-4 text-center text-xs font-black uppercase tracking-[0.16em] transition";
  const styles =
    variant === "primary"
      ? "border-blue-300 bg-blue-500 text-white shadow-[0_0_38px_rgba(59,130,246,0.38)] hover:bg-white hover:text-black"
      : "border-slate-500 bg-white/5 text-slate-100 backdrop-blur hover:border-blue-300 hover:bg-blue-500/10 hover:text-blue-100";
  const content = (
    <>
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-y-0 left-0 w-0 bg-white/20 transition-all duration-300 group-hover:w-full" />
    </>
  );

  return to ? (
    <Link to={to} className={`${base} ${styles}`}>
      {content}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer" className={`${base} ${styles}`}>
      {content}
    </a>
  );
};

const SectionHeader = ({ eyebrow, title, text }) => (
  <div className="max-w-5xl">
    <p className="text-[11px] font-black uppercase tracking-[0.34em] text-blue-300">
      {eyebrow}
    </p>
    <h2 className="metal-text mt-4 text-3xl font-black uppercase leading-tight md:text-5xl">
      {title}
    </h2>
    {text && (
      <p className="mt-5 max-w-4xl text-sm font-semibold leading-7 text-slate-300 md:text-base">
        {text}
      </p>
    )}
  </div>
);

const VehicleSketch = ({ type = "car" }) => {
  const isBoat = type === "boat" || type === "jetski";
  const isTall = ["truck", "machine", "tractor", "fleet", "project"].includes(type);

  return (
    <svg viewBox="0 0 180 82" role="img" aria-label={type} className="h-20 w-full">
      <defs>
        <linearGradient id={`metal-${type}`} x1="0" x2="1">
          <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.2" />
          <stop offset="52%" stopColor="#93c5fd" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      {isBoat ? (
        <>
          <path d="M20 48 L142 48 L160 34 L146 61 L38 64 Z" fill="rgba(15,23,42,0.7)" stroke={`url(#metal-${type})`} strokeWidth="2" />
          <path d="M58 46 L82 28 L122 28 L140 46" fill="none" stroke="#60a5fa" strokeWidth="2" />
          <path d="M18 68 C50 74 126 74 165 66" fill="none" stroke="#1d4ed8" strokeWidth="2" opacity="0.7" />
        </>
      ) : (
        <>
          <path
            d={
              isTall
                ? "M18 54 L28 34 L70 28 L88 17 L130 19 L154 38 L164 54 Z"
                : "M18 54 L35 36 L70 31 L92 18 L132 22 L158 43 L166 54 Z"
            }
            fill="rgba(15,23,42,0.72)"
            stroke={`url(#metal-${type})`}
            strokeWidth="2"
          />
          <path d="M54 36 L91 26 L130 31" fill="none" stroke="#60a5fa" strokeWidth="2" opacity="0.75" />
          <circle cx="52" cy="58" r="8" fill="#020617" stroke="#93c5fd" strokeWidth="2" />
          <circle cx="136" cy="58" r="8" fill="#020617" stroke="#93c5fd" strokeWidth="2" />
          {isTall && <path d="M104 22 L104 54" stroke="#60a5fa" strokeWidth="2" opacity="0.65" />}
        </>
      )}
      <path d="M18 72 H164" stroke="#2563eb" strokeWidth="1.5" opacity="0.65" />
      <path d="M28 12 H82 M100 12 H152 M32 18 H54 M122 18 H165" stroke="#60a5fa" strokeWidth="1" opacity="0.35" />
    </svg>
  );
};

const FlyerVehicleStrip = () => (
  <div className="relative mt-10 overflow-hidden border border-blue-400/25 bg-black/55 p-4 shadow-[0_0_80px_rgba(37,99,235,0.18)]">
    <div className="circuit-grid absolute inset-0 opacity-45" />
    <div className="relative grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
      {[
        ["Auto", "car"],
        ["SUV", "suv"],
        ["Pickup", "pickup"],
        ["Camion", "truck"],
        ["Maquinaria", "machine"],
        ["Lancha", "boat"],
        ["Jet", "jetski"],
      ].map(([label, type]) => (
        <div key={label} className="border border-slate-700 bg-slate-950/80 p-3">
          <VehicleSketch type={type} />
          <p className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-blue-200">
            {label}
          </p>
        </div>
      ))}
    </div>
  </div>
);

const HudPanel = () => (
  <div className="relative min-h-[580px] overflow-hidden border border-blue-400/35 bg-slate-950/75 p-5 shadow-[0_0_120px_rgba(37,99,235,0.26)] backdrop-blur-xl">
    <div className="circuit-grid absolute inset-0" />
    <div className="absolute left-8 top-8 h-24 w-24 border border-blue-300/30 bg-blue-500/10" />
    <div className="absolute right-10 top-24 h-20 w-36 border border-slate-500/40 bg-black/40" />
    <div className="absolute bottom-16 left-12 h-px w-3/4 bg-blue-400/40" />

    <div className="relative z-10 flex min-h-[540px] flex-col justify-between">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-blue-300">
            ECU / TCU / File Service
          </p>
          <h3 className="mt-3 text-3xl font-black uppercase text-white">
            Calibration command matrix
          </h3>
        </div>
        <span className="border border-blue-400/40 bg-blue-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-100">
          Online
        </span>
      </div>

      <div className="mx-auto grid aspect-square w-full max-w-[340px] place-items-center border border-blue-300/40 bg-black/75 shadow-[inset_0_0_45px_rgba(59,130,246,0.22),0_0_60px_rgba(59,130,246,0.25)]">
        <div className="relative grid h-[76%] w-[76%] place-items-center border border-slate-500 bg-slate-950">
          <div className="absolute inset-5 border border-blue-400/30" />
          <div className="absolute inset-x-8 top-8 h-px bg-blue-400/50" />
          <div className="absolute inset-x-8 bottom-8 h-px bg-blue-400/50" />
          <img
            src="/brand/gmtch-isotipo.png"
            alt="GMTCH"
            className="h-28 w-28 object-contain opacity-90"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <span className="absolute bottom-5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-200">
            Control unit
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          ["ECU map", "READY"],
          ["TCU logic", "SYNC"],
          ["DTC scan", "PASS"],
          ["File queue", "ACTIVE"],
          ["Telemetry", "OK"],
          ["Checksum", "VALID"],
        ].map(([label, value], index) => (
          <div key={label} className="border border-slate-700 bg-black/60 p-3">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <span>{label}</span>
              <span className="text-blue-300">{value}</span>
            </div>
            <div className="mt-3 h-1 overflow-hidden bg-slate-800">
              <div className="hud-bar h-full bg-blue-400" style={{ width: `${64 + index * 5}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const VehicleCard = ({ item }) => (
  <article className="group relative min-h-[230px] overflow-hidden border border-slate-700 bg-white/[0.035] p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-[0_0_44px_rgba(37,99,235,0.24)]">
    <div className="circuit-grid absolute inset-0 opacity-40" />
    <div className="relative z-10 flex h-full flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="border border-blue-400/40 bg-blue-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">
          {item[0]}
        </span>
        <span className="h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_18px_rgba(96,165,250,1)]" />
      </div>
      <VehicleSketch type={item[2]} />
      <p className="text-sm font-semibold leading-6 text-slate-300">{item[1]}</p>
    </div>
  </article>
);

const ServiceGroup = ({ group }) => (
  <article className="group relative overflow-hidden border border-slate-700 bg-white/[0.035] p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-blue-400 hover:bg-blue-950/25 hover:shadow-[0_0_45px_rgba(37,99,235,0.18)]">
    <div className="circuit-grid absolute inset-0 opacity-35" />
    <div className="relative z-10">
      <div className="flex items-center justify-between">
        <span className="grid h-12 w-12 place-items-center border border-blue-400/40 bg-blue-400/10 text-sm font-black uppercase text-blue-200">
          {group.code}
        </span>
        <span className="h-2 w-20 bg-blue-400/70 shadow-[0_0_18px_rgba(59,130,246,0.65)]" />
      </div>
      <h3 className="mt-6 text-xl font-black uppercase text-white">{group.title}</h3>
      <div className="mt-5 grid gap-2">
        {group.items.map((item) => (
          <div key={item} className="border border-slate-800 bg-black/45 px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-200">
            <span className="mr-2 text-blue-300">/</span>
            {item}
          </div>
        ))}
      </div>
    </div>
  </article>
);

const TechnicalVisual = () => (
  <div className="relative overflow-hidden border border-blue-400/25 bg-black/60 p-5 backdrop-blur-xl">
    <div className="circuit-grid absolute inset-0 opacity-50" />
    <div className="relative z-10">
      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">
          ECU module / live data
        </p>
        <span className="border border-blue-400/40 px-3 py-1 text-[10px] font-black uppercase text-blue-200">
          Traceable
        </span>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[0.9fr_1.1fr]">
        <div className="grid min-h-[250px] place-items-center border border-slate-700 bg-slate-950">
          <div className="relative h-44 w-44 border border-blue-400/40 bg-black shadow-[inset_0_0_45px_rgba(37,99,235,0.25)]">
            <div className="absolute inset-5 border border-slate-600" />
            <div className="absolute left-1/2 top-0 h-full w-px bg-blue-400/35" />
            <div className="absolute left-0 top-1/2 h-px w-full bg-blue-400/35" />
            <div className="absolute inset-0 grid place-items-center text-3xl font-black uppercase text-blue-200">
              ECU
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {[
            ["Torque request", 86],
            ["Boost target", 72],
            ["TCU strategy", 64],
            ["DTC review", 91],
            ["Checksum", 100],
          ].map(([label, value]) => (
            <div key={label} className="border border-slate-700 bg-slate-950/80 p-3">
              <div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                <span>{label}</span>
                <span className="text-blue-300">{value}%</span>
              </div>
              <div className="h-2 bg-slate-800">
                <div className="hud-bar h-full bg-blue-400" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const OsMockup = () => (
  <div className="border border-blue-400/25 bg-black/60 p-5 backdrop-blur-xl">
    <div className="flex items-center justify-between border-b border-white/10 pb-4">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-300">
        GMTCH Tune OS
      </p>
      <span className="border border-blue-400/40 px-3 py-1 text-[10px] font-black uppercase text-blue-200">
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
        ["#2042", "POSTVENTA", "DTC", "ALERTA"],
        ["#2043", "MOD LISTO", "ECU", "OK"],
        ["#2044", "PAGO PENDIENTE", "CAJA", "REVISION"],
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

const ProcessTimeline = () => (
  <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-5">
    {PROCESS_STEPS.map(([number, title, text]) => (
      <article key={number} className="relative border border-slate-700 bg-white/[0.035] p-5 transition hover:border-blue-400 hover:shadow-[0_0_35px_rgba(37,99,235,0.16)]">
        <p className="text-4xl font-black text-blue-400">{number}</p>
        <h3 className="mt-5 text-sm font-black uppercase text-white">{title}</h3>
        <p className="mt-3 text-xs font-semibold leading-6 text-slate-300">{text}</p>
      </article>
    ))}
  </div>
);

const ContactForm = () => {
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    vehiculo: "",
    servicio: "Reprogramacion ECU/TCU",
    mensaje: "",
  });

  const whatsappHref = useMemo(() => {
    const text = [
      "Hola GMTCH Tune, quiero cotizar un servicio.",
      `Nombre: ${form.nombre || "No indicado"}`,
      `Telefono: ${form.telefono || "No indicado"}`,
      `Vehiculo: ${form.vehiculo || "No indicado"}`,
      `Servicio requerido: ${form.servicio}`,
      `Mensaje: ${form.mensaje || "No indicado"}`,
    ].join("\n");

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
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
        <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          Nombre
          <input
            className="mt-2 w-full border border-slate-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-400"
            value={form.nombre}
            onChange={(event) => update("nombre", event.target.value)}
          />
        </label>
        <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          Telefono
          <input
            className="mt-2 w-full border border-slate-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-400"
            value={form.telefono}
            onChange={(event) => update("telefono", event.target.value)}
          />
        </label>
        <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 md:col-span-2">
          Vehiculo
          <input
            className="mt-2 w-full border border-slate-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-400"
            value={form.vehiculo}
            onChange={(event) => update("vehiculo", event.target.value)}
          />
        </label>
        <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 md:col-span-2">
          Servicio requerido
          <select
            className="mt-2 w-full border border-slate-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-400"
            value={form.servicio}
            onChange={(event) => update("servicio", event.target.value)}
          >
            {[
              "Reprogramacion ECU/TCU",
              "Stage 1",
              "Stage 2",
              "Stage 3 / proyecto especial",
              "Diagnostico profesional",
              "File Service",
              "Soporte a taller",
              "Flota / proyecto tecnico",
            ].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 md:col-span-2">
          Mensaje
          <textarea
            className="mt-2 min-h-[130px] w-full border border-slate-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-400"
            value={form.mensaje}
            onChange={(event) => update("mensaje", event.target.value)}
          />
        </label>
      </div>
      <button
        type="submit"
        className="mt-4 w-full border border-blue-300 bg-blue-500 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-white shadow-[0_0_32px_rgba(59,130,246,0.34)] transition hover:bg-white hover:text-black"
      >
        Abrir WhatsApp con mensaje
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
        @keyframes gmtchPulse {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        .circuit-grid {
          background-image:
            linear-gradient(rgba(59,130,246,0.11) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.11) 1px, transparent 1px);
          background-size: 34px 34px;
          mask-image: radial-gradient(circle at center, black, transparent 78%);
        }
        .hud-bar {
          position: relative;
          overflow: hidden;
        }
        .hud-bar::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
          animation: gmtchFlow 2.4s linear infinite;
        }
        .metal-text {
          background: linear-gradient(135deg, #ffffff 0%, #94a3b8 34%, #f8fafc 52%, #64748b 100%);
          -webkit-background-clip: text;
          color: transparent;
        }
        .blue-aura {
          animation: gmtchPulse 4.8s ease-in-out infinite;
        }
      `}</style>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <a href="#inicio" className="flex items-center gap-3">
            <LogoGMTCH className="h-10 w-auto max-w-[180px]" />
          </a>
          <nav className="hidden items-center gap-6 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 lg:flex">
            {NAV_ITEMS.map(([href, label]) => (
              <a key={href} href={href} className="hover:text-blue-300">
                {label}
              </a>
            ))}
          </nav>
          <div className="hidden sm:block">
            <ActionButton to="/login" variant="secondary">
              Acceso plataforma
            </ActionButton>
          </div>
        </div>
      </header>

      <main>
        <section id="inicio" className="relative overflow-hidden px-5 py-20 md:py-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.24),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(148,163,184,0.17),transparent_28%),linear-gradient(135deg,#020617,#000000_48%,#0f172a)]" />
          <div className="circuit-grid absolute inset-0 opacity-65" />
          <div className="blue-aura absolute right-[8%] top-[14%] h-72 w-72 rounded-full border border-blue-400/25 bg-blue-500/10 blur-2xl" />
          <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_0.78fr]">
            <div>
              <div className="mb-8 max-w-xl">
                <LogoGMTCH className="h-20 w-auto max-w-[370px] md:h-24" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-blue-300">
                La Florida, Santiago, Chile / {"Metro Vicente Vald\u00e9s"}
              </p>
              <h1 className="metal-text mt-5 text-5xl font-black uppercase leading-[0.94] md:text-7xl xl:text-8xl">
                Ingenieria automotriz avanzada
              </h1>
              <p className="mt-5 text-xl font-black uppercase tracking-[0.16em] text-blue-200">
                ECU {"\u2022"} TCU {"\u2022"} File Service {"\u2022"} Diagnostico
              </p>
              <p className="mt-6 max-w-3xl text-base font-semibold leading-8 text-slate-300 md:text-lg">
                Soluciones tecnicas para vehiculos livianos, pesados, maquinaria,
                flotas y proyectos especiales. Reprogramacion ECU Chile,
                reprogramacion TCU, file service Chile, diagnostico automotriz,
                calibracion automotriz y soporte a talleres desde La Florida
                Santiago, referencia {"Metro Vicente Vald\u00e9s"}.
              </p>
              <div className="mt-9 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ActionButton href={WHATSAPP_URL}>Cotiza tu servicio hoy</ActionButton>
                <ActionButton href={WHATSAPP_URL} variant="secondary">Hablar por WhatsApp</ActionButton>
                <ActionButton to="/portal/login" variant="secondary">Portal File Service</ActionButton>
                <ActionButton href="#servicios" variant="secondary">Ver servicios</ActionButton>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ["ECU", "Calibracion"],
                  ["TCU", "Transmision"],
                  ["DTC", "Diagnostico"],
                  ["OS", "Trazabilidad"],
                ].map(([label, value]) => (
                  <div key={label} className="border border-slate-700 bg-white/[0.035] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
                    <p className="mt-2 text-sm font-black uppercase text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <HudPanel />
          </div>
          <div className="relative mx-auto max-w-7xl">
            <FlyerVehicleStrip />
          </div>
        </section>

        <section id="vehiculos" className="border-y border-white/10 bg-slate-950/80 px-5 py-20">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Trabajamos con todo tipo de vehiculos"
              title="Autos, camionetas, camiones, maquinaria, acuaticos y flotas"
              text="Una presencia tecnica amplia para clientes finales, talleres, flotas y proyectos especiales. Cada unidad se evalua segun objetivo, estado, normativa aplicable y uso autorizado."
            />
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {VEHICLE_CATEGORIES.map((item) => (
                <VehicleCard key={item[0]} item={item} />
              ))}
            </div>
          </div>
        </section>

        <section id="servicios" className="px-5 py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Servicios GMTCH Tune"
              title="Performance, diagnostico, soluciones tecnicas y File Service"
              text="Servicios sujetos a evaluacion tecnica, uso autorizado, normativa aplicable y/o proyectos de competicion donde corresponda. Trabajamos con proceso, criterio tecnico y respaldo."
            />
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {SERVICE_GROUPS.map((group) => (
                <ServiceGroup key={group.title} group={group} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(0,0,0,1))] px-5 py-24">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <SectionHeader
                eyebrow="Por que elegir GMTCH Tune"
                title="Confianza, trazabilidad y soporte tecnico real"
                text="GMTCH Tune combina ingenieria, calibracion profesional, plataforma propia, control de trabajos y comunicacion ordenada. No improvisamos: cada trabajo debe tener contexto, evidencia y responsable."
              />
              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {WHY_ITEMS.map((item) => (
                  <div key={item} className="border border-slate-700 bg-white/[0.035] p-5 text-xs font-black uppercase tracking-[0.08em] text-slate-200">
                    <span className="mr-2 text-blue-300">/</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <TechnicalVisual />
          </div>
        </section>

        <section id="tune-os" className="border-y border-white/10 bg-slate-950/80 px-5 py-24">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <SectionHeader
              eyebrow="GMTCH Tune OS"
              title="Control, trazabilidad y respaldo en cada trabajo"
              text="GMTCH Tune trabaja con sistema propio para controlar ordenes, historial tecnico, File Service interno, postventa tecnica, bitacora operativa, notificaciones, responsables, finanzas/control interno y estadisticas internas de operacion."
            />
            <div>
              <OsMockup />
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {OS_ITEMS.map((item) => (
                  <div key={item} className="border border-slate-700 bg-black/50 px-4 py-3 text-xs font-black uppercase text-slate-200">
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
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_0.85fr]">
              <SectionHeader
                eyebrow="File Service para talleres"
                title="Portal exclusivo, revision tecnica y descarga protegida"
                text="Carga de archivos, revision tecnica, MOD listo, correcciones ordenadas, requerimiento de nueva lectura si aplica, descarga protegida, historial y auditoria para ordenar el trabajo entre talleres, masters y GMTCH."
              />
              <div className="grid content-end gap-3 sm:grid-cols-2">
                <ActionButton to="/portal/login">Entrar al Portal File Service</ActionButton>
                <ActionButton href={WHATSAPP_URL} variant="secondary">Consultar por WhatsApp</ActionButton>
              </div>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {FILE_SERVICE_ITEMS.map((item, index) => (
                <div key={item} className="relative overflow-hidden border border-slate-700 bg-white/[0.035] p-6 backdrop-blur-xl transition hover:border-blue-400 hover:shadow-[0_0_35px_rgba(37,99,235,0.16)]">
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full border border-blue-400/20" />
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-blue-300">
                    FS-0{index + 1}
                  </p>
                  <h3 className="mt-5 text-base font-black uppercase text-white">{item}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-slate-950/80 px-5 py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Proceso de trabajo"
              title="Cinco etapas para operar con criterio tecnico"
              text="Del diagnostico a la entrega, cada trabajo se gestiona con informacion clara, evaluacion, calibracion o File Service, validacion y soporte postventa."
            />
            <ProcessTimeline />
          </div>
        </section>

        <section id="contacto" className="relative overflow-hidden border-y border-white/10 px-5 py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(37,99,235,0.20),transparent_36%)]" />
          <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <SectionHeader
                eyebrow="Contacto GMTCH Tune"
                title="Cotiza tu servicio con informacion clara"
                text={"Atencion por agenda para clientes finales, talleres y flotas desde La Florida, Santiago, con referencia Metro Vicente Vald\u00e9s."}
              />
              <div className="mt-8 space-y-3 text-sm font-bold text-slate-300">
                <p>Ubicacion: La Florida, Santiago, Chile</p>
                <p>Referencia: {"Metro Vicente Vald\u00e9s"}</p>
                <p>
                  WhatsApp: <a className="text-blue-300" href={WHATSAPP_URL} target="_blank" rel="noreferrer">{WHATSAPP_DISPLAY}</a>
                </p>
                <p>
                  Instagram: <a className="text-blue-300" href={INSTAGRAM_URL} target="_blank" rel="noreferrer">@gmtchtune</a>
                </p>
                <p>Web: gmtchtune.com</p>
                <p>Atencion por agenda</p>
              </div>
            </div>
            <ContactForm />
          </div>
        </section>

        <section className="px-5 py-24">
          <div className="mx-auto max-w-7xl border border-blue-400/25 bg-white/[0.035] p-7 backdrop-blur-xl md:p-10">
            <h2 className="max-w-5xl text-3xl font-black uppercase leading-tight text-white md:text-5xl">
              Eleva tu operacion automotriz con ingenieria, trazabilidad y soporte tecnico real.
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ActionButton href={WHATSAPP_URL}>WhatsApp</ActionButton>
              <ActionButton href={INSTAGRAM_URL} variant="secondary">Instagram</ActionButton>
              <ActionButton to="/portal/login" variant="secondary">Portal File Service</ActionButton>
              <ActionButton to="/login" variant="secondary">Acceso plataforma</ActionButton>
            </div>
          </div>
        </section>
      </main>

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-50 border border-blue-300 bg-blue-500 px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_0_35px_rgba(59,130,246,0.45)] transition hover:bg-white hover:text-black"
      >
        WhatsApp
      </a>

      <footer className="border-t border-white/10 px-5 py-8 text-center text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
        GMTCH Tune / La Florida, Santiago / ECU / TCU / File Service / Diagnostico / gmtchtune.com
      </footer>
    </div>
  );
}

export default LandingPage;
