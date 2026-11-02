import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { addMinutes, groupOrder, toGroupDTO } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const { groupIds } = (await request.json()) ?? {};

    const banca = await prisma.banca.findUnique({ where: { id }, include: { groups: true } });
    if (!banca) {
      return NextResponse.json({ error: "Banca não encontrada." }, { status: 404 });
    }

    const scored = await prisma.note.count({ where: { ficha: { group: { bancaId: id } } } });
    if (scored > 0) {
      return NextResponse.json({ error: "O sorteio não pode ser refeito depois que os avaliadores começaram a dar notas." }, { status: 409 });
    }

    const expected = new Set(banca.groups.map((group) => group.id));
    if (
      !Array.isArray(groupIds) ||
      groupIds.length !== expected.size ||
      new Set(groupIds).size !== expected.size ||
      !groupIds.every((groupId) => expected.has(groupId))
    ) {
      return NextResponse.json({ error: "A ordem deve conter todos os grupos da banca, sem repetição." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.draw.create({
        data: {
          evaluationId: banca.evaluationId,
          bancaId: banca.id,
          orderJson: groupIds,
          confirmed: true,
        },
      }),
      ...groupIds.map((groupId: string, index: number) =>
        prisma.group.update({
          where: { id: groupId },
          data: {
            drawPosition: index + 1,
            scheduledTime: addMinutes(banca.startsAt, index * banca.minutesPerGroup),
          },
        }),
      ),
    ]);

    const groups = await prisma.group.findMany({ where: { bancaId: id }, ...groupOrder });
    return NextResponse.json({ ok: true, groups: groups.map(toGroupDTO) });
  } catch (error) {
    console.error("Falha ao confirmar sorteio", error);
    return NextResponse.json({ error: "Falha ao confirmar a ordem do sorteio." }, { status: 500 });
  }
}
