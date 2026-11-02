import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { groupOrder, newToken, parseDescription, toGroupDTO, toWallClock } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const bancaId = searchParams.get("bancaId");

  if (!bancaId) {
    return NextResponse.json([]);
  }

  const groups = await prisma.group.findMany({ where: { bancaId }, ...groupOrder });
  return NextResponse.json(groups.map(toGroupDTO));
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const { bancaId, name, project, track, description, members, scheduledTime, durationMinutes } = body ?? {};

    if (!bancaId || !name || !String(name).trim() || !project || !String(project).trim()) {
      return NextResponse.json({ error: "Banca, nome do grupo e projeto são obrigatórios." }, { status: 400 });
    }

    const banca = await prisma.banca.findUnique({ where: { id: String(bancaId) }, include: { _count: { select: { groups: true } } } });
    if (!banca) {
      return NextResponse.json({ error: "Banca não encontrada." }, { status: 404 });
    }

    const group = await prisma.group.create({
      data: {
        bancaId: banca.id,
        name: String(name).trim(),
        project: String(project).trim(),
        track: typeof track === "string" && track.trim() ? track.trim() : "Em desenvolvimento",
        description: parseDescription(description) ?? null,
        members: Array.isArray(members) ? members.map((member) => String(member).trim()).filter(Boolean) : [],
        feedbackToken: newToken(),
        drawPosition: banca._count.groups + 1,
        scheduledTime:
          typeof scheduledTime === "string" && scheduledTime
            ? toWallClock(banca.startsAt.toISOString().slice(0, 10), scheduledTime)
            : null,
        durationMinutes: typeof durationMinutes === "number" && durationMinutes > 0 ? durationMinutes : banca.minutesPerGroup,
      },
    });

    return NextResponse.json(toGroupDTO(group), { status: 201 });
  } catch (error) {
    console.error("Falha ao criar grupo", error);
    return NextResponse.json({ error: "Falha ao criar grupo." }, { status: 500 });
  }
}
