import { useState, useEffect } from "react";
import PatientApp from "./PatientApp.jsx";
import DoctorApp from "./DoctorApp.jsx";

const C = {
  navy: "#152E44", navyMid: "#1E4568", gold: "#B8820A", goldLight: "#D4A534",
  ink: "#1A1714", muted: "#8C857C", ghost: "#C4BDB5",
  bg: "#F8F5F0", card: "#FFFFFF", muted2: "#F0EDE7",
  border: "rgba(21,46,68,0.10)", shadow: "0 6px 32px rgba(21,46,68,0.11)",
  emerald: "#1A5C40", scarlet: "#A02828",
};

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg};font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;}
  input,textarea,button,select{font-family:'DM Sans',sans-serif;}
  ::-webkit-scrollbar{width:3px;height:3px;}
  ::-webkit-scrollbar-thumb{background:${C.ghost};border-radius:2px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
  @keyframes slideIn{from{opacity:0;transform:translateX(-16px);}to{opacity:1;transform:translateX(0);}}
  .fade-up{animation:fadeUp 0.3s ease both;}
  button{cursor:pointer;}
  button:active{opacity:0.82;}
`;

// ── Verificar código contra servidor ─────────────────
async function verifyCode(code) {
  try {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessCode: code,
        system: "Responde solo ok.",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
      }),
    });
    return res.ok;
  } catch { return false; }
}

// ── Login Gate ────────────────────────────────────────
function LoginGate({ onPatient, onDoctor }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-login si hay código guardado
  useEffect(() => {
    const saved = localStorage.getItem("apex_code");
    if (saved) {
      const upper = saved.toUpperCase();
      if (upper.startsWith("DR-ROGELIO-")) { onDoctor(upper); }
      else { onPatient(upper); }
    }
  }, []);

  async function handleLogin() {
    const code = input.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError("");
    const ok = await verifyCode(code);
    if (ok) {
      localStorage.setItem("apex_code", code);
      if (code.startsWith("DR-ROGELIO-")) { onDoctor(code); }
      else { onPatient(code); }
    } else {
      setError("Código inválido o suscripción vencida. Contacta al Dr. Rogelio.");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <style>{GLOBAL_CSS}</style>
      {/* Hero */}
      <div style={{ background: `linear-gradient(160deg, #080F1A 0%, #152E44 50%, #1E4568 100%)`, padding: "72px 28px 48px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(184,130,10,0.08)" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
        <div style={{ position: "relative", textAlign: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: 22, background: `linear-gradient(135deg,${C.gold},${C.goldLight})`, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, boxShadow: `0 8px 32px rgba(184,130,10,0.4)` }}>⚕️</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color: "#FFF", fontWeight: 800, lineHeight: 1.2 }}>Dr. Rogelio Sánchez</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 6, letterSpacing: "0.12em", textTransform: "uppercase" }}>Internista · Nutriólogo · Diabetes</div>
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: "24px 22px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[
            { icon: "📊", t: "Control de glucosa y presión" },
            { icon: "💊", t: "Recordatorios de medicamentos" },
            { icon: "📹", t: "Videollamada con tu médico" },
            { icon: "🍽️", t: "Planes de dieta personalizados" },
            { icon: "💪", t: "Rutinas de ejercicio + videos" },
            { icon: "🤖", t: "Coach IA disponible 24/7" },
          ].map((f, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 14, padding: "12px 14px", boxShadow: "0 2px 12px rgba(21,46,68,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</span>
              <span style={{ fontSize: 12, color: C.inkSec, fontWeight: 500, lineHeight: 1.4 }}>{f.t}</span>
            </div>
          ))}
        </div>

        {/* Price badge */}
        <div style={{ background: C.gold + "18", border: `1px solid ${C.gold}44`, borderRadius: 14, padding: "12px 16px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, color: C.gold, fontWeight: 600 }}>Suscripción mensual</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: C.gold, fontWeight: 800 }}>$300 <span style={{ fontSize: 13 }}>MXN/mes</span></div>
        </div>

        {/* Login form */}
        <div style={{ background: C.card, borderRadius: 20, padding: "24px 20px", boxShadow: "0 8px 40px rgba(21,46,68,0.10)" }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: C.ink, marginBottom: 6 }}>Accede a tu plan</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>Ingresa el código que te proporcionó el Dr. Rogelio.</div>
          <input
            placeholder="Código (ej. APEX-0001)"
            value={input}
            onChange={e => { setInput(e.target.value.toUpperCase()); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ background: C.muted2, border: `1.5px solid ${error ? C.scarlet : C.border}`, borderRadius: 12, padding: "13px 16px", color: C.ink, fontSize: 15, width: "100%", outline: "none", marginBottom: 10, letterSpacing: "0.04em" }}
          />
          {error && <div style={{ background: "#FEE2E2", color: C.scarlet, borderRadius: 10, padding: "9px 14px", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button
            onClick={handleLogin}
            disabled={loading || !input.trim()}
            style={{ background: loading || !input.trim() ? C.ghost : C.navy, color: "#FFF", border: "none", borderRadius: 13, padding: "14px", fontWeight: 700, fontSize: 15, width: "100%", boxShadow: loading || !input.trim() ? "none" : "0 6px 24px rgba(21,46,68,0.25)", transition: "all 0.2s" }}
          >
            {loading ? "Verificando..." : "Ingresar →"}
          </button>
          <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.ghost }}>
            ¿Sin código? Contacta al Dr. Rogelio Sánchez
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: C.ghost, paddingBottom: 32 }}>
          appDrRogelioSanchez © 2025 · Información educativa<br />Consulta siempre las indicaciones de tu médico
        </div>
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState(null); // null | 'patient' | 'doctor'
  const [code, setCode] = useState("");

  function logout() {
    localStorage.removeItem("apex_code");
    setMode(null);
    setCode("");
  }

  if (!mode) {
    return (
      <LoginGate
        onPatient={c => { setCode(c); setMode("patient"); }}
        onDoctor={c => { setCode(c); setMode("doctor"); }}
      />
    );
  }

  if (mode === "doctor") {
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "#080F1A" }}>
        <style>{GLOBAL_CSS}</style>
        <DoctorApp doctorCode={code} onLogout={logout} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: C.bg }}>
      <style>{GLOBAL_CSS}</style>
      <PatientApp patientCode={code} onLogout={logout} />
    </div>
  );
}
