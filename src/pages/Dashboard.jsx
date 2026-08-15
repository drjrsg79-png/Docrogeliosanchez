import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
      setLoading(false)
    }
    loadProfile()
  }, [navigate])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) return <div className="container">Cargando...</div>

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">{profile?.full_name || 'Paciente'}</div>
        <div className="header-subtitle">Panel de seguimiento</div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        <div className="section-label">Seguimiento</div>

        <a href="/glucosa" style={{ textDecoration: 'none' }}>
          <div className="card">
            <div className="card-title">Glucosa</div>
            <div className="card-meta">Registra y consulta tus mediciones</div>
          </div>
        </a>

        <a href="/peso" style={{ textDecoration: 'none' }}>
          <div className="card">
            <div className="card-title">Peso</div>
            <div className="card-meta">Registra tu peso e IMC</div>
          </div>
        </a>

        <div className="card" style={{ opacity: 0.6 }}>
          <div className="card-title">Comidas</div>
          <div className="card-meta">Próximamente</div>
        </div>

        <div className="card" style={{ opacity: 0.6 }}>
          <div className="card-title">Ejercicio</div>
          <div className="card-meta">Próximamente</div>
        </div>

        <div className="card" style={{ opacity: 0.6 }}>
          <div className="card-title">Cuidado de heridas</div>
          <div className="card-meta">Próximamente</div>
        </div>

        <button onClick={handleLogout} className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
