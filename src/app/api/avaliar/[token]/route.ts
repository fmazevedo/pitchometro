import { NextResponse } from "next/server";
import { z } from "zod";
import { getCriteria } from "@/lib/data";
import { prisma } from "@/lib/prisma";

const fichaSchema = z.object({
  groupId: z.string().min(1),
  notes: z.record(z.string(), z.number().finite()),
  strengths: z.string().max(4000).default(""),
  improvements: z.string().max(4000).default(""),
  generalComment: z.string().max(4000).default(""),
});

const bodySchema = z.object({
  submit: z.boolean(),
  fichas: z.array(fichaSchema).max(200),
});

export async function PUT(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;

  const evaluator = await prisma.evaluator.findUnique({
    where: { token },
    include: { banca: { include: { evaluation: true, groups: { select: { id: true } } } } },
  });

  if (!evaluator || !evaluator.active) {
    return NextResponse.json({ error: "Link de avaliação inválido ou desativado." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados da ficha inválidos." }, { status: 400 });
  }

  const { evaluation } = evaluator.banca;
  const criteria = await getCriteria(evaluation.id);
  const criterionIds = new Set(criteria.map((criterion) => criterion.id));
  const groupIds = new Set(evaluator.banca.groups.map((group) => group.id));
  const { submit, fichas } = parsed.data;

  for (const ficha of fichas) {
    if (!groupIds.has(ficha.groupId)) {
      return NextResponse.json({ error: "Grupo não pertence a esta banca." }, { status: 400 });
    }

    for (const [criterionId, value] of Object.entries(ficha.notes)) {
      if (!criterionIds.has(criterionId) || value < evaluation.scaleMin || value > evaluation.scaleMax) {
        return NextResponse.json(
          { error: `Notas devem estar entre ${evaluation.scaleMin} e ${evaluation.scaleMax}.` },
          { status: 400 },
        );
      }
    }

    if (submit && criteria.some((criterion) => ficha.notes[criterion.id] === undefined)) {
      return NextResponse.json({ error: "Preencha todas as notas antes de enviar." }, { status: 400 });
    }
  }

  const sent = await prisma.ficha.findMany({
    where: { evaluatorId: evaluator.id, status: "ENVIADA" },
    select: { groupId: true },
  });
  const lockedGroups = new Set(sent.map((ficha) => ficha.groupId));
  const editable = fichas.filter((ficha) => !lockedGroups.has(ficha.groupId));

  if (fichas.length > 0 && editable.length === 0) {
    return NextResponse.json({ error: "Esta ficha já foi enviada e não pode mais ser alterada." }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const ficha of editable) {
        const saved = await tx.ficha.upsert({
          where: { evaluatorId_groupId: { evaluatorId: evaluator.id, groupId: ficha.groupId } },
          create: {
            evaluatorId: evaluator.id,
            groupId: ficha.groupId,
            status: submit ? "ENVIADA" : "RASCUNHO",
            strengths: ficha.strengths,
            improvements: ficha.improvements,
            generalComment: ficha.generalComment,
          },
          update: {
            status: submit ? "ENVIADA" : "RASCUNHO",
            strengths: ficha.strengths,
            improvements: ficha.improvements,
            generalComment: ficha.generalComment,
          },
        });

        await tx.note.deleteMany({ where: { fichaId: saved.id } });
        const notes = Object.entries(ficha.notes).map(([criterionId, value]) => ({
          fichaId: saved.id,
          criterionId,
          value,
        }));
        if (notes.length) {
          await tx.note.createMany({ data: notes });
        }
      }
    });
  } catch (error) {
    console.error("Falha ao salvar ficha", error);
    return NextResponse.json({ error: "Falha ao salvar a ficha. Tente novamente." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, submitted: submit, skippedLocked: fichas.length - editable.length });
}
