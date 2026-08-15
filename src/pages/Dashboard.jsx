import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

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
    default:
      return null
  }
}

const ACCIONES = [
  { href: '/glucosa', label: 'Glucosa', icon: 'drop', color: '#b3261e' },
  { href: '/peso', label: 'Peso', icon: 'scale', color: '#0f4c5c' },
  { href: '/comidas', label: 'Comidas', icon: 'fork', color: '#a15c00' },
  { href: '/ejercicio', label: 'Ejercicio', icon: 'run', color: '#1e6b3c' },
  { href: '/agua', label: 'Agua', icon: 'glass', color: '#1565c0' },
  { href: '/antecedentes', label: 'Antecedentes', icon: 'notes', color: '#5c6b73' },
]

const PLANES = [
  { href: '/rutina', label: 'Rutina de ejercicio', icon: 'dumbbell', color: '#1e6b3c' },
  { href: '/dieta', label: 'Plan de alimentación', icon: 'clipboard', color: '#a15c00' },
]

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [caloriesIn, setCaloriesIn] = useState(0)
  const [caloriesOut, setCaloriesOut] = useState(0)
  const [waterToday, setWaterToday] = useState(0)
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

      const today = startOfToday().toISOString()

      const { data: meals } = await supabase
        .from('meals')
        .select('calories')
        .eq('user_id', user.id)
        .gte('logged_at', today)
      setCaloriesIn((meals || []).reduce((sum, m) => sum + (m.calories || 0), 0))

      const { data: exercises } = await supabase
        .from('exercise_logs')
        .select('calories_burned')
        .eq('user_id', user.id)
        .gte('logged_at', today)
      setCaloriesOut((exercises || []).reduce((sum, e) => sum + (e.calories_burned || 0), 0))

      const { data: water } = await supabase
        .from('water_logs')
        .select('amount_ml')
        .eq('user_id', user.id)
        .gte('logged_at', today)
      setWaterToday((water || []).reduce((sum, w) => sum + (w.amount_ml || 0), 0))

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

  const meta = profile?.daily_calorie_goal || 2000
  const balance = caloriesIn - caloriesOut
  const porcentajeMeta = Math.min(100, Math.round((caloriesIn / meta) * 100))
  const semaforo = porcentajeMeta < 90 ? '#1e6b3c' : porcentajeMeta <= 105 ? '#a15c00' : '#b3261e'
  const antecedentesIncompletos = !profile?.diagnosis_year && !profile?.diabetes_type

  const gridItemStyle = {
    marginBottom: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    boxShadow: '0 1px 3px rgba(15,76,92,0.08)',
  }

  const iconCircle = (color) => ({
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: `${color}18`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  })

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">{profile?.full_name || 'Paciente'}</div>
        <div className="header-subtitle">Panel de seguimiento</div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        {antecedentesIncompletos && (
          <a href="/antecedentes" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ backgroundColor: '#fdf1e3', borderColor: '#a15c00' }}>
              <div className="card-title" style={{ color: '#a15c00' }}>Completa tus antecedentes médicos</div>
              <div className="card-meta" style={{ color: '#a15c00' }}>Toca aquí para personalizar tu seguimiento.</div>
            </div>
          </a>
        )}

        <div className="section-label">Hoy</div>

        <div className="card" style={{ boxShadow: '0 1px 3px rgba(15,76,92,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: semaforo }}>{caloriesIn} kcal</div>
              <div className="card-meta">Consumidas de {meta} kcal meta</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#5c6b73' }}>{caloriesOut} kcal</div>
              <div className="card-meta">Quemadas</div>
            </div>
          </div>
          <div style={{ height: '6px', backgroundColor: '#dde3e6', borderRadius: '999px', overflow: 'hidden', marginTop: '0.75rem' }}>
            <div style={{ height: '100%', width: `${porcentajeMeta}%`, backgroundColor: semaforo, borderRadius: '999px' }} />
          </div>
          <div className="card-meta" style={{ marginTop: '0.5rem' }}>Balance neto: {balance >= 0 ? '+' : ''}{balance} kcal</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div className="card" style={{ marginBottom: 0, boxShadow: '0 1px 3px rgba(15,76,92,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
              <Icon name="drop" color="#b3261e" />
              <div className="card-title" style={{ fontSize: '0.8125rem' }}>Glucosa</div>
            </div>
            {latestGlucose ? (
              <div className="card-meta">{latestGlucose.value_mg_dl} mg/dL</div>
            ) : (
              <div className="card-meta">Sin registros</div>
            )}
            {glucoseTrend.length > 1 && (
              <div style={{ width: '100%', height: '28px', marginTop: '0.25rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={glucoseTrend}>
                    <Line type="monotone" dataKey="valor" stroke="#0f4c5c" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: 0, boxShadow: '0 1px 3px rgba(15,76,92,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
              <Icon name="glass" color="#1565c0" />
              <div className="card-title" style={{ fontSize: '0.8125rem' }}>Agua</div>
            </div>
            <div className="card-meta">{waterToday} ml hoy</div>
          </div>
        </div>

        <a href="/chat" style={{ textDecoration: 'none' }}>
          <div
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, #0f4c5c 0%, #0a3844 100%)',
              boxShadow: '0 2px 8px rgba(15,76,92,0.28)',
            }}
          >
            <div style={{ ...iconCircle('#ffffff'), backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <Icon name="chat" color="#ffffff" />
            </div>
            <div>
              <div className="card-title" style={{ color: '#ffffff', fontSize: '0.9375rem' }}>Mi asistente</div>
              <div className="card-meta" style={{ color: 'rgba(255,255,255,0.75)' }}>Pregunta lo que necesites sobre tu salud</div>
            </div>
          </div>
        </a>

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Registrar</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          {ACCIONES.map((a) => (
            <a key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
              <div className="card" style={gridItemStyle}>
                <div style={iconCircle(a.color)}>
                  <Icon name={a.icon} color={a.color} />
                </div>
                <div className="card-title" style={{ fontSize: '0.875rem' }}>{a.label}</div>
              </div>
            </a>
          ))}
        </div>

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Planes personalizados</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {PLANES.map((p) => (
            <a key={p.href} href={p.href} style={{ textDecoration: 'none' }}>
              <div className="card" style={gridItemStyle}>
                <div style={iconCircle(p.color)}>
                  <Icon name={p.icon} color={p.color} />
                </div>
                <div className="card-title" style={{ fontSize: '0.8125rem' }}>{p.label}</div>
              </div>
            </a>
          ))}
        </div>

        <button onClick={handleLogout} className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
            }
