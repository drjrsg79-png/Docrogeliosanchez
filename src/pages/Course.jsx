import { useEffect, useState } from "react";
import { api, formatMinutes, formatPrice } from "../api.js";
import { useSession } from "../session.jsx";
import { Link, useRouter } from "../router.jsx";

function BuyPanel({ course, enrollment, unlocked, lessons }) {
  const { user } = useSession();
  const { navigate } = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [transfer, setTransfer] = useState(null);

  const firstLesson = lessons[0];

  async function buy() {
    if (!user) {
      navigate(`/registro?volver=/curso/${course.slug}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api.checkout(course.slug);
      if (result.mode === "stripe") window.location.href = result.url;
      else if (result.mode === "already") navigate(`/curso/${course.slug}/leccion/${firstLesson.id}`);
      else setTransfer(result);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  if (unlocked) {
    return (
      <aside className="buy-panel">
        <span className="eyebrow">Acceso liberado</span>
        <p style={{ marginTop: 12, color: "var(--ink-soft)", fontSize: 14.5 }}>
          {firstLesson
            ? "Este curso ya es tuyo. Puedes verlo cuantas veces quieras, sin caducidad."
            : "Este curso ya es tuyo. Las lecciones se publican en los próximos días."}
        </p>
        {firstLesson && (
          <Link
            to={`/curso/${course.slug}/leccion/${firstLesson.id}`}
            className="btn btn-primary btn-block"
            style={{ marginTop: 20 }}
          >
            Entrar al curso
          </Link>
        )}
      </aside>
    );
  }

  if (transfer) {
    return (
      <aside className="buy-panel">
        <span className="eyebrow">Lugar apartado</span>
        <h3 style={{ fontSize: 26, margin: "10px 0 12px" }}>Folio {transfer.folio}</h3>
        <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>
          Envía el comprobante de pago de{" "}
          <strong>{formatPrice(transfer.amountCents, transfer.currency)}</strong> junto con tu folio.
          En cuanto se confirme, el curso aparece en «Mis cursos».
        </p>
        {transfer.contact && (
          <p className="note">
            Contacto para el comprobante: <strong>{transfer.contact}</strong>
          </p>
        )}
        <Link to="/mis-cursos" className="btn btn-ghost btn-block" style={{ marginTop: 20 }}>
          Ver el estado de mi pago
        </Link>
      </aside>
    );
  }

  return (
    <aside className="buy-panel">
      <span className="eyebrow">Inscripción</span>
      <span className="price">{formatPrice(course.priceCents, course.currency)}</span>
      <span style={{ fontSize: 12.5, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>
        PAGO ÚNICO · SIN MENSUALIDADES
      </span>
      <ul>
        <li>{course.lessonCount} lecciones · {formatMinutes(course.totalMin)}</li>
        <li>Acceso permanente desde cualquier dispositivo</li>
        <li>Avance guardado lección por lección</li>
        {course.audience === "doctor" && <li>Casos clínicos comentados con imagen</li>}
        {course.audience === "patient" && <li>Pensado también para quien te cuida en casa</li>}
      </ul>
      {error && <div className="notice">{error}</div>}
      {enrollment?.status === "pending" && (
        <div className="notice">
          Tienes un pago en proceso con folio <strong>{enrollment.reference}</strong>.
        </div>
      )}
      <button className="btn btn-clay btn-block" onClick={buy} disabled={busy}>
        {busy ? "Preparando el pago…" : user ? "Comprar curso" : "Crear cuenta y comprar"}
      </button>
      <p className="note">
        Pago protegido. Si el curso no es lo que esperabas, escríbenos dentro de los primeros siete
        días y lo resolvemos.
      </p>
    </aside>
  );
}

export default function Course({ slug }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const { user } = useSession();
  const { navigate } = useRouter();

  useEffect(() => {
    let alive = true;
    setData(null);
    api
      .course(slug)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [slug, user?.id]);

  if (error) {
    return (
      <div className="wrap" style={{ padding: "100px 0" }}>
        <div className="empty">
          <h3>{error}</h3>
          <p>Revisa el enlace o vuelve al catálogo para ver los cursos disponibles.</p>
          <Link to="/" className="btn btn-primary">
            Ver todos los cursos
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="wrap" style={{ padding: "70px 0" }}>
        <div className="skeleton" style={{ height: 18, width: 160 }} />
        <div className="skeleton" style={{ height: 56, width: "70%", marginTop: 22 }} />
        <div className="skeleton" style={{ height: 18, width: "50%", marginTop: 18 }} />
        <div className="skeleton" style={{ height: 300, width: "100%", marginTop: 40 }} />
      </div>
    );
  }

  const { course, lessons, unlocked, enrollment } = data;

  return (
    <div className="wrap detail">
      <div>
        <span className="eyebrow">
          <Link to="/">Cursos</Link> ·{" "}
          {course.audience === "doctor" ? "Para médicos" : "Para pacientes"} · {course.level}
        </span>
        <h1>{course.title}</h1>
        <p className="lede">{course.tagline}</p>
        <div className="course-meta" style={{ margin: "22px 0 0" }}>
          <span className={`chip ${course.audience === "doctor" ? "chip-pine" : "chip-clay"}`}>
            {course.audience === "doctor" ? "Profesionales de la salud" : "Pacientes y familia"}
          </span>
          <span className="chip">{course.lessonCount} lecciones</span>
          <span className="chip">{formatMinutes(course.totalMin)}</span>
        </div>
        <p className="body">{course.description}</p>

        <div className="index-list">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "18px 4px 10px",
            }}
          >
            <span className="eyebrow">Temario</span>
            <span className="eyebrow">
              {unlocked ? "Acceso completo" : "Vista previa disponible"}
            </span>
          </div>
          {lessons.map((lesson, i) => {
            const open = !lesson.locked;
            return (
              <button
                key={lesson.id}
                className={`index-row ${lesson.locked ? "is-locked" : ""}`}
                onClick={() => open && navigate(`/curso/${slug}/leccion/${lesson.id}`)}
              >
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <h4>{lesson.title}</h4>
                  <p>{lesson.summary}</p>
                </span>
                <span className="right">
                  {lesson.isPreview && !unlocked && <span className="chip chip-clay">Gratis</span>}
                  <span>{lesson.durationMin} min</span>
                  {unlocked ? (
                    <span className={`tick ${lesson.completed ? "on" : ""}`} />
                  ) : (
                    <svg width="13" height="15" viewBox="0 0 13 15" aria-label="Bloqueada">
                      <path
                        d="M2.5 6V4a4 4 0 018 0v2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <rect x="0.75" y="6" width="11.5" height="8" rx="1" fill="currentColor" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <BuyPanel course={course} enrollment={enrollment} unlocked={unlocked} lessons={lessons} />
    </div>
  );
}
