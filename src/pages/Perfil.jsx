import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Perfil.css'

const PROFILE_URL = 'https://docrogeliosanchez.com/perfil'
const AGENDA_URL = 'https://miadmon.com/agendar'
const SO_URL = 'https://segunda-opinion-internista-419.netlify.app/?origen=perfil'
const SEP_URL = 'https://cedulaprofesional.sep.gob.mx/'
const PHONES = [
  { display: '55 6932 0331', tel: '+525569320331' },
  { display: '55 7208 8675', tel: '+525572088675' },
]

export default function Perfil() {
  useEffect(() => {
    document.body.classList.add('perfil-wide')
    const previousTitle = document.title
    document.title = 'Dr. José Rogelio Sánchez García'
    return () => {
      document.body.classList.remove('perfil-wide')
      document.title = previousTitle
    }
  }, [])

  return (
    <div className="perfil-page">
      <main className="perfil-wrap">
        <article className="perfil-hero">
          <img
            className="perfil-portrait"
            src="/perfil/dr-rogelio.jpg"
            alt="Dr. José Rogelio Sánchez García"
          />
          <h1>Dr. José Rogelio Sánchez García</h1>
          <p className="perfil-specialty">Medicina Interna / Terapia Intensiva</p>
          <p className="perfil-postgrad">Posgrado en heridas y salvamento de extremidad</p>
          <p className="perfil-cedula">
            Cédulas profesionales 4273375 y 6525546 ·
            <br />
            <a href={SEP_URL} target="_blank" rel="noopener noreferrer">verificables en SEP</a>
          </p>
        </article>

        <section className="perfil-actions">
          <a className="perfil-agenda" href={AGENDA_URL} target="_blank" rel="noopener noreferrer">
            Ver horarios y agendar cita
            <span>Polanco · miadmon.com/agendar</span>
          </a>
          <a className="perfil-agenda perfil-so" href={SO_URL} target="_blank" rel="noopener noreferrer">
            Segunda opinión en línea: paga y sube tus estudios · $1,000 MXN
            <span>Videollamada para todo México</span>
          </a>
          <div className="perfil-phones">
            {PHONES.map((phone) => (
              <a key={phone.tel} href={`tel:${phone.tel}`}>{phone.display}</a>
            ))}
          </div>
          <p className="perfil-note">
            <Link to="/">Ir a la app de seguimiento</Link>
          </p>
        </section>

        <section className="perfil-card" aria-label="Tarjeta de presentación">
          <div className="perfil-card-id">
            <img src="/perfil/dr-rogelio.jpg" alt="" />
            <div>
              <h2>Dr. José Rogelio Sánchez García</h2>
              <p>Medicina Interna / Terapia Intensiva</p>
              <p>Posgrado en heridas y salvamento de extremidad</p>
              <p>Cédulas profesionales 4273375 y 6525546</p>
            </div>
          </div>
          <div className="perfil-card-qr">
            <img src="/perfil/qr-perfil.png" alt={`Código QR hacia ${PROFILE_URL}`} />
            <a href={PROFILE_URL}>docrogeliosanchez.com<br />/perfil</a>
          </div>
        </section>

        <button type="button" className="perfil-print" onClick={() => window.print()}>
          Imprimir tarjeta
        </button>
      </main>
    </div>
  )
}
