import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "pitchometro_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

export type AdminSession = {
  id: string;
  email: string;
  name: string;
  /** AdminUser.sessionVersion at login time. */
  v: number;
  exp: number;
};

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET ausente ou com menos de 32 caracteres.");
  }
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(user: { id: string; email: string; name: string; sessionVersion: number }) {
  const session: AdminSession = {
    id: user.id,
    email: user.email,
    name: user.name,
    v: user.sessionVersion,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export const sessionCookieOptions = {
  name: ADMIN_SESSION_COOKIE,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ADMIN_SESSION_MAX_AGE,
};

/** Checks signature and expiry only; callers that need revocation must also compare `v` with the database. */
export function verifySessionToken(token?: string | null): AdminSession | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as AdminSession;
    if (typeof session.exp !== "number" || session.exp < Date.now() / 1000) {
      return null;
    }
    return { ...session, v: typeof session.v === "number" ? session.v : 0 };
  } catch {
    return null;
  }
}
