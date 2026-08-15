import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const COMPLICACIONES = [
  'Retinopatía',
  'Nefropatía',
  'Neuropatía',
  'Pie diabético',
  'Hipertensión',
  'Dislipidemia',
  'Enfermedad cardiovascular',
]

const NIVELES_ACTIVIDAD = [
  { value: 'sedentario', label: 'Sedentario (poco o nada de ejercicio)', factor: 1.2 },
  { value: 'ligero', label: 'Ligero (ejercicio 1-3 días/semana)', factor: 1.375 },
  { value: 'moderado', label: 'Moderado (ejercicio 3-5 días/semana)', factor: 1.55 },
  { value: 'activo', label: 'Activo (ejercicio 6-7 días/semana)', factor: 1.725 },
  { value: 'muy_activo', label: 'Muy activo (ejercicio intenso diario)', factor: 1.9 },
]

function calcAge(birthDate) {
  if (!birthDate) return null
  const b = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
  return age
}

export default function MedicalHistory() {
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [diabetesType, setDiabetesType] = useState('')
  const [diagnosisYear, setDiagnosisYear] = useState('')
  const [lastHba1c, setLastHba1c] = useState('')
  const [lastHba1cDate, setLastHba1cDate] = useState('')
  const [currentMedications, setCurrentMedications] = useState('')
  const [usesInsulin, setUsesInsulin] = useState(false)
  const [insulinType, setInsulinType] = useState('')
  const [complications, setComplications] = useState([])
  const [allergies, setAllergies] = useState('')
  const [familyHistory, setFamilyHistory] = useState('')
  const [smoker, setSmoker] = useState(false)
  const [alcohol, setAlcohol] = useState(false)
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState('2000')
  const [heightCm, setHeightCm] = useState('')
  const [currentWeight, setCurrentWeight] = useState('')
  const [hasWeightLog, setHasWeightLog] = useState(false)
  const [birthDate, setBirthDate] = useState('')
  const [sex, setSex] = useState('')
  const [activityLevel, setActivityLevel] = useState('sedentario')
  const [suggestion, setSuggestion] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      setUserId(user.id)

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setDiabetesType(data.diabetes_type || '')
        setDiagnosisYear(data.diagnosis_year || '')
        setLastHba1c(data.last_hba1c || '')
        setLastHba1cDate(data.last_hba1c_date || '')
        setCurrentMedications(data.current_medications || '')
        setUsesInsulin(data.uses_insulin || false)
        setInsulinType(data.insulin_type || '')
        setComplications(data.complications || [])
        setAllergies(data.allergies || '')
        setFamilyHistory(data.family_history || '')
        setSmoker(data.smoker || false)
        setAlcohol(data.alcohol || false)
        setDailyCalorieGoal(data.daily_calorie_goal || 2000)
        setHeightCm(data.height_cm || '')
        setBirthDate(data.birth_date || '')
        setSex(data.sex || '')
      }

      const { data: weightData } = await supabase
        .from('weight_logs')
        .select('weight_kg')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(1)
        .single()
      if (weightData) {
        setCurrentWeight(weightData.weight_kg)
        setHasWeightLog(true)
      }

      setLoading(false)
    }
    load()
  }, [navigate])

  function toggleComplicacion(nombre) {
    setComplications((prev) =>
      prev.includes(nombre) ? prev.filter((c) => c !== nombre) : [...prev, nombre]
    )
  }

  const noTieneDiabetes = diabetesType === 'ninguna'

  function handleCalcularSugerencia() {
    const age = calcAge(birthDate)
    const weight = parseFloat(currentWeight)
    const height = parseFloat(heightCm)

    if (!age || !weight || !height || !sex) {
      setSuggestion({ error: true })
      return
    }

    const bmr = sex === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161

    const factor = NIVELES_ACTIVIDAD.find((n) => n.value === activityLevel)?.factor || 1.2
    const tdee = Math.round(bmr * factor)

    setSuggestion({ value: tdee })
    setDailyCalorieGoal(String(tdee))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const { error } = await supabase
      .from('profiles')
      .update({
        diabetes_type: diabetesType,
        diagnosis_year: noTieneDiabetes ? null : diagnosisYear ? parseInt(diagnosisYear, 10) : null,
        last_hba1c: noTieneDiabetes ? null : lastHba1c ? parseFloat(lastHba1c) : null,
        last_hba1c_date: noTieneDiabetes ? null : lastHba1cDate || null,
        current_medications: currentMedications,
        uses_insulin: noTieneDiabetes ? false : usesInsulin,
        insulin_type: !noTieneDiabetes && usesInsulin ? insulinType : null,
        complications,
        allergies,
        family_history: familyHistory,
        smoker,
        alcohol,
        daily_calorie_goal: dailyCalorieGoal ? parseInt(dailyCalorieGoal, 10) : 2000,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        birth_date: birthDate || null,
        sex: sex || null,
      })
      .eq('id', userId)

    if (!error && currentWeight && !hasWeightLog) {
      await supabase.from('weight_logs').insert({
        user_id: userId,
        weight_kg: parseFloat(currentWeight),
      })
      setHasWeightLog(true)
    }

    setSaving(false)
    if (!error) setSaved(true)
  }

  if (loading) return <div className="container">Cargando...</div>

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">Antecedentes médicos</div>
        <div className="header-subtitle">Esta información ayuda a personalizar tu seguimiento</div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        <Link to="/dashboard" className="footer-link" style={{ display: 'block', marginBottom: '1rem', marginTop: 0 }}>
          ← Volver al panel
        </Link>

        <form onSubmit={handleSave}>
          <div className="card">
            <div className="section-label" style={{ marginBottom: '1rem' }}>Datos generales</div>
            <div className="field">
              <label>Fecha de nacimiento</label>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Sexo</label>
              <select value={sex} onChange={(e) => setSex(e.target.value)}>
                <option value="">Selecciona una opción</option>
                <option value="female">Femenino</option>
                <option value="male">Masculino</option>
              </select>
            </div>
            <div className="field">
              <label>Estatura (cm)</label>
              <input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="Ej. 165" />
            </div>
            <div className="field">
              <label>Peso actual (kg){hasWeightLog ? ' — ya registrado, actualízalo en la sección de Peso' : ''}</label>
              <input
                type="number"
                step="0.1"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                placeholder="Ej. 78.5"
                disabled={hasWeightLog}
              />
              {hasWeightLog && (
                <p className="card-meta" style={{ marginTop: '0.375rem' }}>
                  Para actualizar tu peso ve a <Link to="/peso">la sección de Peso</Link>.
                </p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="section-label" style={{ marginBottom: '1rem' }}>Diagnóstico</div>
            <div className="field">
              <label>Tipo de diabetes</label>
              <select value={diabetesType} onChange={(e) => setDiabetesType(e.target.value)}>
                <option value="">Selecciona una opción</option>
                <option value="ninguna">No tengo diabetes</option>
                <option value="tipo_1">Tipo 1</option>
                <option value="tipo_2">Tipo 2</option>
                <option value="gestacional">Gestacional</option>
                <option value="prediabetes">Prediabetes</option>
              </select>
            </div>

            {!noTieneDiabetes && (
              <>
                <div className="field">
                  <label>Año de diagnóstico</label>
                  <input type="number" value={diagnosisYear} onChange={(e) => setDiagnosisYear(e.target.value)} placeholder="Ej. 2018" />
                </div>
                <div className="field">
                  <label>Última HbA1c (%)</label>
                  <input type="number" step="0.1" value={lastHba1c} onChange={(e) => setLastHba1c(e.target.value)} placeholder="Ej. 7.2" />
                </div>
                <div className="field">
                  <label>Fecha de esa medición</label>
                  <input type="date" value={lastHba1cDate} onChange={(e) => setLastHba1cDate(e.target.value)} />
                </div>
              </>
            )}
          </div>

          <div className="card">
            <div className="section-label" style={{ marginBottom: '1rem' }}>Tratamiento actual</div>
            <div className="field">
              <label>Medicamentos actuales</label>
              <textarea value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} rows={3} placeholder="Ej. Metformina 850mg cada 12 horas" />
            </div>
            {!noTieneDiabetes && (
              <>
                <div className="field">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={usesInsulin} onChange={(e) => setUsesInsulin(e.target.checked)} style={{ width: 'auto' }} />
                    Usa insulina
                  </label>
                </div>
                {usesInsulin && (
                  <div className="field">
                    <label>Tipo y dosis de insulina</label>
                    <input type="text" value={insulinType} onChange={(e) => setInsulinType(e.target.value)} placeholder="Ej. NPH 20 UI mañana, 10 UI noche" />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card">
            <div className="section-label" style={{ marginBottom: '1rem' }}>Complicaciones o comorbilidades</div>
            {COMPLICACIONES.map((c) => (
              <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem', fontSize: '0.9375rem' }}>
                <input
                  type="checkbox"
                  checked={complications.includes(c)}
                  onChange={() => toggleComplicacion(c)}
                  style={{ width: 'auto' }}
                />
                {c}
              </label>
            ))}
          </div>

          <div className="card">
            <div className="section-label" style={{ marginBottom: '1rem' }}>Antecedentes adicionales</div>
            <div className="field">
              <label>Alergias a medicamentos</label>
              <input type="text" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Ej. Penicilina" />
            </div>
            <div className="field">
              <label>Antecedentes familiares de diabetes</label>
              <input type="text" value={familyHistory} onChange={(e) => setFamilyHistory(e.target.value)} placeholder="Ej. Madre y abuelo materno" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
              <input type="checkbox" checked={smoker} onChange={(e) => setSmoker(e.target.checked)} style={{ width: 'auto' }} />
              Fuma actualmente
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={alcohol} onChange={(e) => setAlcohol(e.target.checked)} style={{ width: 'auto' }} />
              Consume alcohol regularmente
            </label>
          </div>

          <div className="card">
            <div className="section-label" style={{ marginBottom: '1rem' }}>Meta calórica diaria</div>
            <div className="field">
              <label>Nivel de actividad física</label>
              <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
                {NIVELES_ACTIVIDAD.map((n) => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleCalcularSugerencia}
              className="btn btn-secondary"
              style={{ marginBottom: '1rem' }}
            >
              Calcular sugerencia
            </button>

            {suggestion?.error && (
              <p className="card-meta" style={{ color: '#b3261e', marginBottom: '1rem' }}>
                Completa fecha de nacimiento, sexo, estatura y peso para calcular una sugerencia.
              </p>
            )}
            {suggestion?.value && (
              <p className="card-meta" style={{ marginBottom: '1rem' }}>
                Sugerencia de mantenimiento: {suggestion.value} kcal/día. Ya la aplicamos abajo — puedes ajustarla si tu doctor te indicó otra meta (por ejemplo, restar 300-500 kcal para bajar de peso gradualmente).
              </p>
            )}

            <div className="field">
              <label>Calorías objetivo por día</label>
              <input type="number" value={dailyCalorieGoal} onChange={(e) => setDailyCalorieGoal(e.target.value)} placeholder="Ej. 1800" />
            </div>
          </div>

          {saved && <div className="card" style={{ backgroundColor: '#eaf5ee', borderColor: '#1e6b3c', color: '#1e6b3c' }}>Antecedentes guardados correctamente.</div>}

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar antecedentes'}
          </button>
        </form>
      </div>
    </div>
  )
}
