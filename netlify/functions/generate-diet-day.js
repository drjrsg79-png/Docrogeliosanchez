import { rateLimitAndSize } from './_shared/guard.mjs'

const SEGMENTS = {
  manana: {
    tipos: ['desayuno', 'colacion_manana'],
    count: 2,
    label: 'desayuno y colación de media mañana',
  },
  tarde: {
    tipos: ['comida', 'colacion_tarde', 'cena'],
    count: 3,
    label: 'comida, colación de media tarde y cena',
  },
  dia: {
    tipos: ['desayuno', 'colacion_manana', 'comida', 'colacion_tarde', 'cena'],
    count: 5,
    label: 'los cinco tiempos del día',
  },
}

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
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1')
  try {
    return JSON.parse(cleaned)
  } catch {
    let repaired = cleaned.replace(/,\s*$/, '')
    // If truncated mid-string, close the string before closing brackets.
    const quotes = (repaired.match(/"/g) || []).length
    if (quotes % 2 === 1) repaired += '"'
    const openSq = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length
    const openCu = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length
    repaired += ']'.repeat(Math.max(0, openSq)) + '}'.repeat(Math.max(0, openCu))
    repaired = repaired.replace(/,\s*([\]}])/g, '$1')
    return JSON.parse(repaired)
  }
}

function expand(parsed) {
  const raw = parsed.comidas || parsed.c || []
  return {
    comidas: raw.map((c) => {
      const ings = c.ingredientes || c.i || []
      return {
        tipo: c.tipo || c.t,
        platillo: c.platillo || c.p,
        porcion: c.porcion || c.po,
        ingredientes: ings.map((ing) => (
          Array.isArray(ing)
            ? { item: ing[0], medida: ing[1], gramos: ing[2], seccion: ing[3] }
            : ing
        )),
        calorias: c.calorias ?? c.k,
        carbohidratos_g: c.carbohidratos_g ?? c.h,
        proteina_g: c.proteina_g ?? c.pr,
        grasas_g: c.grasas_g ?? c.g,
        equivalentes: c.equivalentes || c.e || '',
        tip: c.tip || c.s || '',
      }
    }),
  }
}

export default async function handler(request) {
  try {
    const limited = rateLimitAndSize(request, { maxPerMin: 40, maxBytes: 80000 })
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
      segment = 'dia',
    } = body

    const seg = SEGMENTS[segment] || SEGMENTS.dia
    const kcal = caloriasDiarias || 1800
    const hc = macros?.carbohidratos_g || Math.round((kcal * 0.45) / 4)
    const prot = macros?.proteina_g || Math.round((kcal * 0.22) / 4)
    const fat = macros?.grasas_g || Math.round((kcal * 0.33) / 9)
    const tieneDiabetes = diabetesType && diabetesType !== 'ninguna'
    const yaUsados = Array.isArray(usedDishes) && usedDishes.length
      ? `NO repitas estos platillos ya usados: ${usedDishes.join('; ')}.`
      : ''

    const condiciones = []
    if (tieneDiabetes) {
      condiciones.push(`Diabetes: ${diabetesType}. Carga glucémica baja o moderada; reparte hidratos; no jugos ni harinas refinadas; tortilla de maíz, avena y fruta entera.`)
    }
    if (hipertension) condiciones.push('Hipertensión: sin sal de mesa ni embutidos; hierbas, ajo y limón.')
    if (erc) condiciones.push('Enfermedad renal crónica: proteína moderada; no abusar de plátano, naranja, jitomate o papa; sin sal añadida.')
    if (allergies) condiciones.push(`Excluir: ${allergies}.`)
    if (preferences) condiciones.push(`Preferencias: ${preferences}.`)
    if (budget === 'accesible') condiciones.push('Ingredientes de mercado, de temporada, accesibles.')
    if (budget === 'moderado') condiciones.push('Ingredientes de supermercado mexicano, sin lujos.')

    const tiposList = seg.tipos.join(', ')
    const systemPrompt = `Eres un médico internista y nutriólogo clínico que elabora parte del menú de un día para el consultorio del Dr. José Rogelio Sánchez García, en México. No menciones inteligencia artificial ni que eres un modelo. Responde ÚNICAMENTE un JSON compacto, sin markdown.

Día: "${day}". Bloque: ${seg.label}. Tema: ${theme || 'comida casera mexicana'}.
Objetivo: ${goal || 'alimentación saludable'}. Peso: ${currentWeight || 's/d'} kg. Estatura: ${heightCm || 's/d'} cm.
Meta del DÍA COMPLETO (5 tiempos): ${kcal} kcal, ${hc} g HC, ${prot} g prot, ${fat} g grasa. Este bloque debe llevar una parte proporcional de esa meta.
${condiciones.join('\n')}
${yaUsados}

Reglas: exactamente ${seg.count} tiempos, en este orden: ${tiposList}. Platillos mexicanos caseros, distintos a los ya usados. Porción en medida casera Y gramos. Máximo 5 ingredientes por comida. "seccion" una de: Frutas; Verduras y hortalizas; Proteínas; Lácteos; Cereales y tubérculos; Leguminosas; Grasas y oleaginosas; Abarrotes y otros. No pongas precios ni marcas. Sé muy breve.

Forma: {"c":[{"t":"desayuno","p":"nombre","po":"medidas y g","i":[["item","1 taza",150,"Verduras y hortalizas"]],"k":0,"h":0,"pr":0,"g":0,"e":"equivalencia breve","s":"preparación breve"}]}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 2000,
        thinking: { type: 'disabled' },
        system: systemPrompt,
        messages: [{ role: 'user', content: `JSON compacto de ${day} (${seg.label}), forma {"c":[...]}` }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.log('anthropic_error', response.status, data?.error?.type || '')
      return json({ error: data.error?.message || 'Error al generar el día' }, 500)
    }

    const textContent = data.content?.find((c) => c.type === 'text')?.text
      || data.content?.map((c) => c.text).filter(Boolean).join('\n')
      || ''
    const contentTypes = (data.content || []).map((c) => c.type)
    console.log('diet_day', day, segment, 'stop', data.stop_reason, 'chars', textContent.length, 'types', contentTypes)

    let parsed
    try {
      parsed = expand(extractJson(textContent))
    } catch (err) {
      console.log('parse_fail', err.message, textContent.slice(0, 240))
      return json({ error: 'No se pudo interpretar el menú del día. Intenta de nuevo.' }, 500)
    }
    if (!Array.isArray(parsed.comidas) || parsed.comidas.length < seg.count) {
      return json({ error: 'El menú del día llegó incompleto. Intenta de nuevo.' }, 500)
    }

    return json(parsed)
  } catch (err) {
    console.log('diet_day_error', err.message)
    return json({ error: err.message || 'Error interno' }, 500)
  }
}
