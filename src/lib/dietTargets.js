export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export const DAY_THEMES = {
  Lunes: 'proteína principal: pollo o pavo, preparación casera mexicana',
  Martes: 'proteína principal: pescado, atún o camarón',
  Miércoles: 'proteína principal: huevo y/o leguminosas (sin carne roja este día)',
  Jueves: 'proteína principal: res o cerdo magro; si no come carne roja, usa leguminosas o pollo en corte distinto',
  Viernes: 'proteína principal: pollo o pavo, en platillo distinto al lunes',
  Sábado: 'proteína principal: pescado o atún, en platillo distinto al martes',
  Domingo: 'comida casera mexicana de domingo (sin repetir platillos de la semana)',
}

export const MEAL_ORDER = ['desayuno', 'colacion_manana', 'comida', 'colacion_tarde', 'cena']

export const MEAL_LABELS = {
  desayuno: 'Desayuno',
  colacion_manana: 'Colación de media mañana',
  colacion_tarde: 'Colación de media tarde',
  comida: 'Comida',
  cena: 'Cena',
}

export const SHOP_SECTIONS = [
  'Frutas',
  'Verduras y hortalizas',
  'Proteínas',
  'Lácteos',
  'Cereales y tubérculos',
  'Leguminosas',
  'Grasas y oleaginosas',
  'Abarrotes y otros',
]

export const DISCLAIMER =
  'Esto orienta; el tratamiento lo decide el Dr. Rogelio. El plan no sustituye una valoración médica presencial ni un plan de alimentación indicado en consulta.'

