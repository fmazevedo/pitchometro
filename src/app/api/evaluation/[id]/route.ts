import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { toEvaluationDTO } from "@/lib/data";
import { prisma } from "@/lib/prisma";

const STATUSES = ["RASCUNHO", "ABERTA", "ENCERRADA", "PUBLICADA"] as const;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await context.params;
  const { status } = (await request.json()) ?? {};

  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  const updated = await prisma.evaluation.updateMany({ where: { id }, data: { status } });
  if (!updated.count) {
    return NextResponse.json({ error: "Avaliação não encontrada." }, { status: 404 });
  }

  return NextResponse.json(toEvaluationDTO(await prisma.evaluation.findUniqueOrThrow({ where: { id } })));
}
