import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadProfile, saveProfile, loadStore, saveStore, LOCAL_NOTE } from '../lib/localStore'
import { AGENDA_URL, DOCTOR_DIET_LINE, WHATSAPP_DISPLAY, whatsappUrl } from '../lib/clinic'
import {
  DAY_THEMES,
  DIAS,
  DISCLAIMER,
  MEAL_LABELS,
  MEAL_ORDER,
  buildRecommendations,
  buildShoppingList,
  calcDietTargets,
  dishKey,
  hasMealSet,
  mainDishNames,
  normalizeDayMeals,
  sumMacros,
} from '../lib/dietTargets'
import { downloadDietPdf } from '../lib/dietPdf'

async function fetchDay(body, timeoutMs = 20000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch('/.netlify/functions/generate-diet-day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const text = await res.text()
    if (!text) throw new Error('Respuesta vacía')
    const data = JSON.parse(text)
    if (!res.ok || data.error) throw new Error(data.error || 'Error del servidor')
    return data
  } finally {
    clearTimeout(timer)
  }
}

async function fetchDayOnceRetry(body) {
  try {
    return await fetchDay(body)
  } catch {
    return fetchDay(body)
  }
}

function persistProfile(profile, goal) {
  saveProfile({
    full_name: profile.full_name || '',
    diabetes_type: profile.diabetes_type || '',
    current_weight: profile.current_weight ? Number(profile.current_weight) : null,
    height_cm: profile.height_cm ? Number(profile.height_cm) : null,
    weight_goal_kg: profile.weight_goal_kg ? Number(profile.weight_goal_kg) : null,
    sex: profile.sex || '',
    age: profile.age ? Number(profile.age) : null,
    hipertension: Boolean(profile.hipertension),
    erc: Boolean(profile.erc),
    allergies: profile.allergies || '',
    food_preferences: profile.food_preferences || '',
    budget_level: profile.budget_level || '',
    goal: goal || '',
  })
}

