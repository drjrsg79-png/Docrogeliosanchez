export default async function handler(request) {
  try {
    const body = await request.json()
    const { conditionNotes, goal } = body

    const systemPrompt = `Eres un especialista en rehabilitación física y entrenador certificado, experto en pacientes diabéticos, incluyendo aquellos con pie diabético o heridas activas.

Genera una rutina de ejercicio semanal (7 días) segura y apropiada, considerando estas condiciones del paciente: ${conditionNotes || 'sin condiciones especiales reportadas'}.
Objetivo del paciente: ${goal || 'salud general'}.

Reglas de seguridad OBLIGATORIAS:
- Si el paciente menciona herida, lesión, pie diabético, o cualquier problema en pies o piernas, NUNCA incluyas ejercicios de carga de peso, caminata, o impacto en esa zona. Usa alternativas de bajo impacto (movilidad de tren superior, ejercicios sentado, respiración).
- Incluye días de descanso.

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin markdown, con esta forma exacta:
{
  "resumen": "explicacion breve de 2-3 frases sobre el enfoque de esta rutina y por que es apropiada para este paciente",
  "dias": [
    {
      "dia": "Lunes",
      "ejercicios": [
        { "nombre": "nombre del ejercicio", "series_repeticiones": "ej. 3x12 o 20 minutos", "notas": "indicacion breve de tecnica o precaucion" }
      ]
    }
  ]
}
El array "dias" debe tener exactamente 7 objetos, uno por cada dia de la semana empezando en Lunes. Los dias de descanso deben tener un solo ejercicio con nombre "Descanso" y notas explicando por que.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Genera la rutina semanal solicitada, solo el JSON.' }],
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
