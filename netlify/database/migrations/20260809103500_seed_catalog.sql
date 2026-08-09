-- Catálogo inicial de cursos del Dr. Rogelio Sánchez.
-- Sólo se inserta si la tabla está vacía, para no duplicar al re-desplegar.

INSERT INTO courses (slug, title, tagline, description, audience, level, price_cents, currency, accent, published, position)
SELECT * FROM (VALUES
  (
    'pie-diabetico-paso-a-paso',
    'Tu pie diabético, paso a paso',
    'Qué hacer cada día para no perder tu pie',
    'El curso que doy a mis pacientes antes de que la herida se complique. Aprendes a revisar tu pie todos los días, a reconocer las señales que obligan a llamar al médico esa misma tarde, a curar sin dañar el tejido nuevo y a descargar el peso del pie mientras cicatriza. Siete de cada diez amputaciones que llegan a mi consulta empezaron con una lesión que nadie vio a tiempo.',
    'patient', 'Básico', 89000, 'MXN', '#B4562A', true, 1
  ),
  (
    'glucosa-bajo-control',
    'Glucosa bajo control',
    'Seis semanas para entender tus números',
    'No es un curso de dietas. Es aprender a leer tu glucómetro como lo leo yo: por qué amaneces en 180 aunque cenaste poco, qué significa una hemoglobina glucosilada de 8.4, cómo se ajusta la insulina alrededor de una comida real y qué hacer el día que te enfermas. Al terminar sabrás llevar un registro que tu médico pueda usar de verdad.',
    'patient', 'Básico', 69000, 'MXN', '#3E6B5A', true, 2
  ),
  (
    'volver-a-caminar',
    'Volver a caminar',
    'Recuperación después de una cirugía de salvamento',
    'La cirugía salvó la extremidad; la rehabilitación decide si vuelves a caminar con ella. Cuidado de la herida en casa, cuándo se puede apoyar el pie y cuándo no, ejercicios de fuerza y equilibrio por semana, elección de calzado y plantilla, y las señales de que algo va mal y hay que regresar a consulta.',
    'patient', 'Intermedio', 54000, 'MXN', '#5C5470', true, 3
  ),
  (
    'salvamento-primeras-72-horas',
    'Salvamento de extremidad: las primeras 72 horas',
    'Decisiones que definen el desenlace',
    'Curso clínico para médicos. Triaje del pie diabético infectado en urgencias, criterios de ingreso, valoración vascular a pie de cama, momento y extensión del desbridamiento inicial, elección empírica de antibiótico y cuándo escalar, y el criterio de revascularización antes de cerrar. Incluye los algoritmos que uso en guardia y casos comentados con imagen.',
    'doctor', 'Avanzado', 485000, 'MXN', '#1F3A5F', true, 1
  ),
  (
    'ulcera-diabetica-clasificacion',
    'Úlcera diabética: clasificar, desbridar, cerrar',
    'De la exploración a la elección del apósito',
    'Sistemas WIfI y de la Universidad de Texas aplicados a casos reales, exploración neuropática y vascular reproducible, técnica de desbridamiento cortante en consultorio, criterios de cultivo útil, terapia de presión negativa y la lógica detrás de cada familia de apósitos. Pensado para medicina interna, familiar, urgencias y cirugía general.',
    'doctor', 'Intermedio', 320000, 'MXN', '#8A6B2E', true, 2
  ),
  (
    'sepsis-pie-diabetico-uti',
    'Sepsis de origen podálico en terapia intensiva',
    'El paciente diabético grave, hora por hora',
    'Manejo del paciente séptico con foco en extremidad: reanimación guiada por perfusión, control de foco quirúrgico sin retraso, antibiótico en el paciente con lesión renal, cetoacidosis y estado hiperosmolar concurrentes, y la conversación honesta con la familia cuando la amputación es la opción que salva la vida.',
    'doctor', 'Avanzado', 540000, 'MXN', '#6B2737', true, 3
  )
) AS seed(slug, title, tagline, description, audience, level, price_cents, currency, accent, published, position)
WHERE NOT EXISTS (SELECT 1 FROM courses);

