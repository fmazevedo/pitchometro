import Link from "next/link";
import { Suspense } from "react";
import { groupOrder, toBancaDTO, toGroupDTO } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { SorteioStage } from "./sorteio-stage";

export default function SorteioPage({ params }: { params: Promise<{ banca: string }> }) {
  return (
    <Suspense fallback={<main className="sorteio-shell" />}>
      <SorteioContent params={params} />
    </Suspense>
  );
}

async function SorteioContent({ params }: { params: Promise<{ banca: string }> }) {
  const { banca: bancaId } = await params;
  const banca = await prisma.banca.findUnique({ where: { id: bancaId } });

  if (!banca) {
    return (
      <main className="page-shell">
        <section className="glass-card empty-state">
          <h1>Banca não encontrada</h1>
          <p>Volte ao painel administrativo e abra o sorteio a partir de uma banca cadastrada.</p>
        </section>
      </main>
    );
  }

  const [groups, scored] = await Promise.all([
    prisma.group.findMany({ where: { bancaId }, ...groupOrder }),
    prisma.note.count({ where: { ficha: { group: { bancaId } } } }),
  ]);

  if (scored > 0) {
    return (
      <main className="page-shell">
        <section className="glass-card empty-state">
          <h1>Sorteio encerrado</h1>
          <p>Os avaliadores já começaram a registrar notas nesta banca, então a ordem de apresentação não pode mais ser sorteada.</p>
          <Link href="/admin" className="secondary-btn">Voltar ao painel</Link>
        </section>
      </main>
    );
  }

  return <SorteioStage banca={toBancaDTO(banca)} initialGroups={groups.map(toGroupDTO)} />;
}
