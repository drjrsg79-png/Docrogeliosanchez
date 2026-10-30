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
export const SO_PRICE = '$700 MXN'
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
