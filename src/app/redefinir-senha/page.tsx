import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export default function RedefinirSenhaPage() {
  return (
    <main className="page-shell">
      <section className="glass-card auth-card">
        <span className="eyebrow">Administrador</span>
        <h1>Criar nova senha</h1>
        <Suspense fallback={<p>Carregando...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </section>
    </main>
  );
}
