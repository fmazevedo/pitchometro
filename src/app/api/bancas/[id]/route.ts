import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { toBancaDTO, toWallClock } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await context.params;
  const banca = await prisma.banca.findUnique({ where: { id } });

  if (!banca) {
    return NextResponse.json({ error: "Banca não encontrada." }, { status: 404 });
  }

  return NextResponse.json(toBancaDTO(banca));
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const current = await prisma.banca.findUnique({ where: { id } });

    if (!current) {
      return NextResponse.json({ error: "Banca não encontrada." }, { status: 404 });
    }

    const { name, local, date, startsAt, minutesPerGroup } = (await request.json()) ?? {};
    const currentDto = toBancaDTO(current);

    const nextStartsAt =
      typeof date === "string" || typeof startsAt === "string"
        ? toWallClock(date || currentDto.date, startsAt || currentDto.startsAt)
        : current.startsAt;
    const shift = nextStartsAt.getTime() - current.startsAt.getTime();

    // Moving the banca moves every scheduled presentation by the same amount, keeping their spacing.
    const scheduledGroups = shift
      ? await prisma.group.findMany({ where: { bancaId: id, scheduledTime: { not: null } } })
      : [];

    const [banca] = await prisma.$transaction([
      prisma.banca.update({
        where: { id },
        data: {
          name: typeof name === "string" && name.trim() ? name.trim() : undefined,
          local: typeof local === "string" && local.trim() ? local.trim() : undefined,
          startsAt: nextStartsAt,
          minutesPerGroup: typeof minutesPerGroup === "number" && minutesPerGroup > 0 ? minutesPerGroup : undefined,
        },
      }),
      ...scheduledGroups.map((group) =>
        prisma.group.update({
          where: { id: group.id },
          data: { scheduledTime: new Date(group.scheduledTime!.getTime() + shift) },
        }),
      ),
    ]);

    return NextResponse.json(toBancaDTO(banca));
  } catch (error) {
    console.error("Falha ao atualizar banca", error);
    return NextResponse.json({ error: "Falha ao atualizar banca." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await context.params;
  const deleted = await prisma.banca.deleteMany({ where: { id } });

  if (!deleted.count) {
    return NextResponse.json({ error: "Banca não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
