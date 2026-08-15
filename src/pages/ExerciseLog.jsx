import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import FootCareWarning from '../components/FootCareWarning'

export default function ExerciseLog() {
  const [logs, setLogs] = useState([])
  const [activity, setActivity] = useState('')
  const [duration, setDuration] = useState('')
  const [calories, setCalories] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      setUserId(user.id)

      const { data } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(30)

      setLogs(data || [])
      setLoading(false)
    }
    load()
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!activity) return
    setSaving(true)

    const { data, error } = await supabase
      .from('exercise_logs')
      .insert({
        user_id: userId,
        activity,
        duration_min: duration ? parseInt(duration, 10) : null,
        calories_burned: calories ? parseInt(calories, 10) : null,
      })
      .select()
      .single()

    if (!error && data) {
      setLogs([data, ...logs])
      setActivity('')
      setDuration('')
      setCalories('')
    }
    setSaving(false)
  }

  if (loading) return <div className="container">Cargando...</div>

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">Ejercicio</div>
        <div className="header-subtitle">Registro de actividad física</div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        <Link to="/dashboard" className="footer-link" style={{ display: 'block', marginBottom: '1rem', marginTop: 0 }}>
          ← Volver al panel
        </Link>

        <FootCareWarning />

        <div className="card">
          <div className="section-label" style={{ marginBottom: '1rem' }}>Nuevo registro</div>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Actividad</label>
              <input
                type="text"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                placeholder="Ej. Caminata, bicicleta fija, estiramientos"
                required
              />
            </div>
            <div className="field">
              <label>Duración (minutos)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Ej. 30"
              />
            </div>
            <div className="field">
              <label>Calorías quemadas (opcional)</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="Ej. 150"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar actividad'}
            </button>
          </form>
        </div>

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Historial reciente</div>
        {logs.length === 0 && (
          <div className="empty-state">Aún no has registrado actividad física.</div>
        )}
        {logs.map((l) => (
          <div key={l.id} className="card">
            <div className="card-title">{l.activity}</div>
            <div className="card-meta">
              {l.duration_min && `${l.duration_min} min`}
              {l.calories_burned && ` · ${l.calories_burned} kcal`}
              {' · '}
              {new Date(l.logged_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
