import { createHmac, randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";

const COOKIE = "drs_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function secret(): string {
  const raw =
    process.env.AUTH_SECRET ||
    process.env.NETLIFY_DB_URL ||
    process.env.SITE_ID ||
    "dr-rogelio-sanchez-cursos";
  return createHash("sha256").update(raw).digest("hex");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createToken(userId: number): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string): number | null {
  const [payload, signature] = (token || "").split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return Number(data.uid) || null;
  } catch {
    return null;
  }
}

export function sessionCookie(req: Request, token: string): string {
  const secure = new URL(req.url).protocol === "https:" ? " Secure;" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export function clearCookie(req: Request): string {
  const secure = new URL(req.url).protocol === "https:" ? " Secure;" : "";
  return `${COOKIE}=; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=0`;
}

function cookieValue(req: Request): string {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return rest.join("=");
  }
  return "";
}

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  audience: string;
  profession: string | null;
};

/** Devuelve el usuario de la sesión, o null si no hay cookie válida. */
export async function currentUser(req: Request): Promise<SessionUser | null> {
  const userId = readToken(cookieValue(req));
  if (!userId) return null;
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      audience: users.audience,
      profession: users.profession,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row || null;
}

export function isAdmin(req: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  const given =
    req.headers.get("x-admin-password") ||
    new URL(req.url).searchParams.get("admin") ||
    "";
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers });
}
