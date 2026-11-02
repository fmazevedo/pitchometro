"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CriterionDTO, EvaluationDTO, FichaDTO, GroupDTO } from "@/lib/data";
import { formatDecimal, getWeightedScore } from "@/lib/utils";
import { ProjectInfo } from "../project-info";

type Props = {
  token: string;
  evaluator: { name: string; role: string; company: string };
  bancaName: string;
  evaluation: EvaluationDTO;
  criteria: CriterionDTO[];
  group: GroupDTO;
  position: number;
  total: number;
  previousGroupId: string | null;
  nextGroupId: string | null;
  ficha: FichaDTO | null;
};

export function GroupEvaluationForm({
  token,
  evaluator,
  bancaName,
  evaluation,
  criteria,
  group,
  position,
  total,
  previousGroupId,
  nextGroupId,
  ficha,
}: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, number | undefined>>(ficha?.notes ?? {});
  const [strengths, setStrengths] = useState(ficha?.strengths ?? "");
  const [improvements, setImprovements] = useState(ficha?.improvements ?? "");
  const [generalComment, setGeneralComment] = useState(ficha?.generalComment ?? "");
  const [locked, setLocked] = useState(ficha?.status === "ENVIADA");
  const [status, setStatus] = useState(locked ? "Ficha enviada" : ficha ? "Rascunho carregado" : "Nova ficha");
  const [saving, setSaving] = useState(false);

  const indexHref = `/avaliar/${token}`;
  const weighted = getWeightedScore(notes, criteria);

  const handleScoreChange = (criterionId: string, raw: string) => {
    const value = raw === "" ? undefined : Math.min(evaluation.scaleMax, Math.max(evaluation.scaleMin, Number(raw)));
    setNotes((current) => ({ ...current, [criterionId]: value }));
    setStatus("Alterações não salvas");
  };

  const save = async (submit: boolean) => {
    if (submit && !window.confirm(`Depois de enviada, a ficha de ${group.name} não poderá mais ser alterada. Deseja enviar?`)) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/avaliar/${encodeURIComponent(token)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submit,
          fichas: [
            {
              groupId: group.id,
              notes: Object.fromEntries(Object.entries(notes).filter(([, value]) => value !== undefined)),
              strengths,
              improvements,
              generalComment,
            },
          ],
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setStatus(payload.error ?? "Não foi possível salvar a ficha.");
        return;
      }

      if (submit) {
        setLocked(true);
        setStatus("Ficha enviada. Obrigado!");
      } else {
        setStatus(`Rascunho salvo às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
      }
      router.refresh();
    } catch {
      setStatus("Sem conexão. Tente salvar novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page-shell review-shell">
      <section className="hero-panel glass-card">
        <div>
          <Link href={indexHref} className="eyebrow">← Todos os grupos</Link>
          <h1>{group.name}</h1>
          <p>
            {group.project} · {group.track}
            {group.scheduledTime ? ` · ${group.scheduledTime}` : ""} · Grupo {position} de {total}
          </p>
          <p>
            Avaliador: {evaluator.name} · {evaluator.role} · {evaluator.company} · {bancaName}
          </p>
        </div>
        <div className="status-pill" role="status">{status}</div>
      </section>

      <section className="review-list">
        {group.description || group.members.length ? (
          <details className="glass-card project-details project-details-card" open>
            <summary>Sobre o projeto {group.project}</summary>
            <ProjectInfo group={group} />
          </details>
        ) : null}

        <article className="glass-card review-card">
          <div className="panel-header review-header">
            <div>
              <h2>Notas por critério</h2>
              <span>
                Escala de {evaluation.scaleMin} a {evaluation.scaleMax}
              </span>
            </div>
            <div className="score-summary">
              <strong>{formatDecimal(weighted)}</strong>
              <small>{locked ? "Enviada" : "Nota ponderada"}</small>
            </div>
          </div>

          <div className="review-grid">
            {criteria.map((criterion) => {
              const score = notes[criterion.id];
              return (
                <div key={criterion.id} className="criterion-box">
                  <div className="criterion-copy">
                    <label htmlFor={criterion.id}>{criterion.name}</label>
                    <small>
                      {criterion.weight}% · {criterion.description}
                    </small>
                  </div>
                  <div className="input-row">
                    <input
                      type="range"
                      min={evaluation.scaleMin}
                      max={evaluation.scaleMax}
                      step={0.5}
                      value={score ?? evaluation.scaleMin}
                      disabled={locked}
                      aria-label={`${criterion.name} (controle deslizante)`}
                      onChange={(event) => handleScoreChange(criterion.id, event.target.value)}
                    />
                    <input
                      id={criterion.id}
                      type="number"
                      min={evaluation.scaleMin}
                      max={evaluation.scaleMax}
                      step={0.5}
                      value={score ?? ""}
                      placeholder="—"
                      disabled={locked}
                      onChange={(event) => handleScoreChange(criterion.id, event.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="feedback-boxes">
            <div>
              <label htmlFor="strengths">Pontos fortes</label>
              <textarea
                id="strengths"
                rows={3}
                value={strengths}
                disabled={locked}
                onChange={(event) => {
                  setStrengths(event.target.value);
                  setStatus("Alterações não salvas");
                }}
                placeholder="Descreva o que mais chamou atenção."
              />
            </div>
            <div>
              <label htmlFor="improvements">Pontos a melhorar</label>
              <textarea
                id="improvements"
                rows={3}
                value={improvements}
                disabled={locked}
                onChange={(event) => {
                  setImprovements(event.target.value);
                  setStatus("Alterações não salvas");
                }}
                placeholder="Descreva oportunidades de evolução."
              />
            </div>
            <div>
              <label htmlFor="generalComment">Comentário geral</label>
              <textarea
                id="generalComment"
                rows={3}
                value={generalComment}
                disabled={locked}
                onChange={(event) => {
                  setGeneralComment(event.target.value);
                  setStatus("Alterações não salvas");
                }}
                placeholder="Feedback final do avaliador."
              />
            </div>
          </div>
        </article>
      </section>

      <div className="action-cluster action-bottom">
        {previousGroupId ? (
          <Link href={`${indexHref}/${previousGroupId}`} className="secondary-btn">← Grupo anterior</Link>
        ) : null}
        <Link href={indexHref} className="secondary-btn">Lista de grupos</Link>
        {!locked ? (
          <>
            <button type="button" className="secondary" disabled={saving} onClick={() => save(false)}>
              {saving ? "Salvando..." : "Salvar rascunho"}
            </button>
            <button type="button" disabled={saving} onClick={() => save(true)}>
              Enviar ficha
            </button>
          </>
        ) : null}
        {nextGroupId ? (
          <Link href={`${indexHref}/${nextGroupId}`} className="secondary-btn">Próximo grupo →</Link>
        ) : null}
      </div>
    </main>
  );
}
