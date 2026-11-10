exports.handler = async function () {
  return {
    statusCode: 410,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      error: 'Este servicio ya no usa un expediente en línea. Agenda tu cita o escribe por WhatsApp.',
    }),
  }
}
