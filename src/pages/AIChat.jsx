import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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
        <Link to="/dashboard" style={{ color: '#fff', textDecoration: 'none', fontSize: '0.875rem', opacity: 0.85 }}>
          ‹ Volver
        </Link>
