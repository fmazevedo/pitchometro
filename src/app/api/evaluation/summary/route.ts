import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  groupOrder,
  toBancaDTO,
  toEvaluationDTO,
  toEvaluatorDTO,
  toFichaDTO,
  toGroupDTO,
  getCriteria,
} from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { average, formatDecimal, getCriterionAverage, getGroupFinalScore, getSentFichas } from "@/lib/utils";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const bancaId = searchParams.get("bancaId");

  const banca = bancaId
    ? await prisma.banca.findUnique({ where: { id: bancaId } })
    : await prisma.banca.findFirst({ orderBy: { startsAt: "asc" } });

  if (!banca) {
    return NextResponse.json({ error: "Banca não encontrada." }, { status: 404 });
  }

  const [evaluation, criteria, groupRows, evaluatorRows, fichaRows] = await Promise.all([
    prisma.evaluation.findUniqueOrThrow({ where: { id: banca.evaluationId } }),
    getCriteria(banca.evaluationId),
    prisma.group.findMany({ where: { bancaId: banca.id }, ...groupOrder }),
    prisma.evaluator.findMany({ where: { bancaId: banca.id }, orderBy: { name: "asc" } }),
    prisma.ficha.findMany({ where: { group: { bancaId: banca.id } }, include: { notes: true } }),
  ]);

  const groups = groupRows.map(toGroupDTO);
  const evaluators = evaluatorRows.map(toEvaluatorDTO);
  const fichas = fichaRows.map(toFichaDTO);

  const groupScores = groups.map((group) => ({
    group,
    finalScore: getGroupFinalScore(fichas, group.id, criteria),
    sentCount: getSentFichas(fichas, group.id).length,
  }));

  const criteriaRows = criteria.map((criterion) => ({
    criterion,
    average: average(
      groups
        .map((group) => getSentFichas(fichas, group.id))
        .filter((groupFichas) => groupFichas.length)
        .map((groupFichas) => getCriterionAverage(groupFichas, criterion.id)),
    ),
  }));

  const leadingScore = groupScores.length ? Math.max(...groupScores.map(({ finalScore }) => finalScore)) : 0;

  return NextResponse.json({
    evaluation: toEvaluationDTO(evaluation),
    banca: toBancaDTO(banca),
    criteria,
    groups,
    evaluators,
    fichas,
    stats: {
      groupsCount: groups.length,
      evaluatorsCount: evaluators.filter((evaluator) => evaluator.active).length,
      sentFichasCount: fichas.filter((ficha) => ficha.status === "ENVIADA").length,
      leadingScore,
      leadingScoreLabel: formatDecimal(leadingScore),
    },
    groupScores,
    criteriaRows,
  });
}
