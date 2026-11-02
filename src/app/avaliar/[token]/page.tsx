import Link from "next/link";
import { Suspense } from "react";
import { getCriteria, groupOrder, toFichaDTO, toGroupDTO } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { formatDecimal, getWeightedScore } from "@/lib/utils";
import { ProjectInfo } from "./project-info";

function Message({ title, text }: { title: string; text: string }) {
  return (
    <main className="page-shell">
      <section className="glass-card empty-state">
        <h1>{title}</h1>
        <p>{text}</p>
      </section>
    </main>
  );
}

export default function AvaliarPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<Message title="Carregando avaliações..." text="Aguarde um instante." />}>
      <AvaliarIndex params={params} />
    </Suspense>
  );
}

async function AvaliarIndex({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const evaluator = await prisma.evaluator.findUnique({ where: { token }, include: { banca: true } });

  if (!evaluator || !evaluator.active) {
    return <Message title="Token inválido" text="Não foi possível localizar um avaliador ativo com esse código." />;
  }

  const { banca } = evaluator;
  const [criteria, groupRows, fichaRows] = await Promise.all([
    getCriteria(banca.evaluationId),
    prisma.group.findMany({ where: { bancaId: banca.id }, ...groupOrder }),
    prisma.ficha.findMany({ where: { evaluatorId: evaluator.id }, include: { notes: true } }),
  ]);

  const groups = groupRows.map(toGroupDTO);
  const fichas = fichaRows.map(toFichaDTO);
  const sentCount = fichas.filter((ficha) => ficha.status === "ENVIADA").length;

  return (
    <main className="page-shell review-shell">
      <section className="hero-panel glass-card">
        <div>
          <span className="eyebrow">Avaliador</span>
          <h1>{evaluator.name}</h1>
          <p>
            {evaluator.role} · {evaluator.company} · {banca.name}
          </p>
        </div>
        <div className="status-pill">
          {groups.length && sentCount === groups.length ? "Todas as fichas enviadas. Obrigado!" : `${sentCount} de ${groups.length} fichas enviadas`}
        </div>
      </section>

      <section className="glass-card large-panel">
        <div className="panel-header">
          <h2>Grupos para avaliar</h2>
          <span>Na ordem de apresentação</span>
        </div>

        {groups.length === 0 ? <p>A coordenação ainda não cadastrou os grupos desta banca.</p> : null}

        <div className="evaluation-index">
          {groups.map((group, index) => {
            const ficha = fichas.find((item) => item.groupId === group.id);
            const sent = ficha?.status === "ENVIADA";
            const started = Boolean(ficha && (Object.keys(ficha.notes).length || ficha.strengths || ficha.improvements || ficha.generalComment));
            const statusLabel = sent ? "Enviada" : started ? "Rascunho" : "Pendente";

            return (
              <div key={group.id} className={`evaluation-index-entry ${sent ? "done" : ""}`}>
                <Link href={`/avaliar/${token}/${group.id}`} className="evaluation-index-item">
                  <span className="evaluation-index-position">#{group.drawPosition ?? index + 1}</span>
                  <div>
                    <strong>{group.name}</strong>
                    <small>
                      {group.project} · {group.track}
                      {group.scheduledTime ? ` · ${group.scheduledTime}` : ""}
                    </small>
                  </div>
                  <span className={`evaluation-badge ${sent ? "sent" : started ? "draft" : ""}`}>
                    {sent && ficha ? `${statusLabel} · ${formatDecimal(getWeightedScore(ficha.notes, criteria))}` : statusLabel}
                  </span>
                  <span className="evaluation-index-action">{sent ? "Ver ficha" : started ? "Continuar" : "Avaliar"} →</span>
                </Link>
                {group.description || group.members.length ? (
                  <details className="project-details">
                    <summary>Saiba mais sobre o projeto</summary>
                    <ProjectInfo group={group} />
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
