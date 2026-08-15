import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'

const CONTEXT_OPTIONS = [
  { value: 'antes_desayuno', label: 'Antes del desayuno' },
  { value: 'post_desayuno', label: '2 horas después del desayuno' },
  { value: 'antes_comida', label: 'Antes de la comida' },
  { value: 'post_comida', label: '2 horas después de la comida' },
  { value: 'antes_cena', label: 'Antes de la cena' },
  { value: 'post_cena', label: '2 horas después de la cena' },
  { value: 'aleatorio', label: 'En otro momento / aleatoria' },
]

const CONTEXT_LABELS = Object.fromEntries(CONTEXT_OPTIONS.map((o) => [o.value, o.label]))

function evaluarLectura(valor, context) {
  if (valor < 60) {
    return {
      nivel: 'baja',
      etiqueta: 'Hipoglucemia',
      color: '#b3261e',
      fondo: '#fbeceb',
      mensaje:
        'Nivel bajo de glucosa. Consume de inmediato 15 g de carbohidratos de absorción rápida (medio vaso de jugo, 3 tabletas de glucosa o una cucharada de azúcar). Repite la medición en 15 minutos. Si persiste por debajo de 60 mg/dL o hay síntomas como sudoración, temblor o confusión, contacta a tu médico o acude a urgencias.',
    }
  }

  if (valor > 180) {
    const esPostprandial = context.startsWith('post_')
    return {
      nivel: 'alta',
      etiqueta: 'Hiperglucemia',
      color: '#b3261e',
      fondo: '#fbeceb',
      mensaje: esPostprandial
        ? 'Nivel elevado después de comer. Evita azúcares y harinas refinadas en tu siguiente comida, aumenta la ingesta de agua y realiza actividad física ligera si tu condición lo permite. Si se repite de forma constante, coméntalo con tu médico para ajustar tratamiento.'
        : 'Nivel elevado en ayuno o antes de alimento. Esto puede indicar necesidad de ajuste en tu esquema de tratamiento. Evita comidas altas en carbohidratos simples y mantente bien hidratado. Notifica a tu médico si este patrón se repite.',
    }
  }

  const contextoAyuno = context === 'antes_desayuno' || context === 'antes_comida' || context === 'antes_cena'
  const rangoIdeal = contextoAyuno ? '70–100 mg/dL' : 'menor a 140 mg/dL'

  return {
    nivel: 'normal',
