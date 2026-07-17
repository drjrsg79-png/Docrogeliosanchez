// appointments.js — sin dependencias npm, usa Supabase REST API directo
const SB_URL = process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DR_PW = process.env.DOCTOR_PASSWORD || "";
const H = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Content-Type":"application/json"};

async function sb(table, method="GET", body=null, filters="") {
  const res = await fetch(`${SB_URL}/rest/v1/${table}${filters}`, {
    method,
    headers: {"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Content-Type":"application/json","Prefer":method==="POST"?"return=representation":""},
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function genSlots(start, end, mins) {
  const slots = [];
  const [sh,sm] = start.split(":").map(Number);
  const [eh,em] = end.split(":").map(Number);
  let cur = sh*60+sm;
  const fin = eh*60+em;
  while(cur+mins <= fin) {
    slots.push(String(Math.floor(cur/60)).padStart(2,"0")+":"+String(cur%60).padStart(2,"0"));
    cur += mins;
  }
  return slots;
}

exports.handler = async (event) => {
  if(event.httpMethod==="OPTIONS") return {statusCode:200,headers:H,body:""};
  const p = event.queryStringParameters || {};
  const b = event.httpMethod !== "GET" ? JSON.parse(event.body||"{}") : {};
  const action = p.action || b.action;
  try {
    if(action==="get-availability") {
      const today = new Date().toISOString().slice(0,10);
      const avail = await sb("doctor_availability","GET",null,"?active=eq.true&order=day_of_week");
      const blocked = await sb("blocked_dates","GET",null,"?date=gte."+today);
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true,availability:avail||[],blocked:blocked||[]})};
    }
    if(action==="get-slots") {
      const date = p.date || b.date;
      if(!date) return {statusCode:400,headers:H,body:JSON.stringify({error:"Fecha requerida"})};
      const dow = new Date(date+"T12:00:00").getDay();
      const avail = await sb("doctor_availability","GET",null,"?day_of_week=eq."+dow+"&active=eq.true");
      if(!avail||avail.length===0) return {statusCode:200,headers:H,body:JSON.stringify({ok:true,slots:[],reason:"Dia no disponible"})};
      const av = avail[0];
      const blocked = await sb("blocked_dates","GET",null,"?date=eq."+date);
      if(blocked&&blocked.some(x=>x.full_day)) return {statusCode:200,headers:H,body:JSON.stringify({ok:true,slots:[],reason:"Fecha bloqueada"})};
      const booked = await sb("appointments","GET",null,"?preferred_date=eq."+date+"&status=in.(pending,confirmed)&select=preferred_time");
      const bookedT = (booked||[]).map(x=>x.preferred_time);
      const blockedT = (blocked||[]).filter(x=>!x.full_day).map(x=>x.start_time);
      const all = genSlots(av.start_time, av.end_time, av.slot_minutes||40);
      const free = all.filter(s=>!bookedT.includes(s)&&!blockedT.includes(s));
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true,slots:free})};
    }
    if(action==="book"&&event.httpMethod==="POST") {
      const row = await sb("appointments","POST",{patient_name:b.name,patient_phone:b.phone,patient_email:b.email||"",reason:b.reason,preferred_date:b.date,preferred_time:b.time,status:"pending",patient_code:b.patientCode||null});
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true,data:row})};
    }
    if(action==="list") {
      if(p.doctorPassword!==DR_PW) return {statusCode:401,headers:H,body:JSON.stringify({error:"No autorizado"})};
      const data = await sb("appointments","GET",null,"?order=preferred_date.asc,preferred_time.asc");
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true,data:data||[]})};
    }
    if(action==="update"&&event.httpMethod==="POST") {
      if(b.doctorPassword!==DR_PW) return {statusCode:401,headers:H,body:JSON.stringify({error:"No autorizado"})};
      await sb("appointments","PATCH",{status:b.status,doctor_notes:b.notes||"",confirmed_date:b.confirmedDate||null,confirmed_time:b.confirmedTime||null},"?id=eq."+b.id);
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true})};
    }
    if(action==="set-availability"&&event.httpMethod==="POST") {
      if(b.doctorPassword!==DR_PW) return {statusCode:401,headers:H,body:JSON.stringify({error:"No autorizado"})};
      for(const slot of b.slots) {
        const exists = await sb("doctor_availability","GET",null,"?day_of_week=eq."+slot.day_of_week);
        if(exists&&exists.length>0) await sb("doctor_availability","PATCH",{start_time:slot.start_time,end_time:slot.end_time,slot_minutes:slot.slot_minutes||40,active:slot.active},"?day_of_week=eq."+slot.day_of_week);
        else await sb("doctor_availability","POST",{day_of_week:slot.day_of_week,start_time:slot.start_time||"09:30",end_time:slot.end_time||"16:00",slot_minutes:slot.slot_minutes||40,active:slot.active});
      }
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true})};
    }
    if(action==="block-date"&&event.httpMethod==="POST") {
      if(b.doctorPassword!==DR_PW) return {statusCode:401,headers:H,body:JSON.stringify({error:"No autorizado"})};
      const row = await sb("blocked_dates","POST",{date:b.date,reason:b.reason||"",full_day:b.fullDay!==false,start_time:b.startTime||null,end_time:b.endTime||null});
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true,data:row})};
    }
    if(action==="unblock-date"&&event.httpMethod==="POST") {
      if(b.doctorPassword!==DR_PW) return {statusCode:401,headers:H,body:JSON.stringify({error:"No autorizado"})};
      await sb("blocked_dates","DELETE",null,"?id=eq."+b.id);
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true})};
    }
    return {statusCode:404,headers:H,body:JSON.stringify({error:"Accion no encontrada"})};
  } catch(err) {
    return {statusCode:500,headers:H,body:JSON.stringify({error:err.message})};
  }
};