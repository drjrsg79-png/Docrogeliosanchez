import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import jsPDF from 'jspdf'
import { supabase } from '../lib/supabase'

export default function DietPlan() {
  const [profile, setProfile] = useState(null)
  const [goal, setGoal] = useState('')
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
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
      const response = await fetch('/.netlify/functions/generate-diet-plan', {
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
      const result = await response.json()
      if (!response.ok || result.error) {
        setError(result.error || 'No se pudo generar el plan.')
      } else {
        setPlan(result)
      }
    } catch {
      setError('No se pudo generar el plan. Verifica tu conexión.')
    }
    setGenerating(false)
  }

  function handleDownloadPdf() {
    if (!plan) return
    const doc = new jsPDF()
    let y = 20

    doc.setFontSize(16)
    doc.text('Plan de alimentación semanal', 14, y)
    y += 8
    doc.setFontSize(10)
    doc.text(profile?.full_name || '', 14, y)
    y += 6
    doc.text(`${plan.calorias_diarias} kcal/día · ${plan.carbohidratos_g}g carb · ${plan.proteina_g}g prot · ${plan.grasas_g}g grasa`, 14, y)
    y += 10

    const resumenLines = doc.splitTextToSize(plan.resumen || '', 180)
    doc.text(resumenLines, 14, y)
    y += resumenLines.length * 5 + 6

    plan.dias?.forEach((dia) => {
      if (y > 250) { doc.addPage(); y = 20 }
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text(dia.dia, 14, y)
      y += 6
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      dia.comidas?.forEach((c) => {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.text(`• ${c.tipo}: ${c.platillo} (${c.calorias} kcal)`, 16, y)
        y += 5
        if (c.descripcion) {
          const descLines = doc.splitTextToSize(c.descripcion, 170)
          doc.setFontSize(9)
          doc.text(descLines, 20, y)
          y += descLines.length * 4.5
          doc.setFontSize(10)
        }
      })
      y += 4
    })

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
              {generating ? 'Generando plan...' : 'Generar plan'}
            </button>
          </form>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {plan && (
          <>
            <div className="card">
              <div className="card-meta">{plan.resumen}</div>
              <div className="card-meta" style={{ marginTop: '0.5rem', fontWeight: 600 }}>
                {plan.calorias_diarias} kcal/día · {plan.carbohidratos_g}g carb · {plan.proteina_g}g prot · {plan.grasas_g}g grasa
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={handleDownloadPdf} className="btn btn-secondary" style={{ flex: 1 }}>
                  Descargar PDF
                </button>
                <button onClick={handleWhatsAppShare} className="btn btn-secondary" style={{ flex: 1 }}>
                  Compartir por WhatsApp
                </button>
              </div>
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
