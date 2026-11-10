import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadProfile, loadLogs, saveStore, LOCAL_NOTE } from '../lib/localStore'

function calcAge(birthDate) {
  if (!birthDate) return null
  const b = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
  return age
}

function renderContent(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

export default function AIChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [profile] = useState(() => loadProfile())
  const [latestWeight] = useState(() => loadLogs('weight_logs')[0]?.weight_kg || loadProfile().current_weight || null)
  const bottomRef = useRef(null)

  useEffect(() => {
    setMessages(loadLogs('ai_chat_messages'))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    setError('')
    setSending(true)
    setInput('')

    const savedUserMsg = { id: Date.now(), role: 'user', content: text, created_at: new Date().toISOString() }
    const nextMessages = [...messages, savedUserMsg]
    setMessages(nextMessages)
    saveStore('ai_chat_messages', nextMessages.slice(-40))

    try {
      const res = await fetch('/.netlify/functions/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: nextMessages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
          patientContext: profile
            ? {
                full_name: profile.full_name,
                age: calcAge(profile.birth_date),
                diabetes_type: profile.diabetes_type,
                diagnosis_year: profile.diagnosis_year,
                last_hba1c: profile.last_hba1c,
                height_cm: profile.height_cm,
                current_weight_kg: latestWeight,
                weight_goal_kg: profile.weight_goal_kg,
                uses_insulin: profile.uses_insulin,
                insulin_type: profile.insulin_type,
                current_medications: profile.current_medications,
                allergies: profile.allergies,
              }
            : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'No se pudo obtener respuesta.')
        setSending(false)
        return
      }

      const savedAiMsg = { id: Date.now() + 1, role: 'assistant', content: data.reply, created_at: new Date().toISOString() }
      const withReply = [...nextMessages, savedAiMsg]
      setMessages(withReply)
      saveStore('ai_chat_messages', withReply.slice(-40))
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f4f6f7',
      }}
    >
      <div className="header" style={{ flexShrink: 0 }}>
        <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontSize: '0.875rem', opacity: 0.85 }}>
          ‹ Inicio
        </Link>
        <div className="header-title" style={{ marginTop: '0.5rem' }}>Orientación</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', backgroundColor: '#f4f6f7' }}>
        {messages.length === 0 && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="card-meta">
              Pregunta dudas sobre diabetes, heridas, medicamentos o tus registros.
              Esto orienta; el tratamiento lo decide el Dr. Rogelio. {LOCAL_NOTE}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={m.id || i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '0.75rem',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '0.625rem 0.875rem',
                borderRadius: '14px',
                backgroundColor: m.role === 'user' ? '#0F4C5C' : '#ffffff',
                color: m.role === 'user' ? '#fff' : '#152E44',
                fontSize: '0.9375rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                boxShadow: m.role === 'user' ? 'none' : '0 1px 2px rgba(15,76,92,0.1)',
              }}
            >
              {renderContent(m.content)}
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.625rem 0.875rem', borderRadius: '14px', backgroundColor: '#ffffff', color: '#5c6b73', fontSize: '0.9375rem', boxShadow: '0 1px 2px rgba(15,76,92,0.1)' }}>
              Escribiendo...
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.75rem 1.25rem',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          borderTop: '1px solid rgba(15,76,92,0.1)',
          backgroundColor: '#ffffff',
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta..."
          style={{
            flex: 1,
            padding: '0.625rem 0.875rem',
            borderRadius: '10px',
            border: '1px solid rgba(15,76,92,0.2)',
            fontSize: '0.9375rem',
          }}
        />
        <button type="submit" className="btn-primary" disabled={sending || !input.trim()} style={{ padding: '0 1.25rem' }}>
          Enviar
        </button>
      </form>
    </div>
  )
}
