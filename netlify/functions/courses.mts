import type { Config, Context } from "@netlify/functions";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { courses, enrollments, lessonProgress, lessons } from "../../db/schema.js";
import { currentUser, json } from "../lib/auth.mts";

/** Cursos con acceso liberado para el usuario. */
async function activeCourseIds(userId: number): Promise<Set<number>> {
  const rows = await db
    .select({ courseId: enrollments.courseId })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.status, "active")));
  return new Set(rows.map((r) => r.courseId));
}

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") return json({ error: "Método no permitido" }, 405);

  const user = await currentUser(req);
  const slug = context.params.slug;

  if (slug) {
    const [course] = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
    if (!course || !course.published) return json({ error: "Curso no encontrado" }, 404);

    const rows = await db
      .select()
      .from(lessons)
      .where(eq(lessons.courseId, course.id))
      .orderBy(asc(lessons.position), asc(lessons.id));

    let enrollment: { status: string; provider: string } | null = null;
    let done = new Set<number>();
    if (user) {
      const [row] = await db
        .select({ status: enrollments.status, provider: enrollments.provider })
        .from(enrollments)
        .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, course.id)))
        .limit(1);
      enrollment = row || null;
      if (rows.length) {
        const progress = await db
          .select({ lessonId: lessonProgress.lessonId })
          .from(lessonProgress)
          .where(
            and(
              eq(lessonProgress.userId, user.id),
              inArray(
                lessonProgress.lessonId,
                rows.map((l) => l.id),
              ),
            ),
          );
        done = new Set(progress.map((p) => p.lessonId));
      }
    }

    const unlocked = enrollment?.status === "active";

    return json({
      course: {
        ...course,
        totalMin: rows.reduce((sum, l) => sum + l.durationMin, 0),
        lessonCount: rows.length,
      },
      enrollment,
      unlocked,
      lessons: rows.map((l) => ({
        id: l.id,
        title: l.title,
        summary: l.summary,
        durationMin: l.durationMin,
        position: l.position,
        isPreview: l.isPreview,
        locked: !unlocked && !l.isPreview,
        completed: done.has(l.id),
        content: unlocked || l.isPreview ? l.content : "",
        videoUrl: unlocked || l.isPreview ? l.videoUrl : "",
      })),
    });
  }

  const audience = new URL(req.url).searchParams.get("audience");
  const where = audience
    ? and(eq(courses.published, true), eq(courses.audience, audience))
    : eq(courses.published, true);

  const list = await db
    .select()
    .from(courses)
    .where(where)
    .orderBy(asc(courses.position), asc(courses.id));

  const allLessons = list.length
    ? await db
        .select({
          courseId: lessons.courseId,
          durationMin: lessons.durationMin,
        })
        .from(lessons)
        .where(
          inArray(
            lessons.courseId,
            list.map((c) => c.id),
          ),
        )
    : [];

  const mine = user ? await activeCourseIds(user.id) : new Set<number>();

  return json({
    courses: list.map((c) => {
      const own = allLessons.filter((l) => l.courseId === c.id);
      return {
        ...c,
        lessonCount: own.length,
        totalMin: own.reduce((sum, l) => sum + l.durationMin, 0),
        unlocked: mine.has(c.id),
      };
    }),
  });
};

export const config: Config = {
  path: ["/api/courses", "/api/courses/:slug"],
};
