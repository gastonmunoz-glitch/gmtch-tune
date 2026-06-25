import { useState } from "react";
import { Link } from "react-router-dom";

const WHATSAPP_URL = "https://wa.me/56943921122";
const INSTAGRAM_URL = "https://instagram.com/gmtchtune";

const servicios = [
  "Reprogramación ECU / TCU",
  "Stage 1 / Stage 2 / Stage 3",
  "Diagnóstico profesional",
  "File Service para talleres",
  "Optimización de rendimiento",
  "Soporte técnico especializado",
];

const flujo = [
  "Recepción",
  "Diagnóstico",
  "Evidencia",
  "Programación / File Service",
  "Post escritura",
  "Entrega",
];

const fileService = [
  "Para talleres y masters",
  "Subida de archivos",
  "Revisión técnica",
  "MOD listo",
  "Correcciones ordenadas",
  "Portal externo próximamente",
];

const confianza = [
  "Control",
  "Trazabilidad",
  "Respaldo técnico",
  "Historial por vehículo",
  "Responsables por etapa",
];

const LogoGMTCH = ({ className = "h-16 w-auto" }) => {
  const [logoOk, setLogoOk] = useState(true);

  if (!logoOk) {
    return (
      <span className="text-2xl font-black uppercase text-white">
        GMTCH <span className="text-blue-500">Tune</span>
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

const SectionTitle = ({ eyebrow, title, text }) => (
  <div className="max-w-3xl">
    <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-400">
      {eyebrow}
    </p>
    <h2 className="mt-3 text-3xl font-black uppercase text-white md:text-4xl">
      {title}
    </h2>
    {text && <p className="mt-4 text-base leading-7 text-slate-300">{text}</p>}
  </div>
);

const FeatureGrid = ({ items }) => (
  <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    {items.map((item) => (
      <div
        key={item}
        className="border border-slate-700 bg-slate-950/80 p-5 shadow-[0_0_30px_rgba(37,99,235,0.08)]"
      >
        <p className="text-sm font-black uppercase text-white">{item}</p>
      </div>
    ))}
  </div>
);

function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link to="/web" className="flex items-center gap-3">
            <LogoGMTCH className="h-10 w-auto max-w-[170px]" />
          </Link>

          <nav className="hidden items-center gap-6 text-xs font-black uppercase text-slate-300 md:flex">
            <a href="#servicios" className="hover:text-blue-400">
              Servicios
            </a>
            <a href="#file-service" className="hover:text-blue-400">
              File Service
            </a>
            <a href="#contacto" className="hover:text-blue-400">
              Contacto
            </a>
          </nav>

          <Link
            to="/"
            className="border border-blue-500 bg-blue-600 px-4 py-2 text-xs font-black uppercase text-white hover:bg-white hover:text-black"
          >
            Acceso plataforma
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.28),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(0,0,0,1))]" />
          <div className="relative mx-auto grid min-h-[calc(100vh-74px)] max-w-7xl grid-cols-1 content-center gap-10 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col justify-center">
              <LogoGMTCH className="mb-8 h-auto w-full max-w-[320px] md:max-w-[420px]" />

              <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-400">
                Repros ECU & TCU
              </p>

              <h1 className="mt-4 text-5xl font-black uppercase leading-none text-white md:text-7xl">
                GMTCH Tune
              </h1>

              <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-slate-200 md:text-xl">
                Potencia, diagnóstico y File Service profesional para talleres y vehículos.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-blue-600 px-6 py-4 text-center text-xs font-black uppercase text-white hover:bg-white hover:text-black"
                >
                  WhatsApp
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-slate-500 px-6 py-4 text-center text-xs font-black uppercase text-white hover:border-blue-500 hover:text-blue-300"
                >
                  Instagram
                </a>
                <Link
                  to="/"
                  className="border border-white px-6 py-4 text-center text-xs font-black uppercase text-white hover:bg-white hover:text-black"
                >
                  Acceso plataforma
                </Link>
              </div>
            </div>

            <div className="flex items-center">
              <div className="w-full border border-slate-700 bg-black/50 p-6 shadow-[0_0_80px_rgba(37,99,235,0.2)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                  Sistema operativo técnico
                </p>
                <p className="mt-5 text-2xl font-black uppercase leading-tight text-white">
                  No vendemos software: vendemos control, trazabilidad y soluciones técnicas.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {["ECU", "TCU", "DTC", "MOD", "Scanner", "Historial"].map((item) => (
                    <div key={item} className="border border-slate-800 bg-slate-950 p-4">
                      <p className="text-sm font-black uppercase text-blue-300">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="servicios" className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle
            eyebrow="Servicios"
            title="Performance, diagnóstico y soporte técnico"
            text="Servicios pensados para vehículos particulares, talleres y operaciones que necesitan respaldo profesional."
          />
          <FeatureGrid items={servicios} />
        </section>

        <section className="border-y border-slate-800 bg-slate-950/70">
          <div className="mx-auto max-w-7xl px-5 py-20">
            <SectionTitle
              eyebrow="Cómo trabajamos"
              title="Proceso ordenado de inicio a entrega"
              text="Cada etapa debe dejar evidencia, responsable y continuidad operativa."
            />
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {flujo.map((item, index) => (
                <div key={item} className="border border-slate-700 bg-black p-5">
                  <p className="text-xs font-black uppercase text-blue-400">
                    Paso {index + 1}
                  </p>
                  <p className="mt-3 text-sm font-black uppercase text-white">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="file-service" className="mx-auto max-w-7xl px-5 py-20">
          <SectionTitle
            eyebrow="File Service"
            title="Para talleres y masters"
            text="Un flujo preparado para recibir archivos, revisar técnicamente, entregar MODs y ordenar correcciones."
          />
          <FeatureGrid items={fileService} />
        </section>

        <section className="border-y border-slate-800 bg-black">
          <div className="mx-auto max-w-7xl px-5 py-20">
            <SectionTitle
              eyebrow="Confianza"
              title="La plataforma es la fuente oficial"
              text="Lo que no se registra, no se puede controlar. GMTCH Tune OS ordena la evidencia, el historial y los responsables."
            />
            <FeatureGrid items={confianza} />
          </div>
        </section>

        <section id="contacto" className="mx-auto max-w-7xl px-5 py-20">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <SectionTitle
              eyebrow="Contacto"
              title="Hablemos de tu vehículo o taller"
              text="Atención técnica en La Florida, Santiago. Agenda, consulta o solicita File Service."
            />

            <div className="border border-slate-700 bg-slate-950 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-blue-500 bg-blue-600 p-5 text-sm font-black uppercase hover:bg-white hover:text-black"
                >
                  WhatsApp
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-slate-600 p-5 text-sm font-black uppercase hover:border-blue-500 hover:text-blue-300"
                >
                  Instagram @GmtchTune
                </a>
              </div>

              <div className="mt-6 space-y-3 text-sm font-bold text-slate-300">
                <p>La Florida, Santiago</p>
                <p>Lunes a viernes 9:30 a 21:00</p>
                <p>Sábado 9:30 a 16:30</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 px-5 py-8 text-center text-xs font-black uppercase text-slate-500">
        GMTCH Tune. Control, trazabilidad y soluciones técnicas.
      </footer>
    </div>
  );
}

export default LandingPage;
