import jsPDF from 'jspdf'
import { AGENDA_URL, CLINIC_NAME, DOCTOR_DIET_LINE, WHATSAPP_DISPLAY } from './clinic'
import { DISCLAIMER, MEAL_LABELS, MEAL_ORDER, sumMacros } from './dietTargets'

const TEAL = [15, 76, 92]
const TEAL_DARK = [10, 56, 68]
const TEXT = [28, 43, 51]
const MUTED = [92, 107, 115]
const LINE = [221, 227, 230]
const CREAM = [232, 241, 243]
const WHITE = [255, 255, 255]
const PAGE_W = 210
const PAGE_H = 297
const M = 16
const CONTENT_W = PAGE_W - M * 2

function setFont(doc, style, size) {
  doc.setFont('helvetica', style)
  doc.setFontSize(size)
}

function addInnerHeader(doc) {
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, PAGE_W, 18, 'F')
  setFont(doc, 'normal', 8)
  doc.setTextColor(...WHITE)
  doc.text(DOCTOR_DIET_LINE, PAGE_W / 2, 11, { align: 'center', maxWidth: CONTENT_W })
}

function addFooter(doc) {
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.3)
    doc.line(M, PAGE_H - 16, PAGE_W - M, PAGE_H - 16)
    setFont(doc, 'normal', 7.5)
    doc.setTextColor(...TEAL)
    doc.text(`WhatsApp ${WHATSAPP_DISPLAY}  ·  miadmon.com/agendar`, M, PAGE_H - 11)
    doc.setTextColor(...MUTED)
    doc.text(`${i} / ${total}`, PAGE_W - M, PAGE_H - 11, { align: 'right' })
    setFont(doc, 'italic', 6.5)
    doc.text(DISCLAIMER, M, PAGE_H - 6.5, { maxWidth: CONTENT_W - 16 })
  }
}

function nextPage(doc, y, needed) {
  if (y + needed <= PAGE_H - 22) return y
  doc.addPage()
  addInnerHeader(doc)
  return 26
}

function profileLines(profile, goal) {
  const lines = []
  const bits = []
  if (profile?.age) bits.push(`${profile.age} años`)
  if (profile?.sex === 'male') bits.push('masculino')
  if (profile?.sex === 'female') bits.push('femenino')
  if (profile?.current_weight) bits.push(`${profile.current_weight} kg`)
  if (profile?.height_cm) bits.push(`${profile.height_cm} cm`)
  if (profile?.weight_goal_kg) bits.push(`meta ${profile.weight_goal_kg} kg`)
  if (bits.length) lines.push(bits.join(' · '))
  if (goal) lines.push(`Objetivo: ${goal}`)
  const cond = []
  const dt = profile?.diabetes_type
  if (dt && dt !== 'ninguna') {
    const labels = { tipo_1: 'diabetes tipo 1', tipo_2: 'diabetes tipo 2', gestacional: 'diabetes gestacional', prediabetes: 'prediabetes' }
    cond.push(labels[dt] || `diabetes: ${dt}`)
  }
  if (profile?.hipertension) cond.push('hipertensión')
  if (profile?.erc) cond.push('enfermedad renal crónica')
  if (cond.length) lines.push(`Antecedentes considerados: ${cond.join(', ')}.`)
  if (profile?.allergies) lines.push(`Alergias o intolerancias: ${profile.allergies}`)
  if (profile?.food_preferences) lines.push(`Preferencias: ${profile.food_preferences}`)
  if (profile?.budget_level === 'accesible') lines.push('Ingredientes de mercado y cocina de casa.')
  return lines
}

