import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError('No se pudo actualizar la contraseña. El enlace pudo haber expirado.')
      return
    }

    setSuccess(true)
    setTimeout(() => navigate('/login'), 2500)
  }

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">Dr. Rogelio Sánchez</div>
      </div>
      <div className="auth-container">
        <h1 className="page-title">Crear nueva contraseña</h1>

        {!ready && !success && (
          <p className="page-subtitle">Verificando el enlace de recuperación...</p>
        )}

        {success ? (
          <div className="card" style={{ backgroundColor: '#eaf5ee', borderColor: '#1e6b3c', color: '#1e6b3c' }}>
            Contraseña actualizada. Redirigiendo a iniciar sesión...
          </div>
        ) : ready ? (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="field">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && <div className="alert-error">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        ) : (
          <p className="footer-link">
            <Link to="/forgot-password">Solicitar un nuevo enlace</Link>
          </p>
        )}
      </div>
    </div>
  )
}
