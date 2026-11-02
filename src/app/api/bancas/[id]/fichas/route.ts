import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/** Removes every ficha (and its notes, via cascade) of the banca so the evaluation cycle can start over. */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await context.params;
  const banca = await prisma.banca.findUnique({ where: { id } });

  if (!banca) {
    return NextResponse.json({ error: "Banca não encontrada." }, { status: 404 });
  }

  const deleted = await prisma.ficha.deleteMany({ where: { group: { bancaId: id } } });
  return NextResponse.json({ ok: true, deletedFichas: deleted.count });
}
