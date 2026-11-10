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
  if (first === -1) throw new Error('sin objeto')
  cleaned = cleaned.slice(first)
  try {
    return JSON.parse(cleaned)
  } catch {
    // Close a truncated object/array enough to parse a complete set of meals if possible.
    let repaired = cleaned.replace(/,\s*$/, '')
    const openSq = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length
    const openCu = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length
    repaired += ']'.repeat(Math.max(0, openSq)) + '}'.repeat(Math.max(0, openCu))
    return JSON.parse(repaired)
  }
}

function expand(parsed) {
  const raw = parsed.comidas || parsed.c || []
  const comidas = raw.map((c) => {
    const ings = c.ingredientes || c.i || []
    const ingredientes = ings.map((ing) => {
      if (Array.isArray(ing)) {
        return { item: ing[0], medida: ing[1], gramos: ing[2], seccion: ing[3] }
      }
      return ing
    })
    return {
      tipo: c.tipo || c.t,
      platillo: c.platillo || c.p,
      porcion: c.porcion || c.po,
      ingredientes,
      calorias: c.calorias ?? c.k,
      carbohidratos_g: c.carbohidratos_g ?? c.h,
      proteina_g: c.proteina_g ?? c.pr,
      grasas_g: c.grasas_g ?? c.g,
      equivalentes: c.equivalentes || c.e || '',
      tip: c.tip || c.s || '',
    }
  })
  return { comidas }
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
      condiciones.push(`Diabetes: ${diabetesType}. Carga glucémica baja o moderada; reparte los hidratos en los 5 tiempos; no jugos ni harinas refinadas; preferir tortilla de maíz, avena y fruta entera.`)
    }
    if (hipertension) condiciones.push('Hipertensión: sin sal de mesa ni embutidos; hierbas, ajo y limón.')
    if (erc) condiciones.push('Enfermedad renal crónica: proteína moderada; no abusar de plátano, naranja, jitomate o papa; sin sal añadida.')
    if (allergies) condiciones.push(`Excluir por completo: ${allergies}.`)
    if (preferences) condiciones.push(`Preferencias: ${preferences}.`)
    if (budget === 'accesible') condiciones.push('Ingredientes de mercado o tianguis, de temporada, accesibles.')
    if (budget === 'moderado') condiciones.push('Ingredientes de supermercado mexicano, sin lujos.')

    const systemPrompt = `Eres un médico internista y nutriólogo clínico que elabora un menú de un solo día para el consultorio del Dr. José Rogelio Sánchez García, en México. No menciones inteligencia artificial ni que eres un modelo. Responde ÚNICAMENTE un JSON compacto, sin markdown.

Día: "${day}". Tema: ${theme || 'comida casera mexicana variada'}.
Objetivo: ${goal || 'alimentación saludable'}. Peso: ${currentWeight || 's/d'} kg. Estatura: ${heightCm || 's/d'} cm.
Meta: ${kcal} kcal (±8 %), ${hc} g HC, ${prot} g prot, ${fat} g grasa.
${condiciones.join('\n')}
${yaUsados}

Reglas: exactamente 5 tiempos en este orden: desayuno, colacion_manana, comida, colacion_tarde, cena. Platillos mexicanos caseros y distintos a los ya usados. Porción en medida casera Y gramos. Máximo 5 ingredientes por comida. "seccion" una de: Frutas; Verduras y hortalizas; Proteínas; Lácteos; Cereales y tubérculos; Leguminosas; Grasas y oleaginosas; Abarrotes y otros. No pongas precios ni marcas.

Usa esta forma corta:
{"c":[{"t":"desayuno","p":"nombre","po":"medidas y gramos","i":[["item","1 taza",150,"Verduras y hortalizas"]],"k":0,"h":0,"pr":0,"g":0,"e":"equivalencia breve","s":"preparación breve"}]}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 2500,
        system: systemPrompt,
        messages: [{ role: 'user', content: `JSON compacto de ${day}, 5 tiempos, forma corta {"c":[...]}` }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return json({ error: data.error?.message || 'Error al generar el día' }, 500)
    }

    const textContent = data.content?.find((c) => c.type === 'text')?.text || ''
    let parsed
    try {
      parsed = expand(extractJson(textContent))
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
