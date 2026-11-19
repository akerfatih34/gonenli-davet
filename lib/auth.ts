import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

export type Role = "admin" | "kapi";

const ADMIN_PIN = process.env.ADMIN_PIN || "1234";
const KAPI_PIN = process.env.KAPI_PIN || "0000";
const SECRET = process.env.AUTH_SECRET || `gs-${ADMIN_PIN}-${KAPI_PIN}`;
export const usingDefaultPins = !process.env.ADMIN_PIN || !process.env.KAPI_PIN;

const COOKIE = "gs_auth";

function sign(role: Role) {
  return createHmac("sha256", SECRET).update(role).digest("hex").slice(0, 32);
}

function eq(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function roleForPin(pin: string): Role | null {
  if (eq(pin, ADMIN_PIN)) return "admin";
  if (eq(pin, KAPI_PIN)) return "kapi";
  return null;
}

export async function setRole(role: Role) {
  const c = await cookies();
  c.set(COOKIE, `${role}.${sign(role)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearRole() {
  const c = await cookies();
  c.delete(COOKIE);
}

export async function getRole(): Promise<Role | null> {
  const c = await cookies();
  const v = c.get(COOKIE)?.value;
  if (!v) return null;
  const [role, sig] = v.split(".");
  if ((role === "admin" || role === "kapi") && sig && eq(sig, sign(role))) return role;
  return null;
}

/** need: "kapi" => kapı veya yönetici; "admin" => sadece yönetici */
export async function requireRole(need: Role): Promise<Response | null> {
  const role = await getRole();
  if (!role) return Response.json({ error: "Giriş gerekli" }, { status: 401 });
  if (need === "admin" && role !== "admin")
    return Response.json({ error: "Yetkiniz yok" }, { status: 403 });
  return null;
}
