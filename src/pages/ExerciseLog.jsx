import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadLogs, loadProfile, prependLog, LOCAL_NOTE } from '../lib/localStore'
import FootCareWarning from '../components/FootCareWarning'
import { estimateCaloriesBurned } from '../lib/calorieEstimate'

export default function ExerciseLog() {
  const [logs, setLogs] = useState([])
  const [activity, setActivity] = useState('')
  const [duration, setDuration] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentWeight, setCurrentWeight] = useState(null)

  useEffect(() => {
    const latest = loadLogs('weight_logs')[0]?.weight_kg || loadProfile().current_weight || null
    setCurrentWeight(latest)
    setLogs(loadLogs('exercise_logs').slice(0, 30))
    setLoading(false)
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (!activity) return
    setSaving(true)

    const durationNum = duration ? parseInt(duration, 10) : null
    const estimatedCalories = estimateCaloriesBurned(activity, durationNum, currentWeight)

    const { list } = prependLog('exercise_logs', {
      activity,
      duration_min: durationNum,
      calories_burned: estimatedCalories,
      logged_at: new Date().toISOString(),
    }, 30)
    setLogs(list)
    setActivity('')
    setDuration('')
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
        <Link to="/" className="footer-link" style={{ display: 'block', marginBottom: '1rem', marginTop: 0 }}>
          ← Volver al inicio
        </Link>
        <p className="card-meta" style={{ marginBottom: '1rem' }}>{LOCAL_NOTE}</p>

        <FootCareWarning />

        {!currentWeight && (
          <Link to="/peso" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ backgroundColor: '#fdf1e3', borderColor: '#a15c00' }}>
              <div className="card-title" style={{ color: '#a15c00' }}>Registra tu peso primero</div>
              <div className="card-meta" style={{ color: '#a15c00' }}>
                Toca aquí para registrarlo y así calcular tus calorías quemadas con mayor precisión.
              </div>
            </div>
          </Link>
        )}

        <div className="card" style={{ boxShadow: '0 1px 3px rgba(15,76,92,0.08)' }}>
          <div className="section-label" style={{ marginBottom: '1rem' }}>Nuevo registro</div>
          <p className="card-meta" style={{ marginBottom: '1rem' }}>
            Las calorías quemadas se calculan automáticamente según tu actividad, duración y peso registrado.
          </p>
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
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar actividad'}
            </button>
          </form>
        </div>

        <div className="section-label" style={{ marginTop: '2rem', marginBottom: '0.5rem' }}>Historial reciente</div>

        {logs.length === 0 && (
          <div className="empty-state">Aún no has registrado actividad física.</div>
        )}

        {logs.map((l) => (
          <div key={l.id} className="card" style={{ boxShadow: '0 1px 3px rgba(15,76,92,0.08)' }}>
            <div className="card-title">{l.activity}</div>
            <div className="card-meta">
              {l.duration_min && `${l.duration_min} min`}
              {l.calories_burned != null && ` · ${l.calories_burned} kcal quemadas`}
              {' · '}
              {new Date(l.logged_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
              }
