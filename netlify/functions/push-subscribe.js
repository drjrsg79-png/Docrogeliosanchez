const { createClient } = require("@supabase/supabase-js");

const ALLOWED = (process.env.ACCESS_CODES || "").split(",").map(c => c.trim());

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

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: HEADERS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: HEADERS, body: "Method not allowed" };

  try {
    const body = JSON.parse(event.body || "{}");
    const patientCode = (body.patientCode || "").trim();
    const subscription = body.subscription;

    if (!ALLOWED.includes(patientCode)) {
      return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: "Codigo invalido" }) };
    }
    if (!subscription || !subscription.endpoint) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: "Suscripcion invalida" }) };
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({
        patient_code: patientCode,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh || "",
        auth: subscription.keys?.auth || "",
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });

    if (error) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: e.message }) };
  }
};
