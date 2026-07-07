import { useState } from "react";
import { Link } from "react-router-dom";
import { portalLogin } from "../services/portalApi";

const LogoPortal = () => {
  const [logoOk, setLogoOk] = useState(true);

  if (!logoOk) {
    return (
      <span className="text-3xl font-black uppercase text-white">
        GMTCH <span className="text-blue-500">Tune</span>
      </span>
    );
  }

  return (
    <img
      src="/brand/gmtch-logo.png"
      alt="GMTCH Tune"
      className="mx-auto h-20 w-auto max-w-[260px] object-contain"
      onError={() => setLogoOk(false)}
    />
  );
};

function PortalLoginPage() {
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMensaje("");

    if (!identificador.trim() || !password.trim()) {
      setError("Debes ingresar email o usuario y contraseña.");
      return;
    }

    let redirigiendo = false;

    try {
      setCargando(true);
      const data = await portalLogin(identificador.trim(), password);
      const portalToken = data?.portalToken || data?.token || data?.accessToken;

      if (!portalToken) {
        setError("Login correcto pero respuesta inválida. Contacta a GMTCH.");
        return;
      }

      localStorage.setItem("portalToken", portalToken);
      localStorage.setItem("portalUsuario", JSON.stringify(data.usuario || {}));
      localStorage.setItem("portalCuenta", JSON.stringify(data.cuenta || {}));

      redirigiendo = true;
      setMensaje("Ingreso correcto, cargando portal...");

      window.setTimeout(() => {
        window.location.assign("/portal");
      }, 250);
    } catch (err) {
      if (err.status === 401) {
        setError(
          "Credenciales inválidas. Usa el Email de acceso o Usuario de acceso del portal."
        );
      } else if (
        err.name === "TypeError" ||
        /failed to fetch|network|fetch/i.test(err.message || "")
      ) {
        setError("No se pudo conectar con el portal.");
      } else {
        setError(err.message || "No se pudo iniciar sesión en el portal.");
      }
    } finally {
      if (!redirigiendo) {
        setCargando(false);
      }
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-5 py-10 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden lg:block">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-400">
            Portal File Service
          </p>
          <h1 className="mt-5 text-5xl font-black uppercase leading-none">
            Talleres y masters autorizados
          </h1>
          <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-slate-300">
            Portal File Service para talleres y masters autorizados.
          </p>
          <div className="mt-8 border border-slate-700 bg-slate-950 p-5 text-sm font-bold leading-7 text-slate-300">
            WhatsApp puede ser canal de entrada, pero el portal es la fuente oficial del File Service.
          </div>
        </section>

        <section className="mx-auto w-full max-w-md border border-slate-700 bg-slate-950 p-6 shadow-[0_0_70px_rgba(37,99,235,0.18)]">
          <LogoPortal />

          <div className="mt-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-400">
              Acceso externo
            </p>
            <h2 className="mt-3 text-2xl font-black uppercase">
              Entrar al portal
            </h2>
          </div>

          {error && (
            <div className="mt-5 border border-red-500 bg-red-950/40 p-3 text-sm font-bold text-red-200">
              {error}
            </div>
          )}

          {mensaje && (
            <div className="mt-5 border border-green-500 bg-green-950/40 p-3 text-sm font-bold text-green-200">
              {mensaje}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-black uppercase text-slate-400">
                Email o usuario
              </span>
              <input
                type="text"
                value={identificador}
                onChange={(event) => setIdentificador(event.target.value)}
                placeholder="correo@taller.com o usuario"
                className="mt-2 w-full border border-slate-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500"
                autoComplete="username"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase text-slate-400">
                Contraseña
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full border border-slate-700 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500"
                autoComplete="current-password"
              />
            </label>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-blue-600 px-5 py-4 text-xs font-black uppercase text-white hover:bg-white hover:text-black disabled:opacity-50"
            >
              {cargando ? "Ingresando..." : "Entrar al portal"}
            </button>
          </form>

          <Link
            to="/web"
            className="mt-5 block text-center text-xs font-black uppercase text-slate-400 hover:text-blue-300"
          >
            Volver a web pública
          </Link>
        </section>
      </div>
    </main>
  );
}

export default PortalLoginPage;
