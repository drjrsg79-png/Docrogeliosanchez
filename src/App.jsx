import { api } from "./api.js";
import { SessionProvider, useSession } from "./session.jsx";
import { Link, match, RouterProvider, useRouter } from "./router.jsx";
import Home from "./pages/Home.jsx";
import Course from "./pages/Course.jsx";
import Lesson from "./pages/Lesson.jsx";
import Access from "./pages/Access.jsx";
import Account from "./pages/Account.jsx";
import PaymentDone from "./pages/PaymentDone.jsx";
import Admin from "./pages/Admin.jsx";

function Masthead() {
  const { user, setUser } = useSession();
  const { path, navigate } = useRouter();

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null);
    navigate("/");
  }

  return (
    <header className="masthead">
      <div className="wrap masthead-inner">
        <Link to="/" className="wordmark">
          <span className="mono">RS</span>
          <span>
            <span className="name">Dr. Rogelio Sánchez</span>
            <span className="sub">Escuela clínica</span>
          </span>
        </Link>
        <nav className="nav">
          <Link to="/" className={path === "/" ? "is-active" : ""}>
            Cursos
          </Link>
          {user ? (
            <>
              <Link to="/mis-cursos" className={path === "/mis-cursos" ? "is-active" : ""}>
                Mis cursos
              </Link>
              <button onClick={logout}>Salir</button>
            </>
          ) : (
            <>
              <Link to="/entrar">Entrar</Link>
              <Link to="/registro" className="btn btn-primary" style={{ padding: "9px 18px" }}>
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <div>
          <strong>Dr. Rogelio Sánchez</strong>
          Medicina Interna · Terapia Intensiva
          <br />
          Salvamento de extremidad y pie diabético
        </div>
        <div>
          <strong>Cursos</strong>
          <Link to="/?track=patient">Para pacientes y familiares</Link>
          <br />
          <Link to="/?track=doctor">Para profesionales de la salud</Link>
        </div>
        <div>
          <strong>Aviso</strong>
          El contenido es material educativo.
          <br />
          No sustituye la consulta ni el tratamiento individual.
        </div>
      </div>
    </footer>
  );
}

function Routes() {
  const { path } = useRouter();

  const course = match("/curso/:slug", path);
  if (course) return <Course slug={course.slug} />;

  const lesson = match("/curso/:slug/leccion/:id", path);
  if (lesson) return <Lesson slug={lesson.slug} lessonId={Number(lesson.id)} />;

  if (path === "/entrar") return <Access mode="login" />;
  if (path === "/registro") return <Access mode="register" />;
  if (path === "/mis-cursos") return <Account />;
  if (path === "/pago/confirmado") return <PaymentDone />;
  if (path === "/panel") return <Admin />;
  if (path === "/") return <Home />;

  return (
    <div className="wrap" style={{ padding: "120px 0" }}>
      <div className="empty">
        <h3>Esta página no existe</h3>
        <p>Puede que el enlace haya cambiado. Vuelve al catálogo para encontrar el curso.</p>
        <Link to="/" className="btn btn-primary">
          Ver todos los cursos
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <SessionProvider>
        <div className="shell">
          <Masthead />
          <main>
            <Routes />
          </main>
          <Footer />
        </div>
      </SessionProvider>
    </RouterProvider>
  );
}
