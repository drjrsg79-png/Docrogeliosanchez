import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'

function calcularIMC(pesoKg, alturaCm) {
  const alturaM = alturaCm / 100
  return pesoKg / (alturaM * alturaM)
}

function evaluarIMC(imc) {
  if (imc < 18.5) {
    return {
      etiqueta: 'Bajo peso',
      color: '#a15c00',
      fondo: '#fdf1e3',
      mensaje:
        'Tu IMC esta por debajo del rango saludable. Es importante evaluar tu ingesta calorica y descartar causas asociadas. Coméntalo con tu médico en tu próxima consulta.',
    }
  }
  if (imc < 25) {
    return {
      etiqueta: 'Peso normal',
      color: '#1e6b3c',
      fondo: '#eaf5ee',
      mensaje: 'Tu IMC esta dentro del rango saludable. Mantén tu alimentación balanceada y actividad física regular.',
    }
  }
  if (imc < 30) {
    return {
      etiqueta: 'Sobrepeso',
      color: '#a15c00',
      fondo: '#fdf1e3',
      mensaje:
        'Tu IMC indica sobrepeso, lo cual puede dificultar el control de tu glucosa. Reducir el consumo de azucares y harinas refinadas, junto con actividad fisica regular, ayuda a mejorar tu control metabolico.',
    }
  }
  return {
    etiqueta: 'Obesidad',
    color: '#b3261e',
    fondo: '#fbeceb',
    mensaje:
      'Tu IMC indica obesidad, un factor que incrementa el riesgo cardiovascular y dificulta el control glucemico. Es importante trabajar en conjunto con tu medico un plan de perdida de peso gradual y sostenible.',
  }
}

export default function WeightLog() {
  const [profile, setProfile] = useState(null)
  const [logs, setLogs] = useState([])
  const [weight, setWeight] = useState('')
  const [heightInput, setHeightInput] = useState('')
  const [goalInput, setGoalInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
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

      const { data: profileData } = await supabase
        .from('profiles')
        .select('height_cm, weight_goal_kg')
        .eq('id', user.id)
        .single()

      setProfile(profileData)
      if (profileData?.height_cm) setHeightInput(String(profileData.height_cm))
      if (profileData?.weight_goal_kg) setGoalInput(String(profileData.weight_goal_kg))

      const { data: logsData } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(30)

      setLogs(logsData || [])
      setLoading(false)
    }
    load()
  }, [navigate])

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSavingProfile(true)

    const updates = {}
    if (heightInput) updates.height_cm = parseFloat(heightInput)
    if (goalInput) updates.weight_goal_kg = parseFloat(goalInput)

    const { error } = await supabase.from('profiles').update(updates).eq('id', userId)

    if (!error) {
      setProfile({ ...profile, ...updates })
    }
    setSavingProfile(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!weight) return
    setSaving(true)
    setLastResult(null)

    const numericWeight = parseFloat(weight)

    const { data, error } = await supabase
      .from('weight_logs')
      .insert({
        user_id: userId,
        weight_kg: numericWeight,
      })
      .select()
      .single()

    if (!error && data) {
      setLogs([data, ...logs])
      if (profile?.height_cm) {
        const imc = calcularIMC(numericWeight, profile.height_cm)
        setLastResult({ imc, ...evaluarIMC(imc) })
      }
      setWeight('')
    }
    setSaving(false)
  }

  const chartData = [...logs]
    .reverse()
    .map((l) => ({
      fecha: new Date(l.logged_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' }),
      valor: l.weight_kg,
    }))

  if (loading) return <div className="container">Cargando...</div>

  const faltaEstatura = !profile?.height_cm

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">Peso</div>
        <div className="header-subtitle">Registro de peso corporal e IMC</div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        <Link to="/dashboard" className="footer-link" style={{ display: 'block', marginBottom: '1rem', marginTop: 0 }}>
          ← Volver al panel
        </Link>

        {faltaEstatura && (
          <div className="card">
            <div className="section-label" style={{ marginBottom: '1rem' }}>Completa tu perfil</div>
            <p className="card-meta" style={{ marginBottom: '1rem' }}>
              Necesitamos tu estatura para calcular tu Índice de Masa Corporal (IMC).
            </p>
            <form onSubmit={handleSaveProfile}>
              <div className="field">
                <label>Estatura (cm)</label>
                <input
                  type="number"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  placeholder="Ej. 165"
                  required
                />
              </div>
              <div className="field">
                <label>Peso meta (kg) — opcional</label>
                <input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="Ej. 70"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                {savingProfile ? 'Guardando...' : 'Guardar datos'}
              </button>
            </form>
          </div>
        )}

        <div className="card">
          <div className="section-label" style={{ marginBottom: '1rem' }}>Nuevo registro</div>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Ej. 78.5"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar peso'}
            </button>
          </form>
        </div>

        {lastResult && (
          <div className="card" style={{ backgroundColor: lastResult.fondo, borderColor: lastResult.color }}>
            <div className="card-title" style={{ color: lastResult.color }}>
              IMC {lastResult.imc.toFixed(1)} · {lastResult.etiqueta}
            </div>
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
                <YAxis fontSize={11} stroke="#5c6b73" />
                <Tooltip />
                {profile?.weight_goal_kg && (
                  <ReferenceLine y={profile.weight_goal_kg} stroke="#0f4c5c" strokeDasharray="4 4" />
                )}
                <Line type="monotone" dataKey="valor" stroke="#0f4c5c" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Historial reciente</div>
        {logs.length === 0 && (
          <div className="empty-state">Aún no has registrado tu peso.</div>
        )}
        {logs.map((l) => {
          const imc = profile?.height_cm ? calcularIMC(l.weight_kg, profile.height_cm) : null
          const ev = imc ? evaluarIMC(imc) : null
          return (
            <div key={l.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title">{l.weight_kg} kg</div>
                {ev && ev.etiqueta !== 'Peso normal' && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: ev.color, backgroundColor: ev.fondo, padding: '0.25rem 0.625rem', borderRadius: '999px' }}>
                    {ev.etiqueta}
                  </span>
                )}
              </div>
              <div className="card-meta">
                {imc && `IMC ${imc.toFixed(1)} · `}
                {new Date(l.logged_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
          }
