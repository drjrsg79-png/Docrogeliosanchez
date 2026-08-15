export default async function handler(request) {
  try {
    const body = await request.json()
    const { goal, diabetesType, currentWeight, heightCm, weightGoal } = body

    const systemPrompt = `Eres un endocrinologo y nutriologo clinico experto en el manejo dietetico de pacientes diabeticos.

Paciente: tipo de diabetes ${diabetesType || 'no especificado'}, objetivo: ${goal || 'control glucemico'}, peso actual ${currentWeight || 'no especificado'} kg, estatura ${heightCm || 'no especificado'} cm, peso meta ${weightGoal || 'no especificado'} kg.

Responde UNICAMENTE con un JSON valido, sin texto adicional, sin markdown:
{
  "resumen": "explicacion breve, maximo 2 frases",
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
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Genera el resumen y macros diarios, solo el JSON.' }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Error al generar el resumen' }), { status: 500 })
    }

    const textContent = data.content?.find((c) => c.type === 'text')?.text || ''
    let cleaned = textContent.replace(/```json|```/g, '').trim()
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1) cleaned = cleaned.slice(firstBrace, lastBrace + 1)

    const parsed = JSON.parse(cleaned)
    return new Response(JSON.stringify(parsed), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
