export default async function handler(request) {
  try {
    const body = await request.json()
    const { goal, diabetesType, currentWeight, heightCm, weightGoal } = body

    const systemPrompt = `Eres un endocrinologo y nutriologo clinico experto en el manejo dietetico de pacientes diabeticos.

Paciente: tipo de diabetes ${diabetesType || 'no especificado'}, objetivo: ${goal || 'control glucemico'}, peso actual ${currentWeight || 'no especificado'} kg, estatura ${heightCm || 'no especificado'} cm, peso meta ${weightGoal || 'no especificado'} kg.

Responde UNICAMENTE con un JSON valido de una sola linea, sin saltos de linea dentro de los textos, sin texto adicional, sin markdown:
{
  "resumen": "explicacion breve en una sola linea, maximo 2 frases",
  "calorias_diarias": numero entero,
  "carbohidratos_g": numero entero,
  "proteina_g": numero entero,
  "grasas_g": numero entero
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
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Genera el resumen y macros diarios, solo el JSON en una sola linea.' }],
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

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      return new Response(JSON.stringify({ error: 'No se pudo interpretar el resumen generado. Intenta de nuevo.' }), { status: 500 })
    }

    return new Response(JSON.stringify(parsed), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
