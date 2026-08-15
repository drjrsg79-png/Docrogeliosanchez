import { Routes, Route } from 'react-router-dom'

function Home() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Dr. Rogelio Sánchez</h1>
      <p>Orientación y seguimiento para pacientes</p>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  )
}

export default App
