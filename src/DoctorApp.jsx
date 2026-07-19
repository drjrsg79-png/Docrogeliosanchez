import { useState, useEffect, useCallback } from "react";

const C = {
  bg: "#080F1A", bg2: "#0D1825", bg3: "#111F30", card: "#0F1E30",
  navy: "#152E44", navyMid: "#1E4568", gold: "#C8902A", goldLight: "#E8B84B",
  text: "#EDE9E3", muted: "#5A7A99", border: "rgba(255,255,255,0.07)",
  emerald: "#22C55E", scarlet: "#EF4444", amber: "#F59E0B", cobalt: "#3B82F6",
  shadow: "0 4px 24px rgba(0,0,0,0.4)",
};

function glStatus(val, type = "general") {
  if (val < 70) return { l: "Hipo", c: "#A855F7" };
  if (type === "fasting") {
    if (val <= 99) return { l: "Normal", c: C.emerald };
    if (val <= 125) return { l: "Prediabetes", c: C.amber };
    return { l: "Diabético", c: C.scarlet };
  }
  if (val <= 139) return { l: "Normal", c: C.emerald };
  if (val <= 179) return { l: "Elevada", c: C.amber };
  return { l: "Alta", c: C.scarlet };
}

function bpStatus(sys) {
  if (sys < 120) return { l: "Normal", c: C.emerald };
  if (sys < 130) return { l: "Elevada", c: C.amber };
  if (sys < 140) return { l: "Alta grado 1", c: "#F97316" };
  return { l: "Crisis", c: C.scarlet };
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-MX", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function DCard({ children, style }) {
  return <div style={{ background: C.card, borderRadius: 18, padding: "16px 18px", marginBottom: 12, boxShadow: C.shadow, border: `1px solid ${C.border}`, ...style }}>{children}</div>;
}

function StatPill({ val, unit, label, color }) {
  return (
    <div style={{ background: (color || C.cobalt) + "18", borderRadius: 10, padding: "8px 12px", textAlign: "center", border: `1px solid ${(color || C.cobalt)}30` }}>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 800, color: color || C.cobalt, lineHeight: 1 }}>{val ?? "—"}<span style={{ fontSize: 11 }}>{unit}</span></div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
    </div>
  );
}

