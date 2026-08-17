export default async function handler(request) {
  try {
    const body = await request.json()
    const { day, goal, diabetesType, caloriasDiarias } = body

    const tieneDiabetes = diabetesType && diabetesType !== 'ninguna'

    const systemPrompt = tieneDiabetes
      ? `Eres un endocrinologo y nutriologo clinico experto en pacientes diabeticos.

Genera SOLO las comidas del dia "${day}" para un paciente con diabetes tipo ${diabetesType}, objetivo: ${goal || 'control glucemico'}, meta de ${caloriasDiarias || 1800} kcal/dia. Usa platillos con ingredientes accesibles en Mexico, bajo indice glucemico. Cada "descripcion" maximo 8 palabras, en una sola linea sin saltos de linea.

Responde UNICAMENTE con un JSON valido de una sola linea, sin texto adicional, sin markdown:
{
  "comidas": [
    { "tipo": "desayuno", "platillo": "nombre corto", "descripcion": "maximo 8 palabras", "calorias": numero, "carbohidratos_g": numero, "proteina_g": numero, "grasas_g": numero }
  ]
}
El array debe tener exactamente 4 comidas: desayuno, comida, cena, colacion.`
      : `Eres un internista y nutriologo clinico experto en alimentacion saludable y manejo de peso.

Genera SOLO las comidas del dia "${day}" para un paciente sin diabetes, objetivo: ${goal || 'alimentacion saludable'}, meta de ${caloriasDiarias || 2000} kcal/dia. Usa platillos ricos, variados y apetecibles, con ingredientes accesibles en Mexico. Cada "descripcion" maximo 8 palabras, en una sola linea sin saltos de linea.

Responde UNICAMENTE con un JSON valido de una sola linea, sin texto adicional, sin markdown:
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
        max_tokens: 900,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Genera las comidas de ${day}, solo el JSON en una sola linea.` }],
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

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      return new Response(JSON.stringify({ error: `No se pudo interpretar el dia generado.` }), { status: 500 })
    }

    return new Response(JSON.stringify(parsed), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
