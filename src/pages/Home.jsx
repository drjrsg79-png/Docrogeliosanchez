import { useEffect, useMemo, useState } from "react";
import { api, formatMinutes, formatPrice } from "../api.js";
import { Link, useRouter } from "../router.jsx";

const TRACKS = [
  {
    id: "patient",
    label: "Pacientes",
    title: "Aprende a cuidar tu pie y tu diabetes",
    intro:
      "Lo mismo que explico en consulta, ordenado y sin prisa, para que lo repase también quien te cuida en casa.",
  },
  {
    id: "doctor",
    label: "Médicos",
    title: "Formación clínica en salvamento de extremidad",
    intro:
      "Protocolos, criterios de decisión y casos comentados de guardia, para quien recibe el pie diabético agudo.",
  },
];

function CardSkeleton({ wide }) {
  return (
    <div className={`course-card ${wide ? "is-wide" : ""}`} style={{ minHeight: 280 }}>
      <div className="skeleton" style={{ height: 12, width: 60 }} />
      <div className="skeleton" style={{ height: 30, width: "85%", marginTop: 18 }} />
      <div className="skeleton" style={{ height: 14, width: "100%", marginTop: 14 }} />
      <div className="skeleton" style={{ height: 14, width: "70%", marginTop: 8 }} />
      <div className="skeleton" style={{ height: 34, width: "45%", marginTop: "auto" }} />
    </div>
  );
}

function CourseCard({ course, index, wide }) {
  return (
    <Link
      to={`/curso/${course.slug}`}
      className={`course-card ${wide ? "is-wide" : ""}`}
      style={{ "--accent": course.accent, animationDelay: `${index * 70}ms` }}
    >
      <span className="idx">
        {String(index + 1).padStart(2, "0")} — {course.level}
      </span>
      <h3>{course.title}</h3>
      <p className="tagline">{course.tagline}</p>
      <div className="course-meta">
        <span className="chip">{course.lessonCount} lecciones</span>
        <span className="chip">{formatMinutes(course.totalMin)}</span>
        {course.unlocked && <span className="chip chip-solid">Ya es tuyo</span>}
      </div>
      <div className="price-line">
        <span className="price">
          {formatPrice(course.priceCents, course.currency)}
          <small>PAGO ÚNICO</small>
        </span>
        <span className="go">{course.unlocked ? "Continuar" : "Ver temario"}</span>
      </div>
    </Link>
  );
}

export default function Home() {
  const { search } = useRouter();
  const [track, setTrack] = useState(() =>
    new URLSearchParams(search).get("track") === "doctor" ? "doctor" : "patient",
  );
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState("");

  // Los enlaces del pie de página traen ?track=… y deben cambiar la pestaña.
  useEffect(() => {
    const wanted = new URLSearchParams(search).get("track");
    if (wanted === "doctor" || wanted === "patient") setTrack(wanted);
  }, [search]);

  useEffect(() => {
    let alive = true;
    setCourses(null);
    api
      .courses(track)
      .then((data) => alive && setCourses(data.courses))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [track]);

  const current = useMemo(() => TRACKS.find((t) => t.id === track), [track]);

  return (
    <>
      <section className="wrap hero">
        <div>
          <span className="eyebrow">Medicina interna · Terapia intensiva · Pie diabético</span>
          <h1>
            Nadie pierde un pie <em>de un día para otro.</em>
          </h1>
          <p className="hero-lede">
            Cursos en video y lectura del Dr. Rogelio Sánchez. Para el paciente que quiere entender
            qué está pasando con su pie, y para el médico que tiene que decidir en las primeras horas.
          </p>
          <div className="stat-row">
            <div>
              <div className="num">6</div>
              <div className="lbl">Cursos</div>
            </div>
            <div>
              <div className="num">72 h</div>
              <div className="lbl">Ventana crítica</div>
            </div>
            <div>
              <div className="num">∞</div>
              <div className="lbl">Acceso de por vida</div>
            </div>
          </div>
          <div className="hero-rule" />
        </div>
        <ul className="credentials">
          <li>
            <strong>Medicina Interna</strong>
            Manejo integral del paciente diabético
          </li>
          <li>
            <strong>Terapia Intensiva</strong>
            Sepsis y falla orgánica de origen podálico
          </li>
          <li>
            <strong>Salvamento de extremidad</strong>
            Desbridamiento, revascularización y rehabilitación
          </li>
        </ul>
      </section>

      <section className="wrap">
        <div className="section-head">
          <div>
            <div className="tracks" style={{ marginBottom: 22 }}>
              {TRACKS.map((t) => (
                <button
                  key={t.id}
                  className={t.id === track ? "is-on" : ""}
                  onClick={() => setTrack(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <h2>{current.title}</h2>
            <p>{current.intro}</p>
          </div>
          <span className="eyebrow">
            {courses ? `${courses.length} cursos disponibles` : "Cargando"}
          </span>
        </div>

        {error && <div className="notice">{error}</div>}

        <div className="catalog">
          {!courses && !error && (
            <>
              <CardSkeleton wide />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          )}
          {courses?.map((course, i) => (
            <CourseCard key={course.id} course={course} index={i} wide={i === 0} />
          ))}
          {courses?.length === 0 && (
            <div className="empty" style={{ gridColumn: "span 6" }}>
              <h3>Aún no hay cursos en esta sección</h3>
              <p>Estamos preparando el material. Vuelve pronto o revisa la otra sección.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