export default function DoctorApp({ doctorCode, onLogout }) {
  const [tab, setTab] = useState("pacientes");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selPatient, setSelPatient] = useState(null);
  const [patHistory, setPatHistory] = useState([]);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPat, setNewPat] = useState({ code: "", name: "", notes: "" });
  const [noteInput, setNoteInput] = useState("");
  const [reminderInput, setReminderInput] = useState("");
  const [callActive, setCallActive] = useState(null); // {room_name, patient_name, id}
  const [lastPendingCount, setLastPendingCount] = useState(0);
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [newBlock, setNewBlock] = useState({date:"",reason:""});
  const DAYS = ["Dom","Lun","Mar","Mie","Jue","Vie","Sab"];
  const [apptLoad, setApptLoad] = useState(false);

  const doctorPassword = doctorCode.replace("DR-ROGELIO-", "");

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/doctor?action=dashboard&doctorPassword=${doctorPassword}`);
      const data = await res.json();
      if (data.ok) {
        setDashboard(data);
        // Alert for new call requests
        const pending = (data.pendingCalls || []).length;
        if (pending > lastPendingCount && lastPendingCount !== null) {
          if (typeof Notification !== "undefined" && Notification.permission === "granted" && pending > 0) {
            new Notification("📹 Videollamada entrante", { body: `${data.pendingCalls[0]?.patient_name} está esperando.`, icon: "/icon-192.png" });
          }
        }
        setLastPendingCount(pending);
      }
    } catch {}
    setLoading(false);
  }, [doctorPassword, lastPendingCount]);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // refresh each 30s
    if (typeof Notification !== "undefined") Notification.requestPermission();
    fetch("/.netlify/functions/appointments?action=list&doctorPassword="+doctorPassword).then(r=>r.json()).then(d=>{if(d.ok)setAppointments(d.data||[]);});
    fetch("/.netlify/functions/appointments?action=get-availability").then(r=>r.json()).then(d=>{if(d.ok){setAvailability(d.availability||[]);setBlockedDates(d.blocked||[]);}});
    fetchAppointments();
    return () => clearInterval(interval);
  }, []);


  async function confirmAppt(id, date, time) {
    await fetch("/.netlify/functions/appointments?action=update",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({doctorPassword,id,status:"confirmed",confirmedDate:date,confirmedTime:time})});
    fetch("/.netlify/functions/appointments?action=list&doctorPassword="+doctorPassword).then(r=>r.json()).then(d=>{if(d.ok)setAppointments(d.data||[]);});
  }
  async function cancelAppt(id) {
    await fetch("/.netlify/functions/appointments?action=update",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({doctorPassword,id,status:"cancelled"})});
    fetch("/.netlify/functions/appointments?action=list&doctorPassword="+doctorPassword).then(r=>r.json()).then(d=>{if(d.ok)setAppointments(d.data||[]);});
  }

  async function loadPatientHistory(code) {
    try {
      const res = await fetch(`/api/doctor?action=patient-history&code=${code}&doctorPassword=${doctorPassword}`);
      const data = await res.json();
      if (data.ok) setPatHistory(data.data || []);
    } catch {}
  }

  async function fetchAppointments() {
    try {
      const [apptRes, availRes] = await Promise.all([
        fetch("/.netlify/functions/appointments?action=list&doctorPassword="+doctorPassword),
        fetch("/.netlify/functions/appointments?action=get-availability")
      ]);
      const apptData = await apptRes.json();
      const availData = await availRes.json();
      if(apptData.ok) setAppointments(apptData.data||[]);
      if(availData.ok) { setAvailability(availData.availability||[]); setBlockedDates(availData.blocked||[]); }
    } catch {}
  }

  async function confirmAppt(id, date, time) {
    setApptLoad(true);
    await fetch("/.netlify/functions/appointments?action=update", {method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({doctorPassword,id,status:"confirmed",confirmedDate:date,confirmedTime:time})});
    await fetchAppointments();
    setApptLoad(false);
  }

  async function cancelAppt(id) {
    await fetch("/.netlify/functions/appointments?action=update",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({doctorPassword,id,status:"cancelled"})});
    await fetchAppointments();
  }

  async function blockDate() {
    if(!newBlock.date) return;
    await fetch("/.netlify/functions/appointments?action=block-date",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({doctorPassword,...newBlock,fullDay:true})});
    setNewBlock({date:"",reason:""});
    await fetchAppointments();
  }

  async function unblockDate(id) {
    await fetch("/.netlify/functions/appointments?action=unblock-date",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({doctorPassword,id})});
    await fetchAppointments();
  }

  async function toggleDay(dayNum) {
    const existing = availability.find(a=>a.day_of_week===dayNum);
    const newSlots = existing
      ? availability.map(a=>a.day_of_week===dayNum?{...a,active:!a.active}:a)
      : [...availability,{day_of_week:dayNum,start_time:"09:00",end_time:"18:00",slot_minutes:30,active:true}];
    setAvailability(newSlots);
    await fetch("/.netlify/functions/appointments?action=set-availability",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({doctorPassword,slots:newSlots})});
  }

  async function addPatient() {
    if (!newPat.code.trim() || !newPat.name.trim()) return;
    const res = await fetch("/api/doctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-patient", doctorPassword, ...newPat }),
    });
    const data = await res.json();
    if (data.ok) { setShowAddPatient(false); setNewPat({ code: "", name: "", notes: "" }); fetchDashboard(); }
  }

  async function addNote() {
    if (!noteInput.trim() || !selPatient) return;
    await fetch("/api/doctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-note", doctorPassword, patientCode: selPatient.code, note: noteInput }),
    });
    setNoteInput("");
    alert("Nota guardada.");
  }

  async function sendReminder() {
    if (!selPatient) return;
    await fetch("/api/push-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorPassword, patientCode: selPatient.code, title: "Recordatorio del Dr. Rogelio", body: reminderInput || "Tienes un recordatorio pendiente." }),
    });
    setReminderInput("");
    alert("Recordatorio enviado.");
  }

  async function answerCall(call) {
    await fetch("/api/doctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "answer-call", doctorPassword, callId: call.id }),
    });
    setCallActive(call);
  }

  async function endCall() {
    if (!callActive) return;
    await fetch("/api/doctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end-call", doctorPassword, callId: callActive.id }),
    });
    setCallActive(null);
    fetchDashboard();
  }

  const patients = dashboard?.patients || [];
  const byPat = dashboard?.readingsByPatient || {};
  const pendingCalls = dashboard?.pendingCalls || [];

  const CODES = (process.env.NODE_ENV === "development" ? [] : []);

  // All patients we know about (from patients table + any with readings)
  const allCodes = new Set([...patients.map(p => p.code), ...Object.keys(byPat)]);

  function getPatientName(code) {
    return patients.find(p => p.code === code)?.name || code;
  }

  // Alerts: readings out of range in last 24h
  const alerts = [];
  Object.entries(byPat).forEach(([code, reads]) => {
    const name = getPatientName(code);
    reads.glucose.filter(r => r.value > 180 || r.value < 70).slice(0, 3).forEach(r => {
      alerts.push({ code, name, type: "Glucosa", value: `${r.value} mg/dL`, status: glStatus(r.value, r.moment), time: r.created_at });
    });
    reads.bp.filter(r => r.value >= 140).slice(0, 3).forEach(r => {
      alerts.push({ code, name, type: "Presión", value: `${r.value}/${r.value2} mmHg`, status: bpStatus(r.value), time: r.created_at });
    });
  });
  alerts.sort((a, b) => new Date(b.time) - new Date(a.time));

  // Video call screen
  if (callActive) {
    const roomUrl = `https://meet.jit.si/${callActive.room_name}#config.prejoinPageEnabled=false&userInfo.displayName=Dr.RogelioSanchez`;
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#000" }}>
        <div style={{ background: C.bg2, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.text, fontWeight: 700 }}>📹 En llamada con {callActive.patient_name}</div>
            <div style={{ color: C.muted, fontSize: 12 }}>Sala: {callActive.room_name}</div>
          </div>
          <button onClick={endCall} style={{ background: C.scarlet, color: "#FFF", border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 700, fontSize: 14 }}>
            Terminar llamada
          </button>
        </div>
        <iframe
          src={roomUrl}
          style={{ flex: 1, border: "none", width: "100%", background: "#111" }}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          title="Videollamada"
        />
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(145deg,#080F1A,#0D1825)`, padding: "48px 20px 20px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: "#FFF", fontWeight: 800 }}>Panel Médico</div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>Dr. Rogelio Sánchez</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {pendingCalls.length > 0 && (
              <div style={{ background: C.scarlet, color: "#FFF", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700, animation: "pulse 2s infinite" }}>
                📹 {pendingCalls.length} llamada{pendingCalls.length > 1 ? "s" : ""}
              </div>
            )}
            <div style={{ fontSize: 11, color: C.muted }}>Actualiza c/30s</div>
            <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.08)", color: C.muted, border: "none", borderRadius: 10, padding: "7px 12px", fontSize: 12 }}>Salir</button>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginTop: 16 }}>
          {[
            { v: patients.length, l: "Pacientes", c: C.cobalt },
            { v: alerts.length, l: "Alertas", c: alerts.length > 0 ? C.scarlet : C.emerald },
            { v: pendingCalls.length, l: "Llamadas", c: pendingCalls.length > 0 ? C.amber : C.muted },
            { v: Object.values(byPat).reduce((s, v) => s + v.glucose.length + v.bp.length, 0), l: "Registros 7d", c: C.gold },
          ].map(s => (
            <div key={s.l} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "10px 8px", textAlign: "center", border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: s.c, fontWeight: 800, lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending calls banner */}
      {pendingCalls.length > 0 && (
        <div style={{ background: C.scarlet + "22", borderBottom: `1px solid ${C.scarlet}44`, padding: "12px 20px" }}>
          {pendingCalls.map(call => (
            <div key={call.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 20, animation: "pulse 1.5s infinite" }}>📹</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.scarlet, fontWeight: 700, fontSize: 14 }}>{call.patient_name} está esperando videollamada</div>
                <div style={{ color: C.muted, fontSize: 12 }}>{fmtDate(call.created_at)}</div>
              </div>
              <button onClick={() => answerCall(call)} style={{ background: C.emerald, color: "#FFF", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13 }}>
                Responder 📹
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, padding: "0 20px", background: C.bg2, borderBottom: `1px solid ${C.border}` }}>
        {[
          { v: "pacientes", l: "Pacientes" },
          { v: "alertas", l: `Alertas${alerts.length > 0 ? ` (${alerts.length})` : ""}` },
          { v: "video", l: "Video" },
          { v: "citas", l: "Citas" },
        ].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)} style={{ background: "none", border: "none", borderBottom: `2.5px solid ${tab === t.v ? C.gold : "transparent"}`, padding: "12px 16px", fontSize: 13, fontWeight: tab === t.v ? 700 : 500, color: tab === t.v ? C.gold : C.muted, transition: "all 0.2s" }}>
            {t.l}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px 20px 0" }}>

        {/* ── PACIENTES TAB ── */}
        {tab === "pacientes" && (
          <>
            {/* Patient detail modal */}
            {selPatient && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div style={{ background: C.bg2, borderRadius: "24px 24px 0 0", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 -8px 48px rgba(0,0,0,0.6)" }}>
                  <div style={{ padding: "20px 20px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                      <div>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: C.text, fontWeight: 800 }}>{selPatient.name}</div>
                        <div style={{ color: C.muted, fontSize: 12 }}>{selPatient.code}</div>
                      </div>
                      <button onClick={() => setSelPatient(null)} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 34, height: 34, color: C.text, fontSize: 16 }}>✕</button>
                    </div>

                    {/* Last readings */}
                    {(() => {
                      const reads = byPat[selPatient.code] || { glucose: [], bp: [], weight: [] };
                      const lastG = reads.glucose[0];
                      const lastBP = reads.bp[0];
                      const lastW = reads.weight[0];
                      return (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
                          <StatPill val={lastG?.value} unit=" mg/dL" label="Glucosa" color={lastG ? glStatus(lastG.value, lastG.moment).c : C.muted} />
                          <StatPill val={lastBP ? `${lastBP.value}/${lastBP.value2}` : null} unit="" label="Presión" color={lastBP ? bpStatus(lastBP.value).c : C.muted} />
                          <StatPill val={lastW?.value} unit=" kg" label="Peso" color={C.cobalt} />
                        </div>
                      );
                    })()}

                    {/* History table */}
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, color: C.text, marginBottom: 12 }}>Historial completo</div>
                    {patHistory.length === 0 ? (
                      <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "20px 0", marginBottom: 16 }}>Sin registros</div>
                    ) : patHistory.slice(0, 30).map((r, i) => {
                      const isG = r.type === "glucose";
                      const isBP = r.type === "blood_pressure";
                      const statusObj = isG ? glStatus(r.value, r.moment) : isBP ? bpStatus(r.value) : null;
                      return (
                        <div key={r.id} style={{ display: "flex", gap: 12, padding: "9px 0", borderTop: i > 0 ? `1px solid ${C.border}` : "none", alignItems: "center" }}>
                          <div style={{ fontSize: 16, flexShrink: 0 }}>{isG ? "🩸" : isBP ? "💉" : "⚖️"}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
                              {isG ? `${r.value} mg/dL` : isBP ? `${r.value}/${r.value2} mmHg` : `${r.value} kg`}
                              {r.moment && <span style={{ color: C.muted, fontWeight: 400 }}> · {{fasting:"Ayuno",post_meal:"Postprandial",bedtime:"Antes dormir",random:"Aleatoria"}[r.moment] || r.moment}</span>}
                            </div>
                            <div style={{ fontSize: 11, color: C.muted }}>{fmtDate(r.created_at)}</div>
                            {r.notes && <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>{r.notes}</div>}
                          </div>
                          {statusObj && <div style={{ background: statusObj.c + "22", color: statusObj.c, borderRadius: 8, padding: "3px 9px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{statusObj.l}</div>}
                        </div>
                      );
                    })}

                    {/* Doctor note */}
                    <div style={{ marginTop: 16, paddingBottom: 32 }}>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, color: C.text, marginBottom: 10 }}>Agregar nota médica</div>
                      <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder="Observaciones, cambio de dosis, recomendaciones..." style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", color: C.text, fontSize: 13, width: "100%", height: 80, resize: "none", outline: "none", marginBottom: 10 }} />
                      <button onClick={addNote} disabled={!noteInput.trim()} style={{ background: !noteInput.trim() ? "rgba(255,255,255,0.1)" : C.gold, color: !noteInput.trim() ? C.muted : "#000", border: "none", borderRadius: 12, padding: "12px 20px", fontWeight: 700, fontSize: 14, width: "100%" }}>
                        Guardar nota
                      </button>
                        <textarea value={reminderInput} onChange={e=>setReminderInput(e.target.value)} placeholder="Mensaje del recordatorio..." style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", color: C.text, fontSize: 13, width: "100%", height: 80, resize: "none", outline: "none", marginTop: 14, marginBottom: 10 }} />
                        <button onClick={sendReminder} disabled={!reminderInput.trim()} style={{ background: !reminderInput.trim() ? "rgba(255,255,255,0.1)" : C.gold, color: !reminderInput.trim() ? C.muted : "#000", border: "none", borderRadius: 12, padding: "12px 20px", fontWeight: 700, fontSize: 14, width: "100%" }}>
                          Enviar recordatorio
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => setShowAddPatient(true)} style={{ background: C.gold, color: "#000", border: "none", borderRadius: 12, padding: "12px 20px", fontWeight: 700, fontSize: 14, width: "100%", marginBottom: 16 }}>
              + Agregar paciente
            </button>

            {showAddPatient && (
              <DCard>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: C.text, marginBottom: 14 }}>Nuevo paciente</div>
                {[
                  { ph: "Código (ej. APEX-0004)", field: "code" },
                  { ph: "Nombre completo", field: "name" },
                  { ph: "Notas (diagnóstico, tratamiento...)", field: "notes" },
                ].map(f => (
                  <input key={f.field} placeholder={f.ph} value={newPat[f.field]} onChange={e => setNewPat(p => ({ ...p, [f.field]: e.target.value }))}
                    style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 14, width: "100%", outline: "none", marginBottom: 10 }} />
                ))}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setShowAddPatient(false)} style={{ flex: 1, background: "rgba(255,255,255,0.07)", color: C.muted, border: "none", borderRadius: 10, padding: "12px", fontWeight: 600, fontSize: 14 }}>Cancelar</button>
                  <button onClick={addPatient} style={{ flex: 2, background: C.gold, color: "#000", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14 }}>Agregar</button>
                </div>
              </DCard>
            )}

            {loading && <div style={{ color: C.muted, textAlign: "center", padding: 32, fontSize: 14 }}>Cargando pacientes...</div>}

            {Array.from(allCodes).map(code => {
              const reads = byPat[code] || { glucose: [], bp: [], weight: [] };
              const lastG = reads.glucose[0];
              const lastBP = reads.bp[0];
              const lastW = reads.weight[0];
              const name = getPatientName(code);
              const gSt = lastG ? glStatus(lastG.value, lastG.moment) : null;
              const bpSt = lastBP ? bpStatus(lastBP.value) : null;
              const hasAlert = gSt && (gSt.c === C.scarlet || gSt.c === "#A855F7") || bpSt && bpSt.c === C.scarlet;

              return (
                <DCard key={code} style={{ border: `1px solid ${hasAlert ? C.scarlet + "44" : C.border}`, cursor: "pointer" }}>
                  <div onClick={() => { setSelPatient({ code, name }); loadPatientHistory(code); }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{name}</div>
                        <div style={{ color: C.muted, fontSize: 12 }}>{code}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {hasAlert && <div style={{ background: C.scarlet + "22", color: C.scarlet, borderRadius: 8, padding: "3px 9px", fontSize: 11, fontWeight: 700 }}>⚠ Alerta</div>}
                        <div style={{ color: C.muted, fontSize: 18 }}>›</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "9px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>Glucosa</div>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 800, color: gSt?.c || C.muted }}>{lastG?.value ?? "—"}</div>
                        <div style={{ fontSize: 8, color: gSt?.c || C.muted, fontWeight: 700 }}>{gSt?.l || "Sin datos"}</div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "9px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>Presión</div>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 800, color: bpSt?.c || C.muted }}>{lastBP ? `${lastBP.value}/${lastBP.value2}` : "—"}</div>
                        <div style={{ fontSize: 8, color: bpSt?.c || C.muted, fontWeight: 700 }}>{bpSt?.l || "Sin datos"}</div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "9px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>Peso</div>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 800, color: C.cobalt }}>{lastW?.value ?? "—"}</div>
                        <div style={{ fontSize: 8, color: C.muted }}>kg</div>
                      </div>
                    </div>
                    {lastG && <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Último registro: {fmtDate(lastG.created_at)}</div>}
                  </div>
                </DCard>
              );
            })}

            {!loading && allCodes.size === 0 && (
              <DCard style={{ textAlign: "center", padding: 32 }}>
                <div style={{ color: C.muted, fontSize: 14 }}>Aún no hay pacientes con registros.<br />Agrega un paciente para comenzar el monitoreo.</div>
              </DCard>
            )}
          </>
        )}

        {/* ── ALERTAS TAB ── */}
        {tab === "alertas" && (
          <>
            {alerts.length === 0 ? (
              <DCard style={{ textAlign: "center", padding: 36 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: C.text, marginBottom: 6 }}>Sin alertas</div>
                <div style={{ color: C.muted, fontSize: 13 }}>Todos los pacientes están dentro de los rangos normales.</div>
              </DCard>
            ) : alerts.map((a, i) => (
              <DCard key={i} style={{ borderLeft: `4px solid ${a.status.c}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                    <div style={{ color: a.status.c, fontSize: 14, fontWeight: 600, marginTop: 2 }}>{a.type}: {a.value}</div>
                    <div style={{ background: a.status.c + "22", color: a.status.c, borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 700, display: "inline-block", marginTop: 6 }}>{a.status.l}</div>
                  </div>
                  <div style={{ color: C.muted, fontSize: 11, textAlign: "right" }}>
                    <div>{a.code}</div>
                    <div style={{ marginTop: 4 }}>{fmtDate(a.time)}</div>
                  </div>
                </div>
              </DCard>
            ))}
          </>
        )}


        {tab==="citas"&&(
          <>
            <DCard>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:C.text,marginBottom:12}}>Citas pendientes</div>
              {appointments.filter(a=>a.status==="pending").length===0&&<div style={{color:C.muted,fontSize:13}}>Sin citas pendientes</div>}
              {appointments.filter(a=>a.status==="pending").map(a=>(
                <div key={a.id} style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
                  <div style={{color:C.text,fontWeight:700}}>{a.patient_name}</div>
                  <div style={{color:C.muted,fontSize:12,marginTop:2}}>{a.patient_phone} | {a.reason}</div>
                  <div style={{color:C.muted,fontSize:12}}>Solicita: {a.preferred_date} {a.preferred_time}</div>
                  <div style={{display:"flex",gap:8,marginTop:10}}>
                    <button onClick={()=>confirmAppt(a.id,a.preferred_date,a.preferred_time)} style={{flex:1,background:C.emerald,color:"#FFF",border:"none",borderRadius:8,padding:"8px",fontWeight:700,fontSize:13}}>Confirmar</button>
                    <button onClick={()=>cancelAppt(a.id)} style={{flex:1,background:C.scarlet,color:"#FFF",border:"none",borderRadius:8,padding:"8px",fontWeight:700,fontSize:13}}>Cancelar</button>
                  </div>
                </div>
              ))}
            </DCard>
            <DCard>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:C.text,marginBottom:12}}>Confirmadas</div>
              {appointments.filter(a=>a.status==="confirmed").slice(0,10).map(a=>(
                <div key={a.id} style={{padding:"8px 0",borderTop:"1px solid "+C.border}}>
                  <div style={{color:C.text,fontWeight:600,fontSize:14}}>{a.patient_name}</div>
                  <div style={{color:C.emerald,fontSize:12}}>{a.confirmed_date} {a.confirmed_time} | {a.reason}</div>
                  <div style={{color:C.muted,fontSize:11}}>{a.patient_phone}</div>
                </div>
              ))}
            </DCard>
            <DCard>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:C.text,marginBottom:12}}>Dias disponibles</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
              {availability.filter(a=>a.active).length>0&&(
                <div style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:"12px 14px",marginBottom:12}}>
                  <div style={{color:C.muted,fontSize:12,marginBottom:10}}>Horario por dia (citas cada 40 min) — se guarda al cambiar:</div>
                  {availability.filter(a=>a.active).map(av=>(
                    <div key={av.day_of_week} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                      <div style={{color:C.text,fontWeight:700,fontSize:13,minWidth:36}}>{["Dom","Lun","Mar","Mie","Jue","Vie","Sab"][av.day_of_week]}</div>
                      <span style={{color:C.muted,fontSize:12}}>de</span>
                      <input type="time" value={av.start_time||"09:00"} onChange={e=>setAvailability(prev=>prev.map(a=>a.day_of_week===av.day_of_week?{...a,start_time:e.target.value}:a))} onBlur={async()=>{await fetch("/.netlify/functions/appointments?action=set-availability",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({doctorPassword,slots:availability})});}} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:8,padding:"8px 10px",color:C.text,fontSize:15,outline:"none"}}/>
                      <span style={{color:C.muted,fontSize:12}}>a</span>
                      <input type="time" value={av.end_time||"17:00"} onChange={e=>setAvailability(prev=>prev.map(a=>a.day_of_week===av.day_of_week?{...a,end_time:e.target.value}:a))} onBlur={async()=>{await fetch("/.netlify/functions/appointments?action=set-availability",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({doctorPassword,slots:availability})});}} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:8,padding:"8px 10px",color:C.text,fontSize:15,outline:"none"}}/>
                    </div>
                  ))}
                </div>
              )}
                {["Dom","Lun","Mar","Mie","Jue","Vie","Sab"].map((d,i)=>{
                  const active=availability.find(a=>a.day_of_week===i&&a.active);
                    const isActive = availability.find(a=>a.day_of_week===i&&a.active);
                    return <button key={i} onClick={async()=>{
                      const ex=availability.find(a=>a.day_of_week===i);
                      const ns=ex?availability.map(a=>a.day_of_week===i?{...a,active:!a.active}:a):[...availability,{day_of_week:i,start_time:"09:00",end_time:"18:00",slot_minutes:30,active:true}];
                      setAvailability(ns);
                      await fetch("/.netlify/functions/appointments?action=set-availability",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({doctorPassword,slots:ns})});const r=await fetch("/.netlify/functions/appointments?action=get-availability");const dd=await r.json();if(dd.ok)setAvailability(dd.availability||[]);
                    }} style={{background:isActive?C.emerald:"rgba(255,255,255,0.08)",color:isActive?"#FFF":C.muted,border:"none",borderRadius:8,padding:"8px 12px",fontWeight:700,fontSize:13}}>{d}</button>;
                  })}
              </div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:C.text,marginBottom:10}}>Bloquear fecha</div>
              <input type="date" value={newBlock.date} onChange={e=>setNewBlock(b=>({...b,date:e.target.value}))} style={{background:"rgba(255,255,255,0.07)",border:"1px solid "+C.border,borderRadius:10,padding:"10px 14px",color:C.text,fontSize:14,width:"100%",outline:"none",marginBottom:8}}/>
              <input placeholder="Motivo (ej: vacaciones, procedimiento)" value={newBlock.reason} onChange={e=>setNewBlock(b=>({...b,reason:e.target.value}))} style={{background:"rgba(255,255,255,0.07)",border:"1px solid "+C.border,borderRadius:10,padding:"10px 14px",color:C.text,fontSize:14,width:"100%",outline:"none",marginBottom:8}}/>
              <button onClick={async()=>{if(!newBlock.date)return;await fetch("/.netlify/functions/appointments?action=block-date",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({doctorPassword,...newBlock,fullDay:true})});setNewBlock({date:"",reason:""});fetch("/.netlify/functions/appointments?action=get-availability").then(r=>r.json()).then(d=>{if(d.ok)setBlockedDates(d.blocked||[]);});}} style={{background:C.scarlet,color:"#FFF",border:"none",borderRadius:10,padding:"11px",fontWeight:700,fontSize:14,width:"100%"}}>Bloquear esta fecha</button>
              {blockedDates.length>0&&<div style={{marginTop:12}}><div style={{color:C.muted,fontSize:12,marginBottom:8}}>Fechas bloqueadas:</div>{blockedDates.map(b=><div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderTop:"1px solid "+C.border}}><div><div style={{color:C.text,fontSize:13}}>{b.date}</div><div style={{color:C.muted,fontSize:11}}>{b.reason}</div></div><button onClick={async()=>{await fetch("/.netlify/functions/appointments?action=unblock-date",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({doctorPassword,id:b.id})});fetch("/.netlify/functions/appointments?action=get-availability").then(r=>r.json()).then(d=>{if(d.ok)setBlockedDates(d.blocked||[]);});}} style={{background:"rgba(239,68,68,0.2)",color:C.scarlet,border:"none",borderRadius:8,padding:"5px 10px",fontSize:12,fontWeight:700}}>Quitar</button></div>)}</div>}
            </DCard>
          </>
        )}

        {/* ── VIDEO TAB ── */}
        {tab === "video" && (
          <>
            <DCard>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: C.text, marginBottom: 8 }}>Iniciar videollamada</div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>Selecciona un paciente para iniciar la llamada. Él recibirá una notificación para unirse.</div>
              {patients.map(p => (
                <button key={p.code} onClick={() => { const room = `apexdr${p.code.replace(/[^a-zA-Z0-9]/g,"").toLowerCase()}`; setCallActive({ id: "dr-initiated", patient_name: p.name, room_name: room }); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 12, padding: "12px 14px", marginBottom: 10, textAlign: "left", cursor: "pointer" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.navyMid, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👤</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>{p.code}</div>
                  </div>
                  <div style={{ background: C.emerald + "22", color: C.emerald, borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>📹 Llamar</div>
                </button>
              ))}
              {patients.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "16px 0" }}>Agrega pacientes en la pestaña Pacientes primero.</div>}
            </DCard>

            {pendingCalls.length > 0 && (
              <DCard style={{ borderLeft: `4px solid ${C.scarlet}` }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: C.text, marginBottom: 12 }}>Llamadas entrantes</div>
                {pendingCalls.map(call => (
                  <div key={call.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
                    <div style={{ fontSize: 24, animation: "pulse 1.5s infinite" }}>📹</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: C.text, fontWeight: 700 }}>{call.patient_name}</div>
                      <div style={{ color: C.muted, fontSize: 12 }}>{fmtDate(call.created_at)}</div>
                    </div>
                    <button onClick={() => answerCall(call)} style={{ background: C.emerald, color: "#FFF", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13 }}>
                      Responder
                    </button>
                  </div>
                ))}
              </DCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}
