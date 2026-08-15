import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const GLUCOSE_LOW = 60
const GLUCOSE_HIGH = 180

export default function DoctorPanel() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function loadPatients() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
        .order('full_name')

      const { data: recentGlucose } = await supabase
        .from('glucose_logs')
        .select('user_id, value_mg_dl, measured_at')
        .order('measured_at', { ascending: false })
        .limit(500)

      const latestByUser = {}
      ;(recentGlucose || []).forEach((g) => {
        if (!latestByUser[g.user_id]) {
          latestByUser[g.user_id] = g
        }
      })

      const withStatus = (profiles || []).map((p) => {
        const latest = latestByUser[p.id]
        let status = 'sin-datos'
        if (latest) {
          status = latest.value_mg_dl < GLUCOSE_LOW || latest.value_mg_dl > GLUCOSE_HIGH ? 'alerta' : 'normal'
        }
        return { ...p, latestGlucose: latest, status }
      })

      const order = { alerta: 0, normal: 1, 'sin-datos': 2 }
      withStatus.sort((a, b) => order[a.status] - order[b.status])

      setPatients(withStatus)
      setLoading(false)
    }
    loadPatients()
  }, [navigate])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) return <div className="container">Cargando...</div>

  const alertCount = patients.filter((p) => p.status === 'alerta').length

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredPatients = normalizedSearch
    ? patients.filter((p) => (p.full_name || '').toLowerCase().includes(normalizedSearch))
    : patients

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">Panel médico</div>
        <div className="header-subtitle">
          {patients.length} pacientes registrados{alertCount > 0 ? ` · ${alertCount} con alerta` : ''}
        </div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar paciente por nombre..."
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem 0.625rem 2.5rem',
              borderRadius: '10px',
              border: '1px solid rgba(15,76,92,0.2)',
              fontSize: '0.9375rem',
              boxSizing: 'border-box',
            }}
          />
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5c6b73"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#5c6b73',
                fontSize: '1.125rem',
                lineHeight: 1,
                padding: '0.25rem',
              }}
            >
              ×
            </button>
          )}
        </div>

        <div className="section-label">
          Pacientes{normalizedSearch ? ` (${filteredPatients.length})` : ''}
        </div>

        {patients.length === 0 && (
          <div className="empty-state">Aún no hay pacientes registrados.</div>
        )}

        {patients.length > 0 && filteredPatients.length === 0 && (
          <div className="empty-state">No se encontró ningún paciente con ese nombre.</div>
        )}

        {filteredPatients.map((p) => (
          <Link
            key={p.id}
            to={`/doctor/patient/${p.id}`}
            className="card"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit',
              borderLeft: p.status === 'alerta' ? '4px solid #d64545' : '4px solid transparent',
            }}
          >
            <div>
              <div className="card-title">{p.full_name || 'Sin nombre'}</div>
              {p.diabetes_type && <div className="card-meta">Tipo de diabetes: {p.diabetes_type}</div>}
              {p.latestGlucose ? (
                <div
                  className="card-meta"
                  style={{ color: p.status === 'alerta' ? '#d64545' : undefined, fontWeight: p.status === 'alerta' ? 600 : 400 }}
                >
                  Última glucosa: {p.latestGlucose.value_mg_dl} mg/dL{p.status === 'alerta' ? ' — fuera de rango' : ''}
                </div>
              ) : (
                <div className="card-meta">Sin registros de glucosa</div>
              )}
            </div>
            <span style={{ color: '#0F4C5C', fontSize: '1.25rem' }}>›</span>
          </Link>
        ))}

        <button onClick={handleLogout} className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
