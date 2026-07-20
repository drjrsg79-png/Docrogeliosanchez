import { useState, useMemo, useRef, useEffect } from "react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const C = {
  bg:"#F8F5F0",card:"#FFFFFF",muted2:"#F0EDE7",deep:"#E8E2D9",
  navy:"#152E44",navyMid:"#1E4568",gold:"#B8820A",goldPale:"#F5E9C8",
  ink:"#1A1714",inkSec:"#3C3830",muted:"#8C857C",ghost:"#C4BDB5",
  emerald:"#1A5C40",scarlet:"#A02828",cobalt:"#1A3F8C",amber:"#B45309",
  border:"rgba(21,46,68,0.10)",shadow:"0 2px 20px rgba(21,46,68,0.07)",
  shadowMd:"0 6px 32px rgba(21,46,68,0.11)",
};

// ── API helpers ───────────────────────────────────────
async function callClaude(system, messages, maxTokens = 800) {
  try {
    const code = localStorage.getItem("apex_code") || "";
    const res = await fetch("/api/claude", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode: code, system, messages: Array.isArray(messages) ? messages : [{ role:"user", content:messages }], max_tokens: maxTokens }),
    });
    if (res.status === 401) { return "ERR401"; } if (!res.ok) { return "ERRHTTP:"+res.status; }
    const data = await res.json();
    return data.content?.find(b => b.type === "text")?.text || "";
  } catch (e) { console.error("callClaude error:", e); return "ERRCATCH:"+String(e); }
}

async function apiData(action, method = "GET", body = {}) {
  const code = localStorage.getItem("apex_code") || "";
  try {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    const url = method === "GET"
      ? `/api/data?action=${action}&patientCode=${encodeURIComponent(code)}`
      : `/api/data?action=${action}`;
    if (method !== "GET") opts.body = JSON.stringify({ ...body, patientCode: code });
    const res = await fetch(url, opts);
    return await res.json();
  } catch { return { ok: false }; }
}

function ytSearch(q) { window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q + " tutorial ejercicio")}`, "_blank"); }

function calcTDEE(p) {
  const w = Math.max(parseFloat(p.weight)||70,1), h = Math.max(parseFloat(p.height)||170,1), a = Math.max(parseFloat(p.age)||25,1);
  const bmr = p.sex==="male" ? 10*w+6.25*h-5*a+5 : 10*w+6.25*h-5*a-161;
  return Math.round(Math.max(bmr,800)*({sedentary:1.2,light:1.375,moderate:1.55,active:1.725,veryActive:1.9}[p.activity]||1.55));
}
function goalCals(tdee,goal){ return goal==="lose"?Math.max(tdee-500,1200):goal==="gain"?tdee+400:tdee; }
function burnedCals(met,kg,mins){ return Math.round((met*3.5*+kg)/200*+mins); }
function pct(a,b){ return b>0?Math.min(100,Math.round((a/b)*100)):0; }
function today(){ return new Date().toISOString().slice(0,10); }
function nowTime(){ return new Date().toTimeString().slice(0,5); }
function glStatus(v,type="general"){
  if(v<70) return {label:"Hipoglucemia",color:"#7C3AED",bg:"#EDE9FE"};
  if(type==="fasting"||(typeof type==="string"&&type.startsWith("before_"))){ if(v<=99) return {label:"Normal",color:C.emerald,bg:"#D1FAE5"}; if(v<=125) return {label:"Prediabetes",color:C.amber,bg:"#FEF3C7"}; return {label:"Diabetes",color:C.scarlet,bg:"#FEE2E2"}; }
  if(v<=139) return {label:"Normal",color:C.emerald,bg:"#D1FAE5"}; if(v<=179) return {label:"Elevada",color:C.amber,bg:"#FEF3C7"}; return {label:"Alta",color:C.scarlet,bg:"#FEE2E2"};
}

// ── UI atoms ─────────────────────────────────────────
const Card = ({children,style}) => <div style={{background:C.card,borderRadius:20,padding:"18px 20px",marginBottom:14,boxShadow:C.shadow,...style}}>{children}</div>;
const PBtn = ({children,onClick,disabled,color,textColor,style}) => <button onClick={onClick} disabled={disabled} style={{background:disabled?C.muted2:(color||C.navy),color:disabled?C.muted:(textColor||"#FFF"),border:"none",borderRadius:14,padding:"14px 20px",fontWeight:700,fontSize:15,width:"100%",boxShadow:disabled?"none":C.shadowMd,opacity:disabled?0.65:1,...style}}>{children}</button>;
const Chip = ({children,onClick,active,color}) => <button onClick={onClick} style={{background:active?(color||C.navy):C.card,color:active?"#FFF":C.inkSec,border:`1.5px solid ${active?(color||C.navy):C.border}`,borderRadius:10,padding:"9px 16px",fontWeight:600,fontSize:13,transition:"all 0.2s"}}>{children}</button>;
const FL = ({children}) => <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>{children}</div>;
const SI = (props) => <input {...props} style={{background:C.muted2,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"13px 16px",color:C.ink,fontSize:15,width:"100%",outline:"none",...(props.style||{})}}/>;
const Badge = ({children,color}) => <span style={{background:(color||C.navy)+"18",color:color||C.navy,borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700}}>{children}</span>;
const Spin = () => <div style={{width:36,height:36,border:`3px solid ${C.border}`,borderTopColor:C.navy,borderRadius:"50%",animation:"spin 0.9s linear infinite",margin:"0 auto 12px"}}/>;
const Hdr = ({title,sub,imgId,color}) => (
  <div style={{background:color||`linear-gradient(145deg,${C.navy},${C.navyMid})`,padding:"56px 22px 24px",position:"relative",overflow:"hidden"}}>
    {imgId&&<img src={`https://images.unsplash.com/photo-${imgId}?w=430&h=240&fit=crop&auto=format&q=80`} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.15}}/>}
    <div style={{position:"relative"}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:"#FFF",fontWeight:800}}>{title}</div>
      <div style={{color:"rgba(255,255,255,0.55)",fontSize:14,marginTop:4}}>{sub}</div>
    </div>
  </div>
);


// ── Notification system ───────────────────────────────
function useNotifications(reminders) {
  useEffect(() => {
    if (!reminders || reminders.length === 0) return;
    const check = () => {
      const now = new Date();
      const t = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
      reminders.forEach(r => {
        if (!r.active) return;
        (r.times || []).forEach(rt => {
          if (rt === t) {
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification(`⏰ ${r.title}`, { body: r.body, icon: "/icon-192.png" });
            }
            // Also send to SW
            navigator.serviceWorker?.ready.then(reg => {
              reg.active?.postMessage({ type:"CHECK_REMINDERS", reminders });
            });
          }
        });
      });
    };
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [reminders]);
}

// ── Exercise data ─────────────────────────────────────
const EXERCISES = [
  {name:"Correr exterior",cat:"Cardio",met:9.8,img:"1571008887538-b36bb32f4571"},
  {name:"Correr en cinta",cat:"Cardio",met:9.0,img:"1571008887538-b36bb32f4571"},
  {name:"Caminar rápido",cat:"Cardio",met:5.0,img:"1551632811-561732d1e306"},
  {name:"Elliptical",cat:"Cardio",met:5.5,img:"1549060279-7e168fcee0c2"},
  {name:"Saltar la cuerda",cat:"Cardio",met:11.0,img:"1552674605-db5fecabfe68"},
  {name:"Ciclismo",cat:"Cardio",met:8.0,img:"1558618666-fcd25c85cd64"},
  {name:"Spinning",cat:"Cardio",met:8.5,img:"1558618666-fcd25c85cd64"},
  {name:"Natación",cat:"Cardio",met:7.0,img:"1530549387789-4c1017266635"},
  {name:"Sentadilla con barra",cat:"Fuerza",met:5.5,img:"1534438327276-14e5300c3a48"},
  {name:"Peso muerto",cat:"Fuerza",met:6.0,img:"1534438327276-14e5300c3a48"},
  {name:"Press de banca",cat:"Fuerza",met:5.0,img:"1534438327276-14e5300c3a48"},
  {name:"Dominadas",cat:"Fuerza",met:5.5,img:"1571019614242-c5c5dee9f50b"},
  {name:"Hip Thrust",cat:"Fuerza",met:4.5,img:"1534438327276-14e5300c3a48"},
  {name:"Press militar",cat:"Fuerza",met:5.0,img:"1534438327276-14e5300c3a48"},
  {name:"Remo con barra",cat:"Fuerza",met:5.0,img:"1534438327276-14e5300c3a48"},
  {name:"Kettlebell swing",cat:"Fuerza",met:7.0,img:"1526506118085-60ce8714f8c5"},
  {name:"Gym general",cat:"Fuerza",met:5.0,img:"1534438327276-14e5300c3a48"},
  {name:"HIIT general",cat:"HIIT",met:12.0,img:"1549060279-7e168fcee0c2"},
  {name:"CrossFit",cat:"HIIT",met:11.0,img:"1526506118085-60ce8714f8c5"},
  {name:"Burpees",cat:"HIIT",met:10.0,img:"1549060279-7e168fcee0c2"},
  {name:"Tabata",cat:"HIIT",met:13.0,img:"1549060279-7e168fcee0c2"},
  {name:"Calistenia",cat:"HIIT",met:7.0,img:"1571019614242-c5c5dee9f50b"},
  {name:"Fútbol",cat:"Deportes",met:7.5,img:"1431324155629-1a6deb1dec8d"},
  {name:"Baloncesto",cat:"Deportes",met:7.5,img:"1546519638-68e109498ffc"},
  {name:"Tenis",cat:"Deportes",met:7.0,img:"1595435934249-5df7ed86e1c0"},
  {name:"Pádel",cat:"Deportes",met:6.5,img:"1595435934249-5df7ed86e1c0"},
  {name:"Boxeo",cat:"Combate",met:9.0,img:"1583454110551-21f2fa2afe61"},
  {name:"Muay Thai",cat:"Combate",met:10.0,img:"1583454110551-21f2fa2afe61"},
  {name:"Jiu-Jitsu",cat:"Combate",met:8.0,img:"1583454110551-21f2fa2afe61"},
  {name:"Yoga Vinyasa",cat:"Bienestar",met:4.0,img:"1506126613408-eca07ce68773"},
  {name:"Pilates",cat:"Bienestar",met:4.0,img:"1518611012118-696072aa579a"},
  {name:"Senderismo",cat:"Aire Libre",met:6.0,img:"1551632811-561732d1e306"},
  {name:"Trail running",cat:"Aire Libre",met:10.0,img:"1571008887538-b36bb32f4571"},
  {name:"Zumba",cat:"Baile",met:7.5,img:"1549060279-7e168fcee0c2"},
];
const EX_CATS = ["Todos",...Array.from(new Set(EXERCISES.map(e=>e.cat)))];


