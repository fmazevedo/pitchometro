import { NextResponse } from "next/server";
import { getAdminSession, hashPassword, newPasswordSchema } from "@/lib/admin-auth";
import { adminProfileSchema } from "@/lib/admin-users";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 401 });
  }

  const admins = await prisma.adminUser.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return NextResponse.json(admins.map((admin) => ({ ...admin, isCurrent: admin.id === session.id })));
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 401 });
  }

  const parsed = adminProfileSchema
    .extend({ password: newPasswordSchema })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  if (await prisma.adminUser.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "Já existe um administrador com este e-mail." }, { status: 409 });
  }

  const admin = await prisma.adminUser.create({
    data: { name, email, passwordHash: await hashPassword(password), role: "ADMIN" },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return NextResponse.json({ ...admin, isCurrent: false }, { status: 201 });
}
