const ALLOWED = (process.env.ACCESS_CODES || "").split(",").map(c => c.trim()).filter(Boolean);
const DOCTOR_PW = process.env.DOCTOR_PASSWORD || "";
const H = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Content-Type":"application/json"};
const hits = new Map();

exports.handler = async (event) => {
  if(event.httpMethod==="OPTIONS") return {statusCode:200,headers:H,body:""};
  if(event.httpMethod!=="POST") return {statusCode:405,headers:H,body:JSON.stringify({error:"Method not allowed"})};
  const ip = event.headers["x-nf-client-connection-ip"] || (event.headers["x-forwarded-for"]||"").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 20) return {statusCode:429,headers:H,body:JSON.stringify({error:"Demasiadas solicitudes. Intenta de nuevo en un minuto."})};
  recent.push(now);
  hits.set(ip, recent);
  if ((event.body || "").length > 80000) return {statusCode:413,headers:H,body:JSON.stringify({error:"La solicitud es demasiado grande."})};
  let body;
  try{body=JSON.parse(event.body||"{}");} catch{return {statusCode:400,headers:H,body:JSON.stringify({error:"JSON invalido"})};}
  const code = (body.accessCode||"").trim();
  const drCode = DOCTOR_PW ? "DR-ROGELIO-"+DOCTOR_PW : "";
  const isDr = Boolean(drCode) && code === drCode;
  const isPt = ALLOWED.includes(code);
  if(!isDr && !isPt){
    return {statusCode:401,headers:H,body:JSON.stringify({error:"Codigo invalido o suscripcion vencida."})};
  }
  try{
    const res = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},
      body:JSON.stringify({model:"claude-sonnet-5",max_tokens:Math.min(body.max_tokens||800, 2000),system:String(body.system||"").slice(0,8000),messages:Array.isArray(body.messages)?body.messages.slice(-20):[]}),
    });
    const data = await res.json();
    if(!res.ok) return {statusCode:res.status,headers:H,body:JSON.stringify({error:data?.error?.message||"Error de API"})};
    return {statusCode:200,headers:H,body:JSON.stringify(data)};
  }catch(err){return {statusCode:500,headers:H,body:JSON.stringify({error:"Error interno"})};}
};
