import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MEAL_TYPES = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'comida', label: 'Comida' },
  { value: 'cena', label: 'Cena' },
  { value: 'merienda', label: 'Merienda / colación' },
]

const MEAL_LABELS = Object.fromEntries(MEAL_TYPES.map((o) => [o.value, o.label]))

function evaluarComida(carbs) {
  if (carbs === '' || carbs === null || isNaN(carbs)) return null

  if (carbs > 60) {
    return {
      etiqueta: 'Alta en carbohidratos',
      color: '#b3261e',
      fondo: '#fbeceb',
      mensaje:
        'Esta comida contiene una carga alta de carbohidratos, lo cual puede elevar tu glucosa de forma importante. Considera reducir la porción o acompañarla de fibra y proteína para moderar la respuesta glucémica. Mide tu glucosa 2 horas después de esta comida.',
    }
  }
  if (carbs > 30) {
    return {
      etiqueta: 'Carbohidratos moderados',
      color: '#a15c00',
      fondo: '#fdf1e3',
      mensaje: 'Carga moderada de carbohidratos. Es razonable dentro de un plan balanceado; observa tu respuesta glucémica posterior.',
    }
  }
  return {
    etiqueta: 'Baja en carbohidratos',
    color: '#1e6b3c',
    fondo: '#eaf5ee',
    mensaje: 'Buena elección para el control de tu glucosa.',
  }
}

export default function MealLog() {
  const [meals, setMeals] = useState([])
  const [mealType, setMealType] = useState('desayuno')
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [carbs, setCarbs] = useState('')
  const [protein, setProtein] = useState('')
  const [fat, setFat] = useState('')
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
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(30)

      setMeals(data || [])
      setLoading(false)
    }
    load()
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name) return
    setSaving(true)
    setLastResult(null)

    const carbsNum = carbs ? parseFloat(carbs) : null

    const { data, error } = await supabase
      .from('meals')
      .insert({
        user_id: userId,
        meal_type: mealType,
        name,
        calories: calories ? parseInt(calories, 10) : null,
        carbs_g: carbsNum,
        protein_g: protein ? parseFloat(protein) : null,
        fat_g: fat ? parseFloat(fat) : null,
      })
      .select()
      .single()

    if (!error && data) {
      setMeals([data, ...meals])
      setLastResult(evaluarComida(carbsNum))
      setName('')
      setCalories('')
      setCarbs('')
      setProtein('')
      setFat('')
    }
    setSaving(false)
  }

  if (loading) return <div className="container">Cargando...</div>

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">Comidas</div>
        <div className="header-subtitle">Registro de alimentación y macronutrientes</div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        <Link to="/dashboard" className="footer-link" style={{ display: 'block', marginBottom: '1rem', marginTop: 0 }}>
          ← Volver al panel
        </Link>

        <div className="card">
          <div className="section-label" style={{ marginBottom: '1rem' }}>Nuevo registro</div>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Tipo de comida</label>
              <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
                {MEAL_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>¿Qué comiste?</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Pechuga de pollo con ensalada"
                required
              />
            </div>
            <div className="field">
              <label>Calorías (opcional)</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="Ej. 450"
              />
            </div>
            <div className="field">
              <label>Carbohidratos (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="Ej. 35"
              />
            </div>
            <div className="field">
              <label>Proteína (g, opcional)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="Ej. 30"
              />
            </div>
            <div className="field">
              <label>Grasas (g, opcional)</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="Ej. 15"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar comida'}
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

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Historial reciente</div>
        {meals.length === 0 && (
          <div className="empty-state">Aún no has registrado comidas.</div>
        )}
        {meals.map((m) => {
          const ev = evaluarComida(m.carbs_g)
          return (
            <div key={m.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title">{m.name}</div>
                {ev && ev.etiqueta !== 'Baja en carbohidratos' && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: ev.color, backgroundColor: ev.fondo, padding: '0.25rem 0.625rem', borderRadius: '999px' }}>
                    {ev.etiqueta}
                  </span>
                )}
              </div>
              <div className="card-meta">
                {MEAL_LABELS[m.meal_type] || m.meal_type}
                {m.calories && ` · ${m.calories} kcal`}
                {m.carbs_g && ` · ${m.carbs_g}g carbohidratos`}
                {' · '}
                {new Date(m.logged_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
              }
