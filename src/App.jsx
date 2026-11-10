import { Routes, Route } from 'react-router-dom'
import RedirectHome from './pages/RedirectHome'
import FollowUpCta from './pages/FollowUpCta'
import Dashboard from './pages/Dashboard'
import GlucoseLog from './pages/GlucoseLog'
import WeightLog from './pages/WeightLog'
import MealLog from './pages/MealLog'
import ExerciseLog from './pages/ExerciseLog'
import WaterLog from './pages/WaterLog'
import ExerciseRoutine from './pages/ExerciseRoutine'
import DietPlan from './pages/DietPlan'
import MedicalHistory from './pages/MedicalHistory'
import AIChat from './pages/AIChat'
import Home from './pages/Home'
import SegundaOpinion from './pages/SegundaOpinion'
import Perfil from './pages/Perfil'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/segunda-opinion" element={<SegundaOpinion />} />
      <Route path="/perfil" element={<Perfil />} />
      <Route path="/login" element={<RedirectHome />} />
      <Route path="/register" element={<RedirectHome />} />
      <Route path="/forgot-password" element={<RedirectHome />} />
      <Route path="/reset-password" element={<RedirectHome />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/doctor" element={<FollowUpCta />} />
      <Route path="/doctor/patient/:id" element={<FollowUpCta />} />
      <Route path="/glucosa" element={<GlucoseLog />} />
      <Route path="/peso" element={<WeightLog />} />
      <Route path="/comidas" element={<MealLog />} />
      <Route path="/ejercicio" element={<ExerciseLog />} />
      <Route path="/agua" element={<WaterLog />} />
      <Route path="/rutina" element={<ExerciseRoutine />} />
      <Route path="/dieta" element={<DietPlan />} />
      <Route path="/antecedentes" element={<MedicalHistory />} />
      <Route path="/chat" element={<AIChat />} />
    </Routes>
  )
}

export default App
