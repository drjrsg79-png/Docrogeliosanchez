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

  if (loading) return <div style={{ padding: '2rem' }}>Cargando...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Panel médico</h1>
      <p>{patients.length} pacientes registrados</p>
      <button onClick={handleLogout} style={{ margin: '1rem 0', padding: '0.5rem 1rem' }}>
        Cerrar sesión
      </button>
      <div style={{ marginTop: '1rem' }}>
        {patients.length === 0 && <p>Aún no hay pacientes registrados.</p>}
        {patients.map((p) => (
          <div key={p.id} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '0.5rem' }}>
            <strong>{p.full_name || 'Sin nombre'}</strong>
            {p.diabetes_type && <p>Tipo: {p.diabetes_type}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
