import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import {
  clearCookie,
  createToken,
  currentUser,
  hashPassword,
  json,
  sessionCookie,
  verifyPassword,
} from "../lib/auth.mts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async (req: Request, context: Context) => {
  const action = context.params.action;

  if (action === "me") {
    const user = await currentUser(req);
    return json({ user });
  }

  if (action === "logout") {
    return json({ ok: true }, 200, { "Set-Cookie": clearCookie(req) });
  }

  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  const body = await req.json().catch(() => ({}) as Record<string, string>);

  if (action === "register") {
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const audience = body.audience === "doctor" ? "doctor" : "patient";
    const profession = String(body.profession || "").trim();

    if (name.length < 3) return json({ error: "Escribe tu nombre completo" }, 400);
    if (!EMAIL_RE.test(email)) return json({ error: "Correo no válido" }, 400);
    if (password.length < 8)
      return json({ error: "La contraseña necesita al menos 8 caracteres" }, 400);

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing) return json({ error: "Ese correo ya tiene una cuenta" }, 409);

    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash: hashPassword(password), audience, profession })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        audience: users.audience,
        profession: users.profession,
      });

    return json({ user }, 201, { "Set-Cookie": sessionCookie(req, createToken(user.id)) });
  }

  if (action === "login") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!row || !verifyPassword(password, row.passwordHash)) {
      return json({ error: "Correo o contraseña incorrectos" }, 401);
    }

    const user = {
      id: row.id,
      email: row.email,
      name: row.name,
      audience: row.audience,
      profession: row.profession,
    };
    return json({ user }, 200, { "Set-Cookie": sessionCookie(req, createToken(row.id)) });
  }

  return json({ error: "Acción no encontrada" }, 404);
};

export const config: Config = {
  path: "/api/auth/:action",
};
