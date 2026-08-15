import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import DoctorPanel from './pages/DoctorPanel'
import GlucoseLog from './pages/GlucoseLog'

function Home() {
  return (
    <div className="page">
      <div className="header">
        <div className="header-title">Dr. Rogelio Sánchez</div>
        <div className="header-subtitle">Medicina interna · Terapia intensiva · Pie diabético</div>
      </div>
      <div className="auth-container">
        <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          Plataforma de orientación y seguimiento clínico para pacientes con diabetes y heridas.
        </p>
        <a href="/login" className="btn btn-primary" style={{ marginBottom: '0.75rem', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          Iniciar sesión
        </a>
        <a href="/register" className="btn btn-secondary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          Crear cuenta
        </a>
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
    </Routes>
  )
}

export default App
