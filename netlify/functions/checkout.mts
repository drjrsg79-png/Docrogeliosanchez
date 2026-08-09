import type { Config, Context } from "@netlify/functions";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { courses, enrollments } from "../../db/schema.js";
import { currentUser, json } from "../lib/auth.mts";
import { siteUrl } from "../lib/format.mts";

const STRIPE_API = "https://api.stripe.com/v1";

function stripeKey(): string {
  return process.env.STRIPE_SECRET_KEY || "";
}

async function stripeRequest(path: string, method: string, form?: Record<string, string>) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Stripe rechazó la petición");
  return data;
}

/** Marca la inscripción como pagada. Idempotente. */
async function activate(enrollmentId: number, reference: string) {
  await db
    .update(enrollments)
    .set({ status: "active", reference, activatedAt: new Date() })
    .where(eq(enrollments.id, enrollmentId));
}

export default async (req: Request, context: Context) => {
  const user = await currentUser(req);
  if (!user) return json({ error: "Inicia sesión para continuar" }, 401);

  // ── Confirmar el regreso desde Stripe ───────────────────────────────
  if (context.params.action === "confirm") {
    const sessionId = new URL(req.url).searchParams.get("session_id") || "";
    if (!sessionId || !stripeKey()) return json({ error: "Pago no verificable" }, 400);

    const session = await stripeRequest(`/checkout/sessions/${sessionId}`, "GET");
    const enrollmentId = Number(session?.metadata?.enrollmentId || 0);
    if (!enrollmentId) return json({ error: "Pago sin referencia" }, 400);

    const [row] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.id, enrollmentId), eq(enrollments.userId, user.id)))
      .limit(1);
    if (!row) return json({ error: "Inscripción no encontrada" }, 404);

    const paid = session?.payment_status === "paid";
    if (paid && row.status !== "active") await activate(row.id, sessionId);

    const [course] = await db
      .select({ slug: courses.slug, title: courses.title })
      .from(courses)
      .where(eq(courses.id, row.courseId))
      .limit(1);

    return json({ paid, status: paid ? "active" : row.status, course });
  }

  // ── Iniciar el pago ─────────────────────────────────────────────────
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const body = await req.json().catch(() => ({}) as Record<string, string>);
  const slug = String(body.slug || "");

  const [course] = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  if (!course || !course.published) return json({ error: "Curso no encontrado" }, 404);

  const [existing] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, course.id)))
    .limit(1);

  if (existing?.status === "active") {
    return json({ mode: "already", status: "active", slug: course.slug });
  }

  const provider = stripeKey() ? "stripe" : "transfer";
  let enrollment = existing;
  if (enrollment) {
    await db
      .update(enrollments)
      .set({ provider, amountCents: course.priceCents, currency: course.currency })
      .where(eq(enrollments.id, enrollment.id));
  } else {
    [enrollment] = await db
      .insert(enrollments)
      .values({
        userId: user.id,
        courseId: course.id,
        status: "pending",
        provider,
        amountCents: course.priceCents,
        currency: course.currency,
      })
      .returning();
  }

  // Sin llave de Stripe configurada: se registra el apartado y el pago se
  // confirma a mano desde el panel del doctor.
  if (provider === "transfer") {
    const folio = `DRS-${String(enrollment.id).padStart(5, "0")}`;
    await db
      .update(enrollments)
      .set({ reference: folio })
      .where(eq(enrollments.id, enrollment.id));
    return json({
      mode: "transfer",
      folio,
      contact: process.env.CONTACT_WHATSAPP || "",
      amountCents: course.priceCents,
      currency: course.currency,
      slug: course.slug,
    });
  }

  const base = siteUrl(req);
  const session = await stripeRequest("/checkout/sessions", "POST", {
    mode: "payment",
    customer_email: user.email,
    client_reference_id: String(enrollment.id),
    "metadata[enrollmentId]": String(enrollment.id),
    "metadata[courseSlug]": course.slug,
    success_url: `${base}/pago/confirmado?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/curso/${course.slug}?pago=cancelado`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": course.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(course.priceCents),
    "line_items[0][price_data][product_data][name]": course.title,
    "line_items[0][price_data][product_data][description]": course.tagline || course.title,
  });

  await db
    .update(enrollments)
    .set({ reference: session.id })
    .where(eq(enrollments.id, enrollment.id));

  return json({ mode: "stripe", url: session.url });
};

export const config: Config = {
  path: ["/api/checkout", "/api/checkout/:action"],
};
