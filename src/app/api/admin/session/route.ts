import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { ADMIN_SESSION_COOKIE } from "@/lib/session";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ ok: false, error: "Sem sessão válida." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user: { id: session.id, email: session.email, name: session.name } });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });

  return response;
}
