import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { newToken, toEvaluatorDTO } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const bancaId = searchParams.get("bancaId");

  if (!bancaId) {
    return NextResponse.json([]);
  }

  const evaluators = await prisma.evaluator.findMany({ where: { bancaId }, orderBy: { name: "asc" } });
  return NextResponse.json(evaluators.map(toEvaluatorDTO));
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const { bancaId, name, role, company } = body ?? {};

    if (!bancaId || !name || !String(name).trim()) {
      return NextResponse.json({ error: "Banca e nome do avaliador são obrigatórios." }, { status: 400 });
    }

    const banca = await prisma.banca.findUnique({ where: { id: String(bancaId) } });
    if (!banca) {
      return NextResponse.json({ error: "Banca não encontrada." }, { status: 404 });
    }

    const evaluator = await prisma.evaluator.create({
      data: {
        bancaId: banca.id,
        name: String(name).trim(),
        role: typeof role === "string" && role.trim() ? role.trim() : "Avaliador",
        company: typeof company === "string" && company.trim() ? company.trim() : "Organização",
        token: newToken(),
      },
    });

    return NextResponse.json(toEvaluatorDTO(evaluator), { status: 201 });
  } catch (error) {
    console.error("Falha ao criar avaliador", error);
    return NextResponse.json({ error: "Falha ao criar avaliador." }, { status: 500 });
  }
}
