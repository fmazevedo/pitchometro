import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { newToken, parseDescription, toGroupDTO, toWallClock } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const { name, project, track, description, members, scheduledTime, durationMinutes, regenerateFeedbackToken } =
      (await request.json()) ?? {};

    const current = await prisma.group.findUnique({ where: { id }, include: { banca: true } });
    if (!current) {
      return NextResponse.json({ error: "Grupo não encontrado." }, { status: 404 });
    }

    const group = await prisma.group.update({
      where: { id },
      data: {
        name: typeof name === "string" && name.trim() ? name.trim() : undefined,
        project: typeof project === "string" && project.trim() ? project.trim() : undefined,
        track: typeof track === "string" && track.trim() ? track.trim() : undefined,
        description: parseDescription(description),
        members: Array.isArray(members) ? members.map((member) => String(member).trim()).filter(Boolean) : undefined,
        scheduledTime:
          typeof scheduledTime === "string" && scheduledTime
            ? toWallClock(current.banca.startsAt.toISOString().slice(0, 10), scheduledTime)
            : undefined,
        durationMinutes: typeof durationMinutes === "number" && durationMinutes > 0 ? durationMinutes : undefined,
        feedbackToken: regenerateFeedbackToken === true ? newToken() : undefined,
      },
    });

    return NextResponse.json(toGroupDTO(group));
  } catch (error) {
    console.error("Falha ao atualizar grupo", error);
    return NextResponse.json({ error: "Falha ao atualizar grupo." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await context.params;
  const deleted = await prisma.group.deleteMany({ where: { id } });

  if (!deleted.count) {
    return NextResponse.json({ error: "Grupo não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
