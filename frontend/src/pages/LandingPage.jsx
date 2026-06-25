import { useState } from "react";
import { Link } from "react-router-dom";

const WHATSAPP_URL = "https://wa.me/56943921122";
const INSTAGRAM_URL = "https://instagram.com/gmtchtune";

const servicios = [
  {
    title: "Reprogramacion ECU/TCU",
    text: "Calibracion tecnica para proyectos autorizados, uso profesional y competicion donde corresponda.",
    code: "MAP-CAL",
  },
  {
    title: "Diagnostico profesional",
    text: "Lectura, analisis y criterio tecnico sobre fallas, DTC, comportamiento y evidencia del vehiculo.",
    code: "DTC-SCAN",
  },
  {
    title: "File Service para talleres",
    text: "Recepcion de archivos, revision tecnica, MOD, correcciones y trazabilidad segun normativa aplicable.",
    code: "FS-PORTAL",
  },
  {
    title: "Soporte tecnico",
    text: "Acompanamiento operativo para lectura, escritura, validacion y continuidad del trabajo.",
    code: "SUPPORT",
  },
  {
    title: "Flotas y proyectos",
    text: "Gestion tecnica ordenada para talleres, flotas y proyectos de alto nivel con historial y control.",
    code: "FLEET",
  },
  {
    title: "Trazabilidad operativa",
    text: "Ordenes, responsables, estados, evidencia y notificaciones para que el proceso no dependa de memoria.",
    code: "TRACE",
  },
];

const osItems = [
  "Recepcion de vehiculos",
  "Ordenes de trabajo",
  "Estados operativos",
  "Archivos ECU",
  "Notificaciones",
  "Portal Masters",
  "Control interno",
  "Trazabilidad",
];

const fileSteps = [
  "Carga de archivo",
  "Revision tecnica",
  "Historial del caso",
  "Correcciones ordenadas",
  "Requerimiento de nueva lectura",
  "Descarga protegida",
];

