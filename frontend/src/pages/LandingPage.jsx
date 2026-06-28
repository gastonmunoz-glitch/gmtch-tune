import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const WHATSAPP_NUMBER = "56962267642";
const WHATSAPP_DISPLAY = "+56 9 6226 7642";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
const INSTAGRAM_URL = "https://instagram.com/gmtchtune";

const servicios = [
  ["ECU", "Reprogramacion ECU y TCU", "Calibracion automotriz para proyectos tecnicos, uso autorizado y competicion donde corresponda."],
  ["S1", "Stage 1", "Mejora sobre configuracion original, enfocada en respuesta, torque y eficiencia segun evaluacion tecnica."],
  ["S2", "Stage 2", "Calibracion para vehiculos con mejoras de hardware, validacion previa y control del conjunto."],
  ["S3", "Stage 3 / proyectos especiales", "Desarrollo avanzado para proyectos de alto nivel con diagnostico, planificacion y trazabilidad."],
  ["DTC", "Diagnostico profesional", "Scanner, revision DTC, pruebas, sintomas y evidencia para decisiones tecnicas con respaldo."],
  ["FILE", "File Service para talleres", "Carga de archivos, revision tecnica, correcciones, nueva lectura si aplica y descarga protegida."],
  ["SHOP", "Soporte tecnico a talleres", "Acompanamiento para lectura, escritura, validacion, post escritura y continuidad tecnica."],
  ["FLEET", "Flotas y proyectos tecnicos", "Control por unidad, historial, soporte operativo y seguimiento para clientes finales, talleres y flotas."],
];

const soluciones = [
  "DPF / FAP",
  "EGR",
  "SCR / AdBlue / DEF",
  "NOx",
  "Lambda / O2",
  "TVA",
  "DTC Off",
  "IMMO",
  "Vmax",
  "Pops & Bangs",
  "Launch Control",
  "Hardcut",
];

const vehiculos = [
  ["AUTO", "Autos"],
  ["PICKUP", "Camionetas"],
  ["SUV", "SUV"],
  ["TRUCK", "Camiones"],
  ["MACH", "Maquinaria"],
  ["AGRO", "Agricolas"],
  ["BOAT", "Lanchas"],
  ["JET", "Motos de agua"],
];

const whyChoose = [
  "Ingenieria y calibracion profesional",
  "Plataforma propia GMTCH Tune OS",
  "Trazabilidad de trabajos y archivos",
  "Diagnostico avanzado",
  "Soporte postventa",
  "Clientes finales, talleres y flotas",
  "Control interno de ordenes, responsables y archivos",
  "Experiencia en ECU, TCU y File Service",
];

const osItems = [
  "Ordenes de trabajo",
  "Historial tecnico",
  "File Service",
  "Postventa tecnica",
  "Trazabilidad",
  "Notificaciones",
  "Control de estados",
  "Portal para masters/talleres",
];

