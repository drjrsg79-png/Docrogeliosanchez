const { createClient } = require('@supabase/supabase-js');
const DOCTOR_PW = process.env.DOCTOR_PASSWORD || "";
const H = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Content-Type":"application/json"};
function sb(){return createClient(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);}

function generateSlots(startTime, endTime, slotMin) {
  const slots = [];
  const [sh,sm] = startTime.split(":").map(Number);
  const [eh,em] = endTime.split(":").map(Number);
  let cur = sh*60+sm;
  const end = eh*60+em;
  while(cur+slotMin <= end) {
    const h = Math.floor(cur/60), m = cur%60;
    slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    cur += slotMin;
  }
  return slots;
}

exports.handler = async (event) => {
  if(event.httpMethod==="OPTIONS") return {statusCode:200,headers:H,body:""};
  const p=event.queryStringParameters||{};
  const b=event.httpMethod!=="GET"?JSON.parse(event.body||"{}"):{}; 
  const action=p.action||b.action;
  try{
    // PUBLICO - ver disponibilidad general
    if(action==="get-availability"){
      const {data:avail}=await sb().from("doctor_availability").select("*").eq("active",true).order("day_of_week");
      const {data:blocked}=await sb().from("blocked_dates").select("*").gte("date",new Date().toISOString().slice(0,10));
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true,availability:avail||[],blocked:blocked||[]})};
    }
    // PUBLICO - obtener slots disponibles para una fecha
    if(action==="get-slots"){
      const date = p.date||b.date;
      if(!date) return {statusCode:400,headers:H,body:JSON.stringify({error:"Fecha requerida"})};
      const dow = new Date(date+"T12:00:00").getDay();
      const {data:avail}=await sb().from("doctor_availability").select("*").eq("day_of_week",dow).eq("active",true).maybeSingle();
      if(!avail) return {statusCode:200,headers:H,body:JSON.stringify({ok:true,slots:[],reason:"Dia no disponible"})};
      const {data:blocked}=await sb().from("blocked_dates").select("*").eq("date",date);
      if(blocked&&blocked.length>0&&blocked.some(b=>b.full_day)) return {statusCode:200,headers:H,body:JSON.stringify({ok:true,slots:[],reason:"Fecha bloqueada"})};
      const {data:booked}=await sb().from("appointments").select("preferred_time").eq("preferred_date",date).in("status",["pending","confirmed"]);
      const bookedTimes=(booked||[]).map(a=>a.preferred_time);
      const blockedTimes=(blocked||[]).filter(b=>!b.full_day).map(b=>b.start_time);
      const allSlots=generateSlots(avail.start_time,avail.end_time,avail.slot_minutes||40);
      const available=allSlots.filter(s=>!bookedTimes.includes(s)&&!blockedTimes.includes(s));
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true,slots:available})};
    }
    // PUBLICO - solicitar cita
    if(action==="book"&&event.httpMethod==="POST"){
      const {data,error}=await sb().from("appointments").insert({patient_name:b.name,patient_phone:b.phone,patient_email:b.email||"",reason:b.reason,preferred_date:b.date,preferred_time:b.time,status:"pending",patient_code:b.patientCode||null}).select().single();
      if(error)throw error;
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true,data})};
    }
    // DOCTOR - ver citas
    if(action==="list"){
      if(p.doctorPassword!==DOCTOR_PW)return {statusCode:401,headers:H,body:JSON.stringify({error:"No autorizado"})};
      const {data,error}=await sb().from("appointments").select("*").order("preferred_date",{ascending:true}).order("preferred_time",{ascending:true});
      if(error)throw error;
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true,data})};
    }
    // DOCTOR - actualizar cita
    if(action==="update"&&event.httpMethod==="POST"){
      if(b.doctorPassword!==DOCTOR_PW)return {statusCode:401,headers:H,body:JSON.stringify({error:"No autorizado"})};
      await sb().from("appointments").update({status:b.status,doctor_notes:b.notes||"",confirmed_date:b.confirmedDate||null,confirmed_time:b.confirmedTime||null}).eq("id",b.id);
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true})};
    }
    // DOCTOR - configurar disponibilidad
    if(action==="set-availability"&&event.httpMethod==="POST"){
      if(b.doctorPassword!==DOCTOR_PW)return {statusCode:401,headers:H,body:JSON.stringify({error:"No autorizado"})};
      for(const slot of b.slots){
        await sb().from("doctor_availability").upsert({day_of_week:slot.day_of_week,start_time:slot.start_time,end_time:slot.end_time,slot_minutes:slot.slot_minutes||40,active:slot.active});
      }
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true})};
    }
    // DOCTOR - bloquear fecha u hora
    if(action==="block-date"&&event.httpMethod==="POST"){
      if(b.doctorPassword!==DOCTOR_PW)return {statusCode:401,headers:H,body:JSON.stringify({error:"No autorizado"})};
      const {data,error}=await sb().from("blocked_dates").insert({date:b.date,reason:b.reason||"",full_day:b.fullDay!==false,start_time:b.startTime||null,end_time:b.endTime||null}).select().single();
      if(error)throw error;
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true,data})};
    }
    // DOCTOR - desbloquear
    if(action==="unblock-date"&&event.httpMethod==="POST"){
      if(b.doctorPassword!==DOCTOR_PW)return {statusCode:401,headers:H,body:JSON.stringify({error:"No autorizado"})};
      await sb().from("blocked_dates").delete().eq("id",b.id);
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true})};
    }
    return {statusCode:404,headers:H,body:JSON.stringify({error:"No encontrado"})};
  }catch(err){return {statusCode:500,headers:H,body:JSON.stringify({error:err.message})};}
};// appointments v2
