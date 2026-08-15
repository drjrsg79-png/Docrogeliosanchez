export default async function handler(request) {
  try {
    const body = await request.json()
    const { day, goal, diabetesType, caloriasDiarias } = body

    const systemPrompt = `Eres un endocrinologo y nutriologo clinico experto en pacientes diabeticos.

Genera SOLO las comidas del dia "${day}" para un paciente con diabetes tipo ${diabetesType || 'no especificado'}, objetivo: ${goal || 'control glucemico'}, meta de ${caloriasDiarias || 1800} kcal/dia. Usa platillos con ingredientes accesibles en Mexico, bajo indice glucemico. Cada "descripcion" maximo 8 palabras.

Responde UNICAMENTE con un JSON valido, sin texto adicional, sin markdown:
{
  "comidas": [
    { "tipo": "desayuno", "platillo": "nombre corto", "descripcion": "maximo 8 palabras", "calorias": numero, "carbohidratos_g": numero, "proteina_g": numero, "grasas_g": numero }
  ]
}
El array debe tener exactamente 4 comidas: desayuno, comida, cena, colacion.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 700,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Genera las comidas de ${day}, solo el JSON.` }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Error al generar el dia' }), { status: 500 })
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
