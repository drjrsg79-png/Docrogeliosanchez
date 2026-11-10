import { Link } from 'react-router-dom'
import { AGENDA_URL, WA_CLINIC_MESSAGE, WHATSAPP_DISPLAY, whatsappUrl } from '../lib/clinic'

export default function FollowUpCta() {
  return (
    <div className="page">
      <header className="header">
        <Link to="/" className="back-link" style={{ color: '#fff', textDecoration: 'none', fontSize: '0.875rem', opacity: 0.85 }}>‹ Inicio</Link>
        <h1 className="header-title">Seguimiento con el doctor</h1>
      </header>
      <main className="container">
        <section className="card">
          <p className="card-meta">
            El expediente compartido con el doctor no está disponible en esta app.
            Para tu consulta, agenda o escribe por WhatsApp.
          </p>
          <a className="btn btn-primary" href={AGENDA_URL} target="_blank" rel="noopener noreferrer" style={{ marginTop: '1rem' }}>
            Agendar cita
          </a>
          <a
            className="btn btn-wa"
            href={whatsappUrl(WA_CLINIC_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginTop: '0.75rem' }}
          >
            WhatsApp {WHATSAPP_DISPLAY}
          </a>
        </section>
        <p className="public-links">
          <Link to="/">Inicio</Link>
          <Link to="/perfil">Perfil del doctor</Link>
        </p>
      </main>
    </div>
  )
}
