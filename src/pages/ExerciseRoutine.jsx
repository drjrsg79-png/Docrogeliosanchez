import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import jsPDF from 'jspdf'
import { supabase } from '../lib/supabase'
import FootCareWarning from '../components/FootCareWarning'
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

export default function ExerciseRoutine() {
  const [profile, setProfile] = useState(null)
  const [conditionNotes, setConditionNotes] = useState('')
  const [goal, setGoal] = useState('')
  const [routine, setRoutine] = useState(null)
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
      setLoading(false)
    }
    load()
  }, [navigate])

  async function handleGenerate(e) {
    e.preventDefault()
    setGenerating(true)
    setError('')
    setRoutine(null)

    setProgress('Analizando tu condición y objetivo...')
    const summaryResult = await fetchJsonSafe('/.netlify/functions/generate-exercise-summary', { conditionNotes, goal })

    if (!summaryResult.ok) {
      setError(`No se pudo generar el resumen: ${summaryResult.error}. Intenta de nuevo.`)
      setGenerating(false)
      setProgress('')
      return
    }

    const summary = summaryResult.data
    const dias = []

    for (let i = 0; i < DIAS.length; i++) {
      const diaNombre = DIAS[i]
      setProgress(`Generando ${diaNombre} (día ${i + 1} de 7)...`)

      const dayResult = await fetchJsonSafe('/.netlify/functions/generate-exercise-day', {
        day: diaNombre,
        conditionNotes,
        goal,
      })

      if (!dayResult.ok) {
        setError(`Se generaron ${i} de 7 días. Falló ${diaNombre}: ${dayResult.error}. Puedes intentar de nuevo.`)
        setGenerating(false)
        setProgress('')
        return
      }

      dias.push({ dia: diaNombre, ejercicios: dayResult.data.ejercicios })
      setRoutine({ ...summary, dias: [...dias] })
    }

    setProgress('')
    setGenerating(false)
  }

  function handleDownloadPdf() {
    if (!routine) return
    const doc = new jsPDF()

    let y = newStyledPdf(doc, 'Rutina de ejercicio', 'Plan semanal personalizado', profile?.full_name)

    const resumenLines = doc.splitTextToSize(routine.resumen || '', 175)
    y = addSectionBox(doc, y, resumenLines)

    routine.dias?.forEach((dia) => {
      y = checkPageBreak(doc, y, 20)
      y = addDayHeader(doc, y, dia.dia)

      dia.ejercicios?.forEach((ej) => {
        y = checkPageBreak(doc, y, 22)
        y = addItemLine(doc, y, `${ej.nombre} — ${ej.series_repeticiones}`, null, ej.notas)
        if (ej.busqueda_video && ej.busqueda_video !== 'null') {
          y = addVideoLink(doc, y, ej.busqueda_video)
        }
      })
      y += 3
    })

    addFootersToAllPages(doc)
    doc.save('rutina-ejercicio.pdf')
  }

  function handleWhatsAppShare() {
    if (!routine) return
    const resumen = `Rutina de ejercicio semanal - ${profile?.full_name || ''}\n\n${routine.resumen}\n\nDescargué el PDF completo con el detalle de cada día y videos de apoyo. Te lo comparto.`
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
          <p className="card-meta" style={{ marginBottom: '1rem' }}>
            La rutina se genera día por día para garantizar mayor precisión. El proceso completo toma aproximadamente 1 minuto — no cierres esta pantalla mientras se genera.
          </p>
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
              {generating ? (progress || 'Generando...') : 'Generar rutina'}
            </button>
          </form>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {routine && (
          <>
            <div className="card">
              <div className="card-meta">{routine.resumen}</div>
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

            {routine.dias?.map((dia) => (
              <div key={dia.dia} className="card">
                <div className="card-title">{dia.dia}</div>
                {dia.ejercicios?.map((ej, i) => (
                  <div key={i} style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: i > 0 ? '1px solid #dde3e6' : 'none' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ej.nombre} — {ej.series_repeticiones}</div>
                    {ej.notas && <div className="card-meta">{ej.notas}</div>}
                    {ej.busqueda_video && ej.busqueda_video !== 'null' && (
                      <a
                        href={youtubeSearchUrl(ej.busqueda_video)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.8125rem', color: '#0f4c5c', fontWeight: 600, display: 'inline-block', marginTop: '0.25rem' }}
                      >
                        ▶ Ver video de referencia
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
