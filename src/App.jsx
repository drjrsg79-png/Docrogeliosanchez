import { useState, useEffect } from "react";
import PatientApp from "./PatientApp.jsx";
import DoctorApp from "./DoctorApp.jsx";

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{background:#F8F5F0;font-family:'DM Sans',sans-serif;}input,textarea,button,select{font-family:'DM Sans',sans-serif;}@keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}.fade-up{animation:fadeUp 0.3s ease both;}button{cursor:pointer;}@keyframes spin{to{transform:rotate(360deg);}}@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}`;

async function verifyCode(code) {
  try {
    const res = await fetch("/api/claude", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accessCode:code,system:"Responde solo ok.",messages:[{role:"user",content:"ping"}],max_tokens:5})});
    return res.ok;
  } catch { return false; }
}

function AppointmentForm({ onBack }) {
  const [form, setForm] = useState({name:"",phone:"",email:"",reason:"",date:"",time:""});
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const reasons = ["Revisión de pie diabético","Control de glucosa","Herida o úlcera en pie","Dolor o entumecimiento","Primera consulta","Seguimiento de tratamiento","Otro motivo"];

  async function submit() {
    if(!form.name||!form.phone||!form.reason) return alert("Llena nombre, teléfono y motivo");
    setLoading(true);
    try {
      await fetch("/api/appointments?action=book",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      setSent(true);
    } catch { alert("Error al enviar. Intenta de nuevo."); }
    setLoading(false);
  }

  if(sent) return (
    <div style={{minHeight:"100vh",background:"#F8F5F0",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:28,textAlign:"center"}}>
      <div style={{fontSize:64,marginBottom:20}}>✅</div>
      <div style={{fontFamily:"Playfair Display,serif",fontSize:24,color:"#152E44",marginBottom:12}}>¡Cita solicitada!</div>
      <div style={{color:"#8C857C",fontSize:15,lineHeight:1.7,marginBottom:8}}>El Dr. Rogelio Sánchez revisará tu solicitud y te contactará al:</div>
      <div style={{fontWeight:700,fontSize:17,color:"#152E44",marginBottom:24}}>{form.phone}</div>
      <div style={{background:"#FEF9C3",border:"1px solid #FDE047",borderRadius:14,padding:"14px 18px",marginBottom:24,fontSize:13,color:"#713F12",lineHeight:1.7}}>
        ⚠️ <strong>Recuerda:</strong> No debes pisar ni apoyar tu pie en tratamiento hasta que el médico te lo permita.
      </div>
      <button onClick={onBack} style={{background:"#152E44",color:"#FFF",border:"none",borderRadius:14,padding:"14px 28px",fontWeight:700,fontSize:15}}>Volver al inicio</button>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#F8F5F0",display:"flex",flexDirection:"column"}}>
      <div style={{background:"linear-gradient(160deg,#080F1A,#152E44,#1E4568)",padding:"52px 24px 28px"}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:20,padding:"7px 16px",color:"#FFF",fontSize:13,fontWeight:600,marginBottom:16}}>← Volver</button>
        <div style={{fontFamily:"Playfair Display,serif",fontSize:24,color:"#FFF",fontWeight:800}}>Solicitar Cita</div>
        <div style={{color:"rgba(255,255,255,0.6)",fontSize:13,marginTop:4}}>Consulta gratuita · Dr. Rogelio Sánchez</div>
        <div style={{background:"rgba(34,197,94,0.2)",border:"1px solid rgba(34,197,94,0.4)",borderRadius:10,padding:"8px 14px",marginTop:12,fontSize:12,color:"#86EFAC",fontWeight:600}}>✓ Sin costo · Sin necesidad de registro</div>
      </div>
      <div style={{padding:"20px 20px 100px",flex:1}}>
        <div style={{background:"#FEF9C3",border:"1px solid #FDE047",borderRadius:12,padding:"12px 16px",marginBottom:20,fontSize:12,color:"#713F12",lineHeight:1.6}}>
          ⚠️ <strong>Importante:</strong> No debes pisar ni apoyar tu pie en tratamiento hasta que el médico te lo permita.
        </div>
        {[{l:"Nombre completo",f:"name",p:"Tu nombre"},{l:"Teléfono (WhatsApp)",f:"phone",p:"10 dígitos"},{l:"Correo (opcional)",f:"email",p:"tu@correo.com"}].map(({l,f,p})=>(
          <div key={f} style={{marginBottom:14}}>
            <div style={{fontSize:11,color:"#8C857C",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>{l}</div>
            <input placeholder={p} value={form[f]} onChange={e=>setForm(x=>({...x,[f]:e.target.value}))} style={{background:"#F0EDE7",border:"1.5px solid rgba(21,46,68,0.10)",borderRadius:12,padding:"13px 16px",color:"#1A1714",fontSize:15,width:"100%",outline:"none"}}/>
          </div>
        ))}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:"#8C857C",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Motivo de consulta</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {reasons.map(r=>(
              <button key={r} onClick={()=>setForm(x=>({...x,reason:r}))} style={{background:form.reason===r?"#152E44":"#FFF",color:form.reason===r?"#FFF":"#3C3830",border:`1.5px solid ${form.reason===r?"#152E44":"rgba(21,46,68,0.10)"}`,borderRadius:10,padding:"11px 14px",fontSize:14,textAlign:"left",fontWeight:form.reason===r?700:400}}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          <div>
            <div style={{fontSize:11,color:"#8C857C",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Fecha preferida</div>
            <input type="date" value={form.date} onChange={e=>setForm(x=>({...x,date:e.target.value}))} style={{background:"#F0EDE7",border:"1.5px solid rgba(21,46,68,0.10)",borderRadius:12,padding:"13px 12px",color:"#1A1714",fontSize:14,width:"100%",outline:"none"}}/>
          </div>
          <div>
            <div style={{fontSize:11,color:"#8C857C",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Hora preferida</div>
            <input type="time" value={form.time} onChange={e=>setForm(x=>({...x,time:e.target.value}))} style={{background:"#F0EDE7",border:"1.5px solid rgba(21,46,68,0.10)",borderRadius:12,padding:"13px 12px",color:"#1A1714",fontSize:14,width:"100%",outline:"none"}}/>
          </div>
        </div>
        <button onClick={submit} disabled={loading} style={{background:loading?"#C4BDB5":"#1A5C40",color:"#FFF",border:"none",borderRadius:14,padding:16,fontWeight:700,fontSize:16,width:"100%",boxShadow:"0 6px 24px rgba(26,92,64,0.35)"}}>
          {loading?"Enviando...":"Solicitar cita gratuita →"}
        </button>
      </div>
    </div>
  );
}

function LoginGate({ onPatient, onDoctor, onAppointment }) {
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
      <div style={{background:"linear-gradient(160deg,#080F1A,#152E44,#1E4568)",padding:"60px 28px 40px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:"rgba(184,130,10,0.08)"}}/>
        <div style={{width:80,height:80,borderRadius:22,background:"linear-gradient(135deg,#B8820A,#D4A534)",margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,boxShadow:"0 8px 32px rgba(184,130,10,0.4)"}}>⚕️</div>
        <div style={{fontFamily:"Playfair Display,serif",fontSize:24,color:"#FFF",fontWeight:800}}>Dr. Rogelio Sánchez</div>
        <div style={{color:"rgba(255,255,255,0.55)",fontSize:12,marginTop:6,lineHeight:1.6}}>Medicina Interna · Terapia Intensiva{"
"}Salvamento de Extremidad · Pie Diabético</div>
      </div>

      <div style={{padding:"20px 20px 0"}}>
        {/* CITA GRATUITA BUTTON */}
        <button onClick={onAppointment} style={{width:"100%",background:"linear-gradient(135deg,#1A5C40,#22C55E)",color:"#FFF",border:"none",borderRadius:18,padding:"20px",marginBottom:16,boxShadow:"0 8px 32px rgba(26,92,64,0.35)",display:"flex",alignItems:"center",gap:16,textAlign:"left"}}>
          <div style={{width:52,height:52,borderRadius:14,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>📅</div>
          <div>
            <div style={{fontFamily:"Playfair Display,serif",fontSize:17,fontWeight:800}}>Solicitar Cita</div>
            <div style={{fontSize:13,opacity:0.85,marginTop:2}}>Consulta presencial · Completamente gratuita</div>
            <div style={{background:"rgba(255,255,255,0.25)",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,marginTop:6,display:"inline-block"}}>Sin registro necesario ✓</div>
          </div>
        </button>

        <div style={{background:"#FEF9C3",border:"1px solid #FDE047",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#713F12",lineHeight:1.6,textAlign:"center",fontWeight:600}}>
          ⚠️ No debes pisar ni apoyar tu pie en tratamiento hasta que el médico te lo permita
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[{icon:"📊",t:"Glucosa y presión"},{icon:"💊",t:"Recordatorios"},{icon:"📹",t:"Videollamada"},{icon:"🥗",t:"Dieta con IA"},{icon:"💪",t:"Ejercicio"},{icon:"🤖",t:"Coach IA 24/7"}].map((f,i)=>(
            <div key={i} style={{background:"#FFF",borderRadius:12,padding:"10px 12px",boxShadow:"0 2px 12px rgba(21,46,68,0.06)",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18,flexShrink:0}}>{f.icon}</span>
              <span style={{fontSize:11,color:"#3C3830",fontWeight:500}}>{f.t}</span>
            </div>
          ))}
        </div>

        <div style={{background:"#FFF",borderRadius:20,padding:"20px",boxShadow:"0 8px 40px rgba(21,46,68,0.10)"}}>
          <div style={{fontFamily:"Playfair Display,serif",fontSize:16,color:"#1A1714",marginBottom:4}}>Acceso a plan completo</div>
          <div style={{color:"#8C857C",fontSize:12,marginBottom:6}}>$300 MXN/mes · Ingresa tu código</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:14}}>
            <div style={{flex:1,height:1,background:"rgba(21,46,68,0.08)"}}/>
            <span style={{fontSize:11,color:"#C4BDB5"}}>Plan completo con IA</span>
            <div style={{flex:1,height:1,background:"rgba(21,46,68,0.08)"}}/>
          </div>
          <input placeholder="Código de acceso (APEX-0001)" value={input} onChange={e=>{setInput(e.target.value.toUpperCase());setError("");}} onKeyDown={e=>e.key==="Enter"&&handleLogin()}
            style={{background:"#F0EDE7",border:`1.5px solid ${error?"#A02828":"rgba(21,46,68,0.10)"}`,borderRadius:12,padding:"13px 16px",color:"#1A1714",fontSize:14,width:"100%",outline:"none",marginBottom:10,letterSpacing:"0.04em"}}/>
          {error&&<div style={{background:"#FEE2E2",color:"#A02828",borderRadius:10,padding:"8px 14px",fontSize:12,marginBottom:10}}>{error}</div>}
          <button onClick={handleLogin} disabled={loading||!input.trim()} style={{background:loading||!input.trim()?"#C4BDB5":"#152E44",color:"#FFF",border:"none",borderRadius:12,padding:13,fontWeight:700,fontSize:14,width:"100%"}}>
            {loading?"Verificando...":"Ingresar →"}
          </button>
        </div>
        <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"#C4BDB5",paddingBottom:32}}>appDrRogelioSanchez © 2025</div>
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(null);
  const [code, setCode] = useState("");

  function logout() { localStorage.removeItem("apex_code"); setMode(null); setCode(""); }

  if (!mode) return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh"}}>
      <style>{CSS}</style>
      <LoginGate
        onPatient={c=>{setCode(c);setMode("patient");}}
        onDoctor={c=>{setCode(c);setMode("doctor");}}
        onAppointment={()=>setMode("appointment")}
      />
    </div>
  );

  if (mode==="appointment") return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh"}}>
      <style>{CSS}</style>
      <AppointmentForm onBack={()=>setMode(null)}/>
    </div>
  );

  if (mode==="doctor") return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:"#080F1A"}}>
      <style>{CSS}</style>
      <DoctorApp doctorCode={code} onLogout={logout}/>
    </div>
  );

  return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:"#F8F5F0"}}>
      <style>{CSS}</style>
      <PatientApp patientCode={code} onLogout={logout}/>
    </div>
  );
}
 
