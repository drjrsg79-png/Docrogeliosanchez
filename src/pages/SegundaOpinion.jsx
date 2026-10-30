import { Link } from 'react-router-dom'
import ClinicCard from '../components/ClinicCard'
import {
  AGENDA_URL,
  DOCTOR_FULL,
  DOCTOR_SHORT,
  SO_PRICE,
  SO_URL,
  WA_SO_MESSAGE,
  whatsappUrl,
} from '../lib/clinic'

const PASOS = [
  'Escribes por WhatsApp y acuerdan un horario.',
  'Subes fotos, estudios y recetas, y pagas la consulta.',
  'Tienen la videollamada, de hasta 45 minutos.',
  'Recibes un resumen por escrito con las recomendaciones.',
]

export default function SegundaOpinion() {
  return (
    <div className="page">
      <header className="header hub-header">
        <Link to="/" className="back-link">‹ Inicio</Link>
        <h1 className="header-title hub-title">Segunda opinión</h1>
        <p className="header-subtitle">{DOCTOR_SHORT} · videollamada para todo México</p>
      </header>

      <main className="container hub-main">
        <p className="hub-lead">
          Si tienes dudas de un diagnóstico, un tratamiento o una herida, {DOCTOR_FULL} revisa tus estudios y te explica tus opciones con calma.
        </p>

        <section className="card price-card">
          <p className="price">{SO_PRICE}</p>
          <p className="card-meta">Incluye la revisión previa de tus estudios y un resumen por escrito. El horario se confirma por WhatsApp.</p>
        </section>

        <section className="card">
          <h2 className="card-title">Cómo funciona</h2>
          <ol className="steps">
            {PASOS.map((paso) => (
              <li key={paso}>{paso}</li>
            ))}
          </ol>
        </section>

        <p className="fine-print">
          El pago con Mercado Pago y la carga de fotos están en el formulario oficial. No necesitas crear cuenta en esta app.
        </p>
        <a className="btn btn-primary" href={SO_URL}>
          Continuar al formulario
        </a>
        <a
          className="btn btn-wa"
          href={whatsappUrl(WA_SO_MESSAGE)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginTop: '0.75rem' }}
        >
          Agendar por WhatsApp
        </a>

        <p className="fine-print">
          Si lo que necesitas es una cita en consultorio, <a href={AGENDA_URL} target="_blank" rel="noopener noreferrer">agenda aquí</a>.
        </p>
        <p className="fine-print">
          No es para urgencias. Si hay dolor de pecho, falta de aire, sangrado abundante o pérdida de conciencia, llama al 911.
        </p>

        <ClinicCard includeWhatsApp={false} />
      </main>
    </div>
  )
}
