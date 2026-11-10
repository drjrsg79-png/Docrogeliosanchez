import { rateLimitAndSize } from './_shared/guard.mjs'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function extractJson(text) {
  let cleaned = String(text || '').replace(/```json|```/g, '').trim()
  cleaned = cleaned.replace(/[\u0000-\u001F]+/g, ' ')
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first !== -1 && last !== -1) cleaned = cleaned.slice(first, last + 1)
  return JSON.parse(cleaned)
}

export default async function handler(request) {
  try {
    const limited = rateLimitAndSize(request, { maxPerMin: 30, maxBytes: 80000 })
    if (limited) return limited
    const body = await request.json()
    const {
      day,
      theme,
      goal,
      diabetesType,
      hipertension,
      erc,
      allergies,
      preferences,
      budget,
      currentWeight,
      heightCm,
      caloriasDiarias,
      macros,
      usedDishes,
    } = body

    const kcal = caloriasDiarias || 1800
    const hc = macros?.carbohidratos_g || Math.round((kcal * 0.45) / 4)
    const prot = macros?.proteina_g || Math.round((kcal * 0.22) / 4)
    const fat = macros?.grasas_g || Math.round((kcal * 0.33) / 9)
    const tieneDiabetes = diabetesType && diabetesType !== 'ninguna'
    const yaUsados = Array.isArray(usedDishes) && usedDishes.length
      ? `NO repitas estos platillos ya usados en la semana: ${usedDishes.join('; ')}.`
      : ''

    const condiciones = []
    if (tieneDiabetes) {
      condiciones.push(`Diabetes: ${diabetesType}. Carga glucémica baja o moderada; reparte los hidratos de carbono en los 5 tiempos; no jugos ni harinas refinadas; preferir tortilla de maíz, avena y fruta entera.`)
    }
    if (hipertension) condiciones.push('Hipertensión: sin sal de mesa, sin embutidos ni caldos en cubo; sazonar con hierbas, ajo y limón.')
    if (erc) condiciones.push('Enfermedad renal crónica: porciones moderadas de proteína; no abusar de plátano, naranja, jitomate, papa o caldos concentrados; sin sal añadida.')
    if (allergies) condiciones.push(`Alergias o intolerancias (excluir por completo): ${allergies}.`)
    if (preferences) condiciones.push(`Preferencias: ${preferences}.`)
    if (budget === 'accesible') condiciones.push('Presupuesto accesible: ingredientes de mercado o tianguis, de temporada, sin productos importados ni costosos.')
    if (budget === 'moderado') condiciones.push('Presupuesto moderado: ingredientes accesibles en supermercado mexicano, sin lujos.')

    const systemPrompt = `Eres un médico internista y nutriólogo clínico que elabora un menú de un solo día para el consultorio del Dr. José Rogelio Sánchez García, en México. No menciones inteligencia artificial ni que eres un modelo. Responde ÚNICAMENTE un JSON válido, compacto, sin markdown y sin texto alrededor.

Genera SOLO el día "${day}". Tema de variedad: ${theme || 'comida casera mexicana variada'}.
Objetivo del paciente: ${goal || 'alimentación saludable'}.
Peso: ${currentWeight || 'no especificado'} kg. Estatura: ${heightCm || 'no especificado'} cm.
Meta del día: ${kcal} kcal (±8 %), ${hc} g de hidratos, ${prot} g de proteína, ${fat} g de grasa.
${condiciones.join('\n')}
${yaUsados}

Reglas:
- Exactamente 5 tiempos, en este orden: desayuno, colacion_manana, comida, colacion_tarde, cena.
- Platillos mexicanos, caseros, apetecibles, con ingredientes fáciles de conseguir.
- Cada platillo debe ser distinto a los de días previos. No repitas el platillo principal (desayuno, comida, cena).
- Porción en medida casera Y en gramos (ej. "1 taza (150 g) de nopal + 2 huevos + 1 tortilla de maíz (30 g)").
- Máximo 6 ingredientes por comida. "seccion" debe ser una de: Frutas; Verduras y hortalizas; Proteínas; Lácteos; Cereales y tubérculos; Leguminosas; Grasas y oleaginosas; Abarrotes y otros.
- "equivalentes": una sustitución práctica.
- "tip": una frase breve de preparación (sin freír de más).
- No pongas precios ni menciones marcas caras.
- No inventes suplementos ni cambies medicamentos.

Forma exacta:
{
  "comidas": [
    {
      "tipo": "desayuno",
      "platillo": "nombre del platillo",
      "porcion": "medidas caseras y gramos",
      "ingredientes": [
        { "item": "nombre", "medida": "1 taza", "gramos": 150, "seccion": "Verduras y hortalizas" }
      ],
      "calorias": 0,
      "carbohidratos_g": 0,
      "proteina_g": 0,
      "grasas_g": 0,
      "equivalentes": "sustitución breve",
      "tip": "preparación breve"
    }
  ]
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
        max_tokens: 1800,
        system: systemPrompt,
        messages: [{ role: 'user', content: `JSON compacto del menú de ${day}, 5 tiempos, solo el objeto.` }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return json({ error: data.error?.message || 'Error al generar el día' }, 500)
    }

    const textContent = data.content?.find((c) => c.type === 'text')?.text || ''
    let parsed
    try {
      parsed = extractJson(textContent)
    } catch {
      return json({ error: 'No se pudo interpretar el menú del día. Intenta de nuevo.' }, 500)
    }
    if (!Array.isArray(parsed.comidas) || parsed.comidas.length < 5) {
      return json({ error: 'El menú del día llegó incompleto. Intenta de nuevo.' }, 500)
    }

    return json(parsed)
  } catch (err) {
    return json({ error: err.message || 'Error interno' }, 500)
  }
}
