// netlify/functions/data.js — Operaciones de datos del paciente
const { createClient } = require('@supabase/supabase-js');

const ALLOWED = (process.env.ACCESS_CODES || "").split(",").map(c => c.trim());

async function sendTelegram(text) {
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }),
    });
  } catch (e) { console.error("telegram error", e); }
}

function getSupabase() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: HEADERS, body: "" };

  const body = event.httpMethod !== "GET" ? JSON.parse(event.body || "{}") : {};
  const params = event.queryStringParameters || {};

  // Obtener código del paciente
  const code = (body.patientCode || params.patientCode || "").trim();
  if (!ALLOWED.includes(code)) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: "Código inválido" }) };
  }

  const sb = getSupabase();
  const action = params.action || body.action || event.path.split("/").pop();

  try {
    // ── LECTURAS (glucosa, presión, peso) ──────────────
    if (action === "save-reading" && event.httpMethod === "POST") {
      const { data, error } = await sb.from("readings").insert({
        patient_code: code,
        type: body.type,           // 'glucose' | 'blood_pressure' | 'weight'
        value: body.value,         // número principal
        value2: body.value2,       // diastólica para PA
        moment: body.moment,       // 'fasting' | 'post_meal' | etc
        notes: body.notes || "",
        read_by_doctor: false,
      }).select().single();
      if (error) throw error;
    if (!error) { await sendTelegram(`📋 <b>${body.patientName || "Paciente"}</b>\nTipo: ${body.type}\nValor: ${body.value}${body.value2 ? "/" + body.value2 : ""}\nMomento: ${body.moment || ""}`); }
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data }) };
    }

    if (action === "get-readings" && event.httpMethod === "GET") {
      const { data, error } = await sb.from("readings")
        .select("*")
        .eq("patient_code", code)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data }) };
    }

    // ── MEDICAMENTOS ───────────────────────────────────
    if (action === "save-meds" && event.httpMethod === "POST") {
      // Borrar meds actuales y re-insertar
      await sb.from("medications").delete().eq("patient_code", code);
      if (body.medications?.length > 0) {
        const rows = body.medications.map(m => ({ ...m, patient_code: code }));
        const { error } = await sb.from("medications").insert(rows);
        if (error) throw error;
      }
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
    }

    if (action === "get-meds" && event.httpMethod === "GET") {
      const { data, error } = await sb.from("medications")
        .select("*").eq("patient_code", code).eq("active", true);
      if (error) throw error;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data }) };
    }

    // ── SOLICITAR VIDEOLLAMADA ─────────────────────────
    if (action === "request-call" && event.httpMethod === "POST") {
      // Cancelar solicitudes previas del mismo paciente
      await sb.from("call_requests").update({ status: "cancelled" })
        .eq("patient_code", code).eq("status", "waiting");

      const { data, error } = await sb.from("call_requests").insert({
        patient_code: code,
        patient_name: body.patientName || code,
        status: "waiting",
        room_name: `apexdr${code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
      }).select().single();
      if (error) throw error;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data }) };
    }

    if (action === "end-call" && event.httpMethod === "POST") {
      await sb.from("call_requests").update({ status: "ended" })
        .eq("patient_code", code).in("status", ["waiting", "active"]);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
    }

    if (action === "call-status" && event.httpMethod === "GET") {
      const { data, error } = await sb.from("call_requests")
        .select("*").eq("patient_code", code)
        .not("status", "in", '("cancelled","ended")')
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data }) };
    }

    return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: "Acción no encontrada" }) };
  } catch (err) {
    console.error("data.js error:", err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
