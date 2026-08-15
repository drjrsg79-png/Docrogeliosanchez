export default async function handler(request) {
  try {
    const body = await request.json()
    const { message, history, patientContext } = body

    if (!message) {
      return new Response(JSON.stringify({ error: 'Falta el mensaje' }), { status: 400 })
    }

    const contextLines = []
    if (patientContext) {
      if (patientContext.full_name) contextLines.push(`Nombre: ${patientContext.full_name}`)
      if (patientContext.age != null) contextLines.push(`Edad: ${patientContext.age} años`)
      if (patientContext.diabetes_type) contextLines.push(`Tipo de diabetes: ${patientContext.diabetes_type}`)
      if (patientContext.diagnosis_year) contextLines.push(`Año de diagnóstico: ${patientContext.diagnosis_year}`)
      if (patientContext.last_hba1c) contextLines.push(`Última HbA1c: ${patientContext.last_hba1c}%`)
      if (patientContext.height_cm) contextLines.push(`Estatura: ${patientContext.height_cm} cm`)
      if (patientContext.current_weight_kg) contextLines.push(`Peso actual: ${patientContext.current_weight_kg} kg`)
      if (patientContext.weight_goal_kg) contextLines.push(`Meta de peso: ${patientContext.weight_goal_kg} kg`)
      if (patientContext.uses_insulin) contextLines.push(`Usa insulina${patientContext.insulin_type ? `: ${patientContext.insulin_type}` : ''}`)
      if (patientContext.current_medications) contextLines.push(`Medicamentos actuales: ${patientContext.current_medications}`)
      if (patientContext.allergies) contextLines.push(`Alergias: ${patientContext.allergies}`)
    }

    const systemPrompt = `Eres un médico internista y endocrinólogo, experto en nutrición clínica, actividad física y manejo de obesidad. Trabajas dentro de la app del Dr. Rogelio Sánchez, dando orientación a sus pacientes entre consultas.

Estilo: profesional, cercano, claro, sin tecnicismos innecesarios. Respuestas breves y accionables. Escribe en texto plano, sin usar asteriscos ni formato markdown (nada de **negritas** ni encabezados con #); si necesitas resaltar algo, hazlo con la redacción, no con símbolos.

Reglas importantes:
- Ya tienes el expediente del paciente abajo (edad, diagnóstico, peso, medicamentos, etc.). NO le preguntes datos que ya aparecen ahí — úsalos directamente. Solo pregunta lo que realmente falta o lo que el paciente no te ha contado.
- No sustituyes la consulta médica presencial ni cambias tratamientos, dosis de insulina o medicamentos por tu cuenta. Si el paciente pregunta sobre ajustar dosis o tiene síntomas de alarma (hipoglucemia severa, dolor de pecho, etc.), indícale claramente que contacte al Dr. Rogelio o busque atención médica inmediata.
- Puedes dar orientación general sobre alimentación, ejercicio, hábitos y manejo de peso, adaptada al contexto del paciente.
- Si no tienes suficiente información para responder con seguridad, dilo y sugiere consultarlo con el Dr. Rogelio en la próxima cita.

${contextLines.length > 0 ? `Expediente del paciente:\n${contextLines.join('\n')}` : 'No hay antecedentes médicos capturados aún para este paciente.'}`

    const messages = [
      ...(Array.isArray(history) ? history.map((h) => ({ role: h.role, content: h.content })) : []),
      { role: 'user', content: message },
    ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1000,
        system: systemPrompt,
        messages,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Error al generar la respuesta' }), { status: 500 })
    }

    const reply = data.content?.find((c) => c.type === 'text')?.text || ''

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
