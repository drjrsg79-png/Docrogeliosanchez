export default async function handler(request) {
  try {
    const body = await request.json()
    const { goal, diabetesType, currentWeight, heightCm, weightGoal } = body

    const tieneDiabetes = diabetesType && diabetesType !== 'ninguna'

    const enfoqueClinico = tieneDiabetes
      ? `Eres un endocrinologo y nutriologo clinico experto en el manejo dietetico de pacientes diabeticos.

Genera un plan de alimentacion semanal (7 dias) para un paciente con estas caracteristicas:
- Tipo de diabetes: ${diabetesType}
- Objetivo: ${goal || 'control glucemico'}
- Peso actual: ${currentWeight || 'no especificado'} kg
- Estatura: ${heightCm || 'no especificado'} cm
- Peso meta: ${weightGoal || 'no especificado'} kg

Usa platillos con ingredientes accesibles en Mexico. Prioriza bajo indice glucemico, control de porciones y variedad.`
      : `Eres un internista y nutriologo clinico experto en alimentacion saludable, actividad fisica y manejo de peso.

Genera un plan de alimentacion semanal (7 dias) rico y variado para un paciente sin diabetes, con estas caracteristicas:
- Objetivo: ${goal || 'alimentacion saludable'}
- Peso actual: ${currentWeight || 'no especificado'} kg
- Estatura: ${heightCm || 'no especificado'} cm
- Peso meta: ${weightGoal || 'no especificado'} kg

Usa platillos ricos, variados y apetecibles, con ingredientes accesibles en Mexico. Prioriza balance nutricional, control de porciones acorde al objetivo, y que sea disfrutable de seguir (no restrictivo ni aburrido).`

    const systemPrompt = `${enfoqueClinico}

IMPORTANTE: se breve. Cada "descripcion" debe tener MAXIMO 8 palabras. El "resumen" general debe tener MAXIMO 2 frases cortas. No agregues texto antes ni despues del JSON, ni marques con backticks.

Responde UNICAMENTE con un JSON valido con esta forma exacta:
{
  "resumen": "explicacion muy breve, maximo 2 frases",
  "calorias_diarias": numero entero,
  "carbohidratos_g": numero entero,
  "proteina_g": numero entero,
  "grasas_g": numero entero,
  "dias": [
    {
      "dia": "Lunes",
      "comidas": [
        { "tipo": "desayuno", "platillo": "nombre corto", "descripcion": "maximo 8 palabras", "calorias": numero, "carbohidratos_g": numero, "proteina_g": numero, "grasas_g": numero }
      ]
    }
  ]
}
El array "dias" debe tener 7 objetos (Lunes a Domingo), cada uno con 4 comidas: desayuno, comida, cena y una colacion.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Genera el plan semanal solicitado, solo el JSON, se breve y conciso.' }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Error al generar el plan' }), { status: 500 })
    }

    const textContent = data.content?.find((c) => c.type === 'text')?.text || ''
    let cleaned = textContent.replace(/```json|```/g, '').trim()

    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1)
    }

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      return new Response(JSON.stringify({
        error: 'No se pudo interpretar el plan generado',
        stopReason: data.stop_reason,
        rawPreview: cleaned.slice(0, 300),
      }), { status: 500 })
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
