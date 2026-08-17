export default async function handler(request) {
  try {
    const body = await request.json()
    const { foodName, diabetesType } = body

    if (!foodName) {
      return new Response(JSON.stringify({ error: 'Falta la descripcion del alimento' }), { status: 400 })
    }

    const systemPrompt = `Eres un endocrinologo y nutriologo clinico experto. Estima calorias y macronutrientes para el siguiente alimento o platillo descrito por un paciente${diabetesType && diabetesType !== 'ninguna' ? ` con diabetes tipo ${diabetesType}` : ''}: "${foodName}".

Usa tu mejor estimacion basada en porciones tipicas si el paciente no especifico cantidad exacta.

Responde UNICAMENTE con un objeto JSON valido, sin texto adicional, sin markdown, con esta forma exacta:
{
  "estimated_calories": numero entero de calorias estimadas,
  "carbs_g": numero de gramos de carbohidratos estimados,
  "protein_g": numero de gramos de proteina estimados,
  "fat_g": numero de gramos de grasa estimados,
  "suitable": true o false segun si es una buena opcion para un paciente diabetico,
  "reasoning": "explicacion breve y clara, en 2-3 frases, de por que si o por que no conviene comer esto, mencionando el impacto glucemico esperado"
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
        max_tokens: 600,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: 'Estima los macronutrientes de este alimento y responde solo con el JSON solicitado.',
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Error al estimar el alimento' }), { status: 500 })
    }

    const textContent = data.content?.find((c) => c.type === 'text')?.text || ''
    const cleaned = textContent.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return new Response(JSON.stringify({ error: 'No se pudo interpretar la estimacion' }), { status: 500 })
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