// ══════════════════════════════════════════════════════
// SCREEN: SETUP
// ══════════════════════════════════════════════════════
function Setup({onComplete}) {
  const [step,setStep]=useState(0);
  const [form,setForm]=useState({name:"",age:"",sex:"male",weight:"",height:"",activity:"moderate",goal:"lose"});
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));
  const heroes=["1571008887538-b36bb32f4571","1534438327276-14e5300c3a48","1506126613408-eca07ce68773"];
  const Tog=({opts,field})=><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{opts.map(o=><button key={o.v} onClick={()=>setF(field,o.v)} style={{flex:"1 1 auto",padding:"12px 10px",borderRadius:12,fontWeight:600,fontSize:14,background:form[field]===o.v?C.navy:C.muted2,color:form[field]===o.v?"#FFF":C.inkSec,border:`1.5px solid ${form[field]===o.v?C.navy:C.border}`}}>{o.l}</button>)}</div>;
  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column"}}>
      <div style={{position:"relative",height:200,overflow:"hidden"}}>
        <img src={`https://images.unsplash.com/photo-${heroes[step]}?w=430&h=400&fit=crop&auto=format&q=80`} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(21,46,68,0.3),rgba(21,46,68,0.8))"}}/>
        <div style={{position:"absolute",bottom:20,left:22,color:"#FFF"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:800}}>Bienvenido</div>
          <div style={{fontSize:12,opacity:0.7,letterSpacing:"0.1em",textTransform:"uppercase"}}>Dr. Rogelio Sánchez · Tu salud primero</div>
        </div>
        <div style={{position:"absolute",top:22,right:22,display:"flex",gap:5}}>{[0,1,2].map(i=><div key={i} style={{width:i===step?22:7,height:7,borderRadius:4,background:i<=step?"#B8820A":"rgba(255,255,255,0.3)",transition:"width 0.3s"}}/>)}</div>
      </div>
      <div style={{padding:"24px 20px 100px",flex:1}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.ink,marginBottom:5}}>{["Cuéntanos sobre ti","Tu composición corporal","Tu objetivo principal"][step]}</div>
        <div style={{color:C.muted,fontSize:13,marginBottom:20}}>{["Personalizaremos cada recomendación.","Calculamos tu metabolismo exacto.","Tu meta define todo tu plan."][step]}</div>
        {step===0&&<><FL>Nombre</FL><SI placeholder="¿Cómo te llamamos?" value={form.name} onChange={e=>setF("name",e.target.value)}/><div style={{marginTop:14}}><FL>Edad</FL><SI type="number" placeholder="Años" value={form.age} onChange={e=>setF("age",e.target.value)}/></div><div style={{marginTop:14}}><FL>Sexo biológico</FL><Tog field="sex" opts={[{v:"male",l:"Hombre"},{v:"female",l:"Mujer"}]}/></div></>}
        {step===1&&<><FL>Peso actual (kg)</FL><SI type="number" placeholder="ej. 82" value={form.weight} onChange={e=>setF("weight",e.target.value)}/><div style={{marginTop:14}}><FL>Estatura (cm)</FL><SI type="number" placeholder="ej. 175" value={form.height} onChange={e=>setF("height",e.target.value)}/></div><div style={{marginTop:14}}><FL>Nivel de actividad</FL><Tog field="activity" opts={[{v:"sedentary",l:"Sedentario"},{v:"light",l:"Ligero"},{v:"moderate",l:"Moderado"},{v:"active",l:"Activo"},{v:"veryActive",l:"Muy activo"}]}/></div></>}
        {step===2&&<div style={{display:"flex",flexDirection:"column",gap:10}}>{[{v:"lose",l:"Bajar de peso",sub:"Déficit calórico inteligente"},{v:"gain",l:"Ganar músculo",sub:"Superávit + alta proteína"},{v:"recomp",l:"Recomposición",sub:"Perder grasa y ganar músculo"},{v:"maintain",l:"Mantenimiento",sub:"Sostener tu estado actual"}].map(o=><button key={o.v} onClick={()=>setF("goal",o.v)} style={{display:"flex",alignItems:"center",gap:14,padding:14,borderRadius:16,textAlign:"left",background:form.goal===o.v?C.navy:C.card,border:`1.5px solid ${form.goal===o.v?C.navy:C.border}`,boxShadow:form.goal===o.v?C.shadowMd:C.shadow}}><div><div style={{fontWeight:700,fontSize:15,color:form.goal===o.v?"#FFF":C.ink}}>{o.l}</div><div style={{fontSize:12,color:form.goal===o.v?"rgba(255,255,255,0.6)":C.muted,marginTop:2}}>{o.sub}</div></div></button>)}</div>}
        <div style={{display:"flex",gap:12,marginTop:28}}>
          {step>0&&<Chip onClick={()=>setStep(s=>s-1)}>← Atrás</Chip>}
          <PBtn onClick={()=>{
            if(step===0&&!form.name.trim()) return alert("Ingresa tu nombre");
            if(step===1&&(!form.weight||!form.height)) return alert("Ingresa peso y estatura");
            if(step<2) setStep(s=>s+1); else onComplete(form);
          }} style={{flex:1}}>{step<2?"Continuar →":"¡Comenzar!"}</PBtn>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════