const fileServiceItems = [
  "Portal para talleres",
  "Carga de archivos",
  "Revision tecnica",
  "Correcciones",
  "Nueva lectura si aplica",
  "Descarga protegida",
  "Historial",
  "Auditoria",
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
  const classes =
    variant === "primary"
      ? "group relative overflow-hidden border border-blue-300 bg-blue-500 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.16em] text-white shadow-[0_0_38px_rgba(59,130,246,0.38)] transition hover:bg-white hover:text-black"
      : "group relative overflow-hidden border border-slate-500 bg-white/5 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-100 backdrop-blur transition hover:border-blue-300 hover:bg-blue-500/10 hover:text-blue-100";

  const content = (
    <>
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-y-0 left-0 w-0 bg-white/20 transition-all duration-300 group-hover:w-full" />
    </>
  );

  return to ? (
    <Link to={to} className={classes}>
      {content}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer" className={classes}>
      {content}
    </a>
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

const HudPanel = () => (
  <div className="relative min-h-[560px] overflow-hidden border border-blue-400/35 bg-slate-950/75 p-5 shadow-[0_0_120px_rgba(37,99,235,0.26)] backdrop-blur-xl">
    <div className="circuit-grid absolute inset-0" />
    <div className="absolute left-8 top-8 h-24 w-24 border border-blue-300/30 bg-blue-500/10" />
    <div className="absolute right-10 top-24 h-20 w-36 border border-slate-500/40 bg-black/40" />
    <div className="absolute bottom-16 left-12 h-px w-3/4 bg-blue-400/40" />

    <div className="relative z-10 flex min-h-[520px] flex-col justify-between">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-blue-300">
            ECU / TCU Diagnostic HUD
          </p>
          <h3 className="mt-3 text-3xl font-black uppercase text-white">
            Calibration Control Matrix
          </h3>
        </div>
        <span className="border border-green-400/40 bg-green-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-green-200">
          Online
        </span>
      </div>

      <div className="mx-auto grid aspect-square w-full max-w-[330px] place-items-center border border-blue-300/40 bg-black/75 shadow-[inset_0_0_45px_rgba(59,130,246,0.22),0_0_60px_rgba(59,130,246,0.25)]">
        <div className="relative grid h-[74%] w-[74%] place-items-center border border-slate-500 bg-slate-950">
          <img
            src="/brand/gmtch-isotipo.png"
            alt="GMTCH"
            className="h-28 w-28 object-contain opacity-90"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <span className="absolute bottom-5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-200">
            Control Unit
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          ["ECU", "READY"],
          ["TCU", "MAP"],
          ["DTC", "SCAN"],
          ["FILE", "QUEUE"],
          ["Telemetry", "OK"],
          ["Checksum", "PASS"],
        ].map(([label, value], index) => (
          <div key={label} className="border border-slate-700 bg-black/60 p-3">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <span>{label}</span>
              <span className="text-blue-300">{value}</span>
            </div>
            <div className="mt-3 h-1 overflow-hidden bg-slate-800">
              <div className="hud-bar h-full bg-blue-400" style={{ width: `${66 + index * 5}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const VehicleCard = ({ item }) => (
  <div className="group relative min-h-[150px] overflow-hidden border border-slate-700 bg-white/[0.035] p-5 transition hover:-translate-y-1 hover:border-blue-400 hover:shadow-[0_0_38px_rgba(37,99,235,0.2)]">
    <div className="circuit-grid absolute inset-0 opacity-40" />
    <div className="relative z-10 flex h-full flex-col justify-between">
      <span className="w-fit border border-blue-400/40 bg-blue-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">
        {item[0]}
      </span>
      <div>
        <div className="mb-3 h-2 w-20 bg-blue-400/70 shadow-[0_0_18px_rgba(59,130,246,0.65)]" />
        <h3 className="text-xl font-black uppercase text-white">{item[1]}</h3>
      </div>
    </div>
  </div>
);

const ServiceCard = ({ item }) => (
  <article className="group border border-slate-700 bg-white/[0.035] p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-blue-400 hover:bg-blue-950/25 hover:shadow-[0_0_45px_rgba(37,99,235,0.18)]">
    <div className="flex items-center justify-between gap-3">
      <span className="grid h-12 w-12 place-items-center border border-blue-400/40 bg-blue-400/10 text-sm font-black uppercase text-blue-200">
        {item[0]}
      </span>
      <span className="h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_18px_rgba(96,165,250,1)]" />
    </div>
    <h3 className="mt-6 text-lg font-black uppercase text-white">{item[1]}</h3>
    <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">{item[2]}</p>
  </article>
);

const OsMockup = () => (
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

const ContactForm = () => {
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    vehiculo: "",
    servicio: "Reprogramacion ECU/TCU",
    mensaje: "",
  });

  const whatsappHref = useMemo(() => {
    const texto = [
      "Hola GMTCH Tune, quiero cotizar un servicio.",
      `Nombre: ${form.nombre || "No indicado"}`,
      `Telefono: ${form.telefono || "No indicado"}`,
      `Vehiculo: ${form.vehiculo || "No indicado"}`,
      `Servicio requerido: ${form.servicio}`,
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
          className="border border-slate-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-400 md:col-span-2"
          placeholder="Vehiculo"
          value={form.vehiculo}
          onChange={(event) => update("vehiculo", event.target.value)}
        />
        <select
          className="border border-slate-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-400 md:col-span-2"
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
        <textarea
          className="min-h-[130px] border border-slate-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-400 md:col-span-2"
          placeholder="Mensaje"
          value={form.mensaje}
          onChange={(event) => update("mensaje", event.target.value)}
        />
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
      `}</style>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <a href="#inicio" className="flex items-center gap-3">
            <LogoGMTCH className="h-10 w-auto max-w-[180px]" />
          </a>
          <nav className="hidden items-center gap-6 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 lg:flex">
            <a href="#servicios" className="hover:text-blue-300">Servicios</a>
            <a href="#vehiculos" className="hover:text-blue-300">Trabajamos con</a>
            <a href="#tune-os" className="hover:text-blue-300">Tune OS</a>
            <a href="#file-service" className="hover:text-blue-300">File Service</a>
            <a href="#contacto" className="hover:text-blue-300">Contacto</a>
          </nav>
          <div className="hidden sm:block">
            <ActionButton to="/login" variant="secondary">Acceso plataforma</ActionButton>
          </div>
        </div>
      </header>

      <main>
        <section id="inicio" className="relative overflow-hidden px-5 py-20 md:py-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.23),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(148,163,184,0.16),transparent_28%),linear-gradient(135deg,#020617,#000000_48%,#0f172a)]" />
          <div className="circuit-grid absolute inset-0 opacity-60" />
          <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_0.78fr]">
            <div>
              <div className="mb-8 max-w-xl">
                <LogoGMTCH className="h-20 w-auto max-w-[360px] md:h-24" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-blue-300">
                La Florida, Santiago, Chile / Metro Vicente Valdés
              </p>
              <h1 className="metal-text mt-5 text-5xl font-black uppercase leading-[0.94] md:text-7xl xl:text-8xl">
                Ingenieria automotriz avanzada
              </h1>
              <p className="mt-5 text-xl font-black uppercase tracking-[0.16em] text-blue-200">
                ECU • TCU • File Service • Diagnostico
              </p>
              <p className="mt-6 max-w-3xl text-base font-semibold leading-8 text-slate-300 md:text-lg">
                Soluciones tecnicas para vehiculos livianos, pesados, maquinaria y proyectos especiales.
                Reprogramacion ECU Chile, reprogramacion TCU, file service Chile, diagnostico automotriz,
                calibracion automotriz y soporte a talleres desde La Florida Santiago.
              </p>
              <div className="mt-9 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
                <ActionButton href={WHATSAPP_URL}>Cotiza tu servicio hoy</ActionButton>
                <ActionButton href={WHATSAPP_URL} variant="secondary">WhatsApp</ActionButton>
                <ActionButton to="/portal/login" variant="secondary">Portal File Service</ActionButton>
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
        </section>

        <section id="vehiculos" className="border-y border-white/10 bg-slate-950/80 px-5 py-20">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Trabajamos con"
              title="Livianos, pesados, maquinaria y unidades especiales"
              text="Cobertura tecnica para autos, camionetas, SUV, camiones, maquinaria, agricolas, lanchas y motos de agua, siempre sujeto a evaluacion tecnica y uso autorizado."
            />
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {vehiculos.map((item) => (
                <VehicleCard key={item[1]} item={item} />
              ))}
            </div>
          </div>
        </section>

        <section id="servicios" className="px-5 py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Servicios principales"
              title="ECU, TCU, diagnostico, File Service y soporte tecnico"
              text="Servicios sujetos a evaluacion tecnica, normativa aplicable, uso autorizado, proyectos tecnicos y competicion donde corresponda. Sin promesas imposibles: proceso, criterio y respaldo."
            />
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {servicios.map((item) => (
                <ServiceCard key={item[1]} item={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(0,0,0,1))] px-5 py-24">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <SectionHeader
              eyebrow="Soluciones tecnicas"
              title="Gestion de fallas, sistemas y funciones especiales"
              text="Trabajo profesional sobre diagnostico, calibracion y soluciones tecnicas. Cada solicitud se evalua segun estado del vehiculo, normativa aplicable y uso autorizado."
            />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {soluciones.map((item) => (
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

        <section className="px-5 py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Por que elegirnos"
              title="Tecnica, proceso y respaldo en una sola operacion"
              text="GMTCH Tune no trabaja a memoria. Cada servicio se apoya en control de procesos, revision tecnica interna, comunicacion clara e historial."
            />
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {whyChoose.map((item) => (
                <div key={item} className="border border-slate-700 bg-white/[0.035] p-5 text-xs font-black uppercase tracking-[0.08em] text-slate-200">
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
              title="No trabajamos a memoria: usamos sistema propio"
              text="GMTCH Tune OS controla ordenes de trabajo, historial tecnico, File Service, postventa tecnica, trazabilidad, notificaciones, control de estados y portal para masters/talleres."
            />
            <div>
              <OsMockup />
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {osItems.map((item) => (
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
                eyebrow="File Service"
                title="Portal para talleres con control, historial y descarga protegida"
                text="Carga de archivos, revision tecnica, correcciones, requerimiento de nueva lectura si aplica, descarga protegida, historial y auditoria para ordenar el trabajo entre talleres y GMTCH."
              />
              <div className="grid content-end gap-3 sm:grid-cols-2">
                <ActionButton to="/portal/login">Portal File Service</ActionButton>
                <ActionButton href={WHATSAPP_URL} variant="secondary">Consultar por WhatsApp</ActionButton>
              </div>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {fileServiceItems.map((item, index) => (
                <div key={item} className="relative overflow-hidden border border-slate-700 bg-white/[0.035] p-6 backdrop-blur-xl transition hover:border-blue-400">
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

        <section id="contacto" className="relative overflow-hidden border-y border-white/10 px-5 py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(37,99,235,0.20),transparent_36%)]" />
          <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <SectionHeader
                eyebrow="Contacto GMTCH Tune"
                title="Cotiza tu servicio con informacion clara"
              text="Atendemos clientes finales, talleres y flotas desde La Florida, Santiago, con referencia Metro Vicente Valdés."
              />
              <div className="mt-8 space-y-3 text-sm font-bold text-slate-300">
                <p>Ubicacion: La Florida, Santiago, Chile</p>
                <p>Referencia: Metro Vicente Valdés</p>
                <p>
                  WhatsApp: <a className="text-blue-300" href={WHATSAPP_URL} target="_blank" rel="noreferrer">{WHATSAPP_DISPLAY}</a>
                </p>
                <p>
                  Instagram: <a className="text-blue-300" href={INSTAGRAM_URL} target="_blank" rel="noreferrer">@gmtchtune</a>
                </p>
                <p>Web: gmtchtune.com</p>
              </div>
            </div>
            <ContactForm />
          </div>
        </section>

        <section className="px-5 py-24">
          <div className="mx-auto max-w-7xl border border-blue-400/25 bg-white/[0.035] p-7 backdrop-blur-xl md:p-10">
            <h2 className="max-w-5xl text-3xl font-black uppercase leading-tight text-white md:text-5xl">
              Ingenieria, trazabilidad y soporte tecnico para trabajo automotriz real.
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

      <footer className="border-t border-white/10 px-5 py-8 text-center text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
        GMTCH Tune / La Florida, Santiago / ECU / TCU / File Service / Diagnostico
      </footer>
    </div>
  );
}

export default LandingPage;