function drawCover(doc, plan, profile, goal) {
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, PAGE_W, 78, 'F')
  doc.setFillColor(...TEAL_DARK)
  doc.rect(0, 78, PAGE_W, 2, 'F')

  setFont(doc, 'normal', 8.5)
  doc.setTextColor(...WHITE)
  doc.text(DOCTOR_DIET_LINE, PAGE_W / 2, 16, { align: 'center', maxWidth: CONTENT_W })
  setFont(doc, 'normal', 8)
  doc.text(CLINIC_NAME, PAGE_W / 2, 23, { align: 'center' })

  setFont(doc, 'bold', 22)
  doc.text('Plan de alimentación', PAGE_W / 2, 44, { align: 'center' })
  setFont(doc, 'normal', 11)
  doc.text('Semana completa  ·  Siete días  ·  Cinco tiempos', PAGE_W / 2, 54, { align: 'center' })

  const fecha = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  setFont(doc, 'normal', 9)
  doc.text(fecha, PAGE_W / 2, 64, { align: 'center' })

  let y = 92
  setFont(doc, 'bold', 13)
  doc.setTextColor(...TEAL)
  doc.text(profile?.full_name || 'Plan personalizado', M, y)
  y += 8

  setFont(doc, 'normal', 9.5)
  doc.setTextColor(...TEXT)
  for (const line of profileLines(profile, goal)) {
    const wrapped = doc.splitTextToSize(line, CONTENT_W)
    doc.text(wrapped, M, y)
    y += wrapped.length * 5 + 1
  }

  y += 6
  const boxH = 32
  doc.setFillColor(...CREAM)
  doc.roundedRect(M, y, CONTENT_W, boxH, 2, 2, 'F')
  setFont(doc, 'bold', 9)
  doc.setTextColor(...TEAL)
  doc.text('Meta nutricional diaria (aproximada)', M + 4, y + 8)
  setFont(doc, 'bold', 12)
  doc.setTextColor(...TEXT)
  doc.text(`${plan.calorias_diarias} kcal`, M + 4, y + 17)
  setFont(doc, 'normal', 9)
  doc.text(
    `${plan.carbohidratos_g} g hidratos de carbono   ·   ${plan.proteina_g} g proteína   ·   ${plan.grasas_g} g grasa`,
    M + 4,
    y + 25
  )
  y += boxH + 10

  if (plan.agua_ml) {
    setFont(doc, 'normal', 9)
    doc.setTextColor(...TEXT)
    doc.text(`Hidratación sugerida: ${(plan.agua_ml / 1000).toFixed(1).replace(/\.0$/, '')} L de agua al día.`, M, y)
    y += 8
  }

  if (plan.resumen) {
    const lines = doc.splitTextToSize(plan.resumen, CONTENT_W)
    doc.text(lines, M, y)
    y += lines.length * 5 + 8
  }

  doc.setFillColor(...CREAM)
  const disc = doc.splitTextToSize(DISCLAIMER, CONTENT_W - 8)
  const dh = disc.length * 4.5 + 10
  doc.roundedRect(M, y, CONTENT_W, dh, 2, 2, 'F')
  setFont(doc, 'italic', 8)
  doc.setTextColor(...TEXT)
  doc.text(disc, M + 4, y + 7)
}

function drawWeekTable(doc, plan) {
  doc.addPage()
  addInnerHeader(doc)
  let y = 28
  setFont(doc, 'bold', 14)
  doc.setTextColor(...TEAL)
  doc.text('Menú de la semana', M, y)
  y += 8

  const meals = MEAL_ORDER
  const col0 = 28
  const colW = (CONTENT_W - col0) / meals.length
  const rowHead = 10
  doc.setFillColor(...TEAL)
  doc.rect(M, y, CONTENT_W, rowHead, 'F')
  setFont(doc, 'bold', 6.5)
  doc.setTextColor(...WHITE)
  doc.text('Día', M + 1.5, y + 6.5)
  meals.forEach((m, i) => {
    const label = MEAL_LABELS[m].replace('Colación de media ', 'Col. ')
    doc.text(label, M + col0 + i * colW + colW / 2, y + 6.5, { align: 'center', maxWidth: colW - 1.5 })
  })
  y += rowHead

  const dias = plan.dias || []
  dias.forEach((dia, idx) => {
    const cells = meals.map((tipo) => {
      const c = (dia.comidas || []).find((x) => x.tipo === tipo)
      return c?.platillo || '—'
    })
    const totals = sumMacros(dia.comidas)
    const cellLines = cells.map((text) => doc.splitTextToSize(text, colW - 2))
    const maxLines = Math.max(2, ...cellLines.map((l) => l.length))
    const h = maxLines * 3.4 + 8
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 251)
      doc.rect(M, y, CONTENT_W, h, 'F')
    }
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.2)
    doc.rect(M, y, CONTENT_W, h)
    setFont(doc, 'bold', 7)
    doc.setTextColor(...TEAL)
    doc.text(dia.dia, M + 1.5, y + 5)
    setFont(doc, 'normal', 6)
    doc.setTextColor(...MUTED)
    doc.text(`${totals.calorias || '—'} kcal`, M + 1.5, y + 9.5)
    setFont(doc, 'normal', 6.4)
    doc.setTextColor(...TEXT)
    cellLines.forEach((lines, i) => {
      doc.text(lines, M + col0 + i * colW + 1, y + 4.5)
    })
    y += h
  })

  y += 8
  setFont(doc, 'italic', 8)
  doc.setTextColor(...MUTED)
  doc.text('El detalle de porciones, gramos y equivalencias aparece en las páginas de cada día.', M, y, {
    maxWidth: CONTENT_W,
  })
}

