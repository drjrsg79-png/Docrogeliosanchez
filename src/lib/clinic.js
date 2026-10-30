export const DOCTOR_SHORT = 'Dr. Rogelio Sánchez'
export const DOCTOR_FULL = 'Dr. José Rogelio Sánchez García'
export const SPECIALTIES = 'Medicina interna · Terapia intensiva · Pie diabético'
export const CLINIC_NAME = 'Clínica de Heridas y Pie Diabético'
export const SUCURSALES = ['Querétaro', 'Polanco', 'Tlalnepantla', 'Tapachula']
export const POLANCO_ADDRESS = 'Av. Homero 136, Polanco, CDMX'
export const WHATSAPP_NUMBER = '5215569320331'
export const WHATSAPP_DISPLAY = '55 6932 0331'
export const CLINIC_PHONE_DISPLAY = '442 470 5405'
export const CLINIC_PHONE_TEL = '+524424705405'
export const SO_URL = 'https://segunda-opinion-internista-419.netlify.app'
export const SO_PRICE = '$1,000 MXN'
export const AGENDA_URL = 'https://miadmon.com/agendar'
export const AGENDA_DETAIL = 'Heridas, Homero 136 · $1,200 MXN · Diabetología, Polanco · $500 MXN'
export const INTERNATIONAL_URL = 'https://international-wound-care.netlify.app'

export const WA_CLINIC_MESSAGE =
  'Hola, quiero agendar una cita en la Clínica de Heridas y Pie Diabético con el Dr. Rogelio Sánchez.'

export const WA_SO_MESSAGE =
  'Hola Dr. Sánchez, quiero agendar una segunda opinión por videollamada.'

export function whatsappUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

export function safeNextPath(search) {
  const next = new URLSearchParams(search).get('next')
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null
  return next
}

export const PRESTACIONES = [
  { href: '/dieta', label: 'Plan de alimentación', detail: 'Saca tu dieta aquí, en la app.' },
  { href: '/glucosa', label: 'Seguimiento de glucosa', detail: 'Registra tus mediciones y tenlas en la consulta.' },
  { href: '/rutina', label: 'Rutina de ejercicio', detail: 'Un plan de la semana según tu caso.' },
  { href: '/antecedentes', label: 'Historial médico', detail: 'Antecedentes, medicamentos y alergias.' },
  { href: '/chat', label: 'Orientación', detail: 'Dudas del día a día. No sustituye la consulta.' },
  { href: '/segunda-opinion', label: 'Segunda opinión', detail: `Videollamada con el doctor · ${SO_PRICE}` },
  { href: AGENDA_URL, external: true, label: 'Agenda', detail: 'Cita presencial en la clínica.' },
  { href: whatsappUrl(WA_CLINIC_MESSAGE), external: true, label: 'WhatsApp clínica', detail: WHATSAPP_DISPLAY },
]
