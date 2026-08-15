import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'

export default function GlucoseLog() {
  const [readings, setReadings] = useState([])
  const [value, setValue] = useState('')
  const [context, setContext] = useState('ayuno')
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
        .from('glucose_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: false })
        .limit(30)

      setReadings(data || [])
      setLoading(false)
    }
    load()
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!value) return
    setSaving(true)

    const { data, error } = await supabase
      .from('glucose_logs')
      .insert({
        user_id: userId,
        value_mg_dl: parseInt(value, 10),
        context,
      })
      .select()
      .single()

    if (!error && data) {
      setReadings([data, ...readings])
      setValue('')
    }
    setSaving(false)
  }

  const chartData = [...readings]
    .reverse()
    .map((r) => ({
      fecha: new Date(r.measured_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' }),
      valor: r.value_mg_dl,
    }))

  const contextLabels = {
    ayuno: 'En ayuno',
    post_comida: 'Después de comer',
    antes_dormir: 'Antes de dormir',
    otro: 'Otro momento',
  }

  if (loading) return <div className="container">Cargando...</div>

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">Glucosa</div>
        <div className="header-subtitle">Registro y tendencia de mediciones</div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        <Link to="/dashboard" className="footer-link" style={{ display: 'block', marginBottom: '1rem', marginTop: 0 }}>
          ← Volver al panel
        </Link>

        <div className="card">
          <div className="section-label" style={{ marginBottom: '1rem' }}>Nueva medición</div>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Valor (mg/dL)</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Ej. 110"
                required
              />
            </div>
            <div className="field">
              <label>Momento de la medición</label>
              <select value={context} onChange={(e) => setContext(e.target.value)}>
                <option value="ayuno">En ayuno</option>
                <option value="post_comida">Después de comer</option>
                <option value="antes_dormir">Antes de dormir</option>
                <option value="otro">Otro momento</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar medición'}
            </button>
          </form>
        </div>

        {chartData.length > 1 && (
          <div className="card">
            <div className="section-label">Tendencia</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dde3e6" />
                <XAxis dataKey="fecha" fontSize={11} stroke="#5c6b73" />
                <YAxis fontSize={11} stroke="#5c6b73" />
                <Tooltip />
                <Line type="monotone" dataKey="valor" stroke="#0f4c5c" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Historial reciente</div>
        {readings.length === 0 && (
          <div className="empty-state">Aún no has registrado mediciones.</div>
        )}
        {readings.map((r) => (
          <div key={r.id} className="card">
            <div className="card-title">{r.value_mg_dl} mg/dL</div>
            <div className="card-meta">
              {contextLabels[r.context] || r.context} · {new Date(r.measured_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
