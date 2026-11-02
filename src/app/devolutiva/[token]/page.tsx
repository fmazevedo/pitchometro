import { Suspense } from "react";
import { getCriteria, toFichaDTO } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { average, formatDecimal, getCriterionAverage, getWeightedScore } from "@/lib/utils";
import { PrintButton } from "./print-button";

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

export default function DevolutivaPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<Message title="Carregando devolutiva..." text="Aguarde um instante." />}>
      <DevolutivaContent params={params} />
    </Suspense>
  );
}

async function DevolutivaContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const group = await prisma.group.findUnique({
    where: { feedbackToken: token },
    include: { banca: { include: { evaluation: true } } },
  });

  if (!group) {
    return <Message title="Token de devolutiva não encontrado" text="O código informado não corresponde a um grupo publicado." />;
  }

  if (group.banca.evaluation.status !== "PUBLICADA") {
    return <Message title="Devolutiva ainda não publicada" text="A coordenação ainda não liberou os resultados desta banca. Tente novamente mais tarde." />;
  }

  const [criteria, fichaRows] = await Promise.all([
    getCriteria(group.banca.evaluationId),
    prisma.ficha.findMany({
      where: { groupId: group.id, status: "ENVIADA", hidden: false },
      include: { notes: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const groupFichas = fichaRows.map(toFichaDTO);
  const sentScores = groupFichas.map((ficha) => getWeightedScore(ficha.notes, criteria));
  const finalScore = average(sentScores);

  return (
    <main className="page-shell devolutiva-shell">
      <section className="hero-panel glass-card">
        <div>
          <span className="eyebrow">Devolutiva do grupo</span>
          <h1>{group.name}</h1>
          <p>
            {group.project} · {group.track} · {group.members.join(", ")}
          </p>
        </div>
        <div className="score-summary big-score">
          <strong>{formatDecimal(finalScore)}</strong>
          <small>média de {sentScores.length} avaliadores</small>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="glass-card large-panel">
          <div className="panel-header">
            <h2>Média por critério</h2>
          </div>
          <div className="criteria-summary">
            {criteria.map((criterion) => (
              <div key={criterion.id} className="criterion-row">
                <div className="criterion-meta">
                  <strong>{criterion.name}</strong>
                  <span>{criterion.weight}%</span>
                </div>
                <div className="criterion-score">
                  <span>{formatDecimal(getCriterionAverage(groupFichas, criterion.id))}</span>
                  <small>{criterion.description}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card large-panel">
          <div className="panel-header">
            <h2>Resumo</h2>
          </div>
          <ul className="list-clean compact-list">
            <li>Nota final: {formatDecimal(finalScore)}</li>
            <li>Fichas consideradas: {groupFichas.length}</li>
            <li>Escala: {group.banca.evaluation.scaleMin} a {group.banca.evaluation.scaleMax}</li>
          </ul>
        </div>
      </section>

      <section className="glass-card feedback-panel">
        <div className="panel-header">
          <h2>Feedbacks publicados</h2>
          <PrintButton />
        </div>

        <div className="feedback-list">
          {groupFichas.map((ficha, index) => (
            <article key={ficha.id} className="feedback-card">
              <div className="feedback-head">
                <strong>Avaliador {index + 1}</strong>
              </div>
              <p>
                <b>Pontos fortes:</b> {ficha.strengths || "—"}
              </p>
              <p>
                <b>Pontos a melhorar:</b> {ficha.improvements || "—"}
              </p>
              <p>
                <b>Comentário geral:</b> {ficha.generalComment || "—"}
              </p>
              <div className="score-mini">
                <span>Nota do avaliador</span>
                <strong>{formatDecimal(getWeightedScore(ficha.notes, criteria))}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
