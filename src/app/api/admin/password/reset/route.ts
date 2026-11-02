import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, newPasswordSchema } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  token: z.string().min(20),
  newPassword: newPasswordSchema,
});

const INVALID_LINK = "Este link de redefinição é inválido ou expirou. Solicite um novo.";

/** Sets a new password from an emailed reset link and ends every existing session. */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const tokenIssue = parsed.error.issues.some((issue) => issue.path[0] === "token");
    return NextResponse.json(
      { error: tokenIssue ? INVALID_LINK : (parsed.error.issues[0]?.message ?? "Dados inválidos.") },
      { status: 400 },
    );
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);

  // Marking the token as used inside the same transaction makes the link single-use even under concurrent requests.
  const claimed = await prisma.$transaction(async (tx) => {
    const marked = await tx.passwordResetToken.updateMany({
      where: { id: reset.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (!marked.count) return false;

    await tx.adminUser.update({
      where: { id: reset.adminId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await tx.passwordResetToken.deleteMany({ where: { adminId: reset.adminId, id: { not: reset.id } } });
    return true;
  });

  if (!claimed) {
    return NextResponse.json({ error: INVALID_LINK }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
