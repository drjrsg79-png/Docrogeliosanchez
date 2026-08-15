import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const GLUCOSE_LOW = 60
const GLUCOSE_HIGH = 180

function calcAge(birthDate) {
  if (!birthDate) return null
  const b = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
  return age
}

function calcImc(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null
  const h = heightCm / 100
  return weightKg / (h * h)
}

function imcLabel(imc) {
  if (imc == null) return null
  if (imc < 18.5) return { text: 'Bajo peso', color: '#3b82c4' }
  if (imc < 25) return { text: 'Normal', color: '#2f9e5c' }
  if (imc < 30) return { text: 'Sobrepeso', color: '#d18a1f' }
  return { text: 'Obesidad', color: '#d64545' }
}

function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [glucose, setGlucose] = useState([])
  const [weights, setWeights] = useState([])
  const [meals, setMeals] = useState([])
  const [exercise, setExercise] = useState([])
  const [water, setWater] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (profileError || !profileData) {
        setError('No se pudo cargar la información del paciente.')
        setLoading(false)
        return
      }
      setProfile(profileData)

      const [g, w, m, e, ag] = await Promise.all([
        supabase.from('glucose_logs').select('*').eq('user_id', id).order('measured_at', { ascending: false }).limit(10),
        supabase.from('weight_logs').select('*').eq('user_id', id).order('logged_at', { ascending: false }).limit(10),
        supabase.from('meals').select('*').eq('user_id', id).order('logged_at', { ascending: false }).limit(8),
        supabase.from('exercise_logs').select('*').eq('user_id', id).order('logged_at', { ascending: false }).limit(8),
        supabase.from('water_logs').select('*').eq('user_id', id).order('logged_at', { ascending: false }).limit(5),
      ])

      setGlucose(g.data || [])
      setWeights(w.data || [])
      setMeals(m.data || [])
      setExercise(e.data || [])
      setWater(ag.data || [])
      setLoading(false)
    }
    load()
  }, [id, navigate])

  if (loading) return <div className="container">Cargando...</div>
  if (error) {
    return (
      <div className="page">
        <div className="container">
          <div className="error-message">{error}</div>
          <Link to="/doctor" className="btn btn-secondary" style={{ marginTop: '1rem', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Volver al panel
          </Link>
        </div>
      </div>
    )
  }

  const age = calcAge(profile.birth_date)
  const latestWeight = weights[0]
  const imc = calcImc(latestWeight?.weight_kg, profile.height_cm)
  const imcInfo = imcLabel(imc)
  const latestGlucose = glucose[0]
  const glucoseAlert = latestGlucose && (latestGlucose.value_mg_dl < GLUCOSE_LOW || latestGlucose.value_mg_dl > GLUCOSE_HIGH)

  let complicationsList = []
  if (Array.isArray(profile.complications)) {
    complicationsList = profile.complications
  } else if (profile.complications && typeof profile.complications === 'object') {
    complicationsList = Object.values(profile.complications).filter(Boolean)
  }

  return (
    <div className="page">
      <div className="header">
        <Link to="/doctor" style={{ color: '#fff', textDecoration: 'none', fontSize: '0.875rem', opacity: 0.85 }}>
          ‹ Panel médico
        </Link>
        <div className="header-title" style={{ marginTop: '0.5rem' }}>{profile.full_name || 'Sin nombre'}</div>
        <div className="header-subtitle">
          {age != null ? `${age} años` : ''}{profile.diabetes_type ? ` · Diabetes ${profile.diabetes_type}` : ''}
        </div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        {glucoseAlert && (
          <div className="card" style={{ backgroundColor: '#fdeceb', border: '1px solid #d64545', marginBottom: '1rem' }}>
            <div className="card-title" style={{ color: '#d64545' }}>
              {latestGlucose.value_mg_dl < GLUCOSE_LOW ? 'Alerta: hipoglucemia' : 'Alerta: hiperglucemia'}
            </div>
            <div className="card-meta" style={{ color: '#d64545' }}>
              Última lectura {latestGlucose.value_mg_dl} mg/dL — {formatDateTime(latestGlucose.measured_at)}
            </div>
          </div>
        )}

        <div className="section-label">Antecedentes médicos</div>
        <div className="card">
          {profile.phone && <div className="card-meta">Teléfono: {profile.phone}</div>}
          {profile.diagnosis_year && <div className="card-meta">Diagnosticado en: {profile.diagnosis_year}</div>}
          {profile.last_hba1c && (
            <div className="card-meta">
              Última HbA1c: {profile.last_hba1c}% {profile.last_hba1c_date ? `(${formatDate(profile.last_hba1c_date)})` : ''}
            </div>
          )}
          {profile.height_cm && <div className="card-meta">Estatura: {profile.height_cm} cm</div>}
          {profile.weight_goal_kg && <div className="card-meta">Meta de peso: {profile.weight_goal_kg} kg</div>}
          {profile.daily_calorie_goal && <div className="card-meta">Meta calórica diaria: {profile.daily_calorie_goal} kcal</div>}
          <div className="card-meta">Usa insulina: {profile.uses_insulin ? `Sí${profile.insulin_type ? ' — ' + profile.insulin_type : ''}` : 'No'}</div>
          {profile.current_medications && <div className="card-meta">Medicamentos: {profile.current_medications}</div>}
          {complicationsList.length > 0 && (
            <div className="card-meta">Complicaciones: {complicationsList.join(', ')}</div>
          )}
          {profile.allergies && <div className="card-meta">Alergias: {profile.allergies}</div>}
          {profile.family_history && <div className="card-meta">Antecedentes familiares: {profile.family_history}</div>}
          <div className="card-meta">
            Fuma: {profile.smoker ? 'Sí' : 'No'} · Alcohol: {profile.alcohol ? 'Sí' : 'No'}
          </div>
        </div>

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Glucosa reciente</div>
        {glucose.length === 0 ? (
          <div className="empty-state">Sin registros de glucosa.</div>
        ) : (
          <div className="card">
            {glucose.map((g) => {
              const out = g.value_mg_dl < GLUCOSE_LOW || g.value_mg_dl > GLUCOSE_HIGH
              return (
                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid rgba(15,76,92,0.08)' }}>
                  <span style={{ color: out ? '#d64545' : undefined, fontWeight: out ? 600 : 400 }}>
                    {g.value_mg_dl} mg/dL {g.context ? `(${g.context})` : ''}
                  </span>
                  <span className="card-meta" style={{ margin: 0 }}>{formatDateTime(g.measured_at)}</span>
                </div>
              )
            })}
          </div>
        )}

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Peso {imcInfo ? `· IMC ${imc.toFixed(1)}` : ''}</div>
        {imcInfo && (
          <div className="card-meta" style={{ marginBottom: '0.5rem', color: imcInfo.color, fontWeight: 600 }}>
            {imcInfo.text}
          </div>
        )}
        {weights.length === 0 ? (
          <div className="empty-state">Sin registros de peso.</div>
        ) : (
          <div className="card">
            {weights.map((w) => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid rgba(15,76,92,0.08)' }}>
                <span>{w.weight_kg} kg</span>
                <span className="card-meta" style={{ margin: 0 }}>{formatDate(w.logged_at)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Comidas recientes</div>
        {meals.length === 0 ? (
          <div className="empty-state">Sin comidas registradas.</div>
        ) : (
          <div className="card">
            {meals.map((m) => (
              <div key={m.id} style={{ padding: '0.375rem 0', borderBottom: '1px solid rgba(15,76,92,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{m.name || m.meal_type}</span>
                  <span className="card-meta" style={{ margin: 0 }}>{m.calories} kcal</span>
                </div>
                <div className="card-meta">{formatDateTime(m.logged_at)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Ejercicio reciente</div>
        {exercise.length === 0 ? (
          <div className="empty-state">Sin ejercicio registrado.</div>
        ) : (
          <div className="card">
            {exercise.map((e) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid rgba(15,76,92,0.08)' }}>
                <span>{e.activity} ({e.duration_min} min)</span>
                <span className="card-meta" style={{ margin: 0 }}>{e.calories_burned} kcal</span>
              </div>
            ))}
          </div>
        )}

        <div className="section-label" style={{ marginTop: '1.5rem' }}>Agua reciente</div>
        {water.length === 0 ? (
          <div className="empty-state">Sin registros de agua.</div>
        ) : (
          <div className="card">
            {water.map((a) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid rgba(15,76,92,0.08)' }}>
                <span>{a.amount_ml} ml</span>
                <span className="card-meta" style={{ margin: 0 }}>{formatDateTime(a.logged_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
            }
