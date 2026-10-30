import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import ClinicCard from '../components/ClinicCard'
import Prestaciones from '../components/Prestaciones'
import { DOCTOR_SHORT } from '../lib/clinic'

function Icon({ name, color }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'drop':
      return <svg {...common}><path d="M12 2c4 5 7 8.5 7 12.5A7 7 0 1 1 5 14.5C5 10.5 8 7 12 2Z" /></svg>
    case 'scale':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v4l2.5 2.5" /></svg>
    case 'fork':
      return <svg {...common}><path d="M7 2v8M9 2v8M7 6h2M7 10v12M17 2c-1.5 0-2.5 1.5-2.5 4s1 4 2.5 4v10" /></svg>
    case 'run':
      return <svg {...common}><circle cx="15" cy="5" r="2" /><path d="M13 9l-3 3 2 3-2 6M13 9l4 2 3-2M10 12l-4 1v5" /></svg>
    case 'glass':
      return <svg {...common}><path d="M6 3h12l-1.5 17a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1L6 3Z" /><path d="M6.7 8h10.6" /></svg>
    case 'notes':
      return <svg {...common}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>
    case 'dumbbell':
      return <svg {...common}><path d="M4 9v6M20 9v6M7 7v10M17 7v10M2 12h3M19 12h3M7 12h10" /></svg>
    case 'clipboard':
      return <svg {...common}><rect x="6" y="4" width="12" height="17" rx="2" /><rect x="9" y="2" width="6" height="4" rx="1" /><path d="M9 11h6M9 15h6" /></svg>
    case 'chat':
      return <svg {...common}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" /></svg>
    case 'calendar':
      return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
    default:
      return null
  }
}

const MAS = [
  { href: '/peso', label: 'Peso', icon: 'scale', color: '#0f4c5c' },
  { href: '/comidas', label: 'Comidas', icon: 'fork', color: '#a15c00' },
  { href: '/ejercicio', label: 'Ejercicio', icon: 'run', color: '#1e6b3c' },
  { href: '/agua', label: 'Agua', icon: 'glass', color: '#1565c0' },
]

function formatMeasuredAt(iso) {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [latestGlucose, setLatestGlucose] = useState(null)
  const [glucoseTrend, setGlucoseTrend] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(profileData)

      const { data: glucoseRecent } = await supabase
        .from('glucose_logs')
        .select('value_mg_dl, measured_at')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: false })
        .limit(7)
      if (glucoseRecent && glucoseRecent.length > 0) {
        setLatestGlucose(glucoseRecent[0])
        setGlucoseTrend([...glucoseRecent].reverse().map((g) => ({ valor: g.value_mg_dl })))
      }

      setLoading(false)
    }
    load()
  }, [navigate])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) return <div className="container">Cargando...</div>

  const antecedentesIncompletos = !profile?.diagnosis_year && !profile?.diabetes_type

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">{profile?.full_name || 'Paciente'}</div>
        <div className="header-subtitle">Tu seguimiento con {DOCTOR_SHORT}</div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        <Link to="/glucosa" className="glucose-hero">
          <div>
            <div className="section-label" style={{ marginBottom: '0.35rem' }}>Glucosa</div>
            <div className="glucose-value">
              {latestGlucose ? `${latestGlucose.value_mg_dl} mg/dL` : 'Sin registros'}
            </div>
            <div className="card-meta">
              {latestGlucose ? formatMeasuredAt(latestGlucose.measured_at) : 'Toca para registrar una medición'}
            </div>
          </div>
          {glucoseTrend.length > 1 && (
            <div className="glucose-spark">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={glucoseTrend}>
                  <Line type="monotone" dataKey="valor" stroke="#0f4c5c" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Link>

        <Link to="/dieta" className="cta-diet">
          <span className="cta-kicker">Tu dieta</span>
          <strong>Plan de alimentación</strong>
          <span>Saca tu dieta aquí. El plan de la semana se arma con tu caso.</span>
        </Link>

        {antecedentesIncompletos && (
          <Link to="/antecedentes" className="card" style={{ display: 'block', textDecoration: 'none', backgroundColor: '#fdf1e3', borderColor: '#a15c00' }}>
            <div className="card-title" style={{ color: '#a15c00' }}>Completa tu historial médico</div>
            <div className="card-meta" style={{ color: '#a15c00' }}>Así el plan de alimentación sale más cercano a tu caso.</div>
          </Link>
        )}

        <Prestaciones />

        <ClinicCard />

        <details className="more-tools">
          <summary>Más registros</summary>
          <p className="card-meta">Peso, comidas, ejercicio y agua. Tu dieta está arriba, en Plan de alimentación.</p>
          <div className="tool-grid">
            {MAS.map((item) => (
              <Link key={item.href} to={item.href} className="tool-tile">
                <span className="icon-circle" style={{ backgroundColor: `${item.color}18` }}>
                  <Icon name={item.icon} color={item.color} />
                </span>
                <span className="card-title" style={{ fontSize: '0.8125rem' }}>{item.label}</span>
              </Link>
            ))}
          </div>
        </details>

        <button onClick={handleLogout} className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
