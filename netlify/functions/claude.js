// netlify/functions/claude.js — Proxy seguro para Anthropic API
const ALLOWED = (process.env.ACCESS_CODES || "").split(",").map(c => c.trim());
const DOCTOR_PW = process.env.DOCTOR_PASSWORD || "";

exports.handler = async (event) => {
  const h = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: h, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: h, body: JSON.stringify({ error: "Method not allowed" }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: h, body: JSON.stringify({ error: "JSON inválido" }) }; }

  // Validar código (paciente o doctor)
  const code = (body.accessCode || "").trim();
  const isDr = code === `DR-ROGELIO-${DOCTOR_PW}`;
  const isPt = ALLOWED.includes(code);
  if (!isDr && !isPt) {
    return { statusCode: 401, headers: h, body: JSON.stringify({ error: "Código de acceso inválido o suscripción vencida." }) };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: body.max_tokens || 800, system: body.system || "", messages: body.messages || [] }),
    });
    const data = await res.json();
    if (!res.ok) return { statusCode: res.status, headers: h, body: JSON.stringify({ error: data?.error?.message || "Error de API" }) };
    return { statusCode: 200, headers: h, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers: h, body: JSON.stringify({ error: "Error interno." }) };
  }
};
