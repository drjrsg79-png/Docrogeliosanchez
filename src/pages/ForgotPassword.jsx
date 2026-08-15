import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (resetError) {
      setError('No se pudo enviar el correo. Intenta de nuevo.')
      return
    }

    setSent(true)
  }

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">Dr. Rogelio Sánchez</div>
      </div>
      <div className="auth-container">
        <h1 className="page-title">Recuperar contraseña</h1>
        <p className="page-subtitle">Te enviaremos un correo con instrucciones para restablecerla.</p>

        {sent ? (
          <div className="card" style={{ backgroundColor: '#eaf5ee', borderColor: '#1e6b3c', color: '#1e6b3c' }}>
            Revisa tu correo ({email}) y sigue el enlace para crear una nueva contraseña. Si no lo ves, checa la carpeta de spam.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <div className="alert-error">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar instrucciones'}
            </button>
          </form>
        )}

        <p className="footer-link">
          <Link to="/login">← Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}
