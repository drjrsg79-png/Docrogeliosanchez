export default async function handler(request) {
  try {
    const body = await request.json()
    const { conditionNotes, goal } = body

    const systemPrompt = `Eres un especialista en rehabilitacion fisica y entrenador certificado, experto en pacientes diabeticos, incluyendo aquellos con pie diabetico o heridas activas.

Genera una rutina de ejercicio semanal (7 dias) segura y apropiada, considerando estas condiciones del paciente: ${conditionNotes || 'sin condiciones especiales reportadas'}.
Objetivo del paciente: ${goal || 'salud general'}.

Reglas de seguridad OBLIGATORIAS:
- Si el paciente menciona herida, lesion, pie diabetico, o cualquier problema en pies o piernas, NUNCA incluyas ejercicios de carga de peso, caminata, o impacto en esa zona. Usa alternativas de bajo impacto.
- Incluye dias de descanso.

IMPORTANTE: se breve. Las "notas" deben tener MAXIMO 12 palabras. El "resumen" debe tener MAXIMO 2 frases cortas.

Responde UNICAMENTE con un JSON valido, sin texto adicional, sin markdown, con esta forma exacta:
{
  "resumen": "explicacion muy breve, maximo 2 frases",
  "dias": [
    {
      "dia": "Lunes",
      "ejercicios": [
        { "nombre": "nombre del ejercicio", "series_repeticiones": "ej. 3x12 o 20 minutos", "notas": "maximo 12 palabras" }
      ]
    }
  ]
}
El array "dias" debe tener exactamente 7 objetos, uno por cada dia empezando en Lunes. Dias de descanso: un solo ejercicio "Descanso" con nota breve. Se conciso para responder rapido.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Genera la rutina semanal solicitada, solo el JSON, se breve y conciso.' }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Error al generar la rutina' }), { status: 500 })
    }

    const textContent = data.content?.find((c) => c.type === 'text')?.text || ''
    const cleaned = textContent.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return new Response(JSON.stringify({ error: 'No se pudo interpretar la rutina generada' }), { status: 500 })
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
