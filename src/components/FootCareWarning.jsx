export default function FootCareWarning() {
  return (
    <div
      style={{
        backgroundColor: '#fbeceb',
        border: '1px solid #b3261e',
        borderRadius: '8px',
        padding: '0.875rem 1rem',
        marginBottom: '1rem',
      }}
    >
      <div style={{ color: '#b3261e', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        Aviso importante
      </div>
      <div style={{ color: '#b3261e', fontSize: '0.875rem', fontWeight: 500 }}>
        Si estás en tratamiento por pie diabético, no apoyes el pie afectado ni camines sin autorización expresa de tu médico.
      </div>
    </div>
  )
}
