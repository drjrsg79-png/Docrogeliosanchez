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
    if(action==="book"&&event.httpMethod==="POST"){
      const {data,error}=await sb().from("appointments").insert({patient_name:b.name,patient_phone:b.phone,patient_email:b.email||"",reason:b.reason,preferred_date:b.date,preferred_time:b.time,status:"pending",patient_code:b.patientCode||null}).select().single();
      if(error)throw error;
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true,data})};
    }
    if(action==="list"&&event.httpMethod==="GET"){
      if(p.doctorPassword!==DOCTOR_PW)return {statusCode:401,headers:H,body:JSON.stringify({error:"No autorizado"})};
      const {data,error}=await sb().from("appointments").select("*").order("created_at",{ascending:false});
      if(error)throw error;
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true,data})};
    }
    if(action==="update"&&event.httpMethod==="POST"){
      if(b.doctorPassword!==DOCTOR_PW)return {statusCode:401,headers:H,body:JSON.stringify({error:"No autorizado"})};
      await sb().from("appointments").update({status:b.status,doctor_notes:b.notes||""}).eq("id",b.id);
      return {statusCode:200,headers:H,body:JSON.stringify({ok:true})};
    }
    return {statusCode:404,headers:H,body:JSON.stringify({error:"No encontrado"})};
  }catch(err){return {statusCode:500,headers:H,body:JSON.stringify({error:err.message})};}
};
