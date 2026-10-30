import { Link } from 'react-router-dom'
import { PRESTACIONES } from '../lib/clinic'

export default function Prestaciones({ needsAccount = false }) {
  return (
    <section className="benefit-block">
      <h2 className="section-label">Qué incluye</h2>
      <ul className="benefit-list">
        {PRESTACIONES.map((item) => {
          const href = item.external || !needsAccount
            ? item.href
            : `/login?next=${encodeURIComponent(item.href)}`
          const body = (
            <>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </>
          )
          if (item.external) {
            return (
              <li key={item.label}>
                <a href={href} target="_blank" rel="noopener noreferrer">{body}</a>
              </li>
            )
          }
          return (
            <li key={item.label}>
              <Link to={href}>{body}</Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
