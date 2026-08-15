import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const DAILY_GOAL_ML = 2000
const QUICK_AMOUNTS = [250, 500, 750]

export default function WaterLog() {
  const [logs, setLogs] = useState([])
  const [customAmount, setCustomAmount] = useState('')
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

      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const { data } = await supabase
        .from('water_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', startOfDay.toISOString())
        .order('logged_at', { ascending: false })

      setLogs(data || [])
      setLoading(false)
    }
    load()
  }, [navigate])

  async function addWater(amountMl) {
    if (!amountMl) return
    setSaving(true)

    const { data, error } = await supabase
      .from('water_logs')
      .insert({
        user_id: userId,
        amount_ml: amountMl,
      })
      .select()
      .single()

    if (!error && data) {
      setLogs([data, ...logs])
      setCustomAmount('')
    }
    setSaving(false)
  }

  const totalHoy = logs.reduce((sum, l) => sum + (l.amount_ml || 0), 0)
  const porcentaje = Math.min(100, Math.round((totalHoy / DAILY_GOAL_ML) * 100))

  if (loading) return <div className="container">Cargando...</div>

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">Agua</div>
        <div className="header-subtitle">Registro de hidratación diaria</div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        <Link to="/dashboard" className="footer-link" style={{ display: 'block', marginBottom: '1rem', marginTop: 0 }}>
          ← Volver al panel
        </Link>

        <div className="card">
          <div className="section-label">Hoy</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f4c5c', marginTop: '0.25rem' }}>
            {totalHoy} ml
          </div>
          <div className="card-meta" style={{ marginBottom: '0.75rem' }}>Meta: {DAILY_GOAL_ML} ml</div>
          <div style={{ height: '8px', backgroundColor: '#dde3e6', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${porcentaje}%`, backgroundColor: '#0f4c5c', borderRadius: '999px' }} />
          </div>
        </div>

        <div className="card">
          <div className="section-label" style={{ marginBottom: '0.75rem' }}>Agregar</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => addWater(amt)}
                disabled={saving}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                {amt} ml
              </button>
            ))}
          </div>
          <div className="field">
            <label>Cantidad personalizada (ml)</label>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Ej. 300"
            />
          </div>
          <button
            type="button"
            onClick={() => addWater(parseInt(customAmount, 10))}
            disabled={saving || !customAmount}
            className="btn btn-primary"
          >
            Agregar
          </button>
        </div>

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Registro de hoy</div>
        {logs.length === 0 && (
          <div className="empty-state">Aún no has registrado agua hoy.</div>
        )}
        {logs.map((l) => (
          <div key={l.id} className="card">
            <div className="card-title">{l.amount_ml} ml</div>
            <div className="card-meta">
              {new Date(l.logged_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
