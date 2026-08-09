import { useEffect, useState } from "react";
import { api, formatPrice } from "../api.js";

const EMPTY_COURSE = {
  title: "",
  tagline: "",
  description: "",
  audience: "patient",
  level: "Básico",
  priceCents: 89000,
  currency: "MXN",
  accent: "#a64b2a",
  published: true,
  position: 10,
};

const EMPTY_LESSON = {
  courseId: 0,
  title: "",
  summary: "",
  content: "",
  videoUrl: "",
  durationMin: 12,
  position: 10,
  isPreview: false,
};

function Gate({ onUnlock }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.admin("overview", null, password);
      sessionStorage.setItem("drs_admin", password);
      onUnlock(password);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <div className="wrap-narrow" style={{ padding: "110px 0 140px", maxWidth: 420 }}>
      <span className="eyebrow">Área privada</span>
      <h1 style={{ fontSize: 38, margin: "12px 0 24px" }}>Panel del doctor</h1>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="pw">Contraseña de administración</label>
          <input
            id="pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </div>
        {error && <div className="notice">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Verificando…" : "Entrar al panel"}
        </button>
      </form>
    </div>
  );
}

export default function Admin() {
  const [password, setPassword] = useState(() => sessionStorage.getItem("drs_admin") || "");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("ventas");
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE);
  const [lessonForm, setLessonForm] = useState(EMPTY_LESSON);

  async function load(pw = password) {
    try {
      const d = await api.admin("overview", null, pw);
      setData(d);
      setError("");
    } catch (e) {
      setError(e.message);
      if (e.message.includes("Contraseña")) {
        sessionStorage.removeItem("drs_admin");
        setPassword("");
      }
    }
  }

  useEffect(() => {
    if (password) load(password);
  }, [password]);

  if (!password) {
    return <Gate onUnlock={setPassword} />;
  }

  if (!data) {
    return (
      <div className="wrap" style={{ padding: "80px 0" }}>
        {error ? <div className="notice">{error}</div> : <div className="skeleton" style={{ height: 300 }} />}
      </div>
    );
  }

  async function send(action, body) {
    try {
      await api.admin(action, body, password);
      await load();
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  const { stats, courses, lessons, enrollments } = data;

  return (
    <div className="wrap" style={{ padding: "50px 0 100px" }}>
      <span className="eyebrow">Panel privado</span>
      <h1 style={{ fontSize: 42, margin: "12px 0 6px" }}>Administración</h1>

      {!stats.stripeReady && (
        <div className="notice" style={{ marginTop: 18 }}>
          Stripe no está configurado: falta la variable <strong>STRIPE_SECRET_KEY</strong> en el
          proyecto. Mientras tanto, las compras quedan como «pago por confirmar» y se liberan a mano
          desde esta tabla.
        </div>
      )}
      {error && <div className="notice">{error}</div>}

      <div className="admin-grid">
        <div className="stat-box">
          <div className="num">{stats.users}</div>
          <div className="eyebrow">Cuentas</div>
        </div>
        <div className="stat-box">
          <div className="num">{stats.active}</div>
          <div className="eyebrow">Inscripciones pagadas</div>
        </div>
        <div className="stat-box">
          <div className="num">{stats.pending}</div>
          <div className="eyebrow">Por confirmar</div>
        </div>
        <div className="stat-box">
          <div className="num">{formatPrice(stats.revenueCents)}</div>
          <div className="eyebrow">Cobrado</div>
        </div>
      </div>

      <div className="tracks" style={{ marginBottom: 26 }}>
        {[
          ["ventas", "Ventas"],
          ["cursos", "Cursos"],
          ["lecciones", "Lecciones"],
        ].map(([id, label]) => (
          <button key={id} className={tab === id ? "is-on" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "ventas" && (
        <table className="table">
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Curso</th>
              <th>Folio</th>
              <th>Monto</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e) => (
              <tr key={e.id}>
                <td>
                  <strong>{e.userName}</strong>
                  <br />
                  <span style={{ color: "var(--ink-faint)" }}>{e.userEmail}</span>
                </td>
                <td>{e.courseTitle}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{e.reference || "—"}</td>
                <td>{formatPrice(e.amountCents, e.currency)}</td>
                <td>
                  <span
                    className={`chip ${e.status === "active" ? "chip-pine" : e.status === "pending" ? "chip-clay" : ""}`}
                  >
                    {e.status === "active"
                      ? "Pagado"
                      : e.status === "pending"
                        ? "Pendiente"
                        : "Cancelado"}
                  </span>
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {e.status !== "active" && (
                    <button
                      className="mini"
                      onClick={() => send("enrollment", { id: e.id, status: "active" })}
                    >
                      Liberar acceso
                    </button>
                  )}
                  {e.status === "active" && (
                    <button
                      className="mini"
                      onClick={() => send("enrollment", { id: e.id, status: "cancelled" })}
                    >
                      Quitar acceso
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {enrollments.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--ink-faint)", padding: 30 }}>
                  Todavía no hay inscripciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {tab === "cursos" && (
        <>
          <div className="panel">
            <h3>{courseForm.id ? "Editar curso" : "Nuevo curso"}</h3>
            <div className="two-col">
              <div className="field">
                <label>Título</label>
                <input
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Frase corta</label>
                <input
                  value={courseForm.tagline}
                  onChange={(e) => setCourseForm({ ...courseForm, tagline: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label>Descripción</label>
              <textarea
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
              />
            </div>
            <div className="two-col">
              <div className="field">
                <label>Dirigido a</label>
                <select
                  value={courseForm.audience}
                  onChange={(e) => setCourseForm({ ...courseForm, audience: e.target.value })}
                >
                  <option value="patient">Pacientes</option>
                  <option value="doctor">Médicos</option>
                </select>
              </div>
              <div className="field">
                <label>Nivel</label>
                <input
                  value={courseForm.level}
                  onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Precio en centavos (89000 = $890)</label>
                <input
                  type="number"
                  value={courseForm.priceCents}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, priceCents: Number(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label>Orden en el catálogo</label>
                <input
                  type="number"
                  value={courseForm.position}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, position: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}>
              <input
                type="checkbox"
                checked={courseForm.published}
                onChange={(e) => setCourseForm({ ...courseForm, published: e.target.checked })}
              />
              Visible en el catálogo
            </label>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                className="btn btn-primary"
                onClick={() => send("course", courseForm).then(() => setCourseForm(EMPTY_COURSE))}
              >
                {courseForm.id ? "Guardar cambios" : "Crear curso"}
              </button>
              {courseForm.id && (
                <button className="btn btn-ghost" onClick={() => setCourseForm(EMPTY_COURSE)}>
                  Cancelar
                </button>
              )}
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Público</th>
                <th>Precio</th>
                <th>Lecciones</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.title}</strong>
                    {!c.published && <span className="chip" style={{ marginLeft: 8 }}>Oculto</span>}
                    <br />
                    <span style={{ color: "var(--ink-faint)", fontSize: 12 }}>/{c.slug}</span>
                  </td>
                  <td>{c.audience === "doctor" ? "Médicos" : "Pacientes"}</td>
                  <td>{formatPrice(c.priceCents, c.currency)}</td>
                  <td>{lessons.filter((l) => l.courseId === c.id).length}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="mini" onClick={() => setCourseForm(c)}>
                      Editar
                    </button>{" "}
                    <button
                      className="mini"
                      onClick={() => {
                        if (window.confirm(`¿Borrar «${c.title}» y todas sus lecciones?`)) {
                          send("course-delete", { id: c.id });
                        }
                      }}
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tab === "lecciones" && (
        <>
          <div className="panel">
            <h3>{lessonForm.id ? "Editar lección" : "Nueva lección"}</h3>
            <div className="two-col">
              <div className="field">
                <label>Curso</label>
                <select
                  value={lessonForm.courseId}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, courseId: Number(e.target.value) })
                  }
                >
                  <option value={0}>Selecciona un curso…</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Título</label>
                <input
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label>Resumen de una línea</label>
              <input
                value={lessonForm.summary}
                onChange={(e) => setLessonForm({ ...lessonForm, summary: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Contenido (separa párrafos con una línea en blanco)</label>
              <textarea
                value={lessonForm.content}
                onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                style={{ minHeight: 200 }}
              />
            </div>
            <div className="two-col">
              <div className="field">
                <label>Video (YouTube o Vimeo)</label>
                <input
                  value={lessonForm.videoUrl}
                  onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                  placeholder="https://youtu.be/…"
                />
              </div>
              <div className="field">
                <label>Duración en minutos</label>
                <input
                  type="number"
                  value={lessonForm.durationMin}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, durationMin: Number(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label>Orden dentro del curso</label>
                <input
                  type="number"
                  value={lessonForm.position}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, position: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}>
              <input
                type="checkbox"
                checked={lessonForm.isPreview}
                onChange={(e) => setLessonForm({ ...lessonForm, isPreview: e.target.checked })}
              />
              Abierta como vista previa (se ve sin pagar)
            </label>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                className="btn btn-primary"
                onClick={() => send("lesson", lessonForm).then(() => setLessonForm(EMPTY_LESSON))}
              >
                {lessonForm.id ? "Guardar cambios" : "Crear lección"}
              </button>
              {lessonForm.id && (
                <button className="btn btn-ghost" onClick={() => setLessonForm(EMPTY_LESSON)}>
                  Cancelar
                </button>
              )}
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Lección</th>
                <th>Curso</th>
                <th>Min</th>
                <th>Vista previa</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lessons.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>
                      {l.position}. {l.title}
                    </strong>
                  </td>
                  <td>{courses.find((c) => c.id === l.courseId)?.title || "—"}</td>
                  <td>{l.durationMin}</td>
                  <td>{l.isPreview ? "Sí" : "No"}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="mini" onClick={() => setLessonForm(l)}>
                      Editar
                    </button>{" "}
                    <button
                      className="mini"
                      onClick={() => {
                        if (window.confirm(`¿Borrar la lección «${l.title}»?`)) {
                          send("lesson-delete", { id: l.id });
                        }
                      }}
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
