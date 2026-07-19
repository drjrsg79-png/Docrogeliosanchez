const { createClient } = require("@supabase/supabase-js");
const webpush = require("web-push");
const DOCTOR_PW = process.env.DOCTOR_PASSWORD || "";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function getSupabase() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:contacto@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: HEADERS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: HEADERS, body: "Method not allowed" };
    const body405check = JSON.parse(event.body || "{}");
    if ((body405check.doctorPassword || "") !== DOCTOR_PW) {
      return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: "Acceso no autorizado" }) };
    }

  try {
    const body = JSON.parse(event.body || "{}");
    const patientCode = (body.patientCode || "").trim();
    const title = body.title || "Dr. Rogelio Sanchez";
    const message = body.body || "";

    if (!patientCode) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Falta patientCode" }) };
    }

    const supabase = getSupabase();
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("patient_code", patientCode);

    if (error) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: error.message }) };
    }
    if (!subs || subs.length === 0) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, sent: 0, note: "Paciente sin suscripcion push activa" }) };
    }

    const payload = JSON.stringify({ title, body: message, tag: `doctor-${Date.now()}`, url: "/" });

    let sent = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification({
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        }, payload);
        sent++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, sent }) };
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: e.message }) };
  }
};
