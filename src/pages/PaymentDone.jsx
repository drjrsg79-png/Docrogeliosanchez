import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Link } from "../router.jsx";

export default function PaymentDone() {
  const [state, setState] = useState({ status: "checking" });

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) {
      setState({ status: "error", message: "No encontramos la referencia del pago." });
      return;
    }
    api
      .confirm(sessionId)
      .then((d) =>
        setState({
          status: d.paid ? "paid" : "pending",
          course: d.course,
        }),
      )
      .catch((e) => setState({ status: "error", message: e.message }));
  }, []);

  return (
    <div className="wrap-narrow" style={{ padding: "110px 0 130px", textAlign: "center" }}>
      {state.status === "checking" && (
        <>
          <span className="eyebrow">Confirmando con el banco</span>
          <h1 style={{ fontSize: 42, margin: "16px 0" }}>Estamos verificando tu pago…</h1>
          <div className="skeleton" style={{ height: 4, width: 220, margin: "0 auto" }} />
        </>
      )}

      {state.status === "paid" && (
        <>
          <span className="eyebrow">Pago confirmado</span>
          <h1 style={{ fontSize: 46, margin: "16px 0 14px" }}>
            Listo. El curso ya es tuyo.
          </h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 17 }}>
            «{state.course?.title}» quedó guardado en tu cuenta, sin fecha de caducidad. Empieza
            cuando quieras.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32 }}>
            <Link to={`/curso/${state.course?.slug}`} className="btn btn-primary">
              Empezar el curso
            </Link>
            <Link to="/mis-cursos" className="btn btn-ghost">
              Ver mis cursos
            </Link>
          </div>
        </>
      )}

      {state.status === "pending" && (
        <>
          <span className="eyebrow">Pago en proceso</span>
          <h1 style={{ fontSize: 42, margin: "16px 0 14px" }}>Tu pago sigue procesándose</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 17 }}>
            Algunos métodos tardan unos minutos en liberarse. En cuanto el banco confirme, el curso
            aparece solo en tu cuenta.
          </p>
          <Link to="/mis-cursos" className="btn btn-primary" style={{ marginTop: 30 }}>
            Ver el estado
          </Link>
        </>
      )}

      {state.status === "error" && (
        <div className="empty">
          <h3>No pudimos confirmar el pago</h3>
          <p>{state.message}</p>
          <Link to="/mis-cursos" className="btn btn-primary">
            Revisar mis cursos
          </Link>
        </div>
      )}
    </div>
  );
}
