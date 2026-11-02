import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppUrl, sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const RESET_TTL_MINUTES = 30;
const RESEND_COOLDOWN_MS = 60_000;

const bodySchema = z.object({ email: z.string().email() });

// Same answer whether or not the email exists, so the endpoint cannot be used to discover admin accounts.
const GENERIC_RESPONSE = {
  ok: true,
  message: "Se este e-mail estiver cadastrado, você receberá em instantes um link para redefinir a senha.",
};

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const admin = await prisma.adminUser.findUnique({ where: { email } });

  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const recent = await prisma.passwordResetToken.findFirst({
    where: { adminId: admin.id, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
  });
  if (recent) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { adminId: admin.id, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: {
        adminId: admin.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
      },
    }),
  ]);

  const link = `${getAppUrl()}/redefinir-senha?token=${token}`;

  try {
    await sendEmail({
      to: admin.email,
      subject: "Redefinição de senha — Pitchômetro",
      text: [
        `Olá, ${admin.name}.`,
        "",
        "Recebemos um pedido para redefinir a senha da sua conta de administrador no Pitchômetro.",
        `Para criar uma nova senha, acesse o link abaixo (válido por ${RESET_TTL_MINUTES} minutos):`,
        link,
        "",
        "Se você não fez este pedido, ignore este e-mail. Sua senha atual continua valendo.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#0e2434">
          <h2 style="color:#13235c">Redefinição de senha</h2>
          <p>Olá, ${escapeHtml(admin.name)}.</p>
          <p>Recebemos um pedido para redefinir a senha da sua conta de administrador no <b>Pitchômetro</b>.</p>
          <p style="margin:28px 0">
            <a href="${link}" style="background:#ea6f1f;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">
              Criar nova senha
            </a>
          </p>
          <p style="color:#475d6c;font-size:14px">O link é válido por ${RESET_TTL_MINUTES} minutos e só pode ser usado uma vez.</p>
          <p style="color:#475d6c;font-size:14px">Se você não fez este pedido, ignore este e-mail. Sua senha atual continua valendo.</p>
        </div>`,
    });
  } catch (error) {
    console.error("Falha ao enviar e-mail de redefinição de senha", error);
    return NextResponse.json(
      { error: "Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos ou fale com o suporte." },
      { status: 503 },
    );
  }

  return NextResponse.json(GENERIC_RESPONSE);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}
