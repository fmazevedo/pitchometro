import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export const PASSWORD_MIN_LENGTH = 12;

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A nova senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(200, "A nova senha é longa demais.");

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyAdminCredentials(email: string, password: string) {
  const admin = await prisma.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!admin || admin.role !== "ADMIN") {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  return { id: admin.id, email: admin.email, name: admin.name, sessionVersion: admin.sessionVersion };
}

/** Valid signed session whose version still matches the database (password changes revoke older sessions). */
export async function getAdminSession() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) return null;

  const admin = await prisma.adminUser.findUnique({
    where: { id: session.id },
    select: { sessionVersion: true, role: true },
  });

  if (!admin || admin.role !== "ADMIN" || admin.sessionVersion !== session.v) {
    return null;
  }

  return session;
}

/** Returns a 401 response when there is no valid admin session, or null when the request may proceed. */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 401 });
  }
  return null;
}
