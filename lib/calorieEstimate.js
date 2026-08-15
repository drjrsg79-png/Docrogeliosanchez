const MET_TABLE = [
  { keywords: ['caminata', 'caminar', 'paseo'], met: 3.5 },
  { keywords: ['caminata rapida', 'caminar rapido'], met: 4.3 },
  { keywords: ['bicicleta', 'ciclismo', 'bici'], met: 6.0 },
  { keywords: ['bicicleta fija', 'spinning'], met: 5.5 },
  { keywords: ['natacion', 'nadar', 'alberca'], met: 6.0 },
  { keywords: ['trote', 'correr', 'running'], met: 8.0 },
  { keywords: ['yoga'], met: 2.5 },
  { keywords: ['estiramiento', 'estiramientos'], met: 2.3 },
  { keywords: ['pesas', 'fuerza', 'musculacion'], met: 4.0 },
  { keywords: ['baile', 'zumba'], met: 5.0 },
  { keywords: ['escalera', 'subir escaleras'], met: 6.0 },
  { keywords: ['sentado', 'silla', 'movilidad'], met: 2.0 },
  { keywords: ['jardineria'], met: 3.8 },
  { keywords: ['limpieza', 'quehacer'], met: 3.0 },
]

const MET_DEFAULT = 3.5

export function estimateCaloriesBurned(activityName, durationMin, weightKg) {
  if (!activityName || !durationMin || !weightKg) return null

  const normalized = activityName.toLowerCase()
  const match = MET_TABLE.find((entry) =>
    entry.keywords.some((k) => normalized.includes(k))
  )
  const met = match ? match.met : MET_DEFAULT

  const calories = met * weightKg * (durationMin / 60)
  return Math.round(calories)
}
