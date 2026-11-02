import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, hashPassword, newPasswordSchema } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { createSessionToken, sessionCookieOptions } from "@/lib/session";

const bodySchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual."),
  newPassword: newPasswordSchema,
});

/** Changes the logged-in admin's password, ends every other session and keeps this one signed in. */
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;
  const admin = await prisma.adminUser.findUnique({ where: { id: session.id } });
  if (!admin) {
    return NextResponse.json({ error: "Administrador não encontrado." }, { status: 404 });
  }

  if (!(await bcrypt.compare(currentPassword, admin.passwordHash))) {
    return NextResponse.json({ error: "A senha atual está incorreta." }, { status: 400 });
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "A nova senha deve ser diferente da atual." }, { status: 400 });
  }

  const updated = await prisma.adminUser.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(newPassword), sessionVersion: { increment: 1 } },
  });
  await prisma.passwordResetToken.deleteMany({ where: { adminId: admin.id } });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({ ...sessionCookieOptions, value: createSessionToken(updated) });
  return response;
}
