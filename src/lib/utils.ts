import type { CriterionDTO, FichaDTO } from "@/lib/data";

export function average(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function formatDecimal(value: number, digits = 2) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function getWeightedScore(notes: Record<string, number | undefined>, criteria: CriterionDTO[]) {
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (!totalWeight) return 0;

  return criteria.reduce((total, criterion) => {
    const note = notes[criterion.id] ?? 0;
    return total + note * (criterion.weight / totalWeight);
  }, 0);
}

export function getSentFichas(fichas: FichaDTO[], groupId: string) {
  return fichas.filter((ficha) => ficha.groupId === groupId && ficha.status === "ENVIADA");
}

export function getGroupFinalScore(fichas: FichaDTO[], groupId: string, criteria: CriterionDTO[]) {
  return average(getSentFichas(fichas, groupId).map((ficha) => getWeightedScore(ficha.notes, criteria)));
}

export function getCriterionAverage(fichas: FichaDTO[], criterionId: string) {
  return average(fichas.map((ficha) => ficha.notes[criterionId] ?? 0));
}

export function createCsvDownload(filename: string, rows: string[][]) {
  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
