import { useState } from "react";
import { api } from "../api.js";
import { useSession } from "../session.jsx";
import { Link, useRouter } from "../router.jsx";

export default function Access({ mode }) {
  const isRegister = mode === "register";
  const { setUser } = useSession();
  const { navigate } = useRouter();
  const back = new URLSearchParams(window.location.search).get("volver") || "/mis-cursos";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    audience: "patient",
    profession: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = isRegister
        ? await api.register(form)
        : await api.login(form.email, form.password);
      setUser(data.user);
      navigate(back);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <div className="wrap auth">
      <div className="auth-quote">
        «La herida que se revisa todos los días casi nunca llega al quirófano. La que se descubre
        cuando ya huele, casi siempre.»
        <span>Dr. Rogelio Sánchez — Medicina Interna</span>
      </div>

      <div>
        <span className="eyebrow">{isRegister ? "Nueva cuenta" : "Ya tengo cuenta"}</span>
        <h1 style={{ fontSize: 40, margin: "12px 0 26px" }}>
          {isRegister ? "Empieza tu formación" : "Entra a tus cursos"}
        </h1>

        <form onSubmit={submit}>
          {isRegister && (
            <>
              <div className="segmented">
                <button
                  type="button"
                  className={form.audience === "patient" ? "is-on" : ""}
                  onClick={() => setForm((f) => ({ ...f, audience: "patient" }))}
                >
                  Soy paciente o familiar
                </button>
                <button
                  type="button"
                  className={form.audience === "doctor" ? "is-on" : ""}
                  onClick={() => setForm((f) => ({ ...f, audience: "doctor" }))}
                >
                  Soy profesional de la salud
                </button>
              </div>

              <div className="field">
                <label htmlFor="name">Nombre completo</label>
                <input id="name" value={form.name} onChange={set("name")} autoComplete="name" />
              </div>

              {form.audience === "doctor" && (
                <div className="field">
                  <label htmlFor="profession">Especialidad o cédula</label>
                  <input
                    id="profession"
                    value={form.profession}
                    onChange={set("profession")}
                    placeholder="Medicina interna, cédula 1234567"
                  />
                </div>
              )}
            </>
          )}

          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={set("email")}
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={set("password")}
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder={isRegister ? "Mínimo 8 caracteres" : ""}
            />
          </div>

          {error && <div className="notice">{error}</div>}

          <button className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: 8 }}>
            {busy ? "Un momento…" : isRegister ? "Crear mi cuenta" : "Entrar"}
          </button>
        </form>

        <p style={{ marginTop: 22, fontSize: 14, color: "var(--ink-soft)" }}>
          {isRegister ? "¿Ya tienes cuenta? " : "¿Es tu primera vez? "}
          <Link
            to={isRegister ? "/entrar" : "/registro"}
            style={{ fontWeight: 700, borderBottom: "1.5px solid var(--clay)" }}
          >
            {isRegister ? "Entra aquí" : "Crea tu cuenta"}
          </Link>
        </p>
      </div>
    </div>
  );
}