INSERT INTO lessons (course_id, title, summary, content, duration_min, position, is_preview)
SELECT c.id, l.title, l.summary, l.content, l.duration_min, l.position, l.is_preview
FROM (VALUES
  ('pie-diabetico-paso-a-paso', 'La revisión de los tres minutos', 'Cómo explorar tu pie cada noche', 'Necesitas un espejo de mano, buena luz y tres minutos antes de dormir. Revisa planta, talón, entre los dedos y las uñas. Buscas cuatro cosas: enrojecimiento que no desaparece al presionar, piel más caliente en un punto que en el resto, cualquier ampolla o grieta, y humedad o mal olor entre los dedos. Si no alcanzas a ver la planta, pide ayuda o apoya el espejo en el piso. Anota lo que encuentres con la fecha: esa libreta vale más en consulta que cualquier estudio.', 8, 1, true),
  ('pie-diabetico-paso-a-paso', 'Señales de alarma', 'Cuándo llamar hoy y cuándo ir a urgencias', 'Llamada el mismo día: herida nueva de cualquier tamaño, uña enterrada con pus, cambio de color en un dedo, hinchazón de un solo pie. Urgencias sin esperar cita: fiebre con herida en el pie, salida de material purulento, olor fétido, dolor intenso que aparece de golpe, piel morada o negra, o glucosa que no baja acompañada de vómito. La diferencia entre estas dos listas suele ser la diferencia entre una curación y un quirófano.', 10, 2, false),
  ('pie-diabetico-paso-a-paso', 'Curación en casa sin dañar el tejido', 'Materiales, técnica y errores frecuentes', 'Lavado con solución fisiológica a chorro, secado por contacto sin frotar, apósito indicado por tu médico y fijación que no apriete. Nada de alcohol, yodo directo, agua oxigenada, remedios caseros ni polvos de antibiótico: todo eso mata también las células que están reparando la herida. Cambia el apósito cuando esté sucio o húmedo, no por horario fijo. Si el apósito se pega, humedécelo con solución hasta que se desprenda solo.', 12, 3, false),
  ('pie-diabetico-paso-a-paso', 'Descarga: el pie que no pisa, cicatriza', 'Bota, muletas y vida diaria', 'Una úlcera plantar no cierra mientras siga recibiendo tu peso en cada paso. Aquí explico las opciones de descarga, cómo se usan de verdad dentro de casa (incluido el baño y la cocina, donde ocurren las recaídas), cómo organizar tu día para caminar menos sin perder independencia, y por qué caminar de puntas o sobre el talón traslada el problema en lugar de resolverlo.', 11, 4, false),
  ('pie-diabetico-paso-a-paso', 'Calzado y calcetín correctos', 'Cómo elegir y cómo probar', 'Compra el calzado por la tarde, con el calcetín que vas a usar, y mide siempre los dos pies. Punta ancha y alta, sin costuras internas, contrafuerte firme, suela que no doble a la mitad. Revisa el interior con la mano antes de cada uso: una piedra o una costura levantada abre una úlcera en una tarde en un pie sin sensibilidad. Calcetín sin resorte apretado, de preferencia claro para ver manchas.', 9, 5, false),

  ('glucosa-bajo-control', 'Tu glucómetro dice más de lo que crees', 'Medir en el momento correcto', 'Una glucosa aislada no informa casi nada; un patrón sí. Aprende el esquema de medición por pares (antes y dos horas después de la misma comida) y cómo con seis días de registro se ve qué comida te descontrola. Técnica correcta de punción, por qué la primera gota puede mentir y cómo saber si tu aparato está bien calibrado.', 10, 1, true),
  ('glucosa-bajo-control', 'Por qué amaneces alto', 'Fenómeno del alba y rebote', 'La glucosa de la mañana rara vez se explica por la cena. Aquí separamos el fenómeno del alba de la hipoglucemia nocturna con rebote, porque el tratamiento es opuesto: en un caso se sube la basal, en el otro se baja. Cómo documentarlo en casa con dos mediciones de madrugada y qué llevar a consulta para que la decisión sea con datos.', 12, 2, false),
  ('glucosa-bajo-control', 'El plato, no la dieta', 'Construir comidas reales', 'Método del plato aplicado a la comida mexicana de todos los días: cómo se acomodan tortilla, frijol, arroz y fruta sin que la glucosa se dispare, qué cambia si comes primero la verdura y la proteína, y por qué el jugo de fruta natural sube más rápido que la fruta entera. Sin alimentos prohibidos, con porciones que se miden con la mano.', 14, 3, false),
  ('glucosa-bajo-control', 'Hipoglucemia: la regla 15-15', 'Reconocerla y resolverla', 'Sudor frío, temblor, hambre repentina, confusión. Qué tomar exactamente (15 gramos de carbohidrato simple), esperar 15 minutos, volver a medir, y qué comer después para que no regrese. Qué hacer si la persona no puede tragar, cuándo se usa glucagón y por qué una hipoglucemia nocturna obliga a revisar el esquema completo al día siguiente.', 9, 4, false),
  ('glucosa-bajo-control', 'Días de enfermedad', 'Gripe, diarrea, ayuno y estudios', 'Enfermarse descontrola la glucosa aunque comas menos. Reglas para días de enfermedad: nunca suspender la insulina basal por tu cuenta, medir cada cuatro horas, hidratación, cuándo buscar cetonas y los signos que obligan a acudir a urgencias. Incluye cómo manejar el ayuno para un estudio o una cirugía.', 11, 5, false),
  ('glucosa-bajo-control', 'El registro que tu médico puede usar', 'Llevar datos, no anécdotas', 'Formato de registro que integra glucosa, hora, comida, insulina y actividad. Cómo detectar tú mismo los patrones antes de la consulta y qué tres preguntas hacer en cada cita. Con este registro, ajustar el tratamiento toma minutos en lugar de meses.', 8, 6, false),

  ('volver-a-caminar', 'La herida quirúrgica en casa', 'Semana uno y dos', 'Qué se espera que veas cada día, cómo se ve una cicatrización normal frente a una que se está infectando, manejo del drenaje si lo traes, baño y cómo proteger la herida, y control del dolor sin enmascarar una complicación. Fotografía la herida con la misma luz cada tercer día: el cambio se nota mejor comparando que mirando.', 12, 1, true),
  ('volver-a-caminar', 'Cuándo se puede apoyar', 'Progresión de carga', 'La orden de no apoyar no es negociable mientras el tejido está inmaduro, y la progresión posterior es gradual y medida: apoyo parcial asistido, apoyo total en superficie plana, escaleras y terreno irregular al final. Aquí explico las señales de que te adelantaste (dolor nuevo, hinchazón al final del día, calor en la zona) y qué hacer si aparecen.', 11, 2, false),
  ('volver-a-caminar', 'Fuerza y equilibrio, semana por semana', 'Rutina progresiva en casa', 'Programa de ejercicios sin equipo: movilidad de tobillo, fuerza de cadera, control de tronco y entrenamiento de equilibrio, con progresión clara por semana y criterios para avanzar. La caída es la complicación que más veces manda de regreso al quirófano a un paciente que iba bien.', 15, 3, false),
  ('volver-a-caminar', 'Calzado, plantilla y prótesis parcial', 'Adaptar el pie que quedó', 'Después de una amputación parcial o de una cirugía extensa, el pie apoya distinto y las zonas de presión cambian. Qué pedirle al técnico ortesista, cómo se prueba una plantilla de descarga, cada cuánto se revisa y cómo detectar que una zona nueva se está sobrecargando antes de que se ulcere.', 10, 4, false),

  ('salvamento-primeras-72-horas', 'Triaje en urgencias', 'Qué define el ingreso', 'Evaluación estructurada del pie diabético agudo: profundidad real de la lesión con exploración instrumentada, prueba de contacto óseo, extensión de celulitis, signos sistémicos y variables metabólicas. Diferenciación entre infección leve, moderada y grave según IDSA y traducción de esa clasificación a una decisión concreta de ingreso, quirófano o manejo ambulatorio estrecho.', 18, 1, true),
  ('salvamento-primeras-72-horas', 'Valoración vascular a pie de cama', 'Antes de decidir el nivel', 'Palpación sistemática, índice tobillo-brazo y sus falsos negativos por calcificación, presión de dedo, índice dedo-brazo y presión transcutánea de oxígeno. Cuándo la clínica basta y cuándo hay que solicitar angiotomografía o pasar directo a hemodinamia. Ningún desbridamiento amplio debe cerrarse sin haber contestado si hay flujo suficiente para cicatrizar.', 16, 2, false),
  ('salvamento-primeras-72-horas', 'Desbridamiento inicial', 'Extensión, planos y segunda revisión', 'Objetivo del primer tiempo quirúrgico: control de foco, no reconstrucción. Manejo de compartimentos plantares, seguimiento de trayectos por vaina tendinosa, criterios de resección ósea y por qué la revisión programada a las 48 horas cambia el desenlace. Discusión de casos con fotografía transoperatoria comentada.', 22, 3, false),
  ('salvamento-primeras-72-horas', 'Antibiótico empírico y desescalada', 'Elegir, ajustar, suspender', 'Esquemas empíricos según gravedad, exposición previa y riesgo de resistencia; cobertura razonada de anaerobios y de estafilococo resistente; ajuste por función renal; valor real del cultivo de tejido profundo frente al hisopado superficial; y criterios para desescalar y para suspender, incluyendo la duración cuando hay osteomielitis residual.', 17, 4, false),
  ('salvamento-primeras-72-horas', 'Cuándo la amputación es la mejor cirugía', 'Nivel, momento y consentimiento', 'Criterios objetivos para elegir amputación primaria sobre intentos repetidos de salvamento: extensión de necrosis, estado funcional previo, expectativa de deambulación, comorbilidad y flujo. Selección de nivel con vistas a la protetización y cómo conducir la conversación con el paciente y su familia sin falsas promesas.', 15, 5, false),

  ('ulcera-diabetica-clasificacion', 'Exploración reproducible', 'Neuropatía, vascular y presión', 'Monofilamento de 10 gramos con puntos y técnica correctos, diapasón de 128 Hz, reflejos, exploración de deformidad y puntos de presión, y registro fotográfico estandarizado. El objetivo es que dos médicos distintos midan lo mismo en el mismo paciente y que el seguimiento sea comparable.', 14, 1, true),
  ('ulcera-diabetica-clasificacion', 'WIfI y Universidad de Texas', 'Clasificar para decidir', 'Aplicación práctica de ambos sistemas sobre casos reales, con las diferencias que importan a la hora de estimar riesgo de amputación y necesidad de revascularización. Errores frecuentes de estadificación y cómo documentar la clasificación en la nota para que el siguiente médico entienda la decisión.', 16, 2, false),
  ('ulcera-diabetica-clasificacion', 'Desbridamiento cortante en consultorio', 'Qué sí y qué no en el consultorio', 'Indicaciones, límites y técnica del desbridamiento cortante ambulatorio: manejo del callo perilesional, hemostasia, anestesia local en pie neuropático, control del dolor en pie isquémico y los criterios claros para detenerse y programar quirófano. Incluye la lista de material mínimo.', 18, 3, false),
  ('ulcera-diabetica-clasificacion', 'Apósitos con criterio', 'Elegir por lo que hace la herida', 'Familias de apósitos según exudado, tejido de fondo y carga bacteriana: alginatos, hidrofibras, espumas, hidrogeles, plata y colágeno. Cuándo aporta la terapia de presión negativa y cuándo está contraindicada. Cómo dejar la indicación escrita para que el cambio en casa o en enfermería no arruine el avance.', 15, 4, false),
  ('ulcera-diabetica-clasificacion', 'Descarga que el paciente sí usa', 'Del yeso de contacto total a lo posible', 'Yeso de contacto total, bota removible, fieltros y adaptaciones de calzado, comparadas por efectividad y por adherencia real. Estrategia para el paciente que no puede pagar la mejor opción o vive solo, y cómo verificar en la siguiente cita si la descarga se está usando.', 13, 5, false),

  ('sepsis-pie-diabetico-uti', 'Reanimación en el paciente diabético grave', 'Primeras seis horas', 'Reconocimiento temprano, metas de perfusión más allá de la presión arterial, elección de fluidos y vasopresor, y las particularidades del paciente con neuropatía autonómica, cardiopatía y nefropatía. Por qué el retraso en el control quirúrgico del foco anula cualquier optimización hemodinámica.', 20, 1, true),
  ('sepsis-pie-diabetico-uti', 'Control de foco sin retraso', 'Coordinar quirófano con la reanimación', 'Cómo se decide operar a un paciente que aún está inestable, qué se hace en el primer tiempo, y cómo se organiza el equipo para no perder horas. Criterios de reintervención y manejo de la herida abierta en el paciente crítico.', 18, 2, false),
  ('sepsis-pie-diabetico-uti', 'Cetoacidosis y estado hiperosmolar concurrentes', 'Dos problemas a la vez', 'Manejo simultáneo de la descompensación metabólica y la sepsis: líquidos, potasio, insulina en infusión, transición a esquema subcutáneo y las trampas del paciente con lesión renal aguda. Metas de glucosa en el paciente crítico y por qué el control estricto excesivo hace daño.', 19, 3, false),
  ('sepsis-pie-diabetico-uti', 'Antibióticos en falla orgánica', 'Dosis, niveles y duración', 'Ajuste por depuración renal y por terapia de reemplazo, dosis de carga que no se deben reducir, papel de la infusión extendida en betalactámicos, y criterios de duración cuando persiste hueso infectado. Interpretación de cultivos en el paciente ya tratado.', 17, 4, false),
  ('sepsis-pie-diabetico-uti', 'La conversación difícil', 'Pronóstico, amputación y voluntad del paciente', 'Cómo se plantea a la familia una amputación mayor que salva la vida, qué información necesita el paciente para decidir, manejo de expectativas de deambulación según estado funcional previo, y documentación de la decisión compartida. Incluye guion de la conversación y errores que destruyen la confianza.', 14, 5, false)
) AS l(course_slug, title, summary, content, duration_min, position, is_preview)
JOIN courses c ON c.slug = l.course_slug
WHERE NOT EXISTS (SELECT 1 FROM lessons);
