import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [caloriesIn, setCaloriesIn] = useState(0)
  const [caloriesOut, setCaloriesOut] = useState(0)
  const [waterToday, setWaterToday] = useState(0)
  const [latestGlucose, setLatestGlucose] = useState(null)
  const [glucoseTrend, setGlucoseTrend] = useState([])
  const [weightTrend, setWeightTrend] = useState([])
  const [streak, setStreak] = useState(0)
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

      const { data: weightRecent } = await supabase
        .from('weight_logs')
        .select('weight_kg, logged_at')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(7)
      if (weightRecent) {
        setWeightTrend([...weightRecent].reverse().map((w) => ({ valor: w.weight_kg })))
      }

      const { data: glucoseDates } = await supabase
        .from('glucose_logs')
        .select('measured_at')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: false })
        .limit(60)
      if (glucoseDates) {
        const uniqueDays = [...new Set(glucoseDates.map((g) => new Date(g.measured_at).toDateString()))]
        let count = 0
        let cursor = new Date()
        for (const day of uniqueDays) {
          if (day === cursor.toDateString()) {
            count++
            cursor.setDate(cursor.getDate() - 1)
          } else {
            break
          }
        }
        setStreak(count)
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
              <div className="card-meta" style={{ color: '#a15c00' }}>Esto ayuda a personalizar tu seguimiento y tus planes.</div>
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

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-title">Última glucosa</div>
              {latestGlucose ? (
                <div className="card-meta">
                  {latestGlucose.value_mg_dl} mg/dL · {new Date(latestGlucose.measured_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </div>
              ) : (
                <div className="card-meta">Sin registros aún</div>
              )}
            </div>
            {glucoseTrend.length > 1 && (
              <div style={{ width: '80px', height: '36px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={glucoseTrend}>
                    <Line type="monotone" dataKey="valor" stroke="#0f4c5c" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Agua</div>
          <div className="card-meta">{waterToday} ml registrados hoy</div>
        </div>

        {weightTrend.length > 1 && (
          <div className="card">
            <div className="card-title">Tendencia de peso (7 registros)</div>
            <div style={{ width: '100%', height: '50px', marginTop: '0.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightTrend}>
                  <Line type="monotone" dataKey="valor" stroke="#0f4c5c" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {streak > 0 && (
          <div className="card">
            <div className="card-title">Racha de seguimiento</div>
            <div className="card-meta">{streak} {streak === 1 ? 'día' : 'días'} registrando tu glucosa</div>
          </div>
        )}

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Registrar</div>

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

        <a href="/comidas" style={{ textDecoration: 'none' }}>
          <div className="card">
            <div className="card-title">Comidas</div>
            <div className="card-meta">Registra tu alimentación diaria</div>
          </div>
        </a>

        <a href="/ejercicio" style={{ textDecoration: 'none' }}>
          <div className="card">
            <div className="card-title">Ejercicio</div>
            <div className="card-meta">Registra tu actividad física</div>
          </div>
        </a>

        <a href="/agua" style={{ textDecoration: 'none' }}>
          <div className="card">
            <div className="card-title">Agua</div>
            <div className="card-meta">Registra tu hidratación diaria</div>
          </div>
        </a>

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Planes personalizados</div>

        <a href="/rutina" style={{ textDecoration: 'none' }}>
          <div className="card">
            <div className="card-title">Rutina de ejercicio</div>
            <div className="card-meta">Genera tu plan semanal con IA</div>
          </div>
        </a>

        <a href="/dieta" style={{ textDecoration: 'none' }}>
          <div className="card">
            <div className="card-title">Plan de alimentación</div>
            <div className="card-meta">Genera tu plan semanal con IA</div>
          </div>
        </a>

        <a href="/antecedentes" style={{ textDecoration: 'none' }}>
          <div className="card">
            <div className="card-title">Antecedentes médicos</div>
            <div className="card-meta">Actualiza tu información clínica</div>
          </div>
        </a>

        <button onClick={handleLogout} className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