const confianza = [
  "Operacion ordenada",
  "Soporte a talleres",
  "Control de procesos",
  "Historial tecnico",
  "Comunicacion clara",
  "Plataforma propia",
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

const CtaButton = ({ href, to, children, variant = "primary" }) => {
  const className =
    variant === "primary"
      ? "border border-blue-400 bg-blue-500 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_0_30px_rgba(59,130,246,0.35)] transition hover:bg-white hover:text-black"
      : "border border-slate-500 bg-white/5 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-100 backdrop-blur transition hover:border-blue-400 hover:text-blue-200";

  if (to) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
};

const TelemetryCard = ({ label, value, status = "OK" }) => (
  <div className="border border-blue-400/25 bg-white/[0.04] p-4 backdrop-blur-xl">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <span className="h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_18px_rgba(96,165,250,1)]" />
    </div>
    <p className="mt-3 text-2xl font-black uppercase text-white">{value}</p>
    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">
      {status}
    </p>
  </div>
);

const TechnicalVisual = () => (
  <div className="relative min-h-[520px] overflow-hidden border border-blue-400/30 bg-slate-950/70 p-5 shadow-[0_0_120px_rgba(37,99,235,0.22)] backdrop-blur-xl">
    <div className="absolute inset-0 bg-[linear-gradient(rgba(96,165,250,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(96,165,250,0.08)_1px,transparent_1px)] bg-[size:34px_34px]" />
    <div className="absolute left-8 right-8 top-20 h-px bg-blue-400/50" />
    <div className="absolute bottom-28 left-12 right-16 h-px bg-blue-400/30" />
    <div className="absolute bottom-12 top-14 left-20 w-px bg-blue-400/40" />
    <div className="absolute bottom-20 top-32 right-24 w-px bg-blue-400/25" />
    <div className="absolute left-16 top-16 h-3 w-3 rounded-full bg-blue-300 shadow-[0_0_24px_rgba(96,165,250,1)]" />
    <div className="absolute right-24 top-20 h-3 w-3 rounded-full bg-cyan-200 shadow-[0_0_24px_rgba(103,232,249,1)]" />
    <div className="absolute bottom-28 left-20 h-3 w-3 rounded-full bg-blue-300 shadow-[0_0_24px_rgba(96,165,250,1)]" />

    <div className="relative z-10 flex h-full flex-col justify-between gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-blue-300">
            Technical Lab Interface
          </p>
          <h3 className="mt-3 text-2xl font-black uppercase text-white">
            ECU / TCU Calibration Core
          </h3>
        </div>
        <div className="border border-green-400/40 bg-green-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-green-200">
          System online
        </div>
      </div>

      <div className="mx-auto grid aspect-square w-full max-w-[300px] place-items-center border border-blue-300/40 bg-black/70 shadow-[inset_0_0_45px_rgba(59,130,246,0.22),0_0_60px_rgba(59,130,246,0.25)]">
        <div className="grid h-[72%] w-[72%] place-items-center border border-slate-500 bg-slate-950 shadow-[inset_0_0_30px_rgba(15,23,42,1)]">
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
        <TelemetryCard label="Protocol" value="CAN / BOOT" />
        <TelemetryCard label="State" value="Validated" status="Trace ready" />
        <TelemetryCard label="Map layer" value="CAL-02" status="Authorized" />
        <TelemetryCard label="Support" value="Live" status="Portal" />
      </div>
    </div>
  </div>
);

const ServiceCard = ({ item }) => (
  <article className="group border border-slate-700 bg-white/[0.035] p-6 backdrop-blur-xl transition hover:border-blue-400 hover:bg-blue-950/25 hover:shadow-[0_0_45px_rgba(37,99,235,0.16)]">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
        {item.code}
      </p>
      <span className="h-px flex-1 bg-blue-400/30" />
    </div>
    <h3 className="mt-5 text-lg font-black uppercase text-white">{item.title}</h3>
    <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">{item.text}</p>
  </article>
);

const ChipList = ({ items }) => (
  <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {items.map((item) => (
      <div
        key={item}
        className="border border-blue-400/20 bg-slate-950/70 px-4 py-4 text-xs font-black uppercase tracking-[0.08em] text-slate-100 backdrop-blur"
      >
        <span className="mr-2 text-blue-300">/</span>
        {item}
      </div>
    ))}
  </div>
);

function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500 selection:text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/web" className="flex items-center gap-3">
            <LogoGMTCH className="h-10 w-auto max-w-[180px]" />
          </Link>

          <nav className="hidden items-center gap-6 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 lg:flex">
            <a href="#servicios" className="hover:text-blue-300">
              Servicios
            </a>
            <a href="#tune-os" className="hover:text-blue-300">
              Tune OS
            </a>
            <a href="#file-service" className="hover:text-blue-300">
              File Service
            </a>
            <a href="#contacto" className="hover:text-blue-300">
              Contacto
            </a>
          </nav>

          <Link
            to="/login"
            className="border border-blue-400/60 bg-blue-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-blue-100 transition hover:bg-blue-500 hover:text-white"
          >
            Acceso plataforma
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(59,130,246,0.30),transparent_32%),radial-gradient(circle_at_80%_18%,rgba(14,165,233,0.18),transparent_28%),linear-gradient(135deg,#020617_0%,#000_42%,#07111f_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.045)_1px,transparent_1px)] bg-[size:52px_52px]" />
          <div className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl grid-cols-1 items-center gap-10 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <LogoGMTCH className="mb-8 h-auto w-full max-w-[360px] md:max-w-[470px]" />
              <div className="inline-flex border border-blue-400/40 bg-blue-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-blue-200">
                ECU / TCU / File Service / Diagnostics
              </div>

              <h1 className="mt-7 max-w-5xl text-4xl font-black uppercase leading-[0.95] text-white md:text-6xl xl:text-7xl">
                Ingenieria automotriz avanzada para ECU, TCU y File Service
              </h1>

              <p className="mt-7 max-w-3xl text-base font-semibold leading-8 text-slate-300 md:text-xl">
                Diagnostico, calibracion, soporte tecnico y gestion operativa para talleres,
                flotas y proyectos de alto nivel.
              </p>

              <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <CtaButton href={WHATSAPP_URL}>Contactar por WhatsApp</CtaButton>
                <CtaButton to="/login" variant="secondary">
                  Acceso plataforma
                </CtaButton>
                <CtaButton to="/portal/login" variant="secondary">
                  Portal File Service
                </CtaButton>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-6">
                <TelemetryCard label="Trace" value="100%" status="Operativo" />
                <TelemetryCard label="Portal" value="V1" status="Activo" />
                <TelemetryCard label="Control" value="OS" status="GMTCH" />
              </div>
            </div>

            <TechnicalVisual />
          </div>
        </section>

        <section id="servicios" className="relative overflow-hidden px-5 py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(37,99,235,0.16),transparent_28%)]" />
          <div className="relative mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Servicios principales"
              title="Electronica automotriz, datos y criterio tecnico"
              text="Trabajo profesional orientado a proyectos tecnicos, uso autorizado y competicion donde corresponda. Sin promesas vacias: proceso, evidencia y soporte."
            />
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {servicios.map((item) => (
                <ServiceCard key={item.title} item={item} />
              ))}
            </div>
          </div>
        </section>

        <section id="tune-os" className="border-y border-white/10 bg-slate-950/80 px-5 py-24">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <SectionHeader
              eyebrow="GMTCH Tune OS"
              title="Plataforma propia para operar trabajo real"
              text="No es solo una web. GMTCH Tune OS organiza la operacion interna: recepcion, ordenes, estados, responsables, archivos ECU, notificaciones y portal masters."
            />

            <div className="border border-blue-400/25 bg-black/60 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">
                  Operational Stack
                </p>
                <span className="text-[10px] font-black uppercase text-green-300">
                  Online
                </span>
              </div>
              <ChipList items={osItems} />
              <p className="mt-8 border-l-2 border-blue-400 pl-4 text-sm font-semibold leading-7 text-slate-300">
                La plataforma es la fuente oficial. Lo que no se registra, no se puede controlar.
              </p>
            </div>
          </div>
        </section>

        <section id="file-service" className="px-5 py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Portal File Service"
              title="Flujo tecnico con historial, correcciones y nueva lectura"
              text="Un proceso disenado para talleres y masters: carga de archivo, revision, trazabilidad, requerimientos tecnicos, MOD y descarga protegida."
            />

            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {fileSteps.map((step, index) => (
                <div
                  key={step}
                  className="relative overflow-hidden border border-slate-700 bg-white/[0.035] p-6 backdrop-blur-xl"
                >
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full border border-blue-400/20" />
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-blue-300">
                    FS-0{index + 1}
                  </p>
                  <h3 className="mt-5 text-lg font-black uppercase text-white">{step}</h3>
                  <p className="mt-4 text-sm font-semibold leading-7 text-slate-400">
                    Registro controlado para mantener continuidad tecnica sin perder contexto ni evidencia.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(0,0,0,1))] px-5 py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Confianza operacional"
              title="Seriedad tecnica, comunicacion clara y control de procesos"
              text="GMTCH trabaja con una logica simple: cada caso debe tener contexto, evidencia, responsable y cierre claro."
            />
            <ChipList items={confianza} />
          </div>
        </section>

        <section id="contacto" className="relative overflow-hidden px-5 py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(37,99,235,0.20),transparent_36%)]" />
          <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-8 border border-blue-400/25 bg-white/[0.035] p-7 backdrop-blur-xl md:p-10 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-blue-300">
                Siguiente nivel
              </p>
              <h2 className="mt-4 text-3xl font-black uppercase leading-tight text-white md:text-5xl">
                Eleva tu operacion automotriz con una plataforma tecnica disenada para trabajo real.
              </h2>
              <p className="mt-5 max-w-3xl text-sm font-semibold leading-7 text-slate-300 md:text-base">
                Atencion tecnica en La Florida, Santiago. Soporte para vehiculos, talleres, flotas y File Service.
              </p>
            </div>

            <div className="grid content-center gap-3">
              <CtaButton href={WHATSAPP_URL}>WhatsApp</CtaButton>
              <CtaButton href={INSTAGRAM_URL} variant="secondary">
                Instagram
              </CtaButton>
              <CtaButton to="/portal/login" variant="secondary">
                Portal File Service
              </CtaButton>
              <CtaButton to="/login" variant="secondary">
                Acceso plataforma
              </CtaButton>
              <div className="mt-4 border-t border-white/10 pt-4 text-xs font-bold uppercase leading-6 text-slate-400">
                <p>La Florida, Santiago</p>
                <p>Lunes a viernes 9:30 a 21:00</p>
                <p>Sabado 9:30 a 16:30</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 py-8 text-center text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
        GMTCH Tune / Ingenieria automotriz avanzada / Control tecnico y trazabilidad
      </footer>
    </div>
  );
}

export default LandingPage;
