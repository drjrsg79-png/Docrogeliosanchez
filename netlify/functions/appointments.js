const { createClient } = require('@supabase/supabase-js');
const DOCTOR_PW = process.env.DOCTOR_PASSWORD || "";
const H = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Content-Type":"application/json"};
function sb(){return createClient(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);}

exports.handler = async (event) => {
  if(event.httpMethod==="OPTIONS") return {statusCode:200,headers:H,body:""};
  const p=event.queryStringParameters||{};
  const b=event.httpMethod!=="GET"?JSON.parse(event.body||"{}"):{}; 
  const action=p.action||b.action;
  try{
    // PUBLICO - ver disponibilidad
    if(action==="get-availability"){
      const {data:avail}=await sb().from("doctor_availability").select("*").eq("active",true).order("day_of_week");
      const {data:blocked}=await sb().from("blocked_dates").select("*").gte("date",new Date().toISOString().slice(0,10));
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true,availability:avail||[],blocked:blocked||[]})};
    }
    // PUBLICO - solicitar cita
    if(action==="book"&&event.httpMethod==="POST"){
      const {data,error}=await sb().from("appointments").insert({patient_name:b.name,patient_phone:b.phone,patient_email:b.email||"",reason:b.reason,preferred_date:b.date,preferred_time:b.time,status:"pending",patient_code:b.patientCode||null}).select().single();
      if(error)throw error;
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true,data})};
    }
    // DOCTOR - ver citas
    if(action==="list"&&event.httpMethod==="GET"){
      if(p.doctorPassword!==DOCTOR_PW)return {statusCode:401,headers:H,body:JSON.stringify({error:"No autorizado"})};
      const {data,error}=await sb().from("appointments").select("*").order("created_at",{ascending:false});
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
      await sb().from("doctor_availability").upsert(b.slots);
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true})};
    }
    // DOCTOR - bloquear fecha
    if(action==="block-date"&&event.httpMethod==="POST"){
      if(b.doctorPassword!==DOCTOR_PW)return {statusCode:401,headers:H,body:JSON.stringify({error:"No autorizado"})};
      const {data,error}=await sb().from("blocked_dates").insert({date:b.date,reason:b.reason||"",full_day:b.fullDay!==false,start_time:b.startTime||null,end_time:b.endTime||null}).select().single();
      if(error)throw error;
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true,data})};
    }
    // DOCTOR - desbloquear fecha
    if(action==="unblock-date"&&event.httpMethod==="POST"){
      if(b.doctorPassword!==DOCTOR_PW)return {statusCode:401,headers:H,body:JSON.stringify({error:"No autorizado"})};
      await sb().from("blocked_dates").delete().eq("id",b.id);
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true})};
    }
    return {statusCode:404,headers:H,body:JSON.stringify({error:"No encontrado"})};
  }catch(err){return {statusCode:500,headers:H,body:JSON.stringify({error:err.message})};}
};