// SCREEN: DASHBOARD
// ══════════════════════════════════════════════════════
function Dashboard({profile,meals,exerciseLog,setTab}){
  const firstName=(profile?.name||"").split(" ")[0]||"";
  const TIPS=[
    "Revisa tus pies todos los dias buscando cortes, ampollas o cambios de color.",
    "Usa calzado cerrado y comodo, nunca camines descalzo.",
    "Seca bien entre los dedos despues de banarte para evitar hongos.",
    "Hidrata la piel de tus pies, pero no entre los dedos.",
    "Corta las unas en linea recta para evitar unas encarnadas."
  ];
  const tip=TIPS[new Date().getDate()%TIPS.length];

  const Section=({title,desc,tag,onClick})=>(
    <Card style={{cursor:"pointer"}}>
      <div onClick={onClick} style={{display:"flex",alignItems:"flex-start",gap:14}}>
        <div style={{width:44,height:44,borderRadius:12,background:C.navy+"0F",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:C.navy,fontWeight:700,fontSize:13,letterSpacing:0.5}}>{tag}</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:15,color:C.ink,marginBottom:2}}>{title}</div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.4}}>{desc}</div>
        </div>
      </div>
    </Card>
  );

  return (
    <div style={{paddingBottom:110}}>
      <div style={{background:`linear-gradient(145deg,${C.navy},${C.navyMid})`,padding:"48px 22px 28px",position:"relative",overflow:"hidden"}}>
        <div style={{color:"#fff",fontSize:13,opacity:0.8,fontWeight:600,letterSpacing:0.5}}>BIENVENIDO</div>
        <div style={{color:"#fff",fontSize:24,fontWeight:700,marginTop:4}}>{firstName?`Hola, ${firstName}`:"Hola"}</div>
        <div style={{color:"#fff",opacity:0.85,fontSize:13,marginTop:6,lineHeight:1.4}}>Este es tu espacio para cuidar tu salud y tus pies. Aqui encuentras todo lo que necesitas para tu tratamiento.</div>
      </div>

      <div style={{padding:"0 16px",marginTop:-16}}>
        <Card style={{background:C.cobalt+"12",border:`1px solid ${C.cobalt}30`}}>
          <div style={{fontSize:11,fontWeight:700,color:C.cobalt,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>Consejo de cuidado del pie</div>
          <div style={{fontSize:14,color:C.ink,lineHeight:1.5}}>{tip}</div>
        </Card>

        <div style={{fontSize:13,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:0.5,margin:"20px 0 10px 4px"}}>Tu dia a dia</div>

        <Section title="Registrar glucosa y presion" desc="Anota tus mediciones para que el Dr. Rogelio pueda dar seguimiento a tu control." tag="GL" onClick={()=>setTab(1)}/>
        <Section title="Medicamentos y recordatorios" desc="Consulta tus dosis indicadas y activa recordatorios para no olvidar ninguna toma." tag="RX" onClick={()=>setTab(2)}/>
        <Section title="Alimentacion para diabetes" desc="Recomendaciones y plan de comidas pensado para el control de tu glucosa." tag="AL" onClick={()=>setTab(4)}/>
        <Section title="Ejercicios de rehabilitacion" desc="Rutinas seguras para fortalecer y proteger tus pies durante la recuperacion." tag="EJ" onClick={()=>setTab(5)}/>
        <Section title="Chat con tu asistente de salud" desc="Resuelve dudas sobre tu tratamiento las 24 horas, todos los dias." tag="IA" onClick={()=>setTab(6)}/>

        <div style={{fontSize:13,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:0.5,margin:"20px 0 10px 4px"}}>Recuerda</div>
        <Card>
          <div style={{fontSize:13,color:C.ink,lineHeight:1.6}}>
            Esta app es un apoyo para tu tratamiento y no sustituye la valoracion de tu medico. Ante cualquier herida, enrojecimiento o dolor en el pie que empeore, contacta a la clinica de inmediato.
          </div>
        </Card>
      </div>
    </div>
  );
}

function GlucosaScreen({profile,patientCode}) {
  const [diabetesType,setDiabetesType]=useState(()=>localStorage.getItem("apex_diabType")||null);
  const [glucoseLog,setGlucoseLog]=useState([]);
  const [view,setView]=useState("records");
  const [addModal,setAddModal]=useState(null);
  const [gForm,setGForm]=useState({value:"",type:"fasting",time:nowTime(),date:today(),note:""});
  const [wForm,setWForm]=useState({value:"",date:today()});
  const [mForm,setMForm]=useState({systolic:"",diastolic:"",date:today()});
  const [dietPlan,setDietPlan]=useState(null);
  const [dietLoad,setDietLoad]=useState(false);
  const [advice,setAdvice]=useState("");
  const [adviceQ,setAdviceQ]=useState("");
  const [adviceLoad,setAdviceLoad]=useState(false);

  // Load readings from server
  useEffect(()=>{
    // carga siempre, sin depender de diabetesType
    apiData("get-readings","GET").then(res=>{
      if(res.ok) setGlucoseLog((res.data||[]).filter(r=>r.type==="glucose"));
    });
  },[diabetesType]);

  async function saveReading(type,value,value2,moment,notes) {
    const res = await apiData("save-reading","POST",{type,value,value2,moment,notes,patientName:profile.name});
    return res.ok;
  }

  async function addGlucose(){
    if(!gForm.value) return;
    const ok = await saveReading("glucose",+gForm.value,null,gForm.type,gForm.note);
    if(ok){
      setGlucoseLog(l=>[...l,{id:Date.now(),value:+gForm.value,type:gForm.type,time:gForm.time,date:gForm.date,note:gForm.note,created_at:new Date().toISOString()}]);
      setAddModal(null);
      setGForm({value:"",type:"fasting",time:nowTime(),date:today(),note:""});
    }
  }

  async function addBP(){
    if(!mForm.systolic||!mForm.diastolic) return;
    await saveReading("blood_pressure",+mForm.systolic,+mForm.diastolic,"random","");
    setAddModal(null);
    setMForm({systolic:"",diastolic:"",date:today()});
    alert("Presión guardada y enviada al Dr. Rogelio ✓");
  }

  async function addWeight(){
    if(!wForm.value) return;
    await saveReading("weight",+wForm.value,null,"random","");
    setAddModal(null);
    setWForm({value:"",date:today()});
    alert("Peso guardado ✓");
  }

  async function genDiet(){
    setDietLoad(true);
    const text=await callClaude(`Nutricionista especialista en diabetes. SOLO JSON válido.`,`Plan 7 días para diabético. ${profile.sex}, ${profile.age}a, ${profile.weight}kg, tipo:${diabetesType}, objetivo:${profile.goal}.\nJSON:{"principios":["p1","p2"],"caloriasDiarias":1800,"carbsPorComida":"30-45g","dias":[{"dia":"Lunes","desayuno":{"descripcion":"...","carbos":"Xg","ig":"bajo"},"almuerzo":{"descripcion":"...","carbos":"Xg","ig":"bajo"},"cena":{"descripcion":"...","carbos":"Xg","ig":"bajo"},"snacks":["s1"]}],"alimentosEvitar":["a1","a2"],"alimentosRecomendados":["r1","r2"],"consejos":["c1","c2"]}`,1500);
    try{setDietPlan(JSON.parse(text.replace(/```json|```/g,"").trim()));}catch{setDietPlan(null);}
    setDietLoad(false);
  }

  async function askAdvice(){
    if(!adviceQ.trim()) return;
    setAdviceLoad(true);
    const last30=glucoseLog.slice(-30);
    const avg=last30.length>0?Math.round(last30.reduce((s,r)=>s+r.value,0)/last30.length):null;
    const text=await callClaude(`Endocrinólogo especialista en diabetes. Responde en español, conciso y empático. Siempre recomienda consultar al médico.`,`Paciente:${profile.sex},${profile.age}a,${profile.weight}kg,${diabetesType}.${avg?` Glucosa promedio:${avg} mg/dL.`:""}\nPregunta:${adviceQ}`,700);
    setAdvice(text);
    setAdviceLoad(false);
  }

  const last30=glucoseLog.slice(-30);
  const avgGlucose=last30.length>0?Math.round(last30.reduce((s,r)=>s+r.value,0)/last30.length):null;
  const hba1c=avgGlucose?((avgGlucose+46.7)/28.7).toFixed(1):null;
  const timeInRange=last30.length>0?Math.round(last30.filter(r=>r.value>=70&&r.value<=180).length/last30.length*100):null;
  const chartData=glucoseLog.slice(-20).map(r=>({name:r.time||"",glucosa:r.value}));
  const lastG=glucoseLog[glucoseLog.length-1]||null;

  if(!diabetesType) return (
    <div style={{paddingBottom:110}}>
      <div style={{background:"linear-gradient(145deg,#0F3020,#1A5C40)",padding:"56px 22px 28px"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:"#FFF",fontWeight:800}}>Control de Glucosa</div>
        <div style={{color:"rgba(255,255,255,0.6)",fontSize:14,marginTop:4}}>Módulo de salud metabólica</div>
      </div>
      <div style={{padding:"20px 16px 0"}}>
        <Card>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.ink,marginBottom:8}}>Configura tu perfil</div>
          <div style={{color:C.muted,fontSize:13,marginBottom:20,lineHeight:1.6}}>Selecciona tu condición para recibir recomendaciones precisas.</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[{v:"type1",l:"Diabetes Tipo 1",sub:"Dependiente de insulina",c:C.cobalt},{v:"type2",l:"Diabetes Tipo 2",sub:"Más común, estilo de vida",c:C.navy},{v:"prediabetes",l:"Prediabetes",sub:"Glucosa elevada",c:C.amber},{v:"gestational",l:"Gestacional",sub:"Durante el embarazo",c:"#BE185D"},{v:"monitoring",l:"Solo monitoreo",sub:"Sin diagnóstico previo",c:C.emerald}].map(o=>(
              <button key={o.v} onClick={()=>{setDiabetesType(o.v);localStorage.setItem("apex_diabType",o.v);}} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:16,textAlign:"left",background:C.muted2,border:`1.5px solid ${C.border}`,boxShadow:C.shadow}}>
                <div style={{width:44,height:44,borderRadius:12,background:o.c,flexShrink:0}}/>
                <div><div style={{fontWeight:700,fontSize:15,color:C.ink}}>{o.l}</div><div style={{fontSize:12,color:C.muted}}>{o.sub}</div></div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div style={{paddingBottom:110}}>
      <div style={{background:"linear-gradient(145deg,#0F3020,#1A5C40)",padding:"56px 22px 24px"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#FFF",fontWeight:800}}>Glucosa & Salud</div>
        {lastG&&<div style={{color:"rgba(255,255,255,0.65)",fontSize:13,marginTop:4}}>Última: <strong style={{color:"#FFF"}}>{lastG.value} mg/dL</strong></div>}
      </div>
      <div style={{padding:"16px 16px 0"}}>
        {avgGlucose&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
            {[{l:"Promedio",v:`${avgGlucose}`,u:"mg/dL",c:glStatus(avgGlucose).color},{l:"HbA1c est.",v:hba1c||"—",u:"%",c:hba1c&&+hba1c<5.7?C.emerald:hba1c&&+hba1c<6.5?C.amber:C.scarlet},{l:"Rango",v:`${timeInRange??0}`,u:"%",c:timeInRange>70?C.emerald:timeInRange>50?C.amber:C.scarlet}].map(s=>(
              <div key={s.l} style={{background:C.card,borderRadius:16,padding:"12px 10px",boxShadow:C.shadow,textAlign:"center"}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{s.l}</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:9,color:C.ghost,marginTop:2}}>{s.u}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:16}}>
          {[{v:"records",l:"Registros"},{v:"charts",l:"Gráficas"},{v:"diet",l:"Dieta IA"},{v:"advisor",l:"Consejo IA"}].map(t=><Chip key={t.v} onClick={()=>setView(t.v)} active={view===t.v} color={C.emerald}>{t.l}</Chip>)}
        </div>

        {view==="records"&&(
          <>
            <div style={{display:"flex",gap:10,marginBottom:14}}>
              <PBtn onClick={()=>setAddModal("glucose")} color={C.emerald} style={{flex:2}}>🩸 Glucosa</PBtn>
              <PBtn onClick={()=>setAddModal("bp")} color={C.cobalt} style={{flex:2}}>💉 Presión</PBtn>
              <PBtn onClick={()=>setAddModal("weight")} color={C.navy} style={{flex:1}}>⚖️</PBtn>
            </div>
            <div style={{background:"#D1FAE5",border:"1px solid #86EFAC",borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#065F46",fontWeight:600}}>
              📤 Tus registros se envían automáticamente al Dr. Rogelio
            </div>
            {glucoseLog.length===0?<Card style={{textAlign:"center",padding:32}}><div style={{fontSize:36,marginBottom:10}}>📊</div><div style={{color:C.muted,fontSize:14}}>Sin registros aún. Añade tu primera lectura.</div></Card>:(
              <>
                {lastG&&(()=>{const st=glStatus(lastG.value,lastG.type);return(
                  <Card style={{background:st.bg,border:`1px solid ${st.color}30`}}>
                    <div style={{fontSize:11,color:st.color,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Última lectura</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:36,color:st.color,fontWeight:800,lineHeight:1}}>{lastG.value}</div><div style={{fontSize:12,color:st.color}}>mg/dL</div></div>
                      <Badge color={st.color}>{st.label}</Badge>
                    </div>
                  </Card>
                );})()}
                {[...glucoseLog].reverse().slice(0,20).map((r,i)=>{const st=glStatus(r.value,r.type);return(
                  <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                    <div style={{width:46,height:46,borderRadius:12,background:st.bg,border:`1px solid ${st.color}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:800,color:st.color}}>{r.value}</div>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{st.label}</div>
                      <div style={{fontSize:11,color:C.muted}}>{{before_breakfast:"Antes de desayuno",after_breakfast:"2h despues de desayuno",before_lunch:"Antes de comida",after_lunch:"2h despues de comida",before_dinner:"Antes de cena",after_dinner:"2h despues de cenar",random:"Aleatoria"}[r.type]||r.type} · {r.date||(r.created_at?new Date(r.created_at).toLocaleDateString("es-MX"):"")} {r.time||(r.created_at?new Date(r.created_at).toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}):"")}</div>
                    </div>
                  </div>
                );})}
              </>
            )}
          </>
        )}

        {view==="charts"&&(
          <Card>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.ink,marginBottom:14}}>Tendencia de Glucosa</div>
            {glucoseLog.length<2?<div style={{textAlign:"center",padding:"24px 0",color:C.muted}}>Añade al menos 2 lecturas</div>:(
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{top:10,right:10,left:-20,bottom:0}}>
                  <defs><linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.emerald} stopOpacity={0.15}/><stop offset="95%" stopColor={C.emerald} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="name" tick={{fontSize:10,fill:C.muted}}/>
                  <YAxis domain={[50,300]} tick={{fontSize:10,fill:C.muted}}/>
                  <Tooltip/>
                  <ReferenceLine y={70} stroke="#7C3AED" strokeDasharray="4 2" strokeWidth={1.5}/>
                  <ReferenceLine y={100} stroke={C.emerald} strokeDasharray="4 2" strokeWidth={1.5}/>
                  <ReferenceLine y={180} stroke={C.scarlet} strokeDasharray="4 2" strokeWidth={1.5}/>
                  <Area type="monotone" dataKey="glucosa" stroke={C.emerald} strokeWidth={2.5} fill="url(#gGrad)" dot={{r:4,fill:C.emerald,strokeWidth:0}}/>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        )}

        {view==="diet"&&(!dietPlan&&!dietLoad?<Card style={{textAlign:"center",padding:28}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.ink,marginBottom:8}}>Plan de dieta para diabetes</div><div style={{color:C.muted,fontSize:13,marginBottom:18}}>Plan de 7 días con bajo índice glucémico y control de carbohidratos.</div><PBtn onClick={genDiet} color={C.emerald}>Generar plan diabético</PBtn></Card>:dietLoad?<Card style={{textAlign:"center",padding:36}}><Spin/><div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:C.emerald}}>Calculando...</div></Card>:dietPlan&&(
          <>
            <Card style={{background:C.emerald}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:"#FFF",marginBottom:6}}>{dietPlan.caloriasDiarias} kcal/día</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{(dietPlan.principios||[]).slice(0,3).map((p,i)=><div key={i} style={{background:"rgba(255,255,255,0.15)",borderRadius:8,padding:"4px 10px",fontSize:11,color:"#FFF",fontWeight:600}}>{p}</div>)}</div></Card>
            {(dietPlan.dias||[]).map((d,i)=><Card key={i}><div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:C.ink,marginBottom:10}}>{d.dia}</div>{[["Desayuno",d.desayuno],["Almuerzo",d.almuerzo],["Cena",d.cena]].map(([t,meal])=>meal&&<div key={t} style={{marginBottom:8,paddingLeft:10,borderLeft:`3px solid ${C.emerald}30`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{t}</div><div style={{display:"flex",gap:5}}>{meal.carbos&&<span style={{background:"#FEF3C7",color:C.amber,borderRadius:6,padding:"1px 7px",fontSize:10,fontWeight:700}}>{meal.carbos}</span>}</div></div><div style={{fontSize:13,color:C.inkSec}}>{typeof meal==='string'?meal:meal.descripcion}</div></div>)}</Card>)}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <Card style={{background:"#FEE2E2",border:"1px solid #FECACA",margin:0}}><div style={{fontSize:11,color:C.scarlet,fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Evitar</div>{(dietPlan.alimentosEvitar||[]).map((a,i)=><div key={i} style={{fontSize:12,color:"#7F1D1D",marginBottom:3}}>✕ {a}</div>)}</Card>
              <Card style={{background:"#D1FAE5",border:"1px solid #A7F3D0",margin:0}}><div style={{fontSize:11,color:C.emerald,fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Priorizar</div>{(dietPlan.alimentosRecomendados||[]).map((a,i)=><div key={i} style={{fontSize:12,color:"#064E3B",marginBottom:3}}>✓ {a}</div>)}</Card>
            </div>
            <PBtn onClick={()=>{setDietPlan(null);genDiet();}} color={C.deep} textColor={C.navy}>Regenerar</PBtn>
          </>
        ))}

        {view==="advisor"&&(
          <Card>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:C.ink,marginBottom:12}}>Pregunta al especialista IA</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              {["¿Qué alimentos bajan la glucosa más rápido?","¿Cuándo debo medir mi glucosa?","¿Cómo afecta el ejercicio a mi glucosa?","¿Puedo comer fruta siendo diabético?"].map(q=><button key={q} onClick={()=>setAdviceQ(q)} style={{background:adviceQ===q?C.emerald:C.muted2,color:adviceQ===q?"#FFF":C.inkSec,border:`1px solid ${adviceQ===q?C.emerald:C.border}`,borderRadius:10,padding:"10px 14px",fontSize:13,textAlign:"left"}}>{q}</button>)}
            </div>
            <FL>O escribe tu pregunta</FL>
            <textarea value={adviceQ} onChange={e=>setAdviceQ(e.target.value)} placeholder="ej. Mi glucosa sube mucho después de desayunar..." style={{background:C.muted2,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"12px 14px",color:C.ink,fontSize:14,width:"100%",height:70,resize:"none",outline:"none",marginBottom:12}}/>
            <PBtn onClick={askAdvice} disabled={adviceLoad||!adviceQ.trim()} color={C.emerald}>{adviceLoad?"Consultando...":"Consultar al especialista IA"}</PBtn>
            {adviceLoad&&<div style={{textAlign:"center",padding:"20px 0"}}><Spin/></div>}
            {advice&&!adviceLoad&&<div style={{marginTop:14,background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:14,padding:16}}><div style={{fontSize:14,color:C.inkSec,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{advice}</div><div style={{marginTop:8,fontSize:11,color:C.muted,fontStyle:"italic"}}>* Consulta siempre al Dr. Rogelio.</div></div>}
          </Card>
        )}
      </div>

      {/* Modals */}
      {addModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(21,46,68,0.55)",zIndex:300,display:"flex",flexDirection:"column",justifyContent:"flex-end",backdropFilter:"blur(4px)"}}>
          <div style={{background:C.card,borderRadius:"24px 24px 0 0",padding:24,maxHeight:"75vh",overflowY:"auto",boxShadow:"0 -8px 48px rgba(21,46,68,0.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:C.ink}}>{addModal==="glucose"?"Registrar glucosa":addModal==="bp"?"Registrar presión arterial":"Registrar peso"}</div>
              <button onClick={()=>setAddModal(null)} style={{background:C.muted2,border:"none",borderRadius:"50%",width:34,height:34,fontSize:16,color:C.muted}}>✕</button>
            </div>
            {addModal==="glucose"&&<>
              <FL>Tipo de medición</FL>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>{[{v:"before_breakfast",l:"Antes de desayuno"},{v:"after_breakfast",l:"2h despues de desayuno"},{v:"before_lunch",l:"Antes de comida"},{v:"after_lunch",l:"2h despues de comida"},{v:"before_dinner",l:"Antes de cena"},{v:"after_dinner",l:"2h despues de cenar"},{v:"random",l:"Aleatoria"}].map(t=><Chip key={t.v} onClick={()=>setGForm(f=>({...f,type:t.v}))} active={gForm.type===t.v} color={C.emerald}>{t.l}</Chip>)}</div>
              <FL>Glucosa (mg/dL)</FL>
              <SI type="number" placeholder="ej. 95" value={gForm.value} onChange={e=>setGForm(f=>({...f,value:e.target.value}))} style={{fontSize:22,fontWeight:800,color:C.emerald,marginBottom:14}}/>
              {gForm.value&&<div style={{marginBottom:14,padding:"10px 14px",borderRadius:12,background:glStatus(+gForm.value,gForm.type).bg}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:800,color:glStatus(+gForm.value,gForm.type).color}}>{gForm.value} mg/dL — {glStatus(+gForm.value,gForm.type).label}</div></div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}><div><FL>Hora</FL><SI type="time" value={gForm.time} onChange={e=>setGForm(f=>({...f,time:e.target.value}))}/></div><div><FL>Fecha</FL><SI type="date" value={gForm.date} onChange={e=>setGForm(f=>({...f,date:e.target.value}))}/></div></div>
              <PBtn onClick={addGlucose} disabled={!gForm.value} color={C.emerald}>Guardar y enviar al Dr. Rogelio</PBtn>
            </>}
            {addModal==="bp"&&<>
              <FL>Presión sistólica (mmHg)</FL><SI type="number" placeholder="ej. 120" value={mForm.systolic} onChange={e=>setMForm(f=>({...f,systolic:e.target.value}))} style={{marginBottom:14}}/>
              <FL>Presión diastólica (mmHg)</FL><SI type="number" placeholder="ej. 80" value={mForm.diastolic} onChange={e=>setMForm(f=>({...f,diastolic:e.target.value}))} style={{marginBottom:14}}/>
              {mForm.systolic&&<div style={{marginBottom:14,padding:"10px 14px",background:+mForm.systolic>=140?"#FEE2E2":+mForm.systolic>=130?"#FEF3C7":"#D1FAE5",borderRadius:12}}><div style={{fontWeight:700,color:+mForm.systolic>=140?C.scarlet:+mForm.systolic>=130?C.amber:C.emerald}}>{mForm.systolic}/{mForm.diastolic} mmHg · {+mForm.systolic>=140?"Crisis hipertensiva":+mForm.systolic>=130?"Elevada":"Normal"}</div></div>}
              <PBtn onClick={addBP} disabled={!mForm.systolic||!mForm.diastolic} color={C.cobalt}>Guardar y enviar al Dr. Rogelio</PBtn>
            </>}
            {addModal==="weight"&&<>
              <FL>Peso (kg)</FL><SI type="number" placeholder="ej. 80.5" value={wForm.value} onChange={e=>setWForm(f=>({...f,value:e.target.value}))} style={{fontSize:22,fontWeight:800,marginBottom:14}}/>
              <PBtn onClick={addWeight} disabled={!wForm.value} color={C.navy}>Guardar peso</PBtn>
            </>}
          </div>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════
// SCREEN: RECORDATORIOS (Medication + Glucose reminders)
// ══════════════════════════════════════════════════════
function Recordatorios({patientCode}) {
  const STORAGE_KEY = `apex_reminders_${patientCode}`;
  const [reminders,setReminders] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); } catch { return []; }
  });
  const [modal,setModal] = useState(false);
  const [notifGranted,setNotifGranted] = useState(typeof Notification !== "undefined" && Notification.permission==="granted");
  const [form,setForm] = useState({title:"",body:"",type:"med",times:["08:00"],active:true});

  useNotifications(reminders);

  function save(updated) {
    setReminders(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function addReminder() {
    if(!form.title.trim()) return;
    const r = {...form, id: Date.now().toString(), times: form.times.filter(t=>t)};
    save([...reminders, r]);
    setModal(false);
    setForm({title:"",body:"",type:"med",times:["08:00"],active:true});
  }

  function toggleReminder(id) {
    save(reminders.map(r=>r.id===id?{...r,active:!r.active}:r));
  }

  function deleteReminder(id) {
    save(reminders.filter(r=>r.id!==id));
  }

  async function requestNotif() {
    if (typeof Notification === "undefined") return; const perm = await Notification.requestPermission();
    setNotifGranted(perm==="granted");
  }

  const typeConfig = {
    med:     {icon:"💊",label:"Medicamento",  color:C.cobalt},
    glucose: {icon:"🩸",label:"Glucosa",       color:C.emerald},
    bp:      {icon:"💉",label:"Presión",       color:C.scarlet},
    weight:  {icon:"⚖️", label:"Peso",          color:C.navy},
    water:   {icon:"💧",label:"Agua",          color:"#0EA5E9"},
    custom:  {icon:"⏰",label:"Personalizado", color:C.amber},
  };

  const QUICK = [
    {title:"Medicamento mañana",body:"Hora de tomar tu medicamento",type:"med",times:["08:00"]},
    {title:"Medicamento noche",body:"Hora de tomar tu medicamento",type:"med",times:["21:00"]},
    {title:"Glucosa en ayuno",body:"Mide tu glucosa antes de desayunar",type:"glucose",times:["07:00"]},
    {title:"Glucosa postprandial",body:"Han pasado 2h desde tu comida, mide tu glucosa",type:"glucose",times:["10:00","14:00","20:00"]},
    {title:"Presión arterial",body:"Registra tu presión arterial",type:"bp",times:["08:00","20:00"]},
    {title:"Peso diario",body:"Pésate en ayunas",type:"weight",times:["07:30"]},
  ];

  return (
    <div style={{paddingBottom:110}}>
      <Hdr title="Recordatorios" sub="Medicamentos · Glucosa · Presión" imgId="1576091160550-2173dba999ef" color="linear-gradient(145deg,#1E1B4B,#312E81)"/>
      <div style={{padding:"16px 16px 0"}}>
        {/* Notification permission */}
        {!notifGranted&&(
          <div style={{background:"#FEF9C3",border:"1px solid #FDE047",borderRadius:14,padding:"14px 16px",marginBottom:16}}>
            <div style={{fontWeight:700,color:"#713F12",marginBottom:4}}>⚠️ Activa las notificaciones</div>
            <div style={{color:"#92400E",fontSize:13,marginBottom:10}}>Para recibir recordatorios debes permitir las notificaciones del navegador.</div>
            <button onClick={requestNotif} style={{background:"#713F12",color:"#FFF",border:"none",borderRadius:10,padding:"10px 18px",fontWeight:700,fontSize:13}}>Activar notificaciones</button>
          </div>
        )}

        {notifGranted&&(
          <div style={{background:"#D1FAE5",border:"1px solid #86EFAC",borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#065F46",fontWeight:600}}>
            ✅ Notificaciones activas — recibirás alertas a tiempo
          </div>
        )}

        <PBtn onClick={()=>setModal(true)} style={{marginBottom:16}}>+ Crear recordatorio</PBtn>

        {/* Quick templates */}
        {reminders.length===0&&(
          <Card>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:C.ink,marginBottom:12}}>Plantillas rápidas</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {QUICK.map((q,i)=>{
                const tc=typeConfig[q.type];
                return(
                  <button key={i} onClick={()=>{save([...reminders,{...q,id:Date.now().toString()+"_"+i,active:true,body:q.body}]);}}
                    style={{display:"flex",alignItems:"center",gap:12,background:C.muted2,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",textAlign:"left"}}>
                    <span style={{fontSize:20,flexShrink:0}}>{tc.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:14,color:C.ink}}>{q.title}</div>
                      <div style={{fontSize:12,color:C.muted}}>{q.times.join(" · ")}</div>
                    </div>
                    <span style={{color:tc.color,fontSize:18}}>+</span>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Active reminders */}
        {reminders.length>0&&(
          <>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:C.ink,marginBottom:10}}>{reminders.length} recordatorio{reminders.length>1?"s":"configurado"}</div>
            {reminders.map(r=>{
              const tc=typeConfig[r.type]||typeConfig.custom;
              return(
                <Card key={r.id} style={{borderLeft:`4px solid ${r.active?tc.color:C.ghost}`,opacity:r.active?1:0.6}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                    <span style={{fontSize:24,flexShrink:0}}>{tc.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:15,color:C.ink}}>{r.title}</div>
                      {r.body&&<div style={{fontSize:12,color:C.muted,marginTop:2}}>{r.body}</div>}
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
                        {(r.times||[]).map(t=><span key={t} style={{background:tc.color+"18",color:tc.color,borderRadius:8,padding:"3px 10px",fontSize:12,fontWeight:700}}>⏰ {t}</span>)}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,flexShrink:0}}>
                      <button onClick={()=>toggleReminder(r.id)} style={{background:r.active?C.emerald+"22":C.muted2,color:r.active?C.emerald:C.muted,border:"none",borderRadius:8,padding:"6px 10px",fontWeight:700,fontSize:12}}>
                        {r.active?"ON":"OFF"}
                      </button>
                      <button onClick={()=>deleteReminder(r.id)} style={{background:"#FEE2E2",color:C.scarlet,border:"none",borderRadius:8,padding:"6px 10px",fontWeight:700,fontSize:12}}>✕</button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </div>

      {/* Add reminder modal */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(21,46,68,0.55)",zIndex:300,display:"flex",flexDirection:"column",justifyContent:"flex-end",backdropFilter:"blur(4px)"}}>
          <div style={{background:C.card,borderRadius:"24px 24px 0 0",padding:24,maxHeight:"80vh",overflowY:"auto",boxShadow:"0 -8px 48px rgba(21,46,68,0.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:C.ink}}>Nuevo recordatorio</div>
              <button onClick={()=>setModal(false)} style={{background:C.muted2,border:"none",borderRadius:"50%",width:34,height:34,fontSize:16,color:C.muted}}>✕</button>
            </div>

            <FL>Tipo</FL>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
              {Object.entries(typeConfig).map(([k,v])=>(
                <button key={k} onClick={()=>setForm(f=>({...f,type:k}))} style={{background:form.type===k?v.color:C.muted2,color:form.type===k?"#FFF":C.inkSec,border:`1px solid ${form.type===k?v.color:C.border}`,borderRadius:10,padding:"8px 12px",fontSize:13,fontWeight:600}}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>

            <FL>Título del recordatorio</FL>
            <SI placeholder="ej. Metformina 500mg" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={{marginBottom:14}}/>

            <FL>Descripción (opcional)</FL>
            <SI placeholder="ej. Tomar con el desayuno" value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} style={{marginBottom:14}}/>

            <FL>Horarios</FL>
            {form.times.map((t,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                <SI type="time" value={t} onChange={e=>{const ts=[...form.times];ts[i]=e.target.value;setForm(f=>({...f,times:ts}));}} style={{flex:1}}/>
                {form.times.length>1&&<button onClick={()=>setForm(f=>({...f,times:f.times.filter((_,j)=>j!==i)}))} style={{background:"#FEE2E2",color:C.scarlet,border:"none",borderRadius:8,padding:"10px 14px",fontWeight:700}}>✕</button>}
              </div>
            ))}
            <button onClick={()=>setForm(f=>({...f,times:[...f.times,"12:00"]}))} style={{background:C.muted2,color:C.inkSec,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:600,marginBottom:20,width:"100%"}}>
              + Agregar otro horario
            </button>

            <PBtn onClick={addReminder} disabled={!form.title.trim()}>Crear recordatorio</PBtn>
          </div>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════
// SCREEN: VIDEO — Videollamada con el Dr. Rogelio
// ══════════════════════════════════════════════════════
function VideoScreen({patientCode,profile}) {
  const [status,setStatus] = useState("idle"); // idle | waiting | in_call | ended
  const [callData,setCallData] = useState(null);
  const [checkInterval,setCheckInterval] = useState(null);

  useEffect(()=>{
    // Check if there's an active call on mount
    checkCallStatus();
    return ()=>{ if(checkInterval) clearInterval(checkInterval); };
  },[]);

  async function checkCallStatus() {
    const res = await apiData("call-status","GET");
    if(res.ok && res.data) {
      setCallData(res.data);
      if(res.data.status==="active") setStatus("in_call");
      else if(res.data.status==="waiting") setStatus("waiting");
    }
  }

  async function requestCall() {
    setStatus("waiting");
    const res = await apiData("request-call","POST",{patientName:profile.name||patientCode});
    if(res.ok) {
      setCallData(res.data);
      // Poll for doctor response every 5 seconds
      const interval = setInterval(async()=>{
        const check = await apiData("call-status","GET");
        if(check.ok && check.data?.status==="active") {
          setStatus("in_call");
          setCallData(check.data);
          clearInterval(interval);
        } else if(!check.ok || !check.data) {
          setStatus("idle");
          clearInterval(interval);
        }
      }, 5000);
      setCheckInterval(interval);
    } else {
      setStatus("idle");
      alert("Error al solicitar la llamada. Intenta de nuevo.");
    }
  }

  async function endCall() {
    if(checkInterval) clearInterval(checkInterval);
    await apiData("end-call","POST",{});
    setStatus("ended");
    setCallData(null);
  }

  // Jitsi call room
  if(status==="in_call" && callData?.room_name) {
    const jitsiUrl = `https://meet.jit.si/${callData.room_name}#config.prejoinPageEnabled=false&userInfo.displayName=${encodeURIComponent(profile.name||"Paciente")}`;
    return (
      <div style={{height:"100vh",display:"flex",flexDirection:"column"}}>
        <div style={{background:`linear-gradient(145deg,${C.navy},${C.navyMid})`,padding:"16px 20px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:C.emerald,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>📹</div>
          <div style={{flex:1}}>
            <div style={{color:"#FFF",fontWeight:700,fontSize:14}}>En consulta con Dr. Rogelio</div>
            <div style={{color:"rgba(255,255,255,0.55)",fontSize:11}}>Videollamada activa</div>
          </div>
          <button onClick={endCall} style={{background:C.scarlet,color:"#FFF",border:"none",borderRadius:10,padding:"9px 16px",fontWeight:700,fontSize:13}}>
            Terminar
          </button>
        </div>
        <iframe
          src={jitsiUrl}
          style={{flex:1,border:"none",width:"100%",background:"#111"}}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          title="Videollamada Dr. Rogelio"
        />
      </div>
    );
  }

  return (
    <div style={{paddingBottom:110}}>
      <div style={{background:"linear-gradient(145deg,#0A1628,#152E44)",padding:"56px 22px 28px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:180,height:180,borderRadius:"50%",background:"rgba(184,130,10,0.08)"}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:"#FFF",fontWeight:800}}>Consulta Virtual</div>
        <div style={{color:"rgba(255,255,255,0.55)",fontSize:14,marginTop:4}}>Videollamada con Dr. Rogelio Sánchez</div>
      </div>

      <div style={{padding:"24px 16px 0"}}>
        {/* Doctor card */}
        <Card style={{textAlign:"center",padding:"28px 20px"}}>
          <div style={{width:80,height:80,borderRadius:"50%",background:`linear-gradient(135deg,${C.navy},${C.navyMid})`,margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,boxShadow:"0 8px 24px rgba(21,46,68,0.3)"}}>👨‍⚕️</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.ink,fontWeight:800}}>Dr. Rogelio Sánchez</div>
          <div style={{color:C.muted,fontSize:13,marginTop:4}}>Internista · Nutriólogo · Diabetes</div>
          <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:12,flexWrap:"wrap"}}>
            {["Consulta general","Control glucosa","Nutrición","Seguimiento"].map(t=><span key={t} style={{background:C.muted2,color:C.muted,borderRadius:20,padding:"4px 12px",fontSize:12}}>{t}</span>)}
          </div>
        </Card>

        {/* Status messages */}
        {status==="idle"&&(
          <>
            <Card style={{background:C.navy,marginBottom:14}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:"#FFF",marginBottom:8}}>¿Cómo funciona?</div>
              {["Toca 'Iniciar consulta' abajo","El Dr. Rogelio recibirá una notificación","Cuando acepte, se abrirá la videollamada","Habla directamente con tu médico"].map((s,i)=>(
                <div key={i} style={{display:"flex",gap:10,marginBottom:8}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:C.gold,display:"flex",alignItems:"center",justifyContent:"center",color:"#000",fontSize:11,fontWeight:800,flexShrink:0}}>{i+1}</div>
                  <div style={{color:"rgba(255,255,255,0.75)",fontSize:13,paddingTop:3}}>{s}</div>
                </div>
              ))}
            </Card>
            <PBtn onClick={requestCall} color={C.emerald}>📹 Iniciar consulta con el Dr. Rogelio</PBtn>
          </>
        )}

        {status==="waiting"&&(
          <Card style={{textAlign:"center",padding:36,border:`2px solid ${C.amber}44`,background:C.amber+"08"}}>
            <div style={{width:64,height:64,borderRadius:"50%",background:C.amber+"22",margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,animation:"pulse 2s infinite"}}>📹</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.ink,marginBottom:8}}>Esperando al Dr. Rogelio...</div>
            <div style={{color:C.muted,fontSize:13,marginBottom:20,lineHeight:1.6}}>Tu solicitud fue enviada. El médico te atenderá en breve. Mantén la app abierta.</div>
            <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:20}}>
              {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:C.amber,animation:`pulse 1.2s ease ${i*0.2}s infinite`}}/>)}
            </div>
            <button onClick={()=>{endCall();setStatus("idle");}} style={{background:C.muted2,color:C.muted,border:"none",borderRadius:12,padding:"11px 20px",fontWeight:600,fontSize:14}}>
              Cancelar solicitud
            </button>
          </Card>
        )}

        {status==="ended"&&(
          <Card style={{textAlign:"center",padding:36}}>
            <div style={{fontSize:40,marginBottom:12}}>✅</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:C.ink,marginBottom:8}}>Consulta finalizada</div>
            <div style={{color:C.muted,fontSize:13,marginBottom:20}}>Gracias por tu consulta con el Dr. Rogelio.</div>
            <PBtn onClick={()=>setStatus("idle")}>Nueva consulta</PBtn>
          </Card>
        )}

        {/* Tips */}
        <Card style={{marginTop:8,borderLeft:`4px solid ${C.gold}`}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:C.ink,marginBottom:10}}>Para una mejor consulta</div>
          {["Busca un lugar con buena iluminación","Asegúrate de tener buena conexión a internet","Ten a la mano tus lecturas de glucosa y presión","Anota tus dudas antes de la llamada"].map((t,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:C.gold,marginTop:7,flexShrink:0}}/>
              <div style={{fontSize:13,color:C.inkSec}}>{t}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════
// SCREEN: NUTRICIÓN
// ══════════════════════════════════════════════════════
function Nutrition({profile,meals,setMeals}) {
  const [modal,setModal]=useState(false);
  const [query,setQuery]=useState("");
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [slot,setSlot]=useState("breakfast");
  const [dietPlan,setDietPlan]=useState(null);
  const [planLoad,setPlanLoad]=useState(false);
  const [view,setView]=useState("log");
  const SLOTS=[{k:"breakfast",l:"Desayuno",e:"🌅"},{k:"lunch",l:"Almuerzo",e:"☀️"},{k:"dinner",l:"Cena",e:"🌙"},{k:"snacks",l:"Snacks",e:"🍎"}];
  const totalCals=Object.values(meals).flat().reduce((s,f)=>s+f.cals,0);

  async function analyze(){
    if(!query.trim()) return;
    setLoading(true);
    const text=await callClaude(`Nutricionista. SOLO JSON sin texto extra:{"name":"nombre","cals":numero,"carbs":numero,"prot":numero,"fat":numero,"portion":"porción estimada"}`,query);
    try{setResult(JSON.parse(text.replace(/```json|```/g,"").trim()));}catch{setResult({name:query,cals:0,carbs:0,prot:0,fat:0,portion:""});}
    setLoading(false);
  }

  function addFood(){
    if(!result) return;
    setMeals(m=>({...m,[slot]:[...m[slot],result]}));
    setModal(false);setQuery("");setResult(null);
  }

  const [dietForm,setDietForm]=useState(()=>{try{return JSON.parse(localStorage.getItem("apex_dietform"))||{diabetes:false,renal:false,hepatic:false,hipertension:false,colesterol:false,alergias:"",otrosAntecedentes:""};}catch{return {diabetes:false,renal:false,hepatic:false,hipertension:false,colesterol:false,alergias:"",otrosAntecedentes:""};}});
  const [dietFormDone,setDietFormDone]=useState(()=>!!localStorage.getItem("apex_dietform"));const [dietError,setDietError]=useState(null);useEffect(()=>{if(dietFormDone&&!dietPlan&&!planLoad){genDiet();}},[dietFormDone]);

  async function genDiet(){
    setPlanLoad(true);
    const tdee=calcTDEE(profile),target=goalCals(tdee,profile.goal);
    const antecedentes=[];
    if(dietForm.diabetes) antecedentes.push("Diabetes mellitus - dieta baja en carbohidratos simples, indice glucemico bajo");
    if(dietForm.renal) antecedentes.push("Enfermedad renal - restriccion de potasio, fosforo y proteina moderada");
    if(dietForm.hepatic) antecedentes.push("Enfermedad hepatica - evitar alcohol, grasas saturadas, alta fibra");
    if(dietForm.hipertension) antecedentes.push("Hipertension - dieta DASH, bajo sodio menos de 1500mg/dia");
    if(dietForm.colesterol) antecedentes.push("Dislipidemia - reducir grasas saturadas, aumentar omega-3 y fibra");
    if(dietForm.alergias) antecedentes.push("Alergias/intolerancias: "+dietForm.alergias+" - EXCLUIR completamente estos alimentos");
    if(dietForm.otrosAntecedentes) antecedentes.push("Otros: "+dietForm.otrosAntecedentes);
    const antStr=antecedentes.length>0?"ANTECEDENTES CRITICOS:\n"+antecedentes.join("\n"):"Sin antecedentes especiales";
    const prompt=`Eres nutricionista clinico experto. Crea un plan de dieta PERSONALIZADO de lunes a domingo.

PACIENTE: ${profile.sex==="male"?"Hombre":"Mujer"}, ${profile.age} anos, ${profile.weight}kg, ${profile.height}cm
OBJETIVO: ${profile.goal==="lose"?"Perdida de peso":profile.goal==="gain"?"Ganancia muscular":profile.goal==="recomp"?"Recomposicion":"Mantenimiento"}
CALORIAS META: ${target} kcal/dia
${antStr}

INSTRUCCIONES:
- Adapta CADA comida a los antecedentes del paciente
- Varia los alimentos cada dia (no repetir el mismo desayuno)
- Incluye alimentos accesibles en Mexico
- Especifica porciones exactas (gramos o medidas caseras)
- Si hay diabetes: todos los alimentos deben ser bajo indice glucemico
- Si hay enfermedad renal: limita proteina a 0.6-0.8g/kg
- Excluye ABSOLUTAMENTE cualquier alergia indicada

RESPONDE SOLO JSON:
{"objetivo":"descripcion personalizada","caloriasDiarias":${target},"distribucionMacros":{"carbs":"Xg","proteina":"Xg","grasas":"Xg"},"restricciones":["restriccion1","restriccion2"],"dias":[{"dia":"Lunes","desayuno":{"descripcion":"alimento con porcion exacta","calorias":X},"almuerzo":{"descripcion":"alimento con porcion exacta","calorias":X},"cena":{"descripcion":"alimento con porcion exacta","calorias":X},"totalDia":X}],"consejos":["consejo1","consejo2","consejo3"]}`;
    const text=await callClaude("Nutricionista clinico experto. SOLO JSON valido sin texto extra ni backticks.",prompt,6000);
  try{setDietPlan(JSON.parse(text.replace(/```json|```/g,"").trim()));}catch{setDietPlan(null);setDietError(text.slice(0,400)||"vacio");}
    setPlanLoad(false);
  }

  return (
    <div style={{paddingBottom:110}}>
      <Hdr title="Nutrición" sub={`Consumido hoy: ${totalCals} kcal`} imgId="1546069901-ba9599a7e63c"/>
      <div style={{padding:"16px 16px 0"}}>
        <div style={{display:"flex",gap:8,marginBottom:18}}><Chip onClick={()=>setView("log")} active={view==="log"}>Registro</Chip><Chip onClick={()=>setView("plan")} active={view==="plan"}>Plan IA</Chip></div>
        {view==="log"&&SLOTS.map(s=>(
          <Card key={s.k}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:22}}>{s.e}</span>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15}}>{s.l}</div><div style={{fontSize:12,color:C.muted}}>{meals[s.k].reduce((a,f)=>a+f.cals,0)} kcal</div></div>
              <button onClick={()=>{setSlot(s.k);setModal(true);}} style={{background:C.navy,color:"#FFF",border:"none",borderRadius:10,padding:"8px 14px",fontWeight:700,fontSize:13}}>+ Añadir</button>
            </div>
            {meals[s.k].map((f,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderTop:`1px solid ${C.border}`,fontSize:14}}>
                <span style={{color:C.inkSec}}>{f.name}<span style={{color:C.ghost,fontSize:12}}> · {f.portion}</span></span>
                <span style={{color:C.gold,fontWeight:700}}>{f.cals}</span>
              </div>
            ))}
          </Card>
        ))}
        {view==="plan"&&(
          <>
            {dietError&&<Card><div style={{color:"red",fontSize:12,whiteSpace:"pre-wrap"}}>{dietError}</div></Card>}{!dietPlan&&!planLoad&&!dietFormDone&&<Card>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:C.ink,marginBottom:4}}>Plan de dieta personalizado</div>
            <div style={{color:C.muted,fontSize:13,marginBottom:16}}>Responde para que la IA adapte tu plan a tus condiciones.</div>
            <FL>Antecedentes médicos</FL>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {[{k:"diabetes",l:"Diabetes mellitus"},{k:"renal",l:"Enfermedad renal"},{k:"hepatic",l:"Enfermedad hepática"},{k:"hipertension",l:"Hipertensión arterial"},{k:"colesterol",l:"Colesterol/Triglicéridos altos"}].map(item=>(
                <button key={item.k} onClick={()=>setDietForm(f=>({...f,[item.k]:!f[item.k]}))} style={{display:"flex",alignItems:"center",gap:12,background:dietForm[item.k]?C.navy+"15":C.muted2,border:`1.5px solid ${dietForm[item.k]?C.navy:C.border}`,borderRadius:12,padding:"11px 14px",textAlign:"left"}}>
                  <div style={{width:22,height:22,borderRadius:6,background:dietForm[item.k]?C.navy:C.card,border:`2px solid ${dietForm[item.k]?C.navy:C.ghost}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {dietForm[item.k]&&<span style={{color:"#FFF",fontSize:13,fontWeight:800}}>✓</span>}
                  </div>
                  <span style={{fontSize:14,color:C.ink,fontWeight:dietForm[item.k]?700:400}}>{item.l}</span>
                </button>
              ))}
            </div>
            <FL>Alergias o intolerancias alimentarias</FL>
            <SI placeholder="ej. mariscos, gluten, lácteos, cacahuate..." value={dietForm.alergias} onChange={e=>setDietForm(f=>({...f,alergias:e.target.value}))} style={{marginBottom:14}}/>
            <FL>Otros antecedentes relevantes</FL>
            <SI placeholder="ej. gastritis, hipotiroidismo, embarazo..." value={dietForm.otrosAntecedentes} onChange={e=>setDietForm(f=>({...f,otrosAntecedentes:e.target.value}))} style={{marginBottom:18}}/>
            <PBtn onClick={()=>{setDietFormDone(true);localStorage.setItem("apex_dietform",JSON.stringify(dietForm));genDiet();}}>Generar mi plan personalizado →</PBtn>
          </Card>}
            {planLoad&&<Card style={{textAlign:"center",padding:36}}><Spin/><div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:C.navy}}>Creando tu plan...</div></Card>}
            {dietPlan&&<>
              <Card style={{background:C.navy}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:"#FFF",marginBottom:6}}>{dietPlan.caloriasDiarias} kcal/día</div><div style={{color:"rgba(255,255,255,0.6)",fontSize:13}}>{dietPlan.objetivo}</div></Card>
              {(dietPlan.dias||[]).map((d,i)=><Card key={i}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:15}}>{d.dia}</div><Badge color={C.navy}>{d.kcal} kcal</Badge></div>{[["Desayuno",d.desayuno],["Almuerzo",d.almuerzo],["Cena",d.cena],["Snack",d.snack]].map(([t,c])=>c&&<div key={t} style={{marginBottom:8,paddingLeft:10,borderLeft:`3px solid ${C.deep}`}}><div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{t}</div><div style={{fontSize:13,color:C.inkSec}}>{c}</div></div>)}</Card>)}
              <PBtn onClick={()=>{setDietPlan(null);genDiet();}} color={C.deep} textColor={C.navy}>Regenerar</PBtn>
            </>}
          </>
        )}
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(21,46,68,0.55)",zIndex:300,display:"flex",flexDirection:"column",justifyContent:"flex-end",backdropFilter:"blur(4px)"}}>
          <div style={{background:C.card,borderRadius:"24px 24px 0 0",padding:24,maxHeight:"88vh",overflowY:"auto",boxShadow:"0 -8px 48px rgba(21,46,68,0.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:C.ink}}>Añadir alimento</div>
              <button onClick={()=>{setModal(false);setResult(null);setQuery("");}} style={{background:C.muted2,border:"none",borderRadius:"50%",width:34,height:34,fontSize:16,color:C.muted}}>✕</button>
            </div>
            <FL>Comida</FL>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>{SLOTS.map(s=><Chip key={s.k} onClick={()=>setSlot(s.k)} active={slot===s.k}>{s.e} {s.l}</Chip>)}</div>
            <FL>Describe el alimento o plato</FL>
            <textarea value={query} onChange={e=>setQuery(e.target.value)} placeholder="ej. 2 huevos revueltos con queso, tortilla de maíz y jugo de naranja" style={{background:C.muted2,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"13px 16px",color:C.ink,fontSize:14,width:"100%",height:80,resize:"none",outline:"none"}}/>
            <PBtn onClick={analyze} disabled={loading||!query.trim()} style={{marginTop:14}}>{loading?"Analizando con IA...":"Calcular calorías"}</PBtn>
            {result&&(
              <div style={{marginTop:14,background:C.muted2,borderRadius:16,padding:16}}>
                <div style={{fontWeight:700,fontSize:15,color:C.ink,marginBottom:4}}>{result.name}</div>
                <div style={{color:C.muted,fontSize:12,marginBottom:12}}>{result.portion}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>{[{l:"Cal",v:result.cals,c:C.navy},{l:"Carbs",v:result.carbs+"g",c:C.cobalt},{l:"Prot",v:result.prot+"g",c:C.gold},{l:"Grasa",v:result.fat+"g",c:C.emerald}].map(m=><div key={m.l} style={{background:C.card,borderRadius:12,padding:"10px 6px",textAlign:"center",boxShadow:C.shadow}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:800,color:m.c}}>{m.v}</div><div style={{fontSize:9,color:C.muted,textTransform:"uppercase"}}>{m.l}</div></div>)}</div>
                <PBtn onClick={addFood}>Añadir a {SLOTS.find(s=>s.k===slot)?.l}</PBtn>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════
// SCREEN: EJERCICIO
// ══════════════════════════════════════════════════════
function Exercise({profile,exerciseLog,setExerciseLog,workoutPlan,setWorkoutPlan}) {
  const [modal,setModal]=useState(false);
  const [activeCat,setActiveCat]=useState("Todos");
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState(null);
  const [mins,setMins]=useState("30");
  const [wLoad,setWLoad]=useState(false);
  const [view,setView]=useState("log");

  const filtered=useMemo(()=>EXERCISES.filter(e=>(activeCat==="Todos"||e.cat===activeCat)&&e.name.toLowerCase().includes(search.toLowerCase())),[activeCat,search]);
  const totalBurned=exerciseLog.reduce((s,e)=>s+e.burned,0);

  function addEx(){
    if(!selected) return;
    setExerciseLog(l=>[...l,{...selected,mins:+mins,burned:burnedCals(selected.met,+profile.weight,+mins)}]);
    setModal(false);setSelected(null);setMins("30");
  }

  async function genWorkout(){
    setWLoad(true);
    const text=await callClaude(`Entrenador personal certificado. SOLO JSON válido sin texto extra.`,`Plan semanal. ${profile.sex},${profile.age}a,${profile.weight}kg,objetivo:${profile.goal},nivel:${profile.activity}.\nJSON:{"objetivo":"...","semanas":8,"split":[{"dia":"Lunes","nombre":"...","tipo":"Fuerza","duracion":"X min","ejercicios":[{"nombre":"...","series":"3x12","descanso":"60s","nota":"..."}],"cardio":"cardio opcional"}],"principios":["p1","p2"],"progresion":"..."}`,1500);
    try{setWorkoutPlan(JSON.parse(text.replace(/```json|```/g,"").trim()));}catch{setWorkoutPlan(null);}
    setWLoad(false);
  }

  // Videos from plan
  const planExercises=useMemo(()=>{
    if(!workoutPlan?.split) return [];
    const results=[];
    workoutPlan.split.forEach(day=>{
      (day.ejercicios||[]).forEach(ex=>{
        const found=EXERCISES.find(e=>e.name.toLowerCase()===ex.nombre.toLowerCase())||{img:"1534438327276-14e5300c3a48",cat:day.tipo||"Fuerza"};
        results.push({name:ex.nombre,img:found.img,cat:found.cat,day:day.dia});
      });
    });
    return results;
  },[workoutPlan]);

  return (
    <div style={{paddingBottom:110}}>
      <Hdr title="Ejercicio" sub={`Quemado hoy: ${totalBurned} kcal`} imgId="1534438327276-14e5300c3a48"/>
      <div style={{padding:"16px 16px 0"}}>
        <div style={{display:"flex",gap:8,marginBottom:18,overflowX:"auto"}}>
          <Chip onClick={()=>setView("log")} active={view==="log"}>📋 Registro</Chip>
          <Chip onClick={()=>setView("plan")} active={view==="plan"}>💪 Rutina IA</Chip>
          <Chip onClick={()=>setView("videos")} active={view==="videos"}>▶ Videos</Chip>
        </div>

        {view==="log"&&<>
          <PBtn onClick={()=>setModal(true)} style={{marginBottom:16}}>+ Registrar ejercicio</PBtn>
          {exerciseLog.length===0?<Card style={{textAlign:"center",padding:28}}><div style={{fontSize:36,marginBottom:10}}>💪</div><div style={{color:C.muted,fontSize:14}}>Registra tu primer ejercicio del día</div></Card>:exerciseLog.map((e,i)=>(
            <Card key={i}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{e.name}</div><div style={{color:C.muted,fontSize:12}}>{e.mins} min · {e.cat}</div></div>
                <div style={{textAlign:"center"}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:C.scarlet,fontWeight:800,lineHeight:1}}>{e.burned}</div><div style={{fontSize:9,color:C.scarlet}}>kcal</div></div>
              </div>
            </Card>
          ))}
        </>}

        {view==="plan"&&<>
          {!workoutPlan&&!wLoad&&<Card style={{textAlign:"center",padding:28}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:C.ink,marginBottom:8}}>Tu rutina personalizada</div><div style={{color:C.muted,fontSize:13,marginBottom:18}}>Plan de 8 semanas basado en tu perfil y objetivo.</div><PBtn onClick={genWorkout}>Generar mi rutina</PBtn></Card>}
          {wLoad&&<Card style={{textAlign:"center",padding:36}}><Spin/><div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:C.navy}}>Diseñando tu rutina...</div></Card>}
          {workoutPlan&&<>
            <Card style={{background:C.navy}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:"#FFF",marginBottom:6}}>{workoutPlan.semanas} semanas · {workoutPlan.split?.length} días/semana</div><div style={{color:"rgba(255,255,255,0.6)",fontSize:13}}>{workoutPlan.objetivo}</div></Card>
            <button onClick={()=>setView("videos")} style={{display:"flex",alignItems:"center",gap:12,width:"100%",background:"#FF000015",border:"1px solid #FF000030",borderRadius:14,padding:"12px 16px",marginBottom:14,textAlign:"left"}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:"#FF0000",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><div style={{width:0,height:0,borderTop:"7px solid transparent",borderBottom:"7px solid transparent",borderLeft:"13px solid #FFF",marginLeft:3}}/></div>
              <div><div style={{fontWeight:700,fontSize:14,color:"#CC0000"}}>Ver videos de tu rutina</div><div style={{fontSize:12,color:C.muted}}>Tutoriales en YouTube</div></div>
            </button>
            {(workoutPlan.split||[]).map((d,i)=>(
              <Card key={i}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:C.ink}}>{d.dia}</div><div style={{fontSize:12,color:C.muted}}>{d.nombre}</div></div>
                  <Badge color={C.cobalt}>{d.duracion}</Badge>
                </div>
                {(d.ejercicios||[]).map((ex,j)=>(
                  <div key={j} style={{padding:"8px 0",borderTop:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontWeight:600,fontSize:13}}>{ex.nombre}</span>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <span style={{background:C.goldPale,color:C.gold,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{ex.series}</span>
                        <button onClick={()=>ytSearch(ex.nombre)} style={{width:26,height:26,borderRadius:"50%",background:"#FF0000",border:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><div style={{width:0,height:0,borderTop:"5px solid transparent",borderBottom:"5px solid transparent",borderLeft:"9px solid #FFF",marginLeft:2}}/></button>
                      </div>
                    </div>
                    {ex.nota&&<div style={{fontSize:11,color:C.muted,marginTop:3}}>Descanso {ex.descanso} · {ex.nota}</div>}
                  </div>
                ))}
                {d.cardio&&<div style={{marginTop:8,background:C.scarlet+"10",borderRadius:8,padding:"7px 10px",fontSize:12,color:C.scarlet}}>{d.cardio}</div>}
              </Card>
            ))}
            <PBtn onClick={()=>{setWorkoutPlan(null);genWorkout();}} color={C.deep} textColor={C.navy}>Regenerar rutina</PBtn>
          </>}
        </>}

        {view==="videos"&&<>
          <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:10,marginBottom:14}}>
            {["Mi rutina",...Array.from(new Set(EXERCISES.map(e=>e.cat)))].map(c=>(
              <button key={c} onClick={()=>setActiveCat(c)} style={{background:activeCat===c?"#FF0000":C.card,color:activeCat===c?"#FFF":C.muted,border:`1px solid ${activeCat===c?"#FF0000":C.border}`,borderRadius:20,padding:"7px 14px",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{c==="Mi rutina"?"▶ Mi Rutina":c}</button>
            ))}
          </div>
          <SI placeholder="Buscar ejercicio..." value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:14}}/>
          {activeCat==="Mi rutina"?(
            planExercises.length===0?(
              <Card style={{textAlign:"center",padding:32}}><div style={{fontSize:40,marginBottom:10}}>▶</div><div style={{color:C.muted,fontSize:14,marginBottom:16}}>Genera tu rutina primero para ver los videos.</div><PBtn onClick={()=>setView("plan")}>Generar rutina</PBtn></Card>
            ):planExercises.filter(e=>!search||e.name.toLowerCase().includes(search.toLowerCase())).map((ex,i)=>(
              <button key={i} onClick={()=>ytSearch(ex.name)} style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:18,overflow:"hidden",boxShadow:C.shadow,display:"block",textAlign:"left",padding:0,marginBottom:12}}>
                <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:"#FF0000",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><div style={{width:0,height:0,borderTop:"8px solid transparent",borderBottom:"8px solid transparent",borderLeft:"16px solid #FFF",marginLeft:4}}/></div>
                  <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,color:C.ink}}>{ex.name}</div><div style={{fontSize:12,color:C.muted}}>Toca para ver tutorial · {ex.day}</div></div>
                  <Badge color={C.navy}>{ex.cat}</Badge>
                </div>
              </button>
            ))
          ):(
            (search?EXERCISES.filter(e=>e.name.toLowerCase().includes(search.toLowerCase())):EXERCISES.filter(e=>e.cat===activeCat)).map((ex,i)=>(
              <button key={i} onClick={()=>ytSearch(ex.name)} style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12,textAlign:"left",boxShadow:C.shadow}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:"#FF0000",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><div style={{width:0,height:0,borderTop:"7px solid transparent",borderBottom:"7px solid transparent",borderLeft:"13px solid #FFF",marginLeft:3}}/></div>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:C.ink}}>{ex.name}</div><div style={{fontSize:11,color:C.muted}}>YouTube · {ex.cat}</div></div>
              </button>
            ))
          )}
        </>}
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(21,46,68,0.55)",zIndex:300,display:"flex",flexDirection:"column",justifyContent:"flex-end",backdropFilter:"blur(4px)"}}>
          <div style={{background:C.card,borderRadius:"24px 24px 0 0",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 -8px 48px rgba(21,46,68,0.2)"}}>
            <div style={{padding:"20px 20px 0",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:C.ink}}>Registrar ejercicio</div>
                <button onClick={()=>{setModal(false);setSelected(null);}} style={{background:C.muted2,border:"none",borderRadius:"50%",width:34,height:34,fontSize:16,color:C.muted}}>✕</button>
              </div>
              <SI placeholder="Buscar ejercicio..." value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:10}}/>
              <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:10}}>
                {EX_CATS.map(c=><button key={c} onClick={()=>setActiveCat(c)} style={{background:activeCat===c?C.navy:C.muted2,color:activeCat===c?"#FFF":C.muted,border:"none",borderRadius:20,padding:"7px 14px",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{c}</button>)}
              </div>
            </div>
            <div style={{overflowY:"auto",flex:1,padding:"4px 20px 8px"}}>
              {filtered.map(e=>(
                <button key={e.name} onClick={()=>setSelected(e)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"11px 0",background:"none",border:"none",borderBottom:`1px solid ${C.border}`,textAlign:"left"}}>
                  <div style={{width:40,height:40,borderRadius:10,background:C.muted2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>💪</div>
                  <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13,color:selected?.name===e.name?C.navy:C.ink}}>{e.name}</div><div style={{fontSize:11,color:C.muted}}>{e.cat} · MET {e.met}</div></div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <button onClick={ev=>{ev.stopPropagation();ytSearch(e.name);}} style={{width:24,height:24,borderRadius:"50%",background:"#FF0000",border:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><div style={{width:0,height:0,borderTop:"4px solid transparent",borderBottom:"4px solid transparent",borderLeft:"8px solid #FFF",marginLeft:2}}/></button>
                    {selected?.name===e.name&&<div style={{width:22,height:22,background:C.navy,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#FFF",fontSize:13}}>✓</div>}
                  </div>
                </button>
              ))}
            </div>
            {selected&&(
              <div style={{padding:"14px 20px 28px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
                <div style={{fontWeight:700,fontSize:14,color:C.ink,marginBottom:12}}>{selected.name}</div>
                <FL>Duración (minutos)</FL>
                <SI type="number" value={mins} onChange={e=>setMins(e.target.value)} style={{marginBottom:10}}/>
                <div style={{display:"flex",alignItems:"center",gap:12,background:C.muted2,borderRadius:12,padding:"10px 16px",marginBottom:12}}>
                  <div style={{flex:1,fontSize:13,color:C.muted}}>Calorías estimadas</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:C.scarlet,fontWeight:800}}>{burnedCals(selected.met,+profile.weight,+mins)} kcal</div>
                </div>
                <PBtn onClick={addEx}>Añadir ejercicio</PBtn>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════
// SCREEN: CHAT IA
// ══════════════════════════════════════════════════════
function Chat({profile,workoutPlan,meals,exerciseLog}) {
  const [msgs,setMsgs]=useState([{role:"assistant",content:`¡Hola ${profile.name}! 👋 Soy tu coach de salud personalizado del Dr. Rogelio Sánchez.\n\nConozco tu perfil y puedo ayudarte con ejercicios, nutrición, glucosa y más. ¿En qué te ayudo hoy?`}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);

  const totalCalToday=Object.values(meals).flat().reduce((s,f)=>s+(f.cals||0),0);
  const burnedToday=exerciseLog.reduce((s,e)=>s+e.burned,0);
  const sysPrompt=`Eres el coach de salud personalizado del Dr. Rogelio Sánchez.\nPerfil: ${profile.name}, ${profile.sex==="male"?"H":"M"}, ${profile.age}a, ${profile.weight}kg, ${profile.height}cm.\nObjetivo: ${profile.goal}, Actividad: ${profile.activity}, TDEE: ${calcTDEE(profile)} kcal.\n${workoutPlan?`Plan activo: ${workoutPlan.objetivo}.`:""}\nHoy: ${totalCalToday} kcal consumidas, ${burnedToday} quemadas.\nResponde en español, conciso (máx 3 párrafos), empático. Para decisiones médicas o de tratamiento, siempre referir al Dr. Rogelio.`;

  const QUICK=[{icon:"💪",text:"¿Cómo mejoro mi técnica en la sentadilla?"},{icon:"🥗",text:"¿Qué debo comer antes de entrenar?"},{icon:"🔥",text:"¿Cuántas calorías quemo corriendo 30 min?"},{icon:"😴",text:"¿Cuánto afecta el sueño al rendimiento?"},{icon:"📈",text:"¿Cuánto tiempo tarda en verse resultados?"},{icon:"🩺",text:"¿Qué suplementos básicos recomiendas?"}];

  async function send(text){
    const userText=text||input;
    if(!userText.trim()||loading) return;
    const newMsgs=[...msgs,{role:"user",content:userText}];
    setMsgs(newMsgs);setInput("");setLoading(true);
    const reply=await callClaude(sysPrompt,newMsgs.map(m=>({role:m.role,content:m.content})),700);
    setMsgs(m=>[...m,{role:"assistant",content:reply||"Lo siento, hubo un problema. Intenta de nuevo."}]);
    setLoading(false);
  }

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",paddingBottom:80}}>
      <div style={{background:`linear-gradient(145deg,#0A1A2E,${C.navy})`,padding:"52px 20px 16px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:C.gold,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:`0 4px 16px ${C.gold}66`}}>🤖</div>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#FFF",fontWeight:800}}>Coach Dr. Rogelio</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",display:"flex",alignItems:"center",gap:5}}><div style={{width:6,height:6,borderRadius:"50%",background:"#22C55E"}}/>IA personal disponible 24/7</div>
          </div>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"16px 16px 8px"}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:12}}>
            {m.role==="assistant"&&<div style={{width:32,height:32,borderRadius:"50%",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,marginRight:8,marginTop:2}}>🤖</div>}
            <div style={{maxWidth:"80%",background:m.role==="user"?C.navy:C.card,color:m.role==="user"?"#FFF":C.ink,borderRadius:m.role==="user"?"20px 20px 4px 20px":"20px 20px 20px 4px",padding:"12px 16px",fontSize:14,lineHeight:1.7,boxShadow:C.shadow,border:m.role==="assistant"?`1px solid ${C.border}`:"none",whiteSpace:"pre-wrap"}}>
              {m.content}
            </div>
            {m.role==="user"&&<div style={{width:32,height:32,borderRadius:"50%",background:C.gold,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,marginLeft:8,marginTop:2}}>👤</div>}
          </div>
        ))}
        {loading&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🤖</div>
          <div style={{background:C.card,borderRadius:"20px 20px 20px 4px",padding:"14px 18px",boxShadow:C.shadow,border:`1px solid ${C.border}`,display:"flex",gap:5,alignItems:"center"}}>
            {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:C.navy,animation:`pulse 1.2s ease ${i*0.2}s infinite`}}/>)}
          </div>
        </div>}
        {msgs.length===1&&!loading&&(
          <div style={{marginTop:8}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Preguntas rápidas</div>
            {QUICK.map((q,i)=><button key={i} onClick={()=>send(q.text)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"11px 14px",textAlign:"left",fontSize:14,color:C.inkSec,display:"flex",gap:10,alignItems:"center",boxShadow:C.shadow,width:"100%",marginBottom:8}}><span style={{fontSize:18,flexShrink:0}}>{q.icon}</span><span>{q.text}</span></button>)}
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div style={{position:"fixed",bottom:70,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:C.bg,borderTop:`1px solid ${C.border}`,padding:"12px 16px"}}>
        <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
          <textarea ref={null} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Escribe tu pregunta..." rows={1} style={{flex:1,background:C.card,border:`1.5px solid ${C.border}`,borderRadius:20,padding:"12px 16px",color:C.ink,fontSize:14,resize:"none",outline:"none",lineHeight:1.5,maxHeight:120}}/>
          <button onClick={()=>send()} disabled={!input.trim()||loading} style={{width:48,height:48,borderRadius:"50%",background:input.trim()&&!loading?C.navy:C.muted2,border:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:input.trim()&&!loading?C.shadowMd:"none",transition:"all 0.2s"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={input.trim()&&!loading?"#FFF":C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════
// SCREEN: TENIS
// ══════════════════════════════════════════════════════
function Tenis({profile}) {
  const [trainType,setTrainType]=useState("running");
  const [arch,setArch]=useState("neutral");
  const [budget,setBudget]=useState("mid");
  const [recs,setRecs]=useState(null);
  const [loading,setLoading]=useState(false);
  const BC={Nike:"#E35205",Adidas:"#000",ASICS:"#1A365D",Brooks:"#005BAC","New Balance":"#CC0000",Hoka:"#2B9BB8",Saucony:"#E31937","On Running":"#3B3B3B"};

  async function generate(){
    setLoading(true);
    const text=await callClaude(`Experto en calzado deportivo 2024-2025. SOLO JSON válido sin texto extra ni backticks.`,`Tenis para: tipo ${trainType}, arco ${arch}, presupuesto ${budget}, objetivo ${profile.goal}.\nJSON:{"intro":"2 oraciones","modelos":[{"marca":"Nike","modelo":"nombre exacto 2024-2025","precio":"$XXX USD","descripcion":"2 oraciones","tecnologia":"tech principal","nivel":"principiante/intermedio/avanzado","puntuacion":9.2,"dropMM":"Xmm","pesoGramos":"XXXg"}],"consejos":["c1","c2","c3"]}`,1000);
    try{setRecs(JSON.parse(text.replace(/```json|```/g,"").trim()));}catch{setRecs(null);}
    setLoading(false);
  }

  const TYPES=[{v:"running",l:"Running",sub:"Calle/Asfalto"},{v:"trail",l:"Trail",sub:"Montaña"},{v:"gym",l:"Gym/Fuerza",sub:"Sala de pesas"},{v:"hiit",l:"HIIT",sub:"Entrenamiento mixto"},{v:"daily",l:"Diario",sub:"Caminar/Casual"},{v:"sports",l:"Deportes",sub:"Multideporte"}];

  return (
    <div style={{paddingBottom:110}}>
      <Hdr title="Calzado" sub="Los tenis perfectos para tu entrenamiento" imgId="1519682337426-7a249477a643"/>
      <div style={{padding:"16px 16px 0"}}>
        <Card>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.ink,marginBottom:14}}>¿Para qué actividad?</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            {TYPES.map(o=><button key={o.v} onClick={()=>setTrainType(o.v)} style={{borderRadius:12,border:`2px solid ${trainType===o.v?C.navy:C.border}`,background:trainType===o.v?C.navy:C.card,padding:"12px 10px",textAlign:"left"}}>
              <div style={{fontWeight:700,fontSize:12,color:trainType===o.v?"#FFF":C.ink}}>{o.l}</div>
              <div style={{fontSize:10,color:trainType===o.v?"rgba(255,255,255,0.6)":C.muted}}>{o.sub}</div>
            </button>)}
          </div>
          <FL>Tipo de arco</FL>
          <div style={{display:"flex",gap:8,marginBottom:14}}>{[{v:"flat",l:"Plano"},{v:"neutral",l:"Neutro"},{v:"high",l:"Pronunciado"}].map(o=><Chip key={o.v} onClick={()=>setArch(o.v)} active={arch===o.v}>{o.l}</Chip>)}</div>
          <FL>Presupuesto</FL>
          <div style={{display:"flex",gap:8,marginBottom:18}}>{[{v:"low",l:"$50–100 USD"},{v:"mid",l:"$100–180 USD"},{v:"high",l:"$180+ USD"}].map(o=><Chip key={o.v} onClick={()=>setBudget(o.v)} active={budget===o.v}>{o.l}</Chip>)}</div>
          <PBtn onClick={generate} disabled={loading}>{loading?"Buscando modelos...":"Ver mis recomendaciones"}</PBtn>
        </Card>
        {loading&&<Card style={{textAlign:"center",padding:32}}><Spin/><div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:C.navy}}>Analizando modelos 2024-2025...</div></Card>}
        {recs&&<>
          <Card style={{background:C.navy,borderLeft:`4px solid ${C.gold}`}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:"#FFF",marginBottom:6}}>Guía de selección</div><div style={{color:"rgba(255,255,255,0.65)",fontSize:13,lineHeight:1.6}}>{recs.intro}</div></Card>
          {(recs.modelos||[]).map((m,i)=>{const bc=BC[m.marca]||C.navy;return(
            <Card key={i} style={{overflow:"hidden",padding:0}}>
              <div style={{height:4,background:bc}}/>
              <div style={{padding:"14px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div><div style={{fontSize:10,color:bc,fontWeight:800,textTransform:"uppercase"}}>{m.marca}</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:C.ink,fontWeight:800}}>{m.modelo}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{m.nivel}</div></div>
                  <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}><div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:bc,fontWeight:800}}>{m.precio}</div><div style={{fontSize:11,color:C.muted}}>⭐ {m.puntuacion}/10</div></div>
                </div>
                <div style={{fontSize:13,color:C.inkSec,lineHeight:1.6,marginBottom:10}}>{m.descripcion}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Badge color={bc}>{m.tecnologia}</Badge>{m.dropMM&&<Badge color={C.cobalt}>Drop {m.dropMM}</Badge>}{m.pesoGramos&&<Badge color={C.emerald}>{m.pesoGramos}g</Badge>}</div>
              </div>
            </Card>
          );})}
          {recs.consejos&&<Card><div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:C.ink,marginBottom:10}}>Consejos de compra</div>{recs.consejos.map((t,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:8}}><div style={{width:6,height:6,borderRadius:"50%",background:C.gold,marginTop:7,flexShrink:0}}/><div style={{fontSize:13,color:C.inkSec,lineHeight:1.6}}>{t}</div></div>)}</Card>}
          <PBtn onClick={()=>{setRecs(null);generate();}} color={C.deep} textColor={C.navy}>Buscar más opciones</PBtn>
        </>}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════
