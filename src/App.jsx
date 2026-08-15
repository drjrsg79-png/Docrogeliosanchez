import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import DoctorPanel from './pages/DoctorPanel'
import GlucoseLog from './pages/GlucoseLog'
import WeightLog from './pages/WeightLog'
import MealLog from './pages/MealLog'
import ExerciseLog from './pages/ExerciseLog'
import WaterLog from './pages/WaterLog'
import ExerciseRoutine from './pages/ExerciseRoutine'
import DietPlan from './pages/DietPlan'
import MedicalHistory from './pages/MedicalHistory'

function Home() {
  return (
    <div className="page">
      <div
        className="header"
        style={{
          paddingTop: '3rem',
          paddingBottom: '3rem',
          textAlign: 'center',
          background: 'linear-gradient(160deg, #0f4c5c 0%, #0a3844 100%)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2c4 5 7 8.5 7 12.5A7 7 0 1 1 5 14.5C5 10.5 8 7 12 2Z" />
          </svg>
        </div>
        <div className="header-title" style={{ fontSize: '1.375rem' }}>Dr. Rogelio Sánchez</div>
        <div className="header-subtitle" style={{ marginTop: '0.375rem' }}>Medicina interna · Terapia intensiva · Pie diabético</div>
      </div>

      <div className="auth-container" style={{ marginTop: '2.5rem' }}>
        <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1rem' }}>
          Plataforma de orientación y seguimiento clínico para pacientes con diabetes.
        </p>
        <a
          href="/login"
          className="btn btn-primary"
          style={{
            marginBottom: '0.75rem',
            display: 'block',
            textAlign: 'center',
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(15,76,92,0.28)',
          }}
        >
          Iniciar sesión
        </a>
        <a
          href="/register"
          className="btn btn-secondary"
          style={{
            display: 'block',
            textAlign: 'center',
            textDecoration: 'none',
            boxShadow: '0 1px 3px rgba(15,76,92,0.08)',
          }}
        >
          Crear cuenta
        </a>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#5c6b73', marginTop: '2.5rem' }}>
          Tus datos están protegidos y son confidenciales.
        </p>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/doctor" element={<DoctorPanel />} />
      <Route path="/glucosa" element={<GlucoseLog />} />
      <Route path="/peso" element={<WeightLog />} />
      <Route path="/comidas" element={<MealLog />} />
      <Route path="/ejercicio" element={<ExerciseLog />} />
      <Route path="/agua" element={<WaterLog />} />
      <Route path="/rutina" element={<ExerciseRoutine />} />
      <Route path="/dieta" element={<DietPlan />} />
      <Route path="/antecedentes" element={<MedicalHistory />} />
    </Routes>
  )
}

export default App
