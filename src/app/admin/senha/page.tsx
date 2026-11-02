"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const MIN_LENGTH = 12;

export default function AlterarSenhaPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (newPassword.length < MIN_LENGTH) {
      setMessage({ text: `A nova senha deve ter pelo menos ${MIN_LENGTH} caracteres.`, error: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: "A confirmação não confere com a nova senha.", error: true });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok) {
        setMessage({ text: payload.error ?? "Não foi possível alterar a senha.", error: true });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ text: "Senha alterada com sucesso. Outras sessões abertas foram encerradas.", error: false });
    } catch {
      setMessage({ text: "Sem conexão. Tente novamente.", error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="glass-card auth-card">
        <span className="eyebrow">Área restrita</span>
        <h1>Alterar senha</h1>
        <p>Ao alterar a senha, todas as outras sessões abertas com esta conta serão encerradas.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Senha atual
            <input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </label>
          <label>
            Nova senha
            <input type="password" autoComplete="new-password" required minLength={MIN_LENGTH} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            <small>Mínimo de {MIN_LENGTH} caracteres. Uma frase com algumas palavras é fácil de lembrar e segura.</small>
          </label>
          <label>
            Confirmar nova senha
            <input type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </label>
          <button type="submit" disabled={saving}>{saving ? "Salvando..." : "Alterar senha"}</button>
        </form>

        {message ? (
          <p role="status" className={message.error ? "auth-message error" : "auth-message"}>{message.text}</p>
        ) : null}

        <div className="auth-links">
          <Link href="/admin">← Voltar ao painel</Link>
        </div>
      </section>
    </main>
  );
}
