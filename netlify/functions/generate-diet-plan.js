export default async function handler(request) {
  try {
    const body = await request.json()
    const { goal, diabetesType, currentWeight, heightCm, weightGoal } = body

    const systemPrompt = `Eres un endocrinologo y nutriologo clinico experto en el manejo dietetico de pacientes diabeticos.

Genera un plan de alimentacion semanal (7 dias) para un paciente con estas caracteristicas:
- Tipo de diabetes: ${diabetesType || 'no especificado'}
- Objetivo: ${goal || 'control glucemico'}
- Peso actual: ${currentWeight || 'no especificado'} kg
- Estatura: ${heightCm || 'no especificado'} cm
- Peso meta: ${weightGoal || 'no especificado'} kg

Usa platillos con ingredientes accesibles en Mexico. Prioriza bajo indice glucemico, control de porciones y variedad.

Responde UNICAMENTE con un JSON valido, sin texto adicional, sin markdown, con esta forma exacta:
{
  "resumen": "explicacion breve de 2-3 frases sobre el enfoque nutricional de este plan",
  "calorias_diarias": numero entero,
  "carbohidratos_g": numero entero,
  "proteina_g": numero entero,
  "grasas_g": numero entero,
  "dias": [
    {
      "dia": "Lunes",
      "comidas": [
        { "tipo": "desayuno", "platillo": "nombre del platillo", "descripcion": "breve descripcion o ingredientes", "calorias": numero, "carbohidratos_g": numero, "proteina_g": numero, "grasas_g": numero }
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
        messages: [{ role: 'user', content: 'Genera el plan semanal solicitado, solo el JSON.' }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Error al generar el plan' }), { status: 500 })
    }

    const textContent = data.content?.find((c) => c.type === 'text')?.text || ''
    const cleaned = textContent.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return new Response(JSON.stringify({ error: 'No se pudo interpretar el plan generado' }), { status: 500 })
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
