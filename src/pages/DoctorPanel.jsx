import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function DoctorPanel() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function loadPatients() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
        .order('full_name')
      setPatients(data || [])
      setLoading(false)
    }
    loadPatients()
  }, [navigate])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) return <div className="container">Cargando...</div>

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">Panel médico</div>
        <div className="header-subtitle">{patients.length} pacientes registrados</div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        <div className="section-label">Pacientes</div>

        {patients.length === 0 && (
          <div className="empty-state">Aún no hay pacientes registrados.</div>
        )}

        {patients.map((p) => (
          <div key={p.id} className="card">
            <div className="card-title">{p.full_name || 'Sin nombre'}</div>
            {p.diabetes_type && <div className="card-meta">Tipo de diabetes: {p.diabetes_type}</div>}
          </div>
        ))}

        <button onClick={handleLogout} className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
