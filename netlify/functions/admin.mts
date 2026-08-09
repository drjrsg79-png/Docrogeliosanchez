import type { Config, Context } from "@netlify/functions";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { courses, enrollments, lessonProgress, lessons, users } from "../../db/schema.js";
import { isAdmin, json } from "../lib/auth.mts";
import { slugify } from "../lib/format.mts";

export default async (req: Request, context: Context) => {
  if (!process.env.ADMIN_PASSWORD) {
    return json({ error: "Falta configurar ADMIN_PASSWORD en el proyecto" }, 503);
  }
  if (!isAdmin(req)) return json({ error: "Contraseña incorrecta" }, 401);

  const action = context.params.action;
  const body =
    req.method === "POST"
      ? await req.json().catch(() => ({}) as Record<string, any>)
      : ({} as Record<string, any>);

  // ── Panel ───────────────────────────────────────────────────────────
  if (action === "overview") {
    const courseRows = await db
      .select()
      .from(courses)
      .orderBy(asc(courses.audience), asc(courses.position));

    const lessonRows = await db
      .select()
      .from(lessons)
      .orderBy(asc(lessons.courseId), asc(lessons.position));

    const enrollmentRows = await db
      .select({
        id: enrollments.id,
        status: enrollments.status,
        provider: enrollments.provider,
        reference: enrollments.reference,
        amountCents: enrollments.amountCents,
        currency: enrollments.currency,
        createdAt: enrollments.createdAt,
        userName: users.name,
        userEmail: users.email,
        userAudience: users.audience,
        courseTitle: courses.title,
        courseSlug: courses.slug,
      })
      .from(enrollments)
      .innerJoin(users, eq(users.id, enrollments.userId))
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .orderBy(desc(enrollments.createdAt))
      .limit(200);

    const [{ count: userCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    const paid = enrollmentRows.filter((e) => e.status === "active");

    return json({
      courses: courseRows,
      lessons: lessonRows,
      enrollments: enrollmentRows,
      stats: {
        users: userCount,
        active: paid.length,
        pending: enrollmentRows.filter((e) => e.status === "pending").length,
        revenueCents: paid.reduce((sum, e) => sum + e.amountCents, 0),
        stripeReady: Boolean(process.env.STRIPE_SECRET_KEY),
      },
    });
  }

  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  // ── Cursos ──────────────────────────────────────────────────────────
  if (action === "course") {
    const values = {
      title: String(body.title || "").trim(),
      tagline: String(body.tagline || "").trim(),
      description: String(body.description || "").trim(),
      audience: body.audience === "doctor" ? "doctor" : "patient",
      level: String(body.level || "Básico"),
      priceCents: Math.max(0, Math.round(Number(body.priceCents) || 0)),
      currency: String(body.currency || "MXN").toUpperCase(),
      accent: String(body.accent || "#B4562A"),
      published: body.published !== false,
      position: Math.round(Number(body.position) || 0),
    };
    if (!values.title) return json({ error: "El curso necesita título" }, 400);

    if (body.id) {
      const [row] = await db
        .update(courses)
        .set(values)
        .where(eq(courses.id, Number(body.id)))
        .returning();
      return json({ course: row });
    }

    const slug = slugify(body.slug || values.title) || `curso-${Date.now()}`;
    const [row] = await db
      .insert(courses)
      .values({ ...values, slug })
      .returning();
    return json({ course: row }, 201);
  }

  if (action === "course-delete") {
    await db.delete(courses).where(eq(courses.id, Number(body.id)));
    return json({ ok: true });
  }

  // ── Lecciones ───────────────────────────────────────────────────────
  if (action === "lesson") {
    const values = {
      courseId: Number(body.courseId),
      title: String(body.title || "").trim(),
      summary: String(body.summary || "").trim(),
      content: String(body.content || ""),
      videoUrl: String(body.videoUrl || "").trim(),
      durationMin: Math.max(1, Math.round(Number(body.durationMin) || 10)),
      position: Math.round(Number(body.position) || 0),
      isPreview: Boolean(body.isPreview),
    };
    if (!values.title || !values.courseId) {
      return json({ error: "Faltan el curso o el título de la lección" }, 400);
    }

    if (body.id) {
      const [row] = await db
        .update(lessons)
        .set(values)
        .where(eq(lessons.id, Number(body.id)))
        .returning();
      return json({ lesson: row });
    }
    const [row] = await db.insert(lessons).values(values).returning();
    return json({ lesson: row }, 201);
  }

  if (action === "lesson-delete") {
    await db.delete(lessonProgress).where(eq(lessonProgress.lessonId, Number(body.id)));
    await db.delete(lessons).where(eq(lessons.id, Number(body.id)));
    return json({ ok: true });
  }

  // ── Inscripciones: liberar o cancelar acceso a mano ─────────────────
  if (action === "enrollment") {
    const status = ["active", "pending", "cancelled"].includes(body.status)
      ? body.status
      : "pending";
    const [row] = await db
      .update(enrollments)
      .set({
        status,
        activatedAt: status === "active" ? new Date() : null,
      })
      .where(eq(enrollments.id, Number(body.id)))
      .returning();
    return json({ enrollment: row });
  }

  return json({ error: "Acción no encontrada" }, 404);
};

export const config: Config = {
  path: "/api/admin/:action",
};
