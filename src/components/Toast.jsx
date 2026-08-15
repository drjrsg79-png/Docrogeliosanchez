import { useEffect } from 'react'

export default function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2200)
    return () => clearTimeout(timer)
  }, [onClose])

  if (!message) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#152E44',
        color: '#ffffff',
        padding: '0.75rem 1.25rem',
        borderRadius: '999px',
        fontSize: '0.875rem',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        whiteSpace: 'nowrap',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {message}
    </div>
  )
}
