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
  if (carbs === '' || carbs === null || carbs === undefined || isNaN(carbs)) return null

  if (carbs > 60) {
    return {
      etiqueta: 'Alta en carbohidratos',
      color: '#b3261e',
      fondo: '#fbeceb',
      mensaje:
        'Esta comida contiene una carga alta de carbohidratos, lo cual puede elevar tu glucosa de forma importante. Considera reducir la porcion o acompañarla de fibra y proteina para moderar la respuesta glucemica. Mide tu glucosa 2 horas despues de esta comida.',
    }
  }
  if (carbs > 30) {
    return {
      etiqueta: 'Carbohidratos moderados',
      color: '#a15c00',
      fondo: '#fdf1e3',
      mensaje: 'Carga moderada de carbohidratos. Es razonable dentro de un plan balanceado; observa tu respuesta glucemica posterior.',
    }
  }
  return {
    etiqueta: 'Baja en carbohidratos',
    color: '#1e6b3c',
    fondo: '#eaf5ee',
    mensaje: 'Buena eleccion para el control de tu glucosa.',
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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
  const [diabetesType, setDiabetesType] = useState(null)

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analysisError, setAnalysisError] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('diabetes_type')
        .eq('id', user.id)
        .single()
      setDiabetesType(profile?.diabetes_type || null)

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

  function handlePhotoSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setAnalysisResult(null)
    setAnalysisError('')
  }

  async function handleAnalyzePhoto() {
    if (!photoFile) return
    setAnalyzing(true)
    setAnalysisError('')

    try {
      const base64 = await fileToBase64(photoFile)

      const response = await fetch('/.netlify/functions/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: photoFile.type,
          diabetesType,
        }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        setAnalysisError(result.error || 'No se pudo analizar la foto. Intenta de nuevo.')
        setAnalyzing(false)
        return
      }

      setAnalysisResult(result)
      setName(result.detected_food || '')
      setCalories(result.estimated_calories ?? '')
      setCarbs(result.carbs_g ?? '')
      setProtein(result.protein_g ?? '')
      setFat(result.fat_g ?? '')
    } catch (err) {
      setAnalysisError('No se pudo analizar la foto. Verifica tu conexión e intenta de nuevo.')
    }
    setAnalyzing(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name) return
    setSaving(true)
    setLastResult(null)

    const carbsNum = carbs !== '' ? parseFloat(carbs) : null
    let photoUrl = null

    if (photoFile) {
      const fileName = `${userId}/${Date.now()}-${photoFile.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('food-photos')
        .upload(fileName, photoFile)

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('food-photos').getPublicUrl(fileName)
        photoUrl = urlData?.publicUrl || null
      }
    }

    const { data, error } = await supabase
      .from('meals')
      .insert({
        user_id: userId,
        meal_type: mealType,
        name,
        calories: calories !== '' ? parseInt(calories, 10) : null,
        carbs_g: carbsNum,
        protein_g: protein !== '' ? parseFloat(protein) : null,
        fat_g: fat !== '' ? parseFloat(fat) : null,
      })
      .select()
      .single()

    if (!error && data) {
      setMeals([data, ...meals])
      if (analysisResult) {
        setLastResult({
          etiqueta: analysisResult.suitable ? 'Buena opción' : 'Con precaución',
          color: analysisResult.suitable ? '#1e6b3c' : '#b3261e',
          fondo: analysisResult.suitable ? '#eaf5ee' : '#fbeceb',
          mensaje: analysisResult.reasoning,
        })
      } else {
        setLastResult(evaluarComida(carbsNum))
      }
      setName('')
      setCalories('')
      setCarbs('')
      setProtein('')
      setFat('')
      setPhotoFile(null)
      setPhotoPreview(null)
      setAnalysisResult(null)
    }
    if (photoUrl) {
      await supabase
        .from('meals')
        .update({})
        .eq('id', data?.id)
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
          <div className="section-label" style={{ marginBottom: '1rem' }}>Escanear alimento</div>
          <p className="card-meta" style={{ marginBottom: '1rem' }}>
            Toma una foto de tu comida y obtén un estimado automático de calorías y macronutrientes.
          </p>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelect}
            style={{ marginBottom: '1rem' }}
          />

          {photoPreview && (
            <img
              src={photoPreview}
              alt="Vista previa"
              style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '8px', marginBottom: '1rem' }}
            />
          )}

          {photoFile && !analysisResult && (
            <button
              type="button"
              onClick={handleAnalyzePhoto}
              className="btn btn-primary"
              disabled={analyzing}
            >
              {analyzing ? 'Analizando...' : 'Analizar foto'}
            </button>
          )}

          {analysisError && <div className="alert-error" style={{ marginTop: '1rem' }}>{analysisError}</div>}

          {analysisResult && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: analysisResult.suitable ? '#eaf5ee' : '#fbeceb', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, color: analysisResult.suitable ? '#1e6b3c' : '#b3261e' }}>
                {analysisResult.detected_food} — {analysisResult.suitable ? 'Buena opción' : 'Con precaución'}
              </div>
              <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: analysisResult.suitable ? '#1e6b3c' : '#b3261e' }}>
                {analysisResult.reasoning}
              </div>
              <div className="card-meta" style={{ marginTop: '0.5rem' }}>
                {analysisResult.estimated_calories} kcal · {analysisResult.carbs_g}g carbohidratos · {analysisResult.protein_g}g proteína · {analysisResult.fat_g}g grasa
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-label" style={{ marginBottom: '1rem' }}>
            {analysisResult ? 'Confirmar y guardar' : 'Registro manual'}
          </div>
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
              <label>Calorías</label>
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
              <label>Proteína (g)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="Ej. 30"
              />
            </div>
            <div className="field">
              <label>Grasas (g)</label>
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
                {m.carbs_g != null && ` · ${m.carbs_g}g carbohidratos`}
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
