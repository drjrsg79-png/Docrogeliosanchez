const PREFIX = 'drs.'

export function loadStore(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function saveStore(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Quota or private mode: keep working in memory only.
  }
  return value
}

export function loadProfile() {
  const value = loadStore('profile', {})
  return value && typeof value === 'object' ? value : {}
}

export function saveProfile(partial) {
  const next = { ...loadProfile(), ...partial }
  return saveStore('profile', next)
}

export function loadLogs(key) {
  const value = loadStore(key, [])
  return Array.isArray(value) ? value : []
}

export function newLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function prependLog(key, item, max = 200) {
  const row = { id: newLocalId(), ...item }
  const list = [row, ...loadLogs(key)].slice(0, max)
  saveStore(key, list)
  return { row, list }
}

export const LOCAL_NOTE = 'Estos datos se quedan en este teléfono. No se envían a un expediente en línea.'
