import type { Config } from "@netlify/functions";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { enrollments } from "../../db/schema.js";
import { json } from "../lib/auth.mts";

/** Verifica la firma `t=...,v1=...` que envía Stripe. */
function signatureIsValid(payload: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k.trim(), v.join("=")];
    }),
  );
  const timestamp = parts.t;
  const given = parts.v1;
  if (!timestamp || !given) return false;

  // Rechaza firmas de más de cinco minutos (protege contra reenvíos).
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const header = req.headers.get("stripe-signature") || "";
  const payload = await req.text();

  if (!secret || !signatureIsValid(payload, header, secret)) {
    return json({ error: "Firma inválida" }, 400);
  }

  const event = JSON.parse(payload);
  const session = event?.data?.object;
  const enrollmentId = Number(session?.metadata?.enrollmentId || 0);

  if (event.type === "checkout.session.completed" && enrollmentId) {
    if (session.payment_status === "paid") {
      await db
        .update(enrollments)
        .set({ status: "active", reference: session.id, activatedAt: new Date() })
        .where(eq(enrollments.id, enrollmentId));
    }
  }

  if (
    (event.type === "charge.refunded" || event.type === "checkout.session.expired") &&
    enrollmentId
  ) {
    await db
      .update(enrollments)
      .set({ status: "cancelled" })
      .where(eq(enrollments.id, enrollmentId));
  }

  return json({ received: true });
};

export const config: Config = {
  path: "/api/stripe/webhook",
};
