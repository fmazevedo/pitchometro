import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { adminProfileSchema } from "@/lib/admin-users";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = adminProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Administrador não encontrado." }, { status: 404 });
  }

  const { name, email } = parsed.data;
  const emailOwner = await prisma.adminUser.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== id) {
    return NextResponse.json({ error: "Já existe um administrador com este e-mail." }, { status: 409 });
  }

  const updated = await prisma.adminUser.update({
    where: { id },
    data: { name, email },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return NextResponse.json({ ...updated, isCurrent: id === session.id });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 401 });
  }

  const { id } = await context.params;
  if (id === session.id) {
    return NextResponse.json({ error: "Você não pode excluir a própria conta." }, { status: 400 });
  }

  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Administrador não encontrado." }, { status: 404 });
  }

  if ((await prisma.adminUser.count({ where: { role: "ADMIN" } })) <= 1) {
    return NextResponse.json({ error: "O sistema precisa ter pelo menos um administrador." }, { status: 400 });
  }

  // Sessions are checked against the database, so deleting the account ends them immediately.
  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
