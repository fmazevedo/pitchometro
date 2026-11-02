import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { newToken, toEvaluatorDTO } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const { name, role, company, active, regenerateToken } = (await request.json()) ?? {};

    const exists = await prisma.evaluator.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json({ error: "Avaliador não encontrado." }, { status: 404 });
    }

    const evaluator = await prisma.evaluator.update({
      where: { id },
      data: {
        name: typeof name === "string" && name.trim() ? name.trim() : undefined,
        role: typeof role === "string" && role.trim() ? role.trim() : undefined,
        company: typeof company === "string" && company.trim() ? company.trim() : undefined,
        active: typeof active === "boolean" ? active : undefined,
        token: regenerateToken === true ? newToken() : undefined,
      },
    });

    return NextResponse.json(toEvaluatorDTO(evaluator));
  } catch (error) {
    console.error("Falha ao atualizar avaliador", error);
    return NextResponse.json({ error: "Falha ao atualizar avaliador." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await context.params;
  const deleted = await prisma.evaluator.deleteMany({ where: { id } });

  if (!deleted.count) {
    return NextResponse.json({ error: "Avaliador não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
