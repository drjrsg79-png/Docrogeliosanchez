import { rateLimitAndSize } from './_shared/guard.mjs'

export default async function handler(request) {
  try {
    const limited = rateLimitAndSize(request, { maxPerMin: 15, maxBytes: 80000 })
    if (limited) return limited
    const body = await request.json().catch(() => ({}))
    const { goal, diabetesType, currentWeight, heightCm, weightGoal, erc, hipertension } = body || {}

    const weight = Number(currentWeight) || 0
    const height = Number(heightCm) || 0
    let kcal = 1800
    if (weight && height) {
      const bmr = 10 * weight + 6.25 * height - 5 * 40 - 78
      kcal = Math.round(bmr * 1.3)
    }
    const loss = /bajar|perder|peso/i.test(goal || '') || (weightGoal && weight && Number(weightGoal) < weight)
    if (loss) kcal -= 400
    if (kcal < 1400) kcal = 1400
    if (kcal > 2600) kcal = 2600
    kcal = Math.round(kcal / 10) * 10
    const diabetes = diabetesType && diabetesType !== 'ninguna'
    const carbPct = diabetes ? 0.42 : 0.48
    const protPct = erc ? 0.16 : 0.22
    const fatPct = 1 - carbPct - protPct
    const parsed = {
      resumen: 'Meta nutricional diaria aproximada, para armar un plan de siete días con cinco tiempos de comida.',
      calorias_diarias: kcal,
      carbohidratos_g: Math.round((kcal * carbPct) / 4),
      proteina_g: Math.round((kcal * protPct) / 4),
      grasas_g: Math.round((kcal * fatPct) / 9),
    }
    if (hipertension || erc || diabetes) {
      parsed.resumen += ' Se toman en cuenta los antecedentes señalados.'
    }
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
