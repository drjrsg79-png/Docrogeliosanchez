const { createClient } = require("@supabase/supabase-js");
function getSupabase(){ return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); }
const ALLOWED = (process.env.ACCESS_CODES || "").split(",").map(c => c.trim());
const DOCTOR_PW = process.env.DOCTOR_PASSWORD || "";
const H = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Content-Type":"application/json"};

exports.handler = async (event) => {
  if(event.httpMethod==="OPTIONS") return {statusCode:200,headers:H,body:""};
  if(event.httpMethod!=="POST") return {statusCode:405,headers:H,body:JSON.stringify({error:"Method not allowed"})};
  let body;
  try{body=JSON.parse(event.body||"{}");} catch{return {statusCode:400,headers:H,body:JSON.stringify({error:"JSON invalido"})};}
  const code = (body.accessCode||"").trim();
  const drCode = "DR-ROGELIO-"+DOCTOR_PW;
  const isDr = code === drCode;
  let isPt = ALLOWED.includes(code);
  if (!isPt) { try { const sb = getSupabase(); const { data: pt } = await sb.from("patients").select("code,active").eq("code", code).maybeSingle(); if (pt && pt.active) isPt = true; } catch (e) {} }
  if(!isDr && !isPt){
    return {statusCode:401,headers:H,body:JSON.stringify({error:"Codigo invalido o suscripcion vencida."})};
  }
  try{
    const res = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},
      body:JSON.stringify({model:"claude-sonnet-5",max_tokens:body.max_tokens||800,system:body.system||"",messages:body.messages||[]}),
    });
    const data = await res.json();
    if(!res.ok) return {statusCode:res.status,headers:H,body:JSON.stringify({error:data?.error?.message||"Error de API"})};
    return {statusCode:200,headers:H,body:JSON.stringify(data)};
  }catch(err){return {statusCode:500,headers:H,body:JSON.stringify({error:"Error interno"})};}
};// v1784282993
