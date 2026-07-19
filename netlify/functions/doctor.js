// netlify/functions/doctor.js — Panel del Dr. Rogelio
const { createClient } = require('@supabase/supabase-js');

const DOCTOR_PW = process.env.DOCTOR_PASSWORD || "";
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function getSupabase() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function validateDoctor(event) {
  const body = event.httpMethod !== "GET" ? JSON.parse(event.body || "{}") : {};
  const params = event.queryStringParameters || {};
  const pw = body.doctorPassword || params.doctorPassword || "";
  return pw === DOCTOR_PW;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: HEADERS, body: "" };
  if (action === "self-register" && event.httpMethod === "POST") {
    const sb = getSupabase();
    const { data: existing } = await sb.from("patients").select("code").order("code", { ascending: false }).limit(1);
    let nextNum = 1;
    if (existing && existing.length > 0) {
      const m = existing[0].code.match(/APEX-(\d+)/);
      if (m) nextNum = parseInt(m[1], 10) + 1;
    }
    const newCode = `APEX-${String(nextNum).padStart(4, "0")}`;
    const { data, error } = await sb.from("patients").insert({ code: newCode, name: body.name, active: true, notes: body.notes || "" }).select().single();
    if (error) throw error;
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, code: newCode, data }) };
  }
  if (!validateDoctor(event)) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: "Acceso no autorizado" }) };
  }

  const sb = getSupabase();
  const params = event.queryStringParameters || {};
  const body = event.httpMethod !== "GET" ? JSON.parse(event.body || "{}") : {};
  const action = params.action || body.action;

  try {
    // ── Dashboard principal: últimas lecturas de todos los pacientes ──
    if (action === "dashboard" || !action) {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [readingsRes, callsRes, patientsRes] = await Promise.all([
        sb.from("readings").select("*").gte("created_at", since).order("created_at", { ascending: false }),
        sb.from("call_requests").select("*").in("status", ["waiting", "active"]).order("created_at", { ascending: false }),
        sb.from("patients").select("*").eq("active", true).order("name"),
      ]);

      if (readingsRes.error) throw readingsRes.error;

      // Agrupar lecturas por paciente
      const byPatient = {};
      (readingsRes.data || []).forEach(r => {
        if (!byPatient[r.patient_code]) byPatient[r.patient_code] = { glucose: [], bp: [], weight: [] };
        if (r.type === "glucose") byPatient[r.patient_code].glucose.push(r);
        else if (r.type === "blood_pressure") byPatient[r.patient_code].bp.push(r);
        else if (r.type === "weight") byPatient[r.patient_code].weight.push(r);
      });

      // Marcar lecturas como leídas por doctor
      const unread = (readingsRes.data || []).filter(r => !r.read_by_doctor).map(r => r.id);
      if (unread.length > 0) {
        sb.from("readings").update({ read_by_doctor: true }).in("id", unread); // fire-and-forget
      }

      return {
        statusCode: 200, headers: HEADERS,
        body: JSON.stringify({
          ok: true,
          patients: patientsRes.data || [],
          readingsByPatient: byPatient,
          pendingCalls: callsRes.data || [],
          lastUpdated: new Date().toISOString(),
        }),
      };
    }

    // ── Todas las lecturas de un paciente específico ──
    if (action === "patient-history") {
      const { data, error } = await sb.from("readings")
        .select("*").eq("patient_code", params.code)
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data }) };
    }

    // ── Agregar paciente ──
    if (action === "add-patient" && event.httpMethod === "POST") {
      const { data, error } = await sb.from("patients").upsert({
        code: body.code.trim().toUpperCase(),
        name: body.name,
        active: true,
        notes: body.notes || "",
      }).select().single();
      if (error) throw error;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data }) };
    }

    // ── Desactivar paciente ──
    if (action === "deactivate-patient" && event.httpMethod === "POST") {
      await sb.from("patients").update({ active: false }).eq("code", body.code);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
    }

    // ── Agregar nota del médico ──
    if (action === "add-note" && event.httpMethod === "POST") {
      const { data, error } = await sb.from("doctor_notes").insert({
        patient_code: body.patientCode,
        note: body.note,
      }).select().single();
      if (error) throw error;
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data }) };
    }

    // ── Responder videollamada ──
    if (action === "answer-call" && event.httpMethod === "POST") {
      await sb.from("call_requests").update({ status: "active" }).eq("id", body.callId);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
    }

    // ── Terminar videollamada ──
    if (action === "end-call" && event.httpMethod === "POST") {
      await sb.from("call_requests").update({ status: "ended" }).eq("id", body.callId);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: "Acción no encontrada" }) };
  } catch (err) {
    console.error("doctor.js error:", err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
