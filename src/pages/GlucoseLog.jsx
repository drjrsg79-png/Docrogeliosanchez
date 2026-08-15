import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'

const CONTEXT_OPTIONS = [
  { value: 'antes_desayuno', label: 'Antes del desayuno' },
  { value: 'post_desayuno', label: '2 horas después del desayuno' },
  { value: 'antes_comida', label: 'Antes de la comida' },
  { value: 'post_comida', label: '2 horas después de la comida' },
  { value: 'antes_cena', label: 'Antes de la cena' },
  { value: 'post_cena', label: '2 horas después de la cena' },
  { value: 'aleatorio', label: 'En otro momento / aleatoria' },
]

const CONTEXT_LABELS = Object.fromEntries(CONTEXT_OPTIONS.map((o) => [o.value, o.label]))

function evaluarLectura(valor, context) {
  if (valor < 60) {
    return {
      nivel: 'baja',
      etiqueta: 'Hipoglucemia',
      color: '#b3261e',
      fondo: '#fbeceb',
      mensaje:
        'Nivel bajo de glucosa. Consume de inmediato 15 g de carbohidratos de absorcion rapida (medio vaso de jugo, 3 tabletas de glucosa o una cucharada de azucar). Repite la medicion en 15 minutos. Si persiste por debajo de 60 mg/dL o hay sintomas como sudoracion, temblor o confusion, contacta a tu medico o acude a urgencias.',
    }
  }

  if (valor > 180) {
    const esPostprandial = context.startsWith('post_')
    return {
      nivel: 'alta',
      etiqueta: 'Hiperglucemia',
      color: '#b3261e',
      fondo: '#fbeceb',
      mensaje: esPostprandial
        ? 'Nivel elevado despues de comer. Evita azucares y harinas refinadas en tu siguiente comida, aumenta la ingesta de agua y realiza actividad fisica ligera si tu condicion lo permite. Si se repite de forma constante, comentalo con tu medico para ajustar tratamiento.'
        : 'Nivel elevado en ayuno o antes de alimento. Esto puede indicar necesidad de ajuste en tu esquema de tratamiento. Evita comidas altas en carbohidratos simples y mantente bien hidratado. Notifica a tu medico si este patron se repite.',
    }
  }

  const contextoAyuno = context === 'antes_desayuno' || context === 'antes_comida' || context === 'antes_cena'
  const rangoIdeal = contextoAyuno ? '70-100 mg/dL' : 'menor a 140 mg/dL'

  return {
    nivel: 'normal',
    etiqueta: 'Dentro de rango',
    color: '#1e6b3c',
    fondo: '#eaf5ee',
    mensaje: 'Buen control. El rango ideal para este momento es ' + rangoIdeal + '. Continua con tu plan de alimentacion y actividad fisica habitual.',
  }
}

export default function GlucoseLog() {
  const [readings, setReadings] = useState([])
  const [value, setValue] = useState('')
  const [context, setContext] = useState('antes_desayuno')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastResult, setLastResult] = useState(null)
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
    setLastResult(null)

    const numericValue = parseInt(value, 10)
    const evaluacion = evaluarLectura(numericValue, context)

    const { data, error } = await supabase
      .from('glucose_logs')
      .insert({
        user_id: userId,
        value_mg_dl: numericValue,
        context,
      })
      .select()
      .single()

    if (!error && data) {
      setReadings([data, ...readings])
      setLastResult(evaluacion)
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

  if (loading) return <div className="container">Cargando...</div>

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">Glucosa</div>
        <div className="header-subtitle">Registro y seguimiento de glucemia capilar</div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        <Link to="/dashboard" className="footer-link" style={{ display: 'block', marginBottom: '1rem', marginTop: 0 }}>
          ← Volver al panel
        </Link>

        <div className="card">
          <div className="section-label" style={{ marginBottom: '1rem' }}>Nueva medicion</div>
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
              <label>Momento de la medicion</label>
              <select value={context} onChange={(e) => setContext(e.target.value)}>
                {CONTEXT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar medicion'}
            </button>
          </form>
        </div>

        {lastResult && (
          <div className="card" style={{ backgroundColor: lastResult.fondo, borderColor: lastResult.color }}>
            <div className="card-title" style={{ color: lastResult.color }}>{lastResult.etiqueta}</div>
            <div className="card-meta" style={{ color: lastResult.color, marginTop: '0.5rem' }}>
              {lastResult.mensaje}
            </div>
          </div>
        )}

        {chartData.length > 1 && (
          <div className="card">
            <div className="section-label">Tendencia</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dde3e6" />
                <XAxis dataKey="fecha" fontSize={11} stroke="#5c6b73" />
                <YAxis fontSize={11} stroke="#5c6b73" domain={[0, 250]} />
                <Tooltip />
                <ReferenceLine y={60} stroke="#b3261e" strokeDasharray="4 4" />
                <ReferenceLine y={180} stroke="#b3261e" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="valor" stroke="#0f4c5c" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Historial reciente</div>
        {readings.length === 0 && (
          <div className="empty-state">Aun no has registrado mediciones.</div>
        )}
        {readings.map((r) => {
          const ev = evaluarLectura(r.value_mg_dl, r.context)
          return (
            <div key={r.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title">{r.value_mg_dl} mg/dL</div>
                {ev.nivel !== 'normal' && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: ev.color, backgroundColor: ev.fondo, padding: '0.25rem 0.625rem', borderRadius: '999px' }}>
                    {ev.etiqueta}
                  </span>
                )}
              </div>
              <div className="card-meta">
                {CONTEXT_LABELS[r.context] || r.context} - {new Date(r.measured_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
      }
