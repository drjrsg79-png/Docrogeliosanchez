import type { Config, Context } from "@netlify/functions";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { courses, enrollments, lessonProgress, lessons } from "../../db/schema.js";
import { currentUser, json } from "../lib/auth.mts";

export default async (req: Request, context: Context) => {
  const user = await currentUser(req);
  if (!user) return json({ error: "Inicia sesión para continuar" }, 401);

  // ── Marcar / desmarcar una lección ──────────────────────────────────
  if (context.params.section === "progress") {
    if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    const lessonId = Number(body.lessonId || 0);
    const completed = body.completed !== false;
    if (!lessonId) return json({ error: "Lección no válida" }, 400);

    // Sólo cuenta el avance de un curso pagado.
    const [lesson] = await db
      .select({ courseId: lessons.courseId })
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);
    if (!lesson) return json({ error: "Lección no encontrada" }, 404);

    const [access] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, user.id),
          eq(enrollments.courseId, lesson.courseId),
          eq(enrollments.status, "active"),
        ),
      )
      .limit(1);
    if (!access) return json({ error: "Este curso aún no está pagado" }, 403);

    if (completed) {
      await db
        .insert(lessonProgress)
        .values({ userId: user.id, lessonId })
        .onConflictDoNothing();
    } else {
      await db
        .delete(lessonProgress)
        .where(
          and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lessonId)),
        );
    }
    return json({ ok: true, completed });
  }

  // ── Mis cursos ──────────────────────────────────────────────────────
  const rows = await db
    .select({
      enrollment: enrollments,
      course: courses,
    })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(eq(enrollments.userId, user.id))
    .orderBy(desc(enrollments.createdAt));

  const courseIds = rows.map((r) => r.course.id);
  const allLessons = courseIds.length
    ? await db
        .select({ id: lessons.id, courseId: lessons.courseId })
        .from(lessons)
        .where(inArray(lessons.courseId, courseIds))
        .orderBy(asc(lessons.position))
    : [];

  const done = allLessons.length
    ? await db
        .select({ lessonId: lessonProgress.lessonId })
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.userId, user.id),
            inArray(
              lessonProgress.lessonId,
              allLessons.map((l) => l.id),
            ),
          ),
        )
    : [];
  const doneSet = new Set(done.map((d) => d.lessonId));

  return json({
    items: rows.map(({ enrollment, course }) => {
      const own = allLessons.filter((l) => l.courseId === course.id);
      const completed = own.filter((l) => doneSet.has(l.id)).length;
      return {
        status: enrollment.status,
        provider: enrollment.provider,
        reference: enrollment.reference,
        amountCents: enrollment.amountCents,
        currency: enrollment.currency,
        createdAt: enrollment.createdAt,
        course: {
          slug: course.slug,
          title: course.title,
          tagline: course.tagline,
          audience: course.audience,
          accent: course.accent,
          level: course.level,
        },
        lessonCount: own.length,
        completedCount: completed,
      };
    }),
  });
};

export const config: Config = {
  path: ["/api/my/:section", "/api/my"],
};
