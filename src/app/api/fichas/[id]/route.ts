import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await context.params;
  const { hidden } = (await request.json()) ?? {};

  if (typeof hidden !== "boolean") {
    return NextResponse.json({ error: "Informe se a ficha deve ficar oculta." }, { status: 400 });
  }

  const updated = await prisma.ficha.updateMany({ where: { id }, data: { hidden } });
  if (!updated.count) {
    return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, hidden });
}
