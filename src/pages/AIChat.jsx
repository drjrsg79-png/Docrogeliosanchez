import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AIChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [latestWeight, setLatestWeight] = useState(null)
  const navigate = useNavigate()
  const bottomRef = useRef(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      const [profileRes, weightRes, messagesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('weight_logs').select('weight_kg').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(1),
        supabase.from('ai_chat_messages').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      ])

      setProfile(profileRes.data || null)
      setLatestWeight(weightRes.data?.[0]?.weight_kg || null)
      setMessages(messagesRes.data || [])
      setLoading(false)
    }
    load()
  }, [navigate])

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

    const { data: { user } } = await supabase.auth.getUser()

    const { data: savedUserMsg } = await supabase
      .from('ai_chat_messages')
      .insert({ user_id: user.id, role: 'user', content: text })
      .select()
      .single()

    const nextMessages = [...messages, savedUserMsg || { role: 'user', content: text }]
    setMessages(nextMessages)

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

      const { data: savedAiMsg } = await supabase
        .from('ai_chat_messages')
        .insert({ user_id: user.id, role: 'assistant', content: data.reply })
        .select()
        .single()

      setMessages((prev) => [...prev, savedAiMsg || { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="container">Cargando...</div>

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="header">
        <Link to="/dashboard" style={{ color: '#fff', textDecoration: 'none', fontSize: '0.875rem', opacity: 0.85 }}>
          ‹ Volver
        </Link>
        <div className="header-title" style={{ marginTop: '0.5rem' }}>Asistente médico virtual</div>
        <div className="header-subtitle">Internista · Endocrinólogo · Nutrición y actividad física</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
        {messages.length === 0 && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="card-meta">
              Puedes preguntarme sobre alimentación, ejercicio, manejo de peso o dudas generales sobre tu diabetes.
              Para cambios de tratamiento, siempre consulta al Dr. Rogelio.
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
                backgroundColor: m.role === 'user' ? '#0F4C5C' : '#eef3f4',
                color: m.role === 'user' ? '#fff' : '#152E44',
                fontSize: '0.9375rem',
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.625rem 0.875rem', borderRadius: '14px', backgroundColor: '#eef3f4', color: '#5c6b73', fontSize: '0.9375rem' }}>
              Escribiendo...
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(15,76,92,0.1)' }}>
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
