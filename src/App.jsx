import { useState, useEffect } from "react";
import PatientApp from "./PatientApp.jsx";
import DoctorApp from "./DoctorApp.jsx";

const C = {
  navy:"#152E44",gold:"#B8820A",goldLight:"#D4A534",
  ink:"#1A1714",muted:"#8C857C",ghost:"#C4BDB5",
  bg:"#F8F5F0",card:"#FFFFFF",muted2:"#F0EDE7",
  border:"rgba(21,46,68,0.10)",shadow:"0 6px 32px rgba(21,46,68,0.11)",
  emerald:"#1A5C40",scarlet:"#A02828",
};

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#F8F5F0;font-family:'DM Sans',sans-serif;}
  input,textarea,button,select{font-family:'DM Sans',sans-serif;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
  .fade-up{animation:fadeUp 0.3s ease both;}
  button{cursor:pointer;}
`;

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

function LoginGate({ onPatient, onDoctor }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("apex_code");
    if (saved) {
      const upper = saved.toUpperCase();
      if (upper.startsWith("DR-ROGELIO-")) onDoctor(upper);
      else onPatient(upper);
    }
  }, []);

  async function handleLogin() {
    const code = input.trim().toUpperCase();
    if (!code) return;
    setLoading(true); setError("");
    const ok = await verifyCode(code);
    if (ok) {
      localStorage.setItem("apex_code", code);
      if (code.startsWith("DR-ROGELIO-")) onDoctor(code);
      else onPatient(code);
    } else {
      setError("Código inválido. Contacta al Dr. Rogelio.");
    }
    setLoading(false);
  }

  return (
    <div style={{minHeight:"100vh",background:"#F8F5F0",display:"flex",flexDirection:"column"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{background:"linear-gradient(160deg,#080F1A,#152E44,#1E4568)",padding:"72px 28px 48px",textAlign:"center"}}>
        <div style={{width:80,height:80,borderRadius:22,background:"linear-gradient(135deg,#B8820A,#D4A534)",margin:"0 auto 20px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,boxShadow:"0 8px 32px rgba(184,130,10,0.4)"}}>⚕️</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#FFF",fontWeight:800}}>Dr. Rogelio Sánchez</div>
        <div style={{color:"rgba(255,255,255,0.5)",fontSize:13,marginTop:6,letterSpacing:"0.12em",textTransform:"uppercase"}}>Internista · Nutriólogo · Diabetes</div>
      </div>
      <div style={{padding:"24px 22px 0"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
          {[{icon:"📊",t:"Control glucosa y presión"},{icon:"💊",t:"Recordatorios medicamentos"},{icon:"📹",t:"Videollamada con tu médico"},{icon:"🥗",t:"Planes de dieta con IA"},{icon:"💪",t:"Rutinas de ejercicio"},{icon:"🤖",t:"Coach IA 24/7"}].map((f,i)=>(
            <div key={i} style={{background:"#FFF",borderRadius:14,padding:"12px 14px",boxShadow:"0 2px 12px rgba(21,46,68,0.06)",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20,flexShrink:0}}>{f.icon}</span>
              <span style={{fontSize:12,color:"#3C3830",fontWeight:500,lineHeight:1.4}}>{f.t}</span>
            </div>
          ))}
        </div>
        <div style={{background:"rgba(184,130,10,0.12)",border:"1px solid rgba(184,130,10,0.3)",borderRadius:14,padding:"12px 16px",marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:13,color:"#B8820A",fontWeight:600}}>Suscripción mensual</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:"#B8820A",fontWeight:800}}>$300 <span style={{fontSize:13}}>MXN/mes</span></div>
        </div>
        <div style={{background:"#FFF",borderRadius:20,padding:"24px 20px",boxShadow:"0 8px 40px rgba(21,46,68,0.10)"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#1A1714",marginBottom:6}}>Accede a tu plan</div>
          <div style={{color:"#8C857C",fontSize:13,marginBottom:18,lineHeight:1.6}}>Ingresa el código que te proporcionó el Dr. Rogelio.</div>
          <input placeholder="Código (ej. APEX-0001)" value={input} onChange={e=>{setInput(e.target.value.toUpperCase());setError("");}} onKeyDown={e=>e.key==="Enter"&&handleLogin()}
            style={{background:"#F0EDE7",border:`1.5px solid ${error?"#A02828":"rgba(21,46,68,0.10)"}`,borderRadius:12,padding:"13px 16px",color:"#1A1714",fontSize:15,width:"100%",outline:"none",marginBottom:10,letterSpacing:"0.04em"}}/>
          {error&&<div style={{background:"#FEE2E2",color:"#A02828",borderRadius:10,padding:"9px 14px",fontSize:13,marginBottom:12}}>{error}</div>}
          <button onClick={handleLogin} disabled={loading||!input.trim()}
            style={{background:loading||!input.trim()?"#C4BDB5":"#152E44",color:"#FFF",border:"none",borderRadius:13,padding:14,fontWeight:700,fontSize:15,width:"100%",boxShadow:loading||!input.trim()?"none":"0 6px 24px rgba(21,46,68,0.25)"}}>
            {loading?"Verificando...":"Ingresar →"}
          </button>
          <div style={{textAlign:"center",marginTop:14,fontSize:12,color:"#C4BDB5"}}>¿Sin código? Contacta al Dr. Rogelio Sánchez</div>
        </div>
        <div style={{textAlign:"center",marginTop:24,fontSize:11,color:"#C4BDB5",paddingBottom:32}}>
          appDrRogelioSanchez © 2025 · Información educativa
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(null);
  const [code, setCode] = useState("");

  function logout() {
    localStorage.removeItem("apex_code");
    setMode(null); setCode("");
  }

  if (!mode) return (
    <LoginGate
      onPatient={c=>{setCode(c);setMode("patient");}}
      onDoctor={c=>{setCode(c);setMode("doctor");}}
    />
  );

  if (mode==="doctor") return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:"#080F1A"}}>
      <style>{GLOBAL_CSS}</style>
      <DoctorApp doctorCode={code} onLogout={logout}/>
    </div>
  );

  return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:"#F8F5F0"}}>
      <style>{GLOBAL_CSS}</style>
      <PatientApp patientCode={code} onLogout={logout}/>
    </div>
  );
}
