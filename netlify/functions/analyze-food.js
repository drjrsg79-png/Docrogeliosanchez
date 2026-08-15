export default async function handler(request) {
  try {
    const body = await request.json()
    const { imageBase64, mediaType, diabetesType } = body

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'Falta la imagen' }), { status: 400 })
    }

    const systemPrompt = `Eres un endocrinólogo y nutriólogo clínico experto. Analiza la foto de un alimento o platillo para un paciente${diabetesType ? ` con diabetes tipo ${diabetesType}` : ' con diabetes'}.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, con esta forma exacta:
{
  "detected_food": "nombre breve del alimento o platillo detectado",
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
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType || 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: 'Analiza este alimento y responde solo con el JSON solicitado.',
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Error al analizar la imagen' }), { status: 500 })
    }

    const textContent = data.content?.find((c) => c.type === 'text')?.text || ''
    const cleaned = textContent.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return new Response(JSON.stringify({ error: 'No se pudo interpretar la respuesta del análisis' }), { status: 500 })
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
