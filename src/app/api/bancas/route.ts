import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getDefaultEvaluation, toBancaDTO, toWallClock } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const bancas = await prisma.banca.findMany({ orderBy: { startsAt: "asc" } });
  return NextResponse.json(bancas.map(toBancaDTO));
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const { name, local, date, startsAt, minutesPerGroup } = body ?? {};

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Nome da banca é obrigatório." }, { status: 400 });
    }

    const evaluation = await getDefaultEvaluation();
    if (!evaluation) {
      return NextResponse.json({ error: "Nenhuma avaliação cadastrada. Execute o seed do banco." }, { status: 409 });
    }

    const banca = await prisma.banca.create({
      data: {
        evaluationId: evaluation.id,
        name: String(name).trim(),
        local: typeof local === "string" && local.trim() ? local.trim() : "Auditório",
        startsAt: toWallClock(
          typeof date === "string" && date ? date : new Date().toISOString().slice(0, 10),
          typeof startsAt === "string" && startsAt ? startsAt : "19:00",
        ),
        minutesPerGroup: typeof minutesPerGroup === "number" && minutesPerGroup > 0 ? minutesPerGroup : 25,
      },
    });

    return NextResponse.json(toBancaDTO(banca), { status: 201 });
  } catch (error) {
    console.error("Falha ao criar banca", error);
    return NextResponse.json({ error: "Falha ao criar banca." }, { status: 500 });
  }
}
