import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import jsPDF from 'jspdf'
import { loadProfile, saveProfile, loadStore, saveStore, LOCAL_NOTE } from '../lib/localStore'
import { newStyledPdf, checkPageBreak, addSectionBox, addDayHeader, addItemLine, addVideoLink, addFootersToAllPages } from '../lib/pdfStyle'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

async function fetchJsonSafe(url, body, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const text = await res.text()
      if (!text) throw new Error('Respuesta vacía del servidor')
      const data = JSON.parse(text)
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error del servidor')
      }
      return { data, ok: true }
    } catch (err) {
      if (attempt === retries) {
        return { error: err.message || 'No se pudo completar la solicitud', ok: false }
      }
    }
  }
}

function youtubeSearchUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}

export default function DietPlan() {
  const [profile, setProfile] = useState(() => loadProfile())
  const [goal, setGoal] = useState('')
  const [plan, setPlan] = useState(() => loadStore('diet-plan', null))
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = loadStore('diet-plan', null)
    if (stored) setPlan(stored)
  }, [])

  async function handleGenerate(e) {
    e.preventDefault()
    setGenerating(true)
    setError('')
    setPlan(null)

    setProgress('Calculando tus metas nutricionales...')
    const summaryResult = await fetchJsonSafe('/.netlify/functions/generate-diet-summary', {
      goal,
      diabetesType: profile?.diabetes_type,
      currentWeight: profile?.current_weight,
      heightCm: profile?.height_cm,
      weightGoal: profile?.weight_goal_kg,
    })

    if (!summaryResult.ok) {
      setError(`No se pudo calcular el resumen inicial: ${summaryResult.error}. Intenta generar el plan de nuevo.`)
      setGenerating(false)
      setProgress('')
      return
    }

    const summary = summaryResult.data
    const dias = []
    const usedDishes = []

    for (let i = 0; i < DIAS.length; i++) {
      const diaNombre = DIAS[i]
      setProgress(`Generando ${diaNombre} (día ${i + 1} de 7)...`)

      const dayResult = await fetchJsonSafe('/.netlify/functions/generate-diet-day', {
        day: diaNombre,
        goal,
        diabetesType: profile?.diabetes_type,
        caloriasDiarias: summary.calorias_diarias,
        usedDishes,
      })

      if (!dayResult.ok) {
        setError(`Se generaron ${i} de 7 días. Falló ${diaNombre}: ${dayResult.error}. Puedes intentar de nuevo.`)
        setGenerating(false)
        setProgress('')
        return
      }

      dias.push({ dia: diaNombre, comidas: dayResult.data.comidas })
      dayResult.data.comidas?.forEach((c) => {
        if (c.platillo) usedDishes.push(c.platillo)
      })
      setPlan({ ...summary, dias: [...dias] })
    }

    setProgress('')
    setGenerating(false)
    const complete = { ...summary, dias }
    setPlan(complete)
    saveStore('diet-plan', complete)
  }

  function handleDownloadPdf() {
    if (!plan) return
    const doc = new jsPDF()

    let y = newStyledPdf(doc, 'Plan de alimentación', 'Plan semanal personalizado', profile?.full_name)

    const macros = `${plan.calorias_diarias} kcal/día  ·  ${plan.carbohidratos_g}g carbohidratos  ·  ${plan.proteina_g}g proteína  ·  ${plan.grasas_g}g grasa`
    const resumenLines = [...doc.splitTextToSize(plan.resumen || '', 175), '', macros]
    y = addSectionBox(doc, y, resumenLines)

    plan.dias?.forEach((dia) => {
      y = checkPageBreak(doc, y, 20)
      y = addDayHeader(doc, y, dia.dia)

      dia.comidas?.forEach((c) => {
        y = checkPageBreak(doc, y, 18)
        const meta = `${c.calorias} kcal · ${c.carbohidratos_g}g carb · ${c.proteina_g}g prot · ${c.grasas_g}g grasa`
        y = addItemLine(doc, y, `${c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1)}: ${c.platillo}`, meta, c.descripcion)
        if (c.busqueda_video && c.busqueda_video !== 'null') {
          y = addVideoLink(doc, y, c.busqueda_video)
        }
      })
      y += 3
    })

    addFootersToAllPages(doc)
    doc.save('plan-alimentacion.pdf')
  }

  function handleWhatsAppShare() {
    if (!plan) return
    const resumen = `Plan de alimentación semanal - ${profile?.full_name || ''}\n\n${plan.resumen}\n\nMeta diaria: ${plan.calorias_diarias} kcal\n\nDescargué el PDF completo con el detalle de cada día. Te lo comparto.`
    const url = `https://wa.me/?text=${encodeURIComponent(resumen)}`
    window.open(url, '_blank')
  }

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">Plan de alimentación</div>
        <div className="header-subtitle">Aquí sacas tu dieta de la semana</div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        <Link to="/" className="footer-link" style={{ display: 'block', marginBottom: '1rem', marginTop: 0 }}>
          ← Volver al inicio
        </Link>

        <div className="card">
          <div className="section-label" style={{ marginBottom: '1rem' }}>Generar plan personalizado</div>
          <p className="card-meta" style={{ marginBottom: '1rem' }}>{LOCAL_NOTE}</p>
          <p className="card-meta" style={{ marginBottom: '1rem' }}>
            El plan se genera día por día para garantizar mayor precisión. El proceso completo toma aproximadamente 1 minuto — verás cada día aparecer conforme se va generando, no es necesario recargar la página.
          </p>
          <form onSubmit={(e) => {
              saveProfile({
                full_name: profile?.full_name || '',
                diabetes_type: profile?.diabetes_type || '',
                current_weight: profile?.current_weight ? Number(profile.current_weight) : null,
                height_cm: profile?.height_cm ? Number(profile.height_cm) : null,
              })
              handleGenerate(e)
            }}>
            <div className="field">
              <label>Nombre (opcional)</label>
              <input
                type="text"
                value={profile?.full_name || ''}
                onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="Para el PDF"
              />
            </div>
            <div className="field">
              <label>Tipo de diabetes (opcional)</label>
              <input
                type="text"
                value={profile?.diabetes_type || ''}
                onChange={(e) => setProfile((p) => ({ ...p, diabetes_type: e.target.value }))}
                placeholder="Ej. 2, o déjalo vacío si no aplica"
              />
            </div>
            <div className="field">
              <label>Peso actual (kg, opcional)</label>
              <input
                type="number"
                inputMode="decimal"
                value={profile?.current_weight || ''}
                onChange={(e) => setProfile((p) => ({ ...p, current_weight: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Estatura (cm, opcional)</label>
              <input
                type="number"
                inputMode="decimal"
                value={profile?.height_cm || ''}
                onChange={(e) => setProfile((p) => ({ ...p, height_cm: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Objetivo</label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Ej. Bajar de peso, control estricto de glucosa"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={generating}>
              {generating ? (progress || 'Generando...') : 'Sacar mi dieta'}
            </button>
          </form>
          {generating && (
            <p className="card-meta" style={{ marginTop: '0.75rem', textAlign: 'center' }}>
              No cierres esta pantalla mientras se genera tu plan.
            </p>
          )}
        </div>

        {error && <div className="alert-error">{error}</div>}

        {plan && (
          <>
            <div className="card">
              <div className="card-meta">{plan.resumen}</div>
              <div className="card-meta" style={{ marginTop: '0.5rem', fontWeight: 600 }}>
                {plan.calorias_diarias} kcal/día · {plan.carbohidratos_g}g carb · {plan.proteina_g}g prot · {plan.grasas_g}g grasa
              </div>
              {!generating && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button onClick={handleDownloadPdf} className="btn btn-secondary" style={{ flex: 1 }}>
                    Descargar PDF
                  </button>
                  <button onClick={handleWhatsAppShare} className="btn btn-secondary" style={{ flex: 1 }}>
                    Compartir por WhatsApp
                  </button>
                </div>
              )}
            </div>

            {plan.dias?.map((dia) => (
              <div key={dia.dia} className="card">
                <div className="card-title">{dia.dia}</div>
                {dia.comidas?.map((c, i) => (
                  <div key={i} style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: i > 0 ? '1px solid #dde3e6' : 'none' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'capitalize' }}>{c.tipo}: {c.platillo}</div>
                    <div className="card-meta">{c.descripcion}</div>
                    <div className="card-meta">{c.calorias} kcal · {c.carbohidratos_g}g carb</div>
                    {c.busqueda_video && c.busqueda_video !== 'null' && (
                      <a
                        href={youtubeSearchUrl(c.busqueda_video)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.8125rem', color: '#0f4c5c', fontWeight: 600, display: 'inline-block', marginTop: '0.25rem' }}
                      >
                        ▶ Ver receta en video
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
