import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const ACCIONES = [
  { href: '/glucosa', label: 'Glucosa' },
  { href: '/peso', label: 'Peso' },
  { href: '/comidas', label: 'Comidas' },
  { href: '/ejercicio', label: 'Ejercicio' },
  { href: '/agua', label: 'Agua' },
  { href: '/antecedentes', label: 'Antecedentes' },
]

const PLANES = [
  { href: '/rutina', label: 'Rutina de ejercicio' },
  { href: '/dieta', label: 'Plan de alimentación' },
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

        <div className="card">
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
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-title" style={{ fontSize: '0.8125rem' }}>Glucosa</div>
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

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-title" style={{ fontSize: '0.8125rem' }}>Agua</div>
            <div className="card-meta">{waterToday} ml hoy</div>
          </div>
        </div>

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Registrar</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          {ACCIONES.map((a) => (
            <a key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ marginBottom: 0, textAlign: 'center', padding: '1rem 0.75rem' }}>
                <div className="card-title" style={{ fontSize: '0.875rem' }}>{a.label}</div>
              </div>
            </a>
          ))}
        </div>

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Planes personalizados</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {PLANES.map((p) => (
            <a key={p.href} href={p.href} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ marginBottom: 0, textAlign: 'center', padding: '1rem 0.75rem' }}>
                <div className="card-title" style={{ fontSize: '0.875rem' }}>{p.label}</div>
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