function stripAccents(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function calcAge(birthDate, ageYears) {
  if (ageYears) {
    const n = parseInt(ageYears, 10)
    if (n > 0 && n < 120) return n
  }
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
  return age > 0 && age < 120 ? age : null
}

export function hasDiabetes(profile) {
  const t = stripAccents(profile?.diabetes_type)
  return Boolean(t) && t !== 'ninguna' && t !== 'no' && t !== 'ninguno'
}

export function wantsWeightLoss(profile, goal) {
  const text = stripAccents(`${goal || ''} ${profile?.goal || ''}`)
  if (/bajar|perder|deficit|adelgazar|bajar de peso/.test(text)) return true
  const w = Number(profile?.current_weight)
  const g = Number(profile?.weight_goal_kg)
  return Boolean(w && g && g < w - 1)
}

export function calcDietTargets(profile = {}, goal = '') {
  const weight = Number(profile.current_weight) || null
  const height = Number(profile.height_cm) || null
  const age = calcAge(profile.birth_date, profile.age) || 40
  const sex = profile.sex
  const diabetes = hasDiabetes(profile)
  const renal = Boolean(profile.erc)
  const loss = wantsWeightLoss(profile, goal)

  let bmr = null
  if (weight && height) {
    if (sex === 'male') bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else if (sex === 'female') bmr = 10 * weight + 6.25 * height - 5 * age - 161
    else bmr = 10 * weight + 6.25 * height - 5 * age - 78
  }

  const activity = 1.3
  let kcal = bmr ? Math.round(bmr * activity) : diabetes ? 1800 : 2000
  if (loss) kcal = Math.round(kcal - 400)
  if (kcal < 1400) kcal = 1400
  if (kcal > 2600) kcal = 2600
  kcal = Math.round(kcal / 10) * 10

  let carbPct = diabetes ? 0.42 : 0.48
  let protPct = 0.22
  if (renal && weight) {
    const proteinKcal = Math.max(0.6, 0.8) * weight * 4
    protPct = Math.min(0.18, proteinKcal / kcal)
  }
  const fatPct = Math.max(0.25, 1 - carbPct - protPct)

  const carbohidratos_g = Math.round((kcal * carbPct) / 4)
  const proteina_g = Math.round((kcal * protPct) / 4)
  const grasas_g = Math.round((kcal * fatPct) / 9)
  const agua_ml = renal ? null : weight ? Math.round(Math.min(Math.max(weight * 32, 1800), 3000)) : 2000

  const parts = []
  parts.push(`Plan de 7 días, con cinco tiempos de comida y porciones en medidas caseras y en gramos.`)
  parts.push(`Meta aproximada: ${kcal} kcal al día (${carbohidratos_g} g de hidratos de carbono, ${proteina_g} g de proteína y ${grasas_g} g de grasa).`)
  if (diabetes) parts.push('Los hidratos de carbono se reparten en los cinco tiempos, con carga glucémica baja o moderada.')
  if (profile.hipertension) parts.push('Se limita la sal de mesa y los ultraprocesados, a favor de hierbas y especias.')
  if (renal) parts.push('Por el antecedente de enfermedad renal, las proteínas y el potasio se manejan con cautela; este plan debe confirmarse en consulta.')
  if (agua_ml) parts.push(`Hidratación sugerida: alrededor de ${(agua_ml / 1000).toFixed(1).replace(/\.0$/, '')} litros de agua al día, salvo otra indicación.`)

  return {
    calorias_diarias: kcal,
    carbohidratos_g,
    proteina_g,
    grasas_g,
    agua_ml,
    resumen: parts.join(' '),
  }
}

export function normalizeTipo(tipo, colacionIndex) {
  const t = stripAccents(tipo).replace(/\s+/g, '_')
  if (t.includes('desayuno')) return 'desayuno'
  if (t.includes('cena')) return 'cena'
  if (t.includes('comida') || t.includes('almuerzo')) return 'comida'
  if (t.includes('tarde') || t.includes('colacion_2') || t.includes('colacion2') || t.includes('media_tarde')) {
    return 'colacion_tarde'
  }
  if (t.includes('manana') || t.includes('colacion_1') || t.includes('colacion1') || t.includes('media_manana')) {
    return 'colacion_manana'
  }
  if (t.includes('colacion') || t.includes('snack') || t.includes('merienda')) {
    return colacionIndex === 0 ? 'colacion_manana' : 'colacion_tarde'
  }
  return t || 'comida'
}

export function normalizeDayMeals(comidas) {
  let colacionIndex = 0
  const seen = new Set()
  const list = []
  for (const c of comidas || []) {
    const tipo = normalizeTipo(c.tipo, colacionIndex)
    if (tipo === 'colacion_manana' || tipo === 'colacion_tarde') colacionIndex += 1
    if (seen.has(tipo)) continue
    seen.add(tipo)
    const calorias = num(c.calorias)
    const carbohidratos_g = num(c.carbohidratos_g)
    const proteina_g = num(c.proteina_g)
    const grasas_g = num(c.grasas_g)
    const ingredientes = Array.isArray(c.ingredientes) ? c.ingredientes.filter((i) => i && i.item) : []
    list.push({
      tipo,
      platillo: String(c.platillo || '').trim(),
      porcion: String(c.porcion || c.descripcion || '').trim(),
      ingredientes,
      calorias,
      carbohidratos_g,
      proteina_g,
      grasas_g,
      equivalentes: String(c.equivalentes || '').trim(),
      tip: String(c.tip || c.tips || '').trim(),
    })
  }
  list.sort((a, b) => MEAL_ORDER.indexOf(a.tipo) - MEAL_ORDER.indexOf(b.tipo))
  return list
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : 0
}

export function sumMacros(comidas) {
  return (comidas || []).reduce(
    (acc, c) => ({
      calorias: acc.calorias + num(c.calorias),
      carbohidratos_g: acc.carbohidratos_g + num(c.carbohidratos_g),
      proteina_g: acc.proteina_g + num(c.proteina_g),
      grasas_g: acc.grasas_g + num(c.grasas_g),
    }),
    { calorias: 0, carbohidratos_g: 0, proteina_g: 0, grasas_g: 0 }
  )
}

export function dishKey(name) {
  return stripAccents(name).replace(/[^a-z0-9]+/g, ' ').trim()
}

export function mainDishNames(comidas) {
  return (comidas || [])
    .filter((c) => c.tipo === 'desayuno' || c.tipo === 'comida' || c.tipo === 'cena')
    .map((c) => c.platillo)
    .filter(Boolean)
}

export function hasMealSet(comidas) {
  const types = new Set((comidas || []).map((c) => c.tipo))
  return MEAL_ORDER.every((t) => types.has(t))
}

function sectionOf(raw) {
  const s = stripAccents(raw?.seccion || '')
  const item = stripAccents(raw?.item || '')
  const text = `${s} ${item}`
  if (/fruta/.test(text)) return 'Frutas'
  if (/verdura|hortaliza|nopal|jitomate|tomate|lechuga|espinaca|brocoli|calabaza|pepino|zanahoria|chayote|ejote|chile|cebolla|ajo|cilantro|perejil|apio/.test(text)) {
    return 'Verduras y hortalizas'
  }
  if (/leche|yogur|yogurt|queso|lacteo/.test(text)) return 'Lácteos'
  if (/frijol|lenteja|garbanzo|haba|alubia|soya|legum/.test(text)) return 'Leguminosas'
  if (/aceite|aguacate|nuez|nues|almendra|cacahuate|semilla|aderezo|grasa|oliva/.test(text)) return 'Grasas y oleaginosas'
  if (/tortilla|arroz|avena|pan|pasta|elote|maiz|papa|camote|cereal|avena|amaranto|trigo|galleta/.test(text)) {
    return 'Cereales y tubérculos'
  }
  if (/pollo|pavo|res|cerdo|pescado|atun|huevo|carne|pechuga|bistec|filete|camar|sardina|prote/.test(text)) {
    return 'Proteínas'
  }
  if (s.includes('fruta')) return 'Frutas'
  if (s.includes('verdura')) return 'Verduras y hortalizas'
  if (s.includes('prote')) return 'Proteínas'
  if (s.includes('lact')) return 'Lácteos'
  if (s.includes('cereal') || s.includes('tuber')) return 'Cereales y tubérculos'
  if (s.includes('legum')) return 'Leguminosas'
  if (s.includes('grasa') || s.includes('oleag')) return 'Grasas y oleaginosas'
  return 'Abarrotes y otros'
}

export function buildShoppingList(dias) {
  const map = new Map()
  for (const dia of dias || []) {
    for (const comida of dia.comidas || []) {
      for (const ing of comida.ingredientes || []) {
        const item = String(ing.item || '').trim()
        if (!item) continue
        const section = sectionOf(ing)
        const key = `${section}::${dishKey(item)}`
        const medida = [ing.medida, ing.gramos ? `${ing.gramos} g` : '']
          .filter(Boolean)
          .join(' · ')
        const prev = map.get(key)
        if (!prev) {
          map.set(key, { seccion: section, item, medidas: medida ? [medida] : [] })
        } else if (medida && !prev.medidas.includes(medida) && prev.medidas.length < 4) {
          prev.medidas.push(medida)
        }
      }
    }
  }
  const groups = SHOP_SECTIONS.map((seccion) => ({
    seccion,
    items: [...map.values()]
      .filter((i) => i.seccion === seccion)
      .sort((a, b) => a.item.localeCompare(b.item, 'es'))
      .map((i) => ({
        item: i.item,
        detalle: i.medidas.join('; '),
      })),
  })).filter((g) => g.items.length > 0)
  return groups
}

export function buildRecommendations(profile = {}, targets = {}, goal = '') {
  const recs = []
  recs.push({
    titulo: 'Cómo usar este plan',
    texto:
      'Siga los cinco tiempos en el orden indicado. Las porciones están en medidas caseras (taza, pieza, cucharada) y en gramos, para que pueda servirlas en casa sin báscula de precisión. Si un día come fuera, elija el platillo más cercano y respete el tamaño de la porción.',
  })
  if (targets.agua_ml) {
    recs.push({
      titulo: 'Hidratación',
      texto: `Tome alrededor de ${(targets.agua_ml / 1000).toFixed(1).replace(/\.0$/, '')} litros de agua simple al día, repartidos desde la mañana. Evite jugos, refrescos y bebidas endulzadas. El café o el té sin azúcar pueden incluirse con moderación, si los tolera.`,
    })
  } else if (profile.erc) {
    recs.push({
      titulo: 'Hidratación',
      texto:
        'Con el antecedente de enfermedad renal, la cantidad de líquidos debe ajustarse en consulta. No aumente ni restrinja el agua por su cuenta.',
    })
  }
  if (hasDiabetes(profile)) {
    recs.push({
      titulo: 'Distribución de hidratos de carbono',
      texto:
        'No omita tiempos de comida ni concentre el pan, la tortilla o la fruta en una sola ingesta. Prefiera tortillas de maíz, avena y fruta entera, y acompáñelas siempre de proteína y fibra. Si se mide la glucosa, un momento útil es a las dos horas de la comida principal.',
    })
  }
  if (profile.hipertension) {
    recs.push({
      titulo: 'Cuidado de la presión',
      texto:
        'Cocine sin agregar sal en la mesa. Sazone con ajo, pimienta, limón, cilantro, perejil y orégano. Evite caldos en cubo, embutidos, conservas muy saladas y botanas.',
    })
  }
  if (profile.erc) {
    recs.push({
      titulo: 'Enfermedad renal',
      texto:
        'Este menú es una orientación general: limita porciones grandes de proteína y no abusa de frutas o verduras muy ricas en potasio. Debe confirmarse con el médico, porque las indicaciones de potasio, fósforo, proteína y líquidos son individuales.',
    })
  }
  recs.push({
    titulo: 'Preparación sencilla',
    texto:
      'Prepare el día anterior lo que se pueda: frijoles, pollo deshebrado, verduras picadas o arrocito integral. Cocine a la plancha, al horno, al vapor o en guisado ligero; evite la fritura habitual. Use aceite en cucharaditas, no a chorro.',
  })
  recs.push({
    titulo: 'Equivalencias útiles',
    texto:
      '1 tortilla de maíz (30 g) equivale, en hidratos, a 1/3 de taza de arroz cocido o 1/2 taza de papa cocida. 30 g de queso panela pueden cambiarse por 3/4 de taza de yogurt natural sin azúcar. 1 pieza de fruta mediana equivale a 1 taza de fruta picada. Si no hay el pescado del día, use atún en agua o otra pieza blanca similar, en la misma porción.',
  })
  if (profile.allergies) {
    recs.push({
      titulo: 'Alergias e intolerancias',
      texto: `Se tomó en cuenta lo que usted señaló: ${profile.allergies}. Si aparece un ingrediente que no tolera, use la equivalencia del platillo o sustitúyalo por uno de la misma sección.`,
    })
  }
  recs.push({
    titulo: 'Cuándo consultar',
    texto:
      'Acuda a consulta o escriba por WhatsApp si presenta malestar persistente, cifras de glucosa o presión fuera de su rango habitual, o si necesita ajustar el plan a un estudio reciente. Esto orienta; el tratamiento lo decide el Dr. Rogelio.',
  })
  return recs
}
