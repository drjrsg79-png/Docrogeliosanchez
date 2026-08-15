export default async function handler(request) {
  try {
    const body = await request.json()
    const { day, conditionNotes, goal } = body

    const systemPrompt = `Eres un especialista en rehabilitacion fisica experto en pacientes diabeticos, incluyendo aquellos con pie diabetico o heridas activas.

Genera SOLO los ejercicios del dia "${day}" para un paciente con condicion: ${conditionNotes || 'sin condiciones especiales reportadas'}, objetivo: ${goal || 'salud general'}.

Reglas de seguridad OBLIGATORIAS:
- Si el paciente menciona herida, lesion, pie diabetico o problema en pies o piernas, NUNCA incluyas ejercicios de carga de peso, caminata o impacto en esa zona. Usa alternativas de bajo impacto.
- Si es dia de descanso, un solo ejercicio "Descanso" con nota breve.

Para cada ejercicio incluye "busqueda_video": una frase corta y especifica en español para buscar un video tutorial de ese ejercicio (ej. "sentadilla con silla técnica correcta"), NO la incluyas si el ejercicio es "Descanso".

Responde UNICAMENTE con un JSON valido de una sola linea, sin texto adicional, sin markdown:
{
  "ejercicios": [
    { "nombre": "nombre del ejercicio", "series_repeticiones": "ej. 3x12 o 20 minutos", "notas": "maximo 12 palabras", "busqueda_video": "frase de busqueda o null" }
  ]
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
        max_tokens: 900,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Genera los ejercicios de ${day}, solo el JSON en una sola linea.` }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Error al generar el dia' }), { status: 500 })
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
