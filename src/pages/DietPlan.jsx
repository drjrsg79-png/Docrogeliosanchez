import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import jsPDF from 'jspdf'
import { supabase } from '../lib/supabase'
import { newStyledPdf, checkPageBreak, addSectionBox, addDayHeader, addItemLine, addFootersToAllPages } from '../lib/pdfStyle'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default function DietPlan() {
  const [profile, setProfile] = useState(null)
  const [goal, setGoal] = useState('')
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)

      const { data: weightData } = await supabase
        .from('weight_logs')
        .select('weight_kg')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(1)
        .single()

      if (weightData) {
        setProfile((prev) => ({ ...prev, current_weight: weightData.weight_kg }))
      }
      setLoading(false)
    }
    load()
  }, [navigate])

  async function handleGenerate(e) {
    e.preventDefault()
    setGenerating(true)
    setError('')
    setPlan(null)

    try {
      setProgress('Calculando tus metas nutricionales...')
      const summaryRes = await fetch('/.netlify/functions/generate-diet-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          diabetesType: profile?.diabetes_type,
          currentWeight: profile?.current_weight,
          heightCm: profile?.height_cm,
          weightGoal: profile?.weight_goal_kg,
        }),
      })
      const summary = await summaryRes.json()
      if (!summaryRes.ok || summary.error) {
        setError(summary.error || 'No se pudo generar el resumen.')
        setGenerating(false)
        return
      }

      const dias = []
      for (let i = 0; i < DIAS.length; i++) {
        const diaNombre = DIAS[i]
        setProgress(`Generando ${diaNombre} (día ${i + 1} de 7)...`)

        const dayRes = await fetch('/.netlify/functions/generate-diet-day', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day: diaNombre,
            goal,
            diabetesType: profile?.diabetes_type,
            caloriasDiarias: summary.calorias_diarias,
          }),
        })
        const dayData = await dayRes.json()
        if (!dayRes.ok || dayData.error) {
          setError(`No se pudo generar ${diaNombre}. Intenta de nuevo.`)
          setGenerating(false)
          return
        }
        dias.push({ dia: diaNombre, comidas: dayData.comidas })
        setPlan({ ...summary, dias: [...dias] })
      }

      setProgress('')
    } catch {
      setError('No se pudo generar el plan. Verifica tu conexión.')
    }
    setGenerating(false)
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

  if (loading) return <div className="container">Cargando...</div>

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">Plan de alimentación</div>
        <div className="header-subtitle">Plan semanal generado según tu perfil</div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        <Link to="/dashboard" className="footer-link" style={{ display: 'block', marginBottom: '1rem', marginTop: 0 }}>
          ← Volver al panel
        </Link>

        <div className="card">
          <div className="section-label" style={{ marginBottom: '1rem' }}>Generar plan personalizado</div>
          <p className="card-meta" style={{ marginBottom: '1rem' }}>
            El plan se genera día por día para garantizar mayor precisión. El proceso completo toma aproximadamente 1 minuto — verás cada día aparecer conforme se va generando, no es necesario recargar la página.
          </p>
          <form onSubmit={handleGenerate}>
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
              {generating ? (progress || 'Generando...') : 'Generar plan'}
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