// SCREEN: EJERCICIO
// ══════════════════════════════════════════════════════
const NAV=[
  {l:"Inicio",  icon:"🏠"},
  {l:"Glucosa", icon:"🩸"},
  {l:"Recorda.",icon:"💊"},
  {l:"Video",   icon:"📹",special:true},
  {l:"Nutrición",icon:"🥗"},
  {l:"Ejercicio",icon:"💪"},
  {l:"Chat IA", icon:"🤖"},
];

export default function PatientApp({patientCode,onLogout}) {
  useEffect(function() {
    if (!patientCode) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    var VAPID_PUBLIC_KEY = "BC5rW_ZryFDUbAcVel0cGWu6VWcv9EmP0ppMS9qFhUv12v6Mkkgzu0exa9LOUwi3TuEnpNIZpiNud2WhADxvXd8";
    function urlBase64ToUint8Array(base64String) {
      var padding = '='.repeat((4 - base64String.length % 4) % 4);
      var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      var rawData = window.atob(base64);
      var outputArray = new Uint8Array(rawData.length);
      for (var i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
      return outputArray;
    }
    navigator.serviceWorker.ready.then(function(reg) {
      if (typeof Notification !== "undefined" && Notification.permission === "default") { Notification.requestPermission(); }
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      reg.pushManager.getSubscription().then(function(existing) {
        function send(sub) {
          fetch("/api/push-subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patientCode: patientCode, subscription: sub })
          }).catch(function(){});
        }
        if (existing) { send(existing); }
        else {
          reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          }).then(send).catch(function(){});
        }
      });
    });
  }, [patientCode]);

  const [profile,setProfile]=useState(()=>{try{return JSON.parse(localStorage.getItem("apex_profile")||"null");}catch{return null;}});
  useEffect(()=>{apiData("get-profile","GET").then(r=>{if(r.ok&&r.profile){setProfile(r.profile);localStorage.setItem("apex_profile",JSON.stringify(r.profile));}});},[]);
  const [tab,setTab]=useState(0);
  const [meals,setMeals]=useState({breakfast:[],lunch:[],dinner:[],snacks:[]});
  const [exerciseLog,setExerciseLog]=useState([]);
  const [workoutPlan,setWorkoutPlan]=useState(null);

  function saveProfile(p){
    localStorage.setItem("apex_profile",JSON.stringify(p));apiData("save-profile","POST",{profile:p}).catch(()=>{});
    setProfile(p);
  }

  if(!profile||!profile.weight||!profile.height) return <Setup onComplete={saveProfile}/>;

  const screens=[
    <Dashboard profile={profile} meals={meals} exerciseLog={exerciseLog} setTab={setTab}/>,
    <GlucosaScreen profile={profile} patientCode={patientCode}/>,
    <Recordatorios patientCode={patientCode}/>,
    <VideoScreen patientCode={patientCode} profile={profile}/>,
    <Nutrition profile={profile} meals={meals} setMeals={setMeals}/>,
    <Exercise profile={profile} exerciseLog={exerciseLog} setExerciseLog={setExerciseLog} workoutPlan={workoutPlan} setWorkoutPlan={setWorkoutPlan}/>,
    <Chat profile={profile} workoutPlan={workoutPlan} meals={meals} exerciseLog={exerciseLog}/>,
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,position:"relative"}}>
      <div className={tab===6?"":"fade-up"} key={tab}>{screens[tab]}</div>

      {/* Logout button (top right corner, discreet) */}
      {tab===0&&<button onClick={onLogout} style={{position:"fixed",top:16,right:16,zIndex:99,background:"rgba(21,46,68,0.15)",color:C.muted,border:"none",borderRadius:20,padding:"6px 12px",fontSize:11,fontWeight:600}}>Salir</button>}

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(255,255,255,0.97)",backdropFilter:"blur(16px)",borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100,boxShadow:"0 -4px 24px rgba(21,46,68,0.10)",overflowX:"auto"}}>
        {NAV.map((n,i)=>{
          const isVideo=i===3;
          const isActive=tab===i;
          return (
            <button key={n.l} onClick={()=>setTab(i)} style={{flex:"1 0 auto",minWidth:50,padding:"8px 2px 14px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",position:"relative",transition:"opacity 0.2s"}}>
              {isActive&&<div style={{position:"absolute",top:0,left:"20%",right:"20%",height:2.5,borderRadius:2,background:isVideo?C.emerald:C.navy}}/>}
              {isVideo?(
                <div style={{width:34,height:34,borderRadius:10,background:isActive?C.emerald:C.emerald+"AA",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:isActive?C.shadowMd:"none",transition:"all 0.25s"}}>
                  📹
                </div>
              ):(
                <span style={{fontSize:20,lineHeight:1,filter:isActive?"none":"grayscale(30%) opacity(0.55)",transition:"filter 0.2s"}}>
                  {n.icon}
                </span>
              )}
              <span style={{fontSize:9,fontWeight:isActive?700:500,color:isActive?(isVideo?C.emerald:C.navy):C.muted,letterSpacing:"0.01em",lineHeight:1,whiteSpace:"nowrap"}}>
                {n.l}
                    </span>
</button>
          );
          })}
      </div>
    </div>
  );
}
