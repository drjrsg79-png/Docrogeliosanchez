import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import DoctorPanel from './pages/DoctorPanel'

function Home() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Dr. Rogelio Sánchez</h1>
      <p>Orientación y seguimiento para pacientes</p>
      <a href="/login" style={{ marginRight: '1rem' }}>Iniciar sesión</a>
      <a href="/register">Registrarme</a>
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
    </Routes>
  )
}

export default App
