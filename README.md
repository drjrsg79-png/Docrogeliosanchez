# Escuela clínica — Dr. Rogelio Sánchez

Plataforma de cursos de pago con dos públicos: pacientes con diabetes y sus familias, y
profesionales de la salud que atienden pie diabético y salvamento de extremidad.

## Cómo está armado

- **Frontend**: React + Vite, enrutado propio sin dependencias (`src/router.jsx`).
- **API**: Netlify Functions en `netlify/functions/*.mts`, cada una con su ruta `/api/...`.
- **Datos**: Netlify Database (Postgres) con Drizzle ORM. Esquema en `db/schema.ts`,
  migraciones en `netlify/database/migrations/` (Netlify las aplica en cada deploy).
- **Pagos**: Stripe Checkout. Si no hay llave de Stripe, la compra queda registrada con un
  folio y se libera a mano desde el panel.

## Variables de entorno

| Variable | Para qué sirve |
| --- | --- |
| `STRIPE_SECRET_KEY` | Cobrar con Stripe Checkout. Sin ella, las compras quedan pendientes de confirmación manual. |
| `STRIPE_WEBHOOK_SECRET` | Verificar el webhook `checkout.session.completed` que libera el acceso. |
| `ADMIN_PASSWORD` | Entrar al panel en `/panel`. |
| `AUTH_SECRET` | Firmar la cookie de sesión. Recomendado en producción. |
| `CONTACT_WHATSAPP` | Teléfono que se muestra al alumno cuando el pago es por transferencia. |

El webhook de Stripe apunta a `https://<tu-sitio>/api/stripe/webhook`.

## Rutas

| Ruta | Qué es |
| --- | --- |
| `/` | Catálogo, con pestañas de pacientes y médicos |
| `/curso/:slug` | Temario, precio e inscripción |
| `/curso/:slug/leccion/:id` | Lección (video + lectura), con avance |
| `/registro`, `/entrar` | Cuenta del alumno |
| `/mis-cursos` | Cursos comprados y progreso |
| `/panel` | Panel del doctor: ventas, cursos y lecciones |

## Desarrollo

```bash
npm install
netlify dev --port 8889
```
