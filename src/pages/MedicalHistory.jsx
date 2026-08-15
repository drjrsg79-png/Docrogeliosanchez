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
      })
      .eq('id', userId)

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
