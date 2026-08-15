import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import jsPDF from 'jspdf'
import { supabase } from '../lib/supabase'
import FootCareWarning from '../components/FootCareWarning'

export default function ExerciseRoutine() {
  const [profile, setProfile] = useState(null)
  const [conditionNotes, setConditionNotes] = useState('')
  const [goal, setGoal] = useState('')
  const [routine, setRoutine] = useState(null)
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
      setLoading(false)
    }
    load()
  }, [navigate])

  async function handleGenerate(e) {
    e.preventDefault()
    setGenerating(true)
    setError('')
    setRoutine(null)

    try {
      const response = await fetch('/.netlify/functions/generate-exercise-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditionNotes, goal }),
      })
      const result = await response.json()
      if (!response.ok || result.error) {
        setError(result.error || 'No se pudo generar la rutina.')
      } else {
        setRoutine(result)
      }
    } catch {
      setError('No se pudo generar la rutina. Verifica tu conexión.')
    }
    setGenerating(false)
  }

  function handleDownloadPdf() {
    if (!routine) return
    const doc = new jsPDF()
    let y = 20

    doc.setFontSize(16)
    doc.text('Rutina de ejercicio semanal', 14, y)
    y += 8
    doc.setFontSize(10)
    doc.text(profile?.full_name || '', 14, y)
    y += 10

    doc.setFontSize(10)
    const resumenLines = doc.splitTextToSize(routine.resumen || '', 180)
    doc.text(resumenLines, 14, y)
    y += resumenLines.length * 5 + 6

    routine.dias?.forEach((dia) => {
      if (y > 260) { doc.addPage(); y = 20 }
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text(dia.dia, 14, y)
      y += 6
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      dia.ejercicios?.forEach((ej) => {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.text(`• ${ej.nombre} — ${ej.series_repeticiones}`, 16, y)
        y += 5
        if (ej.notas) {
          const notaLines = doc.splitTextToSize(ej.notas, 170)
          doc.setFontSize(9)
          doc.text(notaLines, 20, y)
          y += notaLines.length * 4.5
          doc.setFontSize(10)
        }
      })
      y += 4
    })

    doc.save('rutina-ejercicio.pdf')
  }

  function handleWhatsAppShare() {
    if (!routine) return
    const resumen = `Rutina de ejercicio semanal - ${profile?.full_name || ''}\n\n${routine.resumen}\n\nDescargué el PDF completo con el detalle de cada día. Te lo comparto.`
    const url = `https://wa.me/?text=${encodeURIComponent(resumen)}`
    window.open(url, '_blank')
  }

  if (loading) return <div className="container">Cargando...</div>

  return (
    <div className="page">
      <div className="header">
        <div className="header-title">Rutina de ejercicio</div>
        <div className="header-subtitle">Plan semanal generado según tu condición</div>
      </div>

      <div className="container" style={{ flex: 1 }}>
        <Link to="/dashboard" className="footer-link" style={{ display: 'block', marginBottom: '1rem', marginTop: 0 }}>
          ← Volver al panel
        </Link>

        <FootCareWarning />

        <div className="card">
          <div className="section-label" style={{ marginBottom: '1rem' }}>Generar rutina personalizada</div>
          <form onSubmit={handleGenerate}>
            <div className="field">
              <label>¿Tienes alguna condición o lesión actual?</label>
              <textarea
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                placeholder="Ej. Herida activa en pie derecho, sin autorización para apoyar peso"
                rows={3}
              />
            </div>
            <div className="field">
              <label>Objetivo</label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Ej. Mejorar movilidad, bajar de peso, mantener condición"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={generating}>
              {generating ? 'Generando rutina...' : 'Generar rutina'}
            </button>
          </form>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {routine && (
          <>
            <div className="card">
              <div className="card-meta">{routine.resumen}</div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={handleDownloadPdf} className="btn btn-secondary" style={{ flex: 1 }}>
                  Descargar PDF
                </button>
                <button onClick={handleWhatsAppShare} className="btn btn-secondary" style={{ flex: 1 }}>
                  Compartir por WhatsApp
                </button>
              </div>
            </div>

            {routine.dias?.map((dia) => (
              <div key={dia.dia} className="card">
                <div className="card-title">{dia.dia}</div>
                {dia.ejercicios?.map((ej, i) => (
                  <div key={i} style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: i > 0 ? '1px solid #dde3e6' : 'none' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ej.nombre} — {ej.series_repeticiones}</div>
                    {ej.notas && <div className="card-meta">{ej.notas}</div>}
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
