import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const navigate = useNavigate()

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
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
      <div className="header">
        <div className="header-title">Dr. Rogelio Sánchez</div>
      </div>
      <div className="auth-container">
        <h1 className="page-title">Crear cuenta</h1>
        <p className="page-subtitle">Regístrate para comenzar tu seguimiento clínico.</p>
        {confirmMessage ? (
          <div className="card">{confirmMessage}</div>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="field">
              <label>Nombre completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && <div className="alert-error">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Registrarme'}
            </button>
          </form>
        )}
        <p className="footer-link">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
                }
