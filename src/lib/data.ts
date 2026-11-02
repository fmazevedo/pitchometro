import { randomBytes } from "node:crypto";
import type { Banca, Criterion, Evaluation, Evaluator, Ficha, Group, Note, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Dates and times are stored as "wall clock" values in UTC: 2026-11-15T20:30Z means 20:30 local time.

export type EvaluationDTO = {
  id: string;
  name: string;
  discipline: string;
  turma: string;
  status: Evaluation["status"];
  scaleMin: number;
  scaleMax: number;
};

export type CriterionDTO = {
  id: string;
  order: number;
  name: string;
  description: string;
  weight: number;
};

export type BancaDTO = {
  id: string;
  evaluationId: string;
  name: string;
  local: string;
  date: string;
  startsAt: string;
  minutesPerGroup: number;
};

export type EvaluatorDTO = {
  id: string;
  bancaId: string;
  name: string;
  role: string;
  company: string;
  token: string;
  active: boolean;
};

export type GroupDTO = {
  id: string;
  bancaId: string;
  name: string;
  project: string;
  track: string;
  description: string;
  members: string[];
  feedbackToken: string;
  drawPosition: number | null;
  scheduledTime: string;
  durationMinutes: number;
};

export type FichaDTO = {
  id: string;
  evaluatorId: string;
  groupId: string;
  status: Ficha["status"];
  hidden: boolean;
  strengths: string;
  improvements: string;
  generalComment: string;
  notes: Record<string, number>;
};

export const GROUP_DESCRIPTION_MAX = 2000;

/** Normalizes a description from a request body: undefined when absent, null when cleared. */
export function parseDescription(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, GROUP_DESCRIPTION_MAX);
  return trimmed || null;
}

export function newToken() {
  return randomBytes(16).toString("hex");
}

export function toWallClock(date: string, time: string) {
  const parsed = new Date(`${date}T${time}:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Data ou horário inválido.");
  }
  return parsed;
}

export function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60_000);
}

const formatDate = (value: Date) => value.toISOString().slice(0, 10);
const formatTime = (value: Date) => value.toISOString().slice(11, 16);

export const toEvaluationDTO = (item: Evaluation): EvaluationDTO => ({
  id: item.id,
  name: item.name,
  discipline: item.discipline,
  turma: item.turma,
  status: item.status,
  scaleMin: item.scaleMin,
  scaleMax: item.scaleMax,
});

export const toCriterionDTO = (item: Criterion): CriterionDTO => ({
  id: item.id,
  order: item.order,
  name: item.name,
  description: item.description,
  weight: Number(item.weight),
});

export const toBancaDTO = (item: Banca): BancaDTO => ({
  id: item.id,
  evaluationId: item.evaluationId,
  name: item.name,
  local: item.local,
  date: formatDate(item.startsAt),
  startsAt: formatTime(item.startsAt),
  minutesPerGroup: item.minutesPerGroup,
});

export const toEvaluatorDTO = (item: Evaluator): EvaluatorDTO => ({
  id: item.id,
  bancaId: item.bancaId,
  name: item.name,
  role: item.role,
  company: item.company,
  token: item.token,
  active: item.active,
});

export const toGroupDTO = (item: Group): GroupDTO => ({
  id: item.id,
  bancaId: item.bancaId,
  name: item.name,
  project: item.project,
  track: item.track,
  description: item.description ?? "",
  members: item.members,
  feedbackToken: item.feedbackToken,
  drawPosition: item.drawPosition,
  scheduledTime: item.scheduledTime ? formatTime(item.scheduledTime) : "",
  durationMinutes: item.durationMinutes,
});

export const toFichaDTO = (item: Ficha & { notes: Note[] }): FichaDTO => ({
  id: item.id,
  evaluatorId: item.evaluatorId,
  groupId: item.groupId,
  status: item.status,
  hidden: item.hidden,
  strengths: item.strengths ?? "",
  improvements: item.improvements ?? "",
  generalComment: item.generalComment ?? "",
  notes: Object.fromEntries(item.notes.map((note) => [note.criterionId, Number(note.value)])),
});

export const groupOrder: { orderBy: Prisma.GroupOrderByWithRelationInput[] } = {
  orderBy: [{ drawPosition: { sort: "asc", nulls: "last" } }, { name: "asc" }],
};

export async function getDefaultEvaluation() {
  return prisma.evaluation.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function getCriteria(evaluationId: string) {
  const criteria = await prisma.criterion.findMany({ where: { evaluationId }, orderBy: { order: "asc" } });
  return criteria.map(toCriterionDTO);
}
