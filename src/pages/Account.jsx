import { useEffect, useState } from "react";
import { api, formatPrice } from "../api.js";
import { useSession } from "../session.jsx";
import { Link, useRouter } from "../router.jsx";

const STATUS = {
  active: { label: "Acceso liberado", className: "chip chip-solid" },
  pending: { label: "Pago por confirmar", className: "chip chip-clay" },
  cancelled: { label: "Cancelado", className: "chip" },
};

export default function Account() {
  const { user, loading } = useSession();
  const { navigate } = useRouter();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/entrar?volver=/mis-cursos", { replace: true });
      return;
    }
    api
      .myCourses()
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message));
  }, [user, loading]);

  if (loading || (!items && !error)) {
    return (
      <div className="wrap" style={{ padding: "70px 0" }}>
        <div className="skeleton" style={{ height: 44, width: 320 }} />
        <div className="skeleton" style={{ height: 90, width: "100%", marginTop: 30 }} />
        <div className="skeleton" style={{ height: 90, width: "100%", marginTop: 12 }} />
      </div>
    );
  }

  return (
    <div className="wrap" style={{ padding: "60px 0 90px" }}>
      <span className="eyebrow">
        {user?.audience === "doctor" ? "Cuenta profesional" : "Cuenta"} · {user?.email}
      </span>
      <h1 style={{ fontSize: 46, margin: "14px 0 8px" }}>Hola, {user?.name?.split(" ")[0]}</h1>
      <p style={{ color: "var(--ink-soft)", maxWidth: "48ch" }}>
        Aquí vive todo lo que has comprado. El avance se guarda solo, así que puedes dejar una
        lección a medias y retomarla desde otro dispositivo.
      </p>

      {error && (
        <div className="notice" style={{ marginTop: 26 }}>
          {error}
        </div>
      )}

      {items?.length === 0 && (
        <div className="empty" style={{ marginTop: 44 }}>
          <h3>Todavía no tienes cursos</h3>
          <p>
            Empieza por el que resuelve lo que tienes enfrente hoy. El acceso no caduca, así que
            puedes avanzar a tu ritmo.
          </p>
          <Link to="/" className="btn btn-clay">
            Ver el catálogo
          </Link>
        </div>
      )}

      {items?.length > 0 && (
        <div style={{ marginTop: 40, borderTop: "1.5px solid var(--ink)" }}>
          {items.map((item) => {
            const status = STATUS[item.status] || STATUS.pending;
            const pct = item.lessonCount
              ? Math.round((item.completedCount / item.lessonCount) * 100)
              : 0;
            return (
              <div className="enroll-row" key={item.course.slug}>
                <div>
                  <span className={status.className}>{status.label}</span>
                  <h3 style={{ fontSize: 25, margin: "12px 0 4px" }}>{item.course.title}</h3>
                  <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>{item.course.tagline}</p>
                  {item.status === "active" ? (
                    <>
                      <div className="meter">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 8 }}>
                        {item.completedCount} de {item.lessonCount} lecciones · {pct}%
                      </p>
                    </>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 10 }}>
                      Folio {item.reference || "—"} ·{" "}
                      {formatPrice(item.amountCents, item.currency)} por confirmar
                    </p>
                  )}
                </div>
                <Link
                  to={`/curso/${item.course.slug}`}
                  className={item.status === "active" ? "btn btn-primary" : "btn btn-ghost"}
                >
                  {item.status === "active" ? "Continuar" : "Ver detalle"}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
