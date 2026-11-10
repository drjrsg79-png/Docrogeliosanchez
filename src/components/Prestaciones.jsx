import { Link } from 'react-router-dom'
import { PRESTACIONES } from '../lib/clinic'

export default function Prestaciones() {
  return (
    <section className="benefit-block">
      <h2 className="section-label">Qué incluye</h2>
      <ul className="benefit-list">
        {PRESTACIONES.map((item) => {
          const body = (
            <>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </>
          )
          if (item.external) {
            return (
              <li key={item.label}>
                <a href={item.href} target="_blank" rel="noopener noreferrer">{body}</a>
              </li>
            )
          }
          return (
            <li key={item.label}>
              <Link to={item.href}>{body}</Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
