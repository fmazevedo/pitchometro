import { connection, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await connection();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "reachable" });
  } catch (error) {
    console.error("Health check falhou", error);
    return NextResponse.json({ ok: false, database: "unreachable" }, { status: 503 });
  }
}
