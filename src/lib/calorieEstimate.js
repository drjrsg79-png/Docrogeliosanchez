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
const DEFAULT_WEIGHT_KG = 70

function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

function fuzzyMatchesWord(word, keyword) {
  if (word.includes(keyword) || keyword.includes(word)) return true
  if (word.length < 4) return false
  const maxDistance = word.length <= 6 ? 1 : 2
  return levenshtein(word, keyword) <= maxDistance
}

function findMet(activityName) {
  const normalized = stripAccents(activityName.toLowerCase().trim())
  const words = normalized.split(/\s+/)

  for (const entry of MET_TABLE) {
    for (const keyword of entry.keywords) {
      const keywordNorm = stripAccents(keyword)
      if (normalized.includes(keywordNorm)) return entry.met
      if (words.some((w) => fuzzyMatchesWord(w, keywordNorm))) return entry.met
    }
  }
  return null
}

export function estimateCaloriesBurned(activityName, durationMin, weightKg) {
  if (!activityName || !durationMin) return null

  const met = findMet(activityName) ?? MET_DEFAULT
  const weight = weightKg || DEFAULT_WEIGHT_KG

  const calories = met * weight * (durationMin / 60)
  return Math.round(calories)
        }
