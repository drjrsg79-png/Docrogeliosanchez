import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const BENEFICIOS = [
  {
    titulo: 'Seguimiento diario',
    detalle: 'Registra tu glucosa, peso, comidas, ejercicio y agua en un solo lugar.',
  },
  {
    titulo: 'Alertas automáticas',
    detalle: 'Te avisamos si tu glucosa está fuera de rango, con recomendaciones claras al momento.',
  },
  {
    titulo: 'Escanea tu comida',
    detalle: 'Toma una foto de tu platillo y calculamos calorías, macros y si te conviene comerlo.',
  },
  {
    titulo: 'Planes con inteligencia artificial',
    detalle: 'Genera tu plan de alimentación y rutina de ejercicio semanal, personalizados a tu condición.',
  },
  {
    titulo: 'Descarga y comparte',
    detalle: 'Exporta tus planes en PDF y compártelos por WhatsApp con quien tú decidas.',
  },
  {
    titulo: 'Tu doctor te acompaña',
    detalle: 'El Dr. Rogelio Sánchez da seguimiento a tu evolución para ajustar tu tratamiento.',
  },
]

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
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
      setConfirmMessage('Tu cuenta se creo correctamente. Revisa tu correo para confirmar tu registro antes de iniciar sesion.')
    }
  }

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">Dr. Rogelio Sanchez</div>
      </div>

      <div className="container" style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div className="section-label" style={{ marginTop: '1.5rem' }}>Que puedes hacer aqui</div>
        {BENEFICIOS.map((b) => (
          <div key={b.titulo} className="card" style={{ boxShadow: '0 1px 3px rgba(15,76,92,0.08)' }}>
            <div className="card-title" style={{ fontSize: '0.9375rem' }}>{b.titulo}</div>
            <div className="card-meta">{b.detalle}</div>
          </div>
        ))}

        <p className="card-meta" style={{ textAlign: 'center', margin: '1.25rem 0' }}>
          Entre mas completa tu informacion, mas precisas seran tus recomendaciones.
        </p>
      </div>

      <div className="auth-container" style={{ margin: '0 auto 3rem', paddingTop: 0 }}>
        <h1 className="page-title">Crear cuenta</h1>
        <p className="page-subtitle">Registrate para comenzar tu seguimiento clinico.</p>
        {confirmMessage ? (
          <div className="card">{confirmMessage}</div>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="field">
              <label>Nombre completo</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div cla
