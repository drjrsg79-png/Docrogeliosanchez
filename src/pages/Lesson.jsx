import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useSession } from "../session.jsx";
import { Link, useRouter } from "../router.jsx";

/** Convierte un enlace de YouTube o Vimeo en su URL de reproductor. */
function embedUrl(raw) {
  if (!raw) return "";
  const youtube = raw.match(/(?:youtu\.be\/|v=)([\w-]{6,})/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = raw.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return raw;
}

export default function Lesson({ slug, lessonId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { user } = useSession();
  const { navigate } = useRouter();

  useEffect(() => {
    let alive = true;
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
          <Link to="/" className="btn btn-primary">
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="wrap-narrow" style={{ padding: "70px 0" }}>
        <div className="skeleton" style={{ height: 16, width: 140 }} />
        <div className="skeleton" style={{ height: 44, width: "80%", marginTop: 20 }} />
        <div className="skeleton" style={{ height: 240, width: "100%", marginTop: 30 }} />
      </div>
    );
  }

  const index = data.lessons.findIndex((l) => l.id === lessonId);
  const lesson = data.lessons[index];

  if (!lesson) {
    return (
      <div className="wrap" style={{ padding: "100px 0" }}>
        <div className="empty">
          <h3>Lección no encontrada</h3>
          <Link to={`/curso/${slug}`} className="btn btn-primary">
            Ver el temario
          </Link>
        </div>
      </div>
    );
  }

  if (lesson.locked) {
    return (
      <div className="wrap" style={{ padding: "100px 0" }}>
        <div className="empty">
          <h3>Esta lección es parte del curso completo</h3>
          <p>
            Inscríbete a «{data.course.title}» para abrir las {data.course.lessonCount} lecciones y
            conservar el acceso de por vida.
          </p>
          <Link to={`/curso/${slug}`} className="btn btn-clay">
            Ver inscripción
          </Link>
        </div>
      </div>
    );
  }

  const prev = data.lessons[index - 1];
  const next = data.lessons[index + 1];
  const video = embedUrl(lesson.videoUrl);

  async function toggleDone() {
    setSaving(true);
    try {
      await api.setProgress(lesson.id, !lesson.completed);
      setData((current) => ({
        ...current,
        lessons: current.lessons.map((l) =>
          l.id === lesson.id ? { ...l, completed: !l.completed } : l,
        ),
      }));
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  }

  return (
    <article className="wrap-narrow reader">
      <span className="eyebrow">
        <Link to={`/curso/${slug}`}>{data.course.title}</Link> · Lección{" "}
        {String(index + 1).padStart(2, "0")} de {data.lessons.length}
      </span>
      <h1>{lesson.title}</h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 17, marginBottom: 34 }}>{lesson.summary}</p>

      {video && (
        <div className="video-frame">
          <iframe
            src={video}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div className="prose">
        {lesson.content.split(/\n{2,}/).map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {data.unlocked && (
        <button
          className={lesson.completed ? "btn btn-ghost" : "btn btn-primary"}
          onClick={toggleDone}
          disabled={saving}
          style={{ marginTop: 36 }}
        >
          {lesson.completed ? "Marcada como vista — deshacer" : "Marcar como vista"}
        </button>
      )}

      <nav className="reader-nav">
        {prev && !prev.locked ? (
          <button className="btn btn-ghost" onClick={() => navigate(`/curso/${slug}/leccion/${prev.id}`)}>
            ← {prev.title}
          </button>
        ) : (
          <span />
        )}
        {next && !next.locked ? (
          <button className="btn btn-primary" onClick={() => navigate(`/curso/${slug}/leccion/${next.id}`)}>
            {next.title} →
          </button>
        ) : (
          <Link to={`/curso/${slug}`} className="btn btn-ghost">
            Volver al temario
          </Link>
        )}
      </nav>
    </article>
  );
}
