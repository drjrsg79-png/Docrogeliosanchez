import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AGENDA_URL, DOCTOR_SHORT, SPECIALTIES, WA_CLINIC_MESSAGE, whatsappUrl } from '../lib/clinic'

const BENEFICIOS = [
  { titulo: 'Segunda opinión', detalle: 'El doctor revisa tu caso y tus estudios. No necesitas cuenta para pedirla.' },
  { titulo: 'Glucosa', detalle: 'Registra tus mediciones y tenlas a la mano en tu siguiente consulta.' },
  { titulo: 'Historial médico', detalle: 'Antecedentes, medicamentos y alergias en un solo lugar.' },
  { titulo: 'Orientación', detalle: 'Resuelve dudas del día a día. No sustituye la consulta.' },
  { titulo: 'La clínica', detalle: 'WhatsApp y sucursales para agendar en Querétaro, Polanco, Tlalnepantla o Tapachula.' },
  { titulo: 'Otros registros', detalle: 'Si te sirven, también puedes anotar peso, comidas o ejercicio.' },
]

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const [showBenefits, setShowBenefits] = useState(false)
  const navigate = useNavigate()

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (data.session) {
      navigate('/dashboard')
    } else {
      setConfirmMessage('Tu cuenta se creó correctamente. Revisa tu correo para confirmar tu registro antes de iniciar sesión.')
    }
  }

  return (
    <div className="page">
      <div className="header" style={{ padding: '1.5rem 1.25rem' }}>
        <div className="header-title" style={{ fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.2 }}>
          {DOCTOR_SHORT}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {SPECIALTIES}
        </div>
      </div>

      <div className="auth-container" style={{ maxWidth: '480px', margin: '0 auto', padding: '1.5rem 1.25rem 1rem' }}>
        <h1 className="page-title" style={{ marginTop: 0 }}>Crear cuenta</h1>
        <p className="page-subtitle">Regístrate para comenzar tu seguimiento clínico.</p>

        {confirmMessage ? (
          <div className="card">{confirmMessage}</div>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="field">
              <label>Nombre completo</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Teléfono</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div className="field">
              <label>Correo electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>

            {error && <div className="alert-error">{error}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        )}

        <p className="page-subtitle" style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
        <p className="public-links">
          <Link to="/segunda-opinion">Segunda opinión</Link>
          <a href={AGENDA_URL} target="_blank" rel="noopener noreferrer">Agendar cita</a>
          <a href={whatsappUrl(WA_CLINIC_MESSAGE)} target="_blank" rel="noopener noreferrer">WhatsApp clínica</a>
          <Link to="/">Inicio</Link>
        </p>
      </div>

      <div className="container" style={{ maxWidth: '480px', margin: '0 auto', padding: '0 1.25rem 2rem' }}>
        <button
          type="button"
          onClick={() => setShowBenefits((v) => !v)}
          style={{
            width: '100%',
            background: 'none',
            border: '1px solid rgba(15,76,92,0.15)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 600,
            color: '#0F4C5C',
            fontSize: '0.9375rem',
          }}
        >
          Qué puedes hacer aquí
          <span>{showBenefits ? '▲' : '▼'}</span>
        </button>

        {showBenefits && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              marginTop: '0.75rem',
            }}
          >
            {BENEFICIOS.map((b) => (
              <div
                key={b.titulo}
                className="card"
                style={{ boxShadow: '0 1px 3px rgba(15,76,92,0.08)', padding: '0.875rem', margin: 0 }}
              >
                <div className="card-title" style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{b.titulo}</div>
                <div className="card-meta" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{b.detalle}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
          }
