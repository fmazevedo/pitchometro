import { NextResponse } from "next/server";
import { adminLoginSchema, verifyAdminCredentials } from "@/lib/admin-auth";
import { createSessionToken, sessionCookieOptions } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = adminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 400 });
    }

    const user = await verifyAdminCredentials(parsed.data.email, parsed.data.password);

    if (!user) {
      return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
    }

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
    });

    response.cookies.set({ ...sessionCookieOptions, value: createSessionToken(user) });

    return response;
  } catch (error) {
    console.error("Falha no login do administrador", error);
    return NextResponse.json(
      { error: "Falha ao processar login do administrador." },
      { status: 500 },
    );
  }
}
