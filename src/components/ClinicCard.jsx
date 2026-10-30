import {
  CLINIC_NAME,
  CLINIC_PHONE_DISPLAY,
  CLINIC_PHONE_TEL,
  POLANCO_ADDRESS,
  SUCURSALES,
  WA_CLINIC_MESSAGE,
  WHATSAPP_DISPLAY,
  whatsappUrl,
} from '../lib/clinic'

export default function ClinicCard({ includeWhatsApp = true }) {
  return (
    <section className="card clinic-card">
      <h2 className="card-title">{CLINIC_NAME}</h2>
      <p className="card-meta">Sucursales</p>
      <div className="branch-row">
        {SUCURSALES.map((ciudad) => (
          <span key={ciudad} className="branch-chip">{ciudad}</span>
        ))}
      </div>
      <p className="card-meta">Consultorio base: {POLANCO_ADDRESS}.</p>
      <div className="clinic-actions">
        {includeWhatsApp && (
          <a
            className="btn btn-wa"
            href={whatsappUrl(WA_CLINIC_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp {WHATSAPP_DISPLAY}
          </a>
        )}
        <a className="btn btn-secondary" href={`tel:${CLINIC_PHONE_TEL}`}>
          Llamar {CLINIC_PHONE_DISPLAY}
        </a>
      </div>
    </section>
  )
}
