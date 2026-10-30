import { Link } from 'react-router-dom'
import ClinicCard from '../components/ClinicCard'
import Prestaciones from '../components/Prestaciones'
import {
  AGENDA_DETAIL,
  AGENDA_URL,
  DOCTOR_FULL,
  DOCTOR_SHORT,
  INTERNATIONAL_URL,
  SO_PRICE,
  SPECIALTIES,
  WA_CLINIC_MESSAGE,
  WHATSAPP_DISPLAY,
  whatsappUrl,
} from '../lib/clinic'

export default function Home() {
  return (
    <div className="page">
      <header className="header hub-header">
        <p className="hub-kicker">Clínica de Heridas y Pie Diabético</p>
        <h1 className="header-title hub-title">{DOCTOR_SHORT}</h1>
        <p className="header-subtitle">{SPECIALTIES}</p>
      </header>

      <main className="container hub-main">
        <p className="hub-lead">
          Aquí sacas tu dieta. También sigues tu glucosa, pides una segunda opinión o agendas en la clínica.
        </p>

        <Link to="/dieta" className="cta-diet">
          <span className="cta-kicker">Tu dieta</span>
          <strong>Plan de alimentación</strong>
          <span>Saca tu dieta aquí. Entra y obtienes el plan de la semana.</span>
        </Link>

        <Link to="/segunda-opinion" className="cta-so">
          <span className="cta-kicker">Sin crear cuenta</span>
          <strong>Segunda opinión</strong>
          <span>Revisa tus estudios contigo · {SO_PRICE}</span>
        </Link>

        <a className="cta-agenda" href={AGENDA_URL} target="_blank" rel="noopener noreferrer">
          <strong>Agendar cita</strong>
          <span>{AGENDA_DETAIL}</span>
        </a>

        <a
          className="cta-wa"
          href={whatsappUrl(WA_CLINIC_MESSAGE)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <strong>WhatsApp clínica</strong>
          <span>{WHATSAPP_DISPLAY}</span>
        </a>

        <div className="auth-pair">
          <Link to="/login" className="btn btn-secondary">Entrar</Link>
          <Link to="/register" className="btn btn-secondary">Crear cuenta</Link>
        </div>

        <Prestaciones needsAccount />

        <section className="card">
          <h2 className="card-title">Quién es el doctor</h2>
          <p className="card-meta clinic-copy">
            {DOCTOR_FULL} atiende medicina interna, terapia intensiva, heridas y pie diabético.
            En esta app sacas tu dieta, registras tu glucosa y guardas tu historial. La segunda opinión y las citas se coordinan con él y con la clínica.
          </p>
        </section>

        <ClinicCard includeWhatsApp={false} />

        <a className="cta-quiet" href={INTERNATIONAL_URL} target="_blank" rel="noopener noreferrer">
          <strong>Pacientes fuera de México</strong>
          <span>Wound care and second opinion, in English or Spanish.</span>
        </a>

        <p className="fine-print">
          Tus datos de la cuenta son confidenciales.
        </p>
      </main>
    </div>
  )
}
