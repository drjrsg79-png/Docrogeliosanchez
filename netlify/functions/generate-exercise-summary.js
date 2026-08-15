export default async function handler(request) {
  try {
    const body = await request.json()
    const { conditionNotes, goal } = body

    const systemPrompt = `Eres un especialista en rehabilitacion fisica experto en pacientes diabeticos.

Paciente con condicion: ${conditionNotes || 'sin condiciones especiales reportadas'}. Objetivo: ${goal || 'salud general'}.

Responde UNICAMENTE con un JSON valido de una sola linea, sin saltos de linea dentro de los textos, sin texto adicional, sin markdown:
{
  "resumen": "explicacion breve en una sola linea, maximo 2 frases, mencionando por que esta rutina es apropiada y segura para este paciente"
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Genera el resumen, solo el JSON en una sola linea.' }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Error al generar el resumen' }), { status: 500 })
    }

    const textContent = data.content?.find((c) => c.type === 'text')?.text || ''
    let cleaned = textContent.replace(/```json|```/g, '').trim()
    cleaned = cleaned.replace(/[\u0000-\u001F]+/g, ' ')
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1) cleaned = cleaned.slice(firstBrace, lastBrace + 1)

    const parsed = JSON.parse(cleaned)
    return new Response(JSON.stringify(parsed), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
