const hits = new Map()

export function rateLimitAndSize(request, { maxPerMin = 20, maxBytes = 80000 } = {}) {
  const ip = request.headers.get('x-nf-client-connection-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000)
  if (recent.length >= maxPerMin) {
    return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  recent.push(now)
  hits.set(ip, recent)

  const len = Number(request.headers.get('content-length') || 0)
  if (len > maxBytes) {
    return new Response(JSON.stringify({ error: 'La solicitud es demasiado grande.' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return null
}