export default function DietPlan() {
  const [profile, setProfile] = useState(() => loadProfile())
  const [goal, setGoal] = useState(() => loadProfile().goal || '')
  const [plan, setPlan] = useState(() => loadStore('diet-plan', null))
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = loadStore('diet-plan', null)
    if (stored) setPlan(stored)
  }, [])

  function update(field, value) {
    setProfile((p) => ({ ...p, [field]: value }))
  }

  async function handleGenerate(e) {
    e.preventDefault()
    persistProfile(profile, goal)
    setGenerating(true)
    setError('')
    setPlan(null)

    const targets = calcDietTargets(profile, goal)
    const dias = []
    const usedDishes = []

    for (let i = 0; i < DIAS.length; i++) {
      const diaNombre = DIAS[i]
      setProgress(`Preparando ${diaNombre.toLowerCase()}…`)

      const payload = {
        day: diaNombre,
        theme: DAY_THEMES[diaNombre],
        goal,
        diabetesType: profile.diabetes_type,
        hipertension: Boolean(profile.hipertension),
        erc: Boolean(profile.erc),
        allergies: profile.allergies,
        preferences: profile.food_preferences,
        budget: profile.budget_level,
        currentWeight: profile.current_weight ? Number(profile.current_weight) : undefined,
        heightCm: profile.height_cm ? Number(profile.height_cm) : undefined,
        caloriasDiarias: targets.calorias_diarias,
        macros: {
          carbohidratos_g: targets.carbohidratos_g,
          proteina_g: targets.proteina_g,
          grasas_g: targets.grasas_g,
        },
        usedDishes,
      }

      let comidas
      try {
        const data = await fetchDayOnceRetry(payload)
        comidas = normalizeDayMeals(data.comidas)
        const names = mainDishNames(comidas).map(dishKey)
        const repeated = names.some((n) => n && usedDishes.map(dishKey).includes(n))
        if (!hasMealSet(comidas) || repeated) {
          const retryData = await fetchDay({
            ...payload,
            usedDishes: [...usedDishes, ...mainDishNames(comidas)],
          })
          const retryMeals = normalizeDayMeals(retryData.comidas)
          if (hasMealSet(retryMeals)) comidas = retryMeals
        }
      } catch (err) {
        setError(`Se armó hasta ${i} de 7 días. Faltó ${diaNombre}: ${err.message || 'error de conexión'}. Puedes intentar de nuevo; los días listos se quedan en este teléfono si pulsas otra vez después.`)
        const partial = finalizePlan(targets, dias, profile, goal)
        if (dias.length) {
          setPlan(partial)
          saveStore('diet-plan', partial)
        }
        setGenerating(false)
        setProgress('')
        return
      }

      dias.push({ dia: diaNombre, comidas, totales: sumMacros(comidas) })
      mainDishNames(comidas).forEach((n) => {
        if (n) usedDishes.push(n)
      })
      const partial = finalizePlan(targets, dias, profile, goal)
      setPlan({ ...partial, incompleto: dias.length < 7 })
    }

    const complete = finalizePlan(targets, dias, profile, goal)
    setPlan(complete)
    saveStore('diet-plan', complete)
    setProgress('')
    setGenerating(false)
  }

  function finalizePlan(targets, dias, prof, goalText) {
    return {
      ...targets,
      dias,
      lista_compras: buildShoppingList(dias),
      recomendaciones: buildRecommendations(prof, targets, goalText),
    }
  }

  const waMessage = plan
    ? `Hola, quiero comentar mi plan de alimentación semanal${profile.full_name ? ` (${profile.full_name})` : ''} con el Dr. Rogelio Sánchez.`
    : ''

  return (
    <div className="page">
      <div className="header">
        <div className="header-kicker">{DOCTOR_DIET_LINE}</div>
        <div className="header-title">Plan de alimentación</div>
        <div className="header-subtitle">Semana completa, cinco tiempos, formato de consulta</div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        <Link to="/" className="footer-link" style={{ display: 'block', marginBottom: '1rem', marginTop: 0 }}>
          ← Volver al inicio
        </Link>

        <div className="card">
          <div className="section-label" style={{ marginBottom: '0.75rem' }}>Datos para personalizar el plan</div>
          <p className="card-meta" style={{ marginBottom: '1rem' }}>{LOCAL_NOTE}</p>
          <form onSubmit={handleGenerate}>
            <div className="field">
              <label>Nombre (opcional, aparece en el documento)</label>
              <input type="text" value={profile.full_name || ''} onChange={(e) => update('full_name', e.target.value)} placeholder="Nombre y apellidos" />
            </div>
            <div className="diet-grid">
              <div className="field">
                <label>Edad (años, opcional)</label>
                <input type="number" inputMode="numeric" value={profile.age || ''} onChange={(e) => update('age', e.target.value)} />
              </div>
              <div className="field">
                <label>Sexo (opcional)</label>
                <select value={profile.sex || ''} onChange={(e) => update('sex', e.target.value)}>
                  <option value="">Prefiero no indicarlo</option>
                  <option value="female">Femenino</option>
                  <option value="male">Masculino</option>
                </select>
              </div>
            </div>
            <div className="diet-grid">
              <div className="field">
                <label>Peso actual (kg, opcional)</label>
                <input type="number" inputMode="decimal" value={profile.current_weight || ''} onChange={(e) => update('current_weight', e.target.value)} />
              </div>
              <div className="field">
                <label>Estatura (cm, opcional)</label>
                <input type="number" inputMode="decimal" value={profile.height_cm || ''} onChange={(e) => update('height_cm', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Peso meta (kg, opcional)</label>
              <input type="number" inputMode="decimal" value={profile.weight_goal_kg || ''} onChange={(e) => update('weight_goal_kg', e.target.value)} />
            </div>
            <div className="field">
              <label>Objetivo</label>
              <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ej. Bajar de peso de forma gradual, cuidar la glucosa" />
            </div>
            <div className="field">
              <label>Diabetes (opcional)</label>
              <select value={profile.diabetes_type || ''} onChange={(e) => update('diabetes_type', e.target.value)}>
                <option value="">No lo indico</option>
                <option value="ninguna">No tengo diabetes</option>
                <option value="prediabetes">Prediabetes</option>
                <option value="tipo_2">Tipo 2</option>
                <option value="tipo_1">Tipo 1</option>
                <option value="gestacional">Gestacional</option>
              </select>
            </div>
            <label className="diet-check">
              <input type="checkbox" checked={Boolean(profile.hipertension)} onChange={(e) => update('hipertension', e.target.checked)} />
              Hipertensión
            </label>
            <label className="diet-check">
              <input type="checkbox" checked={Boolean(profile.erc)} onChange={(e) => update('erc', e.target.checked)} />
              Enfermedad renal crónica
            </label>
            <div className="field">
              <label>Alergias o intolerancias (opcional)</label>
              <input type="text" value={profile.allergies || ''} onChange={(e) => update('allergies', e.target.value)} placeholder="Ej. lactosa, cacahuate, mariscos" />
            </div>
            <div className="field">
              <label>Preferencias (opcional)</label>
              <input type="text" value={profile.food_preferences || ''} onChange={(e) => update('food_preferences', e.target.value)} placeholder="Ej. no como res, prefiero comida casera" />
            </div>
            <div className="field">
              <label>Presupuesto de despensa (opcional)</label>
              <select value={profile.budget_level || ''} onChange={(e) => update('budget_level', e.target.value)}>
                <option value="">Sin preferencia</option>
                <option value="accesible">Accesible (mercado y cocina de casa)</option>
                <option value="moderado">Moderado</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={generating}>
              {generating ? (progress || 'Preparando su plan…') : 'Sacar mi dieta de la semana'}
            </button>
          </form>
          {generating && (
            <p className="card-meta" style={{ marginTop: '0.75rem', textAlign: 'center' }}>
              {progress || 'Preparando su plan…'} No cierre esta pantalla; el menú se arma día por día.
            </p>
          )}
        </div>

        {error && <div className="alert-error">{error}</div>}

        {plan && (
          <>
            <div className="card diet-summary-card">
              <div className="section-label">Plan semanal</div>
              <p className="card-meta">{plan.resumen}</p>
              <div className="diet-macro-row">
                <span><strong>{plan.calorias_diarias}</strong> kcal/día</span>
                <span>{plan.carbohidratos_g} g HC</span>
                <span>{plan.proteina_g} g prot</span>
                <span>{plan.grasas_g} g grasa</span>
              </div>
              {!generating && (
                <div className="diet-actions">
                  <button type="button" onClick={() => downloadDietPdf(plan, profile, goal)} className="btn btn-primary">
                    Descargar PDF
                  </button>
                  <a className="btn btn-secondary" href={whatsappUrl(waMessage)} target="_blank" rel="noopener noreferrer">
                    WhatsApp {WHATSAPP_DISPLAY}
                  </a>
                  <a className="btn btn-secondary" href={AGENDA_URL} target="_blank" rel="noopener noreferrer">
                    Agendar cita
                  </a>
                </div>
              )}
              <p className="card-meta diet-disclaimer">{DISCLAIMER}</p>
            </div>

            {plan.dias?.length > 0 && !generating && (
              <div className="card diet-week-card">
                <div className="section-label">Menú de la semana</div>
                <div className="diet-week-scroll">
                  <table className="diet-week-table">
                    <thead>
                      <tr>
                        <th>Día</th>
                        {MEAL_ORDER.map((m) => (
                          <th key={m}>{MEAL_LABELS[m].replace('Colación de media ', 'Col. ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {plan.dias.map((dia) => (
                        <tr key={dia.dia}>
                          <td>
                            <strong>{dia.dia}</strong>
                            <div className="card-meta">{sumMacros(dia.comidas).calorias} kcal</div>
                          </td>
                          {MEAL_ORDER.map((m) => {
                            const c = dia.comidas?.find((x) => x.tipo === m)
                            return <td key={m}>{c?.platillo || '—'}</td>
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {plan.dias?.map((dia) => (
              <div key={dia.dia} className="card">
                <div className="card-title">{dia.dia}</div>
                <div className="card-meta" style={{ marginBottom: '0.5rem' }}>
                  {sumMacros(dia.comidas).calorias} kcal · {sumMacros(dia.comidas).carbohidratos_g} g HC · {sumMacros(dia.comidas).proteina_g} g prot · {sumMacros(dia.comidas).grasas_g} g grasa
                </div>
                {MEAL_ORDER.map((tipo) => {
                  const c = dia.comidas?.find((x) => x.tipo === tipo)
                  if (!c) return null
                  return (
                    <div key={tipo} className="diet-meal">
                      <div className="diet-meal-kicker">{MEAL_LABELS[tipo]}</div>
                      <div className="diet-meal-title">{c.platillo}</div>
                      {c.porcion && <div className="card-meta">Porción: {c.porcion}</div>}
                      <div className="card-meta">{c.calorias} kcal · {c.carbohidratos_g} g HC · {c.proteina_g} g prot · {c.grasas_g} g grasa</div>
                      {c.equivalentes && <div className="card-meta">Equivalencia: {c.equivalentes}</div>}
                      {c.tip && <div className="card-meta">Preparación: {c.tip}</div>}
                    </div>
                  )
                })}
              </div>
            ))}

            {plan.lista_compras?.length > 0 && !generating && (
              <div className="card">
                <div className="card-title">Lista de compras</div>
                {plan.lista_compras.map((g) => (
                  <div key={g.seccion} className="diet-shop-group">
                    <div className="diet-shop-label">{g.seccion}</div>
                    <ul className="diet-shop-list">
                      {g.items.map((item) => (
                        <li key={item.item}>{item.item}{item.detalle ? ` — ${item.detalle}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {plan.recomendaciones?.length > 0 && !generating && (
              <div className="card">
                <div className="card-title">Recomendaciones</div>
                {plan.recomendaciones.map((r) => (
                  <div key={r.titulo} className="diet-rec">
                    <strong>{r.titulo}</strong>
                    <p className="card-meta">{r.texto}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
