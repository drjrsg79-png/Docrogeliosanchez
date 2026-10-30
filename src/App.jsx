import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import DoctorPanel from './pages/DoctorPanel'
import PatientDetail from './pages/PatientDetail'
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

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/segunda-opinion" element={<SegundaOpinion />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/doctor" element={<DoctorPanel />} />
      <Route path="/doctor/patient/:id" element={<PatientDetail />} />
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