function drawDayPages(doc, plan) {
  for (const dia of plan.dias || []) {
    doc.addPage()
    addInnerHeader(doc)
    let y = 28
    const totals = sumMacros(dia.comidas)
    doc.setFillColor(...TEAL)
    doc.roundedRect(M, y, CONTENT_W, 14, 1.5, 1.5, 'F')
    setFont(doc, 'bold', 13)
    doc.setTextColor(...WHITE)
    doc.text(dia.dia, M + 4, y + 9)
    setFont(doc, 'normal', 8.5)
    doc.text(
      `${totals.calorias} kcal  ·  ${totals.carbohidratos_g} g HC  ·  ${totals.proteina_g} g prot  ·  ${totals.grasas_g} g grasa`,
      PAGE_W - M - 4,
      y + 9,
      { align: 'right' }
    )
    y += 20

    for (const comida of [...(dia.comidas || [])].sort((a, b) => MEAL_ORDER.indexOf(a.tipo) - MEAL_ORDER.indexOf(b.tipo))) {
      const ingLines = (comida.ingredientes || []).map((ing) => {
        const grams = ing.gramos ? `${ing.gramos} g` : ''
        const medida = ing.medida || ''
        const qty = [medida, grams].filter(Boolean).join(' · ')
        return qty ? `${ing.item} (${qty})` : ing.item
      })
      const block = []
      if (comida.porcion) block.push(`Porción: ${comida.porcion}`)
      if (ingLines.length) block.push(`Ingredientes: ${ingLines.join('; ')}.`)
      if (comida.equivalentes) block.push(`Equivalencia: ${comida.equivalentes}`)
      if (comida.tip) block.push(`Preparación: ${comida.tip}`)
      const wrapped = block.flatMap((t) => doc.splitTextToSize(t, CONTENT_W - 8))
      const h = 16 + wrapped.length * 4.1
      y = nextPage(doc, y, h + 2)

      doc.setFillColor(...CREAM)
      doc.roundedRect(M, y, CONTENT_W, 8, 1, 1, 'F')
      setFont(doc, 'bold', 9)
      doc.setTextColor(...TEAL)
      doc.text(MEAL_LABELS[comida.tipo] || comida.tipo, M + 3, y + 5.5)
      setFont(doc, 'normal', 8)
      doc.setTextColor(...MUTED)
      doc.text(
        `${comida.calorias || '—'} kcal  ·  ${comida.carbohidratos_g || 0} g HC  ·  ${comida.proteina_g || 0} g prot  ·  ${comida.grasas_g || 0} g grasa`,
        PAGE_W - M - 3,
        y + 5.5,
        { align: 'right' }
      )
      y += 11
      setFont(doc, 'bold', 10)
      doc.setTextColor(...TEXT)
      const title = doc.splitTextToSize(comida.platillo || '', CONTENT_W - 4)
      doc.text(title, M + 2, y)
      y += title.length * 4.5 + 1
      setFont(doc, 'normal', 8.5)
      doc.setTextColor(...TEXT)
      if (wrapped.length) {
        doc.text(wrapped, M + 2, y)
        y += wrapped.length * 4.1
      }
      y += 5
    }
  }
}

function drawShopping(doc, plan) {
  const groups = plan.lista_compras || []
  if (!groups.length) return
  doc.addPage()
  addInnerHeader(doc)
  let y = 28
  setFont(doc, 'bold', 14)
  doc.setTextColor(...TEAL)
  doc.text('Lista de compras de la semana', M, y)
  y += 6
  setFont(doc, 'normal', 8)
  doc.setTextColor(...MUTED)
  doc.text('Agrupada por sección del mercado. Las cantidades son una guía para los siete días.', M, y)
  y += 8

  for (const group of groups) {
    y = nextPage(doc, y, 16)
    doc.setFillColor(...TEAL)
    doc.roundedRect(M, y, CONTENT_W, 7, 1, 1, 'F')
    setFont(doc, 'bold', 9)
    doc.setTextColor(...WHITE)
    doc.text(group.seccion, M + 3, y + 5)
    y += 10
    setFont(doc, 'normal', 8.5)
    doc.setTextColor(...TEXT)
    for (const item of group.items) {
      y = nextPage(doc, y, 7)
      const line = item.detalle ? `${item.item} — ${item.detalle}` : item.item
      const wrapped = doc.splitTextToSize(`•  ${line}`, CONTENT_W - 2)
      doc.text(wrapped, M + 1, y)
      y += wrapped.length * 4.2 + 0.6
    }
    y += 3
  }
}

function drawRecommendations(doc, plan) {
  const recs = plan.recomendaciones || []
  if (!recs.length) return
  doc.addPage()
  addInnerHeader(doc)
  let y = 28
  setFont(doc, 'bold', 14)
  doc.setTextColor(...TEAL)
  doc.text('Recomendaciones', M, y)
  y += 10
  for (const rec of recs) {
    const body = doc.splitTextToSize(rec.texto, CONTENT_W - 6)
    y = nextPage(doc, y, 14 + body.length * 4.3)
    setFont(doc, 'bold', 10)
    doc.setTextColor(...TEAL)
    doc.text(rec.titulo, M, y)
    y += 6
    setFont(doc, 'normal', 9)
    doc.setTextColor(...TEXT)
    doc.text(body, M, y)
    y += body.length * 4.3 + 6
  }
}

export function buildDietPdf(plan, profile = {}, goal = '') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  drawCover(doc, plan, profile, goal)
  drawWeekTable(doc, plan)
  drawDayPages(doc, plan)
  drawShopping(doc, plan)
  drawRecommendations(doc, plan)
  addFooter(doc)
  return doc
}

export function downloadDietPdf(plan, profile, goal) {
  const doc = buildDietPdf(plan, profile, goal)
  const slug = String(profile?.full_name || 'plan')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  doc.save(`plan-alimentacion-${slug || 'semanal'}.pdf`)
}
