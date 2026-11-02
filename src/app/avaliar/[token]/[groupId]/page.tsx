import Link from "next/link";
import { Suspense } from "react";
import { getCriteria, groupOrder, toEvaluationDTO, toFichaDTO, toGroupDTO } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { GroupEvaluationForm } from "./group-evaluation-form";

type Params = Promise<{ token: string; groupId: string }>;

function Message({ title, text, backHref }: { title: string; text: string; backHref?: string }) {
  return (
    <main className="page-shell">
      <section className="glass-card empty-state">
        <h1>{title}</h1>
        <p>{text}</p>
        {backHref ? <Link href={backHref} className="secondary-btn">← Voltar para a lista de grupos</Link> : null}
      </section>
    </main>
  );
}

export default function AvaliarGrupoPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Message title="Carregando ficha..." text="Aguarde um instante." />}>
      <AvaliarGrupoContent params={params} />
    </Suspense>
  );
}

async function AvaliarGrupoContent({ params }: { params: Params }) {
  const { token, groupId } = await params;
  const evaluator = await prisma.evaluator.findUnique({
    where: { token },
    include: { banca: { include: { evaluation: true } } },
  });

  if (!evaluator || !evaluator.active) {
    return <Message title="Token inválido" text="Não foi possível localizar um avaliador ativo com esse código." />;
  }

  const { banca } = evaluator;
  const [criteria, groupRows, ficha] = await Promise.all([
    getCriteria(banca.evaluationId),
    prisma.group.findMany({ where: { bancaId: banca.id }, ...groupOrder }),
    prisma.ficha.findUnique({
      where: { evaluatorId_groupId: { evaluatorId: evaluator.id, groupId } },
      include: { notes: true },
    }),
  ]);

  const groups = groupRows.map(toGroupDTO);
  const index = groups.findIndex((group) => group.id === groupId);

  if (index === -1) {
    return <Message title="Grupo não encontrado" text="Este grupo não faz parte da sua banca." backHref={`/avaliar/${token}`} />;
  }

  return (
    <GroupEvaluationForm
      key={groupId}
      token={token}
      evaluator={{ name: evaluator.name, role: evaluator.role, company: evaluator.company }}
      bancaName={banca.name}
      evaluation={toEvaluationDTO(banca.evaluation)}
      criteria={criteria}
      group={groups[index]}
      position={index + 1}
      total={groups.length}
      previousGroupId={groups[index - 1]?.id ?? null}
      nextGroupId={groups[index + 1]?.id ?? null}
      ficha={ficha ? toFichaDTO(ficha) : null}
    />
  );
}
