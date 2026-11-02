"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setSending(true);

    try {
      const response = await fetch("/api/admin/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage({ text: payload.error ?? "Não foi possível enviar o e-mail.", error: true });
        return;
      }

      setMessage({ text: payload.message, error: false });
    } catch {
      setMessage({ text: "Sem conexão. Tente novamente.", error: true });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="glass-card auth-card">
        <span className="eyebrow">Administrador</span>
        <h1>Esqueci minha senha</h1>
        <p>Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            E-mail
            <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <button type="submit" disabled={sending}>{sending ? "Enviando..." : "Enviar link de redefinição"}</button>
        </form>

        {message ? (
          <p role="status" className={message.error ? "auth-message error" : "auth-message"}>{message.text}</p>
        ) : null}

        <div className="auth-links">
          <Link href="/login">← Voltar ao login</Link>
        </div>
      </section>
    </main>
  );
}
