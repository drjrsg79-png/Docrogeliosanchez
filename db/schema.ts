import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/** Cuentas de la plataforma. `audience` distingue paciente de médico. */
export const users = pgTable("users", {
  id: serial().primaryKey(),
  email: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text().notNull(),
  audience: text().notNull().default("patient"), // 'patient' | 'doctor'
  profession: text().default(""), // especialidad o cédula, sólo médicos
  createdAt: timestamp("created_at").defaultNow(),
});

/** Curso de pago. El precio vive aquí, en centavos. */
export const courses = pgTable("courses", {
  id: serial().primaryKey(),
  slug: text().notNull().unique(),
  title: text().notNull(),
  tagline: text().notNull().default(""),
  description: text().notNull().default(""),
  audience: text().notNull().default("patient"), // 'patient' | 'doctor'
  level: text().notNull().default("Básico"),
  priceCents: integer("price_cents").notNull().default(0),
  currency: text().notNull().default("MXN"),
  accent: text().notNull().default("#B4562A"),
  published: boolean().notNull().default(true),
  position: integer().notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Lecciones de un curso. `isPreview` la deja abierta sin pagar. */
export const lessons = pgTable("lessons", {
  id: serial().primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text().notNull(),
  summary: text().notNull().default(""),
  content: text().notNull().default(""),
  videoUrl: text("video_url").default(""),
  durationMin: integer("duration_min").notNull().default(10),
  position: integer().notNull().default(0),
  isPreview: boolean("is_preview").notNull().default(false),
});

/**
 * Inscripción a un curso. `pending` = pago iniciado o transferencia por
 * confirmar; `active` = acceso liberado.
 */
export const enrollments = pgTable(
  "enrollments",
  {
    id: serial().primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    status: text().notNull().default("pending"), // 'pending' | 'active' | 'cancelled'
    provider: text().notNull().default("stripe"), // 'stripe' | 'transfer' | 'admin'
    reference: text().default(""), // id de sesión de Stripe u observación
    amountCents: integer("amount_cents").notNull().default(0),
    currency: text().notNull().default("MXN"),
    createdAt: timestamp("created_at").defaultNow(),
    activatedAt: timestamp("activated_at"),
  },
  (t) => [unique("enrollments_user_course_unique").on(t.userId, t.courseId)],
);

/** Avance del alumno, una fila por lección terminada. */
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: serial().primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at").defaultNow(),
  },
  (t) => [unique("lesson_progress_user_lesson_unique").on(t.userId, t.lessonId)],
);
